# ADR 001: Platform, Runtime & Services Architecture

## Status
Accepted

## Context
PartyPlay is a browser-based local multiplayer gaming platform. We needed an architecture that optimizes for adding the 10th game rather than short-term convenience for the 1st game.

## Decisions

1. **Modular Monolith over Workspace Monorepo**: Single Vite application with strict ESLint boundary enforcement (`eslint-plugin-boundaries`). Zero package linking tax while providing identical isolation guarantees and Rollup code splitting.
2. **PixiJS v8 as Renderer**: PixiJS is used strictly as a 2D rendering canvas engine. It is wrapped inside `RendererContext` and hidden from game modules. Games never import PixiJS Application directly.
3. **Pure Dependency Injection**: Games receive all platform services (`InputService`, `AudioService`, `StorageService`, `EventService`, `RandomService`, `AssetService`, `LoggerService`) exclusively via `GameContext`.
4. **Decoupled EventBus**: Games emit typed events (`player:eliminated`, `game:over`, `game:pause`), and the platform reacts.
5. **Device Abstraction Input**: `Device → InputService → Player → Actions`. Games consume normalized actions (`moveLeft`, `moveRight`), never raw keys or device references.
6. **Auto-Discovered Registry**: Games are discovered dynamically at build time via Vite `import.meta.glob` scanning `src/games/*/manifest.ts`.

## Consequences
- Adding a new game requires creating a directory in `src/games/` with `manifest.ts` and `index.ts`. No runtime modifications needed.
- Games are cleanly isolated and code-split into independent JS chunks.
- Runtime owns crash handling: unhandled game exceptions trigger the `CrashScreen` without crashing PartyPlay.
