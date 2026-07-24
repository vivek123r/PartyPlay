import React, { useState, useMemo } from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';
import type { PlayerConfig, GameModifiers } from '@runtime/types';

const RETRO_SWATCHES = [
  { hex: '#ff2e63', name: 'Neon Crimson' },
  { hex: '#08d9d6', name: 'Electric Cyan' },
  { hex: '#2af598', name: 'Arcade Mint' },
  { hex: '#ffde7d', name: 'Retro Gold' },
  { hex: '#a55eea', name: 'Synth Purple' },
  { hex: '#ff9f43', name: 'Solar Orange' },
  { hex: '#ff4757', name: 'Hot Pink' },
  { hex: '#26de81', name: 'Laser Lime' },
];

const DEFAULT_COLORS = ['#ff2e63', '#08d9d6', '#2af598', '#ffde7d'];

const ARENA_INFO: Record<string, { label: string; desc: string; emoji: string }> = {
  'battle-pit': { label: 'BATTLE PIT', desc: 'Hazard walls. Rocks drop over time.', emoji: '🏟' },
  'warp-zone': { label: 'WARP ZONE', desc: 'Portal edges. Rotating spike blocks.', emoji: '🌀' },
  'maze': { label: 'THE MAZE', desc: 'Procedural dungeon. Tight corridors.', emoji: '🏛' },
  'abyss': { label: 'THE ABYSS', desc: 'Floor crumbles. Drifting platforms.', emoji: '🌌' },
};

export const PlayerSetup: React.FC = () => {
  const setScreen = usePlatformStore((s) => s.setScreen);
  const selectedGame = usePlatformStore((s) => s.selectedGame);
  const setPlayers = usePlatformStore((s) => s.setPlayers);
  const setModifiers = usePlatformStore((s) => s.setModifiers);

  const [playerCount, setPlayerCount] = useState<number>(2);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [arena, setArena] = useState<string>('battle-pit');
  const [chosenColors, setChosenColors] = useState<string[]>(DEFAULT_COLORS);

  const isSnakeArena = selectedGame?.id === 'snake-arena';
  const isLavaEscape = selectedGame?.id === 'lava-escape';

  const controlHints = useMemo(() => {
    if (isLavaEscape) {
      return ['[A/D + W]', '[◀/▶ + ▲]', '[J/L + I]', '[4/6 + 8]'];
    }
    if (isSnakeArena) {
      return ['[A/D W=DASH]', '[◀/▶ ▲=DASH]', '[J/L I=DASH]', '[4/6 8=DASH]'];
    }
    return ['[A/D]', '[◀/▶]', '[J/L]', '[4/6]'];
  }, [isLavaEscape, isSnakeArena]);

  if (!selectedGame) return null;

  const handleColorSelect = (playerIdx: number, hex: string) => {
    const next = [...chosenColors];
    next[playerIdx] = hex;
    setChosenColors(next);
  };

  const handleStart = () => {
    const activePlayers: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      color: chosenColors[i] || DEFAULT_COLORS[i],
    }));
    setPlayers(activePlayers);
    const mods: GameModifiers = { speedMultiplier };
    if (isSnakeArena) mods.arena = arena;
    setModifiers(mods);
    setScreen('play');
  };

  return (
    <div className="screen-transition" style={{ width: '100vw', height: '100vh', padding: '32px 48px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div className="scanline-overlay" />
      
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', zIndex: 10 }}>
        <button
          className="pixel-btn"
          onClick={() => setScreen('browser')}
        >
          ◀ RETURN
        </button>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--pixel-yellow)', textShadow: '2px 2px 0 var(--pixel-purple)' }}>
          {selectedGame.title.toUpperCase()} — SETUP
        </h2>
        <div style={{ width: '120px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', maxWidth: '1080px', margin: '0 auto', width: '100%', zIndex: 10 }}>
        {/* Player Count & Color Swatches */}
        <div className="pixel-panel">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--pixel-blue)' }}>👥 SELECT PLAYERS & COLORS</h3>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setPlayerCount(num)}
                className={`pixel-btn ${playerCount === num ? 'pixel-btn-primary' : ''}`}
                style={{ flex: 1, fontSize: '1.3rem', padding: '14px' }}
              >
                {num}P
              </button>
            ))}
          </div>

          {/* Active Players & Swatches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Array.from({ length: playerCount }).map((_, pIdx) => {
              const activeColor = chosenColors[pIdx] || DEFAULT_COLORS[pIdx];

              return (
                <div key={pIdx} style={{ padding: '12px', border: '2px solid var(--pixel-border)', background: 'var(--pixel-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: activeColor,
                          border: '2px solid var(--pixel-border)',
                          boxShadow: '0 2px 0 #000',
                        }}
                      />
                      <span style={{ fontFamily: 'var(--font-pixel-heading)', fontSize: '0.85rem', color: activeColor }}>
                        PLAYER {pIdx + 1}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--pixel-muted)', fontFamily: 'var(--font-pixel-heading)' }}>
                      {controlHints[pIdx]}
                    </span>
                  </div>

                  {/* Swatch Selector Grid */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-muted)', marginRight: '4px' }}>COLOR:</span>
                    {RETRO_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.hex}
                        onClick={() => handleColorSelect(pIdx, swatch.hex)}
                        title={swatch.name}
                        style={{
                          width: '18px',
                          height: '18px',
                          backgroundColor: swatch.hex,
                          border: activeColor === swatch.hex ? '2px solid var(--pixel-border)' : '1px solid #000',
                          transform: activeColor === swatch.hex ? 'scale(1.25)' : 'scale(1)',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'transform 0.1s steps(2)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modifiers */}
        <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--pixel-purple)' }}>⚙ GAME MODIFIERS</h3>

            {/* Speed slider */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontFamily: 'var(--font-pixel-heading)' }}>
                SPEED: <strong style={{ color: 'var(--pixel-yellow)' }}>{speedMultiplier.toFixed(2)}x</strong>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.25"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              />
            </div>

            {/* Arena selector (Snake Arena only) */}
            {isSnakeArena && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontFamily: 'var(--font-pixel-heading)' }}>
                  ARENA: <strong style={{ color: 'var(--pixel-green)' }}>{ARENA_INFO[arena]?.label || arena.toUpperCase()}</strong>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(ARENA_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setArena(key)}
                      className={`pixel-btn ${arena === key ? 'pixel-btn-primary' : ''}`}
                      style={{ padding: '10px', fontSize: '0.7rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                      title={info.desc}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{info.emoji}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-pixel-heading)', fontSize: '0.65rem' }}>{info.label}</div>
                        <div style={{ color: 'var(--pixel-muted)', fontSize: '0.55rem' }}>{info.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className="pixel-btn pixel-btn-primary"
            onClick={handleStart}
            style={{ fontSize: '1.3rem', padding: '18px', width: '100%', marginTop: '16px' }}
          >
            START GAME ▶
          </button>
        </div>
      </div>
    </div>
  );
};
