import React, { useCallback, useEffect } from 'react';
import { useRunAndGunStore } from '@platform/stores/runAndGunStore';
import { usePlatformStore } from '@platform/stores/platformStore';
import { CHARACTERS } from '@games/run-and-gun/config/characters';
import { SoldierPortrait } from '@platform/components/SoldierPortrait';
import { useMenuNavigation } from './useMenuNavigation';
import type { PlayerSelection } from '@games/run-and-gun/types';

export const RunAndGunCharacterSelect: React.FC = () => {
  const setPlatformScreen = usePlatformStore((s) => s.setScreen);
  const gameMode = useRunAndGunStore((s) => s.gameMode);
  const player1 = useRunAndGunStore((s) => s.player1);
  const player2 = useRunAndGunStore((s) => s.player2);
  const selectCharacter = useRunAndGunStore((s) => s.selectCharacter);
  const setScreen = useRunAndGunStore((s) => s.setScreen);
  const resetGameMode = useRunAndGunStore((s) => s.resetGameMode);

  const isTwoPlayer = gameMode === '2-players';
  const gridCols = isTwoPlayer ? 2 : 3;
  const totalItems = isTwoPlayer ? CHARACTERS.length * 2 : CHARACTERS.length;

  const handleStart = useCallback(() => {
    if (isTwoPlayer) {
      setScreen('player-setup');
      setPlatformScreen('run-and-gun-setup');
    } else {
      setScreen('controls');
      setPlatformScreen('run-and-gun-controls');
    }
  }, [isTwoPlayer, setScreen, setPlatformScreen]);

  const handleBack = useCallback(() => {
    resetGameMode();
    setScreen('title');
    setPlatformScreen('run-and-gun-title');
  }, [resetGameMode, setScreen, setPlatformScreen]);

  const { selectedIndex, setSelectedIndex } = useMenuNavigation({
    itemCount: totalItems,
  });

  const activePlayer = isTwoPlayer
    ? selectedIndex < CHARACTERS.length
      ? 1
      : 2
    : 1;
  const activeCharIdx = isTwoPlayer
    ? selectedIndex % CHARACTERS.length
    : selectedIndex;

  const handleCharClick = useCallback(
    (charIdx: number, player: 1 | 2) => {
      const char = CHARACTERS[charIdx];
      const selection: PlayerSelection = {
        characterId: char.id,
        color: char.color,
      };
      selectCharacter(player, selection);
    },
    [selectCharacter],
  );

  // Enter on character select
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCharClick(activeCharIdx, activePlayer as 1 | 2);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeCharIdx, activePlayer, handleCharClick]);

  // Arrow Left/Right for 2P grid
  useEffect(() => {
    if (!isTwoPlayer) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const row = Math.floor(selectedIndex / gridCols);
        const col = selectedIndex % gridCols;
        const newCol = e.key === 'ArrowRight' ? (col + 1) % gridCols : (col - 1 + gridCols) % gridCols;
        setSelectedIndex(Math.min(row * gridCols + newCol, totalItems - 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isTwoPlayer, gridCols, selectedIndex, totalItems, setSelectedIndex]);

  const headerTitle = isTwoPlayer ? 'SELECT SOLDIERS' : 'SELECT SOLDIER';

  const currentSelection = activePlayer === 1 ? player1 : player2;

  if (isTwoPlayer) {
    return (
      <div className="rg-screen screen-transition">
        <div className="scanline-overlay" />
        <div className="rg-bg" />

        <div className="rg-char-header">
          <h2>{headerTitle}</h2>
        </div>

        <div className="rg-two-player-layout">
          {/* Player 1 column */}
          <div className="rg-player-column">
            <span className="rg-player-label rg-player-label--p1">P1</span>
            <div className="rg-char-grid rg-char-grid--split">
              {CHARACTERS.map((char, idx) => {
                const isSelected =
                  selectedIndex === idx && player1.characterId === char.id;
                const isP1Chosen = player1.characterId === char.id;
                return (
                  <button
                    key={`p1-${char.id}`}
                    className={`rg-char-card${
                      isSelected ? ' rg-char-card--selected' : ''
                    }`}
                    style={
                      isP1Chosen && !isSelected
                        ? { borderColor: 'var(--pixel-red)' }
                        : undefined
                    }
                    onClick={() => handleCharClick(idx, 1)}
                  >
                    <SoldierPortrait character={char} />
                    <span className="rg-char-name">{char.name}</span>
                    <span
                      className="rg-char-color-dot"
                      style={{ backgroundColor: char.color }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player 2 column */}
          <div className="rg-player-column">
            <span className="rg-player-label rg-player-label--p2">P2</span>
            <div className="rg-char-grid rg-char-grid--split">
              {CHARACTERS.map((char, idx) => {
                const globalIdx = CHARACTERS.length + idx;
                const isSelected =
                  selectedIndex === globalIdx && player2.characterId === char.id;
                const isP2Chosen = player2.characterId === char.id;
                return (
                  <button
                    key={`p2-${char.id}`}
                    className={`rg-char-card${
                      isSelected ? ' rg-char-card--selected' : ''
                    }`}
                    style={
                      isP2Chosen && !isSelected
                        ? { borderColor: 'var(--pixel-blue)' }
                        : undefined
                    }
                    onClick={() => handleCharClick(idx, 2)}
                  >
                    <SoldierPortrait character={char} />
                    <span className="rg-char-name">{char.name}</span>
                    <span
                      className="rg-char-color-dot"
                      style={{ backgroundColor: char.color }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ height: 24 }} />

        <div className="rg-actions-row">
          <button className="rg-btn-back" onClick={handleBack}>
            ◀ BACK
          </button>
          <button className="rg-btn-start" onClick={handleStart}>
            START MISSION
          </button>
        </div>
      </div>
    );
  }

  // 1 Player mode
  return (
    <div className="rg-screen screen-transition">
      <div className="scanline-overlay" />
      <div className="rg-bg" />

      <div className="rg-char-header">
        <h2>{headerTitle}</h2>
      </div>

      <div className="rg-char-grid">
        {CHARACTERS.map((char, idx) => {
          const isSelected = selectedIndex === idx;
          const isCurrent =
            currentSelection.characterId === char.id;
          return (
            <button
              key={char.id}
              className={`rg-char-card${
                isSelected ? ' rg-char-card--selected' : ''
              }`}
              style={
                isCurrent && !isSelected
                  ? { borderColor: 'var(--pixel-red)' }
                  : undefined
              }
              onClick={() => handleCharClick(idx, 1)}
            >
              <SoldierPortrait character={char} />
              <span className="rg-char-name">{char.name}</span>
              <span
                className="rg-char-color-dot"
                style={{ backgroundColor: char.color }}
              />
            </button>
          );
        })}
      </div>

      <div className="rg-actions-row">
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
