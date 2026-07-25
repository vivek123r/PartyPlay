# Project: HOLLOW CLASH: SHADOW METROIDVANIA

## Architecture
- 2-4 Player Metroidvania Action game built with TypeScript/Canvas rendering in PartyPlay.
- Core entities: Player (Knight), Enemies (Crawlers, Moss Knight Boss), Hazards (Spikes), Particles/VFX.
- Systems: Input, Physics & Collision (AABB, Tilemap, Slopes/Walls), Combat (Hitboxes, Hurtboxes, Damage, Pogo, Soul), Level/Camera (Viewport scrolling up to x=960), UI (Side HUD, Boss HP bar).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Exploration & Baseline Audit | Analyze existing codebase, list bug locations, establish build check | None | DONE |
| M1 | R1: Single-Keyboard Controls & Lounge Bypass | P1/P2 single-keyboard controls, Enter/Space lounge bypass, clean knight spawn y=200 | M0 | DONE |
| M2 | R2: Physics Unification & Hazard Mechanics | Single physics engine (AABB, moss wall slide, spike pit damage & safe respawn, Shadow Dash wall collision) | M1 | DONE |
| M3 | R3: Combat System & Level Expansion & Moss Knight Boss | Melee AABB boxes (Fwd/Up/Dn), takeDamage(), airborne pogo, level expansion to x=960, 2-phase Moss Knight Boss | M2 | DONE |
| M4 | R4: UI & Visual FX Polish | Cyan Soul Vessel meter in Side HUD, top-center Boss Health Bar, Parallax Cavern wrap math | M3 | DONE |
| M5 | Final E2E Audit & Hardening | Full build, verification of all acceptance criteria, forensic audit | M4 | IN_PROGRESS |

## Interface Contracts
### Player Input & Control Mapping
- P1: A/D (move), W (jump/up), S (down), LCTRL (slash/attack), LSHIFT (dash/heal)
- P2: Left/Right Arrows (move), Up Arrow (jump/up), Down Arrow (down), RCTRL (slash/attack), RSHIFT (dash/heal)
- Lounge Bypass: Enter or Space key press transitions state immediately from Hero Lounge to active gameplay.

### Physics & Collisions
- AABB Top-Left origin tile collisions with map width extending from x=0 to x=960.
- Spike pits: detect collision, deduct 1 Mask HP, respawn player safely at last solid ground position.
- Wall slide: Moss wall sliding logic unified with gravity and horizontal velocity limits.
- Shadow Dash: invulnerability active while preserving standard horizontal wall stopping physics.

### Combat & Boss Mechanics
- Melee Slash: Forward, Upward, Downward directional AABB attack hitboxes.
- Pogo: Downward slash connecting with enemy or spike pit launches player upward (pogo bounce).
- Enemies & Boss: `takeDamage(amount)` method handling HP deduction, hit visual feedback, and Soul award to player. Moss Knight Boss has 2 phases (Phase 1 & Phase 2 behavior).

### UI & Render Components
- Side HUD: Renders player Mask HP (hearts/masks), Geo count, and cyan Soul Vessel meter.
- Boss Health Bar: Rendered top-center during Moss Knight fight.
- Background: Parallax Cavern background math wrapping smoothly without seams/stretching up to x=960.

## Code Layout
- `config.ts`: Game configuration, constants, dimensions, control mappings.
- `types.ts`: TypeScript interfaces for entities, player state, game state, inputs.
- `index.ts`: Game entry point, main update/render loop.
- `manifest.ts`: Game metadata and registration in PartyPlay.
- `entities/`: Player, Enemy, Boss, Spike, Particle entity implementations.
- `screens/`: Hero Lounge, Main Game Screen, Game Over / Victory screens.
- `systems/`: Input, Physics, Collision, Combat, Audio, UI/Render systems.
