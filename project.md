# PartyPlay — Comprehensive Project Specification & Developer Manual

> **PartyPlay** is a modular, zero-asset-download, 16-bit retro local multiplayer game console built for the web browser. It features a fixed-resolution virtual canvas engine, pure procedural Web Audio sound synthesis, dynamic mini-game discovery, and deterministic 60 FPS gameplay for 2 to 4 players.

---

## 1. Executive Summary & Core Design Pillars

PartyPlay transforms any desktop browser into a retro arcade console where 2 to 4 players can share a single keyboard or gamepads to compete in rapid-fire 30–90 second mini-games.

### The Four Pillars
1. **Charm Over Realism:** Bouncy squash-and-stretch animations, hit-stop impact freezes, whole-pixel particle bursts, and tactile audio feedback over physical realism.
2. **Readability Over Detail:** High-contrast silhouettes, limited color counts (strictly adhering to a curated 32-color palette), and clear spatial separation ensure elements are immediately readable at a distance.
3. **Instant Party Fun (Zero-Tutorial):** Any player can understand controls within **3 seconds**. Gameplay uses directional movement (Left/Right or D-pad) + at most **1 action button**.
4. **Shared-Screen Local Multiplayer (2–4 Players):** All action takes place on a single 16:9 screen with zero split-screen dividers. Cameras use a fixed **480 × 270** native resolution to ensure equal spatial awareness for all players.

---

## 2. Directory Structure & File Inventory

```
PartyPlay/
├── .oxlintrc.json              # Oxlint linting configuration
├── eslint.config.js            # ESLint boundary enforcement rules
├── index.html                  # HTML entry point loading retro Google Fonts
├── package.json                # Dependencies, scripts, and package metadata
├── tsconfig.json               # TypeScript base configuration
├── tsconfig.app.json           # Application TypeScript config with path aliases
├── tsconfig.node.json          # Node TypeScript config for Vite
├── vite.config.ts              # Vite bundle and path alias configuration
├── docs/                       # Project documentation & design manuals
│   ├── AnimationBible.md       # Step-based animation & hit-stop rules
│   ├── Architecture.md         # System architecture & layer boundary rules
│   ├── ArtDirection.md         # Creative Constitution (v6), color palette, fonts
│   ├── AudioBible.md           # Procedural Web Audio API synth architecture
│   ├── CodingStandards.md      # TypeScript & code organization guidelines
│   ├── GameDesign.md           # Game design rules, scoring, and round loops
│   ├── MotionBible.md          # Physics collision math & integer snapping rules
│   └── UIBible.md              # UI components, screens, scanlines, CRT overlay
├── public/                     # Static public assets (icons.svg)
└── src/
    ├── main.tsx                # Application root entry point
    ├── index.css               # Global baseline CSS styles
    ├── platform/               # Layer 1: React Platform UI & Console Shell
    │   ├── App.tsx             # Screen router & state listener
    │   ├── components/         # Reusable retro UI components (PixelButton, etc.)
    │   ├── screens/            # Platform screens (MainMenu, GameBrowser, etc.)
    │   ├── services/           # Platform UI services (routerSync.ts)
    │   ├── stores/             # Zustand state stores (platformStore, settingsStore)
    │   └── styles/             # Pixel CSS theme & CRT scanline overlays
    ├── runtime/                # Layer 2: Core Ticker, Canvas & Game Host
    │   ├── GameLoop.ts         # Fixed 60 FPS deterministic game loop
    │   ├── GameRegistry.ts     # Dynamic import.meta.glob game discovery
    │   ├── GameRunner.ts       # Canvas host, launch token pattern, crash boundary
    │   ├── RendererContext.ts  # PixiJS wrapper & integer scaling context
    │   ├── index.ts            # Runtime exports
    │   └── types.ts            # Core runtime TypeScript interfaces & types
    ├── services/               # Layer 3: Cross-Cutting Platform Services
    │   ├── asset/              # AssetService for preloading textures
    │   ├── audio/              # AudioService procedural synth engine
    │   ├── event/              # EventService pub/sub event bus
    │   ├── input/              # InputService keyboard/gamepad manager
    │   ├── logger/             # LoggerService namespaced console logger
    │   └── storage/            # StorageService namespaced LocalStorage wrapper
    ├── shared/                 # Layer 4: Pure Math & Utilities
    │   └── utils/
    │       ├── math.ts         # Vector2D math & bounding box utilities
    │       └── random.ts       # Seeded Mulberry32 PRNG generator
    └── games/                  # Layer 5: Mini-Game Modules
        ├── micro-game/         # Validation test game module
        ├── obstacle-survival/  # Downward obstacle dodge & push game
        ├── relic-rush/         # Cross-chamber trap & sabotage race
        ├── snake-arena/        # Multi-arena battle royale snake game
        └── turbo-rider/        # 3D retro arcade highway bike racer
```

