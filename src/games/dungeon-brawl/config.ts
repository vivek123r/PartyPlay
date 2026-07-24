import type { HeroClassConfig, HeroClassType } from './types';

export const HERO_CONFIGS: Record<HeroClassType, HeroClassConfig> = {
  knight: {
    type: 'knight',
    name: 'Valeros',
    role: 'Tank / Frontline',
    maxHp: 150,
    maxMana: 100,
    moveSpeed: 140,
    attackPower: 25,
    armor: 15,
    primaryColor: 0x3498db, // Steel Blue
    secondaryColor: 0xe74c3c, // Red Cape
    specialSkillName: 'Shield Wall',
    specialCooldown: 5.0,
    ultimateSkillName: 'Whirling Blade',
    ultimateCooldown: 12.0,
  },
  wizard: {
    type: 'wizard',
    name: 'Ignis',
    role: 'Crowd Control / AOE',
    maxHp: 90,
    maxMana: 160,
    moveSpeed: 130,
    attackPower: 30,
    armor: 5,
    primaryColor: 0x9b59b6, // Arcane Purple
    secondaryColor: 0xf1c40f, // Gold Trim
    specialSkillName: 'Frost Nova',
    specialCooldown: 6.0,
    ultimateSkillName: 'Meteor Storm',
    ultimateCooldown: 14.0,
  },
  rogue: {
    type: 'rogue',
    name: 'Shadow',
    role: 'Mobile DPS',
    maxHp: 105,
    maxMana: 120,
    moveSpeed: 175,
    attackPower: 22,
    armor: 8,
    primaryColor: 0x2ecc71, // Venom Green
    secondaryColor: 0x34495e, // Dark Leather
    specialSkillName: 'Shadow Dash',
    specialCooldown: 4.5,
    ultimateSkillName: 'Crossbow Rain',
    ultimateCooldown: 11.0,
  },
  barbarian: {
    type: 'barbarian',
    name: 'Grok',
    role: 'Heavy Burst',
    maxHp: 140,
    maxMana: 90,
    moveSpeed: 150,
    attackPower: 40,
    armor: 10,
    primaryColor: 0xe67e22, // Bronze Orange
    secondaryColor: 0xc0392b, // Blood Red
    specialSkillName: 'Ground Slam',
    specialCooldown: 5.5,
    ultimateSkillName: 'Berserker Rage',
    ultimateCooldown: 13.0,
  },
};

export const ARENA_CONFIG = {
  width: 480,
  height: 270,
  boundsPadding: 24,
  tileSize: 16,
};
