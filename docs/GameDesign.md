# PartyPlay Game Design Manual

PartyPlay is a local multiplayer browser game console designed for high-energy arcade sessions.

---

## 1. Core Design Pillars

### 1. Charm Over Realism
We prioritize expressive pixel art, bouncy squash-and-stretch interactions, and tactile audio feedback over physical realism.

### 2. Readability Over Detail
Gameplay elements must be immediately distinguishable at a glance. High contrast silhouettes, limited color counts per entity, and clear spatial separation take priority over intricate micro-details.

### 3. Instant Party Fun (Zero-Tutorial)
A player should understand how to play within 3 seconds of holding a controller or keyboard.
- Controls are limited to **Directional movement** (Left/Right or D-pad) + at most **1 action button**.
- Controls are printed cleanly on the setup screen prior to match start.

### 4. Shared-Screen Local Multiplayer (2–4 Players)
All games run on a single screen without split-screen dividers. Cameras are fixed-viewport (480×270) to ensure equal visibility for all players.

---

## 2. The Micro-Game Loop Architecture

Every match follows a strict round structure optimized for rapid play:

```mermaid
stateDiagram-v8
    [*] --> GameBrowser: Select Game
    GameBrowser --> PlayerSetup: Configure Players & Modifiers
    PlayerSetup --> Countdown: Launch Game
    Countdown --> ActivePlay: 3, 2, 1, GO!
    ActivePlay --> RoundEnd: Survivor Standing or Time Expired
    RoundEnd --> GameResults: Display Standings & Scores
    GameResults --> ActivePlay: Rematch
    GameResults --> GameBrowser: Exit to Library
```

### Round Specifications
- **Target Duration**: 30 to 90 seconds.
- **Scoring**: Points awarded per round based on elimination rank:
  - 1st Place (Winner): 100 pts + survival bonus
  - 2nd Place: 60 pts
  - 3rd Place: 30 pts
  - 4th Place: 10 pts
- **Match Format**: Best of 3 or Best of 5 rounds.

---

## 3. Game Modifiers & Seeded Replays

PartyPlay supports dynamic game modifiers configured during `<PlayerSetup />`:

### Universal Modifiers
- `speedMultiplier` (`0.5x` to `2.0x`): Scales entity speed and game loop pacing.
- `seed` (`number`): Seeds the Mulberry32 PRNG generator for reproducible procedural rounds.

### Game-Specific Modifiers
- **Obstacle Survival**: `obstacleDensity` (`0.5x` to `2.0x`), `playerRadiusMultiplier` (`0.8x` to `1.5x`).
- **Snake Arena**: `growRate`, `dashCost`, `wrapEdges` (`boolean`).

---

## 4. Micro-Game Catalog Deep Dives

### Game #1: Obstacle Survival
- **Category**: Survival / Arcade
- **Players**: 2 to 4
- **Estimated Round Time**: 30–60s
- **Controls**: `moveLeft`, `moveRight`
- **Rules**:
  - Players start at the bottom of the screen.
  - Rows of obstacle blocks scroll downward at escalating speed over time.
  - Colliding with an obstacle block eliminates the player immediately with a retro hit-stop and sound effect.
  - Solid player-to-player collision allows bumping opponents into incoming blocks.
  - Last survivor standing wins the round.

### Game #2: Snake Arena
- **Category**: Arcade / Battle Royale
- **Players**: 2 to 4
- **Estimated Round Time**: 45–90s
- **Controls**: `moveLeft` (Turn Left 90°), `moveRight` (Turn Right 90°)
- **Rules**:
  - Grid resolution: **48 × 27** grid (10px grid size).
  - Players start in 4 corner locations with initial length of 3.
  - Apples spawn randomly using the seeded PRNG. Eating an apple increases snake length by 1 segment.
  - Colliding with outer walls or any snake body segment (self or opponent) results in instant elimination.
  - Last surviving snake wins the round.
