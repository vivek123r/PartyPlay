import type { LevelData } from '../types';

export const LEVEL_1: LevelData = {
  width: 2400,
  height: 270,
  groundY: 245,
  skyColor: 0x1a1a2e,
  mountainColor: 0x16213e,
  groundColor: 0x4a3728,

  playerSpawns: [
    { x: 60, y: 210 },
    { x: 90, y: 210 },
  ],

  environment: {
    trees: [
      // Section 1 — Opening field
      { x: 80, groundY: 245 },
      { x: 160, groundY: 245 },
      { x: 350, groundY: 245 },
      { x: 550, groundY: 245 },
      // Section 2 — Platform gauntlet
      { x: 670, groundY: 245 },
      { x: 920, groundY: 245 },
      { x: 1100, groundY: 245 },
      { x: 1280, groundY: 245 },
      // Section 3 — Trench approach
      { x: 1380, groundY: 245 },
      { x: 1520, groundY: 245 },
      { x: 1640, groundY: 245 },
      { x: 1780, groundY: 245 },
      { x: 1880, groundY: 245 },
      // Section 4 — Boss arena
      { x: 1960, groundY: 245 },
      { x: 2100, groundY: 245 },
      { x: 2300, groundY: 245 },
    ],
    crates: [
      { x: 220, y: 233 },
      { x: 340, y: 233 },
      { x: 720, y: 233 },
      { x: 1020, y: 233 },
      { x: 1420, y: 233 },
      { x: 1600, y: 233 },
      { x: 1760, y: 233 },
      { x: 2050, y: 233 },
    ],
    barrels: [
      { x: 270, y: 229 },
      { x: 580, y: 229 },
      { x: 780, y: 229 },
      { x: 1060, y: 229 },
      { x: 1460, y: 229 },
      { x: 1680, y: 229 },
      { x: 2100, y: 229 },
    ],
    signs: [
      { x: 150, y: 221 },   // "DANGER: ENEMY BASE AHEAD"
      { x: 620, y: 221 },   // "BEWARE: TURRET DEFENSES"
      { x: 1320, y: 221 },  // "TRENCH ZONE — PROCEED WITH CAUTION"
      { x: 1920, y: 221 },  // "BOSS ARENA — HEAVY ARMOR ADVISED"
    ],
  },

  platforms: [
    // Section 1: Opening Field (0–600)
    { x: 200, y: 195, width: 80, height: 10 },
    { x: 400, y: 180, width: 60, height: 10 },
    { x: 520, y: 165, width: 50, height: 10 },

    // Section 2: Platform Gauntlet (600–1300)
    { x: 640, y: 200, width: 70, height: 10 },
    { x: 750, y: 175, width: 60, height: 10 },
    { x: 850, y: 200, width: 70, height: 10 },
    { x: 960, y: 150, width: 80, height: 10 },
    { x: 1060, y: 185, width: 60, height: 10 },
    { x: 1160, y: 160, width: 50, height: 10 },
    { x: 1240, y: 200, width: 60, height: 10 },

    // Section 3: Trench Approach (1300–1900)
    { x: 1340, y: 190, width: 100, height: 10 },
    { x: 1480, y: 170, width: 80, height: 10 },
    { x: 1600, y: 195, width: 60, height: 10 },
    { x: 1700, y: 155, width: 70, height: 10 },
    { x: 1800, y: 200, width: 80, height: 10 },

    // Section 4: Boss Arena (1900–2400)
    { x: 1920, y: 185, width: 60, height: 10 },
    { x: 2020, y: 150, width: 80, height: 10 },
    { x: 2150, y: 185, width: 60, height: 10 },
    { x: 2280, y: 160, width: 70, height: 10 },
  ],

  enemySpawns: [
    // Section 1: Opening Field
    { type: 'soldier', x: 300, y: 210, patrolLeft: 250, patrolRight: 450 },
    { type: 'soldier', x: 500, y: 210, patrolLeft: 450, patrolRight: 580 },
    { type: 'turret', x: 400, y: 170 },

    // Section 2: Platform Gauntlet
    { type: 'soldier', x: 700, y: 210, patrolLeft: 650, patrolRight: 850 },
    { type: 'turret', x: 800, y: 165 },
    { type: 'soldier', x: 1000, y: 210, patrolLeft: 950, patrolRight: 1100 },
    { type: 'turret', x: 1100, y: 150 },
    { type: 'soldier', x: 1200, y: 210, patrolLeft: 1150, patrolRight: 1280 },

    // Section 3: Trench Approach
    { type: 'soldier', x: 1400, y: 210, patrolLeft: 1350, patrolRight: 1480 },
    { type: 'soldier', x: 1550, y: 210, patrolLeft: 1500, patrolRight: 1650 },
    { type: 'soldier', x: 1700, y: 210, patrolLeft: 1650, patrolRight: 1780 },
    { type: 'soldier', x: 1820, y: 210, patrolLeft: 1780, patrolRight: 1890 },

    // Section 4: Boss Arena
    { type: 'boss', x: 2200, y: 200 },
  ],
};
