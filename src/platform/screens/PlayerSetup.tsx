import React, { useState, useSyncExternalStore } from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';
import type { AIDifficulty, GameModifiers, GameSetupOption, GameSetupOptionValue, PlayerConfig, PlayerType } from '@runtime/types';
import { RemotePairingModal } from '@platform/components/RemotePairingModal';
import { remoteControllerService } from '@services/remote/RemoteControllerService';

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
  jump: 'JUMP', action: 'ACTION', alternate: 'ALT', block: 'GUARD', skill: 'SKILL', spell: 'SPELL', roll: 'ROLL',
  crouch: 'CROUCH', slide: 'SLIDE', flip: 'FLIP', showcase: 'SHOWCASE', damage: 'HIT TEST', reset: 'RESET', selectKnight: 'OPEN KNIGHT',
  focus: 'FOCUS', info: 'INFO', pause: 'PAUSE',
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

const formatSetupValue = (option: Extract<GameSetupOption, { type: 'range' }>, value: number) => {
  switch (option.valueFormat) {
    case 'seconds': return value === 0 ? 'OFF' : `${Math.round(value)}s`;
    case 'percent': return `${Math.round(value)}%`;
    case 'integer': return `${Math.round(value)}`;
    default: return `${value.toFixed(2)}×`;
  }
};

interface GameSetting {
  key: string;
  label: string;
  low: string;
  high: string;
  min: number;
  max: number;
  step: number;
  default: number;
  format?: 'multiplier' | 'seconds';
}

