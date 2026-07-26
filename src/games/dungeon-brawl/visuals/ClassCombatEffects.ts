import type { AttackEvent, HeroClassType } from '../types';
import type { Hero } from '../entities/Hero';
import type { DungeonClipKey } from './DungeonAssetLibrary';
import type { DungeonSceneView } from './DungeonSceneView';

export type ClassEffectStage = 'basic' | 'impact' | 'special' | 'ultimate';
type EffectClipKey = Extract<DungeonClipKey, `fx.${string}`>;

export const CLASS_EFFECT_SIGNATURES: Record<HeroClassType, Record<ClassEffectStage, EffectClipKey>> = {
  knight: {
    basic: 'fx.slash-horizontal',
    impact: 'fx.hit-knight',
    special: 'fx.energy-shield',
    ultimate: 'fx.slash-circular',
  },
  wizard: {
    basic: 'fx.magic-charged',
    impact: 'fx.hit-wizard',
    special: 'fx.frost-splash',
    ultimate: 'fx.arcane-runes',
  },
  rogue: {
    basic: 'fx.magic-spark',
    impact: 'fx.hit-rogue',
    special: 'fx.shadow-cross',
    ultimate: 'fx.magic-waveform',
  },
  barbarian: {
    basic: 'fx.slash-upward',
    impact: 'fx.hit-barbarian',
    special: 'fx.ground-impact',
    ultimate: 'fx.rage-explosion',
  },
};

export class ClassCombatEffects {
  private readonly scene: DungeonSceneView;

  public constructor(scene: DungeonSceneView) {
    this.scene = scene;
  }

  public playBasic(hero: Hero, attack: AttackEvent): void {
    const forward = hero.classType === 'wizard' ? 8 : 18;
    const x = hero.x + Math.cos(attack.angle) * forward;
    const y = hero.y - 7 + Math.sin(attack.angle) * forward;
    const clip = CLASS_EFFECT_SIGNATURES[hero.classType].basic;
    if (hero.classType === 'knight') {
      this.scene.playEffect(clip, x, y, {
        rotation: attack.angle,
        tint: attack.comboStep === 2 ? 0xffe49a : 0xd9efff,
        scale: attack.comboStep === 2 ? 1.25 : 0.88,
      });
      if (attack.comboStep === 2) {
        this.scene.playEffect('fx.slash-circular', x, y, {
          rotation: attack.angle,
          tint: 0xffd36b,
          scale: 1.15,
          delay: 0.06,
        });
      }
    } else if (hero.classType === 'wizard') {
      this.scene.playEffect(clip, x, y, {
        rotation: attack.angle,
        scale: attack.comboStep === 2 ? 0.78 : 0.56,
      });
      if (attack.comboStep === 2) {
        this.scene.playEffect('fx.magic-pulse', x, y, {
          rotation: attack.angle,
          scale: 0.82,
          delay: 0.05,
        });
      }
    } else if (hero.classType === 'rogue') {
      this.scene.playEffect(clip, x, y, {
        rotation: attack.angle,
        tint: 0xb8ffd0,
        scale: attack.comboStep === 2 ? 0.9 : 0.62,
      });
      if (attack.comboStep === 2) {
        this.scene.playEffect('fx.shadow-cross', x, y, {
          rotation: attack.angle,
          tint: 0xb8ffd0,
          scale: 0.72,
          delay: 0.04,
        });
      }
    } else {
      this.scene.playEffect(clip, x, y, {
        rotation: attack.angle + Math.PI / 2,
        tint: attack.comboStep === 2 ? 0xffc05a : 0xff8b52,
        scale: attack.comboStep === 2 ? 1.45 : 1.05,
      });
      if (attack.comboStep === 2) {
        this.scene.playEffect('fx.hit-barbarian', x, y, {
          tint: 0xffa05a,
          scale: 1.65,
          delay: 0.05,
        });
      }
    }
  }

  public playImpact(classType: HeroClassType, comboStep: number, x: number, y: number, angle = 0): void {
    const tints: Record<HeroClassType, number> = {
      knight: 0xffe4a0,
      wizard: 0xb6f5ff,
      rogue: 0x9dffb8,
      barbarian: 0xff9355,
    };
    this.scene.playEffect(CLASS_EFFECT_SIGNATURES[classType].impact, x, y - 8, {
      rotation: angle,
      tint: tints[classType],
      scale: comboStep === 2 ? 1.35 : 0.92,
    });
    if (classType === 'wizard' && comboStep === 2) {
      this.scene.playEffect('fx.energy-smack', x, y - 8, {
        tint: 0xb6f5ff,
        scale: 0.5,
        delay: 0.04,
      });
    }
  }

