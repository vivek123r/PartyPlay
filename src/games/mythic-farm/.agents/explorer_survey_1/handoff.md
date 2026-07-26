# Handoff Report: PartyPlay Codebase & Game Architecture Survey

## 1. Observation

### 1.1 Project Structure & Build Configuration
- Root directory `/home/viv/Projects/PartyPlay` contains `package.json`, `tsconfig.json`, `tsconfig.app.json`, `vite.config.ts`, `project.md`, and `src/`.
- `package.json` specifies dependencies: `react` (`^19.2.7`), `react-dom` (`^19.2.7`), `react-router-dom` (`^7.18.1`), `zustand` (`^5.0.14`), `pixi.js` (`^8.19.0`), `vite` (`^8.1.1`), `vitest` (`^4.1.10`), `typescript` (`~6.0.2`).
- `vite.config.ts` configures plugins `@vitejs/plugin-react` and `vite-tsconfig-paths`, with path aliases:
  - `@platform` → `src/platform`
  - `@runtime` → `src/runtime`
  - `@services` → `src/services`
  - `@games` → `src/games`
  - `@shared` → `src/shared`
- `npx tsc --noEmit` and `npm run build` execute with zero errors (build time ~443ms producing output in `dist/`).

### 1.2 Runtime & Renderer System
- Virtual canvas resolution is **480 × 270** (`src/runtime/RendererContext.ts:5-6`).
- Canvas scale is computed dynamically using integer scaling (`src/runtime/RendererContext.ts:14-18`).
- `TextureSource.defaultOptions.scaleMode = 'nearest'` (`src/runtime/GameRunner.ts:15`) enforces pixelated crisp rendering.
- `GameLoop` (`src/runtime/GameLoop.ts:5-6`) runs a deterministic 60 FPS tick loop (`FIXED_DT = 1 / 60`, `MAX_STEPS = 5`).
- Crash boundary isolation catches unhandled errors in `update()` and routes to `<CrashScreen />` (`src/runtime/GameRunner.ts:134-153`).

### 1.3 Service Infrastructure
- `InputService` (`src/services/input/InputService.ts`): Keyboard polling (`KeyboardDevice`) supporting `isActive(action)`, `isJustPressed(action)`, `isJustReleased(action)`.
- `AudioService` (`src/services/audio/AudioService.ts`): Procedural Web Audio API sound synthesis via `playTone(freq, type, duration, channel, volume)`.
- `StorageService` (`src/services/storage/StorageService.ts`): Namespaced LocalStorage wrapper (`partyplay:games:<game-id>:`).
- `EventService` (`src/services/events/EventService.ts`): Global pub/sub event bus supporting platform lifecycle and gameplay events (`game:over`, `game:pause`, `game:crash`).
- `AssetService` (`src/services/asset/AssetService.ts`): Texture preloading and caching.
- `LoggerService` (`src/services/logger/LoggerService.ts`): Namespaced console logger.

### 1.4 Game Registration Architecture
- `GameRegistry` (`src/runtime/GameRegistry.ts:17-25`) dynamically discovers games via Vite `import.meta.glob`:
  - `../games/*/manifest.ts` (eager import for manifest data).
  - `../games/*/index.ts` (lazy import for `GameModule` default export class).
- Reference implementation inspected: `src/games/micro-game/manifest.ts` and `src/games/micro-game/index.ts`.

---

## 2. Logic Chain

1. **Given** the requirement to build "MYTHIC FARM" inside PartyPlay (`src/games/mythic-farm`),
2. **Observing** that `GameRegistry.ts` automatically discovers any directory in `src/games/` containing `manifest.ts` and `index.ts`,
3. **Inferring** that creating `src/games/mythic-farm/manifest.ts` with `id: 'mythic-farm'` and `minPlayers: 1, maxPlayers: 1` will register Mythic Farm in the platform console browser UI without modifying platform core files.
4. **Observing** that `GameRunner.ts` injects `GameContext` (containing `renderer`, `input`, `audio`, `storage`, `events`, `random`, `asset`, `logger`, `modifiers`, `players`) into `GameModule.init(context)`,
5. **Inferring** that Mythic Farm can manage its single-player farming grid, crop growth timers, automated machinery, livestock pastures, dynamic economy, and quest progression purely via `GameContext` services and standard PixiJS container primitives.
6. **Observing** that `StorageService` automatically namespaces keys per game id (`partyplay:games:mythic-farm:`),
7. **Inferring** that player progress (farm expansion, coins, crop grid state, tool upgrades, inventory) can be saved/loaded cleanly using `context.storage`.

---

## 3. Caveats

- **Pixel Resolution**: Internal rendering is strictly **480 × 270**. Display coordinates must use integer rounding (`Math.round`) to prevent subpixel texture distortion.
- **Pure Dependency Injection**: Mini-games MUST NOT import `Application` or instantiate HTML canvas elements directly. Rendering must be attached to `context.renderer.stage`.
- **Single-Player Mode**: Unlike PartyPlay's 2–4 player arcade minigames, Mythic Farm is a single-player game (`minPlayers: 1`, `maxPlayers: 1`). Controls should be mapped to Player 1 (`playerId: 1`).
- **Web Audio Synthesis**: `AudioService` is procedural oscillator-based (`playTone`). Custom procedural tunes or synth chimes should be implemented using `playTone` calls for ambient background music and sound effects.

---

## 4. Conclusion

The PartyPlay architecture is fully capable of supporting Mythic Farm as a single-player simulation game. Game registration is completely decoupled and automated via `GameRegistry`. All required engine primitives (rendering stage, 60 FPS deterministic tick loop, input mapping, procedural audio synthesis, namespaced local storage, PRNG, crash boundaries) are provided via `GameContext`.

---

## 5. Verification Method

To independently verify codebase integrity and game discovery:

1. **Verify TypeScript compilation**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0 with zero errors.

2. **Verify Production Build**:
   ```bash
   npm run build
   ```
   *Expected result*: Clean bundle generation in `dist/` in < 1 second.

3. **Verify Game Registry Auto-Discovery**:
   Confirm `manifest.ts` export default type satisfies `GameManifest` and `index.ts` export default satisfies `GameModule`.
