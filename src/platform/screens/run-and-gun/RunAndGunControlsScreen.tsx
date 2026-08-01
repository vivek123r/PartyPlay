import React, { useCallback, useEffect } from 'react';
import { useRunAndGunStore } from '@platform/stores/runAndGunStore';
import { usePlatformStore } from '@platform/stores/platformStore';
import { CHARACTERS } from '@games/run-and-gun/config/characters';
import { PLAYER_CONTROLS } from '@games/run-and-gun/config/controls';
import { SoldierPortrait } from '@platform/components/SoldierPortrait';
import { GameRegistry } from '@runtime/GameRegistry';

export const RunAndGunControlsScreen: React.FC = () => {
  const setPlatformScreen = usePlatformStore((s) => s.setScreen);
  const platformSetSelectedGame = usePlatformStore((s) => s.setSelectedGame);
  const platformSetPlayers = usePlatformStore((s) => s.setPlayers);
  const platformSetModifiers = usePlatformStore((s) => s.setModifiers);
  const gameMode = useRunAndGunStore((s) => s.gameMode);
  const player1 = useRunAndGunStore((s) => s.player1);
  const player2 = useRunAndGunStore((s) => s.player2);
  const setScreen = useRunAndGunStore((s) => s.setScreen);
  const resetGameMode = useRunAndGunStore((s) => s.resetGameMode);

  const isTwoPlayer = gameMode === '2-players';

  const p1Char =
    CHARACTERS.find((c) => c.id === player1.characterId) ?? CHARACTERS[0];
  const p2Char =
    CHARACTERS.find((c) => c.id === player2.characterId) ?? CHARACTERS[1];

  const handleStartMission = useCallback(() => {
    const entry = GameRegistry.get('run-and-gun');
    if (!entry) return;

    const players = [
      { id: 1, name: p1Char.name, color: player1.color },
    ];
    if (isTwoPlayer) {
      players.push({ id: 2, name: p2Char.name, color: player2.color });
    }

    const storeState = useRunAndGunStore.getState();
    const dif = storeState.difficulty;
    const modifiers = {
      characterIds: { 1: player1.characterId, 2: player2.characterId },
      difficulty: {
        enemyCountMultiplier: dif.enemyCountMultiplier,
        enemyHealthMultiplier: dif.enemyHealthMultiplier,
        bossHealthMultiplier: dif.bossHealthMultiplier,
      },
    };

    platformSetSelectedGame(entry.manifest);
    platformSetPlayers(players);
    platformSetModifiers(modifiers);
    setPlatformScreen('play');
  }, [player1, player2, isTwoPlayer, p1Char, p2Char, platformSetSelectedGame, platformSetPlayers, platformSetModifiers, setPlatformScreen]);

  const handleBack = useCallback(() => {
    resetGameMode();
    setScreen('title');
    setPlatformScreen('run-and-gun-title');
  }, [resetGameMode, setScreen, setPlatformScreen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleStartMission();
      } else if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStartMission, handleBack]);

  return (
    <div className="rg-screen screen-transition">
      <div className="scanline-overlay" />
      <div className="rg-bg" />

      <div className="rg-char-header">
        <h2>{isTwoPlayer ? '2 PLAYER' : '1 PLAYER'} CONTROLS</h2>
      </div>

      <div className="rg-controls-layout">
        {/* Player 1 */}
        <div className="rg-controls-column rg-controls-column--p1">
          <h3 style={{ color: 'var(--pixel-red)' }}>
            PLAYER 1 — {p1Char.name}
          </h3>
          <SoldierPortrait character={p1Char} size="sm" />
          <div style={{ height: 12 }} />
          {PLAYER_CONTROLS[1].bindings.map((b) => (
            <div key={b.label} className="rg-controls-key-row">
              <span className="rg-controls-key-label">{b.label}</span>
              <span className="rg-controls-key-keys">{b.keys}</span>
            </div>
          ))}
        </div>

        {/* Player 2 (only in 2P mode) */}
        {isTwoPlayer && (
          <div className="rg-controls-column rg-controls-column--p2">
            <h3 style={{ color: 'var(--pixel-blue)' }}>
              PLAYER 2 — {p2Char.name}
            </h3>
            <SoldierPortrait character={p2Char} size="sm" />
            <div style={{ height: 12 }} />
            {PLAYER_CONTROLS[2].bindings.map((b) => (
              <div key={b.label} className="rg-controls-key-row">
                <span className="rg-controls-key-label">{b.label}</span>
                <span className="rg-controls-key-keys">{b.keys}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rg-actions-row">
        <button className="rg-btn-back" onClick={handleBack}>
          ◀ MENU
        </button>
        <button className="rg-btn-start" onClick={handleStartMission}>
          START MISSION
        </button>
      </div>

      <div className="rg-hint-bar blink-text">
        ENTER START &nbsp;&nbsp;&nbsp; ESC BACK
      </div>
    </div>
  );
};
