import { Graphics, Texture } from 'pixi.js';

// Sky top colour per phase — index matches TrackPhase in core/HandcraftedTrack.ts
const SKY_TOP: number[] = [0x3a7bd5, 0x2c3e6b, 0x1a3a5c, 0x05050a, 0x1a1033, 0xe8a33d, 0x1a6b8a];
const SKY_HORIZON: number[] = [0x8fd3f4, 0x5a6a8a, 0x3a5a7a, 0x0f0e17, 0x4a2a6a, 0xffe0b3, 0x6dd5ed];

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const gg = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (gg << 8) | b;
}

function skyGradient(g: Graphics, viewW: number, horizonY: number, top: number, horizon: number, bands = 10): void {
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    g.rect(0, Math.floor(horizonY * t0), viewW, Math.ceil(horizonY * (t1 - t0)) + 1)
      .fill({ color: lerpColor(top, horizon, t0) });
  }
}

function drawSun(g: Graphics, x: number, y: number, core: number, glow: number): void {
  g.circle(x, y, 32).fill({ color: glow, alpha: 0.12 });
  g.circle(x, y, 24).fill({ color: glow, alpha: 0.25 });
  g.circle(x, y, 18).fill({ color: core, alpha: 0.55 });
  g.circle(x, y, 12).fill({ color: 0xffffff, alpha: 0.85 });
  g.circle(x, y, 7).fill({ color: 0xffffff });
}

function drawSynthSun(g: Graphics, x: number, y: number, r: number): void {
  g.circle(x, y, r * 1.5).fill({ color: 0xff6ac1, alpha: 0.1 });
  // Gradient disc built from banded circles (orange core -> magenta rim)
  const bands = 6;
  for (let i = bands; i >= 0; i--) {
    const t = i / bands;
    g.circle(x, y, r * t).fill({ color: lerpColor(0xffcc33, 0xff2d95, 1 - t) });
  }
  // Horizontal scanline cutouts through the lower half (classic synthwave sun)
  for (let i = 0; i < 5; i++) {
    const ly = y + r * (0.15 + i * 0.16);
    if (ly > y + r) continue;
    const chordHalf = Math.sqrt(Math.max(0, r * r - (ly - y) * (ly - y)));
    g.rect(x - chordHalf, ly, chordHalf * 2, Math.max(1, r * 0.05)).fill({ color: 0x1a1033, alpha: 0.9 });
  }
}

function drawClouds(g: Graphics, viewW: number, horizonY: number, parallaxX: number, color: number, alpha: number): void {
  const c1 = ((parallaxX * 0.3) % (viewW + 300)) - 150;
  g.ellipse(60 + c1, horizonY - 28, 38, 9).fill({ color, alpha: alpha * 0.6 });
  g.ellipse(78 + c1, horizonY - 24, 22, 6).fill({ color, alpha: alpha * 0.5 });
  const c2 = ((parallaxX * 0.22) % (viewW + 400)) - 200;
  g.ellipse(280 + c2, horizonY - 42, 32, 8).fill({ color, alpha: alpha * 0.5 });
  g.ellipse(296 + c2, horizonY - 38, 20, 6).fill({ color, alpha: alpha * 0.45 });
  const c3 = ((parallaxX * 0.4) % (viewW + 250)) - 125;
  g.ellipse(420 + c3, horizonY - 32, 26, 7).fill({ color, alpha: alpha * 0.45 });
}

