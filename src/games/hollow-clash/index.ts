import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { AcidSpitter } from './entities/AcidSpitter';
import { Vengefly } from './entities/Vengefly';
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

interface BreakableWall {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  crumbling: boolean;
  crumbleTimer: number;
}

export default class HollowClashGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private gameContainer!: Container;
  private bgGraphics!: Graphics;
  private worldContainer!: Container;
  private worldGraphics!: Graphics;

  private knights: Knight[] = [];
  private enemies: Enemy[] = [];
  private acidSpitters: AcidSpitter[] = [];
  private vengefies: Vengefly[] = [];
  private boss: BossMossKnight | null = null;
  private spells: SoulSpell[] = [];
  private collectibles: Collectible[] = [];
  private breakableWalls: BreakableWall[] = [];

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
      const charm = this.lounge.selections[idx + 1]?.charm || 'quick_slash';
      const pos = startPositions[idx];
      const knight = new Knight({ id: p.id, mask, x: pos.x, y: pos.y });

      // Equip the charm chosen in the lounge
      knight.equipCharm(charm);

      // Add knight container to world container so it moves with the camera
      this.worldContainer.addChild(knight.container);

      return knight;
    });

    // Spawn varied grotesque enemies across the 960px level
    this.enemies.push(new Enemy('spore-1', 'spore_bug', 280, 140));
    this.enemies.push(new Enemy('mantis-1', 'mantis_crawler', 460, 195));
    this.enemies.push(new Enemy('husk-1', 'shielded_husk', 600, 210));
    this.enemies.push(new Enemy('spore-2', 'spore_bug', 700, 120));
    this.enemies.push(new Enemy('mantis-2', 'mantis_crawler', 820, 200));

    // Acid Spitters — perched on ledges, ranged hazard
    this.acidSpitters.push(new AcidSpitter('acid-1', 380, 175));
    this.acidSpitters.push(new AcidSpitter('acid-2', 740, 155));

    // Vengefies — dive-bombers near ceiling
    this.vengefies.push(new Vengefly('venge-1', 200, 50));
    this.vengefies.push(new Vengefly('venge-2', 550, 40));
    this.vengefies.push(new Vengefly('venge-3', 850, 48));

    // Spawn Moss Knight Boss in expanded section
    this.boss = new BossMossKnight(800, 200);

    // Breakable walls
    this.breakableWalls = [
      { x: 330, y: 120, width: 16, height: 60, hp: 3, maxHp: 3, crumbling: false, crumbleTimer: 0 },
      { x: 880, y: 145, width: 16, height: 75, hp: 3, maxHp: 3, crumbling: false, crumbleTimer: 0 },
    ];

    // Place mask shard pickups in secret alcoves
    this.collectibles.push(new Collectible('shard-left',  'mask_shard', 64,  56));
    this.collectibles.push(new Collectible('shard-right', 'mask_shard', 907, 64));
    this.collectibles.push(new Collectible('shard-mid',   'mask_shard', 474, 92));
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    const count = this.ctx.players.length;

    // 1. HERO LOUNGE PHASE
    if (this.isLoungePhase) {
      this.ctx.players.slice(0, count).forEach((p, idx) => {
        const input = this.ctx.input.getPlayer(p.id);
        const navLeft  = input.isJustPressed('moveLeft');
        const navRight = input.isJustPressed('moveRight');
        const navUp    = input.isJustPressed('moveUp');
        const navDown  = input.isJustPressed('moveDown');
        const toggleReady = input.isJustPressed('action') || input.isJustPressed('skill');

        this.lounge.updateInput(idx + 1, navLeft, navRight, toggleReady, navUp, navDown);
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
    const targets: any[] = [...this.enemies, ...this.acidSpitters, ...this.vengefies, ...(this.boss ? [this.boss] : [])];
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
        skillActive: input.isActive('skill'),
        focusJustPressed: input.isJustPressed('focus'),
        focusActive: input.isActive('focus'),
        castJustPressed: input.isJustPressed('focus'),
      };

      knight.update(dt, inputObj, this.tilemap.tiles, targets);

      // Propagate knight active spells to hit world enemies & boss
      for (const spell of knight.activeSpells) {
        spell.checkHitEnemies(targets);
      }

      // Check knight spell hits against breakable walls
      for (const spell of knight.activeSpells) {
        if (spell.damage <= 0) continue;
        for (const wall of this.breakableWalls) {
          if (wall.hp <= 0) continue;
          const sLeft = spell.x, sRight = spell.x + spell.width;
          const sTop = spell.y, sBottom = spell.y + spell.height;
          const wRight = wall.x + wall.width, wBottom = wall.y + wall.height;
          if (sLeft < wRight && sRight > wall.x && sTop < wBottom && sBottom > wall.y) {
            wall.hp--;
            wall.crumbling = true;
            if (wall.hp <= 0) {
              // Drop a mask shard from a broken secret wall
              this.collectibles.push(new Collectible(`shard-${Date.now()}`, 'mask_shard', wall.x + 8, wall.y));
            }
          }
        }
      }
    });

    // Update Enemies & Check Enemy Contact Damage
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) {
        this.collectibles.push(new Collectible(`geo-${Date.now()}`, 'geo_coin', enemy.x, enemy.y));
        // Also drop soul orb occasionally
        if (Math.random() < 0.5) {
          this.collectibles.push(new Collectible(`soul-${Date.now()}`, 'soul_orb', enemy.x, enemy.y - 12));
        }
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

    // Update Acid Spitters
    for (let i = this.acidSpitters.length - 1; i >= 0; i--) {
      const spitter = this.acidSpitters[i];
      if (spitter.hp <= 0) {
        this.collectibles.push(new Collectible(`geo-ac-${Date.now()}`, 'geo_coin', spitter.x, spitter.y));
        this.collectibles.push(new Collectible(`soul-ac-${Date.now()}`, 'soul_orb', spitter.x, spitter.y - 12));
        this.acidSpitters.splice(i, 1);
        continue;
      }
      spitter.update(dt, this.knights);
    }

    // Update Vengefies (dive-bombers)
    for (let i = this.vengefies.length - 1; i >= 0; i--) {
      const v = this.vengefies[i];
      if (v.hp <= 0) {
        this.collectibles.push(new Collectible(`geo-v-${Date.now()}`, 'geo_coin', v.x, v.y));
        if (Math.random() < 0.7) {
          this.collectibles.push(new Collectible(`soul-v-${Date.now()}`, 'soul_orb', v.x, v.y + 8));
        }
        this.vengefies.splice(i, 1);
        continue;
      }
      v.update(dt, this.knights);
    }

    // Update Breakable Walls
    for (let i = this.breakableWalls.length - 1; i >= 0; i--) {
      const wall = this.breakableWalls[i];
      if (wall.crumbling) {
        wall.crumbleTimer += dt;
        if (wall.hp <= 0 && wall.crumbleTimer > 0.5) {
          this.breakableWalls.splice(i, 1);
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
      // Phase 3: Boss summons additional spore bugs as minions
      if (bRes.spawnMinions) {
        const bossX = this.boss.x;
        const bossY = this.boss.y;
        this.enemies.push(new Enemy(`minion-${Date.now()}-1`, 'spore_bug', bossX - 40, bossY - 20));
        this.enemies.push(new Enemy(`minion-${Date.now()}-2`, 'spore_bug', bossX + 40, bossY - 20));
        this.ctx.audio.playTone(180, 'square', 0.3);
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
          if (col.type === 'geo_coin') {
            k.state.geoCount += col.value;
          } else if (col.type === 'soul_orb') {
            k.state.soul = Math.min(k.state.maxSoul, k.state.soul + col.value);
          } else if (col.type === 'mask_shard') {
            // Mask Shard: permanently increase max HP and restore it!
            k.state.maxHp += 1;
            k.state.hp = Math.min(k.state.hp + 1, k.state.maxHp);
          }
          this.ctx.audio.playTone(col.type === 'mask_shard' ? 880 : 700, 'sine', 0.15);
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

    // Render breakable walls
    this.renderBreakableWalls(this.worldGraphics);

    this.collectibles.forEach((c) => c.render(this.worldGraphics));
    this.spells.forEach((s) => s.render(this.worldGraphics));
    this.enemies.forEach((e) => e.render(this.worldGraphics));
    this.acidSpitters.forEach((a) => a.render(this.worldGraphics));
    this.vengefies.forEach((v) => v.render(this.worldGraphics));
    if (this.boss) this.boss.render(this.worldGraphics);
    
    this.knights.forEach((k) => k.render());
    this.hud.render(this.knights.map((k) => k.state), this.boss, (this.state as string) === 'Finished', this.isVictory);
  }

  private renderBreakableWalls(g: Graphics): void {
    for (const wall of this.breakableWalls) {
      if (wall.hp <= 0) continue;
      const crackRatio = 1 - wall.hp / wall.maxHp;
      // Dark ancient stone wall
      g.rect(wall.x, wall.y, wall.width, wall.height).fill({ color: 0x1e1b2e });
      g.rect(wall.x, wall.y, wall.width, wall.height).stroke({ color: 0x4c1d95, width: 2 });
      // Glowing rune line hinting at secret
      g.rect(wall.x + 4, wall.y + wall.height / 2 - 2, wall.width - 8, 4).fill({ color: 0x6d28d9, alpha: 0.7 });
      // Cracks appear as HP decreases
      if (crackRatio > 0) {
        g.poly([wall.x + 4, wall.y + 8, wall.x + wall.width - 2, wall.y + 20]).stroke({ color: 0x7c3aed, width: 1, alpha: crackRatio });
        g.poly([wall.x + 2, wall.y + 30, wall.x + wall.width - 4, wall.y + 45]).stroke({ color: 0x8b5cf6, width: 1, alpha: crackRatio });
      }
      if (crackRatio > 0.5) {
        g.poly([wall.x + 6, wall.y + 15, wall.x + wall.width - 3, wall.y + 55]).stroke({ color: 0xa78bfa, width: 1 });
      }
      // Crumbling shimmer when destroyed
      if (wall.crumbling) {
        g.rect(wall.x, wall.y, wall.width, wall.height).fill({ color: 0x7c3aed, alpha: 0.4 * (wall.crumbleTimer / 0.5) });
      }
    }
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
