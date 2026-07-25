# Project: HOLLOW CLASH: SHADOW METROIDVANIA (Dark Metroidvania Overhaul)

## Architecture
- Single-player dark Metroidvania action game powered by HTML5 Canvas and TypeScript.
- Core systems:
  - `PlatformPhysics.ts`: AABB tile collisions, gravity, moss wall sliding, wall clinging, pogo resets.
  - `Knight.ts`: Player vessel state machine, movement, slashes, spells (Vengeful Spirit, Abyssal Shriek, Desolate Dive), Crystal Dash, Shadow Dash, Charms.
  - `SideHUDManager.ts`: Gothic top-left HUD frame, cracked Mask HP containers, cyan Soul Vessel gauge, Geo counter.
  - `Enemy.ts` & `BossMossKnight.ts`: Grotesque mutant enemies (Spore Husks, Thorn Crawlers, Acid Spitters) and multi-phase Boss state machine.
  - `CavernTilemap.ts` & `Collectible.ts`: Deep cavern level map, breakable walls, crumbling platforms, spike pits, secret upgrade shrines (Mask Shard, Vessel Fragment).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Player Vessel Art | Asymmetrical cracked horned mask, tattered cloak, glowing crimson/cyan eyes | M1 | R1 |
| 2 | Grotesque Enemy Art & FX | Mutant subterranean enemy art & bio-sludge/slime particle FX | M1 | R1 |
| 3 | Gothic HUD & Gauge | Top-left gothic frame, cracked Mask HP containers, cyan Soul Vessel gauge, Geo counter | M1 | R1, R4 |
| 4 | Soul Spells System | Vengeful Spirit, Abyssal Shriek, Desolate Dive + dive shockwave, Focus Heal | M2 | R2 |
| 5 | Movement & Pogo Mechanics | Airborne pogo bouncing on enemies/spikes (resets abilities), Crystal Super Dash, Moss Wall Cling/Slide | M2 | R2 |
| 6 | Equippable Charms | Quick Slash, Longnail, Spore Shroom, Lifeblood Heart charm perks | M2 | R2 |
| 7 | Grotesque Mutant Enemies | Mutant Spore Husks (spore cloud/acid), Jagged Thorn Crawlers (wall crawl), Acid Spitters AI | M3 | R3 |
| 8 | Multi-Phase Boss Encounter | Phase 1 & 2 transitions, enraged aura, 8-way acid spore bursts, vine shockwaves, minion wave summons | M3 | R3 |
| 9 | Cavern Level Expansion | Secret rooms, breakable walls, crumbling platforms, hazard spike chasms | M4 | R4 |
| 10 | Upgrade Shrines & E2E Build | Mask Shard (+1 HP), Vessel Fragment (+33 Soul), Geo deposits, zero-error `npm run build` | M4 | R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Visual Identity & Gothic HUD | Player vessel visuals, grotesque enemy/boss art, bio-sludge FX, top-left gothic HUD frame & Soul Vessel gauge | none | DONE |
| 2 | Advanced Mechanics & Charms | Soul Spells (Vengeful Spirit, Abyssal Shriek, Desolate Dive), Crystal Super Dash, Airborne Pogo, Charms system | M1 | PLANNED |
| 3 | Grotesque Enemies & Boss | Mutant Spore Husks, Thorn Crawlers, Acid Spitters, Multi-Phase Boss with enraged aura, acid bursts & minion summons | M2 | PLANNED |
| 4 | Cavern Expansion & Upgrades | Deep cavern tilemap, secret rooms, breakable walls, crumbling platforms, Mask/Vessel upgrade shrines, clean build | M3 | PLANNED |

## Interface Contracts
### `Knight.ts` ↔ `SideHUDManager.ts`
- `knight.getSoul(): number` (0 - 100)
- `knight.getMaxSoul(): number` (100 - 199)
- `knight.getCharms(): CharmType[]`
- `knight.getLifebloodHP(): number`

### `Knight.ts` ↔ `PlatformPhysics.ts`
- `isCrystalDashing: boolean`, `isDiving: boolean`, `isWallClinging: boolean`
- `resetAirAbilities()`: sets `canDoubleJump = true`, `canShadowDash = true`, `canCrystalDash = true`, `dashCooldownTimer = 0`

### `Enemy.ts` / `BossMossKnight.ts` ↔ `PlatformPhysics.ts`
- Spore cloud & acid projectile AABBs, minion spawn requests, phase state emissions.

## Code Layout
- `src/games/hollow-clash/index.ts` — Main game loop, scene setup, input dispatch.
- `src/games/hollow-clash/entities/Knight.ts` — Player vessel state, movement, slashes, spells, charms.
- `src/games/hollow-clash/entities/Enemy.ts` — Mutant enemy logic, AI states, render & hitboxes.
- `src/games/hollow-clash/entities/BossMossKnight.ts` — Multi-phase boss logic & attack patterns.
- `src/games/hollow-clash/entities/Particle.ts` — Bio-sludge, hit sparks, crystal glow, spell FX.
- `src/games/hollow-clash/entities/Collectible.ts` — Geo coins, Mask Shards, Vessel Fragments.
- `src/games/hollow-clash/systems/PlatformPhysics.ts` — Physics engine & tile collisions.
- `src/games/hollow-clash/systems/SideHUDManager.ts` — Top-left gothic HUD & gauges.
- `src/games/hollow-clash/systems/CavernTilemap.ts` — Tilemap layout, secret walls, crumbling tiles.