function drawSnowMountains(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const px = ((parallaxX * 0.4) % (viewW + 600)) - 300;
  g.poly([
    (0 + px), horizonY, (30 + px), horizonY - 8, (60 + px), horizonY - 22, (90 + px), horizonY - 12,
    (130 + px), horizonY - 38, (170 + px), horizonY - 18, (210 + px), horizonY - 32, (260 + px), horizonY - 10,
    (310 + px), horizonY - 44, (360 + px), horizonY - 16, (410 + px), horizonY - 28, (460 + px), horizonY - 8,
    (viewW + 300 + px), horizonY,
  ]).fill({ color: 0x4a5468, alpha: 0.85 });
  g.poly([(130 + px), horizonY - 38, (118 + px), horizonY - 28, (142 + px), horizonY - 28]).fill({ color: 0xffffff, alpha: 0.7 });
  g.poly([(310 + px), horizonY - 44, (298 + px), horizonY - 32, (322 + px), horizonY - 32]).fill({ color: 0xffffff, alpha: 0.65 });
  g.poly([(210 + px), horizonY - 32, (200 + px), horizonY - 24, (220 + px), horizonY - 24]).fill({ color: 0xffffff, alpha: 0.5 });

  const pxMid = ((parallaxX * 0.7) % (viewW + 500)) - 250;
  g.poly([
    (0 + pxMid), horizonY, (50 + pxMid), horizonY - 6, (110 + pxMid), horizonY - 14, (180 + pxMid), horizonY - 5,
    (250 + pxMid), horizonY - 12, (320 + pxMid), horizonY - 4, (390 + pxMid), horizonY - 10, (viewW + 250 + pxMid), horizonY,
  ]).fill({ color: 0x353b48, alpha: 0.7 });

  const px2 = ((parallaxX * 1.1) % (viewW + 400)) - 200;
  g.poly([
    (0 + px2), horizonY, (40 + px2), horizonY - 4, (90 + px2), horizonY - 7, (150 + px2), horizonY - 5,
    (210 + px2), horizonY - 8, (270 + px2), horizonY - 6, (330 + px2), horizonY - 9, (viewW + 200 + px2), horizonY,
  ]).fill({ color: 0x1a4a2a, alpha: 0.75 });

  for (let t = 0; t < 8; t++) {
    const tx = (px2 * 1.3 + t * 50) % (viewW + 200) - 100;
    if (tx < -10 || tx > viewW + 10) continue;
    g.poly([tx, horizonY - 16, tx - 5, horizonY - 2, tx + 5, horizonY - 2]).fill({ color: 0x1a4a22, alpha: 0.7 });
  }
}

function drawCoastal(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  skyGradient(g, viewW, horizonY, SKY_TOP[0], SKY_HORIZON[0]);
  drawSun(g, viewW - 70, horizonY - 44, 0xf4d160, 0xffdd66);
  drawClouds(g, viewW, horizonY, parallaxX, 0xffffff, 0.65);
  // Distant sea horizon band + glints
  g.rect(0, horizonY - 6, viewW, 6).fill({ color: 0x0a6ba8, alpha: 0.5 });
  const px = ((parallaxX * 0.5) % (viewW + 40)) - 20;
  for (let i = 0; i < 10; i++) {
    const gx = (px + i * 55) % viewW;
    g.rect(gx, horizonY - 4, 8, 1).fill({ color: 0xffffff, alpha: 0.35 });
  }
  // Palm silhouette line far along the shore
  const p2 = ((parallaxX * 1.1) % (viewW + 300)) - 150;
  for (let t = 0; t < 6; t++) {
    const tx = (p2 + t * 70) % (viewW + 150) - 75;
    if (tx < -20 || tx > viewW + 20) continue;
    g.rect(tx - 1, horizonY - 14, 2, 14).fill({ color: 0x1a4a2a, alpha: 0.6 });
    for (let fr = 0; fr < 4; fr++) {
      const ang = (fr / 4) * Math.PI * 2;
      g.ellipse(tx + Math.cos(ang) * 6, horizonY - 14 + Math.sin(ang) * 3, 6, 2).fill({ color: 0x1e5a2a, alpha: 0.55 });
    }
  }
}

function drawMountain(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  skyGradient(g, viewW, horizonY, SKY_TOP[1], SKY_HORIZON[1]);
  drawSun(g, viewW - 70, horizonY - 36, 0xffe9a8, 0xffe9a8);
  drawClouds(g, viewW, horizonY, parallaxX, 0x3d4654, 0.5);
  drawSnowMountains(g, viewW, horizonY, parallaxX);
  // Mist band at the tree line
  g.rect(0, horizonY - 3, viewW, 3).fill({ color: 0xdfe6e9, alpha: 0.15 });
}

