# Explorer 3 Exploration Report & Handoff — Enemies, Boss, Map & Upgrade Architecture

## 1. Observation

### Codebase Scope & Structure
The codebase for "HOLLOW CLASH: SHADOW METROIDVANIA" at `/home/viv/Projects/PartyPlay/src/games/hollow-clash` comprises the following key files:
- `types.ts`: Type definitions for `EnemyUnit`, `SoulSpell`, `CollectibleItem`, `KnightState`, `PlatformTile`, `BossState`.
- `entities/Enemy.ts`: Enemy unit class, constructor stats, AI update behavior (`spore_bug`, `mantis_crawler`, `shielded_husk`), `takeDamage()` blocking logic, hit rendering.
- `entities/BossMossKnight.ts`: Boss state machine, 600 HP, Phase 1 & Phase 2 enraged transition at 50% HP threshold, attack state machine (`idle`, `cleaving`, `guarding`, `spore_explosion`, `vine_slam`, `leap`), shockwave emission, player hitboxes, enraged aura particles.
- `systems/CavernTilemap.ts`: Level geometry layout (width 960px), moss platforms, 2 spike pits (x=280..400, x=580..660), stone ledges, totem pillars, right boundary wall at x=944.
- `systems/PlatformPhysics.ts`: Physics update engine for gravity, horizontal/vertical AABB collisions, moss wall sliding, and spike pit hazard damage/respawn to `lastSafeGroundPosition`.
- `entities/Collectible.ts`: Collectible items (`geo_coin`, `soul_orb`, `mask_shard`).
- `entities/Knight.ts`: Player knight entity, combat slashes (forward, up, down), pogo bouncing on enemies/spikes, soul gain (+11), shadow dash, visual rendering.
- `entities/SoulSpell.ts`: Vengeful Spirit soul wave projectile and Focus Heal ring.
- `systems/SideHUDManager.ts`: Player Side HUD with Mask HP containers, Geo count, Cyan Soul Vessel meter (0..100), and top-center Boss Health bar (600 HP, enraged indicator).
- `systems/ParallaxCavern.ts`: 3-layer subterranean cavern parallax backdrop with positive modulo wrap math `((val % wrap) + wrap) % wrap`.
- `index.ts`: Game module orchestrator managing loop, lounge transition, enemy updates, boss updates, collectible pickups, and victory/defeat triggers.

---

### Detailed Direct Observations by Sub-System

#### Area 1: Grotesque Mutant Enemies (AI, Hit Behaviors & Visual Identity)
1. **Types Definition** (`types.ts` line 3):
   ```ts
   export type EnemyUnit = 'spore_bug' | 'mantis_crawler' | 'shielded_husk' | 'boss_moss_knight';
   ```
2. **Current Enemy AI & Mechanics** (`entities/Enemy.ts` lines 29-88):
   - `'spore_bug'`: maxHp=30, moveSpeed=110. Sine wave flying AI:
     ```ts
     this.vx = dirX * this.moveSpeed * 0.8;
     this.vy = Math.sin(this.animTimer * 5) * 60;
     ```
   - `'mantis_crawler'`: maxHp=50, moveSpeed=130. Ground lunge AI (lunge speed 1.5x when `minDist < 100`, else 0.6x).
   - `'shielded_husk'`: maxHp=70, moveSpeed=70. Slow march AI. Blocks frontal attacks in `takeDamage()` (lines 91-95):
     ```ts
     if (this.type === 'shielded_husk' && attackDir && attackDir !== 'down') {
       const isFrontal = (this.facing === 'left' && attackDir === 'right') || (this.facing === 'right' && attackDir === 'left');
       if (isFrontal) return; // Blocked!
     }
     ```
3. **Enemy Death & Drop Behavior** (`index.ts` lines 207-213):
   ```ts
   if (enemy.hp <= 0) {
     this.collectibles.push(new Collectible(`geo-${Date.now()}`, 'geo_coin', enemy.x, enemy.y));
     this.enemies.splice(i, 1);
     continue;
   }
   ```
