# Original User Request

## Initial Request — 2026-07-25T06:29:23Z

Complete overhaul and polish of the 2-4 Player Metroidvania Action game "HOLLOW CLASH: SHADOW METROIDVANIA" in PartyPlay using autonomous parallel agents.

Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash
Integrity mode: development

## Requirements

### R1. Single-Keyboard Multi-Player Control System
Implement robust, conflict-free 2-Player controls mapped on a single keyboard (P1: A/D/W/S/LCTRL/LSHIFT, P2: Arrows/DownArrow/RCTRL/RSHIFT), along with immediate lounge bypass on Enter/Space.

### R2. Physics Engine Unification & Hazard Mechanics
Unify movement, jumping, top-left AABB tile collisions, moss wall sliding, and spike pit hazard damage/respawn into a clean single physics engine.

### R3. Combat & Level Design Overhaul
Fix melee slash AABB boxes (Forward, Up, Down), enemy damage registration (`takeDamage()`), airborne pogo bounce, map expansion to 960px, and the 2-phase Moss Knight Boss encounter.

### R4. UI & Visual FX Polish
Render the cyan Soul Vessel meter in Side HUD, align Boss Health Bar at top-center, and fix Parallax Cavern background modulo wrap math.

## Acceptance Criteria

### Playability & Controls
- [ ] P1 and P2 can independently move, jump, slash, dash, and heal using their assigned keys.
- [ ] Pressing Enter or Space in the Hero Lounge instantly starts the game.
- [ ] Knights spawn cleanly at y=200 without falling through world geometry.

### Physics & Combat
- [ ] Melee slashes reduce enemy HP, trigger hit effects, and award Soul.
- [ ] Downward slashes on enemies and spike pits trigger airborne pogo bounce.
- [ ] Spike pits deal 1 Mask damage and respawn the knight safely on solid ground.
- [ ] Shadow Dash maintains horizontal wall collisions while retaining invulnerability.

### Level & UI
- [ ] Players can explore past x=464 all the way to x=960 to defeat the Moss Knight Boss.
- [ ] Side HUD displays Mask HP, Geo count, and cyan Soul Vessel meter for all active players.
- [ ] Parallax Cavern backdrop scrolls smoothly without polygon stretching or flickering.
- [ ] `npm run build` passes with zero errors.
