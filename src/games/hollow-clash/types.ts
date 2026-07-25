export type KnightMaskType = 'vessel' | 'hornet' | 'mantis' | 'grimm';

export type EnemyUnit = 'spore_bug' | 'mantis_crawler' | 'shielded_husk' | 'boss_moss_knight';

export type SoulSpell = 'vengeful_spirit' | 'focus_heal';

export type CollectibleItem = 'geo_coin' | 'soul_orb' | 'mask_shard';

export interface KnightState {
  id: number;
  mask: KnightMaskType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  soul: number;
  maxSoul: number;
  isGrounded: boolean;
  isWallSliding: boolean;
  isShadowDashing: boolean;
  facing: 'left' | 'right';
  dashCooldownTimer: number;
  geoCount: number;
  lastSafeGroundPosition?: { x: number; y: number };
}

export interface PlatformTile {
  x: number;
  y: number;
  width: number;
  height: number;
  isSolid: boolean;
  type?: 'stone' | 'moss' | 'spikes';
}

export interface BossState {
  type: EnemyUnit;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: number;
  isEnraged: boolean;
}

export interface CavernLayer {
  id: string;
  parallaxFactor: number;
  color: number;
}