4. **Hit Particle FX** (`Knight.ts` lines 313-327): Currently spawns plain white particles `color: 0xffffff` when striking enemies.
5. **Required Grotesque Mutant Enemies** (`ORIGINAL_REQUEST.md` lines 50-63, 69-72, 80-82):
   - Grotesque dark subterranean aesthetics (asymmetrical cracked skull masks, dripping bio-sludge, jagged thorn appendages, twitching mandibles).
   - 3 specific mutant types required:
     - **Mutant Spore Husks**: Infested crawling husks that release toxic spore cloud AoE on death (`hp <= 0`).
     - **Jagged Thorn Crawlers**: Wall/ceiling crawling insects that drop down or strike with thorn slashes.
     - **Acid Spitters**: Stationary/hovering insectoid enemies with twitching mandibles that spit dark green acid sludge projectiles at players.
   - Dark slime/sludge particle emissions (green/purple/dark-cyan sludge) when struck or killed.

---

#### Area 2: Multi-Phase Boss Fight State Machine (Moss Knight / Grotesque Boss)
1. **Current Boss Implementation** (`entities/BossMossKnight.ts` lines 19-49):
   - Health & Phase properties: `hp = 600`, `maxHp = 600`, `phase = 1`, `isEnraged = false`.
   - Phase transition check (lines 46-49 & 213-216):
     ```ts
     if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
       this.phase = 2;
       this.isEnraged = true;
     }
     ```
   - Attack State Machine: `state: 'idle' | 'cleaving' | 'guarding' | 'spore_explosion' | 'vine_slam' | 'leap'`.
   - Attack Timers: `idleDuration` is 1.8s in Phase 1, 0.9s in Phase 2.
   - Phase 1 attacks: `cleaving` (35%), `leap` (30%), `vine_slam` (20%), `guarding` (15%). `vine_slam` emits 1 directional shockwave.
   - Phase 2 attacks: `cleaving` (35%), `leap` (30%), `vine_slam` (20%), `spore_explosion` (15%). `vine_slam` emits 2 directional shockwaves (left & right).
   - `spore_explosion` hitbox (lines 169-175): distance check `< 45` around boss, deals 1 damage.
   - Guard Stance (lines 207-208): `if (this.state === 'guarding') return;` blocks all frontal damage.
2. **Required Boss State Machine Expansion** (`ORIGINAL_REQUEST.md` lines 19, 61-62, 80-82):
   - **Minion Summon Wave**: A `'summon_minions'` state that spawns minion waves (e.g. 2 Mutant Spore Husks or Acid Spitters) during Phase 2 transition or periodically in Phase 2.
   - **Acid Spore Bursts**: Radial acid spore projectile bursts (8 directions) spawned across the arena during `spore_explosion`.
   - **Phase Transition Sequence**: An explicit `'phase_transition'` state when HP drops below 50%, with roar animation, invulnerability, screenshake event, and minion summon wave.
   - **Enhanced Vine Shockwaves**: Rising thorn/vine graphics along the ground terrain as shockwaves move.

---

#### Area 3: Cavern Level Map Expansion & Environmental Hazards
1. **Current Level Map Configuration** (`config.ts` line 21, `systems/CavernTilemap.ts` lines 12-47):
   - `CAVERN_CONFIG`: width = 960, height = 270.
   - Tile map tiles:
     - Bottom main floor: moss platform (x=0..280), spike pit 1 (x=280..400), moss platform (x=400..580), spike pit 2 (x=580..660), moss platform (x=660..960).
     - Ceilings & Borders: top ceiling (x=0..960 y=0..24 stone), left moss wall (x=0..16), right moss wall (x=944..960).
     - Multi-tier floating ledges: 6 ledges at y=130..220.
     - Totem pillars: x=180..204 y=174..238, x=640..668 y=158..238.
   - `PlatformTile` definition (`types.ts` lines 29-36):
     ```ts
     export interface PlatformTile {
       x: number;
       y: number;
       width: number;
       height: number;
       isSolid: boolean;
       type?: 'stone' | 'moss' | 'spikes';
     }
     ```
2. **Current Physics & Hazards** (`systems/PlatformPhysics.ts` lines 37-143):
   - AABB collision for solid tiles.
   - Moss wall slide on `tile.type === 'moss'`.
   - Spike pit hazard on `tile.type === 'spikes'`: takes 1 damage, teleports knight to `lastSafeGroundPosition`.
