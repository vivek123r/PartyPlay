// ═══════════════════════════════════════════════════════════════
// SNAKE ARENA v2 — Multi-Arena Snake Battle Royale
// ═══════════════════════════════════════════════════════════════

import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const GRID = 10;
const PLAYER_COLORS = ['#ff2e63', '#08d9d6', '#2af598', '#ffde7d'];
const STEP_INTERVAL = 0.10; // base seconds per step

type Arena = 'battle-pit' | 'warp-zone' | 'maze' | 'abyss';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type PowerUpType = 'speed' | 'shield' | 'invincible' | 'shrink' | 'magnet' | 'confuse' | 'ghost' | 'clone';
type FoodType = 'apple' | 'golden' | 'poison' | 'superfood';

// ═══════════════════════════════════════════════════════════════
// ENTITIES
// ═══════════════════════════════════════════════════════════════

interface Segment { x: number; y: number; }

interface ActivePowerUp { type: PowerUpType; remainingMs: number; }

interface Snake {
  id: number; color: string; isAlive: boolean;
  dir: Direction; body: Segment[];
  container: Container; graphics: Graphics;
  activePowerUps: Map<PowerUpType, ActivePowerUp>;
  dashCooldownMs: number; kills: number; foodEaten: number;
  trapTimer: number; // encirclement countdown
}

interface FoodItem { x: number; y: number; type: FoodType; graphics: Graphics; lifeMs: number; }

interface Obstacle { x: number; y: number; w: number; h: number; graphics: Graphics; rotationAngle?: number; driftDir?: number; }

interface Particle { x: number; y: number; vx: number; vy: number; lifeMs: number; color: number; size: number; alive: boolean; }

interface KillFeedEntry { msg: string; color: number; lifeMs: number; }

// ═══════════════════════════════════════════════════════════════
// GAME CLASS
// ═══════════════════════════════════════════════════════════════

