import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface QrScannerProps {
  onResult: (value: string) => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onResultRef = useRef(onResult);
  const [error, setError] = useState('');
  const [manualValue, setManualValue] = useState('');

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    const scan = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const maxWidth = 720;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
          if (result?.data) {
            stopped = true;
            onResultRef.current(result.data);
            return;
          }
        }
      }
      frame = window.requestAnimationFrame(scan);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera scanning requires HTTPS and a browser with camera access.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (stopped) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          frame = window.requestAnimationFrame(scan);
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Camera permission was not granted.');
      }
    };

    void start();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="remote-scanner">
      <div className="remote-scanner__viewport">
        <video ref={videoRef} muted playsInline />
        <span className="remote-scanner__corners" />
      </div>
      <canvas ref={canvasRef} hidden />
      <p>{error || 'Hold the phone answer QR inside the frame.'}</p>
      <details className="remote-manual-answer">
        <summary>CAMERA NOT AVAILABLE?</summary>
        <textarea
          value={manualValue}
          onChange={event => setManualValue(event.target.value)}
          placeholder="Paste the answer code from the phone"
          rows={3}
        />
        <button
          className="pixel-btn"
          disabled={!manualValue.trim()}
          onClick={() => onResult(manualValue.trim())}
        >
          USE PASTED ANSWER
        </button>
      </details>
    </div>
  );
};