3. **Required Level Expansion & Environmental Mechanics** (`ORIGINAL_REQUEST.md` lines 64-65, 81-82):
   - **Extend `PlatformTile.type`**: Add `'breakable' | 'crumbling' | 'secret_wall'`.
   - **Secret Rooms / Hidden Upgrade Chambers**:
     - Upper Secret Chamber (x=360..480, y=40..120) behind a breakable wall at x=340.
     - Boss Stash / Shrine Chamber (x=880..940, y=60..140) behind a breakable wall at x=860.
   - **Breakable Walls (`'breakable'`)**:
     - Destructible stone/vine blocks with hit HP (or destroyed by nail hits / `Vengeful Spirit` / `Desolate Dive`).
     - Plays crumbling debris particles and disables collision (`isSolid = false`), revealing secret passages.
   - **Crumbling Platforms (`'crumbling'`)**:
     - Temporary stone/moss ledges over spike chasms.
     - When landed on, trigger 0.4s shaking jitter, after which platform crumbles (`isSolid = false`), dropping player. Platform respawns after 3.0 seconds.
   - **Spike Pit Hazards**: Expanded spike pit chasms beneath crumbling platform parkour routes.

---

#### Area 4: Health/Soul Upgrades & Geo Drops Interaction
1. **Current Collectible Items** (`types.ts` line 7, `entities/Collectible.ts` lines 1-42):
   - Types: `'geo_coin'` (value 5), `'soul_orb'` (value 15), `'mask_shard'` (value 1).
2. **Current Item Pickup Logic** (`index.ts` lines 243-259):
   ```ts
   if (col.type === 'geo_coin') k.state.geoCount += col.value;
   if (col.type === 'soul_orb') k.state.soul = Math.min(k.state.maxSoul, k.state.soul + col.value);
   ```
   *Note: `'mask_shard'` pickup is NOT implemented in `index.ts`!*
3. **Current HUD Rendering** (`systems/SideHUDManager.ts` lines 51-100):
   - Renders 5 Mask HP containers (`hp` vs `maxHp`).
   - Renders `GEO: count`.
   - Renders cyan Soul Vessel meter (`SOUL` 0..100 fill bar).
4. **Required Upgrade & Drop Systems** (`ORIGINAL_REQUEST.md` lines 56-65, 70-73):
   - **Mask Shard Upgrades (`'mask_shard'`)**:
     - Located in hidden upgrade chambers or awarded on boss defeat.
     - Pickup increases `maxHp` permanently (`k.state.maxHp += 1; k.state.hp = k.state.maxHp;`), dynamically adding extra Mask HP containers on HUD.
   - **Vessel Fragments / Soul Upgrades (`'vessel_fragment'`)**:
     - Add `'vessel_fragment'` to `CollectibleItem` and `Collectible.ts`.
     - Pickup permanently increases `maxSoul` (e.g., 100 -> 133 -> 166), expanding Soul Vessel capacity on HUD.
   - **Geo Drops & Breakable Geo Deposits**:
     - Enemies drop Geo coins (+5 Geo).
     - Breakable Geo Deposits / Relic Chests placed in secret chambers that spill multiple Geo coins (3-5 coins) when smashed.

---

## 2. Logic Chain

1. **Observation**: `types.ts` defines `EnemyUnit = 'spore_bug' | 'mantis_crawler' | 'shielded_husk' | 'boss_moss_knight';` and `Enemy.ts` implements simple flying sine wave, ground lunge, and slow march AI.
   **Deduction**: The codebase currently lacks the requested Grotesque Mutant Enemies (`mutant_spore_husk`, `jagged_thorn_crawler`, `acid_spitter`). To fulfill R3 and grotesque dark subterranean aesthetic requirements, `EnemyUnit` must be updated, AI routines for acid projectile spitters and ceiling/wall crawling thorn insects added, and death spore cloud AoE implemented.

2. **Observation**: `entities/BossMossKnight.ts` has a state machine with 6 basic states, 50% HP threshold for enraged mode, and double vine shockwaves, but lacks minion summons, radial acid spore bursts, and explicit phase transition animations.
   **Deduction**: To meet R3's multi-phase boss fight specification, `BossMossKnight` needs a `'summon_minions'` state that spawns minion waves (`Mutant Spore Husk` or `Acid Spitter`), a radial spore burst projectile attack (`spore_explosion` spawning 8-way acid projectiles), and an invulnerable `'phase_transition'` roar sequence.

3. **Observation**: `systems/CavernTilemap.ts` contains a linear floor layout with 2 spike pits, 6 floating ledges, and 2 totem pillars. `PlatformTile.type` only supports `'stone' | 'moss' | 'spikes'`.
   **Deduction**: The map currently lacks secret rooms, breakable walls, and crumbling platforms required by R4. Extending `PlatformTile.type` with `'breakable'`, `'crumbling'`, and `'secret_wall'` and modifying `CavernTilemap.ts` and `PlatformPhysics.ts` will allow adding upper/lower secret chambers, destructible walls, and crumbling platform chasms.

