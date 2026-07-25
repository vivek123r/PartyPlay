import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { BossMossKnight } from './entities/BossMossKnight';
import { SoulSpell } from './entities/SoulSpell';
import { Collectible } from './entities/Collectible';
import { PlatformPhysics } from './systems/PlatformPhysics';
import { ParallaxCavern } from './systems/ParallaxCavern';
import { CavernTilemap } from './systems/CavernTilemap';
import { HeroLoungeScreen } from './screens/HeroLoungeScreen';
import { SideHUDManager } from './systems/SideHUDManager';
import type { KnightMaskType } from './types';
import { CAVERN_CONFIG } from './config';

export default class HollowClashGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private gameContainer!: Container;
  private bgGraphics!: Graphics;
  private worldContainer!: Container;
  private worldGraphics!: Graphics;

  private knights: Knight[] = [];
  private enemies: Enemy[] = [];
  private boss: BossMossKnight | null = null;
  private spells: SoulSpell[] = [];
  private collectibles: Collectible[] = [];

  private physics = new PlatformPhysics();
  private cavern = new ParallaxCavern();
  private tilemap = new CavernTilemap();
  private lounge = new HeroLoungeScreen();
  private hud = new SideHUDManager();

  private isLoungePhase = true;
  private cameraX = 0;
  private isVictory = false;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing HOLLOW CLASH: SHADOW METROIDVANIA...');

    const { stage } = this.ctx.renderer;
    this.gameContainer = new Container();
    
    this.bgGraphics = new Graphics();
    this.worldContainer = new Container();
    this.worldGraphics = new Graphics();
    
    this.gameContainer.addChild(this.bgGraphics);
    this.gameContainer.addChild(this.worldContainer);
    this.worldContainer.addChild(this.worldGraphics);
    
    this.gameContainer.addChild(this.lounge.container);
    stage.addChild(this.gameContainer);
    stage.addChild(this.hud.container); // HUD goes on top, outside camera panning

    // Global stage pointer click listener
    stage.eventMode = 'static';
    stage.cursor = 'pointer';
    stage.on('pointerdown', () => {
      if (this.isLoungePhase) {
        this.lounge.startRequested = true;
      }
    });
    
    this.handleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);
    window.addEventListener('keydown', this.handleGlobalKeyDown);


    this.state = 'Ready';
  }

  private handleGlobalKeyDown(e: KeyboardEvent): void {
    if (this.isLoungePhase && (e.key === 'Enter' || e.key === ' ')) {
      this.lounge.startRequested = true;
    }
  }

  public start(): void {
    this.state = 'Playing';
    this.ctx.logger.info('HOLLOW CLASH Started!');
  }

  private startCavernPhase(): void {
    this.isLoungePhase = false;
    this.lounge.container.visible = false;

    const count = Math.min(4, Math.max(2, this.ctx.players.length));
    const startPositions = [
      { x: 50, y: 200 },
      { x: 80, y: 200 },
      { x: 110, y: 200 },
      { x: 140, y: 200 },
    ];

    this.knights = this.ctx.players.slice(0, count).map((p, idx) => {
      const mask: KnightMaskType = this.lounge.selections[idx + 1]?.mask || 'vessel';
      const pos = startPositions[idx];
      const knight = new Knight({ id: p.id, mask, x: pos.x, y: pos.y });

      // Add knight container to world container so it moves with the camera
      this.worldContainer.addChild(knight.container);

      return knight;
    });

    // Spawn Initial Enemies across the expanded level (x=0..960)
    this.enemies.push(new Enemy('spore-1', 'spore_bug', 300, 150));
    this.enemies.push(new Enemy('mantis-1', 'mantis_crawler', 500, 200));
    this.enemies.push(new Enemy('husk-1', 'shielded_husk', 650, 210));
    this.enemies.push(new Enemy('spore-2', 'spore_bug', 720, 120));
    this.enemies.push(new Enemy('mantis-2', 'mantis_crawler', 850, 200));

    // Spawn Moss Knight Boss in expanded section (x=750..850)
    this.boss = new BossMossKnight(780, 200);
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    const count = this.ctx.players.length;

    // 1. HERO LOUNGE PHASE
    if (this.isLoungePhase) {
      this.ctx.players.slice(0, count).forEach((p, idx) => {
        const input = this.ctx.input.getPlayer(p.id);
        const navLeft = input.isJustPressed('moveLeft');
        const navRight = input.isJustPressed('moveRight');
        const toggleReady = input.isJustPressed('action') || input.isJustPressed('moveUp');

        this.lounge.updateInput(idx + 1, navLeft, navRight, toggleReady);
      });

      this.lounge.render(count);

      // Check if Enter / Space / Action / Click triggered Start
      if (this.lounge.startRequested || this.lounge.isAllReady(count)) {
        this.startCavernPhase();
        this.ctx.audio.playTone(600, 'square', 0.4);
      }
      return;
    }

    // 2. MAIN METROIDVANIA CAVERN PHASE
    this.cavern.update(dt);
    this.hud.update(dt);

    // Smooth Camera Tracking (max cameraX = 960 - 480 = 480)
    const activeKnights = this.knights.filter((k) => k.state.hp > 0);
    
    // Check if ALL players have fallen! Trigger Defeat Game Over!
    if (activeKnights.length === 0 && this.knights.length > 0) {
      this.triggerMatchOver(false);
      return;
    }

    const viewportW = 480;
    if (activeKnights.length > 0) {
      const avgX = activeKnights.reduce((acc, k) => acc + k.state.x, 0) / activeKnights.length;
      const maxCameraX = CAVERN_CONFIG.width - viewportW; // 960 - 480 = 480
      this.cameraX += (avgX - viewportW / 2 - this.cameraX) * 4.0 * dt;
      this.cameraX = Math.max(0, Math.min(maxCameraX, this.cameraX));
      
      // Apply camera panning to the world
      this.worldContainer.x = -this.cameraX;
    }

    // Update Knights
    const targets = [...this.enemies, ...(this.boss ? [this.boss] : [])];
    this.knights.forEach((knight) => {
      if (knight.state.hp <= 0) return;

      const input = this.ctx.input.getPlayer(knight.state.id);
      if (input.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }

      const inputObj = {
        left: input.isActive('moveLeft'),
        right: input.isActive('moveRight'),
        up: input.isActive('moveUp'),
        down: input.isActive('moveDown'),
        jumpJustPressed: input.isJustPressed('moveUp'),
        jumpReleased: !input.isActive('moveUp'),
        attackJustPressed: input.isJustPressed('action'),
        dashJustPressed: input.isJustPressed('skill'),
      };

      knight.update(dt, inputObj, this.tilemap.tiles, targets);

      // Focus Soul Spell
      if (input.isJustPressed('focus') && knight.state.soul >= 33) {
        knight.state.soul -= 33;
        if (knight.state.hp < knight.state.maxHp) {
          knight.state.hp += 1;
        }
        this.spells.push(new SoulSpell(`spell-${Date.now()}`, 'vengeful_spirit', knight.state.x, knight.state.y - 12, knight.state.facing === 'right'));
        this.ctx.audio.playTone(520, 'sine', 0.3);
      }
    });

    // Update Enemies & Check Enemy Contact Damage
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) {
        this.collectibles.push(new Collectible(`geo-${Date.now()}`, 'geo_coin', enemy.x, enemy.y));
        this.enemies.splice(i, 1);
        continue;
      }
      enemy.update(dt, this.knights);

      // Contact damage to player
      for (const k of activeKnights) {
        if (!k.isInvulnerable && Math.abs(k.state.x - enemy.x) < 16 && Math.abs(k.state.y - enemy.y) < 16) {
          k.takeDamage(enemy.damage);
        }
      }
    }

    // Update Boss Moss Knight
    if (this.boss) {
      if (this.boss.hp <= 0) {
        this.boss = null;
        this.triggerMatchOver(true);
        return;
      }
      const bRes = this.boss.update(dt, this.knights);
      if (bRes.triggerVineShockwave && bRes.shockwaves) {
        for (const sw of bRes.shockwaves) {
          this.spells.push(new SoulSpell(`boss-wave-${Date.now()}-${Math.random()}`, 'vengeful_spirit', sw.x, sw.y, sw.dir > 0));
        }
      }
    }

    // Update Spells & Collectibles
    for (let i = this.spells.length - 1; i >= 0; i--) {
      if (!this.spells[i].update(dt)) this.spells.splice(i, 1);
    }
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      if (!col.update(dt)) {
        this.collectibles.splice(i, 1);
        continue;
      }
      for (const k of this.knights) {
        const distSq = (k.state.x - col.x) ** 2 + (k.state.y - col.y) ** 2;
        if (distSq <= 16 ** 2) {
          if (col.type === 'geo_coin') k.state.geoCount += col.value;
          if (col.type === 'soul_orb') k.state.soul = Math.min(k.state.maxSoul, k.state.soul + col.value);
          this.ctx.audio.playTone(700, 'sine', 0.1);
          this.collectibles.splice(i, 1);
          break;
        }
      }
    }

    // Render Scene
    this.bgGraphics.clear();
    this.cavern.render(this.bgGraphics, this.cameraX);
    
    this.worldGraphics.clear();
    this.tilemap.render(this.worldGraphics);
    this.collectibles.forEach((c) => c.render(this.worldGraphics));
    this.spells.forEach((s) => s.render(this.worldGraphics));
    this.enemies.forEach((e) => e.render(this.worldGraphics));
    if (this.boss) this.boss.render(this.worldGraphics);
    
    this.knights.forEach((k) => k.render());
    this.hud.render(this.knights.map((k) => k.state), this.boss, (this.state as string) === 'Finished', this.isVictory);
  }

  private triggerMatchOver(isVictory: boolean = true): void {
    if (this.state !== 'Playing') return;

    this.state = 'Finished';
    this.isVictory = isVictory;
    this.ctx.audio.playTone(isVictory ? 660 : 220, 'sine', 0.5);

    const standings = [...this.knights]
      .sort((a, b) => b.state.geoCount - a.state.geoCount)
      .map((k) => ({ playerId: k.state.id, score: k.state.geoCount * 10 }));

    setTimeout(() => {
      this.ctx.events.emit('game:over', {
        winnerId: isVictory ? (standings[0]?.playerId ?? 1) : 1,
        isTeamLoss: !isVictory,
        standings,
      });
    }, 2000);
  }

  public pause(): void { this.state = 'Paused'; }
  public resume(): void { this.state = 'Playing'; }
  public destroy(): void {
    this.state = 'Destroyed';
    this.lounge?.destroy();
    this.hud?.destroy();
    this.bgGraphics?.destroy();
    this.worldGraphics?.destroy();
    this.worldContainer?.destroy();
    this.gameContainer?.destroy();
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
  }
}
