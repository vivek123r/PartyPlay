# PartyPlay Coding Standards & Architecture Rules

This document outlines the mandatory coding standards, TypeScript strictness rules, ESLint boundaries, and lifecycle patterns for the PartyPlay codebase.

---

## 1. ESLint Boundary Enforcement Rules

To maintain the modular monolith architecture and prevent dependency leaks, unidirectional dependency flow is enforced at compile time via `eslint-plugin-boundaries` in `eslint.config.js`.

### The Boundary Rule Chain

```
Platform (src/platform/) 
  ↓
Runtime (src/runtime/) 
  ↓
Services (src/services/) 
  ↓
Shared (src/shared/)
```

### Strict Rules Matrix

| Layer | Can Import From | MUST NEVER Import From |
|-------|-----------------|------------------------|
| **Platform** | `Runtime`, `Services`, `Shared`, React, Zustand | Internal Game private files |
| **Runtime** | `Services`, `Shared`, PixiJS | `Platform` UI screens, React components |
| **Services** | `Shared`, Web APIs | `Runtime`, `Platform`, `Games`, `PixiJS` |
| **Shared** | Pure JS/TS packages | Any upper layer |
| **Games** | `Services`, `Shared`, `Runtime` Types | **`pixi.js` directly**, other Game modules |

> [!CAUTION]
> **CRITICAL RULE**: Game modules under `src/games/<game-id>/` MUST NEVER import `pixi.js` directly! Games interact strictly with the `RendererContext` abstraction injected into `init(context)`.

---

## 2. TypeScript Strictness Specifications

- **Strict Mode**: `"strict": true` in `tsconfig.app.json`.
- **No Implicit Any**: Every function parameter and return type must be explicitly declared or cleanly inferred. `any` is strictly banned. Use `unknown` with type guards where necessary.
- **Null Safety**: Always handle optional properties explicitly:
  ```typescript
  // Correct
  const speedMult = context.modifiers.speedMultiplier ?? 1.0;
  
  // Incorrect
  const speedMult = context.modifiers.speedMultiplier!;
  ```

---

## 3. Async Safety & Tokenized Teardown Pattern

Games can be started, paused, resumed, and destroyed rapidly. Asynchronous operations (like dynamic module loads or canvas initializations) must prevent stale callbacks:

```typescript
export class GameRunner {
  private launchId = 0;

  public async launchGame(...): Promise<void> {
    await this.stopGame();
    // 1. Increment launch token
    const currentLaunchId = ++this.launchId;

    // 2. Perform async work
    await asyncOperation();

    // 3. Assert token match before mutating state
    if (currentLaunchId !== this.launchId) {
      // Discard stale result cleanly
      return;
    }

    // Proceed safely...
  }

  public async stopGame(): Promise<void> {
    // Invalidate all active launch attempts immediately
    this.launchId++;
    ...
  }
}
```

---

## 4. Pure Dependency Injection Conventions

Games MUST NOT import global singletons for state or services. All services are passed into the game's `init(context)` method:

```typescript
// Correct: Injected service consumption
export default class ObstacleSurvivalGame implements GameModule {
  public async init(context: GameContext): Promise<void> {
    this.ctx = context;
    // Input, audio, events, logger, random PRNG all accessed via this.ctx
    const input = this.ctx.input.getPlayer(playerId);
    this.ctx.audio.playTone(440, 'sine', 0.1);
  }
}

// Incorrect: Direct singleton import
import { inputService } from '@services/input/InputService'; // ❌ FORBIDDEN
```

---

## 5. Verification Commands

Before declaring any feature or bugfix complete, run the following verification pipeline:

```bash
# 1. Type Check
npx tsc --noEmit

# 2. ESLint Boundary Audit
npx eslint src/

# 3. Production Build Validation
npm run build
```
