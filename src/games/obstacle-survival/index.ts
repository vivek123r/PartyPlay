import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { Player } from './entities/Player';
import { ObstacleSpawner } from './systems/ObstacleSpawner';
import { DifficultyManager } from './systems/DifficultyManager';
import { CollisionSystem } from './systems/CollisionSystem';
import { CoopBarrier } from './entities/CoopBarrier';
import { GAME_CONFIG } from './config';

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
  '%': [[0,0],[0,4],[1,2],[2,0],[2,4]],
  '!': [[0,0],[0,1],[0,2],[0,4]],
};

export default class ObstacleSurvivalGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private gameContainer!: Container;
  private hudContainer!: Container;
  private hudGraphics!: Graphics;

  private players: Player[] = [];
  private spawner!: ObstacleSpawner;
  private difficultyManager!: DifficultyManager;
  private collisionSystem = new CollisionSystem();
  private coopBarrier = new CoopBarrier();

  // Pure Co-Op Unified Team Score
  private teamScore = 0;
  private synergyTimeSec = 0;
  private hyperTimeSec = 0;
  private bouldersShattered = 0;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing ObstacleSurvivalGame in Pure Co-Op Team Mode...');

    const { viewport, stage } = this.ctx.renderer;
    this.gameContainer = new Container();
    this.hudContainer = new Container();
    this.hudGraphics = new Graphics();

    stage.addChild(this.gameContainer);
    stage.addChild(this.coopBarrier.container);
    stage.addChild(this.hudContainer);
    this.hudContainer.addChild(this.hudGraphics);

    // Calculate player positions
    const radiusMultiplier = this.ctx.modifiers.playerRadiusMultiplier ?? 1.0;
    const playerRadius = GAME_CONFIG.BASE_PLAYER_RADIUS * radiusMultiplier;
    const count = this.ctx.players.length;
    const spacing = viewport.width / (count + 1);
    const initialY = viewport.height - 80;

    this.players = this.ctx.players.map((p, idx) => {
      const x = Math.round(spacing * (idx + 1));
      const player = new Player(p.id, p.color, playerRadius, x, Math.round(initialY));
      this.gameContainer.addChild(player.container);
      return player;
    });

    this.teamScore = 0;
    this.synergyTimeSec = 0;
    this.hyperTimeSec = 0;
    this.bouldersShattered = 0;

    this.difficultyManager = new DifficultyManager(this.ctx.modifiers.speedMultiplier ?? 1.0);
    this.spawner = new ObstacleSpawner(this.gameContainer, this.ctx.random, playerRadius);

    // Add direct window keydown listener for Shift, Space, Enter, ArrowUp, KeyW
    window.addEventListener('keydown', this.handleKeyDown);

    this.state = 'Ready';
  }

  private triggerCoopShieldActivation(): void {
    if (this.coopBarrier.energy >= 99) {
      const didActivate = this.coopBarrier.activate();
      if (didActivate) {
        // Activate 5-second Shield Immunity for ALL active players!
        this.players.forEach((p) => {
          if (p.isAlive) {
            p.activateShieldState(5.0);
          }
        });
        this.ctx.audio.playTone(650, 'square', 0.3); // High-energy activation chime!
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.state !== 'Playing') return;
    const isShift = e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight';
    const isActionKey = ['Space', 'Enter', 'ArrowUp', 'KeyW'].includes(e.code);

    if (isShift || isActionKey) {
      this.triggerCoopShieldActivation();
    }
  };

  public start(): void {
    this.state = 'Playing';
    this.ctx.logger.info('ObstacleSurvivalGame Started');
  }

  private drawPixelText(g: Graphics, text: string, cx: number, cy: number, color: number, scale: number = 1): number {
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
      } else if (ch === ':') {
        g.rect(x + s, cy + s, s, s).fill({ color });
        g.rect(x + s, cy + 3 * s, s, s).fill({ color });
        x += 3 * s;
      } else if (ch === '-') {
        g.rect(x, cy + 2 * s, 3 * s, s).fill({ color });
        x += 3 * s;
      }
      x += s;
    }
    return x;
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    const { viewport } = this.ctx.renderer;
    this.difficultyManager.update(dt);
    const speedMult = this.difficultyManager.getSpeedMultiplier();
    const scrollSpeed = GAME_CONFIG.BASE_OBSTACLE_SPEED * speedMult;
    const elapsedTime = this.difficultyManager.getElapsedTime();

    // 1. Gather active inputs
    const activeInputs = new Map<number, { isLeft: boolean; isRight: boolean; isAction: boolean }>();
    let isActionPressedByAny = false;

    this.players.forEach((player) => {
      if (!player.isAlive) return;
      const input = this.ctx.input.getPlayer(player.id);
      if (input.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }
      const isAct = input.isJustPressed('action') || input.isJustPressed('dash');
      if (isAct) isActionPressedByAny = true;

      activeInputs.set(player.id, {
        isLeft: input.isActive('moveLeft'),
        isRight: input.isActive('moveRight'),
        isAction: isAct,
      });
    });

    // 2. Move & update players with "Power of Joining" & "Hyper Portal 3x Boost"
    let globalSynergyActive = false;
    let globalHyperActive = false;

    const coopPlayers = this.players.filter((p) => p.isAlive);
    let minCoopX = Infinity;
    let maxCoopX = -Infinity;

    this.players.forEach((p1) => {
      if (!p1.isAlive) return;

      const p1Input = activeInputs.get(p1.id)!;
      let currentSynergy = 1.0;

      if (p1Input.isLeft || p1Input.isRight) {
        // Check if touching/together with another player moving in the same direction
        const isTogetherAndSameDir = this.players.some((p2) => {
          if (p2.id === p1.id || !p2.isAlive) return false;
          const p2Input = activeInputs.get(p2.id)!;

          const sameDir = (p1Input.isLeft && p2Input.isLeft) || (p1Input.isRight && p2Input.isRight);
          if (!sameDir) return false;

          const dx = Math.abs(p1.x - p2.x);
          const dy = Math.abs(p1.y - p2.y);
          const maxDist = (p1.radius + p2.radius) * 2.2;
          return dx <= maxDist && dy <= maxDist;
        });

        if (isTogetherAndSameDir) {
          currentSynergy = 2.0; // DOUBLE SPEED POWERUP!
          globalSynergyActive = true;

          minCoopX = Math.min(minCoopX, p1.x);
          maxCoopX = Math.max(maxCoopX, p1.x);
        }
      }

      if (p1.isHyperActive) {
        globalHyperActive = true;
      }

      p1.update(
        dt,
        GAME_CONFIG.PLAYER_SPEED,
        p1Input.isLeft,
        p1Input.isRight,
        viewport.width,
        currentSynergy
      );
    });

    // Track Team Synergy & Hyper Time
    if (globalSynergyActive) this.synergyTimeSec += dt;
    if (globalHyperActive) this.hyperTimeSec += dt;

    // Calculate Unified Team Score
    const distancePts = Math.floor(elapsedTime * 10);
    const synergyPts = Math.floor(this.synergyTimeSec * 25);
    const hyperPts = Math.floor(this.hyperTimeSec * 60);
    const shatterPts = this.bouldersShattered * 50;
    this.teamScore = distancePts + synergyPts + hyperPts + shatterPts;

    // Charge Co-Op Energy Meter when moving together
    if (globalSynergyActive) {
      this.coopBarrier.chargeEnergy(dt);
    }

    // Manual Shift / Action key activation when energy is at 100%!
    if (coopPlayers.length > 0) {
      const firstAlivePlayer = coopPlayers[0];
      const posX = minCoopX < Infinity ? minCoopX : firstAlivePlayer.x;
      const posMaxX = maxCoopX > -Infinity ? maxCoopX : firstAlivePlayer.x;
      this.coopBarrier.updatePosition(posX, posMaxX, firstAlivePlayer.y, firstAlivePlayer.radius);

      if (isActionPressedByAny) {
        this.triggerCoopShieldActivation();
      }
    }

    this.coopBarrier.update(dt);

    // 3. Resolve Player ↔ Player solid physical bump
    this.collisionSystem.resolvePlayerPlayer(this.players);

    // 4. Update & spawn obstacles, projectiles & portals
    this.spawner.update(
      dt,
      scrollSpeed,
      viewport.width,
      viewport.height,
      this.ctx.modifiers.obstacleDensity ?? 1.0
    );

    // 5. Check collisions (Portals, Obstacles, Lasers, Projectiles, Barrier Deflections)
    const portals = this.spawner.getPortals();
    const obstacles = this.spawner.getObstacles();
    const projectiles = this.spawner.getProjectiles();

    // Barrier Deflection Checks
    if (this.coopBarrier.isShieldActive) {
      obstacles.forEach((obs) => {
        if (this.collisionSystem.checkBarrierObstacle(this.coopBarrier, obs)) {
          obs.shatter();
          this.bouldersShattered++;
          this.ctx.audio.playTone(320, 'square', 0.2); // Metallic deflection tone
        }
      });

      projectiles.forEach((proj) => {
        if (this.collisionSystem.checkBarrierProjectile(this.coopBarrier, proj)) {
          proj.isAlive = false;
          this.ctx.audio.playTone(440, 'triangle', 0.15);
        }
      });
    }

    for (const player of this.players) {
      if (!player.isAlive) continue;

      // Check Portals
      for (const portal of portals) {
        if (this.collisionSystem.checkPlayerPortal(player, portal)) {
          portal.isAlive = false;
          // TEAMWIDE POWERUP: Grant 10-second Hyper State to ALL active players in the match!
          this.players.forEach((p) => {
            if (p.isAlive) {
              p.activateHyperState(10.0);
            }
          });
          this.ctx.audio.playTone(880, 'sine', 0.5); // Ascending synth audio chime
          break;
        }
      }

      if (!player.isAlive) continue;

      // Check Obstacles & Lasers
      for (const obstacle of obstacles) {
        if (
          this.collisionSystem.checkPlayerObstacle(player, obstacle) ||
          this.collisionSystem.checkPlayerLaser(player, obstacle)
        ) {
          // ANY PLAYER DEATH = INSTANT TEAM LOSS!
          this.triggerTeamLoss(player);
          return;
        }
      }

      if (!player.isAlive) continue;

      // Check Projectiles
      for (const projectile of projectiles) {
        if (this.collisionSystem.checkPlayerProjectile(player, projectile)) {
          projectile.isAlive = false;
          // ANY PLAYER DEATH = INSTANT TEAM LOSS!
          this.triggerTeamLoss(player);
          return;
        }
      }
    }

    if (this.state !== 'Playing') return;

    // 6. Draw Floating Pixel HUD
    this.renderHUD(viewport.width, elapsedTime, globalSynergyActive, globalHyperActive);
  }

  private renderHUD(width: number, elapsedTime: number, isSynergy: boolean, isHyper: boolean): void {
    if (this.state !== 'Playing' || !this.hudGraphics) return;

    this.hudGraphics.clear();

    const distanceMeters = Math.floor(elapsedTime * 8);

    // UNIFIED TEAM SCORE (Floating Top Center)
    const teamScoreText = `TEAM SCORE: ${this.teamScore}`;
    const centerX = Math.round(width / 2) - 48;
    this.drawPixelText(this.hudGraphics, teamScoreText, centerX, 8, 0xffde7d, 1);

    // Distance Meters Display (Floating Center Text below score)
    const distText = `${distanceMeters}M`;
    this.drawPixelText(this.hudGraphics, distText, Math.round(width / 2) - 16, 20, 0xfffffe, 1);

    // Energy Meter HUD Bar (Floating top center below distance)
    const nrg = Math.floor(this.coopBarrier.energy);
    if (this.coopBarrier.isShieldActive) {
      const shieldSec = Math.ceil(this.coopBarrier.activeTimer);
      this.drawPixelText(this.hudGraphics, `SHIELD ${shieldSec}S`, Math.round(width / 2) - 30, 32, 0x08d9d6, 1);
    } else {
      const nrgColor = nrg >= 99 ? 0x08d9d6 : 0xa7a9be;
      const nrgText = nrg >= 99 ? 'PRESS SHIFT!' : `ENERGY ${nrg}%`;
      const textX = nrg >= 99 ? Math.round(width / 2) - 38 : Math.round(width / 2) - 36;
      this.drawPixelText(this.hudGraphics, nrgText, textX, 32, nrgColor, 1);
    }

    // Synergy & Hyper State Floating Badges
    if (isHyper) {
      this.drawPixelText(this.hudGraphics, 'HYPER 3X', Math.round(width / 2) - 66, 20, 0xa55eea, 1);
    } else if (isSynergy) {
      this.drawPixelText(this.hudGraphics, '2X BOOST', Math.round(width / 2) - 60, 20, 0x08d9d6, 1);
    }
  }

  private triggerTeamLoss(eliminatedPlayer: Player): void {
    if (this.state !== 'Playing') return;

    this.state = 'Finished';
    this.ctx.audio.playTone(120, 'sawtooth', 0.6); // Deep Game Over loss audio

    // Eliminate all players for visual particle bursts
    this.players.forEach((p) => p.eliminate());

    // Build unified team standings (no individual winner)
    const teamStandings = this.players.map((p) => ({
      playerId: p.id,
      score: this.teamScore,
    }));

    // Defer game:over event to next tick so current frame finishes cleanly
    setTimeout(() => {
      this.ctx.events.emit('game:over', {
        winnerId: 0,
        isTeamLoss: true,
        standings: teamStandings,
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
    window.removeEventListener('keydown', this.handleKeyDown);
    this.players.forEach((p) => p.destroy());
    this.spawner?.destroy();
    this.coopBarrier?.destroy();
    this.hudGraphics?.destroy();
    this.hudContainer?.destroy();
    this.gameContainer?.destroy();
    this.players = [];
  }
}
