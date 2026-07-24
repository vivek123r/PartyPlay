import React from 'react';

export const PowerUpStorePanel: React.FC = () => {
  const storeItems = [
    { id: 'wings', name: 'WINGS', price: 50, icon: '🪽' },
    { id: 'shield', name: 'SHIELD', price: 50, icon: '🛡️' },
    { id: 'magnet', name: 'MAGNET', price: 60, icon: '🧲' },
    { id: 'stopwatch', name: 'STOPWATCH', price: 40, icon: '⏱️' },
    { id: 'bomb', name: 'BOMB', price: 70, icon: '💣' },
    { id: 'star', name: 'STAR', price: 80, icon: '⭐️' },
    { id: 'boots', name: 'BOOTS', price: 60, icon: '🥾' },
    { id: 'heart', name: 'HEART', price: 30, icon: '❤️' },
  ];

  return (
    <div className="pixel-panel" style={{ width: '420px', padding: '16px', background: 'var(--pixel-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--pixel-green)', margin: 0, fontFamily: 'var(--font-pixel-heading)' }}>
          POWER UP STORE
        </h3>
        <span style={{ fontSize: '0.9rem', color: 'var(--pixel-purple)', fontFamily: 'var(--font-pixel-heading)' }}>
          💎 120 GEMS
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {storeItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 4px',
              border: '2px solid var(--pixel-green)',
              background: '#0f0e17',
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{item.icon}</div>
            <span style={{ fontSize: '0.65rem', color: 'var(--pixel-yellow)', fontFamily: 'var(--font-pixel-heading)', marginTop: '2px' }}>
              💎 {item.price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
