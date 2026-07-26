import { Graphics, Texture } from 'pixi.js';

// Sky top colour per phase — index matches TrackPhase in core/HandcraftedTrack.ts
const SKY_TOP: number[] = [0x3a7bd5, 0x2c3e6b, 0x1a3a5c, 0x05050a, 0x1a1033, 0xe8a33d, 0x1a6b8a];
const SKY_HORIZON: number[] = [0x8fd3f4, 0x5a6a8a, 0x3a5a7a, 0x0f0e17, 0x4a2a6a, 0xffe0b3, 0x6dd5ed];

/** Every biome painter below was authored against a 480-wide viewport — its literals (cloud/
 * mountain/palm positions, spacings, offsets) are legacy-480 pixel values. `unitFor(viewW)`
 * gives the multiplier that rescales them to the actual viewport, so the composition is
 * preserved exactly at any resolution instead of the same absolute offsets reading as
 * squeezed-together at higher pixel density. `viewW` itself (used for wrap-around modulo
 * widths) needs no such scaling — it's already the live viewport. */
function unitFor(viewW: number): number {
  return viewW / 480;
}

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const gg = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (gg << 8) | b;
}

/** Band count doubles past the legacy resolution — a finer gradient ramp is one of the cheapest
 * ways to spend the extra vertical pixel budget on visibly more detail. */
function skyGradient(g: Graphics, viewW: number, horizonY: number, top: number, horizon: number, bands = 10): void {
  const u = unitFor(viewW);
  const bandCount = Math.round(bands * Math.max(1, u));
  for (let i = 0; i < bandCount; i++) {
    const t0 = i / bandCount;
    const t1 = (i + 1) / bandCount;
    g.rect(0, Math.floor(horizonY * t0), viewW, Math.ceil(horizonY * (t1 - t0)) + 1)
      .fill({ color: lerpColor(top, horizon, t0) });
  }
}

function drawSun(g: Graphics, x: number, y: number, core: number, glow: number, u = 1): void {
  g.circle(x, y, 32 * u).fill({ color: glow, alpha: 0.12 });
  g.circle(x, y, 24 * u).fill({ color: glow, alpha: 0.25 });
  g.circle(x, y, 18 * u).fill({ color: core, alpha: 0.55 });
  g.circle(x, y, 12 * u).fill({ color: 0xffffff, alpha: 0.85 });
  g.circle(x, y, 7 * u).fill({ color: 0xffffff });
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
  const u = unitFor(viewW);
  const c1 = ((parallaxX * 0.3) % (viewW + 300 * u)) - 150 * u;
  g.ellipse(60 * u + c1, horizonY - 28 * u, 38 * u, 9 * u).fill({ color, alpha: alpha * 0.6 });
  g.ellipse(78 * u + c1, horizonY - 24 * u, 22 * u, 6 * u).fill({ color, alpha: alpha * 0.5 });
  const c2 = ((parallaxX * 0.22) % (viewW + 400 * u)) - 200 * u;
  g.ellipse(280 * u + c2, horizonY - 42 * u, 32 * u, 8 * u).fill({ color, alpha: alpha * 0.5 });
  g.ellipse(296 * u + c2, horizonY - 38 * u, 20 * u, 6 * u).fill({ color, alpha: alpha * 0.45 });
  const c3 = ((parallaxX * 0.4) % (viewW + 250 * u)) - 125 * u;
  g.ellipse(420 * u + c3, horizonY - 32 * u, 26 * u, 7 * u).fill({ color, alpha: alpha * 0.45 });
  // Extra high-altitude wisps — new detail the wider sky affords
  if (u > 1) {
    const c4 = ((parallaxX * 0.16) % (viewW + 350 * u)) - 175 * u;
    g.ellipse(150 * u + c4, horizonY - 56 * u, 18 * u, 4 * u).fill({ color, alpha: alpha * 0.3 });
  }
}

