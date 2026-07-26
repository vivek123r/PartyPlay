import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeViewProps {
  value: string;
  size?: number;
  label: string;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({ value, size = 420, label }) => {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setSource('');
    setError('');
    void QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 4,
      errorCorrectionLevel: 'L',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((svg) => {
      if (active) setSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to create QR code.');
    });
    return () => { active = false; };
  }, [label, size, value]);

  if (error) return <div className="remote-qr-error">{error}</div>;
  if (!source) return <div className="remote-qr-loading">GENERATING QR…</div>;
  return <img className="remote-qr-image" src={source} width={size} height={size} alt={label} />;
};
