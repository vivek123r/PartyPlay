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

## Follow-up — 2026-07-25T02:53:25Z

Transform "HOLLOW CLASH: SHADOW METROIDVANIA" into a deep single-player dark Metroidvania experience inspired by Hollow Knight, featuring grotesque mutant enemy art, dark subterranean aesthetics, sleek gothic UI, and insane game mechanics (soul spells, pogo bouncing, charm perks, crystal dash).

Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash
Integrity mode: development

## Requirements

### R1. Grotesque Dark Subterranean Visual Identity & Character Art
Redraw the player vessel, enemies, and boss to feature dark, grotesque, mutant insectoid aesthetics (asymmetrical cracked skull masks, dripping bio-sludge, jagged thorn appendages, monstrous twitching mandibles) paired with a sleek gothic dark UI and Soul Vessel gauge.

### R2. Advanced Metroidvania Mechanics System
Implement advanced combat and movement mechanics:
- **Soul Spells**: Vengeful Spirit (horizontal soul wave), Abyssal Shriek (upward blast), Desolate Dive (downward ground slam with shockwave).
- **Insane Combat & Movement**: Airborne pogo bouncing on enemies & spikes, Crystal Super Dash (horizontal rocket boost across long caverns), Moss Wall Clinging & Wall Sliding, Shadow Dash invulnerability.
- **Charm & Perk System**: Equippable charms (e.g. Quick Slash, Longnail, Spore Shroom, Lifeblood Heart).

### R3. Grotesque Mutant Enemies & Multi-Phase Boss Encounter
Implement diverse grotesque enemies (Mutant Spore Husks, Jagged Thorn Crawlers, Acid Spitters) and a multi-phase Boss fight with enraged spore explosions, vine shockwaves, and summon minion waves.

### R4. Deep Level Exploration & Modern Gothic UI
Expand cavern map depth with secret rooms, hazard spike pits, crumbling platforms, health/soul upgrades, and a sleek top-left gothic HUD.

## Acceptance Criteria

### Visuals & Grotesque Aesthetics
- [ ] Player vessel renders with an asymmetrical cracked horned mask, dark tattered cloak, and glowing crimson/cyan eyes.
- [ ] Enemies feature grotesque pixel art (dripping sludge, twitching appendages, jagged mandibles) and emit dark slime/sludge particle effects when struck.
- [ ] Top-left HUD displays a sleek gothic Soul Vessel gauge, cracked Mask HP containers, and Geo counter.

### Mechanics & Combat
- [ ] Player can execute 3 distinct Soul Spells (Vengeful Spirit, Abyssal Shriek, Desolate Dive).
- [ ] Crystal Super Dash allows charging up and rocketing across long caverns.
- [ ] Downward slashes on enemies or spikes trigger pogo bounces and reset jump/dash abilities.
- [ ] Equippable Charm system applies functional gameplay buffs.

### Boss & Level Design
- [ ] Multi-phase boss encounter features distinct phase transitions (enraged aura, acid spore bursts, shockwaves).
- [ ] Cavern map features hazardous spike pits, breakable walls, and hidden upgrade chambers.
- [ ] `npm run build` compiles cleanly with zero errors.

