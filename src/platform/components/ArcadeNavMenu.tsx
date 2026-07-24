import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';

export const ArcadeNavMenu: React.FC = () => {
  const currentScreen = usePlatformStore((s) => s.currentScreen);
  const setScreen = usePlatformStore((s) => s.setScreen);

  return (
    <div className="pixel-panel" style={{ width: '260px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--pixel-bg)' }}>
      {/* 3D Gold Crown Logo Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '4px' }}>👑</div>
        <h1 style={{ fontSize: '1.4rem', color: 'var(--pixel-yellow)', textShadow: '2px 2px 0 #000', margin: 0, fontFamily: 'var(--font-pixel-heading)' }}>
          PARTYPLAY
        </h1>
        <div style={{ fontSize: '0.75rem', color: 'var(--pixel-cyan)', letterSpacing: '2px', marginTop: '4px', fontFamily: 'var(--font-pixel-heading)' }}>
          ADVENTURE RUSH
        </div>
      </div>

      {/* Nav Buttons */}
      <button
        className="pixel-btn pixel-btn-primary"
        onClick={() => setScreen('browser')}
        style={{
          width: '100%',
          fontSize: '0.9rem',
          padding: '12px 16px',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderColor: 'var(--pixel-yellow)',
        }}
      >
        <span>🚩 QUICK PLAY</span>
        <span>❯</span>
      </button>

      <button
        className="pixel-btn"
        onClick={() => setScreen('browser')}
        style={{
          width: '100%',
          fontSize: '0.9rem',
          padding: '12px 16px',
          textAlign: 'left',
          borderColor: 'var(--pixel-green)',
          color: 'var(--pixel-green)',
        }}
      >
        🌐 WORLD SELECT
      </button>

      <button
        className="pixel-btn"
        onClick={() => setScreen('browser')}
        style={{
          width: '100%',
          fontSize: '0.9rem',
          padding: '12px 16px',
          textAlign: 'left',
          borderColor: 'var(--pixel-cyan)',
          color: 'var(--pixel-cyan)',
        }}
      >
        ⭐️ CHALLENGES
      </button>

      <button
        className="pixel-btn"
        onClick={() => setScreen('setup')}
        style={{
          width: '100%',
          fontSize: '0.9rem',
          padding: '12px 16px',
          textAlign: 'left',
          borderColor: 'var(--pixel-purple)',
          color: 'var(--pixel-purple)',
        }}
      >
        🔮 CUSTOM GAME
      </button>

      <button
        className="pixel-btn"
        onClick={() => setScreen('browser')}
        style={{
          width: '100%',
          fontSize: '0.9rem',
          padding: '12px 16px',
          textAlign: 'left',
          borderColor: '#fd79a8',
          color: '#fd79a8',
        }}
      >
        📦 COLLECTION
      </button>

      <button
        className="pixel-btn"
        onClick={() => setScreen('settings')}
        style={{
          width: '100%',
          fontSize: '0.9rem',
          padding: '12px 16px',
          textAlign: 'left',
          borderColor: 'var(--pixel-muted)',
          color: 'var(--pixel-muted)',
        }}
      >
        ⚙️ SETTINGS
      </button>

      <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.65rem', color: 'var(--pixel-muted)', fontFamily: 'var(--font-pixel-heading)' }}>
        v1.0.0 • PARTYPLAY TEAM
      </div>
    </div>
  );
};