function drawSnowMountains(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  const px = ((parallaxX * 0.4) % (viewW + 600 * u)) - 300 * u;
  g.poly([
    (0 + px), horizonY, (30 * u + px), horizonY - 8 * u, (60 * u + px), horizonY - 22 * u, (90 * u + px), horizonY - 12 * u,
    (130 * u + px), horizonY - 38 * u, (170 * u + px), horizonY - 18 * u, (210 * u + px), horizonY - 32 * u, (260 * u + px), horizonY - 10 * u,
    (310 * u + px), horizonY - 44 * u, (360 * u + px), horizonY - 16 * u, (410 * u + px), horizonY - 28 * u, (460 * u + px), horizonY - 8 * u,
    (viewW + 300 * u + px), horizonY,
  ]).fill({ color: 0x4a5468, alpha: 0.85 });
  g.poly([(130 * u + px), horizonY - 38 * u, (118 * u + px), horizonY - 28 * u, (142 * u + px), horizonY - 28 * u]).fill({ color: 0xffffff, alpha: 0.7 });
  g.poly([(310 * u + px), horizonY - 44 * u, (298 * u + px), horizonY - 32 * u, (322 * u + px), horizonY - 32 * u]).fill({ color: 0xffffff, alpha: 0.65 });
  g.poly([(210 * u + px), horizonY - 32 * u, (200 * u + px), horizonY - 24 * u, (220 * u + px), horizonY - 24 * u]).fill({ color: 0xffffff, alpha: 0.5 });

  const pxMid = ((parallaxX * 0.7) % (viewW + 500 * u)) - 250 * u;
  g.poly([
    (0 + pxMid), horizonY, (50 * u + pxMid), horizonY - 6 * u, (110 * u + pxMid), horizonY - 14 * u, (180 * u + pxMid), horizonY - 5 * u,
    (250 * u + pxMid), horizonY - 12 * u, (320 * u + pxMid), horizonY - 4 * u, (390 * u + pxMid), horizonY - 10 * u, (viewW + 250 * u + pxMid), horizonY,
  ]).fill({ color: 0x353b48, alpha: 0.7 });

  const px2 = ((parallaxX * 1.1) % (viewW + 400 * u)) - 200 * u;
  g.poly([
    (0 + px2), horizonY, (40 * u + px2), horizonY - 4 * u, (90 * u + px2), horizonY - 7 * u, (150 * u + px2), horizonY - 5 * u,
    (210 * u + px2), horizonY - 8 * u, (270 * u + px2), horizonY - 6 * u, (330 * u + px2), horizonY - 9 * u, (viewW + 200 * u + px2), horizonY,
  ]).fill({ color: 0x1a4a2a, alpha: 0.75 });

  for (let t = 0; t < 8; t++) {
    const tx = (px2 * 1.3 + t * 50 * u) % (viewW + 200 * u) - 100 * u;
    if (tx < -10 * u || tx > viewW + 10 * u) continue;
    g.poly([tx, horizonY - 16 * u, tx - 5 * u, horizonY - 2 * u, tx + 5 * u, horizonY - 2 * u]).fill({ color: 0x1a4a22, alpha: 0.7 });
  }
}

function drawCoastal(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  skyGradient(g, viewW, horizonY, SKY_TOP[0], SKY_HORIZON[0]);
  drawSun(g, viewW - 70 * u, horizonY - 44 * u, 0xf4d160, 0xffdd66, u);
  drawClouds(g, viewW, horizonY, parallaxX, 0xffffff, 0.65);
  // Distant sea horizon band + glints
  g.rect(0, horizonY - 6 * u, viewW, 6 * u).fill({ color: 0x0a6ba8, alpha: 0.5 });
  const px = ((parallaxX * 0.5) % (viewW + 40 * u)) - 20 * u;
  for (let i = 0; i < 10; i++) {
    const gx = (px + i * 55 * u) % viewW;
    g.rect(gx, horizonY - 4 * u, 8 * u, 1 * u).fill({ color: 0xffffff, alpha: 0.35 });
  }
  // Palm silhouette line far along the shore
  const p2 = ((parallaxX * 1.1) % (viewW + 300 * u)) - 150 * u;
  for (let t = 0; t < 6; t++) {
    const tx = (p2 + t * 70 * u) % (viewW + 150 * u) - 75 * u;
    if (tx < -20 * u || tx > viewW + 20 * u) continue;
    g.rect(tx - 1 * u, horizonY - 14 * u, 2 * u, 14 * u).fill({ color: 0x1a4a2a, alpha: 0.6 });
    for (let fr = 0; fr < 4; fr++) {
      const ang = (fr / 4) * Math.PI * 2;
      g.ellipse(tx + Math.cos(ang) * 6 * u, horizonY - 14 * u + Math.sin(ang) * 3 * u, 6 * u, 2 * u).fill({ color: 0x1e5a2a, alpha: 0.55 });
    }
  }
}

