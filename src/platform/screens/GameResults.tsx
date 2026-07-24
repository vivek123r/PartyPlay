import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';

export const GameResults: React.FC = () => {
  const lastResults = usePlatformStore((s) => s.lastResults);
  const players = usePlatformStore((s) => s.players);
  const setScreen = usePlatformStore((s) => s.setScreen);

  if (!lastResults) return null;

  const isTeamLoss = lastResults.isTeamLoss || lastResults.winnerId === 0;
  const winner = players.find((p) => p.id === lastResults.winnerId) ?? players[0];

  const teamScore = lastResults.standings[0]?.score ?? 0;

  return (
    <div className="screen-transition" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="scanline-overlay" />
      
      <div style={{ textAlign: 'center', marginBottom: '40px', zIndex: 10 }}>
        <div style={{ fontSize: '4rem', marginBottom: '12px' }}>{isTeamLoss ? '💀' : '🏆'}</div>
        <h1 style={{ fontSize: '2.6rem', color: isTeamLoss ? 'var(--pixel-red)' : winner.color, textShadow: '2px 2px 0 var(--pixel-text)' }}>
          {isTeamLoss ? 'GAME OVER — TEAM LOST!' : `${winner.name.toUpperCase()} WINS!`}
        </h1>
        <p className="blink-text" style={{ color: 'var(--pixel-muted)', fontSize: '1.2rem', fontFamily: 'var(--font-pixel-heading)', marginTop: '14px' }}>
          {isTeamLoss ? 'CO-OP SURVIVAL RECORD' : 'MATCH OVER'}
        </p>
      </div>

      {/* Standings / Team Score Panel */}
      <div className="pixel-panel" style={{ width: '420px', marginBottom: '36px', zIndex: 10 }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--pixel-yellow)', marginBottom: '20px', textAlign: 'center' }}>
          {isTeamLoss ? 'FINAL TEAM SCORE' : 'FINAL STANDINGS'}
        </h3>

        {isTeamLoss ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed var(--pixel-muted)', background: 'var(--pixel-bg)' }}>
            <span style={{ fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-muted)', fontSize: '1rem', marginBottom: '8px' }}>COMBINED SCORE</span>
            <span style={{ fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-yellow)', fontSize: '2.5rem' }}>{teamScore}</span>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              {players.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', backgroundColor: p.color, border: '1px solid var(--pixel-border)' }} />
                  <span style={{ fontFamily: 'var(--font-pixel-heading)', fontSize: '0.85rem', color: 'var(--pixel-text)' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {lastResults.standings.map((item, idx) => {
              const p = players.find((player) => player.id === item.playerId);
              return (
                <div key={item.playerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '2px dashed var(--pixel-muted)', background: 'var(--pixel-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-text)', fontSize: '1.2rem' }}>#{idx + 1}</span>
                    <div style={{ width: '20px', height: '20px', backgroundColor: p?.color ?? 'var(--pixel-border)', border: '2px solid var(--pixel-border)' }} />
                    <span style={{ fontFamily: 'var(--font-pixel-heading)', fontSize: '1rem' }}>{p?.name ?? `P${item.playerId}`}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-green)', fontSize: '1.2rem' }}>{item.score}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '24px', zIndex: 10 }}>
        <button
          className="pixel-btn pixel-btn-primary"
          onClick={() => setScreen('play')}
          style={{ fontSize: '1.2rem', padding: '16px 24px' }}
        >
          ↻ RESTART MATCH
        </button>
        <button
          className="pixel-btn"
          onClick={() => setScreen('browser')}
          style={{ fontSize: '1.2rem', padding: '16px 24px' }}
        >
          ◀ LIBRARY
        </button>
      </div>
    </div>
  );
};
