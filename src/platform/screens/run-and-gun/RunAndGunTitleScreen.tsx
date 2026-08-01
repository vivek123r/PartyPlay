import React, { useEffect, useCallback } from 'react';
import { useRunAndGunStore } from '@platform/stores/runAndGunStore';
import { usePlatformStore } from '@platform/stores/platformStore';
import { useMenuNavigation } from './useMenuNavigation';

const MENU_ITEMS = ['1 PLAYER', '2 PLAYERS', 'SETTINGS'];

const TARGETS: Record<number, string> = {
  0: 'run-and-gun-character',
  1: 'run-and-gun-character',
  2: 'run-and-gun-settings',
};

export const RunAndGunTitleScreen: React.FC = () => {
  const setPlatformScreen = usePlatformStore((s) => s.setScreen);
  const selectGameMode = useRunAndGunStore((s) => s.selectGameMode);
  const setScreen = useRunAndGunStore((s) => s.setScreen);

  const handleSelect = useCallback(
    (index: number) => {
      if (index === 0) {
        selectGameMode('1-player');
      } else if (index === 1) {
        selectGameMode('2-players');
      }

      const target = TARGETS[index];
      if (target === 'run-and-gun-character') {
        setScreen('character-select');
      } else if (target === 'run-and-gun-settings') {
        setScreen('settings');
      }
      setPlatformScreen(target as Parameters<typeof setPlatformScreen>[0]);
    },
    [selectGameMode, setScreen, setPlatformScreen],
  );

  const { selectedIndex } = useMenuNavigation({
    itemCount: MENU_ITEMS.length,
    onSelect: handleSelect,
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlatformScreen('menu');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setPlatformScreen]);

  return (
    <div className="rg-screen screen-transition">
      <div className="scanline-overlay" />
      <div className="rg-bg" />

      <div className="rg-title-block">
        <h1 className="rg-game-title">BLAZING<br />FURY</h1>
        <p className="rg-subtitle">RUN • GUN • SURVIVE</p>
      </div>

      <div className="rg-menu-panel">
        {MENU_ITEMS.map((item, index) => (
          <button
            key={item}
            className={`rg-menu-item${
              index === selectedIndex ? ' rg-menu-item--selected' : ''
            }`}
            onClick={() => handleSelect(index)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="rg-hint-bar blink-text">
        ↑ ↓ SELECT &nbsp;&nbsp;&nbsp; ENTER CONFIRM
      </div>
    </div>
  );
};
