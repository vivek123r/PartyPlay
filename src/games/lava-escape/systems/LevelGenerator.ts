import type { PRNG } from '@shared/utils/random';
import { LAVA_ESCAPE_CONFIG, LEVEL_THEMES } from '../config';
import type {
  EnemyData,
  HazardData,
  LavaLevel,
  PlatformData,
  SpringData,
  TrapSwitchData,
  WindZone,
} from '../types';

interface ChunkOutput {
  platforms: PlatformData[];
  hazards: HazardData[];
  springs: SpringData[];
  windZones: WindZone[];
  switches: TrapSwitchData[];
  enemies: EnemyData[];
}

type ChunkBuilder = (x: number, floorY: number, id: string) => ChunkOutput;

const CHUNK_WIDTH = 320;
const START_WIDTH = 190;

function emptyChunk(): ChunkOutput {
  return { platforms: [], hazards: [], springs: [], windZones: [], switches: [], enemies: [] };
}

function platform(
  id: string,
  kind: PlatformData['kind'],
  x: number,
  y: number,
  width: number,
  height = 14,
  extras: Partial<PlatformData> = {}
): PlatformData {
  return { id, kind, x, y, width, height, originX: x, originY: y, dx: 0, dy: 0, ...extras };
}

function hazard(
  id: string,
  kind: HazardData['kind'],
  x: number,
  y: number,
  width: number,
  height: number,
  extras: Partial<HazardData> = {}
): HazardData {
  return { id, kind, x, y, width, height, originX: x, originY: y, active: true, ...extras };
}

const basic: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor`, 'stone', x, floorY, CHUNK_WIDTH));
  out.platforms.push(platform(`${id}-step-a`, 'stone', x + 92, floorY - 32, 58, 10));
  out.platforms.push(platform(`${id}-step-b`, 'stone', x + 184, floorY - 54, 62, 10));
  out.hazards.push(hazard(`${id}-spikes`, 'spikes', x + 156, floorY - 8, 28, 8));
  return out;
};

const moving: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-left`, 'stone', x, floorY, 82));
  out.platforms.push(platform(`${id}-right`, 'stone', x + 246, floorY, 74));
  out.platforms.push(
    platform(`${id}-moving-a`, 'moving-y', x + 104, floorY - 34, 58, 10, {
      range: 42,
      speed: 1.5,
      phase: 0,
    }),
    platform(`${id}-moving-b`, 'moving-x', x + 184, floorY - 58, 54, 10, {
      range: 28,
      speed: 1.8,
      phase: 1.4,
    })
  );
  return out;
};

const springs: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor-a`, 'stone', x, floorY, 134));
  out.platforms.push(platform(`${id}-floor-b`, 'stone', x + 224, floorY, 96));
  out.platforms.push(platform(`${id}-high`, 'metal', x + 166, floorY - 82, 74, 10));
  out.springs.push({ id: `${id}-spring`, x: x + 104, y: floorY - 8, width: 24, height: 8 });
  return out;
};

const crumbling: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-edge-a`, 'stone', x, floorY, 54));
  out.platforms.push(platform(`${id}-edge-b`, 'stone', x + 274, floorY, 46));
  for (let i = 0; i < 6; i++) {
    out.platforms.push(
      platform(`${id}-crumble-${i}`, 'crumble', x + 54 + i * 37, floorY, 34, 12)
    );
  }
  return out;
};

const rocks: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor`, 'stone', x, floorY, CHUNK_WIDTH));
  out.platforms.push(platform(`${id}-shelf`, 'stone', x + 126, floorY - 48, 74, 10));
  out.hazards.push(
    hazard(`${id}-rock-a`, 'rock', x + 112, 32, 18, 18, { active: false, triggered: false }),
    hazard(`${id}-rock-b`, 'rock', x + 226, 18, 22, 22, { active: false, triggered: false })
  );
  return out;
};

const elevator: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor-a`, 'stone', x, floorY, 74));
  out.platforms.push(platform(`${id}-floor-b`, 'stone', x + 254, floorY, 66));
  out.platforms.push(
    platform(`${id}-lift`, 'moving-y', x + 118, floorY - 18, 72, 10, {
      range: 92,
      speed: 1.1,
      phase: 0,
    }),
    platform(`${id}-ledge`, 'metal', x + 210, floorY - 86, 58, 10)
  );
  return out;
};

