import type { LevelData } from '../types';

const GROUND = 245;

export const LEVEL_1: LevelData = {
  width: 2400,
  height: 270,
  groundY: GROUND,
  skyColor: 0x1a1a2e,
  mountainColor: 0x16213e,
  groundColor: 0x4a3728,

  playerSpawns: [
    { x: 60, y: 210 },
    { x: 90, y: 210 },
  ],

  // Four visual acts the level scrolls through. Ground, platforms and prop
  // styling all key off these, so the run never looks like one long strip.
  zones: [
    { startX: 0, biome: 'field' },
    { startX: 640, biome: 'trench' },
    { startX: 1300, biome: 'base' },
    { startX: 1900, biome: 'arena' },
  ],

  environment: {
    // ── Trees: mixed species, thinning out as the terrain turns industrial ──
    trees: [
      { x: 30, groundY: GROUND, variant: 'pine', scale: 1.1 },
      { x: 80, groundY: GROUND, variant: 'broadleaf' },
      { x: 160, groundY: GROUND, variant: 'pine' },
      { x: 250, groundY: GROUND, variant: 'broadleaf', scale: 1.15 },
      { x: 350, groundY: GROUND, variant: 'pine', scale: 0.9 },
      { x: 430, groundY: GROUND, variant: 'broadleaf' },
      { x: 550, groundY: GROUND, variant: 'pine', scale: 1.2 },
      { x: 600, groundY: GROUND, variant: 'broadleaf', scale: 0.85 },
      // Trench — everything here has been shelled
      { x: 700, groundY: GROUND, variant: 'dead' },
      { x: 860, groundY: GROUND, variant: 'dead', scale: 1.2 },
      { x: 1000, groundY: GROUND, variant: 'dead', scale: 0.9 },
      { x: 1130, groundY: GROUND, variant: 'dead' },
      { x: 1240, groundY: GROUND, variant: 'dead', scale: 1.1 },
      // Base perimeter — a couple of survivors
      { x: 1370, groundY: GROUND, variant: 'dead', scale: 0.8 },
      { x: 1660, groundY: GROUND, variant: 'dead' },
      // Boss arena — scorched stumps
      { x: 1980, groundY: GROUND, variant: 'dead', scale: 1.3 },
      { x: 2320, groundY: GROUND, variant: 'dead' },
    ],

    crates: [
      { x: 220, y: GROUND },
      { x: 340, y: GROUND },
      { x: 720, y: GROUND },
      { x: 1020, y: GROUND },
      { x: 1420, y: GROUND },
      { x: 1600, y: GROUND },
      { x: 1760, y: GROUND },
      { x: 2050, y: GROUND },
      // Stacked on platforms for depth
      { x: 210, y: 195 },
      { x: 1350, y: 190 },
      { x: 2030, y: 150 },
    ],

    ammoBoxes: [
      { x: 300, y: GROUND },
      { x: 900, y: GROUND },
      { x: 1480, y: GROUND },
      { x: 1690, y: GROUND },
      { x: 2160, y: GROUND },
    ],

    barrels: [
      { x: 270, y: GROUND, variant: 'wood' },
      { x: 580, y: GROUND, variant: 'wood' },
      { x: 780, y: GROUND, variant: 'fuel' },
      { x: 1060, y: GROUND, variant: 'wood' },
      { x: 1460, y: GROUND, variant: 'fuel' },
      { x: 1476, y: GROUND, variant: 'fuel' },
      { x: 1680, y: GROUND, variant: 'fuel' },
      { x: 2100, y: GROUND, variant: 'fuel' },
    ],

    // Burn barrels get an animated flame + light on the foreground layer
    fireBarrels: [
      { x: 480, y: GROUND },
      { x: 960, y: GROUND },
      { x: 1540, y: GROUND },
      { x: 2010, y: GROUND },
      { x: 2230, y: GROUND },
    ],

    signs: [
      { x: 150, y: GROUND, variant: 'skull' },
      { x: 620, y: GROUND, variant: 'arrow' },
      { x: 1320, y: GROUND, variant: 'radiation' },
      { x: 1920, y: GROUND, variant: 'skull' },
    ],

    // ── Cover and fortifications ──
    sandbags: [
      { x: 400, y: GROUND, width: 30 },
      { x: 820, y: GROUND, width: 42 },
      { x: 1100, y: GROUND, width: 34 },
      { x: 1250, y: GROUND, width: 46 },
      { x: 1620, y: GROUND, width: 38 },
      { x: 2130, y: GROUND, width: 50 },
    ],

    bunkers: [
      { x: 1150, y: GROUND },
      { x: 1730, y: GROUND },
      { x: 2250, y: GROUND },
    ],

    wrecks: [
      { x: 880, y: GROUND },
      { x: 1840, y: GROUND },
    ],

    fences: [
      { x: 500, y: GROUND, width: 60 },
      { x: 1180, y: GROUND, width: 80 },
      { x: 1500, y: GROUND, width: 60 },
    ],

    tents: [
      { x: 320, y: GROUND },
      { x: 1040, y: GROUND },
    ],

    brokenWalls: [
      { x: 1400, y: GROUND, width: 40 },
      { x: 1960, y: GROUND, width: 56 },
      { x: 2290, y: GROUND, width: 34 },
    ],

    rubble: [
      { x: 760, y: GROUND },
      { x: 1290, y: GROUND },
      { x: 1450, y: GROUND },
      { x: 1780, y: GROUND },
      { x: 2070, y: GROUND },
      { x: 2200, y: GROUND },
    ],

    // ── Ground scarring ──
    craters: [
      { x: 660, y: GROUND, width: 30 },
      { x: 940, y: GROUND, width: 22 },
      { x: 1210, y: GROUND, width: 34 },
      { x: 1560, y: GROUND, width: 26 },
      { x: 1870, y: GROUND, width: 30 },
      { x: 2110, y: GROUND, width: 38 },
      { x: 2340, y: GROUND, width: 24 },
    ],

    puddles: [
      { x: 690, y: GROUND, width: 26 },
      { x: 830, y: GROUND, width: 18 },
      { x: 1080, y: GROUND, width: 30 },
      { x: 1230, y: GROUND, width: 20 },
    ],

    // ── Vertical set dressing ──
    lamps: [
      { x: 1340, y: GROUND },
      { x: 1580, y: GROUND },
      { x: 1820, y: GROUND },
    ],

    towers: [
      { x: 1450, y: GROUND, height: 78 },
      { x: 2180, y: GROUND, height: 62 },
    ],

    flags: [
      { x: 1660, y: GROUND },
      { x: 2270, y: GROUND },
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
    // Turrets are bolted to platform decks: y = platform.y - turret height (18)
    { type: 'turret', x: 412, y: 162 },

    // Section 2: Platform Gauntlet
    { type: 'soldier', x: 700, y: 210, patrolLeft: 650, patrolRight: 850 },
    { type: 'turret', x: 770, y: 157 },
    { type: 'soldier', x: 1000, y: 210, patrolLeft: 950, patrolRight: 1100 },
    { type: 'turret', x: 1170, y: 142 },
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
