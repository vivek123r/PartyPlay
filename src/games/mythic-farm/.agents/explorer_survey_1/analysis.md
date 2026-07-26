# PartyPlay Codebase Architecture & Integration Survey Report for Mythic Farm

## 1. Executive Summary

PartyPlay is a modular, high-performance, 16-bit retro arcade game engine built with React 19, TypeScript ~6.0, Vite 8, PixiJS 8.19, Zustand 5, and Web Audio API. 
Games in PartyPlay run inside a fixed virtual canvas resolution (**480 × 270**) with integer pixel scaling and nearest-neighbor texture filtering. All audio is synthesized procedurally via Web Audio API, and state, input, and events are provided through a pure dependency injection container (`GameContext`).

The newly planned single-player game **Mythic Farm** (`src/games/mythic-farm`) will integrate seamlessly by exposing a default `GameManifest` (`manifest.ts`) and a default `GameModule` implementation (`index.ts`).

---

## 2. Repository Structure & Build Environment

### 2.1 File Organization & Paths
- **Root Configuration**:
  - `package.json`: Manages dependencies (`pixi.js`, `react`, `react-dom`, `react-router-dom`, `zustand`, `vite`, `vitest`).
  - `vite.config.ts`: Defines Vite plugins (`@vitejs/plugin-react`, `vite-tsconfig-paths`) and path aliases:
    - `@platform` → `./src/platform`
    - `@runtime` → `./src/runtime`
    - `@services` → `./src/services`
    - `@games` → `./src/games`
    - `@shared` → `./src/shared`
  - `tsconfig.app.json`: Configures ES2023 target, React JSX runtime, bundler module resolution, and path mappings.
  - `project.md`: Detailed developer reference manual for PartyPlay architecture, art direction, and engine design rules.

### 2.2 Build & Verification Commands
- `npm run dev`: Launches Vite development server with HMR.
- `npx tsc --noEmit`: Performs strict TypeScript type checking without emitting JS files.
- `npm run lint`: Runs Oxlint checks.
- `npm run build`: Executes `tsc -b && vite build` to bundle the app into `dist/`.

---

## 3. Architecture & Unidirectional Layer Model

PartyPlay uses a strict 5-layer unidirectional architecture enforced via layer boundaries:

```
┌──────────────────────────────────────────────────────────┐
│             Layer 1: Platform UI (React)                 │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│             Layer 2: Runtime Core Engine                 │
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────┐   ┌───────────────────────────┐
│ Layer 3: Platform        │   │ Layer 5: Mini-Game        │
│          Services        │   │          Catalog          │
└──────────────┬───────────┘   └───────────┬───────────────┘
               │                           │
               └─────────────┬─────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│          Layer 4: Shared Math & Utilities                │
└──────────────────────────────────────────────────────────┘
```

### Layer Rules
1. **Platform (`src/platform`)**: React screens, Zustand stores (`platformStore`), UI buttons, scanlines.
2. **Runtime (`src/runtime`)**: Canvas host, fixed 60 FPS ticker (`GameLoop`), auto-discovery registry (`GameRegistry`), launch manager (`GameRunner`).
3. **Services (`src/services`)**: Cross-cutting singleton services (`InputService`, `AudioService`, `EventService`, `StorageService`, `AssetService`, `LoggerService`).
4. **Shared (`src/shared`)**: Pure TS math & utilities (`math.ts`, `random.ts` PRNG).
5. **Games (`src/games`)**: Isolated game modules. **Games MUST NOT import `Application` or instantiate raw canvas elements.** Games interact with canvas exclusively through `context.renderer`.

---

## 4. Game Registration & Discovery Mechanism

Games are placed in `src/games/<game-id>/` and discovered dynamically at build-time by `src/runtime/GameRegistry.ts` using Vite's `import.meta.glob`:

```typescript
// Eagerly imports manifests for fast menu/browser UI rendering
const manifestModules = import.meta.glob<{ default: GameManifest }>('../games/*/manifest.ts', { eager: true });

// Lazy imports game index files for dynamic code splitting
const gameModules = import.meta.glob<{ default: new () => GameModule }>('../games/*/index.ts');
```

To register **Mythic Farm**, we create:
1. `src/games/mythic-farm/manifest.ts`: Exports a default `GameManifest`.
2. `src/games/mythic-farm/index.ts`: Exports a default class implementing `GameModule`.

---

## 5. Dependency Injection via `GameContext`

When launching a game, `GameRunner` constructs a fresh `GameContext` instance and passes it to `GameModule.init(context)`:

```typescript
export interface GameContext {
  renderer: RendererContext;  // Canvas viewport (480x270), stage Container, Pixi Ticker
  input: InputService;         // Polled keyboard/gamepad input
  audio: AudioService;         // Procedural Web Audio API synth
  storage: StorageService;     // LocalStorage namespaced to 'partyplay:games:mythic-farm:'
  events: EventService;       // Global pub/sub event bus
  random: PRNG;               // Seeded Mulberry32 random generator
  asset: AssetService;        // Texture loading and caching
  logger: LoggerService;       // Pre-fixed console logging
  modifiers: GameModifiers;   // Game setup parameters
  players: PlayerConfig[];     // Active player configurations (single-player = 1 player)
}
```

---

## 6. Rendering & Virtual Canvas Engine