const crushers: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor`, 'metal', x, floorY, CHUNK_WIDTH));
  out.hazards.push(
    hazard(`${id}-crusher-a`, 'crusher', x + 92, 56, 28, 76, {
      range: 88,
      speed: 1.35,
      phase: 0,
    }),
    hazard(`${id}-crusher-b`, 'crusher', x + 220, 56, 30, 76, {
      range: 88,
      speed: 1.55,
      phase: 2.2,
    })
  );
  return out;
};

const rotors: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor`, 'stone', x, floorY, CHUNK_WIDTH));
  out.platforms.push(platform(`${id}-step`, 'stone', x + 134, floorY - 52, 64, 10));
  out.hazards.push(
    hazard(`${id}-rotor`, 'rotor', x + 214, floorY - 58, 14, 14, {
      range: 34,
      speed: 2.2,
      phase: 0,
    })
  );
  return out;
};

const wind: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor-a`, 'stone', x, floorY, 102));
  out.platforms.push(platform(`${id}-middle`, 'stone', x + 130, floorY - 42, 62, 10));
  out.platforms.push(platform(`${id}-floor-b`, 'stone', x + 224, floorY, 96));
  out.windZones.push({ x: x + 82, y: 72, width: 190, height: floorY - 72, force: -52 });
  return out;
};

const wallJump: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor`, 'stone', x, floorY, CHUNK_WIDTH));
  out.platforms.push(platform(`${id}-wall-a`, 'metal', x + 104, floorY - 88, 18, 88));
  out.platforms.push(platform(`${id}-wall-b`, 'metal', x + 174, floorY - 108, 18, 108));
  out.platforms.push(platform(`${id}-top`, 'stone', x + 192, floorY - 108, 82, 10));
  out.hazards.push(hazard(`${id}-spikes`, 'spikes', x + 126, floorY - 8, 44, 8));
  return out;
};

