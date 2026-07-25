# Turbo Rider — AI Reference

Dense reference for this game module. Read this before editing instead of re-exploring the tree. Update it when structure/behavior changes.

## What this is
Local split-screen 2-4 player racing game, part of `src/games/*` sibling modules on a shared-keyboard party platform (no server/socket layer anywhere in repo). Pure class-based, DI-driven — no Redux/Zustand/Context.

## Platform contract (defined in `src/runtime/types.ts`, not here)
- `manifest.ts` → default-exports `GameManifest` (static metadata, controls, min/max players).
- `index.ts` → default-exports class implementing `GameModule`: `state`, `init(ctx)`, `start()`, `update(dt)`, `pause()`, `resume()`, `destroy()`.
- `GameContext` (passed once to `init`): `renderer, input, audio, storage, events, random, asset, logger, modifiers, players`.
- Discovery: `GameRegistry.ts` globs `../games/*/manifest.ts` + `index.ts`. No central registry list.
- Loop: `GameLoop.ts` fixed 60Hz (`FIXED_DT=1/60`, `MAX_STEPS=5`) → `input.tick()` then `game.update(FIXED_DT)`.
- Outbound signal to platform: only `ctx.events.emit('game:over', {...})` on match end.

## File map
```
index.ts                636L  GameModule entry — owns all state, orchestrates phases, per-frame render
manifest.ts              83L  GameManifest: 2-4 players, category Sports, 4 keyboard binding sets
types.ts                 97L  Shared DTOs: BikeStats, TuningSetup, BikeCustomization, Point3D,
                               TrackSprite, OpponentSprite, TrackSegment
core/
  Bike.ts                 1L  DEAD — re-export shim `BikePhysics as Bike`, unused, ignore
  BikePhysics.ts        188L  Per-bike sim: movement, nitro, crash, lives, lean/pitch
  TuningSystem.ts          -  createDefaultSetup/Customization, calculateStats → BikeStats
  BikeCollisions.ts     101L  Player-vs-player bump resolution (pure fn, MTV-based)
  HandcraftedTrack.ts    94L  TrackPhase enum + generateTrack() — ALWAYS straight/flat (curve=0)
  PowerUpManager.ts       85L  Pickup spawn/collect: boost/shield/coin
  TrackConstants.ts       10L  Single source of truth: road width, bike dims (m)
  TrafficManager.ts       77L  AI traffic/hazard spawn+move+collide (imports render/VehicleSprites!)
render/
  BikeSprite.ts         130L  Procedural rear-view bike+rider sprite, player tag, exhaust flame
  EnvironmentFX.ts       181L  Particles, screen shake, nitro vignette/streaks (1 instance/viewport)
  PixelFont.ts            79L  Bitmap glyphs + drawText — used by all HUD/screen draw calls
  ProjectionEngine.ts    473L  Pseudo-3D projection + full per-viewport render (single painter's-algo pass)
  SceneryLibrary.ts      389L  Roadside props / overhead gantries per track phase
  Skybox.ts              214L  Sky gradient/sun/stars per phase + video overlay
  VehicleSprites.ts      467L  Traffic/hazard sprite drawing + VEHICLE_DIMENSIONS_M table
  VideoEngine.ts         130L  Singleton <video>→Texture. initFireVideo() DEAD, initSkyboxVideo() used
screens/
  GarageScreen.ts        415L  Pre-race tuning UI + input handling (own private Ticker, not dt!)
  ResultsScreen.ts        86L  Post-race podium (dismiss via setTimeout, NOT update()/game loop)
```

