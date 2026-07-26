## 2026-07-25T15:47:17Z
You are assigned to mine precise specifications and formulas for Milestone 3 (M3): Automation & Processing Workshop.
Working directory: /home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/spec_miner_m3_3

Read these reference files before starting:
- /home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/ORIGINAL_REQUEST.md
- /home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/orchestrator/PROJECT.md
- /home/viv/Projects/PartyPlay/src/games/mythic-farm/types.ts
- /home/viv/Projects/PartyPlay/src/games/mythic-farm/config.ts

Your Task:
1. Formulate complete, precise specification tables and contracts for M3:
   - All Sprinkler tiers (Cardinal/Radial/Cross), coordinates coverage calculation relative to tile (x,y), watering application logic.
   - All Scarecrow tiers (Basic 3x3, Deluxe 5x5), pest event generation logic and scarecrow protection interception.
   - Harvester Drone tick behavior, range, auto-deposit to shipping bin / inventory.
   - Artisan Station recipes (inputs, outputs, timers, value multipliers, item IDs).
2. Detail edge cases: placement validation (can't place on occupied crop tile unless configured, removing station with item inside, tick updates across day transitions, empty inventory inputs).
3. Design exact test cases required for Unit, Integration, and System verification.

Write your specification document to /home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/spec_miner_m3_3/analysis.md and handoff report to handoff.md.
