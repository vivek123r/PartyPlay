import React, { useState } from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';
import type { GameModifiers, PlayerConfig } from '@runtime/types';

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

const CONTROL_LABELS: Record<string, string> = {
  moveLeft: 'LEFT', moveRight: 'RIGHT', moveUp: 'UP', moveDown: 'DOWN',
  jump: 'JUMP', action: 'ACTION', skill: 'SKILL', focus: 'FOCUS', info: 'INFO', pause: 'PAUSE',
};

const formatKey = (key: string) => key
  .replace(/^Key/, '')
  .replace(/^Digit/, '')
  .replace('Arrow', '')
  .replace('Numpad', 'NUM ')
  .replace('ControlLeft', 'CTRL L')
  .replace('ControlRight', 'CTRL R')
  .replace('ShiftLeft', 'SHIFT L')
  .replace('ShiftRight', 'SHIFT R')
  .replace('Space', 'SPACE')
  .replace('Enter', 'ENTER')
  .replace('Escape', 'ESC')
  .replace('Slash', '/')
  .replace('Period', '.')
  .replace('Plus', '+');

const getControlRows = (bindings: Record<string, string[]> | undefined) => {
  if (!bindings) return ['NO BINDINGS'];
  return Object.entries(bindings).map(([action, keys]) => `${CONTROL_LABELS[action] || action.toUpperCase()}: ${keys.map(formatKey).join(' / ')}`);
};

const GAME_SETTINGS: Record<string, Array<{ key: string; label: string; low: string; high: string; min: number; max: number; step: number; default: number }>> = {
  'dungeon-brawl': [
    { key: 'enemyHealthMultiplier', label: 'ENEMY VITALITY', low: 'CASUAL', high: 'BRUTAL', min: 0.75, max: 1.5, step: 0.25, default: 1 },
    { key: 'bossDifficulty', label: 'BOSS DIFFICULTY', low: 'STANDARD', high: 'NIGHTMARE', min: 0.75, max: 1.5, step: 0.25, default: 1 },
  ],
  'hollow-clash': [
    { key: 'enemyHealthMultiplier', label: 'ENEMY VITALITY', low: 'CASUAL', high: 'BRUTAL', min: 0.75, max: 1.5, step: 0.25, default: 1 },
    { key: 'gravityMultiplier', label: 'GRAVITY', low: 'FLOATY', high: 'HEAVY', min: 0.75, max: 1.5, step: 0.25, default: 1 },
  ],
  'obstacle-survival': [
    { key: 'speedMultiplier', label: 'GAME SPEED', low: 'TACTICAL', high: 'MAYHEM', min: 0.5, max: 2, step: 0.25, default: 1 },
    { key: 'obstacleDensity', label: 'OBSTACLE DENSITY', low: 'OPEN LANES', high: 'PACKED', min: 0.75, max: 1.5, step: 0.25, default: 1 },
    { key: 'playerRadiusMultiplier', label: 'PLAYER HITBOX', low: 'FORGIVING', high: 'TIGHT', min: 0.75, max: 1.25, step: 0.25, default: 1 },
  ],
  'relic-rush': [
    { key: 'speedMultiplier', label: 'RACE SPEED', low: 'TACTICAL', high: 'TURBO', min: 0.5, max: 2, step: 0.25, default: 1 },
    { key: 'trapFrequency', label: 'TRAP FREQUENCY', low: 'SPARSE', high: 'RELIC STORM', min: 0.75, max: 1.5, step: 0.25, default: 1 },
    { key: 'gravityMultiplier', label: 'GRAVITY', low: 'FLOATY', high: 'HEAVY', min: 0.75, max: 1.5, step: 0.25, default: 1 },
  ],
  'snake-arena': [{ key: 'speedMultiplier', label: 'SNAKE SPEED', low: 'TACTICAL', high: 'TURBO', min: 0.5, max: 2, step: 0.25, default: 1 }],
  'turbo-rider': [
    { key: 'speedMultiplier', label: 'RACE SPEED', low: 'CRUISE', high: 'TURBO', min: 0.5, max: 2, step: 0.25, default: 1 },
    { key: 'trafficDensity', label: 'TRAFFIC DENSITY', low: 'OPEN ROAD', high: 'GRIDLOCK', min: 0.75, max: 1.5, step: 0.25, default: 1 },
  ],
  'lava-escape': [{ key: 'speedMultiplier', label: 'RUN SPEED', low: 'TACTICAL', high: 'MAYHEM', min: 0.5, max: 2, step: 0.25, default: 1 }],
  'micro-game': [{ key: 'speedMultiplier', label: 'TEST SPEED', low: 'TACTICAL', high: 'MAYHEM', min: 0.5, max: 2, step: 0.25, default: 1 }],
};

const ARENA_INFO: Record<string, { label: string; desc: string; emoji: string }> = {
  'battle-pit': { label: 'BATTLE PIT', desc: 'Hazard walls. Rocks drop over time.', emoji: '🏟' },
  'warp-zone': { label: 'WARP ZONE', desc: 'Portal edges. Rotating spike blocks.', emoji: '🌀' },
  maze: { label: 'THE MAZE', desc: 'Procedural dungeon. Tight corridors.', emoji: '🏛' },
  abyss: { label: 'THE ABYSS', desc: 'Floor crumbles. Drifting platforms.', emoji: '🌌' },
};