- **Virtual Resolution**: Fixed at **480 × 270** pixels.
- **Integer Scaling**: Calculated dynamically on window resize:
  $$\text{scale} = \max\left(1, \min\left(\left\lfloor \frac{\text{innerWidth}}{480} \right\rfloor, \left\lfloor \frac{\text{innerHeight}}{270} \right\rfloor\right)\right)$$
- **Nearest-Neighbor Filtering**: Enforced via `TextureSource.defaultOptions.scaleMode = 'nearest'` and CSS `image-rendering: pixelated;`.
- **Pixel Snapping**: Display coordinates must be rounded using `Math.round(x)` and `Math.round(y)` to guarantee crisp 16-bit retro visuals without subpixel blur.
- **PixiJS Primitive Rendering**: Using `Graphics` primitives (rectangles, circles, paths, pixel art textures) attached to `context.renderer.stage`.

---

## 7. Input Management Engine

- `InputService` polls input devices per frame in `GameLoop`.
- Key bindings are configured in `manifest.ts` `defaultControls` for Player 1:
  - Movement: WASD / Arrow keys
  - Action / Tool Use: Space / Enter / KeyZ
  - Hotbar Navigation: Number keys (1-9) or Q/E
  - Interact / Harvest / Process: KeyX / KeyE
  - Pause: Escape
- Query API in `update(dt)`:
  - `context.input.getPlayer(1).isActive('moveLeft')`
  - `context.input.getPlayer(1).isJustPressed('action')`
  - `context.input.getPlayer(1).isJustReleased('action')`

---

## 8. Procedural Audio Engine (`AudioService`)

`AudioService` provides 100% procedural sound synthesis using standard Web Audio API oscillators (`sine`, `square`, `sawtooth`, `triangle`):
- `context.audio.playTone(freq, type, duration, channel, volume)`
- Sound mapping for Mythic Farm:
  - Tilling / Hoeing: `sawtooth`, 120Hz – 180Hz, 0.08s
  - Watering: `sine`, 450Hz – 600Hz, 0.12s
  - Planting Seeds: `triangle`, 500Hz – 700Hz, 0.06s
  - Harvesting Crops: `triangle`, 660Hz → 880Hz arpeggio, 0.15s
  - Animal Care / Feeding: `square`, 350Hz → 450Hz, 0.10s
  - Workshop Machine Crafting: `sawtooth` pulse rhythm, 200Hz
  - Market Sale / Coin Pickup: `square` victory chime (523Hz → 659Hz → 784Hz), 0.20s

---

## 9. Game Module Lifecycle Contract

Every game module must follow this lifecycle contract:

```typescript
export interface GameModule {
  readonly state: InternalGameState;
  init(context: GameContext): Promise<void>;
  start(): void;
  update(dt: number): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

- **`init(context)`**: Setup Pixi containers, load textures, initialize grid/farm data, load saved game state from `context.storage`.
- **`start()`**: Transition state to `'Playing'`, start growth timers and seasonal tick loops.
- **`update(dt)`**: Fixed 60 FPS tick. Handle player input, move player avatar, update crop growth timers, process workshop machine timers, update animal pastures, render HUD overlay.
- **`pause()` / `resume()`**: Freeze/unfreeze game simulation.
- **`destroy()`**: Cleanly destroy all Pixi display objects, detach listeners, save current game state to `context.storage`.

---

## 10. Integration Blueprint for Mythic Farm

For **Mythic Farm**, the game will be structured as follows under `src/games/mythic-farm/`:

```
src/games/mythic-farm/
├── manifest.ts             # Game manifest (id: 'mythic-farm', single-player 1 player)
├── index.ts                # Main GameModule implementation
├── config.ts               # Crop, Livestock, Workshop, and Upgrade static configs
├── entities/
│   ├── PlayerAvatar.ts     # Player movement, tool hotbar selection, animation states
│   ├── FarmGrid.ts         # Isometric/top-down tile grid (tilling, soil wetness, crops)
│   ├── CropManager.ts      # Multi-stage crop growth, watering, fertilizing, harvesting
│   ├── WorkshopManager.ts  # Magical sprinklers, preserves jars, brewing barrels, looms
│   ├── LivestockManager.ts # Animal pastures, feeding, grooming, golden products
│   └── MarketEconomy.ts    # Dynamic crop pricing, orders, farm expansion, tool upgrades
├── systems/
│   ├── WeatherSystem.ts    # Season calendar, rain/sunny weather, real-time day ticks
│   └── QuestSystem.ts      # Single-player story milestones and progression HUD
└── ui/
    ├── FarmHUD.ts          # Pixi HUD (coins, energy bar, season, hotbar, notifications)
    └── MarketWindow.ts     # In-game retro marketplace UI overlay
```

### Key Architectural Guidelines for Mythic Farm Implementation:
1. **Single-Player Mode**: Set `minPlayers: 1` and `maxPlayers: 1` in `manifest.ts`.
2. **State Persistence**: Save farm state (unlocked expansion, coins, crop grid, inventory, tool tiers, quest progress) to `context.storage`.
3. **Smooth 60 FPS Isometric/Top-Down Rendering**: Render all farm tiles, crops, machinery, animals, and player avatar using Pixi `Graphics` and text overlay.
4. **Crash Protection & Resource Cleanup**: Safely destroy stage children in `destroy()` and handle state edge cases cleanly.

---
