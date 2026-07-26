import { Container, Sprite, Texture } from 'pixi.js';
import type { RunPhase } from '../types';
import type { Hero } from '../entities/Hero';
import type { DungeonAssetLibrary } from './DungeonAssetLibrary';

export class DungeonHudArtView {
  public readonly container = new Container();

  private readonly library: DungeonAssetLibrary;
  private readonly playerPlates: Sprite[] = [];
  private readonly blessingCards: Sprite[] = [];
  private readonly bossBar: Sprite;
  private readonly introPaper: Sprite;

  public constructor(library: DungeonAssetLibrary) {
    this.library = library;
    this.bossBar = this.makeSprite('bigBarBase');
    this.introPaper = this.makeSprite('paper');
    this.container.addChild(this.bossBar, this.introPaper);
    for (let index = 0; index < 4; index++) {
      const plate = this.makeSprite('paper');
      this.playerPlates.push(plate);
      this.container.addChild(plate);
    }
    for (let index = 0; index < 3; index++) {
      const card = this.makeSprite('paper');
      this.blessingCards.push(card);
      this.container.addChild(card);
    }
  }

  public update(heroes: Hero[], phase: RunPhase, hasBoss: boolean): void {
    const plateW = Math.floor((480 - 10) / Math.max(heroes.length, 1));
    this.playerPlates.forEach((plate, index) => {
      const hero = heroes[index];
      plate.visible = Boolean(hero);
      if (!hero) return;
      plate.position.set(4 + index * plateW + (plateW - 4) / 2, 252.5);
      plate.width = plateW - 4;
      plate.height = 27;
      plate.tint = hero.config.primaryColor;
      plate.alpha = 0.42;
    });

    this.bossBar.visible = hasBoss && phase === 'combat';
    this.bossBar.position.set(240, 28);
    this.bossBar.width = 218;
    this.bossBar.height = 34;
    this.bossBar.alpha = 0.8;

    this.introPaper.visible = phase === 'room-intro';
    this.introPaper.position.set(240, 128);
    this.introPaper.width = 364;
    this.introPaper.height = 72;
    this.introPaper.alpha = 0.7;

    this.blessingCards.forEach((card, index) => {
      card.visible = phase === 'blessing';
      card.position.set(95 + index * 145, 126);
      card.width = 132;
      card.height = 106;
      card.alpha = 0.58;
    });
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }

  private makeSprite(key: 'bigBarBase' | 'paper'): Sprite {
    return new Sprite({
      texture: this.library.getTexture(key) ?? Texture.EMPTY,
      anchor: { x: 0.5, y: 0.5 },
      roundPixels: true,
    });
  }
}