  public playSpecial(hero: Hero, angle: number, origin?: { x: number; y: number }): void {
    if (hero.classType === 'knight') {
      this.scene.playEffect('fx.energy-shield', hero.x, hero.y - 7, { scale: 1.35 });
      this.scene.playEffect('fx.hit-knight', hero.x, hero.y - 6, {
        tint: 0xffe49a,
        scale: 2,
        delay: 0.12,
      });
      return;
    }
    if (hero.classType === 'wizard') {
      this.scene.playEffect('fx.arcane-runes', hero.x, hero.y - 4, { scale: 0.7 });
      this.scene.playEffect('fx.frost-splash', hero.x, hero.y + 5, { scale: 0.72, delay: 0.08 });
      this.scene.playEffect('fx.electro-shock', hero.x, hero.y - 5, {
        tint: 0xb8f5ff,
        scale: 0.82,
        delay: 0.16,
      });
      return;
    }
    if (hero.classType === 'rogue') {
      const start = origin ?? { x: hero.x, y: hero.y };
      const distance = Math.hypot(hero.x - start.x, hero.y - start.y);
      this.scene.playEffect('fx.shadow-dust', start.x, start.y + 4, {
        tint: 0x75dc9a,
        scale: 0.82,
      });
      this.scene.playEffect('fx.magic-waveform', (start.x + hero.x) / 2, (start.y + hero.y) / 2 - 5, {
        rotation: angle,
        tint: 0xa1ffc0,
        scaleX: Math.max(0.7, distance / 82),
        scaleY: 0.8,
      });
      this.scene.playEffect('fx.shadow-cross', hero.x, hero.y - 6, {
        rotation: angle,
        tint: 0xb1ffca,
        scale: 1.25,
        delay: 0.08,
      });
      return;
    }
    this.scene.playEffect('fx.ground-impact', hero.x, hero.y + 2, { scale: 0.92 });
    this.scene.playEffect('fx.hit-barbarian', hero.x, hero.y - 6, {
      tint: 0xff9b55,
      scale: 2.1,
      delay: 0.1,
    });
  }

  public playUltimate(hero: Hero, targetX: number, targetY: number): void {
    if (hero.classType === 'knight') {
      for (let index = 0; index < 3; index++) {
        this.scene.playEffect('fx.slash-circular', hero.x, hero.y - 6, {
          rotation: index * Math.PI * 2 / 3,
          tint: index === 1 ? 0xffffff : 0xffd36b,
          scale: 1.55 + index * 0.2,
          delay: index * 0.09,
        });
      }
      return;
    }
    if (hero.classType === 'wizard') {
      this.scene.playEffect('fx.arcane-runes', targetX, targetY, { scale: 1.2 });
      this.scene.playEffect('fx.magic-charged', targetX, targetY - 5, {
        scale: 1.35,
        rotationSpeed: 2.4,
        delay: 0.08,
      });
      this.scene.playEffect('fx.frost-splash', targetX, targetY + 4, {
        scale: 0.9,
        delay: 0.2,
      });
      return;
    }
    if (hero.classType === 'rogue') {
      for (let index = 0; index < 4; index++) {
        this.scene.playEffect('fx.magic-waveform', targetX, targetY - 4, {
          rotation: index * Math.PI / 2,
          tint: 0xa1ffc0,
          scale: 0.78 + index * 0.08,
          delay: index * 0.07,
        });
      }
      this.scene.playEffect('fx.shadow-cross', targetX, targetY - 5, {
        tint: 0xc0ffd0,
        scale: 1.8,
        delay: 0.18,
      });
      return;
    }
    this.scene.playEffect('fx.rage-explosion', hero.x, hero.y - 8, { scale: 1.05 });
    this.scene.playEffect('fx.fire-large', hero.x, hero.y + 1, {
      tint: 0xff7950,
      scale: 1.1,
      duration: 1.15,
      fadeOut: true,
      delay: 0.12,
    });
    this.scene.playEffect('fx.ground-impact', hero.x, hero.y + 2, {
      scale: 1.05,
      delay: 0.18,
    });
  }
}
