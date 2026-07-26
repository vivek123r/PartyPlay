import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import MythicFarmGame from '../index';
import { Container } from 'pixi.js';

function createMockContext() {
  const stageChildren: Container[] = [];
  const stageMock: any = {
    children: stageChildren,
    addChild: vi.fn((child: Container) => {
      stageChildren.push(child);
      return child;
    }),
    removeChild: vi.fn((child: Container) => {
      const idx = stageChildren.indexOf(child);
      if (idx !== -1) stageChildren.splice(idx, 1);
      return child;
    }),
    eventMode: 'none',
  };

  const playedTones: Array<{ freq: number; type: string; duration: number; category: string; volume: number }> = [];

  const audioMock: any = {
    playTone: vi.fn((freq, type, duration, category, volume) => {
      playedTones.push({ freq, type, duration, category, volume });
    }),
  };

  const storageData: Record<string, string> = {};
  const storageMock: any = {
    get: vi.fn((key: string, defaultValue: any) => {
      return storageData[key] !== undefined ? JSON.parse(storageData[key]) : defaultValue;
    }),
    set: vi.fn((key: string, value: any) => {
      storageData[key] = JSON.stringify(value);
    }),
    remove: vi.fn((key: string) => {
      delete storageData[key];
    }),
  };

  const loggerMock: any = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    context: {
      renderer: { stage: stageMock, viewport: { width: 480, height: 270 } },
      input: {},
      audio: audioMock,
      storage: storageMock,
      events: {},
      random: { next: () => 0.5 },
      asset: {},
      logger: loggerMock,
      modifiers: { initialCoins: 500 },
      players: [{ id: 1, color: '#ff0000', name: 'Player 1' }],
    } as any,
    stageChildren,
    playedTones,
  };
}