function drawBridge(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  skyGradient(g, viewW, horizonY, SKY_TOP[2], SKY_HORIZON[2]);
  drawSun(g, viewW - 90, horizonY - 30, 0xdff9fb, 0xaee7ff);
  drawClouds(g, viewW, horizonY, parallaxX, 0xdfe6e9, 0.55);
  g.rect(0, horizonY - 8, viewW, 8).fill({ color: 0x0d5f8a, alpha: 0.55 });
  const px = ((parallaxX * 0.45) % (viewW + 40)) - 20;
  for (let i = 0; i < 12; i++) {
    const gx = (px + i * 42) % viewW;
    g.rect(gx, horizonY - 5, 10, 1).fill({ color: 0xffffff, alpha: 0.3 });
  }
  // Distant container ship silhouettes
  const sOff = ((parallaxX * 0.15) % (viewW + 500)) - 250;
  g.rect(120 + sOff, horizonY - 9, 46, 4).fill({ color: 0x1e272e, alpha: 0.5 });
  g.rect(130 + sOff, horizonY - 12, 8, 3).fill({ color: 0x1e272e, alpha: 0.5 });
  const sOff2 = ((parallaxX * 0.2 + 260) % (viewW + 500)) - 250;
  g.rect(340 + sOff2, horizonY - 8, 34, 3).fill({ color: 0x1e272e, alpha: 0.4 });
}

function drawTunnel(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  // Dark cavern gradient with a distant "exit glow" ring near the vanishing point
  skyGradient(g, viewW, horizonY, SKY_TOP[3], SKY_HORIZON[3]);
  const glowX = viewW / 2;
  const glowY = horizonY - 2;
  g.circle(glowX, glowY, 26).fill({ color: 0x00f0ff, alpha: 0.06 });
  g.circle(glowX, glowY, 16).fill({ color: 0x00f0ff, alpha: 0.12 });
  g.circle(glowX, glowY, 8).fill({ color: 0x8af7ff, alpha: 0.3 });
  // Jagged rock ceiling silhouette instead of mountains
  const px = ((parallaxX * 0.5) % (viewW + 300)) - 150;
  const teeth: number[] = [];
  for (let i = 0; i <= 14; i++) {
    const tx = (i / 14) * (viewW + 300) + px;
    const ty = horizonY - 6 - ((i * 37) % 11);
    teeth.push(tx, ty);
  }
  g.poly([px, horizonY, ...teeth, viewW + 300 + px, horizonY]).fill({ color: 0x14141f, alpha: 0.9 });
  // Neon conduit streaks along the ceiling
  for (let i = 0; i < 6; i++) {
    const nx = ((px * 1.3 + i * 60) % (viewW + 200)) - 100;
    g.rect(nx, horizonY - 4, 24, 1).fill({ color: 0x00f0ff, alpha: 0.4 });
  }
}

function drawSunset(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  skyGradient(g, viewW, horizonY, SKY_TOP[4], SKY_HORIZON[4]);
  drawSynthSun(g, viewW / 2, horizonY - Math.round(horizonY * 0.32), Math.max(14, Math.round(horizonY * 0.55)));
  // Distant purple mountain silhouette
  const px = ((parallaxX * 0.4) % (viewW + 500)) - 250;
  g.poly([
    (0 + px), horizonY, (60 + px), horizonY - 14, (130 + px), horizonY - 4, (200 + px), horizonY - 20,
    (280 + px), horizonY - 6, (350 + px), horizonY - 16, (viewW + 250 + px), horizonY,
  ]).fill({ color: 0x2d1b5e, alpha: 0.8 });
  // Palm silhouettes against the sunset
  const p2 = ((parallaxX * 1.0) % (viewW + 260)) - 130;
  for (let t = 0; t < 5; t++) {
    const tx = (p2 + t * 65) % (viewW + 130) - 65;
    if (tx < -20 || tx > viewW + 20) continue;
    g.rect(tx - 1, horizonY - 15, 2, 15).fill({ color: 0x120a2e, alpha: 0.85 });
    for (let fr = 0; fr < 5; fr++) {
      const ang = (fr / 5) * Math.PI * 2;
      g.ellipse(tx + Math.cos(ang) * 6, horizonY - 15 + Math.sin(ang) * 2.5, 6, 2).fill({ color: 0x120a2e, alpha: 0.8 });
    }
  }
  // Neon pylon silhouettes
  for (let i = 0; i < 3; i++) {
    const nx = ((px * 0.6 + i * 160) % (viewW + 100)) - 50;
    g.rect(nx, horizonY - 10, 2, 10).fill({ color: 0xff2d95, alpha: 0.5 });
    g.rect(nx - 4, horizonY - 10, 10, 1).fill({ color: 0xff2d95, alpha: 0.5 });
  }
}

