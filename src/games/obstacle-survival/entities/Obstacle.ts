import { Graphics, Container } from 'pixi.js';
import { HAZARD_CONFIG } from '../config';

export type ObstacleType = 'standard' | 'laser_turret' | 'fragile' | 'crusher';

export class Obstacle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public type: ObstacleType;
  public container: Container;
  public graphics: Graphics;

  // Fragile block state
  public isTouched = false;
  public touchTimer = 0;
  public isShattered = false;

  // Laser turret state
  public laserState: 'idle' | 'telegraph' | 'firing' | 'cooldown' = 'idle';
  public laserTimer = 0;
  public laserX = 0;
  public isLaserActive = false;

  constructor(x: number, y: number, width: number, height: number, type: ObstacleType = 'standard') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;

    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    if (this.type === 'laser_turret') {
      this.laserX = Math.round(this.width / 2);
    }

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  private render(): void {
    this.graphics.clear();
    if (this.isShattered) return;

    const w = this.width;
    const h = this.height;

    // 1. Heavy Falling Crusher Boulder (24x24 Spiked Stone Block)
    if (this.type === 'crusher') {
      this.graphics.rect(0, 0, w, h).fill({ color: 0x181724 });
      this.graphics.rect(1, 1, w - 2, h - 2).fill({ color: 0x3d3a50 });

      // Cracked Center Eye Pattern
      this.graphics.rect(6, 6, w - 12, h - 12).fill({ color: 0x2a2840 });
      this.graphics.rect(Math.round(w / 2) - 2, Math.round(h / 2) - 2, 4, 4).fill({ color: 0xff2e63 });

      // Spiked Bottom Base
      const spikeW = 4;
      for (let sx = 2; sx + spikeW <= w; sx += spikeW + 2) {
        this.graphics.rect(sx, h, 4, 2).fill({ color: 0xa7a9be });
        this.graphics.rect(sx + 1, h + 2, 2, 2).fill({ color: 0xfffffe });
      }

      // Vertical Warning Drop Lines
      this.graphics.rect(2, -20, 1, 20).fill({ color: 0xff2e63 });
      this.graphics.rect(w - 3, -20, 1, 20).fill({ color: 0xff2e63 });
      return;
    }

    // 2. Fragile Block
    if (this.type === 'fragile') {
      const baseColor = this.isTouched ? 0xffde7d : 0xc49a45;
      this.graphics.rect(0, 0, w, h).fill({ color: baseColor });
      this.graphics.rect(0, 0, w, 1).fill({ color: 0xfffffe });
      this.graphics.rect(0, h - 1, w, 1).fill({ color: 0x6e521c });

      const crackColor = 0x3d2b07;
      for (let cx = 8; cx < w; cx += 14) {
        this.graphics.rect(cx, 2, 2, 4).fill({ color: crackColor });
        this.graphics.rect(cx + 2, 5, 3, 2).fill({ color: crackColor });
      }
      return;
    }

    // 3. Standard & Laser Turret: Stone brick pattern
    this.graphics.rect(0, 0, w, h).fill({ color: 0x1f1e2e });

    const brickW = 10;
    const brickH = 6;
    const colorA = this.type === 'laser_turret' ? 0x4a2e4b : 0x3d3a50;
    const colorB = this.type === 'laser_turret' ? 0x2e1c30 : 0x2a2840;
    const mortarColor = 0x15142a;

    let rowCount = 0;
    for (let py = 0; py < h; py += brickH) {
      const isOffset = rowCount % 2 === 1;
      const xOffset = isOffset ? 5 : 0;
      rowCount++;

      for (let px = -5; px < w + 5; px += brickW) {
        const drawX = px + xOffset;
        const actualW = Math.min(brickW - 1, w - drawX);
        const actualH = Math.min(brickH - 1, h - py);

        if (drawX >= 0 && actualW > 0 && actualH > 0) {
          const isEvenBrick = Math.floor(px / brickW) % 2 === 0;
          const brickColor = isEvenBrick ? colorA : colorB;
          this.graphics.rect(drawX, py, actualW, actualH).fill({ color: brickColor });
        }
      }
      if (py > 0 && py < h) {
        this.graphics.rect(0, py - 1, w, 1).fill({ color: mortarColor });
      }
    }

    // Highlights & Shadows
    this.graphics.rect(0, 0, w, 1).fill({ color: 0x5a5776 });
    this.graphics.rect(0, h - 1, w, 1).fill({ color: 0x15142a });

    // Metallic Spikes on bottom edge
    const spikeW = 4;
    const spikeColor = 0xa7a9be;
    const spikeTipColor = 0xfffffe;

    for (let sx = 2; sx + spikeW <= w; sx += spikeW + 2) {
      const sy = h;
      this.graphics.rect(sx, sy, 4, 1).fill({ color: spikeColor });
      this.graphics.rect(sx + 1, sy + 1, 2, 1).fill({ color: spikeColor });
      this.graphics.rect(sx + 1, sy + 2, 2, 1).fill({ color: spikeTipColor });
      this.graphics.rect(sx + 1, sy + 3, 1, 1).fill({ color: spikeTipColor });
    }

    // Laser Turret Red Eye Lens
    if (this.type === 'laser_turret') {
      const eyeX = this.laserX - 3;
      const eyeY = Math.round(h / 2) - 3;
      this.graphics.rect(eyeX, eyeY, 6, 6).fill({ color: 0x0f0e17 });

      let eyeColor = 0xff2e63;
      if (this.laserState === 'telegraph') {
        eyeColor = Math.floor(this.laserTimer * 10) % 2 === 0 ? 0xfffffe : 0xffde7d;
      } else if (this.laserState === 'firing') {
        eyeColor = 0x08d9d6;
      }
      this.graphics.rect(eyeX + 1, eyeY + 1, 4, 4).fill({ color: eyeColor });

      // Laser Beam Visual
      if (this.laserState === 'telegraph') {
        for (let ly = h; ly < h + 300; ly += 6) {
          this.graphics.rect(this.laserX - 1, ly, 2, 3).fill({ color: 0xffde7d });
        }
      } else if (this.laserState === 'firing') {
        this.graphics.rect(this.laserX - 3, h, 6, 300).fill({ color: 0x08d9d6 });
        this.graphics.rect(this.laserX - 1, h, 2, 300).fill({ color: 0xfffffe });
      }
    }
  }

  public update(dt: number, scrollSpeed: number): void {
    // Heavy crusher boulders drop rapidly (1.6x scroll speed)
    const effectiveSpeed = this.type === 'crusher' ? scrollSpeed * 1.6 : scrollSpeed;
    this.y += effectiveSpeed * dt;
    this.container.y = Math.round(this.y);

    // Fragile block touch timer
    if (this.type === 'fragile' && this.isTouched && !this.isShattered) {
      this.touchTimer += dt;
      if (this.touchTimer >= HAZARD_CONFIG.FRAGILE_BREAK_DELAY) {
        this.isShattered = true;
        this.render();
      }
    }

    // Laser turret state machine
    if (this.type === 'laser_turret') {
      this.laserTimer += dt;

      if (this.laserState === 'idle' && this.laserTimer >= 0.4) {
        this.laserState = 'telegraph';
        this.laserTimer = 0;
        this.render();
      } else if (this.laserState === 'telegraph' && this.laserTimer >= HAZARD_CONFIG.LASER_TELEGRAPH_TIME) {
        this.laserState = 'firing';
        this.isLaserActive = true;
        this.laserTimer = 0;
        this.render();
      } else if (this.laserState === 'firing' && this.laserTimer >= HAZARD_CONFIG.LASER_BEAM_DURATION) {
        this.laserState = 'cooldown';
        this.isLaserActive = false;
        this.laserTimer = 0;
        this.render();
      } else if (this.laserState === 'telegraph' || this.laserState === 'firing') {
        this.render();
      }
    }
  }

  public shatter(): void {
    this.isShattered = true;
    this.render();
  }

  public touchFragile(): void {
    if (this.type === 'fragile' && !this.isTouched) {
      this.isTouched = true;
      this.render();
    }
  }

  public isOutOfBounds(screenHeight: number): boolean {
    return this.y > screenHeight + 50;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
