## 2026-07-25T06:41:56Z
You are Worker 3 for HOLLOW CLASH: SHADOW METROIDVANIA (Milestone 1 Grounded Movement Fix).

Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix2

Context & Critical Bug Report:
Challenger 2 found a regression bug in systems/PlatformPhysics.ts:
Worker 2 updated checkAABB() to inclusive kBottom >= tTop. Because checkAABB() was used for BOTH horizontal and vertical collision passes, a knight standing on the floor (y=214, kBottom=238, floor tTop=238) triggers a horizontal AABB collision when moving left or right. Horizontal resolution sets knight.x to -16 or 280, instantly teleporting the player off-screen!

Your Task:
1. Create directory /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix2 and initialize progress.md.
2. Fix systems/PlatformPhysics.ts:
   - Separate horizontal AABB collision checks from vertical collision checks.
   - Horizontal collision checks (left/right movement): must use strict interior AABB overlap (kRight > tLeft && kLeft < tRight && kBottom > tTop && kTop < tBottom). When standing on top of a tile (kBottom === tTop), horizontal side collision MUST NOT trigger.
   - Vertical collision checks (falling/landing): when dy >= 0, landing or resting on a floor tile (kBottom >= tTop && kTop < tTop && kRight > tLeft && kLeft < tRight) snaps knight.y = tile.y - knightHeight, sets vy = 0, and sets isGrounded = true without flickering.
3. Add a unit test to HollowClash.test.ts:
   - Add a test verifying grounded horizontal movement: a knight resting on the floor given left/right movement input moves horizontally at speed without teleporting off-screen, maintaining isGrounded = true.
4. Verification:
   - Run `npm run build` and `npm run test` in /home/viv/Projects/PartyPlay/src/games/hollow-clash to ensure build succeeds with ZERO errors and test suite passes.
5. Deliverables:
   - Save changes to codebase files.
   - Write /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix2/changes.md detailing edits.
   - Write /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix2/handoff.md detailing implementation, build/test results, and layout compliance.
   - Send a message to parent (ID: 733e7419-7e6d-48c6-8ff9-7a1dd367a322) notifying completion.