function drawDesert(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  skyGradient(g, viewW, horizonY, SKY_TOP[5], SKY_HORIZON[5]);
  drawSun(g, viewW - 80, horizonY - 50, 0xffd580, 0xffcc66);
  // Heat-shimmer band just above the horizon
  const shimmer = Math.sin(Date.now() * 0.003) * 2;
  g.rect(0, horizonY - 4 + shimmer, viewW, 4).fill({ color: 0xffe0b3, alpha: 0.12 });
  // Distant mesa silhouettes
  const px = ((parallaxX * 0.35) % (viewW + 400)) - 200;
  g.poly([
    (0 + px), horizonY, (40 + px), horizonY - 10, (70 + px), horizonY - 10, (90 + px), horizonY - 2,
    (160 + px), horizonY - 2, (180 + px), horizonY - 16, (220 + px), horizonY - 16, (240 + px), horizonY,
    (viewW + 300 + px), horizonY,
  ]).fill({ color: 0xb5652e, alpha: 0.55 });
}

function drawOpenSea(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  skyGradient(g, viewW, horizonY, SKY_TOP[6], SKY_HORIZON[6]);
  drawSun(g, viewW - 70, horizonY - 40, 0xfff9e6, 0xbdf0ff);
  drawClouds(g, viewW, horizonY, parallaxX, 0xffffff, 0.6);
  g.rect(0, horizonY - 6, viewW, 6).fill({ color: 0x0a8ab8, alpha: 0.5 });
  // Distant island silhouette
  const px = ((parallaxX * 0.25) % (viewW + 400)) - 200;
  g.poly([(60 + px), horizonY, (100 + px), horizonY - 9, (150 + px), horizonY - 4, (190 + px), horizonY]).fill({ color: 0x1a4a5c, alpha: 0.55 });
  // Gulls
  const gOff = ((parallaxX * 0.6) % (viewW + 200)) - 100;
  for (let i = 0; i < 3; i++) {
    const gx = (gOff + i * 90) % viewW;
    const gy = horizonY - 20 - (i % 2) * 6;
    g.poly([gx - 4, gy + 2, gx, gy, gx + 4, gy + 2]).stroke({ width: 1, color: 0x1e272e, alpha: 0.5 });
  }
}

const PHASE_SKIES: ((g: Graphics, viewW: number, horizonY: number, parallaxX: number) => void)[] = [
  drawCoastal, drawMountain, drawBridge, drawTunnel, drawSunset, drawDesert, drawOpenSea,
];

/** Draws the phase-specific procedural backdrop, or the loaded video skybox if available. */
export function drawSkybox(
  g: Graphics,
  viewW: number,
  horizonY: number,
  phaseIndex: number,
  parallaxX: number,
  skyboxTexture?: Texture | null
): void {
  if (skyboxTexture && skyboxTexture !== Texture.WHITE) {
    g.texture(skyboxTexture, 0xffffff, 0, 0, viewW, horizonY);
    return;
  }
  const draw = PHASE_SKIES[phaseIndex] ?? drawCoastal;
  draw(g, viewW, horizonY, parallaxX);
}
