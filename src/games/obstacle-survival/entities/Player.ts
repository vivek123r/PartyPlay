import { Graphics, Container } from 'pixi.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
  isStar?: boolean;
  isSpeedLine?: boolean;
}

export class Player {
  public id: number;
  public color: string;
  public x: number;
  public y: number;
  public radius: number;
  public isAlive = true;
  public container: Container;
  public graphics: Graphics;

  private particleGraphics: Graphics;
  private auraGraphics: Graphics;
  private particles: Particle[] = [];
  private facingDirection: 'left' | 'right' | 'idle' = 'idle';

  public isSynergyActive = false;
  public hyperTimer = 0;
  public shieldTimer = 0;

  public get isHyperActive(): boolean {
    return this.hyperTimer > 0;
  }

  public get isShieldActive(): boolean {
    return this.shieldTimer > 0;
  }

  constructor(id: number, color: string, radius: number, initialX: number, initialY: number) {
    this.id = id;
    this.color = color;
    this.radius = radius;
    this.x = initialX;
    this.y = initialY;

    this.container = new Container();
    this.auraGraphics = new Graphics();
    this.graphics = new Graphics();
    this.particleGraphics = new Graphics();

    this.container.addChild(this.auraGraphics);
    this.container.addChild(this.graphics);
    this.container.addChild(this.particleGraphics);

    this.render();
    this.container.x = Math.round(this.x - this.radius);
    this.container.y = Math.round(this.y - this.radius);
  }

  public activateHyperState(duration = 10.0): void {
    this.hyperTimer = duration;
    this.render();
  }

  public activateShieldState(duration = 5.0): void {
    this.shieldTimer = duration; // 5-second individual shield
    this.render();
  }

  private getLighterHex(hexStr: string): number {
    const num = parseInt(hexStr.replace('#', ''), 16) || 0xffffff;
    const r = Math.min(255, Math.floor(((num >> 16) & 255) * 1.45 + 30));
    const g = Math.min(255, Math.floor(((num >> 8) & 255) * 1.45 + 30));
    const b = Math.min(255, Math.floor((num & 255) * 1.45 + 30));
    return (r << 16) | (g << 8) | b;
  }

  private getDarkerHex(hexStr: string): number {
    const num = parseInt(hexStr.replace('#', ''), 16) || 0xffffff;
    const r = Math.max(0, Math.floor(((num >> 16) & 255) * 0.55));
    const g = Math.max(0, Math.floor(((num >> 8) & 255) * 0.55));
    const b = Math.max(0, Math.floor((num & 255) * 0.55));
    return (r << 16) | (g << 8) | b;
  }

