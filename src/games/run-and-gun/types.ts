export interface Character {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface PlayerSelection {
  characterId: string;
  color: string;
}

export interface DifficultyConfig {
  label: string;
  enemyCountMultiplier: number;
  enemyHealthMultiplier: number;
  bossHealthMultiplier: number;
  description: string[];
}

export type MenuScreen =
  | 'title'
  | 'character-select'
  | 'player-setup'
  | 'controls'
  | 'settings';

export type GameMode = '1-player' | '2-players';

// ── Gameplay Types ────────────────────────────────────────────

export interface PlayerState {
  playerId: number;
  color: string;
  characterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  lives: number;
  isOnGround: boolean;
  isShooting: boolean;
  shootCooldown: number;
  facingRight: boolean;
  isDead: boolean;
  deathTimer: number;
  invincibleTimer: number;
  animFrame: number;
  animTimer: number;
  score: number;
}

export type EnemyType = 'soldier' | 'turret' | 'boss';

export interface EnemyState {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isOnGround: boolean;
  facingRight: boolean;
  shootTimer: number;
  shootCooldown: number;
  patrolLeft?: number;
  patrolRight?: number;
  isDead: boolean;
  deathTimer: number;
  behaviorTimer: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  fromPlayer: boolean;
  playerId?: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  alive: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EnemySpawn {
  type: EnemyType;
  x: number;
  y: number;
  patrolLeft?: number;
  patrolRight?: number;
}

export interface LevelData {
  width: number;
  height: number;
  groundY: number;
  platforms: Platform[];
  enemySpawns: EnemySpawn[];
  playerSpawns: Array<{ x: number; y: number }>;
  skyColor: number;
  mountainColor: number;
  groundColor: number;
}
