## 2026-07-25T08:30:28Z
You are Worker 2 (Milestone 2 Advanced Metroidvania Mechanics & Charms Worker).
Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m2

OBJECTIVE:
Implement Milestone 2 (Advanced Metroidvania Mechanics System & Equippable Charms) for HOLLOW CLASH: SHADOW METROIDVANIA at /home/viv/Projects/PartyPlay/src/games/hollow-clash.

INPUT INFORMATION:
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/ORIGINAL_REQUEST.md (MANDATORY).
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/orchestrator/PROJECT.md for architecture.
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/explorer_m0_2/handoff.md for exact implementation specs.

IMPLEMENTATION REQUIREMENTS (Milestone 2 / R2):
1. **Soul Spells System** (`src/games/hollow-clash/entities/Knight.ts`):
   - Implement 3 distinct spells (spending 33 Soul each):
     - **Vengeful Spirit** (`neutral + cast`): Horizontal soul wave (`vx = ±420`, 40 damage).
     - **Abyssal Shriek** (`up + cast`): Upward void column (`44x80px`, multi-hit 60 total damage).
     - **Desolate Dive** (`down + cast` in air): Rapid downward slam (`vy = 600`) with invulnerability frames + ground `dive_shockwave` (`100x24px`, 50 damage).
     - **Focus Heal** (grounded hold): 0.8s channel spending 33 Soul for +1 HP without firing spell projectiles.
2. **Advanced Movement & Pogo Bouncing** (`src/games/hollow-clash/entities/Knight.ts`, `src/games/hollow-clash/systems/PlatformPhysics.ts`):
   - **Airborne Pogo Bounce**: Downward slash on enemies or hazard spikes triggers vertical pogo bounce AND resets ALL air mobility (`canDoubleJump = true`, `canShadowDash = true`, `canCrystalDash = true`, `dashCooldownTimer = 0`).
   - **Crystal Super Dash**: 0.8s stationary charge with crystal glow -> rocket boost horizontal flight (`vx = ±600`, `vy = 0`), cancelled by jump/dash/damage/solid wall collision.
   - **Moss Wall Clinging & Sliding**: Wall cling/slide on moss surfaces.
3. **Equippable Charm & Perk System** (`src/games/hollow-clash/entities/Knight.ts`):
   - Support `CharmType = 'quick_slash' | 'longnail' | 'spore_shroom' | 'lifeblood_heart'`.
   - **Quick Slash**: Reduces slash cooldown from 0.3s to 0.18s.
   - **Longnail**: Expands nail AABB hitboxes and visual arcs by 1.5x.
   - **Spore Shroom**: Spawns damaging `SporeCloud` (radius 40, area damage) when healing or taking damage.
   - **Lifeblood Heart**: Grants +2 blue Lifeblood Masks that absorb damage before white Mask HP.

VERIFICATION REQUIREMENTS:
- Run unit test suite: `npx vitest run src/games/hollow-clash` and ensure all tests pass with 0 errors.
- Document test commands and results in your handoff report at `/home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m2/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