## Game flow (index.ts)
1. `init(ctx)`: clamp players 2-4, spawn `BikePhysics` per player, `HandcraftedTrack.generateTrack()` (6000m), spawn traffic (density = `modifiers.trafficDensity`) + power-ups, build one masked viewport `Container` per player (stacked vertically, `viewW=480`, `viewH=floor(270/count)`), mount garage + results overlays. `state='Ready'`.
2. `start()`: `state='Playing'`.
3. `update(dt)` — fixed 60Hz, phases gated by flags, each returns early (one phase per call):
   - **Garage phase**: reads per-player input → `GarageScreen.updateGarageInput`, renders garage. Exit when `garage.isAllReady(count)`.
   - **Countdown**: 3→2→1→GO, 1s each (`countdownTimer -= dt`), then starts music, falls to racing next frame.
   - **Racing**: per-bike input→`bike.update()`, draft/near-miss detection, audio edge-detection (crash/elim/nitro/overtake), camera smoothing during nitro, engine-voice params, FX spawn. Then outside bike loop: `resolveBikeCollisions()`, `traffic.update()`, `powerUps.update()`, build `OpponentSprite[]`, render each viewport via `ProjectionEngine.renderViewportRoad` + HUD.
   - **Win check**: last-survivor's `z` force-set to finish; or any `z >= TOTAL_LENGTH_METERS` → `triggerMatchOver()`.
4. `triggerMatchOver()`: `state='Finished'`, stop audio, show `ResultsScreen` (auto-dismiss 5s via setTimeout) → on dismiss emits `game:over`.
5. `pause()/resume()`: toggle `state` only; ticker/audio suspend handled externally by GameRunner.
6. `destroy()`: stop audio loops, destroy VideoEngine singleton, all graphics/containers/masks, garage, results.

Input: `ctx.input.getPlayer(bike.id)` → `isActive/isJustPressed/isJustReleased`, mapped via manifest's `defaultControls` (WASD/Arrows/IJKL/Numpad — all one physical keyboard, device id `keyboard-main`).

## External imports (only these — no `@platform/*`, `@shared/*`, no store)
- `@runtime/types`: `GameModule, GameContext, InternalGameState, GameManifest`
- `@services/audio/AudioService`: type only, instance injected via `setAudioService()` (GarageScreen)
- `pixi.js`: `Container, Graphics, Texture, Ticker`
- `ctx.*` (DI, not static import): `input.getPlayer`, `audio.playTone/playSweep/playNoiseBurst/playArpeggio/start|update|stopEngineVoice/stopAllEngineVoices/start|stopMusic/stopAllLoops`, `events.emit`, `logger.info`, `modifiers`, `players`

## Key types
- `TrackPhase` (const obj, `core/HandcraftedTrack.ts`): `COASTAL_INTRO=0, MOUNTAIN_CLIMB=1, OCEAN_BRIDGE=2, NEON_TUNNEL=3, SUNSET_SPRINT=4`
- `PowerUp.type`: `'boost'|'shield'|'coin'`
- `BumpEvent.kind`: `'side'|'rear'`
- `VehicleKind` (8 variants, `render/VehicleSprites.ts`), `HAZARD_KINDS`, `MOVING_KINDS`
- `InternalGameState` (platform-level): `Initializing|Loading|Ready|Playing|Paused|Finished|Destroyed`

## Config constants (tune here, not scattered)
| Constant | Value |
|---|---|
| Players | min 2, max 4 |
| Track length | 6000m (1000 × 6m segments) |
| Lives | 3; crash −1; shield absorbs one; eliminate at 0 |
| Crash timing | crashTimer 1.8s, invulnerability 3.5s (999s if eliminated) |
| Nitro | drain 35/s held, recharge 5/s (15/s drafting) × (1+combo×0.4, combo≤5, 2.5s window); burst = topSpeed×1.45; camera→11m/2.75 depth |
| Draft/slipstream | within dz<15,dx<0.35 behind → +15% top speed; near-miss at dz<6,dx<0.25 |
| Bump collision | cooldown 0.6s; rear impulse 10km/h (trailing), assist 3km/h (leading), drag 40km/h/s while overlapping |
| Traffic | ≤40 vehicles, 18% hazard chance, minGap=110/density, moving 70-105km/h |
| Garage tokens | max 10 total across engine/ecu/suspension/tyres/brakes, level cap 3 each |
| Power-ups | spawn every 200-360m; boost=speed×1.3+60 (cap topSpeed×1.45); shield=10s+1 life (cap 3); coin=counter only |
| Results screen | auto-dismiss 5s |
| Countdown | 3-2-1 @ 1s each, then GO |
| Road geometry | ROAD_HALF_WIDTH=4.4m, lane x∈[-1.8,1.8], off-road if \|x\|>1.0 (45% speed penalty) |

