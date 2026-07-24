import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';

export const MainMenu: React.FC = () => {
  const setScreen = usePlatformStore((s) => s.setScreen);

  return (
    <div className="screen-transition" style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="scanline-overlay" />

      {/* Main Title & Logo */}
      <div style={{ textAlign: 'center', marginBottom: '48px', zIndex: 10 }}>
        <div className="marquee-banner" style={{ marginBottom: '16px' }}>
          <h1 className="led-flicker" style={{ fontSize: '4.5rem', color: 'var(--pixel-yellow)', textShadow: '4px 4px 0 var(--pixel-red)', margin: 0, fontFamily: 'var(--font-pixel-heading)', letterSpacing: '4px' }}>
            PARTYPLAY
          </h1>
        </div>
        <p style={{ color: 'var(--pixel-cyan)', fontSize: '1.4rem', letterSpacing: '6px', textTransform: 'uppercase', fontFamily: 'var(--font-pixel-heading)' }}>
          PIXEL ARCADE CONSOLE
        </p>
      </div>

      {/* Main Menu Action Buttons */}
      <div className="pixel-panel" style={{ width: '360px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10 }}>
        <button
          className="pixel-btn pixel-btn-primary"
          onClick={() => setScreen('browser')}
          style={{ width: '100%', fontSize: '1.2rem', padding: '16px' }}
        >
          ▶ ARCADE GAMES
        </button>

        <button
          className="pixel-btn"
          onClick={() => setScreen('settings')}
          style={{ width: '100%', fontSize: '1.2rem', padding: '16px' }}
        >
          ⚙ SETTINGS
        </button>
      </div>

      {/* Footer Insert Coin */}
      <p className="blink-text" style={{ position: 'absolute', bottom: '30px', color: 'var(--pixel-yellow)', fontSize: '1rem', letterSpacing: '2px', fontFamily: 'var(--font-pixel-heading)' }}>
        PRESS START / CLICK TO PLAY
      </p>
    </div>
  );
};
