export type KnightMaskType = 'vessel' | 'hornet' | 'mantis' | 'grimm';

export type EnemyUnit = 'spore_bug' | 'mantis_crawler' | 'shielded_husk' | 'acid_spitter' | 'boss_moss_knight';

export type SoulSpell = 'vengeful_spirit' | 'abyssal_shriek' | 'desolate_dive' | 'dive_shockwave' | 'focus_heal' | 'spore_cloud';

export type CollectibleItem = 'geo_coin' | 'soul_orb' | 'mask_shard';

export type CharmType = 'quick_slash' | 'longnail' | 'spore_shroom' | 'lifeblood_heart';

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
  isWallClinging?: boolean;
  isShadowDashing: boolean;
  isCrystalDashing?: boolean;
  isChargingSuperDash?: boolean;
  isDiving?: boolean;
  facing: 'left' | 'right';
  dashCooldownTimer: number;
  geoCount: number;
  lifebloodHp?: number;
  equippedCharms?: CharmType[];
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
