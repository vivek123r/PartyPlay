import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';
import { useSettingsStore } from '@platform/stores/settingsStore';

export const Settings: React.FC = () => {
  const setScreen = usePlatformStore((s) => s.setScreen);
  const { masterVolume, setMasterVolume, isMuted, setMuted } = useSettingsStore();

  return (
    <div className="screen-transition" style={{ width: '100vw', height: '100vh', padding: '40px 60px', display: 'flex', flexDirection: 'column' }}>
      <div className="scanline-overlay" />

      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', zIndex: 10 }}>
        <button
          className="pixel-btn"
          onClick={() => setScreen('menu')}
        >
          ◀ BACK
        </button>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--pixel-text)' }}>⚙ SETTINGS</h2>
        <div style={{ width: '120px' }} />
      </div>

      <div className="pixel-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%', zIndex: 10 }}>
        <h3 style={{ fontSize: '1.5rem', color: 'var(--pixel-blue)', marginBottom: '32px' }}>AUDIO</h3>

        <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'block', marginBottom: '16px', fontSize: '1.2rem', fontFamily: 'var(--font-pixel-heading)' }}>
            MASTER VOLUME: <strong style={{ color: 'var(--pixel-yellow)' }}>{Math.round(masterVolume * 100)}%</strong>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', borderTop: '2px dashed var(--pixel-muted)' }}>
          <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-pixel-heading)' }}>MUTE ALL AUDIO</span>
          <button
            className={`pixel-btn ${isMuted ? 'pixel-btn-danger' : 'pixel-btn-primary'}`}
            onClick={() => setMuted(!isMuted)}
          >
            {isMuted ? '🔇 MUTED' : '🔊 UNMUTED'}
          </button>
        </div>
      </div>
    </div>
  );
};
