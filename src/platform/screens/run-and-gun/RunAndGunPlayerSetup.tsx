import React, { useCallback } from 'react';
import { useRunAndGunStore } from '@platform/stores/runAndGunStore';
import { usePlatformStore } from '@platform/stores/platformStore';
import { CHARACTERS } from '@games/run-and-gun/config/characters';
import { PLAYER_CONTROLS } from '@games/run-and-gun/config/controls';
import { SoldierPortrait } from '@platform/components/SoldierPortrait';

export const RunAndGunPlayerSetup: React.FC = () => {
  const setPlatformScreen = usePlatformStore((s) => s.setScreen);
  const player1 = useRunAndGunStore((s) => s.player1);
  const player2 = useRunAndGunStore((s) => s.player2);
  const difficulty = useRunAndGunStore((s) => s.difficulty);
  const setScreen = useRunAndGunStore((s) => s.setScreen);

  const p1Char =
    CHARACTERS.find((c) => c.id === player1.characterId) ?? CHARACTERS[0];
  const p2Char =
    CHARACTERS.find((c) => c.id === player2.characterId) ?? CHARACTERS[1];

  const handleStart = useCallback(() => {
    setScreen('controls');
    setPlatformScreen('run-and-gun-controls');
  }, [setScreen, setPlatformScreen]);

  const handleBack = useCallback(() => {
    setScreen('character-select');
    setPlatformScreen('run-and-gun-character');
  }, [setScreen, setPlatformScreen]);

  return (
    <div className="rg-screen screen-transition">
      <div className="scanline-overlay" />
      <div className="rg-bg" />

      <div className="rg-char-header">
        <h2>2 PLAYER MODE</h2>
      </div>

      <div className="rg-setup-panels">
        {/* Player 1 */}
        <div className="rg-setup-card rg-setup-card--p1">
          <div className="rg-setup-header">
            <h3 style={{ color: 'var(--pixel-red)' }}>PLAYER 1</h3>
          </div>
          <div className="rg-setup-body">
            <div className="rg-setup-char-preview">
              <SoldierPortrait character={p1Char} size="sm" />
              <span className="rg-setup-char-name">{p1Char.name}</span>
            </div>
            <div className="rg-setup-controls">
              <span>CONTROLS</span>
              <dl>
                {PLAYER_CONTROLS[1].bindings.map((b) => (
                  <div key={b.label} className="rg-control-row">
                    <dt>{b.label}</dt>
                    <dd>{b.keys}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Player 2 */}
        <div className="rg-setup-card rg-setup-card--p2">
          <div className="rg-setup-header">
            <h3 style={{ color: 'var(--pixel-blue)' }}>PLAYER 2</h3>
          </div>
          <div className="rg-setup-body">
            <div className="rg-setup-char-preview">
              <SoldierPortrait character={p2Char} size="sm" />
              <span className="rg-setup-char-name">{p2Char.name}</span>
            </div>
            <div className="rg-setup-controls">
              <span>CONTROLS</span>
              <dl>
                {PLAYER_CONTROLS[2].bindings.map((b) => (
                  <div key={b.label} className="rg-control-row">
                    <dt>{b.label}</dt>
                    <dd>{b.keys}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty */}
      <div className="rg-difficulty-section">
        <p className="rg-difficulty-label">DIFFICULTY: {difficulty.label}</p>
        <ul className="rg-difficulty-desc">
          {difficulty.description.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="rg-actions-row" style={{ marginTop: 24 }}>
        <button className="rg-btn-back" onClick={handleBack}>
          ◀ BACK
        </button>
        <button className="rg-btn-start" onClick={handleStart}>
          START MISSION
        </button>
      </div>
    </div>
  );
};
