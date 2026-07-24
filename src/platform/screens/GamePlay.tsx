import React, { useEffect, useRef, useState } from 'react';
import { usePlatformStore } from '@platform/stores/platformStore';
import { GameRegistry } from '@runtime/GameRegistry';
import { GameRunner } from '@runtime/GameRunner';

const runner = new GameRunner();

export const GamePlay: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedGame = usePlatformStore((s) => s.selectedGame);
  const players = usePlatformStore((s) => s.players);
  const modifiers = usePlatformStore((s) => s.modifiers);
  const setScreen = usePlatformStore((s) => s.setScreen);
  const setResults = usePlatformStore((s) => s.setResults);
  const setCrash = usePlatformStore((s) => s.setCrash);

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!selectedGame || !containerRef.current) return;

    const entry = GameRegistry.get(selectedGame.id);
    if (!entry) return;

    const unsubGameOver = runner.eventService.on('game:over', (data) => {
      setResults(data);
      setScreen('results');
    });

    const unsubPause = runner.eventService.on('game:pause', () => {
      setIsPaused(true);
    });

    const unsubCrash = runner.eventService.on('game:crash', (data) => {
      setCrash(data.error);
    });

    runner.launchGame(entry, players, modifiers, containerRef.current);

    return () => {
      unsubGameOver();
      unsubPause();
      unsubCrash();
      runner.stopGame();
    };
  }, [selectedGame, players, modifiers, setResults, setCrash]);

  const handleResume = () => {
    setIsPaused(false);
    runner.resume();
  };

  const handleQuit = () => {
    runner.stopGame();
    setScreen('browser');
  };

  const handleInfo = () => {
    const game = (runner as any).currentGame;
    if (game && typeof (game as any).showInfoToggle === 'function') {
      (game as any).showInfoToggle();
    }
  };

  return (
    <div className="screen-transition" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div className="scanline-overlay" />

      <div ref={containerRef} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />

      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, display: 'flex', gap: '12px' }}>
        {selectedGame?.id === 'snake-arena' && (
          <button
            className="pixel-btn"
            onClick={handleInfo}
            title="Item & Control Info"
            style={{ fontSize: '1.5rem', padding: '8px 16px' }}
          >
            ?
          </button>
        )}
        <button
          className="pixel-btn"
          onClick={() => {
            runner.pause();
            setIsPaused(true);
          }}
          style={{ fontSize: '1.5rem', padding: '8px 16px' }}
        >
          ⏸
        </button>
      </div>

      {isPaused && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 14, 23, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <h2 style={{ fontSize: '4rem', color: 'var(--pixel-yellow)', marginBottom: '48px', textShadow: '4px 4px 0 var(--pixel-red)' }}>GAME PAUSED</h2>
          <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '320px' }}>
            <button
              className="pixel-btn pixel-btn-primary"
              onClick={handleResume}
              style={{ width: '100%', fontSize: '1.2rem', padding: '16px' }}
            >
              ▶ RESUME
            </button>
            <button
              className="pixel-btn pixel-btn-danger"
              onClick={handleQuit}
              style={{ width: '100%', fontSize: '1.2rem', padding: '16px' }}
            >
              ✕ QUIT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
