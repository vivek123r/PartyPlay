import { Container, AnimatedSprite, Graphics, Texture } from 'pixi.js';
import type { TileData } from '../types';
import type { Grid } from '../entities/Grid';
import type { AudioSynthesizer } from '../utils/AudioSynthesizer';
import type { TextureGenerator } from '../utils/TextureGenerator';
import { TILE_SIZE } from '../config';

const DIRS = ['down', 'left', 'right', 'up'] as const;
type Dir = typeof DIRS[number];

export class PlayerAvatar extends Container {
  public tileX = 2;
  public tileY = 2;
  public worldX = 0;
  public worldY = 0;

  public facing: Dir = 'down';
  public isMoving = false;
  public isSwingingTool = false;
  public swingTimer = 0;

  // Sprite-based rendering
  private walkSprites: Partial<Record<Dir, AnimatedSprite>> = {};
  private actionSprites: Partial<Record<string, AnimatedSprite>> = {};
  private spriteMode = false; // true once initSprites() succeeds

  // Fallback vector rendering
  private g = new Graphics();
  private animTimer = 0;

  private moveSpeed = 160; // px/sec

  constructor(_state?: any) {
    super();
    this.addChild(this.g);
  }

  // ─── Called once Sprout Lands assets are loaded ─────────────────────────
  public initSprites(textureGen: TextureGenerator): void {
    if (this.spriteMode) return;

    // Build walk AnimatedSprites for each direction
    for (const dir of DIRS) {
      const frames: Texture[] = [];
      for (let col = 0; col < 4; col++) {
        const tex = textureGen.getTexture(`character_walk_${dir}_${col}`);
        if (!tex || tex === Texture.EMPTY) { frames.length = 0; break; }
        frames.push(tex);
      }
      if (frames.length === 4) {
        const anim = new AnimatedSprite(frames);
        anim.animationSpeed = 0.14; // ~8 fps walk cycle
        anim.anchor.set(0.5, 0.85); // feet at anchor bottom
        // Render 48px sprites at TILE_SIZE * 2 for a nice top-down look
        anim.width = TILE_SIZE * 2;
        anim.height = TILE_SIZE * 2;
        anim.visible = false;
        anim.stop();
        this.addChild(anim);
        this.walkSprites[dir] = anim;
      }
    }

    // Build action AnimatedSprites (tool swings)
    const actionMap: Record<string, string[]> = {
      hoe:          ['action_hoe_down', 'action_hoe_up'],
      watering_can: ['action_can_down', 'action_can_up'],
      axe:          ['action_axe_down', 'action_axe_up'],
      scythe:       ['action_scythe_down', 'action_scythe_up'],
    };
    for (const [tool, keys] of Object.entries(actionMap)) {
      const frames: Texture[] = keys
        .map(k => textureGen.getTexture(k))
        .filter(t => t && t !== Texture.EMPTY);
      if (frames.length >= 1) {
        const anim = new AnimatedSprite(frames.length > 1 ? frames : [frames[0], frames[0]]);
        anim.animationSpeed = 0.25; // fast tool swing
        anim.loop = false;
        anim.anchor.set(0.5, 0.85);
        anim.width = TILE_SIZE * 2;
        anim.height = TILE_SIZE * 2;
        anim.visible = false;
        anim.onComplete = () => {
          anim.visible = false;
          this.isSwingingTool = false;
        };
        this.addChild(anim);
        this.actionSprites[tool] = anim;
      }
    }

    if (Object.keys(this.walkSprites).length === 4) {
      this.spriteMode = true;
      this.g.visible = false; // hide vector fallback
    }
  }

  public get isActing(): boolean {
    return this.isSwingingTool;
  }

  public playToolAction(action?: string): void {
    this.triggerToolSwing(action);
  }

  public initPosition(tileX: number, tileY: number, grid: Grid): void {
    this.tileX = tileX;
    this.tileY = tileY;
    const worldPos = grid.tileToWorld(tileX, tileY);
    this.worldX = worldPos.x + 16;
    this.worldY = worldPos.y + 16;
    this.position.set(this.worldX, this.worldY);
  }

