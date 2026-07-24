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
    g.rect((50 - p0) % w, 40, 24, h - 40).fill({ color: 0x0a192f, alpha: 0.8 });
    g.rect((250 - p0) % w, 40, 28, h - 40).fill({ color: 0x0a192f, alpha: 0.8 });
    g.rect((450 - p0) % w, 40, 24, h - 40).fill({ color: 0x0a192f, alpha: 0.8 });
    g.rect((680 - p0) % w, 40, 28, h - 40).fill({ color: 0x0a192f, alpha: 0.8 });

    // Gothic Arch Trims
    g.circle((50 - p0) % w + 12, 50, 18).fill({ color: 0x070b19 });
    g.circle((250 - p0) % w + 14, 50, 20).fill({ color: 0x070b19 });

    // 3. Layer 1: Midground Cavern Wall Silhouettes (Parallax 0.35x)
    const p1 = cameraX * 0.35;
    g.poly([
      (0 - p1) % w, h,
      (60 - p1) % w, h - 120,
      (160 - p1) % w, h - 80,
      (280 - p1) % w, h - 140,
      (400 - p1) % w, h - 90,
      (540 - p1) % w, h - 160,
      (700 - p1) % w, h - 100,
      (850 - p1) % w, h - 180,
      (960 - p1) % w, h
    ]).fill({ color: 0x112240, alpha: 0.9 });

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
      const px = (plant.x - p2) % w;
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
