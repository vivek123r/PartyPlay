import { Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';

interface CircleEntity {
  id: number;
  graphics: Graphics;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export default class MicroGame implements GameModule {
  public state: InternalGameState = 'Initializing';
  private ctx!: GameContext;
  private circles: CircleEntity[] = [];

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing MicroGame...');

    const { viewport, stage } = this.ctx.renderer;
    const count = this.ctx.players.length;
    const spacing = viewport.width / (count + 1);

    this.ctx.players.forEach((p, idx) => {
      const g = new Graphics();
      const hexColor = parseInt(p.color.replace('#', '0x'), 16) || 0xffffff;
      const size = 16;
      g.rect(0, 0, size, size).fill({ color: hexColor });

      const x = Math.round(spacing * (idx + 1));
      const y = Math.round(viewport.height / 2);
      g.x = x;
      g.y = y;
      stage.addChild(g);

      this.circles.push({
        id: p.id,
        graphics: g,
        x,
        y,
        radius: 8, // treated as half-size conceptually or just keeping field for collision
        color: p.color,
      });
    });

    this.state = 'Ready';
  }

  public start(): void {
    this.state = 'Playing';
    this.ctx.logger.info('MicroGame Started');
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    const speed = 100 * (this.ctx.modifiers.speedMultiplier ?? 1.0);
    const { width } = this.ctx.renderer.viewport;

    this.circles.forEach((c) => {
      const playerInput = this.ctx.input.getPlayer(c.id);

      if (playerInput.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }

      if (playerInput.isActive('moveLeft')) {
        c.x -= speed * dt;
        this.ctx.audio.playTone(300 + c.id * 50, 'sine', 0.05);
      }
      if (playerInput.isActive('moveRight')) {
        c.x += speed * dt;
        this.ctx.audio.playTone(400 + c.id * 50, 'sine', 0.05);
      }

      // Clamp x
      c.x = Math.max(c.radius, Math.min(width - c.radius, c.x));
      c.graphics.x = Math.round(c.x - c.radius);
      c.graphics.y = Math.round(c.y - c.radius);

      // Win / Game Over condition check: reach right wall
      if (c.x >= width - c.radius - 5) {
        this.state = 'Finished';
        this.ctx.events.emit('game:over', {
          winnerId: c.id,
          standings: this.circles.map((item) => ({
            playerId: item.id,
            score: item.id === c.id ? 100 : 0,
          })),
        });
      }
    });
  }

  public pause(): void {
    this.state = 'Paused';
  }

  public resume(): void {
    this.state = 'Playing';
  }

  public destroy(): void {
    this.state = 'Destroyed';
    this.circles.forEach((c) => c.graphics.destroy());
    this.circles = [];
  }
}
