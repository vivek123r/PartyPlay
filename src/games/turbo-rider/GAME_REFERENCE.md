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
- **Logical-size shim**: the platform canvas is `PixiRendererContext.VIRTUAL_WIDTH/HEIGHT` = **960x540** device pixels (`src/runtime/RendererContext.ts`). A game authored at a smaller "logical" resolution declares `logicalWidth`/`logicalHeight` on its `GameManifest` (defaults to legacy 480x270 if omitted); `PixiRendererContext` wraps a pre-scaled root `Container` (`get stage()`) so the game's own coordinate math never changes, and `get viewport()` always returns the game's own logical size (never the physical canvas size) — this is what keeps siblings that read `ctx.renderer.viewport` (micro-game, snake-arena, obstacle-survival) correct without any edits on their side. **turbo-rider is the one game that opts into the native 960x540 logical size** (`manifest.ts: logicalWidth: 960, logicalHeight: 540`) — every other game in `src/games/*` still authors at 480x270 and is scaled up 2x transparently.

## File map
```
index.ts                742L  GameModule entry — owns all state, orchestrates phases, per-frame render
manifest.ts              87L  GameManifest: 2-4 players, category Sports, 4 keyboard binding sets,
                               logicalWidth/logicalHeight: 960x540 (native — see platform contract above)
types.ts                 97L  Shared DTOs: BikeStats, TuningSetup, BikeCustomization, Point3D,
                               TrackSprite, OpponentSprite, TrackSegment
core/
  Bike.ts                 1L  DEAD — re-export shim `BikePhysics as Bike`, unused, ignore
  BikePhysics.ts        212L  Per-bike sim: movement, nitro, crash, lives, lean/pitch
  TuningSystem.ts          -  createDefaultSetup/Customization, calculateStats → BikeStats
  BikeCollisions.ts     107L  Player-vs-player bump resolution (pure fn, MTV-based)
  HandcraftedTrack.ts   111L  TrackPhase enum + generateTrack() — ALWAYS straight/flat (curve=0)
  PowerUpManager.ts     102L  Pickup spawn/collect: boost/shield/coin
  TrackConstants.ts       10L  Single source of truth: road width, bike dims (m)
  TrafficManager.ts     105L  AI traffic/hazard spawn+move+collide (imports render/VehicleSprites!)
render/
  BikeSprite.ts         146L  Procedural rear-view bike+rider sprite, player tag, exhaust flame,
                               additive near-tier detail at scale>=1.6 (hands/mirrors/tread/glow)
  EnvironmentFX.ts       215L  Particles, screen shake, nitro vignette/streaks (1 instance/viewport);
                               vanishY takes the real horizonY (ProjectionEngine.horizonYFor) instead
                               of guessing viewH*0.3; particle sizes scale with PIXEL_SCALE
  PixelFont.ts           196L  3x5 glyphs (`drawText`) + additive 5x7 glyphs (`drawTextLarge`) +
                               `measure`/`measureLarge` advance helpers — used by all HUD/screen draws.
                               Cross-game shared: also imported by hollow-clash, lava-escape,
                               dungeon-brawl — the 3x5 API/output must never change, only add to it.
  ProjectionEngine.ts    595L  Pseudo-3D projection + full per-viewport render (single painter's-algo
                               pass). `horizonYFor(viewH, playerCount)` is the public single source of
                               truth for the horizon line (also consumed by EnvironmentFX)
  RenderScale.ts          26L  `PIXEL_SCALE` (= viewW/480, set once in init()) + `BIKE_SCALE_REF_VIEW_H`
                               (=135, a fixed screen-fraction reference, NOT the live viewport) — the
                               two knobs pixel-absolute modules (VehicleSprites/BikeSprite/Skybox/
                               EnvironmentFX) use since they can't reach the live viewW directly
  SceneryLibrary.ts      517L  Roadside props / overhead gantries per track phase (fully ppm-relative)
  Skybox.ts              274L  Sky gradient/sun/stars per phase + video overlay; every absolute-px
                               layout literal multiplied by `unitFor(viewW) = viewW/480` so the
                               composition holds at any resolution instead of reading squeezed-together
  VehicleSprites.ts     1298L  Traffic/hazard sprite drawing + VEHICLE_DIMENSIONS_M table. Detail-LOD
                               thresholds (`sideDetailMinSpanPx()`, `flankDetailMaxPpm()`, hazard ring)
                               scale with PIXEL_SCALE and are lowered relative to a flat scale so full
                               flank detail engages meaningfully further out at native resolution
  VideoEngine.ts         130L  Singleton <video>→Texture. initFireVideo() DEAD, initSkyboxVideo() used
screens/
  GarageScreen.ts        550L  Pre-race tuning UI + input handling (own private Ticker, not dt!).
                               Redesigned at 960x540: graphical token bars/sliders/palette swatches
                               replace the old `[##-]` text, 112x68 BikeShowcase art (was 56x34),
                               stat radar r=44. Click hitbox is recomputed every render() call — no
                               more stale absolute-coordinate fallback.
  ResultsScreen.ts       106L  Post-race podium; reads viewW/viewH instead of hardcoding 480x270.
                               `show()` clears any previous dismiss timeout and destroy() clears its
                               own — no more double-fire / fire-after-destroy race.
```

## Game flow (index.ts)
1. `init(ctx)`: reads `viewW/viewHFull` from `ctx.renderer.viewport` (960x540 — never hardcoded) and calls `setPixelScale(viewW)`; clamp players 2-4, spawn `BikePhysics` per player, `HandcraftedTrack.generateTrack()` (6000m), spawn traffic (density = `modifiers.trafficDensity`) + power-ups, build one masked viewport `Container` per player (stacked vertically, `viewH = floor(viewHFull/count)`), mount garage + results overlays. `state='Ready'`.
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
| Render resolution | native 960x540 (`manifest.ts logicalWidth/logicalHeight`); `viewW/viewHFull` read once from `ctx.renderer.viewport` in `init()`, never hardcoded |
| Flank detail thresholds | `flankDetailMaxPpm() = 3.5*PIXEL_SCALE` (≈206m engagement, was ≈90m), `sideDetailMinSpanPx() = 12*PIXEL_SCALE`, hazard ring `9*PIXEL_SCALE` (≈65m, was ≈40m) — all in `render/VehicleSprites.ts` |

## Gotchas / dead code / traps (check before touching related logic)
1. **Track is always straight/flat** — `generateTrack()` hardcodes `curve:0, elevation:0`. `BikePhysics.update`'s centrifugal-force branch is dead code (always receives curve=0). Adding real curves requires updating both the generator and `ProjectionEngine`'s straight-line assumptions.
2. **Layering violation**: `core/TrafficManager.ts` imports vehicle dimensions from `render/VehicleSprites.ts` — core depends on render for collision boxes.
3. ~~`ResultsScreen` dismiss uses `setTimeout` with no `clearTimeout`~~ — **fixed**: `show()` clears any previous dismiss timeout before scheduling a new one, and `destroy()` clears its own + sets a `destroyed` guard so `onComplete()` can never fire against a torn-down instance.
4. **`GarageScreen` runs its own private `pixi.Ticker`**, independent of the fixed-step `dt`. Stopped in `destroy()` but NOT in `pause()` — keeps animating in real time while paused unless explicitly handled.
5. **`core/Bike.ts`** is a dead 1-line re-export, unused elsewhere. Safe to ignore/delete.
6. **`VideoEngine.initFireVideo()`** is dead — nitro flame moved to procedural draw in `BikeSprite.ts` because a shared video texture couldn't be tinted per-player (caused cross-player bleed in split-screen). Only `initSkyboxVideo()` is live. Note the skybox video texture is nearest-sampled like everything else (global `TextureSource.defaultOptions.scaleMode='nearest'` in `GameRunner.ts`) — at native 960-wide it upscales a photographic clip 2x with hard pixel edges; if that reads as blocky, switching just that one texture's `source.scaleMode` to `'linear'` after load is the fix, not a global scaleMode change (everything else here is deliberately nearest-sampled pixel art).
7. **`modifiers.speedMultiplier`** declared in manifest but never read anywhere in this game — only `trafficDensity` is consumed.
8. **Rendering is one merged painter's-algorithm array**: `ProjectionEngine.renderViewportRoad` collects gantries/scenery/traffic/opponents/power-ups/self-bike into one `SpriteItem[]`, sorts by z, draws once. New render layers must push into this array, not draw directly, or z-order breaks.
9. **Opponent detail is always full** — `drawSuperbikeRear` has no distance-based LOD (a prior "silhouette beyond ~55m" mode was deliberately removed, see the doc comment above it; there is no `OPP_MAX_DETAILED` in code, despite what an older revision of this doc claimed). What *does* scale is size: `ProjectionEngine`'s `baseBikeScale = viewH / BIKE_SCALE_REF_VIEW_H` and `OPP_MIN_PX` (now 6, was 3) floor how small a distant opponent is allowed to project to. `drawSuperbikeRear` additionally gains a purely-additive near-tier (hands/mirrors/tread/brake bloom) once `scale >= 1.6`.
10. **Invulnerability flicker uses wall-clock** (`Date.now()`) not sim-time — fine at fixed 60Hz, would desync if game speed were ever scaled.
11. **Bump cooldown is two-speed**: discrete bump event/audio/shake throttled by 0.6s cooldown map; continuous drag/side-push apply every frame regardless of cooldown. Intentional, documented in `BikeCollisions.ts`.
12. **Engine audio is one continuous voice per bike**, param-updated every frame (not one-shot SFX); gain divided by `sqrt(playerCount)` to normalize mixed loudness.
13. **Split-screen viewport math**: `viewH = floor(viewHFull/count)` → 270 (2P) / 180 (3P) / 135 (4P) at native 960x540. The old binary `compact` HUD flag (tuned for a 67px 4P viewport that no longer exists) is gone — HUD chrome now uses an integer `hudScale = viewH >= 270 ? 2 : 1`, so 2P runs the full layout at 2x and 3P/4P run it at 1x (i.e. today's *full* layout, never the old compact one, at full pixel density). FX density is still halved at `count>=3`. New HUD elements must size against `hudScale`, not a player-count check.
14. **Elimination shortcut**: when only one bike remains active, its `z` is force-set to finish distance — win-by-elimination doesn't require actually reaching `TOTAL_LENGTH_METERS`.
15. **`PixelFont.ts` is cross-game shared** despite living under `turbo-rider/render/` — `hollow-clash`, `lava-escape` and `dungeon-brawl` all import it directly. The 3x5 `drawText`/`PIXEL_GLYPHS` API and output must never change; the 5x7 face (`drawTextLarge`/`PIXEL_GLYPHS_LARGE`/`measureLarge`) is purely additive for exactly this reason.
16. **`RenderScale.BIKE_SCALE_REF_VIEW_H = 135`** is a fixed screen-fraction constant (legacy 2-player viewport height), not something to "correct" to read the live viewport — `viewH / 135` is what makes the bike keep the same ~21% on-screen height fraction at any render resolution. Same for `PIXEL_SCALE = viewW / 480`: it's set once in `init()` via `setPixelScale()`, not read live per-frame — the split is vertical-only so `viewW` (and therefore `PIXEL_SCALE`) is constant for the whole frame across all viewports.

## Sibling games (for contract comparison)
`src/games/{dungeon-brawl, hollow-clash, lava-escape, micro-game, obstacle-survival, relic-rush, snake-arena, turbo-rider}` — all implement the same `GameModule`/`GameManifest` contract, all still authored at the legacy 480x270 logical size (scaled up 2x transparently by the platform's logical-size shim — see platform contract above). turbo-rider uniquely uses `core/` + `render/` + `screens/` (heavier pre/post-round UI) vs siblings' `entities/`/`systems/` split, and is the only game with a non-default `logicalWidth`/`logicalHeight`.