  private render(): void {
    this.graphics.clear();
    this.auraGraphics.clear();

    const hexColor = parseInt(this.color.replace('#', ''), 16) || 0xffffff;
    const lighterColor = this.getLighterHex(this.color);
    const darkerColor = this.getDarkerHex(this.color);

    const size = this.radius * 2; // 16px
    const isWarningState = (this.isHyperActive && this.hyperTimer <= 2.0) || (this.isShieldActive && this.shieldTimer <= 1.2);
    const isBlinkPhase = isWarningState && Math.floor((this.hyperTimer || this.shieldTimer) * 12) % 2 === 0;

    // 1. Electric Aura Glow Behind Player
    if (this.isHyperActive && this.isAlive) {
      const auraColor = isBlinkPhase ? 0xff2e63 : 0xa55eea; // Flashes red/purple warning
      this.auraGraphics.rect(-5, -5, size + 10, size + 10).fill({ color: auraColor, alpha: 0.7 });
      this.auraGraphics.rect(-3, -3, size + 6, size + 6).fill({ color: 0xfffffe, alpha: 0.9 });
    } else if (this.isShieldActive && this.isAlive) {
      // Intense Cyan Shield Energy Aura + Symmetrical 2px Overhead Canopy Line
      const shieldColor = isBlinkPhase ? 0xff2e63 : 0x08d9d6;

      // Body Aura
      this.auraGraphics.rect(-4, -4, size + 8, size + 8).fill({ color: shieldColor, alpha: 0.7 });
      this.auraGraphics.rect(-2, -2, size + 4, size + 4).fill({ color: 0xfffffe, alpha: 0.9 });

      // Symmetrical 2px Overhead Canopy Shield Line 8px Above Head
      this.auraGraphics.rect(-6, -10, size + 12, 2).fill({ color: shieldColor });
      this.auraGraphics.rect(-7, -11, 3, 3).fill({ color: 0xfffffe });
      this.auraGraphics.rect(size + 4, -11, 3, 3).fill({ color: 0xfffffe });
    } else if (this.isSynergyActive && this.isAlive) {
      this.auraGraphics.rect(-4, -4, size + 8, size + 8).fill({ color: 0x08d9d6, alpha: 0.5 });
      this.auraGraphics.rect(-2, -2, size + 4, size + 4).fill({ color: 0xfffffe, alpha: 0.8 });
    }

    // 2. Main Cube Body with Enhanced 3D Shading
    this.graphics.rect(0, 0, size, size).fill({ color: hexColor });

    // Top Highlight Rim & Crisp White Corner Dot
    this.graphics.rect(0, 0, size, 1).fill({ color: lighterColor });
    this.graphics.rect(0, 0, 1, size).fill({ color: lighterColor });
    this.graphics.rect(0, 0, 1, 1).fill({ color: 0xfffffe });

    // Bottom & Right Dark Shadow Strips (2px)
    this.graphics.rect(0, size - 2, size, 2).fill({ color: darkerColor });
    this.graphics.rect(size - 2, 0, 2, size).fill({ color: darkerColor });

    // 3. Expressive Pixel Face
    let pupilOffsetX = 0;
    if (this.facingDirection === 'left') pupilOffsetX = -1;
    if (this.facingDirection === 'right') pupilOffsetX = 1;

    // Eye Whites (3x3) & Pupils (1x1)
    const eyeY = 3;
    const leftEyeX = 3;
    const rightEyeX = size - 3 - 3;

    const eyeWhiteColor = (this.isHyperActive || this.isShieldActive) ? (isBlinkPhase ? 0xff2e63 : 0xffde7d) : 0xffffff;

    // Left Eye
    this.graphics.rect(leftEyeX, eyeY, 3, 3).fill({ color: eyeWhiteColor });
    this.graphics.rect(leftEyeX + 1 + pupilOffsetX, eyeY + 1, 1, 1).fill({ color: 0x0f0e17 });

    // Right Eye
    this.graphics.rect(rightEyeX, eyeY, 3, 3).fill({ color: eyeWhiteColor });
    this.graphics.rect(rightEyeX + 1 + pupilOffsetX, eyeY + 1, 1, 1).fill({ color: 0x0f0e17 });

    // Mouth
    const mouthY = 8;
    if (this.isHyperActive || this.isShieldActive) {
      // Big open excited mouth in Hyper/Shield state (4x3)
      this.graphics.rect(Math.round(size / 2) - 2, mouthY, 4, 3).fill({ color: 0x0f0e17 });
      this.graphics.rect(Math.round(size / 2) - 1, mouthY + 1, 2, 1).fill({ color: 0xff2e63 });
    } else if (this.facingDirection !== 'idle') {
      // Open mouth when moving (2x2)
      this.graphics.rect(Math.round(size / 2) - 1, mouthY, 2, 2).fill({ color: 0x0f0e17 });
    } else {
      // Neutral line mouth (4x1)
      this.graphics.rect(Math.round(size / 2) - 2, mouthY + 1, 4, 1).fill({ color: 0x0f0e17 });
    }
  }

  public update(
    dt: number,
    baseSpeed: number,
    moveLeft: boolean,
    moveRight: boolean,
    screenWidth: number,
    synergyMultiplier = 1.0
  ): void {
    const wasHyperActive = this.isHyperActive;
    if (this.hyperTimer > 0) {
      this.hyperTimer -= dt;
      if (this.hyperTimer <= 0) this.hyperTimer = 0;
    }

    const wasShieldActive = this.isShieldActive;
    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.shieldTimer = 0;
    }

    const wasSynergyActive = this.isSynergyActive;
    this.isSynergyActive = synergyMultiplier > 1.0 && (moveLeft || moveRight);

