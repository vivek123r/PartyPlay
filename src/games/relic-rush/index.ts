import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { Adventurer } from './entities/Adventurer';
import { CrossLaneMatrix } from './systems/CrossLaneMatrix';
import { PhysicsEngine } from './systems/PhysicsEngine';
import { LevelLoader } from './systems/LevelLoader';
import type { LevelData } from './systems/LevelLoader';
import { EnvironmentParticles } from './entities/EnvironmentParticles';
import { PerLaneCameraSystem } from './systems/PerLaneCameraSystem';
import { Trap } from './entities/Traps';
import { Collectible } from './entities/Collectibles';
import { RELIC_RUSH_CONFIG } from './config';

interface ScorePopup {
  text: string;
  x: number;
  y: number;
  color: number;
  life: number;
  maxLife: number;
}

// 3x5 Retro Pixel Font Glyph Map
const PIXEL_GLYPHS: Record<string, [number, number][]> = {
  'A': [[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[2,1],[2,2],[2,3],[2,4]],
  'B': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,1],[2,3]],
  'C': [[0,1],[0,2],[0,3],[1,0],[1,4],[2,0],[2,4]],
  'D': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,4],[2,1],[2,2],[2,3]],
  'E': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,4]],
  'F': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[2,0],[2,2]],
  'G': [[0,1],[0,2],[0,3],[1,0],[1,4],[2,0],[2,2],[2,3],[2,4]],
  'H': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,0],[2,1],[2,2],[2,3],[2,4]],
  'I': [[0,0],[0,4],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0],[2,4]],
  'J': [[0,0],[0,4],[1,0],[1,1],[1,2],[1,3],[2,1],[2,2],[2,3]],
  'K': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,0],[2,1],[2,3],[2,4]],
  'L': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4]],
  'M': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,1],[2,1],[3,0],[3,1],[3,2],[3,3],[3,4]],
  'N': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,1],[2,2],[3,0],[3,1],[3,2],[3,3],[3,4]],
  'O': [[0,1],[0,2],[0,3],[1,0],[1,4],[2,1],[2,2],[2,3]],
  'P': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[2,1]],
  'Q': [[0,1],[0,2],[0,3],[1,0],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4]],
  'R': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[2,1],[2,3],[2,4]],
  'S': [[0,1],[0,4],[1,0],[1,2],[1,4],[2,0],[2,1],[2,3]],
  'T': [[0,0],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0]],
  'U': [[0,0],[0,1],[0,2],[0,3],[1,4],[2,0],[2,1],[2,2],[2,3]],
  'V': [[0,0],[0,1],[0,2],[1,3],[2,0],[2,1],[2,2]],
  'W': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,3],[2,1],[2,3],[3,0],[3,1],[3,2],[3,3],[3,4]],
  'X': [[0,0],[0,1],[0,3],[0,4],[1,2],[2,0],[2,1],[2,3],[2,4]],
  'Y': [[0,0],[0,1],[1,2],[1,3],[1,4],[2,0],[2,1]],
  'Z': [[0,0],[0,4],[1,0],[1,3],[1,4],[2,0],[2,1],[2,4]],
  '0': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4]],
  '1': [[0,0],[1,0],[1,1],[1,2],[1,3],[1,4],[2,4]],
  '2': [[0,0],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,4]],
  '3': [[0,0],[0,4],[1,0],[1,2],[1,4],[2,0],[2,1],[2,3],[2,4]],
  '4': [[0,0],[0,1],[1,2],[2,0],[2,1],[2,2],[2,3],[2,4]],
  '5': [[0,0],[0,1],[0,2],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,3],[2,4]],
  '6': [[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,1],[2,2],[2,3],[2,4]],
  '7': [[0,0],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0]],
  '8': [[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4]],
  '9': [[0,0],[0,1],[2,0],[2,1],[2,2],[1,2],[1,0],[0,0],[0,1],[0,2],[1,2],[2,2],[2,3],[2,4],[1,4],[0,3],[0,4]],
  '/': [[0,4],[1,2],[2,0]],
  '-': [[0,2],[1,2],[2,2]],
  ':': [[0,1],[0,3]],
  '!': [[0,0],[0,1],[0,2],[0,4]],
  '+': [[1,0],[1,1],[1,2],[0,1],[2,1]],
  '★': [[1,0],[0,1],[1,1],[2,1],[0,2],[2,2]],
};

