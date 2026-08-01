export type WeaponType =
  | 'burst_rifle'
  | 'dual_smg'
  | 'heavy_cannon'
  | 'grenade_launcher'
  | 'plasma_beam'
  | 'spread_shotgun';

export type AimDirection =
  | 'straight'
  | 'up'
  | 'down'
  | 'diagonal_up'
  | 'diagonal_down';

export type PowerUpType = 'spread' | 'laser' | 'machinegun' | 'shield';

export interface Character {
  id: string;
  name: string;
  color: string;
  description: string;
  weaponType: WeaponType;
  weaponName: string;
  fireRate: number;
  moveSpeedMultiplier: number;
  bulletSpeedMultiplier: number;
  damageMultiplier: number;
  specialInfo: string;
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
  aimDirection: AimDirection;
  isCrouching: boolean;
  weaponType: WeaponType;
  activePowerUp?: PowerUpType;
  powerUpTimer: number;
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
  weaponType?: WeaponType;
  isExplosive?: boolean;
  explosionRadius?: number;
  isPiercing?: boolean;
  gravityEffect?: number;
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
  type?: 'spark' | 'smoke' | 'shell' | 'dust';
  rotation?: number;
  vRot?: number;
  alive: boolean;
}

export interface PowerUp {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
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
  environment: EnvironmentObjects;
  skyColor: number;
  mountainColor: number;
  groundColor: number;
}

export interface EnvironmentObjects {
  trees: Array<{ x: number; groundY: number }>;
  crates: Array<{ x: number; y: number }>;
  barrels: Array<{ x: number; y: number }>;
  signs: Array<{ x: number; y: number }>;
}