4. **Observation**: `Collectible.ts` has `'mask_shard'`, but `index.ts` lines 243-259 only handle `'geo_coin'` and `'soul_orb'` pickups. `'mask_shard'` pickup is ignored, and `'vessel_fragment'` does not exist.
   **Deduction**: To support Health/Soul upgrade mechanics in secret chambers, `index.ts` pickup handling must be updated so collecting Mask Shards increases `maxHp` and collecting Vessel Fragments increases `maxSoul`. `SideHUDManager.ts` already dynamically renders containers based on `maxHp` and `maxSoul`, making UI integration seamless.

---

## 3. Caveats

1. **Read-Only Scope Constraint**: As Explorer 3, no source files outside `.agents/explorer_m0_3/` were modified during this investigation.
2. **Backward Compatibility with Tests**: All 82 existing unit and integration tests in `vitest` currently pass. Refactoring `EnemyUnit` and level maps must maintain or alias legacy unit types (`'spore_bug'`, `'mantis_crawler'`, `'shielded_husk'`) to prevent test breakage.

---

## 4. Conclusion

The existing "HOLLOW CLASH" codebase provides a solid, highly reliable core engine with unified physics, pogo bouncing, moss wall sliding, spike hazards, smooth parallax scrolling, and HUD rendering. All 82 existing test cases pass.

To achieve complete alignment with R3 & R4 specifications, the following architectural implementations are required:
1. **Grotesque Mutant Enemies**: Update `EnemyUnit` to add `mutant_spore_husk`, `jagged_thorn_crawler`, and `acid_spitter`. Add acid projectile AI, death spore cloud AoE, dark sludge particle FX, and grotesque pixel art rendering.
2. **Multi-Phase Boss Encounter**: Expand `BossMossKnight.ts` state machine to include `'phase_transition'`, `'summon_minions'`, and 8-way radial acid spore projectile bursts during Phase 2.
3. **Cavern Level Map Expansion**: Extend `PlatformTile` with `'breakable'`, `'crumbling'`, and `'secret_wall'`. Add upper and right secret upgrade chambers, destructible stone walls, and crumbling platform parkour over spike pits in `CavernTilemap.ts` and `PlatformPhysics.ts`.
4. **Health/Soul Upgrades & Geo Drops**: Add `'vessel_fragment'` item type, implement `mask_shard` (+1 maxHp) and `vessel_fragment` (+33 maxSoul) pickup logic in `index.ts`, place upgrade shrines and breakable Geo deposits in secret chambers.

---

## 5. Verification Method

### Test Commands
Run the vitest test suite to verify baseline stability:
```bash
npx vitest run src/games/hollow-clash/
```
Expected output: 4 test files passed, 82 tests passed.

### Implementation Blueprint & Inspection Paths

| Sub-System | Target Files | Key Lines / Functions to Inspect / Modify |
|---|---|---|
| **Enemy Types & AI** | `types.ts`, `entities/Enemy.ts`, `index.ts` | `EnemyUnit` union (types.ts:3); constructor & AI `update()` (Enemy.ts:23-88); death drop & sludge particles (index.ts:207-222, Knight.ts:313-327) |
| **Multi-Phase Boss State Machine** | `entities/BossMossKnight.ts`, `systems/SideHUDManager.ts` | Boss state machine `state` & `update()` (BossMossKnight.ts:24-136); Phase 2 enraged transition (line 46); Boss HUD (SideHUDManager.ts:102-135) |
| **Cavern Map & Hazards** | `types.ts`, `systems/CavernTilemap.ts`, `systems/PlatformPhysics.ts` | `PlatformTile` type definition (types.ts:29-36); `buildLevelLayout()` layout & secret rooms (CavernTilemap.ts:12-47); Crumbling & Breakable tile physics (PlatformPhysics.ts:37-80) |
| **Upgrades & Geo Drops** | `entities/Collectible.ts`, `index.ts`, `systems/SideHUDManager.ts` | Collectible types (Collectible.ts:5); Pickup handler loop (index.ts:243-259); Player Side HUD (SideHUDManager.ts:51-100) |

### Invalidation Conditions
- Any changes to `EnemyUnit` breaking legacy test cases in `HollowClashM3Challenger.test.ts` or `HollowClash.test.ts`.
- Boss HP or state machine logic causing Phase 2 enraged state to trigger out of sync with 50% HP threshold.
- Crumbling platforms or breakable walls causing player physics position NaNs or boundary leaks.
