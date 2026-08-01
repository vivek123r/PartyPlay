import React, { useState, useCallback, useEffect } from 'react';
import { useRunAndGunStore } from '@platform/stores/runAndGunStore';
import { usePlatformStore } from '@platform/stores/platformStore';

export const RunAndGunSettingsScreen: React.FC = () => {
  const setPlatformScreen = usePlatformStore((s) => s.setScreen);
  const setScreen = useRunAndGunStore((s) => s.setScreen);
  const [volume, setVolume] = useState(0.8);

  const handleBack = useCallback(() => {
    setScreen('title');
    setPlatformScreen('run-and-gun-title');
  }, [setScreen, setPlatformScreen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleBack]);

  return (
    <div className="rg-screen screen-transition">
      <div className="scanline-overlay" />
      <div className="rg-bg" />

      <div className="rg-settings-panel">
        <h2>SETTINGS</h2>

        <div className="rg-settings-row">
          <p className="rg-settings-label">MASTER VOLUME</p>
          <input
            className="rg-settings-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-pixel-heading)',
                fontSize: '0.45rem',
                color: 'var(--pixel-muted)',
              }}
            >
              MIN
            </span>
            <span
              style={{
                fontFamily: 'var(--font-pixel-heading)',
                fontSize: '0.45rem',
                color: 'var(--pixel-yellow)',
              }}
            >
              {Math.round(volume * 100)}%
            </span>
            <span
              style={{
                fontFamily: 'var(--font-pixel-heading)',
                fontSize: '0.45rem',
                color: 'var(--pixel-muted)',
              }}
            >
              MAX
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: 32 }} />

      <button className="rg-btn-back" onClick={handleBack}>
        ◀ BACK
      </button>
    </div>
  );
};