const GAME_SETTINGS: Record<string, GameSetting[]> = {
  driftspire: [
    { key: 'turnTimerSeconds', label: 'TURN TIMER', low: 'QUICK', high: 'RELAXED', min: 20, max: 60, step: 5, default: 35, format: 'seconds' },
    { key: 'animationSpeed', label: 'ANIMATION PACE', low: 'CINEMATIC', high: 'SNAPPY', min: 0.75, max: 1.5, step: 0.25, default: 1 },
  ],
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
  'knight-lab': [{ key: 'animationSpeed', label: 'ANIMATION SPEED', low: 'SLOW MOTION', high: 'FAST FORWARD', min: 0.5, max: 1.5, step: 0.25, default: 1 }],
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

  const [playerCount, setPlayerCount] = useState(() => selectedGame?.minPlayers ?? 2);
  const [gameOptions, setGameOptions] = useState<Record<string, GameSetupOptionValue>>({ speedMultiplier: 1 });
  const [arena, setArena] = useState('battle-pit');
  const [chosenColors, setChosenColors] = useState(DEFAULT_COLORS);
  const [playerTypes, setPlayerTypes] = useState<Record<number, PlayerType>>({});
  const [aiDifficulties, setAIDifficulties] = useState<Record<number, AIDifficulty>>({});
  const [phonePlayers, setPhonePlayers] = useState<Set<number>>(() => {
    const snapshot = remoteControllerService.getSnapshot();
    return new Set(Object.values(snapshot.slots)
      .filter(slot => slot.status === 'connected' && slot.profile?.gameId === selectedGame?.id)
      .map(slot => slot.playerId));
  });
  const [pairingPlayerId, setPairingPlayerId] = useState<number | null>(null);
  const remoteSnapshot = useSyncExternalStore(
    remoteControllerService.subscribe,
    remoteControllerService.getSnapshot,
    remoteControllerService.getSnapshot,
  );

  const isSnakeArena = selectedGame?.id === 'snake-arena';

  if (!selectedGame) return null;

  const settings = GAME_SETTINGS[selectedGame.id] ?? GAME_SETTINGS['micro-game'];
  const setupOptions = selectedGame.setup?.options;
  const playerSetup = selectedGame.setup?.players;
  const supportsBots = playerSetup?.supportsBots === true;
  const aiDifficultyOptions = playerSetup?.aiDifficultyOptions ?? ['easy', 'normal', 'hard'];
  const availablePlayerCounts = Array.from(
    { length: selectedGame.maxPlayers - selectedGame.minPlayers + 1 },
    (_, index) => selectedGame.minPlayers + index,
  );

  const handleColorSelect = (playerIdx: number, hex: string) => {
    setChosenColors((current) => current.map((color, index) => index === playerIdx ? hex : color));
  };

  const handleStart = () => {
    const activePlayers: PlayerConfig[] = Array.from({ length: playerCount }, (_, index) => {
      const playerId = index + 1;
      const type = supportsBots ? (playerTypes[playerId] ?? playerSetup?.defaultPlayerType ?? 'human') : 'human';
      const player: PlayerConfig = {
        id: playerId,
        name: type === 'bot' ? `Bot ${playerId}` : `Player ${playerId}`,
        color: chosenColors[index] || DEFAULT_COLORS[index],
        inputDeviceId: type === 'bot'
          ? undefined
          : phonePlayers.has(playerId)
            && remoteSnapshot.slots[playerId]?.status === 'connected'
            && remoteSnapshot.slots[playerId]?.profile?.gameId === selectedGame.id
            ? `remote-player-${playerId}`
            : 'keyboard-main',
      };
      if (supportsBots) {
        player.type = type;
        if (type === 'bot') player.aiDifficulty = aiDifficulties[playerId] ?? playerSetup?.defaultAIDifficulty ?? 'normal';
      }
      return player;
    });
    setPlayers(activePlayers);
    const configuredDefaults = Object.fromEntries((setupOptions ?? []).map((option) => [option.key, option.defaultValue]));
    const modifiers: GameModifiers = { ...selectedGame.defaultModifiers, ...configuredDefaults, ...gameOptions };
    if (isSnakeArena) modifiers.arena = arena;
    setModifiers(modifiers);
    setScreen('play');
  };

  const setControllerMode = (playerId: number, mode: 'keyboard' | 'phone') => {
    setPhonePlayers((current) => {
      const next = new Set(current);
      if (mode === 'phone') next.add(playerId);
      else next.delete(playerId);
      return next;
    });
    if (mode === 'keyboard') {
      remoteControllerService.disconnect(playerId);
      if (pairingPlayerId === playerId) setPairingPlayerId(null);
    }
  };

  const setPlayerType = (playerId: number, type: PlayerType) => {
    setPlayerTypes((current) => ({ ...current, [playerId]: type }));
    if (type === 'bot') {
      setPhonePlayers((current) => {
        const next = new Set(current);
        next.delete(playerId);
        return next;
      });
      remoteControllerService.disconnect(playerId);
      if (pairingPlayerId === playerId) setPairingPlayerId(null);
    }
  };

  const waitingPhonePlayers = Array.from(phonePlayers).filter(
    playerId => playerId <= playerCount && (
      remoteSnapshot.slots[playerId]?.status !== 'connected'
      || remoteSnapshot.slots[playerId]?.profile?.gameId !== selectedGame.id
    ),
  );
  const canStart = waitingPhonePlayers.length === 0;
  const pairingProfile = pairingPlayerId === null ? null : {
    playerId: pairingPlayerId,
    playerName: `Player ${pairingPlayerId}`,
    playerColor: chosenColors[pairingPlayerId - 1] || DEFAULT_COLORS[pairingPlayerId - 1],
    gameId: selectedGame.id,
    gameTitle: selectedGame.title,
    actions: Object.keys(selectedGame.defaultControls[pairingPlayerId - 1]?.bindings ?? {}),
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
              {availablePlayerCounts.map((count) => (
                <button key={count} onClick={() => setPlayerCount(count)} className={playerCount === count ? 'is-active' : ''}>{count}P</button>
              ))}
            </div>
          </div>

          <div className={`hero-card-grid hero-card-grid--${playerCount}`}>
            {Array.from({ length: playerCount }).map((_, playerIndex) => {
              const playerId = playerIndex + 1;
              const color = chosenColors[playerIndex] || DEFAULT_COLORS[playerIndex];
              const controlRows = getControlRows(selectedGame.defaultControls[playerIndex]?.bindings);
              const playerType = supportsBots ? (playerTypes[playerId] ?? playerSetup?.defaultPlayerType ?? 'human') : 'human';
              const isBot = playerType === 'bot';
              const usesPhone = !isBot && phonePlayers.has(playerId);
              const remoteSlot = remoteSnapshot.slots[playerId];
              const phoneConnected = remoteSlot?.status === 'connected' && remoteSlot.profile?.gameId === selectedGame.id;
              return (
                <article className="hero-card player-config-card" key={playerIndex} style={{ '--player-color': color } as React.CSSProperties}>
                  <div className="hero-card__topline"><span>P{playerId} // {isBot ? 'AI OPPONENT' : usesPhone ? 'PHONE' : `KEYBOARD ${playerId}`}</span><span className={`hero-card__ready ${usesPhone ? `remote-state--${phoneConnected ? 'connected' : remoteSlot?.status ?? 'idle'}` : ''}`}>{isBot ? 'BOT READY' : usesPhone ? (phoneConnected ? 'CONNECTED' : remoteSlot?.profile?.gameId === selectedGame.id ? (remoteSlot.status ?? 'WAITING').toUpperCase() : 'WAITING') : 'READY'}</span></div>
                  <div className="player-config-card__summary"><span className="player-config-card__swatch" style={{ backgroundColor: color }} /><div><span>{isBot ? 'COMPUTER' : 'PLAYER'} {playerIndex + 1}</span><h3>{isBot ? 'AI PLAYER' : 'ACTIVE PLAYER'}</h3></div></div>
                  {supportsBots && <div className="player-kind-toggle" aria-label={`Player ${playerId} type`}>
                    <button className={!isBot ? 'is-active' : ''} onClick={() => setPlayerType(playerId, 'human')}>HUMAN</button>
                    <button className={isBot ? 'is-active' : ''} onClick={() => setPlayerType(playerId, 'bot')}>BOT</button>
                  </div>}
                  {isBot ? (
                    <label className="bot-difficulty-select"><span>AI DIFFICULTY</span><select value={aiDifficulties[playerId] ?? playerSetup?.defaultAIDifficulty ?? 'normal'} onChange={(event) => setAIDifficulties((current) => ({ ...current, [playerId]: event.target.value as AIDifficulty }))}>{aiDifficultyOptions.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty.toUpperCase()}</option>)}</select></label>
                  ) : <><div className="controller-mode-toggle" aria-label={`Player ${playerId} controller`}>
                    <button className={!usesPhone ? 'is-active' : ''} onClick={() => setControllerMode(playerId, 'keyboard')}>⌨ KEYBOARD</button>
                    <button className={usesPhone ? 'is-active' : ''} onClick={() => setControllerMode(playerId, 'phone')}>▣ PHONE</button>
                  </div>
                  {usesPhone ? (
                    <div className="player-controls player-controls--phone">
                      <span>DIRECT CONTROLLER // P{playerId}</span>
                      {phoneConnected
                        ? <strong>● PHONE CONNECTED</strong>
                        : <button className="connect-phone-button" onClick={() => setPairingPlayerId(playerId)}>SHOW PAIRING QR</button>}
                    </div>
                  ) : (
                    <div className="player-controls"><span>KEY MAP // P{playerId}</span><div>{controlRows.map((row) => <strong key={row}>{row}</strong>)}</div></div>
                  )}</>}
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
            {setupOptions?.length ? setupOptions.map((option) => {
              const value = gameOptions[option.key] ?? option.defaultValue;
              if (option.type === 'select') return <section className="setting-block setting-block--choice" key={option.key}><div className="setting-label"><span>{option.label}</span></div>{option.description && <small className="setting-description">{option.description}</small>}<select className="setup-select" value={String(value)} onChange={(event) => { const match = option.options.find((item) => String(item.value) === event.target.value); setGameOptions((current) => ({ ...current, [option.key]: match?.value ?? event.target.value })); }}>{option.options.map((item) => <option key={String(item.value)} value={String(item.value)}>{item.label}</option>)}</select></section>;
              if (option.type === 'toggle') return <section className="setting-block setting-block--choice" key={option.key}><div className="setting-label"><span>{option.label}</span><strong>{value ? option.enabledLabel ?? 'ON' : option.disabledLabel ?? 'OFF'}</strong></div>{option.description && <small className="setting-description">{option.description}</small>}<button type="button" className={`setup-toggle ${value ? 'is-active' : ''}`} aria-pressed={Boolean(value)} onClick={() => setGameOptions((current) => ({ ...current, [option.key]: !value }))}><span>{value ? option.enabledLabel ?? 'ENABLED' : option.disabledLabel ?? 'DISABLED'}</span><i /></button></section>;
              const rangeValue = typeof value === 'number' ? value : option.defaultValue;
              return <section className="setting-block" key={option.key}><div className="setting-label"><span>{option.label}</span><strong>{formatSetupValue(option, rangeValue)}</strong></div>{option.description && <small className="setting-description">{option.description}</small>}<input className="speed-control" type="range" min={option.min} max={option.max} step={option.step} value={rangeValue} onChange={(event) => setGameOptions((current) => ({ ...current, [option.key]: Number(event.target.value) }))} /><div className="range-labels"><span>{option.lowLabel}</span><span>{option.highLabel}</span></div></section>;
            }) : settings.map((setting) => {
              const value = Number(gameOptions[setting.key] ?? selectedGame.defaultModifiers[setting.key] ?? setting.default);
              return <section className="setting-block" key={setting.key}>
                <div className="setting-label"><span>{setting.label}</span><strong>{setting.format === 'seconds' ? `${Math.round(value)}s` : `${value.toFixed(2)}×`}</strong></div>
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
            <span>{canStart ? 'ALL SYSTEMS NOMINAL' : `WAITING FOR ${waitingPhonePlayers.length} PHONE${waitingPhonePlayers.length > 1 ? 'S' : ''}`}</span>
            <button className="pixel-btn pixel-btn-primary setup-launch" disabled={!canStart} onClick={handleStart}>START GAME <b>▶</b></button>
          </div>
        </aside>
      </section>
      {pairingProfile && (
        <RemotePairingModal
          profile={pairingProfile}
          onClose={() => setPairingPlayerId(null)}
          onConnected={() => setPairingPlayerId(null)}
        />
      )}
    </main>
  );
};