---

## 3. Technology Stack & Key Dependencies

| Component | Library / Tool | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Core Framework** | React | `^19.2.7` | UI screen rendering and state-driven interfaces |
| **Language** | TypeScript | `~6.0.2` | Strict compile-time type safety across all layers |
| **Build System** | Vite | `^8.1.1` | Ultra-fast HMR dev server and production bundling |
| **2D Renderer** | Pixi.js | `^8.19.0` | Hardware-accelerated WebGL/WebGPU 2D rendering |
| **State Store** | Zustand | `^5.0.14` | Lightweight central state management |
| **Routing** | React Router | `^7.18.1` | History & browser URL navigation synchronization |
| **Linter** | Oxlint & ESLint | `^1.71.0` | Ultra-fast linting & structural layer boundary enforcement |

---

## 4. System Architecture & Layer Boundaries

PartyPlay is built as a **Modular Monolith** with five unidirectional layers. Imports flowing backwards across layers cause compile-time linting errors via `eslint-plugin-boundaries`.

```
┌──────────────────────────────────────────────────────────┐
│                   Platform UI (React)                    │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                  Runtime Core Engine                     │
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────┐   ┌───────────────────────────┐
│    Platform Services     │   │     Mini-Game Catalog     │
└──────────────┬───────────┘   └───────────┬───────────────┘
               │                           │
               └─────────────┬─────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                Shared Math & Utilities                   │
└──────────────────────────────────────────────────────────┘
```

### Layer Boundary Rules

1. **Platform (`src/platform`)**: UI screens & stores. May import `Runtime`, `Services`, `Shared`, React, Zustand.
2. **Runtime (`src/runtime`)**: Canvas container, ticker loop, crash boundary. May import `Services`, `Shared`, PixiJS.
3. **Services (`src/services`)**: Input, Audio, Event, Storage. May import `Shared` and browser Web APIs.
4. **Shared (`src/shared`)**: Vector math, PRNG generators. Pure TS/JS built-ins only.
5. **Games (`src/games`)**: Isolated mini-game logic. May import `Services`, `Shared`, `Runtime Types`. **(NEVER import `pixi.js` directly!)**

---

## 5. PixiJS Virtual Canvas & Rendering System

Games interact with rendering exclusively through the `RendererContext` interface provided inside `GameContext`:

```typescript
export interface RendererContext {
  readonly canvas: HTMLCanvasElement;
  readonly stage: Container;
  readonly viewport: { width: number; height: number };
  readonly ticker: Ticker;
  resize(): void;
}
```

### Rendering Rules & Calculations
* **Virtual Resolution:** Fixed internal size of **480 × 270** pixels.
* **Integer Scaling Formula:**
  $$\text{integerScale} = \max\left(1, \min\left(\left\lfloor \frac{\text{window.innerWidth}}{480} \right\rfloor, \left\lfloor \frac{\text{window.innerHeight}}{270} \right\rfloor\right)\right)$$
* **Nearest-Neighbor Texture Sampling:**
  * PixiJS: `TextureSource.defaultOptions.scaleMode = 'nearest'`
  * CSS: `image-rendering: pixelated; image-rendering: crisp-edges;`
* **Whole-Pixel Snapping:** Every entity display coordinate must execute `Math.round(x)` and `Math.round(y)` during rendering to prevent subpixel blur or texture shimmering.

---

## 6. Art Direction & Creative Constitution (v6)

### 32-Color Curated Retro Palette Token Map
```css
:root {
  --pixel-bg: #0f0e17;       /* Deep Arcade Black */
  --pixel-surface: #1f1e2e;  /* Dark Slate Blue */
  --pixel-border: #fffffe;   /* Pure Crisp White */
  --pixel-text: #fffffe;     /* Text White */
  --pixel-muted: #a7a9be;    /* Muted Silver */
  --pixel-red: #ff2e63;      /* Neon Crimson (Player 1) */
  --pixel-blue: #08d9d6;     /* Electric Cyan (Player 2) */
  --pixel-green: #2af598;    /* Arcade Mint (Player 3) */
  --pixel-yellow: #ffde7d;   /* Retro Gold (Player 4) */
  --pixel-purple: #7160e8;   /* Deep Synth Purple */
}
```