export default class RelicRushGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private gameContainer!: Container;

  // Independent Per-Lane Viewport Containers & Scissor Masks
  private laneViewportContainers: Container[] = [];
  private laneEntityContainers: Container[] = [];
  private laneMasks: Graphics[] = [];
  private hudContainer!: Container;
  private hudGraphics!: Graphics;

  private adventurers: Adventurer[] = [];
  private crossMatrix = new CrossLaneMatrix();
  private physicsEngine = new PhysicsEngine();
  private particles = new EnvironmentParticles();
  private camera = new PerLaneCameraSystem();
  private levelData!: LevelData;

  private stageIndex = 0;
  private maxStages = 5;
  private elapsedTime = 0;
  private animTimer = 0;

  private shakeIntensity = 0;
  private isVictoryFreeze = false;
  private victoryFreezeTimer = 0;
  private stageWinner: Adventurer | null = null;
  private popups: ScorePopup[] = [];

  private playerScores = new Map<number, number>();
  private totalGemsCollected = 0;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing Relic Rush v2: Per-Lane Camera Viewports...');

    const { stage } = this.ctx.renderer;
    this.gameContainer = new Container();

    this.hudContainer = new Container();
    this.hudGraphics = new Graphics();

    stage.addChild(this.gameContainer);
    this.gameContainer.addChild(this.particles.container);
    stage.addChild(this.hudContainer);
    this.hudContainer.addChild(this.hudGraphics);

    const count = Math.min(4, Math.max(2, this.ctx.players.length));
    const laneHeight = Math.floor(RELIC_RUSH_CONFIG.VIRTUAL_HEIGHT / count);
    this.camera.init(count);

    this.adventurers = this.ctx.players.slice(0, count).map((p, idx) => {
      this.playerScores.set(p.id, 0);
      const startY = idx * laneHeight + laneHeight - 12;
      return new Adventurer(p.id, p.color, idx, 25, startY);
    });

    this.loadStage(0);

    // Cross-Lane Sabotage Matrix Handler
    this.crossMatrix.subscribe((evt) => {
      this.triggerShake(5);
      this.ctx.audio.playTone(520, 'square', 0.2);

      const srcCamX = this.camera.laneCameraX[evt.sourceLaneIndex] || 0;
      if (evt.message) {
        this.addPopup(evt.message, srcCamX + 140, 40 + evt.sourceLaneIndex * 40, 0xf4d160);
      }

      if (evt.actionType === 'drop_boulder') {
        const targetLane = evt.targetLaneIndex === 'all' ? 0 : (evt.targetLaneIndex as number);
        const lH = this.levelData.laneHeight;
        const boulderY = targetLane * lH + lH - 28;
        const targetCamX = this.camera.laneCameraX[targetLane] || 0;
        const boulder = new Trap('rolling_boulder', targetLane, targetCamX + 440, boulderY);
        this.levelData.traps.push(boulder);
        if (this.laneEntityContainers[targetLane]) {
          this.laneEntityContainers[targetLane].addChild(boulder.container);
        }
      } else if (evt.actionType === 'trigger_flame') {
        this.levelData.traps.forEach((tr) => {
          if (tr.type === 'flame_jet' && (evt.targetLaneIndex === 'all' || tr.laneIndex === evt.targetLaneIndex)) {
            tr.isFiring = true;
          }
        });
      } else {
        this.levelData.doors.forEach((door) => {
          if (evt.targetLaneIndex === 'all' || door.laneIndex === evt.targetLaneIndex) {
            door.toggle();
          }
        });
      }
    });

    this.state = 'Ready';
  }

  private loadStage(stageIdx: number): void {
    this.stageIndex = stageIdx;
    this.isVictoryFreeze = false;
    this.victoryFreezeTimer = 0;
    this.stageWinner = null;
    this.popups = [];
    this.camera.init(this.adventurers.length);

    // Destroy existing lane containers and masks
    this.laneViewportContainers.forEach((c) => c.destroy({ children: false }));
    this.laneEntityContainers.forEach((c) => c.destroy({ children: false }));
    this.laneMasks.forEach((m) => m.destroy());
    this.laneViewportContainers = [];
    this.laneEntityContainers = [];
    this.laneMasks = [];

    if (this.levelData) {
      this.levelData.triggers.forEach((t) => t.destroy());
      this.levelData.doors.forEach((d) => d.destroy());
      this.levelData.traps.forEach((tr) => tr.destroy());
      this.levelData.collectibles.forEach((c) => c.destroy());
      this.levelData.crates.forEach((cr) => cr.destroy());
      this.levelData.waterZones.forEach((w) => w.destroy());
      this.levelData.laneBgGraphics.forEach((g) => g.destroy());
    }

    this.levelData = LevelLoader.loadLevel(stageIdx, this.adventurers.length);
    const activeLanes = this.adventurers.length;
    const lH = this.levelData.laneHeight;

    // Build Per-Lane Viewports & PIXI Scissor Masks
    for (let i = 0; i < activeLanes; i++) {
      const laneViewport = new Container();
      const entityContainer = new Container();

      // Layering inside each independent lane viewport:
      // 1. Lane Background Tiles
      // 2. Lane Interactive Entities
      // 3. Lane Adventurer Sprite
      laneViewport.addChild(this.levelData.laneBgGraphics[i]);
      laneViewport.addChild(entityContainer);
      laneViewport.addChild(this.adventurers[i].container);

      // Scissor Mask per lane bounds
      const mask = new Graphics();
      mask.rect(0, i * lH, RELIC_RUSH_CONFIG.VIRTUAL_WIDTH, lH).fill({ color: 0xffffff });
      laneViewport.mask = mask;

      this.gameContainer.addChild(laneViewport);
      this.gameContainer.addChild(mask);

      this.laneViewportContainers.push(laneViewport);
      this.laneEntityContainers.push(entityContainer);
      this.laneMasks.push(mask);
    }

    const worldPreset = RELIC_RUSH_CONFIG.WORLDS[this.levelData.worldIndex];
    this.particles.initWorldTheme(
      worldPreset.id,
      this.levelData.levelWidth,
      RELIC_RUSH_CONFIG.VIRTUAL_HEIGHT
    );

    this.adventurers.forEach((adv, idx) => {
      const startY = idx * lH + lH - 12;
      adv.respawn(25, startY);
      adv.invincibilityTimer = 0;
    });

    // Add Level Entities to their respective lane container
    this.levelData.triggers.forEach((t) => this.laneEntityContainers[t.laneIndex]?.addChild(t.container));
    this.levelData.doors.forEach((d) => this.laneEntityContainers[d.laneIndex]?.addChild(d.container));
    this.levelData.traps.forEach((tr) => this.laneEntityContainers[tr.laneIndex]?.addChild(tr.container));
    this.levelData.collectibles.forEach((c) => this.laneEntityContainers[c.laneIndex]?.addChild(c.container));
    this.levelData.crates.forEach((cr) => this.laneEntityContainers[cr.laneIndex]?.addChild(cr.container));
    this.levelData.waterZones.forEach((w) => this.laneEntityContainers[w.laneIndex]?.addChild(w.container));
  }

  public start(): void {
    this.state = 'Playing';
    this.ctx.logger.info('Relic Rush Game Started!');
  }

  private triggerShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private addPopup(text: string, x: number, y: number, color = 0xfffffe): void {
    this.popups.push({ text, x, y, color, life: 1.0, maxLife: 1.0 });
  }

  private drawPixelText(g: Graphics, text: string, cx: number, cy: number, color: number, scale = 1): number {
    const s = scale;
    let x = cx;
    for (const ch of text.toUpperCase()) {
      const glyph = PIXEL_GLYPHS[ch];
      if (glyph) {
        for (const [gx, gy] of glyph) {
          g.rect(x + gx * s, cy + gy * s, s, s).fill({ color });
        }
        x += 3 * s;
      } else if (ch === ' ') {
        x += 3 * s;
      }
      x += s;
    }
    return x;
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    this.elapsedTime += dt;
    this.animTimer += dt;

    // 1. Independent Per-Lane Camera Tracking!
    const maxScroll = this.levelData.levelWidth - RELIC_RUSH_CONFIG.VIRTUAL_WIDTH;
    this.camera.update(this.adventurers, maxScroll);

    // Apply Screen Shake Decay to Game Container
    let shakeX = 0;
    let shakeY = 0;

    if (this.shakeIntensity > 0.3) {
      shakeX = Math.round((Math.random() * 2 - 1) * this.shakeIntensity);
      shakeY = Math.round((Math.random() * 2 - 1) * this.shakeIntensity);
      this.shakeIntensity *= 0.82;
    } else {
      this.shakeIntensity = 0;
    }

    this.gameContainer.position.set(shakeX, shakeY);

    // Shift each player lane container INDEPENDENTLY!
    this.adventurers.forEach((_, idx) => {
      if (this.laneViewportContainers[idx]) {
        const camX = Math.round(this.camera.laneCameraX[idx] || 0);
        this.laneViewportContainers[idx].position.x = -camX;
      }
    });

    const w = RELIC_RUSH_CONFIG.VIRTUAL_WIDTH;
    const lH = this.levelData.laneHeight;

    this.particles.update(dt, this.levelData.levelWidth, RELIC_RUSH_CONFIG.VIRTUAL_HEIGHT);

    // Update Floating Popups
    this.popups = this.popups.filter((p) => {
      p.y -= 12 * dt;
      p.life -= dt;
      return p.life > 0;
    });

    if (this.isVictoryFreeze) {
      this.victoryFreezeTimer -= dt;
      if (this.victoryFreezeTimer <= 0) {
        this.handleStageComplete();
      }
      this.renderHUD(w);
      return;
    }

    this.levelData.collectibles.forEach((c) => c.update(dt));
    this.levelData.traps.forEach((tr) => tr.update(dt, this.levelData.levelWidth));
    this.levelData.crates.forEach((cr) => cr.update(dt));
    this.levelData.waterZones.forEach((wz) => wz.update(dt));

    // Process Player Inputs & Physics
    this.adventurers.forEach((adventurer) => {
      if (!adventurer.isAlive) return;

      const input = this.ctx.input.getPlayer(adventurer.id);
      if (input.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }

      const moveLeft = input.isActive('moveLeft');
      const moveRight = input.isActive('moveRight');
      const jumpPressed = input.isJustPressed('jump');
      const actionPressed = input.isJustPressed('action');

      // Check Swimmable Water Zones
      let inWater = false;
      this.levelData.waterZones.forEach((wz) => {
        if (wz.laneIndex === adventurer.laneIndex) {
          const dx = Math.abs(adventurer.x - (wz.x + wz.width / 2));
          const dy = Math.abs(adventurer.y - (wz.y + wz.height / 2));
          if (dx <= wz.width / 2 && dy <= wz.height / 2) {
            inWater = true;
          }
        }
      });
      adventurer.isSwimming = inWater;

      // Check Breakable Wooden Crates
      this.levelData.crates.forEach((cr) => {
        if (!cr.isDestroyed && cr.laneIndex === adventurer.laneIndex) {
          const dx = Math.abs(adventurer.x - (cr.x + cr.width / 2));
          const dy = Math.abs(adventurer.y - (cr.y + cr.height / 2));
          if (dx <= 16 && dy <= 16) {
            if (actionPressed || Math.abs(adventurer.vx) > 80 || adventurer.vy > 50) {
              cr.breakCrate();
              this.ctx.audio.playTone(440, 'square', 0.15);
              const gem = new Collectible('relic_shard', adventurer.laneIndex, cr.x + 3, cr.y - 6);
              this.levelData.collectibles.push(gem);
              this.laneEntityContainers[adventurer.laneIndex]?.addChild(gem.container);
              this.addPopup('+CRATE GEM!', cr.x, cr.y - 14, 0x55efc4);
            }
          }
        }
      });

      // Check Lever Prompts & Triggers
      this.levelData.triggers.forEach((trig) => {
        if (trig.laneIndex === adventurer.laneIndex && !trig.isActivated) {
          const dx = Math.abs(adventurer.x - (trig.x + trig.width / 2));
          const dy = Math.abs(adventurer.y - (trig.y + trig.height / 2));
          trig.setPromptVisible(dx <= 35 && dy <= 35);

          if (actionPressed && dx <= 20 && dy <= 20) {
            trig.activate(adventurer.id, this.crossMatrix);
            const current = this.playerScores.get(adventurer.id) ?? 0;
            this.playerScores.set(adventurer.id, current + 100);
            this.addPopup('+100 LEVER!', adventurer.x, adventurer.y - 20, 0x08d9d6);
          }
        }
      });

      // Check Traps Collision
      this.levelData.traps.forEach((trap) => {
        if (trap.isActive && !trap.isShattered && trap.laneIndex === adventurer.laneIndex) {
          if (trap.type === 'flame_jet' && !trap.isFiring) return;

          const dx = Math.abs(adventurer.x - (trap.x + trap.width / 2));
          const dy = Math.abs(adventurer.y - (trap.y + trap.height / 2));
          if (dx <= 14 && dy <= 14) {
            adventurer.takeDamage(1);
            this.triggerShake(5);
            this.ctx.audio.playTone(220, 'sawtooth', 0.3);
            this.addPopup('-1 HEART!', adventurer.x, adventurer.y - 18, 0xff2e63);
          }
        }
      });

      // Check Collectibles
      this.levelData.collectibles.forEach((c) => {
        if (!c.isCollected && c.laneIndex === adventurer.laneIndex) {
          const dx = Math.abs(adventurer.x - (c.x + c.width / 2));
          const dy = Math.abs(adventurer.y - (c.y + c.height / 2));
          if (dx <= 16 && dy <= 16) {
            const pts = c.collect();
            if (pts > 0) {
              this.totalGemsCollected++;
              const current = this.playerScores.get(adventurer.id) ?? 0;
              this.playerScores.set(adventurer.id, current + pts);
              this.ctx.audio.playTone(880, 'sine', 0.15);
              this.addPopup(`+${pts} PTS!`, adventurer.x, adventurer.y - 18, 0xf4d160);
            }
          }
        }
      });

      // Update Physics against 2400px level width
      const minY = adventurer.laneIndex * lH;
      const maxY = minY + lH - 12;

      this.physicsEngine.updateAdventurerPhysics(
        adventurer,
        dt,
        this.levelData.platforms,
        minY,
        maxY,
        this.levelData.levelWidth
      );

      adventurer.update(dt, moveLeft, moveRight, jumpPressed, actionPressed, this.levelData.levelWidth);

      // Check Pit Fall Gap Penalty
      if (adventurer.fellInPit && adventurer.isAlive) {
        adventurer.takeDamage(1);
        this.triggerShake(5);
        this.ctx.audio.playTone(220, 'sawtooth', 0.3);
        this.addPopup('-1 HEART! PIT FALL', adventurer.x, adventurer.y - 18, 0xff2e63);
        adventurer.respawnAtSafeCheckpoint();
      }

      // Check Exit Flag Reach at x = 2355px
      if (adventurer.x >= this.levelData.exitX && !adventurer.hasReachedExit && !this.isVictoryFreeze) {
        adventurer.hasReachedExit = true;
        this.stageWinner = adventurer;
        this.isVictoryFreeze = true;
        this.victoryFreezeTimer = 2.5;

        const current = this.playerScores.get(adventurer.id) ?? 0;
        this.playerScores.set(adventurer.id, current + 500);
        adventurer.trophies++;

        this.triggerShake(7);
        this.particles.spawnGoldStarBurst(adventurer.x, adventurer.y - 10, 35);

        this.ctx.audio.playTone(520, 'square', 0.2);
        setTimeout(() => this.ctx.audio.playTone(660, 'square', 0.2), 100);
        setTimeout(() => this.ctx.audio.playTone(880, 'square', 0.3), 200);

        this.addPopup('+500 STAGE WINNER!', adventurer.x - 30, adventurer.y - 25, 0xffde7d);
      }
    });

    // Check Elimination Victory Rule (Last Player Standing)
    const alivePlayers = this.adventurers.filter((p) => p.isAlive);
    if (alivePlayers.length === 1 && !this.isVictoryFreeze && this.adventurers.length > 1) {
      const survivor = alivePlayers[0];
      this.stageWinner = survivor;
      this.isVictoryFreeze = true;
      this.victoryFreezeTimer = 2.5;

      const current = this.playerScores.get(survivor.id) ?? 0;
      this.playerScores.set(survivor.id, current + 500);
      survivor.trophies++;

      this.triggerShake(7);
      this.particles.spawnGoldStarBurst(survivor.x, survivor.y - 10, 35);

      this.ctx.audio.playTone(520, 'square', 0.2);
      setTimeout(() => this.ctx.audio.playTone(660, 'square', 0.2), 100);
      setTimeout(() => this.ctx.audio.playTone(880, 'square', 0.3), 200);

      this.addPopup('+500 SURVIVOR WIN!', survivor.x - 30, survivor.y - 25, 0xffde7d);
    }

    this.renderHUD(w);
  }

  private handleStageComplete(): void {
    if (this.stageIndex + 1 < this.maxStages) {
      this.loadStage(this.stageIndex + 1);
    } else {
      this.triggerMatchOver();
    }
  }

  private renderHUD(width: number): void {
    if (this.state !== 'Playing' || !this.hudGraphics) return;

    this.hudGraphics.clear();

    // 1. Top Fixed Screen Header
    const mins = Math.floor(this.elapsedTime / 60);
    const secs = Math.floor(this.elapsedTime % 60);
    const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const titleStr = `${this.stageIndex + 1}-5 ${this.levelData.worldName.toUpperCase()}`;

    this.hudGraphics.rect(0, 0, width, 12).fill({ color: 0x0f0e17, alpha: 0.85 });
    this.drawPixelText(this.hudGraphics, `${timeStr}  ${titleStr}`, 10, 3, 0xffde7d, 1);
    this.drawPixelText(this.hudGraphics, `GEMS:${this.totalGemsCollected}`, width - 90, 3, 0x08d9d6, 1);

    // 2. Per-Lane Player Badges
    const lH = this.levelData.laneHeight;
    this.adventurers.forEach((p, idx) => {
      const topY = idx * lH + 14;
      const hex = parseInt(p.color.replace('#', ''), 16) || 0xffffff;

      this.hudGraphics.rect(6, topY, 24, 9).fill({ color: 0x0f0e17, alpha: 0.75 });
      this.drawPixelText(this.hudGraphics, `P${p.id}`, 8, topY + 2, hex, 1);

      for (let h = 0; h < p.maxHearts; h++) {
        const heartX = 34 + h * 8;
        const heartColor = h < p.hearts ? 0xff2e63 : 0x2d3436;
        this.hudGraphics.rect(heartX, topY + 2, 5, 5).fill({ color: heartColor });
      }

      this.drawPixelText(this.hudGraphics, `TR:${p.trophies}`, width - 36, topY + 2, 0xffde7d, 1);
    });

    // 3. Render Floating Score Popups (Adjusted to screen space via per-lane camera offset)
    this.popups.forEach((pop) => {
      const screenX = pop.x - (this.camera.laneCameraX[0] || 0);
      if (screenX >= -50 && screenX <= width + 50) {
        this.drawPixelText(this.hudGraphics, pop.text, screenX, pop.y, pop.color, 1);
      }
    });

    // 4. Celebratory Stage Victory Banner Overlay
    if (this.isVictoryFreeze && this.stageWinner) {
      const bannerW = 320;
      const bannerH = 50;
      const bx = (width - bannerW) / 2;
      const by = 80;

      this.hudGraphics.rect(bx, by, bannerW, bannerH).fill({ color: 0x0f0e17, alpha: 0.95 });
      this.hudGraphics.rect(bx, by, bannerW, 2).fill({ color: 0xf4d160 });
      this.hudGraphics.rect(bx, by + bannerH - 2, bannerW, 2).fill({ color: 0xf4d160 });

      const winnerHex = parseInt(this.stageWinner.color.replace('#', ''), 16) || 0xffffff;
      this.drawPixelText(this.hudGraphics, `STAGE ${this.stageIndex + 1} COMPLETE!`, bx + 55, by + 10, 0xf4d160, 1.5);
      this.drawPixelText(
        this.hudGraphics,
        `P${this.stageWinner.id} WINS THE RACE! (+500 PTS)`,
        bx + 25,
        by + 30,
        winnerHex,
        1
      );
    }
  }

  private triggerMatchOver(): void {
    if (this.state !== 'Playing') return;

    this.state = 'Finished';
    this.ctx.audio.playTone(660, 'sine', 0.5);

    const standings = Array.from(this.playerScores.entries())
      .map(([playerId, score]) => ({ playerId, score }))
      .sort((a, b) => b.score - a.score);

    setTimeout(() => {
      this.ctx.events.emit('game:over', {
        winnerId: standings[0]?.playerId ?? 1,
        isTeamLoss: false,
        standings,
      });
    }, 50);
  }

  public pause(): void {
    this.state = 'Paused';
  }

  public resume(): void {
    this.state = 'Playing';
  }

  public destroy(): void {
    this.state = 'Destroyed';
    this.adventurers.forEach((a) => a.destroy());
    this.laneViewportContainers.forEach((c) => c.destroy({ children: false }));
    this.laneEntityContainers.forEach((c) => c.destroy({ children: false }));
    this.laneMasks.forEach((m) => m.destroy());
    if (this.levelData) {
      this.levelData.triggers.forEach((t) => t.destroy());
      this.levelData.doors.forEach((d) => d.destroy());
      this.levelData.traps.forEach((tr) => tr.destroy());
      this.levelData.collectibles.forEach((c) => c.destroy());
      this.levelData.crates.forEach((cr) => cr.destroy());
      this.levelData.waterZones.forEach((w) => w.destroy());
      this.levelData.laneBgGraphics.forEach((g) => g.destroy());
    }
    this.particles?.destroy();
    this.hudGraphics?.destroy();
    this.hudContainer?.destroy();
    this.gameContainer?.destroy();
    this.adventurers = [];
  }
}
