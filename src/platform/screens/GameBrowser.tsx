import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';
import { GameRegistry } from '@runtime/GameRegistry';

export const GameBrowser: React.FC = () => {
  const setScreen = usePlatformStore((s) => s.setScreen);
  const setSelectedGame = usePlatformStore((s) => s.setSelectedGame);
  const setPlayers = usePlatformStore((s) => s.setPlayers);
  const setModifiers = usePlatformStore((s) => s.setModifiers);

  const games = GameRegistry.getAll();

  const getGameTheme = (id: string) => {
    switch (id) {
      case 'rento':
        return {
          cardClass: 'driftspire-card-theme',
          btnClass: 'btn-driftspire',
          btnText: 'BUILD AN EMPIRE ▶',
          accentColor: '#ffd166',
          statusLed: '★ FLAGSHIP',
          statusClass: 'led-flicker',
          isFaulty: false,
          stars: '★★★★☆',
          slotId: 'SLOT #06',
          motifIcon: '🏙',
          badgeText: 'CITY STRATEGY',
        };
      case 'lava-escape':
        return {
          cardClass: 'lava-card-theme',
          btnClass: 'btn-lava',
          btnText: 'OUTRUN THE LAVA ▶',
          accentColor: '#ff7b36',
          statusLed: '★ FLAGSHIP',
          statusClass: 'led-flicker',
          isFaulty: false,
          stars: '★★★★☆',
          slotId: 'SLOT #05',
          motifIcon: '🌋',
          badgeText: 'SURVIVAL RACE',
        };
      case 'snake-arena':
        return {
          cardClass: 'snake-card-theme',
          btnClass: 'btn-snake',
          btnText: 'SLITHER IN ▶',
          accentColor: 'var(--pixel-green)',
          statusLed: '● ONLINE',
          statusClass: 'led-flicker',
          isFaulty: false,
          stars: '★★★★☆',
          slotId: 'SLOT #02',
          motifIcon: '🐍',
          badgeText: 'GRID BATTLE',
        };
      case 'knight-lab':
        return {
          cardClass: 'lab-card-theme',
          btnClass: 'btn-lab',
          btnText: 'OPEN LAB ▶',
          accentColor: 'var(--pixel-yellow)',
          statusLed: '◆ DEV TOOL',
          statusClass: '',
          isFaulty: false,
          stars: 'LAB MODE',
          slotId: 'TOOL #01',
          motifIcon: '⚔',
          badgeText: 'ANIMATION LAB',
        };
      case 'obstacle-survival':
        return {
          cardClass: 'obstacle-card-theme cartridge-tilted',
          btnClass: 'btn-obstacle',
          btnText: 'DODGE & SURVIVE ▶',
          accentColor: 'var(--pixel-red)',
          statusLed: '⚡ FAULTY WIRING',
          statusClass: 'led-flicker',
          isFaulty: true,
          stars: '★★★☆☆',
          slotId: 'SLOT #01',
          motifIcon: '⚠️',
          badgeText: 'FRANTIC DODGE',
        };
      default:
        return {
          cardClass: 'micro-card-theme',
          btnClass: 'btn-micro',
          btnText: 'LAUNCH TEST ▶',
          accentColor: 'var(--pixel-blue)',
          statusLed: '● READY',
          statusClass: '',
          isFaulty: false,
          stars: '★★☆☆☆',
          slotId: 'SLOT #00',
          motifIcon: '🧪',
          badgeText: 'CORE TEST',
        };
    }
  };

  return (
    <div className="screen-transition game-library">
      <div className="scanline-overlay" />
      
      {/* Top Arcade Marquee & Navigation */}
      <header className="game-library__header">
        <button
          className="pixel-btn game-library__return"
          onClick={() => setScreen('menu')}
        >
          ◀ RETURN
        </button>

        {/* LED Glow Marquee Header */}
        <div className="marquee-banner game-library__marquee">
          <h2 className="led-flicker">
            ★ PARTYPLAY ARCADE ★
          </h2>
          <span>
            SELECT CARTRIDGE TO PLAY
          </span>
        </div>

        {/* Insert Coin HUD */}
        <div className="pixel-panel game-library__credits">
          <span className="blink-text">
            INSERT COIN
          </span>
          <strong>
            CREDITS: 99
          </strong>
        </div>
      </header>

      {/* Cartridge Grid */}
      <main className="game-library__grid">
        {games.map(({ manifest }) => {
          const theme = getGameTheme(manifest.id);

          return (
            <div
              key={manifest.id}
              className={`pixel-panel game-library__card ${theme.cardClass}`}
            >
              <div>
                {/* Physical Cartridge PCB Pin Connector Motif */}
                <div className="cartridge-pins" />

                {/* Top Badge & Slot Serial Header */}
                <div className="game-library__card-header">
                  <div className="game-library__identity">
                    <span className="pixel-badge" style={{ backgroundColor: theme.accentColor, color: 'var(--pixel-bg)' }}>
                      {theme.badgeText}
                    </span>
                    <span className="game-library__slot">
                      {theme.slotId}
                    </span>
                  </div>

                  {/* Status LED */}
                  <span
                    className={`game-library__status ${theme.statusClass}`}
                    style={{
                      color: theme.isFaulty ? 'var(--pixel-red)' : 'var(--pixel-green)',
                    }}
                  >
                    {theme.statusLed}
                  </span>
                </div>

                {/* Game Title */}
                <h3 className="game-library__title">
                  <span>{theme.motifIcon}</span> {manifest.title}
                </h3>

                {/* Star Difficulty & Players */}
                <div className="game-library__meta">
                  <span style={{ color: 'var(--pixel-yellow)' }}>DIFF: {theme.stars}</span>
                  <span style={{ color: 'var(--pixel-blue)' }}>👥 {manifest.minPlayers}-{manifest.maxPlayers}P</span>
                </div>

                {/* Description */}
                <p className="game-library__description">
                  {manifest.description}
                </p>
              </div>

              {/* Bottom Card Action Footer */}
              <div className="game-library__footer">
                <span className="game-library__duration">
                  EST: {manifest.estimatedRoundTime}
                </span>

                {/* Creative Themed Button */}
                <button
                  className={`pixel-btn game-library__launch ${theme.btnClass}`}
                  onClick={() => {
                    setSelectedGame(manifest);
                    if (manifest.id === 'knight-lab') {
                      setPlayers([{ id: 1, name: 'Player 1', color: '#ffde7d' }]);
                      setModifiers({ animationSpeed: 1 });
                      setScreen('play');
                    } else {
                      setScreen('setup');
                    }
                  }}
                >
                  {theme.btnText}
                </button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};
