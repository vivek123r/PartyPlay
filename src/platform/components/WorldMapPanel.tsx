import React from 'react';

export const WorldMapPanel: React.FC = () => {
  const worldNodes = [
    { id: 1, name: 'Jungle', stars: '15/15 ⭐', icon: '🌿', isLocked: false },
    { id: 2, name: 'Forest', stars: '12/15 ⭐', icon: '🌲', isLocked: false },
    { id: 3, name: 'Castle', stars: '0/15 ⭐', icon: '🏰', isLocked: true },
    { id: 4, name: 'Ice Cave', stars: '0/15 ⭐', icon: '❄️', isLocked: true },
    { id: 5, name: 'Volcano', stars: '0/15 ⭐', icon: '🌋', isLocked: true },
    { id: 6, name: 'Ruins', stars: '0/15 ⭐', icon: '🏛️', isLocked: true },
  ];

  return (
    <div className="pixel-panel" style={{ width: '420px', padding: '16px', background: 'var(--pixel-bg)' }}>
      <h3 style={{ fontSize: '1rem', color: 'var(--pixel-cyan)', marginBottom: '16px', textAlign: 'center', fontFamily: 'var(--font-pixel-heading)' }}>
        WORLD MAP
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {worldNodes.map((w) => (
          <div
            key={w.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 8px',
              border: `2px solid ${w.isLocked ? 'var(--pixel-muted)' : 'var(--pixel-cyan)'}`,
              background: '#0f0e17',
              opacity: w.isLocked ? 0.6 : 1.0,
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{w.icon}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--pixel-text)', fontFamily: 'var(--font-pixel-heading)' }}>
              {w.id} {w.name.toUpperCase()}
            </span>
            {w.isLocked ? (
              <span style={{ fontSize: '0.65rem', color: 'var(--pixel-red)', marginTop: '4px', fontFamily: 'var(--font-pixel-heading)' }}>🔒 LOCKED</span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--pixel-yellow)', marginTop: '4px', fontFamily: 'var(--font-pixel-heading)' }}>{w.stars}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