function drawMountain(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  skyGradient(g, viewW, horizonY, SKY_TOP[1], SKY_HORIZON[1]);
  drawSun(g, viewW - 70 * u, horizonY - 36 * u, 0xffe9a8, 0xffe9a8, u);
  drawClouds(g, viewW, horizonY, parallaxX, 0x3d4654, 0.5);
  drawSnowMountains(g, viewW, horizonY, parallaxX);
  // Mist band at the tree line
  g.rect(0, horizonY - 3 * u, viewW, 3 * u).fill({ color: 0xdfe6e9, alpha: 0.15 });
}

function drawBridge(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  skyGradient(g, viewW, horizonY, SKY_TOP[2], SKY_HORIZON[2]);
  drawSun(g, viewW - 90 * u, horizonY - 30 * u, 0xdff9fb, 0xaee7ff, u);
  drawClouds(g, viewW, horizonY, parallaxX, 0xdfe6e9, 0.55);
  g.rect(0, horizonY - 8 * u, viewW, 8 * u).fill({ color: 0x0d5f8a, alpha: 0.55 });
  const px = ((parallaxX * 0.45) % (viewW + 40 * u)) - 20 * u;
  for (let i = 0; i < 12; i++) {
    const gx = (px + i * 42 * u) % viewW;
    g.rect(gx, horizonY - 5 * u, 10 * u, 1 * u).fill({ color: 0xffffff, alpha: 0.3 });
  }
  // Distant container ship silhouettes
  const sOff = ((parallaxX * 0.15) % (viewW + 500 * u)) - 250 * u;
  g.rect(120 * u + sOff, horizonY - 9 * u, 46 * u, 4 * u).fill({ color: 0x1e272e, alpha: 0.5 });
  g.rect(130 * u + sOff, horizonY - 12 * u, 8 * u, 3 * u).fill({ color: 0x1e272e, alpha: 0.5 });
  const sOff2 = ((parallaxX * 0.2 + 260 * u) % (viewW + 500 * u)) - 250 * u;
  g.rect(340 * u + sOff2, horizonY - 8 * u, 34 * u, 3 * u).fill({ color: 0x1e272e, alpha: 0.4 });
}

function drawTunnel(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  // Dark cavern gradient with a distant "exit glow" ring near the vanishing point
  skyGradient(g, viewW, horizonY, SKY_TOP[3], SKY_HORIZON[3]);
  const glowX = viewW / 2;
  const glowY = horizonY - 2 * u;
  g.circle(glowX, glowY, 26 * u).fill({ color: 0x00f0ff, alpha: 0.06 });
  g.circle(glowX, glowY, 16 * u).fill({ color: 0x00f0ff, alpha: 0.12 });
  g.circle(glowX, glowY, 8 * u).fill({ color: 0x8af7ff, alpha: 0.3 });
  // Jagged rock ceiling silhouette instead of mountains
  const px = ((parallaxX * 0.5) % (viewW + 300 * u)) - 150 * u;
  const teeth: number[] = [];
  for (let i = 0; i <= 14; i++) {
    const tx = (i / 14) * (viewW + 300 * u) + px;
    const ty = horizonY - 6 * u - ((i * 37) % 11) * u;
    teeth.push(tx, ty);
  }
  g.poly([px, horizonY, ...teeth, viewW + 300 * u + px, horizonY]).fill({ color: 0x14141f, alpha: 0.9 });
  // Neon conduit streaks along the ceiling
  for (let i = 0; i < 6; i++) {
    const nx = ((px * 1.3 + i * 60 * u) % (viewW + 200 * u)) - 100 * u;
    g.rect(nx, horizonY - 4 * u, 24 * u, 1 * u).fill({ color: 0x00f0ff, alpha: 0.4 });
  }
}