  public update(dt: number, input?: any, grid?: Grid): void {
    this.animTimer += dt;

    if (this.isSwingingTool) {
      this.swingTimer -= dt;
      if (this.swingTimer <= 0 && !this.spriteMode) {
        this.isSwingingTool = false;
      }
    }

    if (!input || !grid) {
      if (!this.spriteMode) this.renderFallback();
      return;
    }

    let dx = 0;
    let dy = 0;

    if (input.left)  { dx -= 1; this.facing = 'left'; }
    if (input.right) { dx += 1; this.facing = 'right'; }
    if (input.up)    { dy -= 1; this.facing = 'up'; }
    if (input.down)  { dy += 1; this.facing = 'down'; }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * this.moveSpeed * dt;
      dy = (dy / len) * this.moveSpeed * dt;

      if (dx !== 0 || dy !== 0) {
        this.isMoving = true;
        this.worldX += dx;
        this.worldY += dy;

        // Clamp within grid bounds
        this.worldX = Math.max(16, Math.min(16 * TILE_SIZE - 16, this.worldX));
        this.worldY = Math.max(16, Math.min(10 * TILE_SIZE - 16, this.worldY));

        this.position.set(Math.round(this.worldX), Math.round(this.worldY));

        // Sync grid tile coordinates
        const currentTile = grid.worldToTile(this.worldX, this.worldY);
        this.tileX = currentTile.tileX;
        this.tileY = currentTile.tileY;
      } else {
        this.isMoving = false;
      }
    } else {
      this.isMoving = false;
    }

    if (this.spriteMode) {
      this.updateSpriteVisibility();
    } else {
      this.renderFallback();
    }
  }

  public triggerToolSwing(tool?: string): void {
    this.isSwingingTool = true;
    this.swingTimer = 0.25;

    if (this.spriteMode) {
      // Hide all walk sprites
      for (const anim of Object.values(this.walkSprites)) anim?.stop();
      for (const anim of Object.values(this.walkSprites)) if (anim) anim.visible = false;

      // Play the correct action sprite based on facing
      const toolKey = tool || 'hoe';
      const actionAnim = this.actionSprites[toolKey];
      if (actionAnim) {
        actionAnim.visible = true;
        actionAnim.gotoAndPlay(0);
      } else {
        // Fallback: play hoe swing for the facing direction
        const fallback = this.actionSprites['hoe'];
        if (fallback) { fallback.visible = true; fallback.gotoAndPlay(0); }
      }
    }
  }

  public getTargetTileInFront(): { tileX: number; tileY: number } {
    let tx = this.tileX;
    let ty = this.tileY;

    if (this.facing === 'up')    ty -= 1;
    if (this.facing === 'down')  ty += 1;
    if (this.facing === 'left')  tx -= 1;
    if (this.facing === 'right') tx += 1;

    return {
      tileX: Math.max(0, Math.min(15, tx)),
      tileY: Math.max(0, Math.min(9, ty)),
    };
  }

  // ─── Sprite Visibility Management ────────────────────────────────────────
  private updateSpriteVisibility(): void {
    // Don't interrupt an ongoing action animation
    if (this.isSwingingTool) return;

    // Hide all action sprites
    for (const anim of Object.values(this.actionSprites)) if (anim) anim.visible = false;

    // Show the walk sprite for current direction
    for (const dir of DIRS) {
      const anim = this.walkSprites[dir];
      if (!anim) continue;
      if (dir === this.facing) {
        anim.visible = true;
        if (this.isMoving) {
          if (!anim.playing) anim.play();
        } else {
          anim.stop();
          anim.currentFrame = 0; // idle pose = first walk frame
        }
      } else {
        anim.visible = false;
        anim.stop();
      }
    }
  }

  // ─── Fallback Vector Rendering ────────────────────────────────────────────
  private renderFallback(): void {
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

    // Tool Swing Visual
    if (this.isSwingingTool) {
      const swingX = 12 * faceDir;
      this.g.circle(swingX, -8 + walkBob, 8).fill({ color: 0x00f0ff, alpha: 0.6 });
      this.g.poly([0, -8, swingX, -14, swingX + 4 * faceDir, -4]).stroke({ color: 0xf8fafc, width: 2 });
    }
  }
}