    // Re-render continuously during warning blink phase
    const isWarningPhase = (this.isHyperActive && this.hyperTimer <= 2.0) || (this.isShieldActive && this.shieldTimer <= 1.2);
    if (wasHyperActive !== this.isHyperActive || wasShieldActive !== this.isShieldActive || wasSynergyActive !== this.isSynergyActive || isWarningPhase) {
      this.render();
    }

    // Update particles
    if (this.particles.length > 0) {
      this.updateParticles(dt);
    }

    if (!this.isAlive) return;

    // 3.0x Hyper Speed vs 2.0x Synergy Multiplier
    const finalSpeedMultiplier = this.isHyperActive ? 3.0 : synergyMultiplier;
    const currentSpeed = baseSpeed * finalSpeedMultiplier;

    // Stretch player sprite horizontally during boosted movement for rocket feel!
    if (finalSpeedMultiplier > 1.0 && (moveLeft || moveRight)) {
      this.graphics.scale.set(1.25, 0.8);
    } else {
      this.graphics.scale.set(1.0, 1.0);
    }

    // Track direction for eye pupil rendering
    let newDirection: 'left' | 'right' | 'idle' = 'idle';
    if (moveLeft) {
      this.x -= currentSpeed * dt;
      newDirection = 'left';
    }
    if (moveRight) {
      this.x += currentSpeed * dt;
      newDirection = 'right';
    }

    // Spawn horizontal Speed Wind Lines when moving with speed boost!
    if (finalSpeedMultiplier > 1.0 && (moveLeft || moveRight)) {
      const lineX = moveLeft ? this.radius * 2 + 2 : -10;
      const lineColor = this.isHyperActive ? 0xa55eea : 0x08d9d6;
      this.particles.push({
        x: lineX,
        y: Math.random() * (this.radius * 2),
        vx: moveLeft ? 80 : -80,
        vy: 0,
        life: 0.15,
        color: lineColor,
        isSpeedLine: true,
      });
    }

    // Trailing Star Spark Particles during Hyper State or Shield State
    if (this.isHyperActive || this.isShieldActive) {
      const trailColor = this.isHyperActive ? 0xa55eea : 0x08d9d6;
      this.particles.push({
        x: this.radius + (Math.random() * 12 - 6),
        y: this.radius + (Math.random() * 12 - 6),
        vx: (Math.random() - 0.5) * 30,
        vy: 30 + Math.random() * 40,
        life: 0.3,
        color: Math.random() > 0.4 ? trailColor : Math.random() > 0.5 ? 0xffde7d : 0xfffffe,
        isStar: true,
      });
    }

    if (newDirection !== this.facingDirection) {
      this.facingDirection = newDirection;
      this.render();
    }

    // Clamp horizontal bounds
    this.x = Math.max(this.radius, Math.min(screenWidth - this.radius, this.x));
    this.container.x = Math.round(this.x - this.radius);
    this.container.y = Math.round(this.y - this.radius);
  }

  public eliminate(): void {
    if (!this.isAlive || this.isHyperActive || this.isShieldActive) return;

    this.isAlive = false;
    this.graphics.visible = false;
    this.auraGraphics.visible = false;

    // Spawn 10 elimination particles
    const hexColor = parseInt(this.color.replace('#', ''), 16) || 0xffffff;
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const spd = 40 + Math.random() * 60;
      this.particles.push({
        x: this.radius,
        y: this.radius,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.35,
        color: i % 2 === 0 ? 0xfffffe : hexColor,
      });
    }
  }

  private updateParticles(dt: number): void {
    this.particleGraphics.clear();
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life > 0) {
        if (p.isSpeedLine) {
          this.particleGraphics.rect(Math.round(p.x), Math.round(p.y), 8, 2).fill({ color: p.color });
        } else {
          const size = p.isStar ? 3 : 2;
          this.particleGraphics.rect(Math.round(p.x), Math.round(p.y), size, size).fill({ color: p.color });
        }
        return true;
      }
      return false;
    });
  }

  public destroy(): void {
    this.particleGraphics.destroy();
    this.auraGraphics.destroy();
    this.graphics.destroy();
    this.container.destroy();
  }
}
