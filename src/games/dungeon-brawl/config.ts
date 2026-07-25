import type { Blessing, HeroClassConfig, HeroClassType, RoomDescriptor } from './types';

export const HERO_CONFIGS: Record<HeroClassType, HeroClassConfig> = {
  knight: { type: 'knight', name: 'VALEROS', role: 'VANGUARD', maxHp: 170, maxMana: 100, moveSpeed: 142, attackPower: 23, armor: 16, primaryColor: 0x5db7e8, secondaryColor: 0xf2c14e, attackRange: 47, specialSkillName: 'SHIELD WALL', specialDescription: 'TAUNT + BLOCK', specialManaCost: 28, specialCooldown: 5, ultimateSkillName: 'WHIRLING BLADE', ultimateDescription: 'ARMORED STORM', ultimateCooldown: 0 },
  wizard: { type: 'wizard', name: 'IGNIS', role: 'ARCANIST', maxHp: 105, maxMana: 155, moveSpeed: 132, attackPower: 24, armor: 5, primaryColor: 0xb779f5, secondaryColor: 0x6ff7ff, attackRange: 148, specialSkillName: 'FROST NOVA', specialDescription: 'FREEZE THE PACK', specialManaCost: 38, specialCooldown: 6, ultimateSkillName: 'METEOR STORM', ultimateDescription: 'RAZE A CLUSTER', ultimateCooldown: 0 },
  rogue: { type: 'rogue', name: 'NYX', role: 'SKIRMISHER', maxHp: 122, maxMana: 118, moveSpeed: 178, attackPower: 21, armor: 8, primaryColor: 0x4ee89b, secondaryColor: 0x293449, attackRange: 64, specialSkillName: 'SHADOW DASH', specialDescription: 'PHASE + MARK', specialManaCost: 30, specialCooldown: 4.5, ultimateSkillName: 'CROSSBOW RAIN', ultimateDescription: 'HUNT THE WEAK', ultimateCooldown: 0 },
  barbarian: { type: 'barbarian', name: 'GROK', role: 'BREAKER', maxHp: 155, maxMana: 92, moveSpeed: 151, attackPower: 34, armor: 10, primaryColor: 0xf08a45, secondaryColor: 0xe05263, attackRange: 58, specialSkillName: 'GROUND SLAM', specialDescription: 'STUN + LAUNCH', specialManaCost: 34, specialCooldown: 5.5, ultimateSkillName: 'BERSERKER RAGE', ultimateDescription: 'RAGE UNLEASHED', ultimateCooldown: 0 },
};

export const ARENA_CONFIG = { width: 480, height: 270, boundsPadding: 24, tileSize: 8 };

export const ROOMS: RoomDescriptor[] = [
  { id: 'chains', title: 'HALL OF CHAINS', subtitle: 'BREAK THE FIRST SEAL', theme: 'chains', waves: [['skeleton', 'skeleton', 'slime'], ['goblin', 'skeleton', 'slime']], hasBlessingAfter: false },
  { id: 'crypt', title: 'SHATTERED CRYPT', subtitle: 'THE DEAD REMEMBER', theme: 'crypt', waves: [['skeleton', 'goblin', 'slime', 'slime'], ['wraith', 'goblin', 'skeleton']], hasBlessingAfter: true },
  { id: 'ember', title: 'EMBER VAULT', subtitle: 'DO NOT FEAR THE FLAME', theme: 'ember', waves: [['imp', 'imp', 'slime', 'goblin'], ['brute', 'imp', 'wraith', 'skeleton']], hasBlessingAfter: false },
  { id: 'court', title: 'BLOOD COURT', subtitle: 'ONLY THE BOLD REMAIN', theme: 'court', waves: [['brute', 'wraith', 'goblin', 'imp'], ['brute', 'brute', 'wraith', 'slime']], hasBlessingAfter: true },
  { id: 'throne', title: 'HORNED THRONE', subtitle: 'THE MINOTAUR AWAITS', theme: 'throne', waves: [], hasBlessingAfter: false },
];

export const BLESSINGS: Blessing[] = [
  { id: 'blood', name: 'BLOOD CHALICE', description: 'KILLS HEAL THE PARTY', color: 0xe05263 },
  { id: 'storm', name: 'STORM SIGIL', description: 'FINISHERS CHAIN LIGHTNING', color: 0x6ff7ff },
  { id: 'iron', name: 'IRON OATH', description: 'REVIVES GRANT A SHIELD', color: 0xf2c14e },
  { id: 'ember', name: 'EMBER CROWN', description: 'SKILLS LEAVE BURNING GROUND', color: 0xff884a },
  { id: 'chrono', name: 'CHRONO FANG', description: 'SKILLS COOLDOWN FASTER', color: 0xb779f5 },
  { id: 'fortune', name: 'FORTUNE DICE', description: 'MORE SOUL ORBS DROP', color: 0x7de38a },
];
