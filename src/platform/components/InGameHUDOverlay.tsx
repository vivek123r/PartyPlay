import React from 'react';

export const InGameHUDOverlay: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '280px' }}>
      {/* 1. Scoreboard Widget */}
      <div className="pixel-panel" style={{ padding: '16px', background: 'var(--pixel-bg)' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--pixel-purple)', marginBottom: '12px', textAlign: 'center', fontFamily: 'var(--font-pixel-heading)' }}>
          SCOREBOARD
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-pixel-heading)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff2e63' }}>
            <span>1  🔴 P1 RED</span>
            <span>350 ⭐</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#08d9d6' }}>
            <span>2  🟦 P2 BLUE</span>
            <span>280 ⭐</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00b894' }}>
            <span>3  🟩 P4 GREEN</span>
            <span>210 ⭐</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffde7d' }}>
            <span>4  🟨 P3 YELLOW</span>
            <span>180 ⭐</span>
          </div>
        </div>
      </div>

      {/* 2. Level Objective Widget */}
      <div className="pixel-panel" style={{ padding: '16px', background: 'var(--pixel-bg)' }}>
        <h4 style={{ fontSize: '0.9rem', color: '#fd79a8', marginBottom: '10px', textAlign: 'center', fontFamily: 'var(--font-pixel-heading)' }}>
          LEVEL OBJECTIVE
        </h4>
        <div style={{ fontSize: '0.7rem', color: 'var(--pixel-text)', lineHeight: 1.4, fontFamily: 'var(--font-pixel-heading)', textAlign: 'center', marginBottom: '10px' }}>
          🚩 REACH THE EXIT!<br />COLLECT 50 GEMS!
        </div>
        <div style={{ width: '100%', height: '12px', background: '#2d3436', border: '1px solid var(--pixel-text)', overflow: 'hidden' }}>
          <div style={{ width: '36%', height: '100%', background: 'var(--pixel-yellow)' }} />
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--pixel-yellow)', textAlign: 'center', marginTop: '6px', fontFamily: 'var(--font-pixel-heading)' }}>
          18 / 50 💎
        </div>
      </div>

      {/* 3. Powerups In Level Widget */}
      <div className="pixel-panel" style={{ padding: '12px', background: 'var(--pixel-bg)' }}>
        <h4 style={{ fontSize: '0.75rem', color: 'var(--pixel-cyan)', marginBottom: '10px', textAlign: 'center', fontFamily: 'var(--font-pixel-heading)' }}>
          POWER UPS IN LEVEL
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '1.4rem' }}>
          <span>🪽</span>
          <span>🛡️</span>
          <span>🧲</span>
          <span>⏱️</span>
        </div>
      </div>
    </div>
  );
};