export default class SnakeArenaGame implements GameModule {
  public state: InternalGameState = 'Initializing';
  private ctx!: GameContext;
  private gameContainer!: Container;
  private legendContainer!: Container;
  private bgGraphics!: Graphics;
  private fxContainer!: Container;
  private snakes: Snake[] = [];
  private foods: FoodItem[] = [];
  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];
  private killFeed: KillFeedEntry[] = [];

  private gridW = 0; private gridH = 0;
  private moveTimer = 0; private aliveCount = 0;
  private standings: Array<{ playerId: number; score: number }> = [];
  private arena: Arena = 'battle-pit';
  private gameTimeMs = 0;
  private obstacleTimer = 0;
  private powerUpTimer = 0;
  private powerUpsOnField: Array<{ x: number; y: number; type: PowerUpType; graphics: Graphics; lifeMs: number }> = [];
  private shakeIntensity = 0;
  private showInfo = false;

  public showInfoToggle(): void {
    this.showInfo = !this.showInfo;
  }

  private cloneTraps: Array<{ body: Segment[]; dir: Direction; color: string; lifeMs: number; graphics: Graphics }> = [];

  // Abyss state
  private abyssFloorSize = 0;
  private abyssCrumbTimer = 0;
  private abyssPlatforms: Array<{ x: number; y: number; dx: number; graphics: Graphics }> = [];

  async init(context: GameContext): Promise<void> {
    this.state = 'Loading'; this.ctx = context;
    const { viewport, stage } = this.ctx.renderer;
    this.gridW = 42; // 420px arena, 60px legend sidebar
    this.gridH = Math.floor(viewport.height / GRID);
    this.arena = (this.ctx.modifiers.arena as Arena) || 'battle-pit';
    if (this.arena === 'abyss') this.abyssFloorSize = Math.min(this.gridW, this.gridH);

    this.gameContainer = new Container(); stage.addChild(this.gameContainer);
    this.legendContainer = new Container(); stage.addChild(this.legendContainer);
    this.bgGraphics = new Graphics(); this.gameContainer.addChild(this.bgGraphics);
    this.fxContainer = new Container(); this.gameContainer.addChild(this.fxContainer);

    this.drawArenaBackground();
    this.initArenaObstacles();

    const count = this.ctx.players.length; this.aliveCount = count;

    const starts = [
      { x: 5, y: 4, dir: 'RIGHT' as const },
      { x: this.gridW - 6, y: this.gridH - 5, dir: 'LEFT' as const },
      { x: this.gridW - 6, y: 4, dir: 'DOWN' as const },
      { x: 5, y: this.gridH - 5, dir: 'UP' as const },
    ];

    this.snakes = this.ctx.players.map((p, idx) => {
      const pos = starts[idx % starts.length];
      const color = p.color || PLAYER_COLORS[idx % PLAYER_COLORS.length];
      const c = new Container(); const g = new Graphics();
      c.addChild(g); this.gameContainer.addChild(c);
      return {
        id: p.id, color, isAlive: true, dir: pos.dir,
        body: this.createBody(pos.x, pos.y, pos.dir),
        container: c, graphics: g,
        activePowerUps: new Map(), dashCooldownMs: 0,
        kills: 0, foodEaten: 0, trapTimer: 0,
      };
    });

    this.initParticlePool();
    this.spawnFood('apple'); this.spawnFood('apple');
    this.renderAll(); this.state = 'Ready';
  }

  // ═══════════════════════════════════════════════════════
  // ARENA BACKGROUNDS
  // ═══════════════════════════════════════════════════════

  private drawArenaBackground(): void {
    const g = this.bgGraphics; g.clear();
    const w = this.gridW * GRID, h = this.gridH * GRID;

    switch (this.arena) {
      case 'battle-pit': this.drawBattlePitBg(g, w, h); break;
      case 'warp-zone': this.drawWarpZoneBg(g, w, h); break;
      case 'maze': this.drawMazeBg(g, w, h); break;
      case 'abyss': this.drawAbyssBg(g, w, h); break;
    }
  }

  private drawBattlePitBg(g: Graphics, w: number, h: number): void {
    g.rect(0, 0, w, h).fill({ color: 0x151022 });
    // Grid
    for (let x = 0; x <= this.gridW; x++) g.rect(x * GRID, 0, 1, h).fill({ color: 0x1f1d33 });
    for (let y = 0; y <= this.gridH; y++) g.rect(0, y * GRID, w, 1).fill({ color: 0x1f1d33 });
    // Border hazard stripes (alternating red/dark)
    for (let i = 0; i < Math.max(this.gridW, this.gridH); i++) {
      const stripe = i % 4 < 2 ? 0xff2e63 : 0x3a0a15;
      if (i < this.gridW) { g.rect(i * GRID + 2, 2, 6, 6).fill({ color: stripe }); g.rect(i * GRID + 2, h - 8, 6, 6).fill({ color: stripe }); }
      if (i < this.gridH) { g.rect(2, i * GRID + 2, 6, 6).fill({ color: stripe }); g.rect(w - 8, i * GRID + 2, 6, 6).fill({ color: stripe }); }
    }
    // Solid death border (2px)
    g.rect(0, 0, w, 2).fill({ color: 0xff2e63 }); g.rect(0, h - 2, w, 2).fill({ color: 0xff2e63 });
    g.rect(0, 0, 2, h).fill({ color: 0xff2e63 }); g.rect(w - 2, 0, 2, h).fill({ color: 0xff2e63 });
  }

  private drawWarpZoneBg(g: Graphics, w: number, h: number): void {
    // Starfield background
    g.rect(0, 0, w, h).fill({ color: 0x060615 });
    const starSeed = 42; let s = starSeed;
    for (let i = 0; i < 60; i++) {
      s = (s * 16807 + 0) % 2147483647;
      const sx = (s % w), sy = ((s * 13) % h);
      g.rect(sx, sy, 1, 1).fill({ color: 0x444477 });
    }
    // Portal borders with cyan glow + arrow indicators
    const borderColor = 0x08d9d6;
    g.rect(0, 0, w, 2).fill({ color: borderColor }); g.rect(0, h - 2, w, 2).fill({ color: borderColor });
    g.rect(0, 0, 2, h).fill({ color: borderColor }); g.rect(w - 2, 0, 2, h).fill({ color: borderColor });
    // Outer glow
    g.rect(0, 0, w, 1).fill({ color: 0x054a48 }); g.rect(0, 0, 1, h).fill({ color: 0x054a48 });
    g.rect(w - 1, 0, 1, h).fill({ color: 0x054a48 }); g.rect(0, h - 1, w, 1).fill({ color: 0x054a48 });
    // Arrow indicators on edges
    for (let i = 2; i < this.gridW - 2; i += 4) { g.rect(i * GRID + 3, 4, 4, 2).fill({ color: borderColor }); g.rect(i * GRID + 3, h - 6, 4, 2).fill({ color: borderColor }); }
    for (let i = 2; i < this.gridH - 2; i += 4) { g.rect(4, i * GRID + 3, 2, 4).fill({ color: borderColor }); g.rect(w - 6, i * GRID + 3, 2, 4).fill({ color: borderColor }); }
  }

  private drawMazeBg(g: Graphics, w: number, h: number): void {
    g.rect(0, 0, w, h).fill({ color: 0x1a1510 });
    // Stone floor grid
    for (let x = 0; x <= this.gridW; x++) g.rect(x * GRID, 0, 1, h).fill({ color: 0x2a2520 });
    for (let y = 0; y <= this.gridH; y++) g.rect(0, y * GRID, w, 1).fill({ color: 0x2a2520 });
    // Solid border
    g.rect(0, 0, w, 2).fill({ color: 0x4a3f35 }); g.rect(0, h - 2, w, 2).fill({ color: 0x4a3f35 });
    g.rect(0, 0, 2, h).fill({ color: 0x4a3f35 }); g.rect(w - 2, 0, 2, h).fill({ color: 0x4a3f35 });
    // Generate maze walls
    this.generateMazeWalls();
    // Torch dots at intersections
    for (let x = 5; x < this.gridW - 5; x += 6) {
      for (let y = 4; y < this.gridH - 4; y += 6) {
        if (!this.isWall(x, y)) { g.rect(x * GRID + 3, y * GRID + 3, 4, 4).fill({ color: 0xffde7d }); }
      }
    }
  }

  private mazeWalls: boolean[][] = [];
  private generateMazeWalls(): void {
    this.mazeWalls = Array.from({ length: this.gridW }, () => Array(this.gridH).fill(false));
    const rng = this.ctx.random;
    for (let x = 0; x < this.gridW; x++) for (let y = 0; y < this.gridH; y++) this.mazeWalls[x][y] = true;

    // Carve wide corridors (3 cells wide) using recursive backtracker
    const carvePath = (sx: number, sy: number) => {
      const stack: [number, number][] = [[sx, sy]];
      // Carve 5x5 starting room
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++)
          if (sx+dx >= 0 && sx+dx < this.gridW && sy+dy >= 0 && sy+dy < this.gridH)
            this.mazeWalls[sx+dx][sy+dy] = false;

      while (stack.length > 0) {
        const [cx, cy] = stack[stack.length - 1];
        // Step of 3 for wider corridors
        const dirs: [number, number][] = [[0,-3],[3,0],[0,3],[-3,0]];
        for (let i = dirs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i+1)); [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
        let carved = false;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx > 2 && nx < this.gridW - 3 && ny > 2 && ny < this.gridH - 3 && this.mazeWalls[nx][ny]) {
            // Clear 3-wide path
            for (let sx2 = 0; sx2 <= Math.abs(dx); sx2++) {
              for (let sy2 = 0; sy2 <= Math.abs(dy); sy2++) {
                const px = cx + Math.sign(dx) * Math.max(sx2, Math.abs(dy) > 0 ? 0 : sx2);
                const py = cy + Math.sign(dy) * Math.max(sy2, Math.abs(dx) > 0 ? 0 : sy2);
                // Clear 3 cells wide
                for (let w = -1; w <= 1; w++) {
                  const wx = dx === 0 ? px + w : px;
                  const wy = dy === 0 ? py + w : py;
                  if (wx > 0 && wx < this.gridW - 1 && wy > 0 && wy < this.gridH - 1) this.mazeWalls[wx][wy] = false;
                }
              }
            }
            // Clear 3x3 room at destination
            for (let rx = -1; rx <= 1; rx++)
              for (let ry = -1; ry <= 1; ry++)
                if (nx+rx > 0 && nx+rx < this.gridW-1 && ny+ry > 0 && ny+ry < this.gridH-1)
                  this.mazeWalls[nx+rx][ny+ry] = false;
            stack.push([nx, ny]);
            carved = true;
            break;
          }
        }
        if (!carved) stack.pop();
      }
    };

    // Carve 4 start regions
    carvePath(5, 4);
    carvePath(this.gridW - 6, this.gridH - 5);
    carvePath(this.gridW - 6, 4);
    carvePath(5, this.gridH - 5);

    // Connect with wide straight corridors
    const midY = Math.floor(this.gridH / 2);
    for (let x = 1; x < this.gridW - 1; x++)
      for (let w = -1; w <= 1; w++)
        this.mazeWalls[x][Math.min(this.gridH-2, Math.max(1, midY + w))] = false;

    const midX = Math.floor(this.gridW / 2);
    for (let y = 1; y < this.gridH - 1; y++)
      for (let w = -1; w <= 1; w++)
        this.mazeWalls[Math.min(this.gridW-2, Math.max(1, midX + w))][y] = false;

    // Clear 5x5 rooms at ALL start positions
    const startPositions: [number, number][] = [
      [5, 4], [this.gridW - 6, this.gridH - 5], [this.gridW - 6, 4], [5, this.gridH - 5]
    ];
    for (const [sx, sy] of startPositions) {
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) {
          const nx = sx + dx, ny = sy + dy;
          if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) this.mazeWalls[nx][ny] = false;
        }
    }

    // Render
    const g = this.bgGraphics;
    for (let x = 0; x < this.gridW; x++) {
      for (let y = 0; y < this.gridH; y++) {
        if (this.mazeWalls[x][y]) {
          g.rect(x * GRID, y * GRID, GRID, GRID).fill({ color: 0x4a3f35 });
          g.rect(x * GRID + 1, y * GRID + 1, GRID - 1, GRID - 1).fill({ color: 0x3a3028 });
          if (x % 2 === 0) g.rect(x * GRID, y * GRID + 4, GRID, 1).fill({ color: 0x2a2520 });
          if (y % 2 === 0) g.rect(x * GRID + 4, y * GRID, 1, GRID).fill({ color: 0x2a2520 });
        }
      }
    }
  }

  private isWall(x: number, y: number): boolean {
    if (x < 0 || x >= this.gridW || y < 0 || y >= this.gridH) return this.arena !== 'warp-zone' && this.arena !== 'abyss';
    if (this.arena === 'maze') return this.mazeWalls[x]?.[y] ?? false;
    return false;
  }

  private drawAbyssBg(g: Graphics, w: number, h: number): void {
    // Dark void
    g.rect(0, 0, w, h).fill({ color: 0x0a0a14 });
    // Floating island in center
    const fs = this.abyssFloorSize;
    const fx = Math.floor((this.gridW - fs) / 2), fy = Math.floor((this.gridH - fs) / 2);
    g.rect(fx * GRID, fy * GRID, fs * GRID, fs * GRID).fill({ color: 0x181725 });
    // Island grid
    for (let x = fx; x <= fx + fs; x++) g.rect(x * GRID, fy * GRID, 1, fs * GRID).fill({ color: 0x1f1d33 });
    for (let y = fy; y <= fy + fs; y++) g.rect(fx * GRID, y * GRID, fs * GRID, 1).fill({ color: 0x1f1d33 });
    // Cracked edge
    g.rect(fx * GRID, fy * GRID, fs * GRID, 2).fill({ color: 0xffde7d });
    g.rect(fx * GRID, (fy + fs) * GRID - 2, fs * GRID, 2).fill({ color: 0xffde7d });
    g.rect(fx * GRID, fy * GRID, 2, fs * GRID).fill({ color: 0xffde7d });
    g.rect((fx + fs) * GRID - 2, fy * GRID, 2, fs * GRID).fill({ color: 0xffde7d });
    // Init platforms in void
    this.abyssPlatforms = [];
    for (let i = 0; i < 3; i++) {
      const px = Math.floor(this.ctx.random() * (this.gridW - 4)) + 2;
      const py = fy - 3 - i * 4;
      const pg = new Graphics();
      this.drawPlatform(pg, px * GRID, py * GRID);
      this.gameContainer.addChild(pg);
      this.abyssPlatforms.push({ x: px, y: py, dx: i % 2 === 0 ? 1 : -1, graphics: pg });
    }
  }

  private drawPlatform(g: Graphics, x: number, y: number): void {
    g.clear();
    g.rect(x, y, GRID * 3, GRID).fill({ color: 0x8b6914 });
    g.rect(x + 2, y + 2, GRID * 3 - 4, GRID - 4).fill({ color: 0x6b4f10 });
    g.rect(x + 4, y + 1, 2, GRID - 2).fill({ color: 0xaa8530 });
  }

  private initArenaObstacles(): void {
    if (this.arena === 'warp-zone') this.initSpikeBlocks();
  }

  private initSpikeBlocks(): void {
    const positions = [[8,8],[this.gridW-10,8],[8,this.gridH-10],[this.gridW-10,this.gridH-10]];
    positions.forEach(([px, py]) => {
      const g = new Graphics(); this.gameContainer.addChild(g);
      this.obstacles.push({ x: px, y: py, w: 2, h: 2, graphics: g, rotationAngle: 0 });
    });
  }

  // ═══════════════════════════════════════════════════════
  // PARTICLE SYSTEM
  // ═══════════════════════════════════════════════════════

  private initParticlePool(): void {
    this.particles = Array.from({ length: 200 }, () => ({ x:0,y:0,vx:0,vy:0,lifeMs:0,color:0,size:2,alive:false }));
  }

  private emitParticles(x: number, y: number, color: number, count: number, speed: number, life: number): void {
    let emitted = 0;
    for (const p of this.particles) {
      if (emitted >= count) break;
      if (!p.alive) {
        const angle = this.ctx.random() * Math.PI * 2;
        p.x = x; p.y = y; p.alive = true; p.lifeMs = life;
        p.vx = Math.cos(angle) * speed * (0.5 + this.ctx.random() * 0.5);
        p.vy = Math.sin(angle) * speed * (0.5 + this.ctx.random() * 0.5);
        p.color = color; p.size = 2;
        emitted++;
      }
    }
  }

  private sparkleAt(x: number, y: number, color: number): void {
    this.emitParticles(x * GRID + GRID / 2, y * GRID + GRID / 2, color, 4, 20, 500);
  }

  // ═══════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════

  start(): void { this.state = 'Playing'; }

  update(dt: number): void {
    if (this.state !== 'Playing') return;
    this.processInput();
    if (this.showInfo) { this.renderAll(); return; }
    this.gameTimeMs += dt * 1000;
    this.updateDashCooldowns(dt);
    this.updatePowerUpTimers(dt);
    this.updateObstacles(dt);
    this.updateAbyss(dt);

    const speedMult = this.ctx.modifiers.speedMultiplier ?? 1.0;
    const arenaMult = this.arena === 'maze' ? 0.6 : 1.0; // maze is 60% speed
    this.moveTimer += dt;
    const interval = STEP_INTERVAL / (speedMult * arenaMult);
    if (this.moveTimer >= interval) {
      this.moveTimer -= interval;
      this.stepGrid();
      this.spawnCycle();
    }

    this.updateParticles(dt);
    this.updateKillFeed(dt);
    this.updateScreenShake(dt);
    this.renderAll();
  }

  pause(): void { this.state = 'Paused'; }
  resume(): void { this.state = 'Playing'; }

  destroy(): void {
    this.state = 'Destroyed';
    this.snakes.forEach(s => { s.graphics.destroy(); s.container.destroy(); });
    this.foods.forEach(f => f.graphics.destroy());
    this.obstacles.forEach(o => o.graphics.destroy());
    this.powerUpsOnField.forEach(p => p.graphics.destroy());
    this.cloneTraps.forEach(t => t.graphics.destroy());
    this.abyssPlatforms.forEach(p => p.graphics.destroy());
    this.bgGraphics?.destroy(); this.gameContainer?.destroy(); this.legendContainer?.destroy();
    this.snakes = []; this.foods = []; this.obstacles = []; this.particles = [];
    this.powerUpsOnField = []; this.cloneTraps = [];
  }

  // ═══════════════════════════════════════════════════════
  // INPUT PROCESSING
  // ═══════════════════════════════════════════════════════

  private processInput(): void {
    // Info toggle: only check once (all players share Tab key)
    const firstSnake = this.snakes[0];
    if (firstSnake?.isAlive) {
      const fi = this.ctx.input.getPlayer(firstSnake.id);
      if (fi.isJustPressed('info')) this.showInfo = !this.showInfo;
    }

    this.snakes.forEach(snake => {
      if (!snake.isAlive) return;
      const input = this.ctx.input.getPlayer(snake.id);

      if (input.isJustPressed('pause')) { this.ctx.events.emit('game:pause', undefined); return; }
      if (this.showInfo) return;
      const confused = snake.activePowerUps.has('confuse');
      const left = input.isJustPressed('moveLeft');
      const right = input.isJustPressed('moveRight');

      if (confused ? right : left) {
        snake.dir = this.turnLeft(snake.dir);
        this.ctx.audio.playTone(350 + snake.id * 40, 'sine', 0.04);
      }
      if (confused ? left : right) {
        snake.dir = this.turnRight(snake.dir);
        this.ctx.audio.playTone(450 + snake.id * 40, 'sine', 0.04);
      }

      // Dash
      if (input.isJustPressed('action') && snake.dashCooldownMs <= 0 && snake.body.length > 4) {
        this.executeDash(snake);
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // DASH SYSTEM
  // ═══════════════════════════════════════════════════════

  private executeDash(snake: Snake): void {
    // Remove 2 tail segments as dash cost
    snake.body.pop(); snake.body.pop();
    // Move 2 steps forward
    const [dx, dy] = this.dirDelta(snake.dir);
    const h = snake.body[0];
    const p1 = { x: h.x + dx, y: h.y + dy };
    const p2 = { x: h.x + dx * 2, y: h.y + dy * 2 };
    // After-image trail
    for (let i = 0; i < 4; i++) {
      const tx = (h.x + p2.x) / 2 + Math.floor((this.ctx.random() - 0.5) * 3);
      const ty = (h.y + p2.y) / 2 + Math.floor((this.ctx.random() - 0.5) * 3);
      this.emitParticles(tx * GRID + 5, ty * GRID + 5, this.parseHex(snake.color), 6, 15, 350);
    }
    // Check final position
    snake.body.unshift(p1); snake.body.unshift(p2);
    const finalHead = snake.body[0];
    let died = false;
    // Wall check
    if (this.isWall(finalHead.x, finalHead.y)) died = true;
    // Obstacle check
    if (!died) {
      for (const o of this.obstacles) {
        for (let ox = o.x; ox < o.x + o.w; ox++)
          for (let oy = o.y; oy < o.y + o.h; oy++)
            if (ox === finalHead.x && oy === finalHead.y) { died = true; break; }
        if (died) break;
      }
    }
    // Head-to-head check
    if (!died) {
      this.snakes.forEach(other => {
        if (other === snake || !other.isAlive) return;
        if (other.body[0].x === finalHead.x && other.body[0].y === finalHead.y) {
          if (!snake.activePowerUps.has('invincible') && !snake.activePowerUps.has('ghost')) died = true;
        }
      });
    }
    // Body check (dash kills opponent if body hit)
    if (!died) {
      this.snakes.forEach(other => {
        if (other === snake || !other.isAlive) return;
        other.body.forEach((seg, idx) => {
          if (idx === 0) return;
          if (seg.x === finalHead.x && seg.y === finalHead.y) {
            this.eliminateSnake(other, snake.id);
          }
        });
      });
    }
    if (died) {
      this.eliminateSnake(snake, -1);
      this.addKillFeed(`P${snake.id} DASHED TO DEATH`, this.parseHex('#ff2e63'));
    } else {
      this.ctx.audio.playTone(600, 'square', 0.08);
      this.addKillFeed(`P${snake.id} DASH`, this.parseHex(snake.color));
    }
    snake.dashCooldownMs = 2500;
  }

  private updateDashCooldowns(dt: number): void {
    this.snakes.forEach(s => {
      if (s.dashCooldownMs > 0) s.dashCooldownMs -= dt * 1000;
    });
  }

  // ═══════════════════════════════════════════════════════
  // GRID STEP
  // ═══════════════════════════════════════════════════════

  private stepGrid(): void {
    // Move all snakes
    this.snakes.forEach(snake => {
      if (!snake.isAlive) return;
      const [dx, dy] = this.dirDelta(snake.dir);
      const head = snake.body[0];
      let nx = head.x + dx, ny = head.y + dy;
      // Warp zone wrapping
      if (this.arena === 'warp-zone') {
        if (nx < 0) { nx = this.gridW - 1; this.ctx.audio.playTone(880, 'sine', 0.03); }
        if (nx >= this.gridW) { nx = 0; this.ctx.audio.playTone(880, 'sine', 0.03); }
        if (ny < 0) { ny = this.gridH - 1; this.ctx.audio.playTone(880, 'sine', 0.03); }
        if (ny >= this.gridH) { ny = 0; this.ctx.audio.playTone(880, 'sine', 0.03); }
      }
      snake.body.unshift({ x: nx, y: ny });
      // Magnet: pull nearby food toward head
      if (snake.activePowerUps.has('magnet')) {
        this.foods.forEach(f => {
          const dist = Math.abs(f.x - nx) + Math.abs(f.y - ny);
          if (dist <= 3 && dist > 0) {
            if (f.x < nx) f.x++; else if (f.x > nx) f.x--;
            else if (f.y < ny) f.y++; else if (f.y > ny) f.y--;
            f.graphics.x = f.x * GRID; f.graphics.y = f.y * GRID;
          }
        });
      }
      // Check food
      const foodIdx = this.foods.findIndex(f => f.x === nx && f.y === ny);
      if (foodIdx >= 0) {
        const food = this.foods[foodIdx];
        this.eatFood(snake, food);
        this.foods.splice(foodIdx, 1);
        food.graphics.destroy();
      } else {
        snake.body.pop();
      }
      // Check power-up pickup
      const puIdx = this.powerUpsOnField.findIndex(p => p.x === nx && p.y === ny);
      if (puIdx >= 0) {
        const pu = this.powerUpsOnField[puIdx];
        this.applyPowerUp(snake, pu.type);
        this.powerUpsOnField.splice(puIdx, 1);
        pu.graphics.destroy();
      }
    });

    // Move clone traps
    this.cloneTraps.forEach(trap => {
      const [dx, dy] = this.dirDelta(trap.dir);
      const head = trap.body[0]; const nx = head.x + dx, ny = head.y + dy;
      if (this.arena === 'warp-zone') {
        // wrap clone traps too
      }
      trap.body.unshift({ x: nx, y: ny }); trap.body.pop();
      trap.lifeMs -= STEP_INTERVAL * 1000;
      // Check if clone hits a real snake
      this.snakes.forEach(s => {
        if (!s.isAlive) return;
        if (s.body[0].x === nx && s.body[0].y === ny) {
          if (!s.activePowerUps.has('invincible') && !s.activePowerUps.has('ghost')) {
            this.eliminateSnake(s, -1);
          }
        }
      });
    });
    // Remove dead clones
    this.cloneTraps = this.cloneTraps.filter(t => {
      if (t.lifeMs <= 0) { t.graphics.destroy(); return false; }
      return true;
    });

    // Collision detection
    this.snakes.forEach(snake => {
      if (!snake.isAlive) return;
      const head = snake.body[0];
      // Wall collision (skip for warp zone and abyss borders)
      if (this.isWall(head.x, head.y)) {
        this.eliminateSnake(snake, -1);
        return;
      }
      // Abyss: outside floating island = void death
      if (this.arena === 'abyss') {
        const fs = this.abyssFloorSize;
        const fx = Math.floor((this.gridW - fs) / 2), fy = Math.floor((this.gridH - fs) / 2);
        if (head.x < fx || head.x >= fx + fs || head.y < fy || head.y >= fy + fs) {
          this.eliminateSnake(snake, -1);
          return;
        }
      }
      // Obstacle collision
      for (const o of this.obstacles) {
        for (let ox = o.x; ox < o.x + o.w; ox++)
          for (let oy = o.y; oy < o.y + o.h; oy++)
            if (ox === head.x && oy === head.y) { this.eliminateSnake(snake, -1); return; }
      }
      // Body collision (self + other snakes)
      if (!snake.activePowerUps.has('invincible')) {
        this.snakes.forEach(other => {
          if (!other.isAlive || snake === other) return;
          // Head-to-head
          if (!snake.activePowerUps.has('ghost') && other.body[0].x === head.x && other.body[0].y === head.y) {
            if (!other.activePowerUps.has('invincible')) { this.eliminateSnake(other, snake.id); }
            this.eliminateSnake(snake, other.id);
            return;
          }
          // Head-to-body (snake hits other's body)
          other.body.forEach((seg, idx) => {
            if (idx === 0) return;
            if (seg.x === head.x && seg.y === head.y) {
              if (snake.activePowerUps.has('ghost')) return; // ghost phases through
              this.eliminateSnake(snake, other.id);
            }
          });
        });
      }
      // Self-collision (head hits own body)
      if (!snake.activePowerUps.has('invincible') && !snake.activePowerUps.has('ghost')) {
        snake.body.forEach((seg, idx) => {
          if (idx === 0) return;
          if (seg.x === head.x && seg.y === head.y) this.eliminateSnake(snake, -1);
        });
      }
    });

    // Check round end
    if (this.aliveCount <= 1 && this.snakes.length > 1) {
      const winner = this.snakes.find(s => s.isAlive) ?? this.snakes[0];
      if (winner.isAlive) {
        const score = winner.body.length * 10 + winner.kills * 25 + 50;
        this.standings.unshift({ playerId: winner.id, score });
      }
      this.state = 'Finished';
      this.ctx.audio.playTone(700, 'sine', 0.4);
      this.ctx.events.emit('game:over', { winnerId: winner.id, standings: this.standings });
    }
  }

  private dirDelta(dir: Direction): [number, number] {
    switch (dir) {
      case 'UP': return [0, -1]; case 'DOWN': return [0, 1];
      case 'LEFT': return [-1, 0]; case 'RIGHT': return [1, 0];
    }
  }

  // ═══════════════════════════════════════════════════════
  // ELIMINATION & DEATH DROPS
  // ═══════════════════════════════════════════════════════

  private eliminateSnake(snake: Snake, killerId: number): void {
    if (!snake.isAlive) return;
    snake.isAlive = false; snake.container.visible = false;
    this.aliveCount--;
    this.ctx.audio.playTone(100 + snake.id * 20, 'sawtooth', 0.3);
    this.triggerShake(6);
    const hexColor = this.parseHex(snake.color);
    this.emitParticles(snake.body[0].x * GRID + 5, snake.body[0].y * GRID + 5, hexColor, 16, 50, 500);

    const score = snake.body.length * 10 + snake.kills * 25;
    this.standings.unshift({ playerId: snake.id, score });
    this.ctx.events.emit('player:eliminated', {
      playerId: snake.id, rank: this.aliveCount + 1,
      position: { x: snake.body[0].x * GRID, y: snake.body[0].y * GRID },
    });

    if (killerId > 0) {
      const killer = this.snakes.find(s => s.id === killerId);
      if (killer) { killer.kills++;
        this.addKillFeed(`P${killerId} KILLED P${snake.id}`, this.parseHex(killer.color));
      }
    }

    // Death drop: body converts to food
    snake.body.forEach((seg, idx) => {
      if (idx % 3 === 0) {
        const type = idx % 5 === 0 ? 'golden' : 'apple';
        this.spawnFoodAt(seg.x, seg.y, type, true);
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // POWER-UP SYSTEM
  // ═══════════════════════════════════════════════════════

  private spawnCycle(): void {
    this.powerUpTimer += STEP_INTERVAL * 1000;
    if (this.powerUpTimer >= 9000 && this.powerUpsOnField.length < 2) {
      this.powerUpTimer = 0;
      const types: PowerUpType[] = ['speed','shield','invincible','shrink','magnet','confuse','ghost','clone'];
      const type = types[Math.floor(this.ctx.random() * types.length)];
      let px: number, py: number; let attempts = 0;
      do {
        px = Math.floor(this.ctx.random() * (this.gridW - 4)) + 2;
        py = Math.floor(this.ctx.random() * (this.gridH - 4)) + 2;
        attempts++;
      } while (attempts < 20 && (this.isOccupied(px, py) || this.isWall(px, py)));
      const g = new Graphics();
      this.drawPowerUp(g, 0, 0, type);
      g.x = px * GRID; g.y = py * GRID;
      this.gameContainer.addChild(g);
      this.powerUpsOnField.push({ x: px, y: py, type, graphics: g, lifeMs: 14000 });
    }
    // Obstacle spawns (Battle Pit rocks)
    if (this.arena === 'battle-pit') {
      this.obstacleTimer += STEP_INTERVAL * 1000;
      if (this.obstacleTimer >= 14000 && this.obstacles.length < 8) {
        this.obstacleTimer = 0;
        const ox = Math.floor(this.ctx.random() * (this.gridW - 5)) + 2;
        const oy = Math.floor(this.ctx.random() * (this.gridH - 5)) + 2;
        // Don't spawn on snakes
        const blocked = this.snakes.some(s => s.isAlive && s.body.some(seg => Math.abs(seg.x - ox) <= 2 && Math.abs(seg.y - oy) <= 2));
        if (!blocked) {
          const g = new Graphics(); this.drawRock(g, ox * GRID, oy * GRID);
          this.gameContainer.addChild(g);
          this.obstacles.push({ x: ox, y: oy, w: 2, h: 2, graphics: g });
        }
      }
    }
    // Food spawn
    if (this.foods.length < 4) {
      const r = this.ctx.random();
      const type: FoodType = r < 0.65 ? 'apple' : r < 0.82 ? 'golden' : r < 0.92 ? 'poison' : 'superfood';
      this.spawnFood(type);
    }
  }

  private applyPowerUp(snake: Snake, type: PowerUpType): void {
    const durations: Record<PowerUpType, number> = { speed: 5000, shield: 999999, invincible: 3500, shrink: 0, magnet: 6000, confuse: 4000, ghost: 4500, clone: 0 };
    this.ctx.audio.playTone(660, 'triangle', 0.08);
    this.sparkleAt(snake.body[0].x, snake.body[0].y, this.parseHex(snake.color));

    switch (type) {
      case 'shield': case 'speed': case 'invincible': case 'magnet': case 'confuse': case 'ghost':
        snake.activePowerUps.set(type, { type, remainingMs: durations[type] });
        this.addKillFeed(`P${snake.id} ${type.toUpperCase()}`, this.powerUpColor(type));
        break;
      case 'shrink':
        // Remove 3 segments from all OTHER alive snakes
        this.snakes.forEach(s => {
          if (s !== snake && s.isAlive && s.body.length > 3) {
            s.body.pop(); s.body.pop(); s.body.pop();
            this.sparkleAt(s.body[0].x, s.body[0].y, 0xa7a9be);
            if (s.body.length <= 2) this.eliminateSnake(s, snake.id);
          }
        });
        this.addKillFeed(`P${snake.id} SHRINK RAY`, this.powerUpColor('shrink'));
        break;
      case 'clone':
        this.dropCloneTrap(snake);
        break;
    }
  }

  private dropCloneTrap(snake: Snake): void {
    const head = snake.body[0];
    const body: Segment[] = [{x:head.x,y:head.y},{x:head.x,y:head.y},{x:head.x,y:head.y}];
    const g = new Graphics();
    this.gameContainer.addChild(g);
    this.cloneTraps.push({ body, dir: snake.dir, color: '#ffde7d', lifeMs: 8000, graphics: g });
    this.addKillFeed(`P${snake.id} CLONE TRAP`, 0xffde7d);
    this.ctx.audio.playTone(500, 'square', 0.1);
  }

  private updatePowerUpTimers(dt: number): void {
    this.snakes.forEach(snake => {
      if (!snake.isAlive) return;
      snake.activePowerUps.forEach((pu, key) => {
        pu.remainingMs -= dt * 1000;
        if (pu.remainingMs <= 0) snake.activePowerUps.delete(key);
      });
    });
    // Expire field power-ups
    this.powerUpsOnField.forEach(p => p.lifeMs -= dt * 1000);
    const expired = this.powerUpsOnField.filter(p => p.lifeMs <= 0);
    expired.forEach(p => { p.graphics.destroy(); this.sparkleAt(p.x, p.y, 0xfffffe); });
    this.powerUpsOnField = this.powerUpsOnField.filter(p => p.lifeMs > 0);
    // Expire temp foods
    this.foods.forEach(f => { if (f.lifeMs > 0) f.lifeMs -= dt * 1000; });
    this.foods = this.foods.filter(f => { if (f.lifeMs <= 0 && f.lifeMs !== -1) { f.graphics.destroy(); return false; } return true; });
  }

  // ═══════════════════════════════════════════════════════
  // OBSTACLE UPDATES
  // ═══════════════════════════════════════════════════════

  private updateObstacles(dt: number): void {
    if (this.arena === 'warp-zone') {
      // Rotate spike blocks
      this.obstacles.forEach(o => {
        o.rotationAngle = (o.rotationAngle ?? 0) + dt * 0.8;
        const g = o.graphics; g.clear();
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            g.rect((o.x + dx) * GRID, (o.y + dy) * GRID, GRID, GRID).fill({ color: 0x7160e8 });
            g.rect((o.x + dx) * GRID + 1, (o.y + dy) * GRID + 1, GRID - 2, GRID - 2).fill({ color: 0x5040c0 });
          }
        }
        // Extend spikes outward based on rotation angle
        const spikeDir = Math.floor((o.rotationAngle % (Math.PI * 2)) / (Math.PI / 2));
        // Make the spike tile deadly in the direction it's pointing
        o.w = 2; o.h = 2;
        if (spikeDir === 0) { o.w = 3; g.rect((o.x + 2) * GRID, (o.y) * GRID, GRID, GRID).fill({ color: 0xff2e63 }); }
        else if (spikeDir === 1) { o.h = 3; g.rect((o.x) * GRID, (o.y + 2) * GRID, GRID, GRID).fill({ color: 0xff2e63 }); }
        else if (spikeDir === 2) { o.x -= 0; o.w = 3; g.rect((o.x - 1) * GRID, (o.y) * GRID, GRID, GRID).fill({ color: 0xff2e63 }); }
        else { o.y -= 0; o.h = 3; g.rect((o.x) * GRID, (o.y - 1) * GRID, GRID, GRID).fill({ color: 0xff2e63 }); }
      });
    }
  }

  private updateAbyss(dt: number): void {
    if (this.arena !== 'abyss') return;
    this.abyssCrumbTimer += dt * 1000;
    if (this.abyssCrumbTimer >= 3000 && this.abyssFloorSize > 6) {
      this.abyssCrumbTimer = 0;
      this.abyssFloorSize -= 1;
      this.bgGraphics.clear();
      const w = this.gridW * GRID, h = this.gridH * GRID;
      this.bgGraphics.rect(0, 0, w, h).fill({ color: 0x0a0a14 });
      const fs = this.abyssFloorSize;
      const fx = Math.floor((this.gridW - fs) / 2), fy = Math.floor((this.gridH - fs) / 2);
      this.bgGraphics.rect(fx * GRID, fy * GRID, fs * GRID, fs * GRID).fill({ color: 0x181725 });
      for (let x = fx; x <= fx + fs; x++) this.bgGraphics.rect(x * GRID, fy * GRID, 1, fs * GRID).fill({ color: 0x1f1d33 });
      for (let y = fy; y <= fy + fs; y++) this.bgGraphics.rect(fx * GRID, y * GRID, fs * GRID, 1).fill({ color: 0x1f1d33 });
      this.bgGraphics.rect(fx * GRID, fy * GRID, fs * GRID, 2).fill({ color: 0xffde7d80 });
      this.bgGraphics.rect(fx * GRID, (fy + fs) * GRID - 2, fs * GRID, 2).fill({ color: 0xffde7d80 });
      this.bgGraphics.rect(fx * GRID, fy * GRID, 2, fs * GRID).fill({ color: 0xffde7d80 });
      this.bgGraphics.rect((fx + fs) * GRID - 2, fy * GRID, 2, fs * GRID).fill({ color: 0xffde7d80 });
      this.ctx.audio.playTone(60, 'sawtooth', 0.15);
    }
    // Moving platforms
    this.abyssPlatforms.forEach(p => {
      p.x += p.dx * dt * 0.4;
      if (p.x > this.gridW - 4 || p.x < 2) p.dx *= -1;
      p.graphics.x = Math.round(p.x) * GRID; p.graphics.y = p.y * GRID;
    });
  }

  // ═══════════════════════════════════════════════════════
  // FOOD SYSTEM
  // ═══════════════════════════════════════════════════════

  private spawnFood(type: FoodType): void {
    let x: number, y: number, attempts = 0;
    do {
      x = Math.floor(this.ctx.random() * (this.gridW - 4)) + 2;
      y = Math.floor(this.ctx.random() * (this.gridH - 4)) + 2;
      attempts++;
    } while (attempts < 30 && (this.isOccupied(x, y) || this.isWall(x, y)));
    this.spawnFoodAt(x, y, type, false);
  }

  private spawnFoodAt(x: number, y: number, type: FoodType, isDeathDrop: boolean): void {
    const g = new Graphics();
    this.drawFood(g, 0, 0, type);
    g.x = x * GRID; g.y = y * GRID;
    this.gameContainer.addChild(g);
    this.foods.push({ x, y, type, graphics: g, lifeMs: isDeathDrop ? 18000 : -1 });
  }

  private eatFood(snake: Snake, food: FoodItem): void {
    snake.foodEaten++;
    switch (food.type) {
      case 'apple':
        this.ctx.audio.playTone(550, 'triangle', 0.1);
        // Already grown (tail not popped)
        break;
      case 'golden':
        this.ctx.audio.playTone(700, 'triangle', 0.12);
        // Grow 3 total (2 extra beyond the 1 not popped)
        for (let i = 0; i < 2; i++) {
          const tail = snake.body[snake.body.length - 1];
          snake.body.push({ x: tail.x, y: tail.y });
        }
        this.sparkleAt(food.x, food.y, 0xffde7d);
        break;
      case 'poison':
        this.ctx.audio.playTone(120, 'sawtooth', 0.15);
        // Shrink 2 segments
        if (snake.body.length > 3) { snake.body.pop(); snake.body.pop(); }
        else { this.eliminateSnake(snake, -1); return; }
        this.sparkleAt(food.x, food.y, 0x7160e8);
        break;
      case 'superfood':
        this.ctx.audio.playTone(880, 'triangle', 0.15);
        for (let i = 0; i < 4; i++) {
          const tail = snake.body[snake.body.length - 1];
          snake.body.push({ x: tail.x, y: tail.y });
        }
        this.sparkleAt(food.x, food.y, 0x08d9d6);
        break;
    }
  }

  private isOccupied(x: number, y: number): boolean {
    return this.snakes.some(s => s.isAlive && s.body.some(seg => seg.x === x && seg.y === y))
      || this.foods.some(f => f.x === x && f.y === y)
      || this.powerUpsOnField.some(p => p.x === x && p.y === y)
      || this.obstacles.some(o => { for (let ox=o.x;ox<o.x+o.w;ox++) for (let oy=o.y;oy<o.y+o.h;oy++) if (ox===x&&oy===y) return true; return false; });
  }

  // ═══════════════════════════════════════════════════════
  // SCREEN SHAKE
  // ═══════════════════════════════════════════════════════

  private triggerShake(intensity: number): void { this.shakeIntensity = Math.max(this.shakeIntensity, intensity); }

  private updateScreenShake(dt: number): void {
    if (this.shakeIntensity < 0.3) { this.shakeIntensity = 0; this.gameContainer.position.set(0, 0); return; }
    this.gameContainer.position.set(
      Math.round((this.ctx.random() * 2 - 1) * this.shakeIntensity),
      Math.round((this.ctx.random() * 2 - 1) * this.shakeIntensity)
    );
    this.shakeIntensity *= 0.82;
  }

  // ═══════════════════════════════════════════════════════
  // KILL FEED
  // ═══════════════════════════════════════════════════════

  private addKillFeed(msg: string, color: number): void {
    this.killFeed.unshift({ msg, color, lifeMs: 2500 });
    if (this.killFeed.length > 4) this.killFeed.length = 4;
  }

  private updateKillFeed(dt: number): void {
    this.killFeed.forEach(e => e.lifeMs -= dt * 1000);
    this.killFeed = this.killFeed.filter(e => e.lifeMs > 0);
  }

  // ═══════════════════════════════════════════════════════
  // PARTICLES UPDATE
  // ═══════════════════════════════════════════════════════

  private updateParticles(dt: number): void {
    this.particles.forEach(p => {
      if (!p.alive) return;
      p.lifeMs -= dt * 1000;
      if (p.lifeMs <= 0) { p.alive = false; return; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
  }

  // ═══════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════

  private renderAll(): void {
    if (this.showInfo) {
      this.renderSnakesOnly();
      this.drawInfoOverlay();
      return;
    }
    // Snakes
    this.snakes.forEach(snake => {
      if (!snake.isAlive) return;
      this.renderSnake(snake.graphics, snake);
    });
    // Clone traps
    this.cloneTraps.forEach(trap => {
      const g = trap.graphics; g.clear();
      trap.body.forEach((seg, idx) => {
        if (idx === 0) {
          g.rect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2).fill({ color: 0xffde7d });
          g.rect(seg.x * GRID + 3, seg.y * GRID + 3, 2, 2).fill({ color: 0xfffffe });
        } else {
          g.rect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2).fill({ color: 0xffde7d });
        }
      });
    });
    // Particles + hint bar
    const pg = this.fxContainer; pg.removeChildren();

    this.particles.forEach(p => {
      if (!p.alive) return;
      const g = new Graphics();
      g.rect(Math.round(p.x), Math.round(p.y), p.size, p.size).fill({ color: p.color });
      pg.addChild(g);
    });
    // Kill feed (top center, drawn as colored dots and abbreviated text indicators)
    if (this.killFeed.length > 0) {
      const fg = new Graphics();
      this.killFeed.slice(0, 4).forEach((entry, i) => {
        const alpha = Math.min(1, entry.lifeMs / 500);
        const y = 20 + i * 14;
        fg.rect(2, y, 8, 8).fill({ color: entry.color });
        // Draw pixel-text indicator — simple colored bar with message
        const labelX = 14;
        // Use rectangle blocks for letters (rough pixel text)
        const chars = entry.msg.substring(0, 12);
        for (let c = 0; c < chars.length; c++) {
          const charX = labelX + c * 6;
          fg.rect(charX, y + 2, 4, 4).fill({ color: 0xfffffe });
        }
      });
      this.fxContainer.addChild(fg);
    }

    // Bottom item legend HUD
    this.drawItemLegend();
  }

  private renderSnakesOnly(): void {
    this.snakes.forEach(snake => {
      if (!snake.isAlive) return;
      this.renderSnake(snake.graphics, snake);
    });
  }

  private drawInfoOverlay(): void {
    const g = new Graphics();
    const W = 480, H = 270;
    const S = 1;

    // Background
    g.rect(0, 0, W, H).fill({ color: 0x0a0a14 });

    // Title
    this.drawPixelText(g, 'SNAKE ARENA INFO', 4, 4, 0xffde7d, S);
    this.drawPixelText(g, '[TAB] TO CLOSE', 100, 4, 0xa7a9be, S);

    // === CONTROLS ===
    let y = 16;
    this.drawPixelText(g, 'CONTROLS', 4, y, 0x2af598, S); y += 8;
    this.drawPixelText(g, 'P1: A/D turn, W dash, ESC pause', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'P2: L/R turn, UP dash, ESC pause', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'P3: J/L turn, I dash, ESC pause', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'P4: 4/6 turn, 8 dash, ESC pause', 6, y, 0xfffffe, S); y += 8;

    // === FOOD ===
    this.drawPixelText(g, 'FOOD TYPES', 4, y, 0xff2e63, S); y += 8;
    const fd: [FoodType, string, string][] = [
      ['apple', 'APPLE', '+1 segment, 10 points'],
      ['golden', 'GOLDEN APPLE', '+3 segments, 30 points'],
      ['poison', 'POISON SHROOM', '-2 segments, KILLS at length<3'],
      ['superfood', 'SUPER DIAMOND', '+5 segments, 50 points'],
    ];
    fd.forEach(([type, name, desc]) => {
      this.drawFood(g, 6, y, type);
      this.drawPixelText(g, name, 20, y + 1, 0xfffffe, S);
      this.drawPixelText(g, desc, 20, y + 7, 0xa7a9be, S);
      y += 14;
    });
    y += 4;

    // === POWER-UPS ===
    this.drawPixelText(g, 'POWER-UPS', 4, y, 0x2af598, S); y += 8;
    const pd: [PowerUpType, string, string][] = [
      ['speed', 'SPEED BOOST', '2x movement speed for 5 seconds'],
      ['shield', 'SHIELD', 'Blocks ONE fatal collision, then gone'],
      ['invincible', 'INVINCIBILITY', 'Pass through walls + bodies 3.5s'],
      ['shrink', 'SHRINK RAY', 'Removes 3 segments from ALL opponents'],
      ['magnet', 'MAGNET', 'Pulls nearby food toward you for 6s'],
      ['confuse', 'CONFUSE', 'Reverses ALL opponents controls 4s'],
      ['ghost', 'GHOST', 'Phase through other snakes 4.5s'],
      ['clone', 'CLONE TRAP', 'Drops a decoy snake that kills others'],
    ];
    pd.forEach(([type, name, desc], i) => {
      const col = (i % 2) * 235;
      const row = Math.floor(i / 2);
      const rx = 4 + col, ry = y + row * 13;
      this.drawPowerUp(g, rx + 1, ry + 2, type);
      this.drawPixelText(g, name, rx + 14, ry + 1, 0xfffffe, S);
      this.drawPixelText(g, desc, rx + 14, ry + 7, 0x6b6d82, S);
    });
    y += 4 * 13 + 4;

    // === ARENAS ===
    this.drawPixelText(g, 'ARENAS', 4, y, 0xffde7d, S); y += 8;
    this.drawPixelText(g, 'BATTLE PIT: Red border walls, rocks fall', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'WARP ZONE: Wrap edges, rotating spikes', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'MAZE: Procedural stone walls, tight corr.', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'ABYSS: Floor crumbles, moving platforms', 6, y, 0xfffffe, S); y += 8;

    // === DASH ===
    this.drawPixelText(g, 'DASH', 4, y, 0x08d9d6, S); y += 8;
    this.drawPixelText(g, 'Press ACTION to burst 2 steps forward', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'Costs 2 tail segments. 2.5s cooldown.', 6, y, 0xfffffe, S); y += 6;
    this.drawPixelText(g, 'Dashing through bodies KILLS opponents!', 6, y, 0xff2e63, S);

    this.legendContainer.removeChildren();
    this.legendContainer.addChild(g);
  }

  // ═══════════════════════════════════════════════════════
  // PIXEL FONT & ITEM LEGEND HUD
  // ═══════════════════════════════════════════════════════

  // 3x5 pixel font — only uppercase A-Z, 0-9, space, dash
  private drawPixelText(g: Graphics, text: string, cx: number, cy: number, color: number, scale: number = 1): number {
    const s = scale;
    let x = cx;
    for (const ch of text.toUpperCase()) {
      const glyph = this.pixelGlyph(ch);
      if (glyph) {
        for (const [gx, gy] of glyph) {
          g.rect(x + gx * s, cy + gy * s, s, s).fill({ color });
        }
        x += 4 * s; // glyph width + gap
      } else if (ch === ' ') {
        x += 4 * s;
      }
    }
    return x;
  }

  private pixelGlyph(ch: string): [number, number][] | null {
    const G: Record<string, [number, number][]> = {
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
      '0': [[0,1],[0,2],[0,3],[1,0],[1,4],[2,1],[2,2],[2,3]],
      '1': [[0,0],[1,0],[1,1],[1,2],[1,3],[1,4],[2,4]],
      '2': [[0,0],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,4]],
      '3': [[0,0],[0,4],[1,0],[1,2],[1,4],[2,0],[2,1],[2,3],[2,4]],
      '4': [[0,0],[0,1],[0,2],[1,2],[2,0],[2,1],[2,2],[2,3],[2,4]],
      '5': [[0,0],[0,1],[0,2],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,3],[2,4]],
      '6': [[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,1],[2,2],[2,3],[2,4]],
      '7': [[0,0],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0]],
      '8': [[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4]],
      '9': [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2],[2,3],[2,4],[1,4]],
      '(': [[1,0],[1,4],[0,1],[0,2],[0,3]],
      ')': [[0,0],[0,4],[1,1],[1,2],[1,3]],
      '+': [[1,0],[1,1],[1,2],[1,3],[1,4],[0,2],[2,2]],
      '-': [[1,2],[0,2],[2,2]],
      '.': [[1,4]],
    };
    return G[ch] ?? null;
  }

  private drawItemLegend(): void {
    const g = new Graphics();
    const lx = this.gridW * GRID + 2;
    const PW = 58;
    const H = this.gridH * GRID;
    const S = 1;

    g.rect(lx - 2, 0, PW, H).fill({ color: 0x0c0c1a });
    g.rect(lx - 2, 0, 1, H).fill({ color: 0x2a2550 });

    let cy = 4;
    this.drawPixelText(g, 'FOOD', lx + 2, cy, 0xff2e63, S);
    cy += 7;

    const foods: [FoodType, string][] = [
      ['apple', '+1'], ['golden', '+3'], ['poison', '-2'], ['superfood', '+5'],
    ];
    foods.forEach(([type, label]) => {
      this.drawFood(g, lx + 2, cy, type);
      this.drawPixelText(g, label, lx + 14, cy + 2, 0xfffffe, S);
      cy += 10;
    });

    cy += 6;
    this.drawPixelText(g, 'PWR', lx + 2, cy, 0x2af598, S);
    cy += 7;

    const pus: [PowerUpType, string][] = [
      ['speed','SP'],['shield','SL'],['invincible','IN'],['shrink','SH'],
      ['magnet','MG'],['confuse','CF'],['ghost','GH'],['clone','CL'],
    ];
    pus.forEach(([type, label], i) => {
      const col = lx + 2 + (i % 2) * 28;
      const row = cy + Math.floor(i / 2) * 11;
      this.drawPowerUp(g, col, row + 1, type);
      this.drawPixelText(g, label, col + 12, row + 3, 0xfffffe, S);
    });

    this.legendContainer.removeChildren();
    this.legendContainer.addChild(g);
  }

  private renderSnake(g: Graphics, snake: Snake): void {
    g.clear();
    const hexColor = this.parseHex(snake.color);
    const len = snake.body.length;

    // Draw tail-to-head so body overlaps correctly
    for (let idx = len - 1; idx >= 0; idx--) {
      const seg = snake.body[idx];
      const prev = idx > 0 ? snake.body[idx - 1] : null;
      const next = idx < len - 1 ? snake.body[idx + 1] : null;
      const sx = seg.x * GRID, sy = seg.y * GRID;

      if (idx === 0) {
        this.drawHead(g, sx, sy, snake.dir, hexColor, snake);
      } else if (idx === len - 1) {
        // Tail tip — tapered
        const pdir = prev ? this.dirFromTo(prev, seg) : 'UP';
        this.drawTail(g, sx, sy, pdir, hexColor);
      } else {
        // Body — with scale pattern and belly
        const pdir = prev ? this.dirFromTo(prev, seg) : 'UP';
        const ndir = next ? this.dirFromTo(seg, next) : 'UP';
        this.drawBodySegment(g, sx, sy, hexColor, idx, pdir, ndir);
      }
    }

    // Tongue (extends from head in movement direction)
    const head = snake.body[0];
    const tonguePhase = Math.floor(this.gameTimeMs / 200) % 4;
    const tongueTip = tonguePhase < 2 ? 0 : 1; // flicker
    this.drawTongue(g, head.x * GRID, head.y * GRID, snake.dir, hexColor, tongueTip);

    // Dash cooldown bar
    if (snake.dashCooldownMs > 0) {
      const barW = GRID - 2;
      const fillW = Math.max(1, barW * (1 - snake.dashCooldownMs / 2500));
      g.rect(head.x * GRID + 1, head.y * GRID + GRID + 1, barW, 2).fill({ color: 0x333344 });
      g.rect(head.x * GRID + 1, head.y * GRID + GRID + 1, Math.round(fillW), 2).fill({ color: 0x08d9d6 });
    }

    // Power-up indicator (colored dot above head)
    if (snake.activePowerUps.size > 0) {
      const puColors: number[] = [];
      snake.activePowerUps.forEach(pu => { puColors.push(this.powerUpColor(pu.type)); });
      puColors.forEach((c, i) => {
        g.rect(head.x * GRID + 1 + i * 3, head.y * GRID - 2, 2, 2).fill({ color: c });
      });
    }
  }

  private dirFromTo(from: Segment, to: Segment): Direction {
    if (to.x > from.x) return 'RIGHT';
    if (to.x < from.x) return 'LEFT';
    if (to.y > from.y) return 'DOWN';
    return 'UP';
  }

  private drawHead(g: Graphics, x: number, y: number, dir: string, hexColor: number, snake: Snake): void {
    const s = GRID;
    const dark = this.darken(hexColor, 0.5);
    const mid = this.darken(hexColor, 0.25);
    const light = this.lighten(hexColor, 0.18);
    const highlight = this.lighten(hexColor, 0.35);

    // Head main shape (slightly wider at front)
    if (dir === 'RIGHT') {
      // Head flares right
      g.rect(x + 2, y + 1, s - 4, s - 2).fill({ color: hexColor });
      g.rect(x + s - 3, y, 3, s).fill({ color: hexColor }); // snout
      // Outline top/bottom
      g.rect(x + 1, y, s - 3, 1).fill({ color: dark });
      g.rect(x + 1, y + s - 1, s - 3, 1).fill({ color: dark });
      g.rect(x, y, 1, s).fill({ color: dark }); // back of head
      // Belly line
      g.rect(x + 2, y + 4, s - 5, 2).fill({ color: mid });
      // Scale highlights
      g.rect(x + 3, y + 2, 2, 2).fill({ color: highlight });
      g.rect(x + 3, y + 6, 2, 2).fill({ color: highlight });
      // Eyes
      g.rect(x + 7, y + 2, 3, 2).fill({ color: 0xfffffe });
      g.rect(x + 7, y + 6, 3, 2).fill({ color: 0xfffffe });
      g.rect(x + 8, y + 2, 2, 2).fill({ color: 0x0f0e17 }); // pupil
      g.rect(x + 8, y + 6, 2, 2).fill({ color: 0x0f0e17 });
    } else if (dir === 'LEFT') {
      g.rect(x + 2, y + 1, s - 4, s - 2).fill({ color: hexColor });
      g.rect(x, y, 3, s).fill({ color: hexColor });
      g.rect(x + 2, y, s - 3, 1).fill({ color: dark });
      g.rect(x + 2, y + s - 1, s - 3, 1).fill({ color: dark });
      g.rect(x + s - 1, y, 1, s).fill({ color: dark });
      g.rect(x + 3, y + 4, s - 5, 2).fill({ color: mid });
      g.rect(x + 5, y + 2, 2, 2).fill({ color: highlight });
      g.rect(x + 5, y + 6, 2, 2).fill({ color: highlight });
      // Eyes
      g.rect(x, y + 2, 3, 2).fill({ color: 0xfffffe });
      g.rect(x, y + 6, 3, 2).fill({ color: 0xfffffe });
      g.rect(x, y + 2, 2, 2).fill({ color: 0x0f0e17 });
      g.rect(x, y + 6, 2, 2).fill({ color: 0x0f0e17 });
    } else if (dir === 'UP') {
      g.rect(x + 1, y + 2, s - 2, s - 4).fill({ color: hexColor });
      g.rect(x, y, s, 3).fill({ color: hexColor });
      g.rect(x, y + 2, 1, s - 3).fill({ color: dark });
      g.rect(x + s - 1, y + 2, 1, s - 3).fill({ color: dark });
      g.rect(x + 1, y + s - 1, s - 2, 1).fill({ color: dark });
      g.rect(x + 4, y + 3, 2, s - 5).fill({ color: mid });
      g.rect(x + 2, y + 5, 2, 2).fill({ color: highlight });
      g.rect(x + 6, y + 5, 2, 2).fill({ color: highlight });
      // Eyes
      g.rect(x + 2, y, 2, 3).fill({ color: 0xfffffe });
      g.rect(x + 6, y, 2, 3).fill({ color: 0xfffffe });
      g.rect(x + 2, y, 2, 2).fill({ color: 0x0f0e17 });
      g.rect(x + 6, y, 2, 2).fill({ color: 0x0f0e17 });
    } else { // DOWN
      g.rect(x + 1, y + 2, s - 2, s - 4).fill({ color: hexColor });
      g.rect(x, y + s - 3, s, 3).fill({ color: hexColor });
      g.rect(x, y + 2, 1, s - 3).fill({ color: dark });
      g.rect(x + s - 1, y + 2, 1, s - 3).fill({ color: dark });
      g.rect(x + 1, y + 2, s - 2, 1).fill({ color: dark });
      g.rect(x + 4, y + 2, 2, s - 5).fill({ color: mid });
      g.rect(x + 2, y + 3, 2, 2).fill({ color: highlight });
      g.rect(x + 6, y + 3, 2, 2).fill({ color: highlight });
      // Eyes
      g.rect(x + 2, y + s - 3, 2, 3).fill({ color: 0xfffffe });
      g.rect(x + 6, y + s - 3, 2, 3).fill({ color: 0xfffffe });
      g.rect(x + 2, y + s - 2, 2, 2).fill({ color: 0x0f0e17 });
      g.rect(x + 6, y + s - 2, 2, 2).fill({ color: 0x0f0e17 });
    }

    // Nostril dots on snout
    const nFront = this.nostrilPos(x, y, dir);
    g.rect(nFront[0], nFront[1], 1, 1).fill({ color: dark });
    g.rect(nFront[2], nFront[3], 1, 1).fill({ color: dark });

    // Invincible glow
    if (snake.activePowerUps.has('invincible')) {
      const pulse = (Math.sin(this.gameTimeMs * 0.01) + 1) / 2;
      if (pulse > 0.4) {
        g.rect(x, y, s, s).fill({ color: 0xffde7d });
      }
    }
    // Ghost — semi-transparent holes
    if (snake.activePowerUps.has('ghost')) {
      g.rect(x + 2, y + 2, 2, 2).fill({ color: 0x0a0a14 });
      g.rect(x + 6, y + 6, 2, 2).fill({ color: 0x0a0a14 });
      g.rect(x + 4, y + 4, 1, 1).fill({ color: 0x0a0a14 });
    }
  }

  private nostrilPos(x: number, y: number, dir: string): [number, number, number, number] {
    switch (dir) {
      case 'RIGHT': return [x + 9, y + 4, x + 9, y + 6];
      case 'LEFT': return [x, y + 4, x, y + 6];
      case 'UP': return [x + 4, y, x + 6, y];
      case 'DOWN': default: return [x + 4, y + 9, x + 6, y + 9];
    }
  }

  private drawTongue(g: Graphics, x: number, y: number, dir: string, hexColor: number, flicker: number): void {
    if (flicker === 0) return; // tongue retracted
    const red = 0xff2e63;
    switch (dir) {
      case 'RIGHT':
        g.rect(x + 10, y + 4, 2, 1).fill({ color: red });
        g.rect(x + 11, y + 3, 1, 1).fill({ color: red });
        g.rect(x + 11, y + 5, 1, 1).fill({ color: red });
        break;
      case 'LEFT':
        g.rect(x - 2, y + 4, 2, 1).fill({ color: red });
        g.rect(x - 2, y + 3, 1, 1).fill({ color: red });
        g.rect(x - 2, y + 5, 1, 1).fill({ color: red });
        break;
      case 'UP':
        g.rect(x + 4, y - 2, 1, 2).fill({ color: red });
        g.rect(x + 5, y - 2, 1, 1).fill({ color: red });
        g.rect(x + 3, y - 2, 1, 1).fill({ color: red });
        break;
      case 'DOWN':
        g.rect(x + 4, y + 10, 1, 2).fill({ color: red });
        g.rect(x + 5, y + 11, 1, 1).fill({ color: red });
        g.rect(x + 3, y + 11, 1, 1).fill({ color: red });
        break;
    }
  }

  private drawBodySegment(g: Graphics, x: number, y: number, hexColor: number, idx: number, fromDir: Direction, toDir: Direction): void {
    const s = GRID;
    const light = this.lighten(hexColor, 0.12);
    const dark = this.darken(hexColor, 0.2);
    const highlight = this.lighten(hexColor, 0.25);
    const bodyColor = idx % 2 === 0 ? hexColor : light;

    // Main body fill (with 1px border gap for segmented look)
    g.rect(x + 1, y + 1, s - 2, s - 2).fill({ color: bodyColor });

    // Belly stripe (runs along the body, perpendicular to movement)
    if (fromDir === 'UP' || fromDir === 'DOWN') {
      g.rect(x + 4, y + 1, 2, s - 2).fill({ color: dark });
    } else {
      g.rect(x + 1, y + 4, s - 2, 2).fill({ color: dark });
    }

    // Scale dots (individual scales)
    g.rect(x + 3, y + 3, 2, 2).fill({ color: highlight });
    g.rect(x + 6, y + 6, 2, 2).fill({ color: highlight });

    // Segment divider lines (subtle)
    if (idx % 2 === 0) {
      g.rect(x + 1, y + s - 2, s - 2, 1).fill({ color: dark });
    }
  }

  private drawTail(g: Graphics, x: number, y: number, dir: Direction, hexColor: number): void {
    const s = GRID;
    const dark = this.darken(hexColor, 0.3);
    // Tapered tail — narrower, pointing away from movement
    switch (dir) {
      case 'RIGHT':
        g.rect(x + 1, y + 2, s - 3, s - 4).fill({ color: hexColor });
        g.rect(x + s - 3, y + 3, 2, s - 6).fill({ color: dark });
        g.rect(x + s - 2, y + 4, 1, 2).fill({ color: hexColor });
        break;
      case 'LEFT':
        g.rect(x + 2, y + 2, s - 3, s - 4).fill({ color: hexColor });
        g.rect(x + 1, y + 3, 2, s - 6).fill({ color: dark });
        g.rect(x + 1, y + 4, 1, 2).fill({ color: hexColor });
        break;
      case 'UP':
        g.rect(x + 2, y + 2, s - 4, s - 3).fill({ color: hexColor });
        g.rect(x + 3, y + 1, s - 6, 2).fill({ color: dark });
        g.rect(x + 4, y + 1, 2, 1).fill({ color: hexColor });
        break;
      case 'DOWN':
        g.rect(x + 2, y + 1, s - 4, s - 3).fill({ color: hexColor });
        g.rect(x + 3, y + s - 3, s - 6, 2).fill({ color: dark });
        g.rect(x + 4, y + s - 2, 2, 1).fill({ color: hexColor });
        break;
    }
    // Tail tip dot
    switch (dir) {
      case 'RIGHT': g.rect(x + s - 1, y + 4, 1, 2).fill({ color: hexColor }); break;
      case 'LEFT': g.rect(x, y + 4, 1, 2).fill({ color: hexColor }); break;
      case 'UP': g.rect(x + 4, y, 2, 1).fill({ color: hexColor }); break;
      case 'DOWN': g.rect(x + 4, y + s - 1, 2, 1).fill({ color: hexColor }); break;
    }
  }

  // ═══════════════════════════════════════════════════════
  // SPRITE DRAWING HELPERS
  // ═══════════════════════════════════════════════════════

  private drawFood(g: Graphics, ox: number, oy: number, type: FoodType): void {
    switch (type) {
      case 'apple':
        g.rect(ox + 2, oy + 3, 6, 6).fill({ color: 0xff2e63 });
        g.rect(ox + 3, oy + 2, 4, 1).fill({ color: 0xff2e63 });
        g.rect(ox + 1, oy + 4, 1, 4).fill({ color: 0xff2e63 });
        g.rect(ox + 8, oy + 4, 1, 4).fill({ color: 0xff2e63 });
        g.rect(ox + 3, oy + 4, 2, 2).fill({ color: 0xff7a8e });
        g.rect(ox + 4, oy + 1, 2, 1).fill({ color: 0x2af598 });
        g.rect(ox + 6, oy, 2, 2).fill({ color: 0x2af598 });
        break;
      case 'golden':
        g.rect(ox + 2, oy + 3, 6, 6).fill({ color: 0xffde7d });
        g.rect(ox + 3, oy + 2, 4, 1).fill({ color: 0xffde7d });
        g.rect(ox + 1, oy + 4, 1, 4).fill({ color: 0xffde7d });
        g.rect(ox + 8, oy + 4, 1, 4).fill({ color: 0xffde7d });
        g.rect(ox + 3, oy + 4, 2, 2).fill({ color: 0xfff0b0 });
        g.rect(ox + 4, oy, 2, 2).fill({ color: 0xfffffe });
        // Sparkle dots on golden
        g.rect(ox, oy + 2, 1, 1).fill({ color: 0xffff99 });
        g.rect(ox + 9, oy + 7, 1, 1).fill({ color: 0xffff99 });
        break;
      case 'poison':
        g.rect(ox + 2, oy + 3, 6, 6).fill({ color: 0x7160e8 });
        g.rect(ox + 3, oy + 2, 4, 1).fill({ color: 0x5040c0 });
        g.rect(ox + 1, oy + 4, 1, 4).fill({ color: 0x5040c0 });
        g.rect(ox + 8, oy + 4, 1, 4).fill({ color: 0x5040c0 });
        g.rect(ox + 3, oy + 4, 2, 2).fill({ color: 0x9680f0 });
        g.rect(ox + 4, oy, 2, 2).fill({ color: 0x2af598 });
        // Skull dots
        g.rect(ox + 3, oy + 5, 4, 1).fill({ color: 0x0f0e17 });
        g.rect(ox + 3, oy + 7, 1, 1).fill({ color: 0x0f0e17 });
        g.rect(ox + 6, oy + 7, 1, 1).fill({ color: 0x0f0e17 });
        break;
      case 'superfood':
        const pulse = (Date.now() % 600) < 300 ? 0x08d9d6 : 0xfffffe;
        g.rect(ox + 3, oy + 2, 4, 6).fill({ color: pulse });
        g.rect(ox + 2, oy + 3, 6, 4).fill({ color: pulse });
        g.rect(ox + 4, oy + 4, 2, 2).fill({ color: 0xfffffe });
        break;
    }
  }

  private drawPowerUp(g: Graphics, ox: number, oy: number, type: PowerUpType): void {
    const colors: Record<PowerUpType, number> = { speed: 0x2af598, shield: 0x08d9d6, invincible: 0xffde7d, shrink: 0xa7a9be, magnet: 0xff2e63, confuse: 0x7160e8, ghost: 0xfffffe, clone: 0xffde7d };
    const color = colors[type];
    const pulse = type === 'invincible' ? (((Date.now() % 400) < 200) ? 0xfffffe : color) : color;
    // Diamond shape
    g.rect(ox + 4, oy + 1, 2, 2).fill({ color: pulse });
    g.rect(ox + 2, oy + 3, 6, 4).fill({ color: pulse });
    g.rect(ox + 4, oy + 7, 2, 2).fill({ color: pulse });
    // Center dot
    g.rect(ox + 4, oy + 4, 2, 2).fill({ color: 0x0f0e17 });
  }

  private drawRock(g: Graphics, x: number, y: number): void {
    g.rect(x, y, GRID * 2, GRID * 2).fill({ color: 0x6b6d82 });
    g.rect(x + 1, y + 1, GRID * 2 - 2, GRID * 2 - 2).fill({ color: 0x8a8ca0 });
    g.rect(x + 3, y + 3, 4, 4).fill({ color: 0x5a5c70 });
    g.rect(x + 10, y + 2, 3, 6).fill({ color: 0x5a5c70 });
    g.rect(x + 1, y + 1, 2, 2).fill({ color: 0xa8aab8 });
  }

  private powerUpColor(type: PowerUpType): number {
    const map: Record<PowerUpType, number> = { speed: 0x2af598, shield: 0x08d9d6, invincible: 0xffde7d, shrink: 0xa7a9be, magnet: 0xff2e63, confuse: 0x7160e8, ghost: 0xfffffe, clone: 0xffde7d };
    return map[type];
  }

  // ═══════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════

  private createBody(x: number, y: number, dir: Direction): Segment[] {
    const tailOffsets: Record<Direction, [number, number]> = { UP: [0, 1], DOWN: [0, -1], LEFT: [1, 0], RIGHT: [-1, 0] };
    const [dx, dy] = tailOffsets[dir];
    return [{ x, y }, { x: x + dx, y: y + dy }, { x: x + dx * 2, y: y + dy * 2 }];
  }

  private turnLeft(d: Direction): Direction {
    return d === 'UP' ? 'LEFT' : d === 'LEFT' ? 'DOWN' : d === 'DOWN' ? 'RIGHT' : 'UP';
  }

  private turnRight(d: Direction): Direction {
    return d === 'UP' ? 'RIGHT' : d === 'RIGHT' ? 'DOWN' : d === 'DOWN' ? 'LEFT' : 'UP';
  }

  private parseHex(hex: string): number {
    return parseInt(hex.replace('#', '0x'), 16) || 0xffffff;
  }

  private lighten(hex: number, a: number): number {
    const r = Math.min(255, ((hex >> 16) & 0xff) + Math.floor(255 * a));
    const g = Math.min(255, ((hex >> 8) & 0xff) + Math.floor(255 * a));
    const b = Math.min(255, (hex & 0xff) + Math.floor(255 * a));
    return (r << 16) | (g << 8) | b;
  }

  private darken(hex: number, a: number): number {
    const r = Math.max(0, ((hex >> 16) & 0xff) - Math.floor(255 * a));
    const g = Math.max(0, ((hex >> 8) & 0xff) - Math.floor(255 * a));
    const b = Math.max(0, (hex & 0xff) - Math.floor(255 * a));
    return (r << 16) | (g << 8) | b;
  }
}
