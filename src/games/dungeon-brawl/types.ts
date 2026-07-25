export type HeroClassType = 'knight' | 'wizard' | 'rogue' | 'barbarian';

export type EnemyType = 'skeleton' | 'goblin' | 'slime' | 'mini_slime' | 'imp' | 'wraith' | 'brute' | 'minotaur_boss';
export type ElementType = 'physical' | 'arcane' | 'frost' | 'shadow' | 'fire' | 'earth';
export type RunPhase = 'select' | 'room-intro' | 'combat' | 'blessing' | 'victory' | 'defeat';
export type RoomTheme = 'chains' | 'crypt' | 'ember' | 'court' | 'throne';

export interface HeroClassConfig {
  type: HeroClassType;
  name: string;
  role: string;
  maxHp: number;
  maxMana: number;
  moveSpeed: number;
  attackPower: number;
  armor: number;
  primaryColor: number;
  secondaryColor: number;
  attackRange: number;
  specialSkillName: string;
  specialDescription: string;
  specialManaCost: number;
  specialCooldown: number;
  ultimateSkillName: string;
  ultimateDescription: string;
  ultimateCooldown: number;
}

export interface AttackEvent {
  id: number;
  heroId: number;
  comboStep: number;
  x: number;
  y: number;
  angle: number;
  range: number;
  radius: number;
  damage: number;
  element: ElementType;
  targetId?: string;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  color: number;
  lifetime: number;
  vy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface EnemyState {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  moveSpeed: number;
  damage: number;
  attackCooldown: number;
  isStunned: boolean;
  stunTimer: number;
  isFrozen: boolean;
  freezeTimer: number;
  isExposed: boolean;
  exposedTimer: number;
  color: number;
}

export interface ProjectileEntity {
  id: string;
  ownerId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  element: 'arcane_bolt' | 'arrow' | 'shadow_blade' | 'fire_orb' | 'meteor' | 'lava_wave';
  lifetime: number;
  color: number;
  homing?: boolean;
  splashRadius?: number;
}

export interface TrapEntity {
  id: string;
  type: 'spikes' | 'fire_brazier' | 'fire_vent';
  x: number;
  y: number;
  w: number;
  h: number;
  isActive: boolean;
  timer: number;
  damage: number;
}

export interface LootItem {
  id: string;
  type: 'health_potion' | 'mana_gem' | 'soul_orb';
  x: number;
  y: number;
  value: number;
  lifetime: number;
}

export interface SynergyComboEffect {
  name: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  color: number;
}

export interface RoomDescriptor {
  id: string;
  title: string;
  subtitle: string;
  theme: RoomTheme;
  waves: EnemyType[][];
  hasBlessingAfter: boolean;
}

export interface Blessing {
  id: 'blood' | 'storm' | 'iron' | 'ember' | 'chrono' | 'fortune';
  name: string;
  description: string;
  color: number;
}
