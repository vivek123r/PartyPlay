import React, { useEffect } from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';

export const LoadingScreen: React.FC = () => {
  const setScreen = usePlatformStore((s) => s.setScreen);

  useEffect(() => {
    const timer = setTimeout(() => {
      setScreen('menu');
    }, 1200);
    return () => clearTimeout(timer);
  }, [setScreen]);

  return (
    <div className="screen-transition" style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="scanline-overlay" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '4rem', color: 'var(--pixel-blue)', textShadow: '4px 4px 0 var(--pixel-purple)' }}>PARTYPLAY</h1>
      </div>
      <p className="blink-text" style={{ color: 'var(--pixel-muted)', fontSize: '1.5rem', letterSpacing: '4px', textTransform: 'uppercase' }}>
        BROWSER GAME CONSOLE
      </p>
    </div>
  );
};