### Retro Typography
* **Heading & Title Font:** `'Press Start 2P', monospace` (Blocky 8-bit geometry).
* **UI & Body Font:** `'Pixelify Sans', monospace` (High legibility pixel typography).

### Strict Prohibitions List
- ❌ NO Glassmorphism or Neumorphism
- ❌ NO Rounded SVG icons or vector illustrations (use text symbols like `▶`, `⚙`, `☠`, `🏆`)
- ❌ NO Soft gradients, ambient blurs, or glow effects (`box-shadow` blur is forbidden)
- ❌ NO Subpixel movement or anti-aliased font smoothing (`-webkit-font-smoothing: none;`)

---

## 7. Procedural Synth Web Audio Engine

PartyPlay generates **100% of sound effects procedurally** via `AudioService` using the browser's Web Audio API:

### Oscillator Waveform & Frequency Map
| Sound Category | Waveform | Frequency Range | Envelope Duration | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Movement Tick** | `sine` | 300Hz – 500Hz | 0.04s (40ms) | Player step, snake turn |
| **Pickup / Eat** | `triangle` | 550Hz – 880Hz | 0.10s (100ms) | Eating apple, collecting item |
| **Player Bump** | `sawtooth` | 180Hz – 250Hz | 0.15s (150ms) | Player-to-player collision |
| **Elimination / Hit** | `sawtooth` | 80Hz – 150Hz | 0.30s (300ms) | Hitting wall or obstacle |
| **Victory Chime** | `square` | Arpeggio (523Hz → 659Hz → 784Hz) | 0.40s (400ms) | Round end, match win |
| **UI Select** | `triangle` | 660Hz | 0.08s (80ms) | Button press |

### Auditory Player Pitch Offset
Base frequencies are pitch-shifted by `playerId` to provide distinct auditory feedback:
$$\text{freq}_{\text{player}} = \text{freq}_{\text{base}} + (\text{playerId} - 1) \times 40\text{Hz}$$

---

## 8. Deterministic Game Loop & Motion Physics

### Fixed 60 FPS Accumulator Ticker
```typescript
const FIXED_DT = 1 / 60; // 16.67ms
const MAX_STEPS = 5;

private frame(ticker: Ticker): void {
  this.accumulator += ticker.deltaMS / 1000;
  let steps = 0;

  while (this.accumulator >= FIXED_DT && steps < MAX_STEPS) {
    this.inputService.tick();
    this.game.update(FIXED_DT);
    this.accumulator -= FIXED_DT;
    steps++;
  }
}
```

### Physics Algorithms
1. **Circle vs Circle (Player Bumping):**
   Horizontal displacement vectors resolve overlap between circular player hitboxes.
2. **Circle vs AABB (Obstacle Collision):**
   Clamps player center coordinates to obstacle rectangle boundaries to check distance squared against radius squared.
3. **Hit-Stop Micro-Pauses:**
   On elimination or heavy impact, `triggerHitStop(frames)` holds update logic for 2–3 frames while keeping rendering static.
4. **Whole-Pixel Particle Burst (`PixelParticle`):**
   Square 2×2 particles emit on elimination, snap coordinates with `Math.round()`, and flicker white/player color before dying.

---

## 9. Platform UI & Screen State Machine

The console navigation flow handles 8 distinct platform screens managed by `platformStore`:

```
                 ┌───────────────┐
                 │ LoadingScreen │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐      ┌──────────┐
                 │   MainMenu    ├─────►│ Settings │
                 └───────┬───────┘      └──────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  GameBrowser  │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  PlayerSetup  │
                 └───────┬───────┘
                         │
                         ▼
┌─────────────┐  ┌───────────────┐  ┌──────────────┐
│ CrashScreen │◄─┤   GamePlay    ├──►│ GameResults  │
└─────────────┘  └───────────────┘  └──────────────┘
```

### Platform Screen Inventory
1. `<LoadingScreen />`: Initial console boot splash screen with blinking logo.
2. `<MainMenu />`: Main navigation hub (`▶ PLAY`, `⚙ SETTINGS`).
3. `<GameBrowser />`: Library grid featuring game cards, category badges, and player limits.
4. `<PlayerSetup />`: Match setup for player count (2–4), speed multipliers, and control maps.
5. `<GamePlay />`: Active PixiJS game canvas mount with overlay HUD (`⏸`).
6. `<GameResults />`: Round standings display featuring color-coded scores and rematch buttons.
7. `<Settings />`: Master audio volume slider and Mute toggles.
8. `<CrashScreen />`: Error boundary screen displaying error stack traces if a game crashes.