export const PlayerSetup: React.FC = () => {
  const setScreen = usePlatformStore((s) => s.setScreen);
  const selectedGame = usePlatformStore((s) => s.selectedGame);
  const setPlayers = usePlatformStore((s) => s.setPlayers);
  const setModifiers = usePlatformStore((s) => s.setModifiers);

  const [playerCount, setPlayerCount] = useState(2);
  const [gameOptions, setGameOptions] = useState<Record<string, number>>({ speedMultiplier: 1 });
  const [arena, setArena] = useState('battle-pit');
  const [chosenColors, setChosenColors] = useState(DEFAULT_COLORS);

  const isSnakeArena = selectedGame?.id === 'snake-arena';

  if (!selectedGame) return null;

  const settings = GAME_SETTINGS[selectedGame.id] ?? GAME_SETTINGS['micro-game'];

  const handleColorSelect = (playerIdx: number, hex: string) => {
    setChosenColors((current) => current.map((color, index) => index === playerIdx ? hex : color));
  };

  const handleStart = () => {
    const activePlayers: PlayerConfig[] = Array.from({ length: playerCount }, (_, index) => ({
      id: index + 1,
      name: `Player ${index + 1}`,
      color: chosenColors[index] || DEFAULT_COLORS[index],
    }));
    setPlayers(activePlayers);
    const modifiers: GameModifiers = { ...gameOptions };
    if (isSnakeArena) modifiers.arena = arena;
    setModifiers(modifiers);
    setScreen('play');
  };

  return (
    <main className="setup-screen screen-transition">
      <div className="scanline-overlay" />

      <header className="setup-header">
        <button className="pixel-btn setup-back" onClick={() => setScreen('browser')}>◀ BACK</button>
        <div className="setup-title-block">
          <span>PARTYPLAY // READY ROOM</span>
          <h1>{selectedGame.title.toUpperCase()}</h1>
        </div>
        <div className="setup-round-chip"><span>ROUND</span><strong>01</strong></div>
      </header>

      <section className="setup-layout">
        <div className="setup-roster-panel">
          <div className="setup-panel-heading">
            <div><span className="setup-kicker">PLAYER CONFIGURATION</span><h2>SELECT PLAYERS</h2></div>
            <div className="player-count-toggle" aria-label="Player count">
              {[2, 3, 4].map((count) => (
                <button key={count} onClick={() => setPlayerCount(count)} className={playerCount === count ? 'is-active' : ''}>{count}P</button>
              ))}
            </div>
          </div>

          <div className={`hero-card-grid hero-card-grid--${playerCount}`}>
            {Array.from({ length: playerCount }).map((_, playerIndex) => {
              const color = chosenColors[playerIndex] || DEFAULT_COLORS[playerIndex];
              const controlRows = getControlRows(selectedGame.defaultControls[playerIndex]?.bindings);
              return (
                <article className="hero-card player-config-card" key={playerIndex} style={{ '--player-color': color } as React.CSSProperties}>
                  <div className="hero-card__topline"><span>P{playerIndex + 1} // CONTROLLER {playerIndex + 1}</span><span className="hero-card__ready">READY</span></div>
                  <div className="player-config-card__summary"><span className="player-config-card__swatch" style={{ backgroundColor: color }} /><div><span>PLAYER {playerIndex + 1}</span><h3>ACTIVE PLAYER</h3></div></div>
                  <div className="player-controls"><span>KEY MAP // P{playerIndex + 1}</span><div>{controlRows.map((row) => <strong key={row}>{row}</strong>)}</div></div>
                  <div className="hero-card__palette" aria-label={`Player ${playerIndex + 1} colour`}>
                    {RETRO_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.hex}
                        aria-label={`Set Player ${playerIndex + 1} to ${swatch.name}`}
                        aria-pressed={color === swatch.hex}
                        className={color === swatch.hex ? 'is-selected' : ''}
                        onClick={() => handleColorSelect(playerIndex, swatch.hex)}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="setup-settings-panel">
          <div className="setup-panel-heading"><div><span className="setup-kicker">MISSION PARAMETERS</span><h2>GAME SETUP</h2></div><span className="settings-cog">⚙</span></div>
          <div className="game-settings-list">
            {settings.map((setting) => {
              const value = gameOptions[setting.key] ?? setting.default;
              return <section className="setting-block" key={setting.key}>
                <div className="setting-label"><span>{setting.label}</span><strong>{value.toFixed(2)}×</strong></div>
                <input className="speed-control" type="range" min={setting.min} max={setting.max} step={setting.step} value={value} onChange={(event) => setGameOptions((current) => ({ ...current, [setting.key]: Number(event.target.value) }))} />
                <div className="range-labels"><span>{setting.low}</span><span>{setting.high}</span></div>
              </section>;
            })}
          </div>

          {isSnakeArena && <section className="setting-block arena-block">
            <div className="setting-label"><span>COMBAT ZONE</span><strong>{ARENA_INFO[arena].label}</strong></div>
            <div className="arena-options">
              {Object.entries(ARENA_INFO).map(([key, info]) => <button key={key} className={arena === key ? 'is-active' : ''} onClick={() => setArena(key)}><span>{info.emoji}</span><b>{info.label}</b><small>{info.desc}</small></button>)}
            </div>
          </section>}

          <div className="setup-launch-panel">
            <span>ALL SYSTEMS NOMINAL</span>
            <button className="pixel-btn pixel-btn-primary setup-launch" onClick={handleStart}>START GAME <b>▶</b></button>
          </div>
        </aside>
      </section>
    </main>
  );
};