## Gotchas / dead code / traps (check before touching related logic)
1. **Track is always straight/flat** — `generateTrack()` hardcodes `curve:0, elevation:0`. `BikePhysics.update`'s centrifugal-force branch is dead code (always receives curve=0). Adding real curves requires updating both the generator and `ProjectionEngine`'s straight-line assumptions.
2. **Layering violation**: `core/TrafficManager.ts` imports vehicle dimensions from `render/VehicleSprites.ts` — core depends on render for collision boxes.
3. **`ResultsScreen` dismiss uses `setTimeout`**, not game-loop `update()`. No `clearTimeout` in `destroy()` → latent race if game destroyed/paused before 5s elapse; `onComplete()` may fire against a destroyed instance.
4. **`GarageScreen` runs its own private `pixi.Ticker`**, independent of the fixed-step `dt`. Stopped in `destroy()` but NOT in `pause()` — keeps animating in real time while paused unless explicitly handled.
5. **`core/Bike.ts`** is a dead 1-line re-export, unused elsewhere. Safe to ignore/delete.
6. **`VideoEngine.initFireVideo()`** is dead — nitro flame moved to procedural draw in `BikeSprite.ts` because a shared video texture couldn't be tinted per-player (caused cross-player bleed in split-screen). Only `initSkyboxVideo()` is live.
7. **`modifiers.speedMultiplier`** declared in manifest but never read anywhere in this game — only `trafficDensity` is consumed.
8. **Rendering is one merged painter's-algorithm array**: `ProjectionEngine.renderViewportRoad` collects gantries/scenery/traffic/opponents/power-ups/self-bike into one `SpriteItem[]`, sorts by z, draws once. New render layers must push into this array, not draw directly, or z-order breaks.
9. **Opponent LOD**: only nearest `OPP_MAX_DETAILED=2` get full pixel detail; rest render silhouette-only. LOD toggles detail only, never size (unified inverse-distance scale law — a prior bug used two uncalibrated scale systems, now fixed).
10. **Invulnerability flicker uses wall-clock** (`Date.now()`) not sim-time — fine at fixed 60Hz, would desync if game speed were ever scaled.
11. **Bump cooldown is two-speed**: discrete bump event/audio/shake throttled by 0.6s cooldown map; continuous drag/side-push apply every frame regardless of cooldown. Intentional, documented in `BikeCollisions.ts`.
12. **Engine audio is one continuous voice per bike**, param-updated every frame (not one-shot SFX); gain divided by `sqrt(playerCount)` to normalize mixed loudness.
13. **Split-screen viewport math**: `viewH = floor(270/count)`. HUD switches to compact layout at `count>=3`; FX density halved at `count>=3`. New HUD elements must account for this branching or overflow the ~67px viewport at 3-4 players.
14. **Elimination shortcut**: when only one bike remains active, its `z` is force-set to finish distance — win-by-elimination doesn't require actually reaching `TOTAL_LENGTH_METERS`.

## Sibling games (for contract comparison)
`src/games/{micro-game, obstacle-survival, relic-rush, snake-arena, turbo-rider}` — all implement the same `GameModule`/`GameManifest` contract. turbo-rider uniquely uses `core/` + `render/` + `screens/` (heavier pre/post-round UI) vs siblings' `entities/`/`systems/` split.