---

## 10. Dynamic Auto-Discovery Game Registry

Games placed inside `src/games/<game-id>/` containing a `manifest.ts` and `index.ts` are dynamically registered at build-time using Vite's `import.meta.glob`:

```typescript
// Eagerly import manifests for fast library UI rendering
const manifestModules = import.meta.glob<{ default: GameManifest }>(
  '../games/*/manifest.ts',
  { eager: true }
);

// Lazy import game index.ts chunks for dynamic code-splitting
const gameModules = import.meta.glob<{ default: new () => GameModule }>(
  '../games/*/index.ts'
);
```

---

## 11. Pure Dependency Injection (`GameContext`)

When a game starts, `GameRunner` constructs an isolated `GameContext` instance passed to `GameModule.init(context)`:

```typescript
export interface GameContext {
  renderer: RendererContext;
  input: InputService;
  audio: AudioService;
  storage: StorageService; // Namespaced to "games:<game-id>"
  events: EventService;
  random: PRNG;            // Seeded Mulberry32 generator
  asset: AssetService;
  logger: LoggerService;
  modifiers: GameModifiers;
  players: PlayerConfig[];
}
```

---

## 12. Complete Mini-Game Catalog

### 1. 🐍 Snake Arena
* **Directory:** [`src/games/snake-arena`](file:///home/viv/Projects/PartyPlay/src/games/snake-arena)
* **Players:** 2–4 \| **Time:** 45–90s \| **Category:** Arcade / Battle Royale
* **Features:** 4 unique arena maps (Battle Pit, Obstacle Course, Wrap Zone, Hazard Grid), power-ups (Speed, Shield, Magnet), dash boosting, and turn-based grid tail collision.

### 2. 🤠 Relic Rush: Cross-Chamber Chaos
* **Directory:** [`src/games/relic-rush`](file:///home/viv/Projects/PartyPlay/src/games/relic-rush)
* **Players:** 2–4 \| **Time:** 60–90s \| **Category:** Party / Co-Op Race
* **Features:** 8 ancient world chambers, platforming jump mechanics, interactive levers, falling boulder traps, bridge triggers, and player sabotage.

### 3. 🏍️ TURBO RIDER 3D
* **Directory:** [`src/games/turbo-rider`](file:///home/viv/Projects/PartyPlay/src/games/turbo-rider)
* **Players:** 2–4 \| **Time:** 60–120s \| **Category:** Sports / 3D Racing
* **Features:** Pre-race garage customization (Top Speed, Acceleration, Handling), pseudo-3D perspective, traffic weaving, truck drafting, nitro boosts, and winding hill tracks.

### 4. 🏃 Obstacle Survival
* **Directory:** [`src/games/obstacle-survival`](file:///home/viv/Projects/PartyPlay/src/games/obstacle-survival)
* **Players:** 2–4 \| **Time:** 30–60s \| **Category:** Survival Arcade
* **Features:** Downward scrolling obstacle block rows, accelerating speed multipliers, solid player-to-player collision pushing, and last-survivor-standing logic.

### 5. 🧪 Micro Test Game
* **Directory:** [`src/games/micro-game`](file:///home/viv/Projects/PartyPlay/src/games/micro-game)
* **Players:** 2–4 \| **Time:** 10–30s \| **Category:** Engine Validation
* **Features:** Minimal validation test module for verifying 60 FPS tick stability, input binding, Web Audio playback, and crash-screen boundaries.

---

## 13. Crash Safety & Async Protection

1. **Async Token Pattern (`launchId`):**
   `GameRunner` maintains an incrementing `launchId` counter. Rapid navigation or fast-clicking cancels outdated async canvas init or asset load promises automatically.
2. **Exception Isolation:**
   Unhandled exceptions in mini-game `update()` or `render()` methods are caught by `GameLoop`. The engine stops the ticker, cleanly disposes of PixiJS containers, and routes to `<CrashScreen />` displaying the error stack trace without crashing the browser shell.

---

## 14. Developer Workflows & Commands

* **Development Server:** `npm run dev` (Launches Vite dev server with HMR)
* **Type Verification:** `npx tsc --noEmit` (Verifies TypeScript typing across all files)
* **Linting:** `npm run lint` (Executes Oxlint fast lint checks)
* **Production Build:** `npm run build` (Compiles TypeScript and runs Vite production bundler)
* **Preview Production:** `npm run preview` (Serves production build locally)

---
*Created and maintained as the authoritative specification for PartyPlay.*
