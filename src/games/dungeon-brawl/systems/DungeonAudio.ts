import type { HeroClassType } from '../types';
import { publicAsset } from '@shared/assetUrl';

type ToneFallback = [number, OscillatorType, number, number];

export const DUNGEON_SOUND_FILES = {
  select: 'select',
  start: 'next-level',
  wave: 'enemy-alert',
  bossIntro: 'boss-intro',
  bossAttack: 'enemy-laser',
  bossSummon: 'summon',
  bossTeleport: 'teleport',
  bossDefeated: 'boss-defeated',
  defeat: 'gameover-dead',
  pickup: 'pickup',
  blessing: 'powerup',
  knightAttack: 'knight-sword-swing',
  wizardAttack: 'wizard-energy-attack',
  rogueAttack: 'rogue-shoot',
  barbarianAttack: 'barbarian-hard-hit',
  knightSkill: 'knight-shield-power',
  wizardSkill: 'wizard-shock',
  rogueSkill: 'rogue-teleport',
  barbarianSkill: 'barbarian-crush',
  knightUltimate: 'knight-thunder-strike',
  wizardUltimate: 'wizard-thunder-strike',
  rogueUltimate: 'rogue-continuous-shooting',
  barbarianUltimate: 'barbarian-big-boom',
} as const;

const SAMPLE_BASE = publicAsset('/assets/dungeon-brawl/audio');
const sample = (name: string) => `${SAMPLE_BASE}/${name}.wav`;

const FALLBACKS: Record<keyof typeof DUNGEON_SOUND_FILES, ToneFallback> = {
  select: [620, 'square', .08, .12], start: [570, 'square', .25, .2], wave: [240, 'square', .12, .12],
  bossIntro: [126, 'sawtooth', .34, .2], bossAttack: [280, 'sawtooth', .1, .1], bossSummon: [180, 'triangle', .16, .12], bossTeleport: [440, 'sine', .18, .12],
  bossDefeated: [820, 'triangle', .45, .25], defeat: [120, 'sawtooth', .45, .22], pickup: [650, 'sine', .1, .12], blessing: [760, 'triangle', .26, .18],
  knightAttack: [310, 'sawtooth', .06, .07], wizardAttack: [360, 'sine', .12, .08], rogueAttack: [430, 'square', .08, .08], barbarianAttack: [180, 'sawtooth', .1, .1],
  knightSkill: [440, 'sine', .18, .15], wizardSkill: [520, 'triangle', .2, .15], rogueSkill: [600, 'sine', .2, .15], barbarianSkill: [150, 'sawtooth', .22, .16],
  knightUltimate: [710, 'triangle', .32, .2], wizardUltimate: [760, 'triangle', .32, .2], rogueUltimate: [640, 'square', .28, .18], barbarianUltimate: [130, 'sawtooth', .4, .22],
};

export interface DungeonAudioOutput {
  playTone: (frequency: number, type?: OscillatorType, duration?: number, channel?: 'sfx' | 'music', volume?: number, pan?: number) => void;
  playSample?: (url: string, volume?: number, pan?: number) => void;
  preloadSamples?: (urls: readonly string[]) => void;
}

export class DungeonAudio {
  private readonly output: DungeonAudioOutput;

  public constructor(output: DungeonAudioOutput) {
    this.output = output;
    this.output.preloadSamples?.(Object.values(DUNGEON_SOUND_FILES).map(sample));
  }

  public play(id: keyof typeof DUNGEON_SOUND_FILES, volume = .65, pan = 0): void {
    const file = DUNGEON_SOUND_FILES[id];
    if (this.output.playSample) this.output.playSample(sample(file), volume, pan);
    else {
      const [frequency, type, duration, fallbackVolume] = FALLBACKS[id];
      this.output.playTone(frequency, type, duration, 'sfx', fallbackVolume, pan);
    }
  }

  public playAttack(heroClass: HeroClassType, pan = 0): void {
    const id = `${heroClass}Attack` as keyof typeof DUNGEON_SOUND_FILES;
    this.play(id, heroClass === 'knight' ? .82 : .68, pan);
    if (!this.output.playSample) return;
    const transient: Record<HeroClassType, [number, OscillatorType, number, number]> = {
      knight: [390, 'triangle', .075, .1],
      wizard: [510, 'sine', .09, .075],
      rogue: [690, 'square', .045, .055],
      barbarian: [145, 'sawtooth', .085, .1],
    };
    const [frequency, type, duration, volume] = transient[heroClass];
    this.output.playTone(frequency, type, duration, 'sfx', volume, pan);
  }

  public playSkill(heroClass: HeroClassType, pan = 0): void {
    this.play(`${heroClass}Skill` as keyof typeof DUNGEON_SOUND_FILES, .58, pan);
  }

  public playUltimate(heroClass: HeroClassType, pan = 0): void {
    this.play(`${heroClass}Ultimate` as keyof typeof DUNGEON_SOUND_FILES, .72, pan);
  }
}