const splitPath: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor`, 'stone', x, floorY, CHUNK_WIDTH));
  out.platforms.push(
    platform(`${id}-upper-a`, 'metal', x + 62, floorY - 44, 78, 10),
    platform(`${id}-upper-b`, 'moving-x', x + 168, floorY - 62, 70, 10, {
      range: 24,
      speed: 1.7,
      phase: 0.4,
    }),
    platform(`${id}-upper-c`, 'metal', x + 258, floorY - 44, 52, 10)
  );
  out.hazards.push(
    hazard(`${id}-fire-a`, 'fire', x + 120, floorY - 18, 18, 18, { speed: 2, phase: 0 }),
    hazard(`${id}-fire-b`, 'fire', x + 224, floorY - 18, 18, 18, { speed: 2, phase: 1.5 })
  );
  return out;
};

const enemies: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  out.platforms.push(platform(`${id}-floor`, 'stone', x, floorY, CHUNK_WIDTH));
  out.platforms.push(platform(`${id}-shelf`, 'stone', x + 170, floorY - 56, 96, 10));
  out.enemies.push({
    id: `${id}-crawler`,
    x: x + 90,
    y: floorY - 14,
    width: 18,
    height: 14,
    originX: x + 90,
    range: 86,
    speed: 42,
    direction: 1,
  });
  return out;
};

const switchback: ChunkBuilder = (x, floorY, id) => {
  const out = emptyChunk();
  const rockId = `${id}-trap-rock`;
  out.platforms.push(platform(`${id}-floor`, 'metal', x, floorY, CHUNK_WIDTH));
  out.platforms.push(platform(`${id}-shelf`, 'metal', x + 190, floorY - 54, 72, 10));
  out.hazards.push(
    hazard(rockId, 'rock', x + 248, 24, 26, 26, { active: false, triggered: false })
  );
  out.switches.push({
    id: `${id}-switch`,
    targetHazardId: rockId,
    x: x + 74,
    y: floorY - 6,
    width: 24,
    height: 6,
    triggered: false,
  });
  return out;
};

const CHUNKS: Record<string, ChunkBuilder> = {
  basic,
  moving,
  springs,
  crumbling,
  rocks,
  elevator,
  crushers,
  rotors,
  wind,
  wallJump,
  splitPath,
  enemies,
  switchback,
};

const STAGE_POOLS = [
  ['basic', 'moving', 'springs'],
  ['basic', 'moving', 'springs', 'crumbling', 'rocks', 'elevator'],
  ['moving', 'crumbling', 'rocks', 'elevator', 'crushers', 'rotors', 'wind'],
  ['crumbling', 'elevator', 'crushers', 'rotors', 'wind', 'wallJump', 'splitPath', 'enemies', 'switchback'],
  ['moving', 'crumbling', 'rocks', 'crushers', 'rotors', 'wind', 'wallJump', 'splitPath', 'enemies', 'switchback'],
] as const;

// Level 3 is the flagship showcase: its major moments are authored in a
// readable order, while the other stages remain seed-randomized.
const FORGE_BLUEPRINT = [
  'moving', 'crushers', 'elevator', 'rotors', 'switchback', 'crumbling',
  'crushers', 'rocks', 'wind', 'moving', 'rotors',
] as const;

function addOutput(level: LavaLevel, output: ChunkOutput): void {
  level.platforms.push(...output.platforms);
  level.hazards.push(...output.hazards);
  level.springs.push(...output.springs);
  level.windZones.push(...output.windZones);
  level.switches.push(...output.switches);
  level.enemies.push(...output.enemies);
}

function choose<T>(items: readonly T[], random: PRNG): T {
  return items[Math.floor(random() * items.length)]!;
}

export function validateLevel(level: LavaLevel): boolean {
  if (!Number.isFinite(level.width) || level.safeX <= 0 || level.safeX >= level.width) return false;
  if (level.platforms.length < 4) return false;
  const startSupported = level.platforms.some((p) => p.x <= 32 && p.x + p.width >= 90);
  const finishSupported = level.platforms.some(
    (p) => p.y >= level.floorY - 4 && p.x <= level.safeX && p.x + p.width >= level.safeX
  );
  return startSupported && finishSupported && level.chunkIds.length >= 6;
}

export function generateLevel(stageIndex: number, random: PRNG): LavaLevel {
  const safeStage = Math.max(0, Math.min(LEVEL_THEMES.length - 1, stageIndex));
  const theme = LEVEL_THEMES[safeStage]!;
  const finishStart = START_WIDTH + theme.chunks * CHUNK_WIDTH;
  const safeX = finishStart + 198;
  const width = finishStart + 360;

  const level: LavaLevel = {
    index: safeStage,
    name: theme.name,
    subtitle: theme.subtitle,
    width,
    height: LAVA_ESCAPE_CONFIG.HEIGHT,
    floorY: LAVA_ESCAPE_CONFIG.FLOOR_Y,
    safeX,
    lavaSpeed: theme.lavaSpeed * (0.94 + random() * 0.12),
    backgroundAsset: 'backgroundAsset' in theme ? theme.backgroundAsset : undefined,
    palette: { ...theme.palette },
    platforms: [
      platform('start-floor', 'stone', 0, LAVA_ESCAPE_CONFIG.FLOOR_Y, START_WIDTH + 20),
      platform('finish-floor', 'metal', finishStart, LAVA_ESCAPE_CONFIG.FLOOR_Y, 360),
    ],
    hazards: [],
    springs: [],
    windZones: [],
    switches: [],
    enemies: [],
    chunkIds: [],
  };

  const pool: readonly string[] = STAGE_POOLS[safeStage]!;
  let previous = '';
  for (let i = 0; i < theme.chunks; i++) {
    let chunkName = safeStage === 2 ? FORGE_BLUEPRINT[i]! : choose(pool, random);
    if (chunkName === previous && pool.length > 1) {
      chunkName = pool[(pool.indexOf(chunkName) + 1 + Math.floor(random() * (pool.length - 1))) % pool.length]!;
    }
    previous = chunkName;
    const chunkX = START_WIDTH + i * CHUNK_WIDTH;
    const id = `s${safeStage}-c${i}-${chunkName}`;
    level.chunkIds.push(chunkName);
    addOutput(level, CHUNKS[chunkName]!(chunkX, level.floorY, id));
  }

  if (!validateLevel(level)) {
    throw new Error(`Generated invalid Lava Escape level ${safeStage + 1}`);
  }
  return level;
}
