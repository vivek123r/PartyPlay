import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';

export const CrashScreen: React.FC = () => {
  const crashError = usePlatformStore((s) => s.crashError);
  const setScreen = usePlatformStore((s) => s.setScreen);

  return (
    <div className="screen-transition" style={{ width: '100vw', height: '100vh', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="scanline-overlay" />
      
      <div style={{ fontSize: '5rem', marginBottom: '24px', zIndex: 10 }}>☠</div>
      <h1 style={{ fontSize: '3rem', color: 'var(--pixel-red)', marginBottom: '16px', zIndex: 10, textShadow: '2px 2px 0 var(--pixel-border)' }}>GAME CRASHED</h1>
      <p style={{ color: 'var(--pixel-yellow)', fontSize: '1.2rem', marginBottom: '32px', fontFamily: 'var(--font-pixel-heading)', zIndex: 10, textAlign: 'center' }}>
        FATAL EXCEPTION CAUGHT.<br/>SYSTEM ISOLATED.
      </p>

      <div className="pixel-panel" style={{ width: '100%', maxWidth: '800px', border: '2px solid var(--pixel-red)', marginBottom: '40px', color: 'var(--pixel-red)', fontFamily: 'monospace', fontSize: '1rem', overflowX: 'auto', zIndex: 10, padding: '24px' }}>
        {crashError?.stack || crashError?.message || 'UNKNOWN GAME EXCEPTION'}
      </div>

      <button
        className="pixel-btn pixel-btn-primary"
        onClick={() => setScreen('browser')}
        style={{ fontSize: '1.2rem', padding: '16px 32px', zIndex: 10 }}
      >
        ◀ RETURN TO LIBRARY
      </button>
    </div>
  );
};
