export type HeroClassType = 'knight' | 'wizard' | 'rogue' | 'barbarian';

export type EnemyType = 'skeleton' | 'goblin' | 'slime' | 'mini_slime' | 'minotaur_boss';

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
  specialSkillName: string;
  specialCooldown: number;
  ultimateSkillName: string;
  ultimateCooldown: number;
}

export interface AttackHitbox {
  ownerId: number;
  x: number;
  y: number;
  radius: number;
  arcAngle?: number;
  facingAngle: number;
  damage: number;
  knockbackForce: number;
  stunDuration: number;
  element?: 'physical' | 'fire' | 'frost' | 'shadow';
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
  element: 'fireball' | 'arrow' | 'dagger' | 'lava_wave';
  lifetime: number;
  color: number;
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
  color: number;
  phase?: number;
}

export interface TrapEntity {
  id: string;
  type: 'spikes' | 'fire_brazier';
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
  type: 'chest' | 'health_potion' | 'mana_gem' | 'speed_orb';
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