describe('MythicFarmGame Empirical Lifecycle & Stress Harness', () => {

  describe('1. Stage & Memory Leak Tests on Rapid Init/Destroy Cycles', () => {
    it('does not leak rootContainer in stage.children after rapid init/destroy cycles (50 cycles)', async () => {
      const { context, stageChildren } = createMockContext();

      for (let i = 0; i < 50; i++) {
        const game = new MythicFarmGame();
        await game.init(context);
        expect(game.state).toBe('Ready');
        expect(stageChildren.length).toBe(1);

        game.start();
        expect(game.state).toBe('Playing');

        game.destroy();
        expect(game.state).toBe('Destroyed');
      }

      expect(stageChildren.length).toBe(0);
    });

    it('handles multiple rapid init/destroy cycles on the SAME instance', async () => {
      const { context, stageChildren } = createMockContext();
      const game = new MythicFarmGame();

      for (let i = 0; i < 10; i++) {
        await game.init(context);
        expect(game.state).toBe('Ready');
        game.start();
        game.destroy();
        expect(game.state).toBe('Destroyed');
      }

      expect(stageChildren.length).toBe(0);
    });

    it('handles double init() call on same instance without destroy()', async () => {
      const { context, stageChildren } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      expect(stageChildren.length).toBe(1);

      // Call init again without destroying
      await game.init(context);
      expect(stageChildren.length).toBe(1);
    });

    it('handles double destroy() call gracefully without throwing errors', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      game.start();
      game.destroy();
      expect(game.state).toBe('Destroyed');

      expect(() => game.destroy()).not.toThrow();
    });
  });

  describe('2. Audio & Orphaned Event Listener / Timer Leak Tests', () => {
    it('cancels background music timers completely upon destroy()', async () => {
      vi.useFakeTimers();
      const { context, playedTones } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      game.start();

      // BGM note should fire on start
      expect(playedTones.length).toBeGreaterThan(0);
      const tonesCountBefore = playedTones.length;

      // Advance timer by 1000ms (should play 2 more BGM notes at 500ms intervals)
      vi.advanceTimersByTime(1000);
      expect(playedTones.length).toBeGreaterThan(tonesCountBefore);

      const tonesCountDuring = playedTones.length;

      // Destroy game
      game.destroy();

      // Advance timer by another 5000ms
      vi.advanceTimersByTime(5000);

      // No new BGM notes should have played after destroy!
      expect(playedTones.length).toBe(tonesCountDuring);

      vi.useRealTimers();
    });

    it('prevents orphaned SFX timers from playing after destroy()', async () => {
      vi.useFakeTimers();
      const { context, playedTones } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      game.start();

      const synth = game.getAudioSynthesizer();
      expect(synth).not.toBeNull();

      // Trigger arpeggio sound effect (harvest, levelUp) which uses setTimeouts
      playedTones.length = 0;
      synth?.playHarvest(); // schedules tones at 0ms, 60ms, 120ms, 180ms
      synth?.playLevelUp(); // schedules tones at 0ms, 70ms, 140ms, 210ms, 280ms, 350ms

      // Destroy immediately after triggering SFX
      game.destroy();
      const tonesAtDestroy = playedTones.length;

      // Advance timers by 1000ms
      vi.advanceTimersByTime(1000);

      // If timers were orphaned, playedTones will increase after game destruction!
      expect(playedTones.length).toBe(tonesAtDestroy);

      vi.useRealTimers();
    });

    it('prevents multiple parallel BGM timers on rapid start/pause/resume calls', async () => {
      vi.useFakeTimers();
      const { context, playedTones } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);

      for (let i = 0; i < 10; i++) {
        game.start();
        game.pause();
        game.resume();
      }

      playedTones.length = 0;
      vi.advanceTimersByTime(500);

      // In a 500ms step with 1 active BGM loop, exactly 1 note should play.
      expect(playedTones.length).toBe(1);

      game.destroy();
      vi.useRealTimers();
    });
  });

  describe('3. Deterministic Tick Loop & Update Handling', () => {
    it('ignores update(dt) when state is not Playing', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      // State is Ready
      game.update(1.0);
      expect((game as any).gameTimeAccumulator).toBe(0);

      game.start();
      game.pause();
      // State is Paused
      game.update(1.0);
      expect((game as any).gameTimeAccumulator).toBe(0);

      game.destroy();
      // State is Destroyed
      game.update(1.0);
      expect((game as any).gameTimeAccumulator).toBe(0);
    });

    it('accumulates gameTimeAccumulator deterministically over 3600 frames (60 seconds at 60 FPS)', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      game.start();

      const dt = 1 / 60;
      for (let i = 0; i < 3600; i++) {
        game.update(dt);
      }

      expect((game as any).gameTimeAccumulator).toBeCloseTo(60.0, 5);
      game.destroy();
    });

    it('handles abnormal dt values (negative, zero, very large, NaN, Infinity)', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      game.start();

      // Negative dt
      game.update(-1.0);
      expect((game as any).gameTimeAccumulator).toBeGreaterThanOrEqual(0);

      // NaN dt
      game.update(NaN);
      expect(Number.isNaN((game as any).gameTimeAccumulator)).toBe(false);

      // Infinity dt
      game.update(Infinity);
      expect(Number.isFinite((game as any).gameTimeAccumulator)).toBe(true);

      game.destroy();
    });
  });

  describe('4. Lifecycle State Machine Edge Cases & Resilience', () => {
    it('handles destroy() when called during Loading state gracefully', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      // Initiate init but call destroy
      const initPromise = game.init(context);
      game.destroy();
      await initPromise;

      expect(game.state).toBe('Destroyed');
    });

    it('prevents error during destroy() if StorageManager throws exception', async () => {
      const { context } = createMockContext();
      context.storage.set = vi.fn(() => {
        throw new Error('Disk Full');
      });

      const game = new MythicFarmGame();
      await game.init(context);
      game.start();

      expect(() => game.destroy()).not.toThrow();
      expect(game.state).toBe('Destroyed');
    });

    it('clears texture generator textures on destroy', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      const texGen = game.getTextureGenerator();
      expect(texGen).toBeDefined();

      game.destroy();
      expect((texGen as any).cache.size).toBe(0);
    });

    it('prevents start() from non-Ready state', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      // Initial state is Initializing
      game.start();
      expect(game.state).toBe('Initializing');

      await game.init(context);
      game.start();
      expect(game.state).toBe('Playing');

      // Attempt start while already Playing
      game.start();
      expect(game.state).toBe('Playing');
    });

    it('prevents pause() from non-Playing state', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      // State is Ready
      game.pause();
      expect(game.state).toBe('Ready');
    });

    it('prevents resume() from non-Paused state', async () => {
      const { context } = createMockContext();
      const game = new MythicFarmGame();

      await game.init(context);
      game.start();
      // State is Playing
      game.resume();
      expect(game.state).toBe('Playing');
    });
  });

});
