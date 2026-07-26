import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QrCodeView } from '@platform/components/QrCodeView';
import { RemotePhoneClient } from '@services/remote/RemoteControllerService';
import type { RemoteConnectionStatus } from '@services/remote/types';

const MOVEMENT_ACTIONS = new Set(['moveUp', 'moveDown', 'moveLeft', 'moveRight']);
const UTILITY_ACTIONS = new Set([
  'pause', 'info', 'showcase', 'damage', 'reset', 'selectKnight',
  'slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6',
]);

const ACTION_LABELS: Record<string, string> = {
  moveUp: '▲', moveDown: '▼', moveLeft: '◀', moveRight: '▶',
  action: 'ACTION', alternate: 'ALT', skill: 'SKILL', spell: 'SPELL',
  jump: 'JUMP', block: 'BLOCK', roll: 'ROLL', crouch: 'CROUCH',
  slide: 'SLIDE', flip: 'FLIP', focus: 'FOCUS', secondary: 'MARKET',
  nitro: 'NITRO', brake: 'BRAKE', pause: 'PAUSE', info: 'INFO',
  showcase: 'SHOWCASE', damage: 'HIT TEST', reset: 'RESET',
  selectKnight: 'KNIGHT',
  slot1: '1', slot2: '2', slot3: '3', slot4: '4', slot5: '5', slot6: '6',
};

const signalFromHash = (): string => {
  const query = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get('signal') ?? '';
};

interface ControllerButtonProps {
  action: string;
  client: RemotePhoneClient;
  className?: string;
}

const ControllerButton: React.FC<ControllerButtonProps> = ({ action, client, className = '' }) => {
  const activePointers = useRef(new Set<number>());

  const press = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers.current.add(event.pointerId);
    client.setPressed(action, true);
    if (navigator.vibrate) navigator.vibrate(8);
  };
  const release = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size === 0) client.setPressed(action, false);
  };

  return (
    <button
      className={`remote-control-button ${className}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={event => event.preventDefault()}
    >
      {ACTION_LABELS[action] ?? action.replace(/([A-Z])/g, ' $1').toUpperCase()}
    </button>
  );
};

export const RemoteControllerScreen: React.FC = () => {
  const [client, setClient] = useState<RemotePhoneClient | null>(null);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<RemoteConnectionStatus>('connecting');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let createdClient: RemotePhoneClient | null = null;
    let unsubscribe: (() => void) | null = null;
    const offer = signalFromHash();
    if (!offer) {
      setError('This phone invitation is missing its WebRTC offer.');
      return;
    }
    void RemotePhoneClient.answerOffer(offer).then((result) => {
      createdClient = result.client;
      if (!active) {
        result.client.destroy();
        return;
      }
      setClient(result.client);
      setAnswer(result.answer);
      unsubscribe = result.client.subscribe(setStatus);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to answer the host invitation.');
    });

    const release = () => createdClient?.releaseAll();
    window.addEventListener('blur', release);
    window.addEventListener('pagehide', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      active = false;
      window.removeEventListener('blur', release);
      window.removeEventListener('pagehide', release);
      document.removeEventListener('visibilitychange', release);
      unsubscribe?.();
      createdClient?.destroy();
    };
  }, []);

  const primaryActions = useMemo(
    () => client?.profile.actions.filter(action => !MOVEMENT_ACTIONS.has(action) && !UTILITY_ACTIONS.has(action)) ?? [],
    [client],
  );
  const utilityActions = useMemo(
    () => client?.profile.actions.filter(action => UTILITY_ACTIONS.has(action)) ?? [],
    [client],
  );

  const requestWakeLock = async () => {
    try {
      const wakeLock = navigator.wakeLock;
      if (wakeLock) await wakeLock.request('screen');
    } catch {
      // Wake lock is a best-effort enhancement.
    }
  };

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (error) {
    return (
      <main className="remote-phone-screen remote-phone-screen--error">
        <div className="scanline-overlay" />
        <span className="remote-phone-kicker">PARTYPLAY // PHONE LINK</span>
        <h1>CONNECTION FAILED</h1>
        <p>{error}</p>
        <small>Return to the host and generate a new phone invitation.</small>
      </main>
    );
  }

  if (!client || !answer) {
    return (
      <main className="remote-phone-screen remote-phone-screen--loading">
        <div className="scanline-overlay" />
        <div className="remote-pairing-loader"><span /><strong>CREATING PHONE ANSWER</strong></div>
      </main>
    );
  }

  if (status !== 'connected') {
    return (
      <main className="remote-phone-screen remote-phone-screen--answer" style={{ '--player-color': client.profile.playerColor } as React.CSSProperties}>
        <div className="scanline-overlay" />
        <span className="remote-phone-kicker">P{client.profile.playerId} // {client.profile.gameTitle}</span>
        <h1>SHOW THIS TO THE HOST</h1>
        <p>On the host, choose “Phone is showing answer”, then hold this QR in front of its camera.</p>
        <QrCodeView value={answer} size={360} label="WebRTC answer for the PartyPlay host" />
        <button className="pixel-btn remote-copy-answer" onClick={copyAnswer}>{copied ? 'ANSWER COPIED' : 'COPY ANSWER FALLBACK'}</button>
        <strong className={`remote-phone-status remote-phone-status--${status}`}>{status === 'reconnecting' ? 'LINK LOST — PAIR AGAIN ON HOST' : 'WAITING FOR HOST SCAN…'}</strong>
      </main>
    );
  }

  return (
    <main
      className="remote-phone-screen remote-controller"
      style={{ '--player-color': client.profile.playerColor } as React.CSSProperties}
      onPointerDown={requestWakeLock}
    >
      <header className="remote-controller__header">
        <div><span>P{client.profile.playerId}</span><strong>{client.profile.playerName}</strong></div>
        <b>{client.profile.gameTitle}</b>
        <i>● DIRECT</i>
      </header>

      <section className="remote-controller__surface">
        <div className="remote-dpad" aria-label="Movement controls">
          {client.profile.actions.includes('moveUp') && <ControllerButton action="moveUp" client={client} className="remote-dpad__up" />}
          {client.profile.actions.includes('moveLeft') && <ControllerButton action="moveLeft" client={client} className="remote-dpad__left" />}
          <span className="remote-dpad__center" />
          {client.profile.actions.includes('moveRight') && <ControllerButton action="moveRight" client={client} className="remote-dpad__right" />}
          {client.profile.actions.includes('moveDown') && <ControllerButton action="moveDown" client={client} className="remote-dpad__down" />}
        </div>

        <div className="remote-action-pad" aria-label="Game actions">
          {primaryActions.map((action, index) => (
            <ControllerButton key={action} action={action} client={client} className={`remote-action-pad__button remote-action-pad__button--${index % 6}`} />
          ))}
          {!primaryActions.length && <span className="remote-no-actions">MOVEMENT ONLY</span>}
        </div>
      </section>

      {!!utilityActions.length && (
        <footer className="remote-controller__utility">
          {utilityActions.map(action => <ControllerButton key={action} action={action} client={client} className="remote-control-button--utility" />)}
        </footer>
      )}
    </main>
  );
};
