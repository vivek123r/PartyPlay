import React from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';
import { GameRegistry } from '@runtime/GameRegistry';

export const GameBrowser: React.FC = () => {
  const setScreen = usePlatformStore((s) => s.setScreen);
  const setSelectedGame = usePlatformStore((s) => s.setSelectedGame);

  const games = GameRegistry.getAll();

  const getGameTheme = (id: string) => {
    switch (id) {
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
    <div className="screen-transition" style={{ width: '100vw', height: '100vh', padding: '32px 48px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div className="scanline-overlay" />
      
      {/* Top Arcade Marquee & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', zIndex: 10 }}>
        <button
          className="pixel-btn"
          onClick={() => setScreen('menu')}
          style={{ fontSize: '0.9rem' }}
        >
          ◀ RETURN
        </button>

        {/* LED Glow Marquee Header */}
        <div className="marquee-banner">
          <h2 className="led-flicker" style={{ fontSize: '1.8rem', color: 'var(--pixel-yellow)', textShadow: '3px 3px 0 var(--pixel-purple)', letterSpacing: '3px' }}>
            ★ PARTYPLAY ARCADE ★
          </h2>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-blue)', display: 'block', marginTop: '4px' }}>
            SELECT CARTRIDGE TO PLAY
          </span>
        </div>

        {/* Insert Coin HUD */}
        <div className="pixel-panel" style={{ padding: '8px 16px', border: '2px solid var(--pixel-yellow)', textAlign: 'right' }}>
          <span className="blink-text" style={{ color: 'var(--pixel-yellow)', fontSize: '0.75rem', fontFamily: 'var(--font-pixel-heading)', display: 'block' }}>
            INSERT COIN
          </span>
          <span style={{ color: 'var(--pixel-green)', fontSize: '0.9rem', fontFamily: 'var(--font-pixel-heading)' }}>
            CREDITS: 99
          </span>
        </div>
      </div>

      {/* Cartridge Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '32px', overflowY: 'auto', paddingBottom: '32px', paddingRight: '8px', zIndex: 10 }}>
        {games.map(({ manifest }) => {
          const theme = getGameTheme(manifest.id);

          return (
            <div
              key={manifest.id}
              className={`pixel-panel ${theme.cardClass}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '270px',
                boxShadow: '0 6px 0 rgba(0,0,0,0.5)',
              }}
            >
              <div>
                {/* Physical Cartridge PCB Pin Connector Motif */}
                <div className="cartridge-pins" />

                {/* Top Badge & Slot Serial Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pixel-badge" style={{ backgroundColor: theme.accentColor, color: 'var(--pixel-bg)' }}>
                      {theme.badgeText}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-muted)' }}>
                      {theme.slotId}
                    </span>
                  </div>

                  {/* Status LED */}
                  <span
                    className={theme.statusClass}
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-pixel-heading)',
                      color: theme.isFaulty ? 'var(--pixel-red)' : 'var(--pixel-green)',
                      border: '1px solid currentColor',
                      padding: '2px 6px',
                    }}
                  >
                    {theme.statusLed}
                  </span>
                </div>

                {/* Game Title */}
                <h3 style={{ fontSize: '1.4rem', color: 'var(--pixel-text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>{theme.motifIcon}</span> {manifest.title}
                </h3>

                {/* Star Difficulty & Players */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', fontSize: '0.75rem', fontFamily: 'var(--font-pixel-heading)', color: 'var(--pixel-muted)' }}>
                  <span style={{ color: 'var(--pixel-yellow)' }}>DIFF: {theme.stars}</span>
                  <span style={{ color: 'var(--pixel-blue)' }}>👥 {manifest.minPlayers}-{manifest.maxPlayers}P</span>
                </div>

                {/* Description */}
                <p style={{ color: 'var(--pixel-muted)', fontSize: '1.15rem', lineHeight: '1.4', marginBottom: '20px' }}>
                  {manifest.description}
                </p>
              </div>

              {/* Bottom Card Action Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px dashed var(--pixel-muted)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--pixel-purple)', fontFamily: 'var(--font-pixel-heading)' }}>
                  EST: {manifest.estimatedRoundTime}
                </span>

                {/* Creative Themed Button */}
                <button
                  className={`pixel-btn ${theme.btnClass}`}
                  onClick={() => {
                    setSelectedGame(manifest);
                    setScreen('setup');
                  }}
                >
                  {theme.btnText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
