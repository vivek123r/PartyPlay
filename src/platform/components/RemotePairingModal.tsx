import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { remoteControllerService } from '@services/remote/RemoteControllerService';
import type { RemoteControllerProfile } from '@services/remote/types';
import { QrCodeView } from './QrCodeView';
import { QrScanner } from './QrScanner';

interface RemotePairingModalProps {
  profile: RemoteControllerProfile;
  onClose: () => void;
  onConnected: () => void;
}

type PairingPhase = 'creating' | 'offer' | 'scan' | 'connecting' | 'error';

export const RemotePairingModal: React.FC<RemotePairingModalProps> = ({ profile, onClose, onConnected }) => {
  const [phase, setPhase] = useState<PairingPhase>('creating');
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');
  const completedRef = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const pairingIdentity = `${profile.gameId}:${profile.playerId}`;
  const snapshot = useSyncExternalStore(
    remoteControllerService.subscribe,
    remoteControllerService.getSnapshot,
    remoteControllerService.getSnapshot,
  );
  const slot = snapshot.slots[profile.playerId];

  useEffect(() => {
    let active = true;
    const offerProfile = profileRef.current;
    setPhase('creating');
    void remoteControllerService.createOffer(offerProfile).then((offer) => {
      if (!active) return;
      const root = `${window.location.origin}${window.location.pathname}`;
      setInviteUrl(`${root}#/remote?signal=${encodeURIComponent(offer)}`);
      setPhase('offer');
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'Unable to create a phone invitation.');
      setPhase('error');
    });
    return () => { active = false; };
  }, [pairingIdentity]);

  useEffect(() => {
    if (slot?.status !== 'connected' || completedRef.current) return;
    completedRef.current = true;
    onConnected();
  }, [onConnected, slot?.status]);

  const description = useMemo(() => {
    if (phase === 'offer') return 'Scan this QR with the phone camera. The phone will show an answer QR.';
    if (phase === 'scan') return 'Now scan the answer QR displayed on the phone.';
    if (phase === 'connecting') return 'Applying the phone answer and opening the direct connection…';
    return 'Preparing a private, data-only WebRTC invitation…';
  }, [phase]);

  const handleAnswer = async (value: string) => {
    setPhase('connecting');
    setError('');
    try {
      await remoteControllerService.acceptAnswer(profile.playerId, value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The phone answer could not be applied.');
      setPhase('scan');
    }
  };

  const handleCancel = () => {
    if (slot?.status !== 'connected') remoteControllerService.disconnect(profile.playerId);
    onClose();
  };

  return (
    <div className="remote-pairing-backdrop" role="dialog" aria-modal="true" aria-labelledby="remote-pairing-title">
      <section className="remote-pairing-modal" style={{ '--player-color': profile.playerColor } as React.CSSProperties}>
        <button className="remote-pairing-close" onClick={handleCancel} aria-label="Close pairing">×</button>
        <span className="setup-kicker">P{profile.playerId} // PHONE LINK</span>
        <h2 id="remote-pairing-title">CONNECT {profile.playerName.toUpperCase()}</h2>
        <p className="remote-pairing-description">{description}</p>

        {phase === 'creating' && <div className="remote-pairing-loader"><span /><strong>CREATING OFFER</strong></div>}

        {phase === 'offer' && inviteUrl && (
          <>
            <QrCodeView value={inviteUrl} label={`Player ${profile.playerId} phone invitation`} />
            <div className="remote-pairing-steps"><b>1</b><span>PHONE SCANS THIS</span><b>2</b><span>PHONE SHOWS AN ANSWER QR</span><b>3</b><span>HOST SCANS THE ANSWER</span></div>
            <button className="pixel-btn pixel-btn-primary remote-pairing-next" onClick={() => setPhase('scan')}>
              PHONE IS SHOWING ANSWER ▶
            </button>
          </>
        )}

        {phase === 'scan' && <QrScanner onResult={handleAnswer} />}

        {phase === 'connecting' && (
          <div className="remote-pairing-loader"><span /><strong>OPENING DIRECT LINK</strong></div>
        )}

        {phase === 'error' && <button className="pixel-btn" onClick={handleCancel}>CLOSE</button>}
        {error && <p className="remote-pairing-error">{error}</p>}
        <small className="remote-pairing-note">NO BACKEND · SAME-WIFI DIRECT CONNECTION · KEYBOARD FALLBACK AVAILABLE</small>
      </section>
    </div>
  );
};
