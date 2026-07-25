import { Graphics } from 'pixi.js';
import { CAVERN_CONFIG } from '../config';

export class ParallaxCavern {
  private particles: { x: number; y: number; vx: number; vy: number; radius: number; alpha: number }[] = [];
  private animTimer = 0;

  constructor() {
    // Generate 30 floating bioluminescent spore particles
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * CAVERN_CONFIG.width,
        y: Math.random() * CAVERN_CONFIG.height,
        vx: (Math.random() - 0.5) * 15,
        vy: -10 - Math.random() * 20,
        radius: 1 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
      });
    }
  }

  public posMod(val: number, wrap: number): number {
    return ((val % wrap) + wrap) % wrap;
  }

  public update(dt: number): void {
    this.animTimer += dt;

    // Drifting Spore Particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.y < 0) {
        p.y = CAVERN_CONFIG.height;
        p.x = Math.random() * CAVERN_CONFIG.width;
      }
      if (p.x < 0) p.x = CAVERN_CONFIG.width;
      if (p.x > CAVERN_CONFIG.width) p.x = 0;
    }
  }

  public render(g: Graphics, cameraX: number): void {
    const w = CAVERN_CONFIG.width;
    const h = CAVERN_CONFIG.height;

    // 1. Deep Cavern Gradient Base (Dark Navy)
    g.rect(0, 0, w, h).fill({ color: 0x070b19 });

    // 2. Layer 0: Distant Gothic Pillars & Arches (Parallax 0.1x)
    const p0 = cameraX * 0.1;
    const pillarSpecs = [
      { x: 50, w: 24 },
      { x: 250, w: 28 },
      { x: 450, w: 24 },
      { x: 680, w: 28 },
    ];

    for (const pillar of pillarSpecs) {
      const px = this.posMod(pillar.x - p0, w);
      g.rect(px, 40, pillar.w, h - 40).fill({ color: 0x0a192f, alpha: 0.8 });
      if (px + pillar.w > w) {
        g.rect(px - w, 40, pillar.w, h - 40).fill({ color: 0x0a192f, alpha: 0.8 });
      }
    }

    // Gothic Arch Trims
    const arch1X = this.posMod(50 - p0, w) + 12;
    g.circle(arch1X, 50, 18).fill({ color: 0x070b19 });
    if (arch1X + 18 > w) g.circle(arch1X - w, 50, 18).fill({ color: 0x070b19 });

    const arch2X = this.posMod(250 - p0, w) + 14;
    g.circle(arch2X, 50, 20).fill({ color: 0x070b19 });
    if (arch2X + 20 > w) g.circle(arch2X - w, 50, 20).fill({ color: 0x070b19 });

    // 3. Layer 1: Midground Cavern Wall Silhouettes (Parallax 0.35x)
    const p1 = cameraX * 0.35;
    const shiftX = this.posMod(p1, w);

    const basePts: [number, number][] = [
      [0, h],
      [60, h - 120],
      [160, h - 80],
      [280, h - 140],
      [400, h - 90],
      [540, h - 160],
      [700, h - 100],
      [850, h - 180],
      [960, h]
    ];

    for (const offset of [-shiftX, -shiftX + w]) {
      const polyCoords: number[] = [];
      for (const [bx, by] of basePts) {
        polyCoords.push(bx + offset, by);
      }
      g.poly(polyCoords).fill({ color: 0x112240, alpha: 0.9 });
    }

    // 4. Layer 2: Bioluminescent Cyan Flora & Glowing Plants (Parallax 0.7x)
    const p2 = cameraX * 0.7;
    const flicker = Math.sin(this.animTimer * 6) * 0.2 + 0.8;

    const plantLocations = [
      { x: 80, y: h - 90 },
      { x: 220, y: h - 110 },
      { x: 380, y: h - 80 },
      { x: 580, y: h - 130 },
      { x: 760, y: h - 95 },
    ];

    for (const plant of plantLocations) {
      const px = this.posMod(plant.x - p2, w);
      // Glowing Cyan Bulb
      g.circle(px, plant.y, 8).fill({ color: 0x00f0ff, alpha: 0.8 * flicker });
      g.circle(px, plant.y - 3, 4).fill({ color: 0xffffff, alpha: 0.9 * flicker });
      // Vine Stems
      g.rect(px - 1, plant.y, 2, 20).fill({ color: 0x1abc9c });
    }

    // 5. Layer 3: Floating Spore Particles (Parallax 1.0x)
    for (const p of this.particles) {
      g.circle(p.x, p.y, p.radius).fill({ color: 0x00f0ff, alpha: p.alpha * flicker });
    }
  }
}
