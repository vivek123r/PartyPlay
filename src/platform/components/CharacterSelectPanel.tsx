import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';

export const CharacterSelectPanel: React.FC = () => {
  const players = usePlatformStore((s) => s.players);

  const playerConfigs = [
    { id: 1, label: 'P1', color: '#ff2e63', name: 'RED', isReady: true },
    { id: 2, label: 'P2', color: '#08d9d6', name: 'BLUE', isReady: true },
    { id: 3, label: 'P3', color: '#ffde7d', name: 'YELLOW', isReady: true },
    { id: 4, label: 'P4', color: '#00b894', name: 'GREEN', isReady: true },
  ];

  return (
    <div className="pixel-panel" style={{ width: '420px', padding: '16px', background: 'var(--pixel-bg)' }}>
      <h3 style={{ fontSize: '1rem', color: '#fd79a8', marginBottom: '16px', textAlign: 'center', fontFamily: 'var(--font-pixel-heading)' }}>
        CHARACTER SELECT
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {playerConfigs.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 8px',
              border: `2px solid ${p.color}`,
              background: '#0f0e17',
              borderRadius: 0,
            }}
          >
            <span style={{ fontSize: '0.9rem', color: p.color, fontFamily: 'var(--font-pixel-heading)', marginBottom: '8px' }}>
              {p.label}
            </span>

            {/* 16-bit Adventurer Character Avatar Box */}
            <div
              style={{
                width: '36px',
                height: '44px',
                backgroundColor: p.color,
                border: '2px solid #fffffe',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 0 2px #000',
              }}
            >
              <div style={{ width: '8px', height: '8px', backgroundColor: '#0f0e17' }} />
            </div>

            <div
              style={{
                padding: '4px 8px',
                fontSize: '0.65rem',
                color: '#0f0e17',
                backgroundColor: p.color,
                fontFamily: 'var(--font-pixel-heading)',
                fontWeight: 'bold',
              }}
            >
              READY!
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.65rem', color: 'var(--pixel-muted)', fontFamily: 'var(--font-pixel-heading)' }}>
        <span>ENTER  JOIN</span>
        <span>ESC  BACK</span>
      </div>
    </div>
  );
};
