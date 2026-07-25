# Changes Summary — Worker M1 Fix 2

## Files Modified

1. `src/games/hollow-clash/systems/PlatformPhysics.ts`
   - **Reason**: Fix regression bug where single inclusive `checkAABB` triggered false horizontal side collisions for grounded knights, causing horizontal position snapping/teleportation off-screen.
   - **Details**:
     - Created `checkHorizontalAABB` using strict interior AABB overlap (`kRight > tLeft && kLeft < tRight && kBottom > tTop && kTop < tBottom`). When standing on top of a tile (`kBottom === tTop`), horizontal side collision returns `false`.
     - Created `checkVerticalLandingAABB` (`kBottom >= tTop && kTop < tTop && kRight > tLeft && kLeft < tRight`) for `dy >= 0` falling/landing checks to snap `knight.y = tile.y - knightHeight`, reset `vy = 0`, and set `isGrounded = true` without flickering.
     - Created `checkVerticalCeilingAABB` (`kTop <= tBottom && kBottom > tBottom && kRight > tLeft && kLeft < tRight`) for `dy < 0` upward head collision check to set `knight.y = tile.y + tile.height` and `vy = 0`.

2. `src/games/hollow-clash/HollowClash.test.ts`
   - **Reason**: Add empirical verification test for grounded horizontal movement.
   - **Details**:
     - Added `FIX VERIFICATION 3: Grounded horizontal movement moves knight smoothly without teleporting off-screen, maintaining isGrounded = true`.
     - Verified knight moving left and right on floor moves horizontally as expected without teleporting off-screen, maintaining `isGrounded = true` and `y = 214`.