function drawSunset(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  skyGradient(g, viewW, horizonY, SKY_TOP[4], SKY_HORIZON[4]);
  drawSynthSun(g, viewW / 2, horizonY - Math.round(horizonY * 0.32), Math.max(14 * u, Math.round(horizonY * 0.55)));
  // Distant purple mountain silhouette
  const px = ((parallaxX * 0.4) % (viewW + 500 * u)) - 250 * u;
  g.poly([
    (0 + px), horizonY, (60 * u + px), horizonY - 14 * u, (130 * u + px), horizonY - 4 * u, (200 * u + px), horizonY - 20 * u,
    (280 * u + px), horizonY - 6 * u, (350 * u + px), horizonY - 16 * u, (viewW + 250 * u + px), horizonY,
  ]).fill({ color: 0x2d1b5e, alpha: 0.8 });
  // Palm silhouettes against the sunset
  const p2 = ((parallaxX * 1.0) % (viewW + 260 * u)) - 130 * u;
  for (let t = 0; t < 5; t++) {
    const tx = (p2 + t * 65 * u) % (viewW + 130 * u) - 65 * u;
    if (tx < -20 * u || tx > viewW + 20 * u) continue;
    g.rect(tx - 1 * u, horizonY - 15 * u, 2 * u, 15 * u).fill({ color: 0x120a2e, alpha: 0.85 });
    for (let fr = 0; fr < 5; fr++) {
      const ang = (fr / 5) * Math.PI * 2;
      g.ellipse(tx + Math.cos(ang) * 6 * u, horizonY - 15 * u + Math.sin(ang) * 2.5 * u, 6 * u, 2 * u).fill({ color: 0x120a2e, alpha: 0.8 });
    }
  }
  // Neon pylon silhouettes
  for (let i = 0; i < 3; i++) {
    const nx = ((px * 0.6 + i * 160 * u) % (viewW + 100 * u)) - 50 * u;
    g.rect(nx, horizonY - 10 * u, 2 * u, 10 * u).fill({ color: 0xff2d95, alpha: 0.5 });
    g.rect(nx - 4 * u, horizonY - 10 * u, 10 * u, 1 * u).fill({ color: 0xff2d95, alpha: 0.5 });
  }
}

function drawDesert(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  skyGradient(g, viewW, horizonY, SKY_TOP[5], SKY_HORIZON[5]);
  drawSun(g, viewW - 80 * u, horizonY - 50 * u, 0xffd580, 0xffcc66, u);
  // Heat-shimmer band just above the horizon
  const shimmer = Math.sin(Date.now() * 0.003) * 2 * u;
  g.rect(0, horizonY - 4 * u + shimmer, viewW, 4 * u).fill({ color: 0xffe0b3, alpha: 0.12 });
  // Distant mesa silhouettes
  const px = ((parallaxX * 0.35) % (viewW + 400 * u)) - 200 * u;
  g.poly([
    (0 + px), horizonY, (40 * u + px), horizonY - 10 * u, (70 * u + px), horizonY - 10 * u, (90 * u + px), horizonY - 2 * u,
    (160 * u + px), horizonY - 2 * u, (180 * u + px), horizonY - 16 * u, (220 * u + px), horizonY - 16 * u, (240 * u + px), horizonY,
    (viewW + 300 * u + px), horizonY,
  ]).fill({ color: 0xb5652e, alpha: 0.55 });
}

function drawOpenSea(g: Graphics, viewW: number, horizonY: number, parallaxX: number): void {
  const u = unitFor(viewW);
  skyGradient(g, viewW, horizonY, SKY_TOP[6], SKY_HORIZON[6]);
  drawSun(g, viewW - 70 * u, horizonY - 40 * u, 0xfff9e6, 0xbdf0ff, u);
  drawClouds(g, viewW, horizonY, parallaxX, 0xffffff, 0.6);
  g.rect(0, horizonY - 6 * u, viewW, 6 * u).fill({ color: 0x0a8ab8, alpha: 0.5 });
  // Distant island silhouette
  const px = ((parallaxX * 0.25) % (viewW + 400 * u)) - 200 * u;
  g.poly([(60 * u + px), horizonY, (100 * u + px), horizonY - 9 * u, (150 * u + px), horizonY - 4 * u, (190 * u + px), horizonY]).fill({ color: 0x1a4a5c, alpha: 0.55 });
  // Gulls
  const gOff = ((parallaxX * 0.6) % (viewW + 200 * u)) - 100 * u;
  for (let i = 0; i < 3; i++) {
    const gx = (gOff + i * 90 * u) % viewW;
    const gy = horizonY - 20 * u - (i % 2) * 6 * u;
    g.poly([gx - 4 * u, gy + 2 * u, gx, gy, gx + 4 * u, gy + 2 * u]).stroke({ width: Math.max(1, u), color: 0x1e272e, alpha: 0.5 });
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
