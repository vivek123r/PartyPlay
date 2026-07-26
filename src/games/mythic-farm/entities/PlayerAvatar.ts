import { Container, Graphics } from 'pixi.js';
import type { TileData } from '../types';
import type { Grid } from '../entities/Grid';
import type { AudioSynthesizer } from '../utils/AudioSynthesizer';

export class PlayerAvatar extends Container {
  private g = new Graphics();
  public tileX = 2;
  public tileY = 2;
  public worldX = 0;
  public worldY = 0;

  public facing: 'up' | 'down' | 'left' | 'right' = 'down';
  public isMoving = false;
  public isSwingingTool = false;
  public swingTimer = 0;

  private animTimer = 0;
  private moveSpeed = 160; // Pixels per second

  constructor() {
    super();
    this.addChild(this.g);
  }

  public initPosition(tileX: number, tileY: number, grid: Grid): void {
    this.tileX = tileX;
    this.tileY = tileY;
    const worldPos = grid.tileToWorld(tileX, tileY);
    this.worldX = worldPos.x + 16;
    this.worldY = worldPos.y + 16;
    this.position.set(this.worldX, this.worldY);
  }

  public update(dt: number, input: any, grid: Grid): void {
    this.animTimer += dt;

    if (this.isSwingingTool) {
      this.swingTimer -= dt;
      if (this.swingTimer <= 0) {
        this.isSwingingTool = false;
      }
    }

    let dx = 0;
    let dy = 0;

    if (input.left) { dx -= 1; this.facing = 'left'; }
    if (input.right) { dx += 1; this.facing = 'right'; }
    if (input.up) { dy -= 1; this.facing = 'up'; }
    if (input.down) { dy += 1; this.facing = 'down'; }

    if (dx !== 0 || dy !== 0) {
      this.isMoving = true;
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * this.moveSpeed * dt;
      dy = (dy / len) * this.moveSpeed * dt;

      this.worldX += dx;
      this.worldY += dy;

      // Clamp within grid bounds
      this.worldX = Math.max(16, Math.min(16 * 16 - 16, this.worldX));
      this.worldY = Math.max(16, Math.min(10 * 16 - 16, this.worldY));

      this.position.set(Math.round(this.worldX), Math.round(this.worldY));

      // Sync grid tile coordinates
      const currentTile = grid.worldToTile(this.worldX, this.worldY);
      this.tileX = currentTile.tileX;
      this.tileY = currentTile.tileY;
    } else {
      this.isMoving = false;
    }

    this.renderAvatar();
  }

  public triggerToolSwing(): void {
    this.isSwingingTool = true;
    this.swingTimer = 0.25;
  }

  public getTargetTileInFront(): { tileX: number; tileY: number } {
    let tx = this.tileX;
    let ty = this.tileY;

    if (this.facing === 'up') ty -= 1;
    if (this.facing === 'down') ty += 1;
    if (this.facing === 'left') tx -= 1;
    if (this.facing === 'right') tx += 1;

    return {
      tileX: Math.max(0, Math.min(15, tx)),
      tileY: Math.max(0, Math.min(9, ty)),
    };
  }

  private renderAvatar(): void {
    this.g.clear();

    const walkBob = this.isMoving ? Math.sin(this.animTimer * 12) * 2 : 0;
    const faceDir = this.facing === 'left' ? -1 : 1;

    // Shadow
    this.g.ellipse(0, 8, 8, 3).fill({ color: 0x000000, alpha: 0.3 });

    // Farmer Dungarees Body (Blue Overalls)
    this.g.rect(-6, -6 + walkBob, 12, 12).fill({ color: 0x2563eb });

    // Red Plaid Shirt
    this.g.rect(-5, -12 + walkBob, 10, 7).fill({ color: 0xdc2626 });

    // Straw Sunhat / Head
    this.g.circle(0, -15 + walkBob, 6).fill({ color: 0xfde047 });
    this.g.ellipse(0, -14 + walkBob, 9, 3).fill({ color: 0xca8a04 });

    // Eyes
    if (this.facing !== 'up') {
      this.g.circle(-2 * faceDir, -16 + walkBob, 1).fill({ color: 0x0f172a });
      this.g.circle(2 * faceDir, -16 + walkBob, 1).fill({ color: 0x0f172a });
    }

    // Tool Swing Visual (Arc line when swinging hoe/can)
    if (this.isSwingingTool) {
      const swingX = 12 * faceDir;
      this.g.circle(swingX, -8 + walkBob, 8).fill({ color: 0x00f0ff, alpha: 0.6 });
      this.g.poly([0, -8, swingX, -14, swingX + 4 * faceDir, -4]).stroke({ color: 0xf8fafc, width: 2 });
    }
  }
}
