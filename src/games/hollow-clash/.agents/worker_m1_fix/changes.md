# Changes Summary — Milestone 1 Remediation

## 1. `index.ts`
- **Location**: `startCavernPhase()` method (lines 92–97)
- **Edit**: Updated `startPositions` array from `[{ x: 50, y: 200 }, { x: 90, y: 200 }, { x: 130, y: 200 }, { x: 170, y: 200 }]` to `[{ x: 50, y: 200 }, { x: 80, y: 200 }, { x: 110, y: 200 }, { x: 140, y: 200 }]`.
- **Rationale**: Knight 4 previously spawned at x=170 (bounding box x=170..186), overlapping Totem Pillar 1 at x=180..204 and causing Knight 4 to snap to y=150 on top of the pillar on frame 1. Shifting spawn positions to x=50, 80, 110, 140 ensures all 4 knights spawn completely clear of Totem Pillar 1 and land smoothly on the cavern floor at y=214.

## 2. `systems/PlatformPhysics.ts`
- **Location**: `checkAABB()` (line 86) & vertical collision logic (line 59)
- **Edit**:
  1. Updated `checkAABB()` return statement from strict inequality `kBottom > tTop` to inclusive inequality `kBottom >= tTop`.
  2. Updated vertical collision velocity check from `if (dy > 0)` to `if (dy >= 0)`.
- **Rationale**: When a knight rests on the floor at y=214 (with height 24, kBottom=238, floor tTop=238, vy=0, dy=0), strict inequality `kBottom > tTop` evaluated to `false` and `dy > 0` evaluated to `false`. This caused `isGrounded` to be reset to `false` every other frame when stationary on the floor, applying micro gravity dips. The inclusive comparison and `dy >= 0` check ensure that resting on the floor maintains stable `isGrounded = true` continuously across consecutive frames.

## 3. `HollowClash.test.ts`
- **Location**: Test block `R1c: Spawn y=200 Physics & Bounds Checking` (lines 72–148)
- **Edit**: Updated test assertions to verify that all 4 knights spawn cleanly, Knight 4 at (140, 200) does not overlap Totem Pillar 1 and lands on cavern floor y=214, and `isGrounded` maintains a stable `true` state on consecutive update frames.
- **Rationale**: Adapts test suite to verify post-fix behavior.
