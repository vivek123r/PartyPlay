import { Graphics } from 'pixi.js';
import type {
  PlayerState,
  EnemyState,
  Projectile,
  Particle,
  Platform,
  LevelData,
  Biome,
  Explosion,
} from './types';

// ═══════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════

const SKY_TOP = 0x0a0a1a;
const SKY_MID = 0x161634;
const SKY_BOT = 0x2b2246;
const HORIZON = 0x4a3050;
const CLOUD = 0x334466;
const CLOUD_HI = 0x445577;
const STAR = 0x8899bb;
const MOON = 0xf2eddc;
const MOON_DARK = 0xd8cfb4;
const MTN_FAR = 0x101828;
const MTN_MID = 0x151e30;
const MTN_NEAR = 0x1b2a3a;
const SKYLINE = 0x121a26;
const SKYLINE_HI = 0x1b2532;
const TREELINE = 0x0e1a18;
const TREELINE_HI = 0x14251f;
const STONE = 0x5a5a6a;
const STONE_DARK = 0x4a4a5a;
const STONE_LIGHT = 0x6a6a7a;
const MOSS = 0x2a5530;
const GRASS = 0x2a6636;
const GRASS_LIGHT = 0x3a8646;
const GRASS_DARK = 0x1d4a26;
const METAL = 0x667788;
const METAL_DARK = 0x556677;
const METAL_LIGHT = 0x8899aa;
const WOOD = 0x6b4423;
const WOOD_DARK = 0x4a2e15;
const RUST = 0x884422;
const CANVAS_TAN = 0x6d6244;
const CANVAS_DARK = 0x4c452f;
const SANDBAG = 0x7a6a48;
const SANDBAG_DARK = 0x5b4e33;
const CONCRETE = 0x6b6b73;
const CONCRETE_DARK = 0x4d4d55;
const CONCRETE_LIGHT = 0x84848c;
const EMBER = 0xff7722;
const FLESH = 0xeebb99;
const WHITE = 0xffffff;
const BLACK = 0x111111;

// ═══════════════════════════════════════════════════════════════
// BIOME GROUND PALETTES
// ═══════════════════════════════════════════════════════════════

interface GroundPalette {
  dirtDark: number;
  dirtMid: number;
  dirtLight: number;
  rock: number;
  surface: number;
  surfaceLight: number;
  surfaceDark: number;
}

const GROUND_PALETTES: Record<Biome, GroundPalette> = {
  field: {
    dirtDark: 0x3a2818,
    dirtMid: 0x4d3520,
    dirtLight: 0x5c4028,
    rock: 0x565060,
    surface: GRASS,
    surfaceLight: GRASS_LIGHT,
    surfaceDark: GRASS_DARK,
  },
  trench: {
    dirtDark: 0x2e2415,
    dirtMid: 0x40331d,
    dirtLight: 0x4e4026,
    rock: 0x4c4840,
    surface: 0x5a4c2c,
    surfaceLight: 0x6d5c36,
    surfaceDark: 0x3c3119,
  },
  base: {
    dirtDark: 0x24242c,
    dirtMid: 0x33333d,
    dirtLight: 0x41414c,
    rock: 0x55555f,
    surface: CONCRETE_DARK,
    surfaceLight: CONCRETE,
    surfaceDark: 0x3a3a42,
  },
  arena: {
    dirtDark: 0x241418,
    dirtMid: 0x341c1c,
    dirtLight: 0x452424,
    rock: 0x4a3436,
    surface: 0x3d2422,
    surfaceLight: 0x55302a,
    surfaceDark: 0x2a1816,
  },
};

// ═══════════════════════════════════════════════════════════════
// STATIC SKY — gradient, stars, moon (drawn once, screen space)
// ═══════════════════════════════════════════════════════════════

export function buildSky(g: Graphics, viewportW: number, viewportH: number): void {
  g.clear();

  // Three-stop vertical gradient via horizontal strips
  const strips = 36;
  const stripH = Math.ceil(viewportH / strips);
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1);
    const color = t < 0.55
      ? lerpColor(SKY_TOP, SKY_MID, t / 0.55)
      : lerpColor(SKY_MID, SKY_BOT, (t - 0.55) / 0.45);
    g.rect(0, i * stripH, viewportW, stripH);
    g.fill(color);
  }

  // Warm horizon haze just above the skyline
  for (let i = 0; i < 10; i++) {
    const y = viewportH - 60 + i * 4;
    g.rect(0, y, viewportW, 4);
    g.fill({ color: HORIZON, alpha: 0.05 + i * 0.015 });
  }

  // Star field — density falls off toward the horizon
  for (let i = 0; i < 110; i++) {
    const sx = Math.round(hash(i * 7 + 1) * viewportW);
    const sy = Math.round(Math.pow(hash(i * 13 + 5), 1.6) * viewportH * 0.62);
    const bright = 1 - (sy / (viewportH * 0.62)) * 0.65;
    g.rect(sx, sy, 1, 1);
    g.fill({ color: lerpColor(BLACK, STAR, bright), alpha: 0.5 + hash(i * 31) * 0.5 });
    // A few brighter stars get a cross glint
    if (hash(i * 47) > 0.94) {
      g.rect(sx - 1, sy, 3, 1); g.fill({ color: WHITE, alpha: 0.35 });
      g.rect(sx, sy - 1, 1, 3); g.fill({ color: WHITE, alpha: 0.35 });
    }
  }

  drawMoon(g, viewportW - 96, 38, 13);
}

function drawMoon(g: Graphics, cx: number, cy: number, r: number): void {
  // Soft halo
  for (let i = 4; i >= 1; i--) {
    const rr = r + i * 4;
    g.circle(cx, cy, rr);
    g.fill({ color: 0x9fb8e0, alpha: 0.035 });
  }
  // Body — stepped disc keeps the pixel feel
  g.circle(cx, cy, r); g.fill(MOON);
  g.circle(cx + 2, cy + 2, r - 1); g.fill(MOON_DARK);
  g.circle(cx - 1, cy - 1, r - 2); g.fill(MOON);
  // Craters
  g.circle(cx - 4, cy - 3, 3); g.fill(MOON_DARK);
  g.circle(cx + 3, cy + 4, 2); g.fill(MOON_DARK);
  g.circle(cx + 5, cy - 4, 1); g.fill(MOON_DARK);
  g.circle(cx - 2, cy + 6, 1); g.fill(MOON_DARK);
}

/** Per-frame sky animation: twinkling stars + distant artillery glow on the horizon. */
export function drawSkyAnim(
  g: Graphics,
  viewportW: number,
  viewportH: number,
  time: number,
): void {
  g.clear();

  for (let i = 0; i < 16; i++) {
    const phase = Math.sin(time * (1.1 + hash(i * 3) * 1.8) + i * 2.3);
    if (phase < 0.55) continue;
    const sx = Math.round(hash(i * 17 + 3) * viewportW);
    const sy = Math.round(Math.pow(hash(i * 23 + 9), 1.6) * viewportH * 0.5);
    g.rect(sx, sy, 1, 1); g.fill({ color: WHITE, alpha: (phase - 0.55) * 2 });
  }

  // Distant battle flashes near the horizon — slow, irregular
  for (let i = 0; i < 3; i++) {
    const beat = (time * 0.37 + i * 0.61) % 3;
    if (beat > 0.35) continue;
    const a = (1 - beat / 0.35) * 0.5;
    const fx = 40 + hash(Math.floor(time * 0.37 + i) * 91 + i) * (viewportW - 80);
    const fy = viewportH - 46;
    g.ellipse(fx, fy, 26, 8); g.fill({ color: 0xffb066, alpha: a * 0.35 });
    g.ellipse(fx, fy, 12, 4); g.fill({ color: 0xffe0a0, alpha: a });
  }
}

// ═══════════════════════════════════════════════════════════════
// PARALLAX MOUNTAINS — built once in layer space
// ═══════════════════════════════════════════════════════════════

const FAR_PEAKS = [
  { x: 80, h: 90 }, { x: 280, h: 110 }, { x: 470, h: 75 },
  { x: 650, h: 100 }, { x: 820, h: 85 }, { x: 990, h: 105 },
  { x: 1160, h: 80 }, { x: 1330, h: 95 }, { x: 1500, h: 70 },
  { x: 1670, h: 100 }, { x: 1830, h: 85 },
];

const MID_PEAKS = [
  { x: 40, h: 55 }, { x: 190, h: 70 }, { x: 350, h: 50 },
  { x: 520, h: 65 }, { x: 690, h: 55 }, { x: 850, h: 75 },
  { x: 1010, h: 60 }, { x: 1180, h: 50 }, { x: 1350, h: 68 },
  { x: 1520, h: 58 }, { x: 1690, h: 72 }, { x: 1860, h: 52 },
];

const NEAR_PEAKS = [
  { x: 0, h: 26 }, { x: 120, h: 34 }, { x: 250, h: 22 },
  { x: 380, h: 30 }, { x: 500, h: 24 }, { x: 630, h: 32 },
  { x: 760, h: 28 }, { x: 900, h: 36 }, { x: 1030, h: 22 },
  { x: 1160, h: 29 }, { x: 1290, h: 26 }, { x: 1420, h: 34 },
  { x: 1550, h: 24 }, { x: 1680, h: 30 }, { x: 1810, h: 27 },
  { x: 1940, h: 33 },
];

export function buildMountains(
  g: Graphics,
  layer: 'far' | 'mid' | 'near',
  baseY: number,
): void {
  g.clear();
  if (layer === 'far') drawMountainRange(g, baseY, MTN_FAR, FAR_PEAKS, 1, true);
  else if (layer === 'mid') drawMountainRange(g, baseY, MTN_MID, MID_PEAKS, 1.5, true);
  else drawMountainRange(g, baseY, MTN_NEAR, NEAR_PEAKS, 2, false);
}

function drawMountainRange(
  g: Graphics,
  baseY: number,
  color: number,
  peaks: Array<{ x: number; h: number }>,
  detailScale: number,
  snow: boolean,
): void {
  for (const peak of peaks) {
    const sx = peak.x;
    const halfW = 70 * detailScale;
    const snowLevel = peak.h * 0.72;

    g.poly([sx - halfW, baseY, sx, baseY - peak.h, sx + halfW, baseY]);
    g.fill(color);

    // Shadowed leeward face
    g.poly([sx, baseY - peak.h, sx + halfW * 0.5, baseY, sx + halfW, baseY]);
    g.fill(shiftBrightness(color, -12));

    // Moonlit windward edge
    g.poly([sx - halfW * 0.3, baseY, sx, baseY - peak.h, sx - halfW * 0.15, baseY]);
    g.fill(shiftBrightness(color, 10));

    // Ridge scree lines
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const ry = baseY - peak.h * (1 - t);
      const rw = halfW * t * 0.5;
      g.rect(sx - rw, ry, rw, 1);
      g.fill({ color: shiftBrightness(color, 14), alpha: 0.5 });
    }

    if (snow && peak.h > 55 * detailScale) {
      const capW = halfW * 0.25;
      g.poly([sx - capW, baseY - snowLevel, sx, baseY - peak.h, sx + capW, baseY - snowLevel]);
      g.fill(0xdde8f6);
      g.rect(sx - capW * 0.5, baseY - snowLevel + 2, capW, 2);
      g.fill(0xeef4ff);
      // Snow fingers running down the gullies
      g.rect(sx - 1, baseY - snowLevel + 3, 2, 5); g.fill({ color: 0xdde8f6, alpha: 0.7 });
      g.rect(sx + capW * 0.4, baseY - snowLevel + 2, 1, 4); g.fill({ color: 0xdde8f6, alpha: 0.5 });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// DISTANT ENEMY BASE SKYLINE — silhouette layer
// ═══════════════════════════════════════════════════════════════

export function buildSkyline(g: Graphics, spanW: number, baseY: number): void {
  g.clear();

  let x = 20;
  let i = 0;
  while (x < spanW) {
    const h = 16 + Math.round(hash(i * 5 + 1) * 34);
    const w = 18 + Math.round(hash(i * 11 + 2) * 30);
    const kind = hash(i * 17 + 3);

    // Block body
    g.rect(x, baseY - h, w, h); g.fill(SKYLINE);
    g.rect(x, baseY - h, w, 1); g.fill(SKYLINE_HI);
    g.rect(x, baseY - h, 1, h); g.fill(SKYLINE_HI);

    if (kind < 0.28) {
      // Hangar with a curved roof
      g.rect(x + 2, baseY - h - 3, w - 4, 3); g.fill(SKYLINE);
      g.rect(x + 5, baseY - h - 5, w - 10, 2); g.fill(SKYLINE);
    } else if (kind < 0.5) {
      // Cooling stack belching smoke
      g.rect(x + w - 8, baseY - h - 14, 5, 14); g.fill(SKYLINE);
      g.rect(x + w - 8, baseY - h - 14, 5, 1); g.fill(SKYLINE_HI);
      for (let s = 0; s < 3; s++) {
        g.rect(x + w - 10 - s, baseY - h - 18 - s * 4, 8 + s * 2, 3);
        g.fill({ color: 0x2a3340, alpha: 0.5 - s * 0.12 });
      }
    } else if (kind < 0.68) {
      // Lattice antenna mast
      const mh = 18 + Math.round(hash(i * 29) * 16);
      g.rect(x + w / 2, baseY - h - mh, 1, mh); g.fill(SKYLINE_HI);
      for (let s = 4; s < mh; s += 5) {
        g.rect(x + w / 2 - 2, baseY - h - s, 5, 1); g.fill(SKYLINE_HI);
      }
    }

    // Lit windows
    const cols = Math.max(1, Math.floor((w - 4) / 5));
    const rows = Math.max(1, Math.floor((h - 4) / 6));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (hash(i * 101 + c * 13 + r * 7) > 0.62) continue;
        const wx = x + 2 + c * 5;
        const wy = baseY - h + 3 + r * 6;
        const warm = hash(i * 211 + c + r) > 0.3;
        g.rect(wx, wy, 2, 2);
        g.fill({ color: warm ? 0xffcc66 : 0x66ccdd, alpha: 0.65 });
      }
    }

    x += w + 6 + Math.round(hash(i * 37) * 22);
    i++;
  }

  // Ground haze that the silhouettes sit in
  g.rect(0, baseY - 2, spanW, 6);
  g.fill({ color: 0x2a2438, alpha: 0.6 });
}

// ═══════════════════════════════════════════════════════════════
// TREE LINE SILHOUETTE
// ═══════════════════════════════════════════════════════════════

export function buildTreeLine(g: Graphics, spanW: number, baseY: number): void {
  g.clear();

  for (let x = -10; x < spanW; x += 7) {
    const h = 14 + Math.round(hash(x * 3 + 7) * 16);
    const w = 5 + Math.round(hash(x * 5 + 11) * 5);
    // Conifer cone in three stepped tiers
    g.poly([x, baseY, x + w / 2, baseY - h, x + w, baseY]);
    g.fill(hash(x * 7) > 0.5 ? TREELINE : TREELINE_HI);
    g.rect(x + w / 2, baseY - 2, 1, 3); g.fill(TREELINE);
  }

  g.rect(0, baseY - 1, spanW, 8); g.fill(TREELINE);
}

// ═══════════════════════════════════════════════════════════════
// CLOUDS + FOG — cheap per-frame animation
// ═══════════════════════════════════════════════════════════════

const CLOUD_DEFS = [
  { x: 60, y: 26, w: 60 }, { x: 300, y: 48, w: 82 },
  { x: 520, y: 20, w: 48 }, { x: 700, y: 62, w: 70 },
  { x: 880, y: 34, w: 56 }, { x: 1060, y: 54, w: 66 },
  { x: 1240, y: 24, w: 76 }, { x: 1420, y: 44, w: 60 },
  { x: 1600, y: 66, w: 88 }, { x: 1780, y: 30, w: 52 },
];

export function drawClouds(g: Graphics, spanW: number, time: number): void {
  g.clear();

  for (const cloud of CLOUD_DEFS) {
    // Slow independent drift, wrapped inside the layer span
    let sx = (cloud.x + time * 3) % (spanW + 200) - 100;
    if (sx < -120) sx += spanW + 200;
    const sy = cloud.y + Math.sin(time * 0.3 + cloud.x * 0.01) * 3;
    const w = cloud.w;

    g.rect(Math.round(sx), Math.round(sy + 5), w, 7);
    g.fill({ color: CLOUD, alpha: 0.55 });
    g.rect(Math.round(sx + 5), Math.round(sy + 1), w - 10, 10);
    g.fill({ color: CLOUD, alpha: 0.6 });
    g.rect(Math.round(sx + 12), Math.round(sy - 2), w - 24, 8);
    g.fill({ color: CLOUD_HI, alpha: 0.6 });
    // Moonlit top edge
    g.rect(Math.round(sx + 14), Math.round(sy - 3), w - 30, 2);
    g.fill({ color: 0x6a7f9e, alpha: 0.45 });
    // Ragged underside
    g.rect(Math.round(sx + 8), Math.round(sy + 12), 10, 2);
    g.fill({ color: CLOUD, alpha: 0.3 });
    g.rect(Math.round(sx + w - 20), Math.round(sy + 12), 12, 2);
    g.fill({ color: CLOUD, alpha: 0.3 });
  }
}

export function drawFog(g: Graphics, spanW: number, baseY: number, time: number): void {
  g.clear();

  for (let band = 0; band < 3; band++) {
    const speed = 4 + band * 3;
    const bandY = baseY - 14 + band * 6;
    const alpha = 0.10 + band * 0.045;
    for (let i = 0; i < 14; i++) {
      const w = 70 + hash(band * 31 + i) * 130;
      let x = (hash(band * 17 + i * 7) * spanW + time * speed) % (spanW + 200) - 100;
      if (x < -200) x += spanW + 200;
      const bob = Math.sin(time * 0.5 + i) * 1.5;
      g.rect(Math.round(x), Math.round(bandY + bob), Math.round(w), 5);
      g.fill({ color: 0x8fa2c0, alpha });
      g.rect(Math.round(x + 12), Math.round(bandY + bob - 2), Math.round(w - 24), 3);
      g.fill({ color: 0x8fa2c0, alpha: alpha * 0.6 });
    }
  }
}

/** Foreground weather — drifting ash/embers, drawn in screen space. */
export function drawWeather(
  g: Graphics,
  cameraX: number,
  viewportW: number,
  viewportH: number,
  time: number,
  emberMix: number,
): void {
  g.clear();

  for (let i = 0; i < 34; i++) {
    const speed = 6 + hash(i * 9) * 14;
    const span = viewportW + 40;
    let x = (hash(i * 3 + 1) * span - cameraX * 0.85 - time * speed) % span;
    if (x < 0) x += span;
    const fall = 8 + hash(i * 5) * 22;
    const y = (hash(i * 7 + 2) * viewportH + time * fall) % viewportH;
    const sway = Math.sin(time * 1.4 + i) * 2;

    const isEmber = hash(i * 13 + 4) < emberMix;
    if (isEmber) {
      g.rect(Math.round(x + sway), Math.round(y), 1, 2);
      g.fill({ color: EMBER, alpha: 0.5 + Math.sin(time * 6 + i) * 0.3 });
    } else {
      g.rect(Math.round(x + sway), Math.round(y), 1, 1);
      g.fill({ color: 0xb9c2d0, alpha: 0.28 });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GROUND — built once across the whole level, per-biome dressing
// ═══════════════════════════════════════════════════════════════

interface ZoneSegment {
  startX: number;
  endX: number;
  biome: Biome;
}

export function zoneSegments(level: LevelData): ZoneSegment[] {
  const zones = (level.zones && level.zones.length > 0)
    ? [...level.zones].sort((a, b) => a.startX - b.startX)
    : [{ startX: 0, biome: 'field' as Biome }];
  return zones.map((zone, i) => ({
    startX: Math.max(0, zone.startX),
    endX: i + 1 < zones.length ? zones[i + 1].startX : level.width,
    biome: zone.biome,
  }));
}

export function biomeAt(level: LevelData, x: number): Biome {
  let biome: Biome = 'field';
  for (const seg of zoneSegments(level)) {
    if (x >= seg.startX) biome = seg.biome;
  }
  return biome;
}

export function buildGround(g: Graphics, level: LevelData): void {
  g.clear();
  const gy = level.groundY;
  const depth = level.height - gy;
  const segments = zoneSegments(level);

  // Bedrock under everything so no seam can ever show through
  g.rect(0, gy, level.width, depth + 8);
  g.fill(0x1d150e);

  segments.forEach((seg, index) => {
    const pal = GROUND_PALETTES[seg.biome];
    const x0 = seg.startX;
    const w = seg.endX - seg.startX;

    // Body + strata
    g.rect(x0, gy, w, depth); g.fill(pal.dirtDark);
    g.rect(x0, gy + 6, w, 2); g.fill(pal.dirtMid);
    g.rect(x0, gy + 12, w, 2); g.fill(pal.dirtLight);
    g.rect(x0, gy + 18, w, 1); g.fill(pal.dirtMid);

    // Speckled soil
    for (let x = x0; x < seg.endX; x += 3) {
      const h1 = hash(x * 2 + 1);
      if (h1 < 0.34) {
        g.rect(x, gy + 5 + Math.floor(h1 * 24), 2, 1); g.fill(pal.dirtLight);
      } else if (h1 < 0.62) {
        g.rect(x + 1, gy + 8 + Math.floor(h1 * 16), 1, 2); g.fill(pal.dirtDark);
      }
    }

    // Embedded stones
    for (let x = x0 + 5; x < seg.endX; x += 17) {
      const oy = gy + 9 + Math.floor(hash(x * 3) * 10);
      g.rect(x, oy, 3, 2); g.fill(shiftBrightness(pal.rock, -18));
      g.rect(x + 1, oy + 1, 2, 2); g.fill(pal.rock);
    }

    // Surface cap
    g.rect(x0, gy, w, 4); g.fill(pal.surfaceDark);
    g.rect(x0, gy, w, 2); g.fill(pal.surface);
    g.rect(x0, gy, w, 1); g.fill(pal.surfaceLight);

    drawBiomeSurface(g, seg, gy, pal);

    // Dithered transition into the previous biome so zones blend
    if (index > 0) {
      const prev = GROUND_PALETTES[segments[index - 1].biome];
      for (let i = 0; i < 28; i += 2) {
        if (hash(x0 + i) > 1 - i / 28) continue;
        g.rect(x0 + i, gy, 2, 4); g.fill(prev.surfaceDark);
        g.rect(x0 + i, gy, 2, 2); g.fill(prev.surface);
      }
    }
  });
}

function drawBiomeSurface(g: Graphics, seg: ZoneSegment, gy: number, pal: GroundPalette): void {
  switch (seg.biome) {
    case 'field': {
      for (let x = seg.startX; x < seg.endX; x += 5) {
        const h1 = hash(x * 7 + 3);
        g.rect(x, gy - 2 - Math.floor(h1 * 3), 1, 4 + Math.floor(h1 * 3)); g.fill(GRASS);
        g.rect(x + 2, gy - 2, 1, 4); g.fill(GRASS_LIGHT);
        g.rect(x + 1, gy + 1, 3, 1); g.fill(GRASS_DARK);
      }
      // Taller clumps and the odd wildflower
      for (let x = seg.startX + 3; x < seg.endX; x += 29) {
        g.rect(x, gy - 6, 1, 7); g.fill(GRASS_LIGHT);
        g.rect(x + 3, gy - 5, 1, 6); g.fill(GRASS);
        g.rect(x + 1, gy - 4, 2, 5); g.fill(GRASS);
        if (hash(x * 11) > 0.55) {
          g.rect(x + (hash(x) > 0.5 ? 4 : -2), gy - 5, 2, 2);
          g.fill(hash(x * 3) > 0.5 ? 0xd9d36a : 0xd07ba8);
        }
      }
      break;
    }
    case 'trench': {
      // Churned mud ridges + burnt stubble
      for (let x = seg.startX; x < seg.endX; x += 6) {
        const h1 = hash(x * 5 + 9);
        g.rect(x, gy - 1, 4, 2); g.fill(h1 > 0.5 ? pal.surfaceLight : pal.surfaceDark);
        g.rect(x + 1, gy + 2, 3, 1); g.fill(pal.dirtDark);
        if (h1 > 0.72) { g.rect(x + 2, gy - 3, 1, 3); g.fill(0x4a3f22); }
      }
      // Duckboard planks half-buried in the mud
      for (let x = seg.startX + 40; x < seg.endX; x += 96) {
        for (let p = 0; p < 5; p++) {
          g.rect(x + p * 5, gy - 1, 4, 2); g.fill(WOOD_DARK);
          g.rect(x + p * 5, gy - 1, 4, 1); g.fill(WOOD);
        }
      }
      break;
    }
    case 'base': {
      // Poured concrete slabs with expansion seams
      for (let x = seg.startX; x < seg.endX; x += 24) {
        g.rect(x, gy, 1, 4); g.fill(0x2e2e36);
        g.rect(x + 1, gy, 22, 1); g.fill(CONCRETE_LIGHT);
        if (hash(x * 13) > 0.6) {
          // Cracks and patched asphalt
          g.rect(x + 6, gy + 1, 8, 1); g.fill(0x3a3a42);
          g.rect(x + 12, gy + 2, 5, 1); g.fill(0x3a3a42);
        }
        if (hash(x * 17) > 0.82) {
          // Hazard stripe
          for (let s = 0; s < 4; s++) {
            g.rect(x + 2 + s * 5, gy - 1, 3, 1); g.fill(0xc9a227);
          }
        }
      }
      // Steel grate strips
      for (let x = seg.startX + 60; x < seg.endX; x += 140) {
        g.rect(x, gy - 1, 32, 3); g.fill(METAL_DARK);
        for (let s = 0; s < 8; s++) { g.rect(x + 1 + s * 4, gy - 1, 2, 3); g.fill(METAL); }
      }
      break;
    }
    case 'arena': {
      // Scorched, cracked earth with glowing fissures
      for (let x = seg.startX; x < seg.endX; x += 7) {
        const h1 = hash(x * 3 + 5);
        g.rect(x, gy - 1, 3, 2); g.fill(h1 > 0.5 ? pal.surfaceLight : pal.surfaceDark);
        if (h1 > 0.66) {
          g.rect(x + 1, gy + 2, 1, 4); g.fill(0x1c0f0c);
          g.rect(x + 1, gy + 2, 1, 2); g.fill({ color: EMBER, alpha: 0.55 });
        }
      }
      for (let x = seg.startX + 20; x < seg.endX; x += 52) {
        // Ash drift piles
        g.rect(x, gy - 2, 10, 2); g.fill(0x4a4046);
        g.rect(x + 2, gy - 3, 6, 1); g.fill(0x5a5058);
      }
      break;
    }
  }
}

/** Craters and puddles are cut into the ground after the surface pass. */
export function buildGroundFeatures(g: Graphics, level: LevelData): void {
  const gy = level.groundY;
  const env = level.environment;

  for (const crater of env.craters ?? []) {
    const w = crater.width ?? 26;
    const half = Math.round(w / 2);
    const pal = GROUND_PALETTES[biomeAt(level, crater.x)];
    // Raised lip
    g.rect(crater.x - 2, gy - 2, w + 4, 3); g.fill(pal.dirtLight);
    // Bowl, stepped down
    g.rect(crater.x, gy - 1, w, 4); g.fill(pal.dirtMid);
    g.rect(crater.x + 3, gy + 1, w - 6, 4); g.fill(pal.dirtDark);
    g.rect(crater.x + half - 4, gy + 3, 8, 3); g.fill(0x1a120c);
    // Ejecta
    for (let i = 0; i < 6; i++) {
      const ex = crater.x - 6 + Math.round(hash(crater.x + i * 7) * (w + 12));
      g.rect(ex, gy - 3, 2, 1); g.fill(pal.dirtLight);
    }
  }

  for (const puddle of env.puddles ?? []) {
    const w = puddle.width ?? 20;
    g.rect(puddle.x, gy, w, 3); g.fill(0x1a2430);
    g.rect(puddle.x + 1, gy, w - 2, 2); g.fill({ color: 0x37546e, alpha: 0.85 });
    // Sky reflection glints
    g.rect(puddle.x + 3, gy, Math.max(2, w - 10), 1); g.fill({ color: 0x86a7c4, alpha: 0.5 });
    g.rect(puddle.x + w - 6, gy + 1, 3, 1); g.fill({ color: 0x86a7c4, alpha: 0.3 });
  }
}

// ═══════════════════════════════════════════════════════════════
// PLATFORMS — style follows the biome
// ═══════════════════════════════════════════════════════════════

export function buildPlatforms(g: Graphics, level: LevelData): void {
  g.clear();
  for (const plat of level.platforms) {
    drawPlatform(g, plat, biomeAt(level, plat.x));
  }
}

function drawPlatform(g: Graphics, platform: Platform, biome: Biome): void {
  const rx = Math.round(platform.x);
  const ry = Math.round(platform.y);
  const pw = platform.width;
  const ph = platform.height;

  // Contact shadow under every platform — without it the decks vanish against
  // the mountain silhouettes they overlap.
  g.rect(rx - 1, ry + 1, pw + 2, ph + 2); g.fill({ color: 0x000000, alpha: 0.35 });
  g.rect(rx + 2, ry + ph + 2, pw - 4, 2); g.fill({ color: 0x000000, alpha: 0.2 });

  if (biome === 'base') {
    // Steel catwalk on brackets
    g.rect(rx, ry, pw, 3); g.fill(METAL_DARK);
    g.rect(rx, ry, pw, 1); g.fill(METAL_LIGHT);
    for (let x = rx + 1; x < rx + pw - 1; x += 4) {
      g.rect(x, ry + 1, 2, 2); g.fill(METAL);
    }
    g.rect(rx, ry + 3, pw, ph - 3); g.fill(0x2f3742);
    for (let x = rx + 3; x < rx + pw - 3; x += 10) {
      g.rect(x, ry + 3, 2, ph - 3); g.fill(METAL_DARK);
      g.rect(x + 1, ry + 4, 1, ph - 5); g.fill(METAL);
    }
    g.rect(rx, ry + ph - 1, pw, 1); g.fill(0x1e232b);
    return;
  }

  if (biome === 'trench') {
    // Timber-braced platform with sandbags on top
    g.rect(rx, ry + 3, pw, ph - 3); g.fill(WOOD_DARK);
    for (let x = rx; x < rx + pw; x += 6) {
      g.rect(x, ry + 3, 5, ph - 4); g.fill(WOOD);
      g.rect(x, ry + 4, 5, 1); g.fill(WOOD_DARK);
      g.rect(x + 4, ry + 3, 1, ph - 3); g.fill(0x33200f);
    }
    for (let x = rx; x < rx + pw; x += 7) {
      g.rect(x, ry, 7, 3); g.fill(SANDBAG_DARK);
      g.rect(x + 1, ry, 5, 2); g.fill(SANDBAG);
      g.rect(x + 3, ry, 1, 3); g.fill(SANDBAG_DARK);
    }
    return;
  }

  // Stone masonry (field / arena)
  const trim = biome === 'arena' ? 0xa3782e : MOSS;
  g.rect(rx, ry + 3, pw, ph - 3); g.fill(STONE_DARK);

  const brickH = Math.max(4, Math.floor((ph - 3) / 2));
  for (let row = 0; row < 2; row++) {
    const by = ry + 3 + row * brickH;
    const offset = row % 2 === 0 ? 0 : 4;
    for (let bx = rx + offset; bx < rx + pw; bx += 8) {
      const bw = Math.min(7, rx + pw - bx);
      if (bw < 3) continue;
      g.rect(bx, by, bw, brickH - 1);
      g.fill(hash(bx * 3 + by) > 0.75 ? shiftBrightness(STONE, -8) : STONE);
      g.rect(bx + 1, by + 1, bw - 2, 1); g.fill(STONE_LIGHT);
    }
    g.rect(rx, by + brickH - 1, pw, 1); g.fill(STONE_DARK);
  }

  g.rect(rx, ry, pw, 3); g.fill(trim);
  g.rect(rx, ry, pw, 1); g.fill(biome === 'arena' ? 0xd6a13f : GRASS);

  for (let px = rx + 2; px < rx + pw - 4; px += 8) {
    g.rect(px, ry + 2, 1, 2); g.fill(trim);
    g.rect(px + 3, ry + 2, 2, 1); g.fill(biome === 'arena' ? 0xd6a13f : GRASS);
  }

  g.rect(rx, ry + 3, 1, ph - 3); g.fill(STONE_LIGHT);
}

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT PROPS — all static props baked once in world space
// ═══════════════════════════════════════════════════════════════

export function buildEnvironment(g: Graphics, level: LevelData): void {
  g.clear();
  const env = level.environment;

  // Back-to-front so tall scenery sits behind the clutter
  for (const tower of env.towers ?? []) drawRadioTower(g, tower.x, tower.y, tower.height ?? 70);
  for (const bunker of env.bunkers ?? []) drawBunker(g, bunker.x, bunker.y);
  for (const tent of env.tents ?? []) drawTent(g, tent.x, tent.y);
  for (const wall of env.brokenWalls ?? []) drawBrokenWall(g, wall.x, wall.y, wall.width ?? 30);
  for (const tree of env.trees) drawTree(g, tree.x, tree.groundY, tree.variant ?? 'broadleaf', tree.scale ?? 1);
  for (const wreck of env.wrecks ?? []) drawTankWreck(g, wreck.x, wreck.y);
  for (const fence of env.fences ?? []) drawBarbedFence(g, fence.x, fence.y, fence.width ?? 40);
  for (const bags of env.sandbags ?? []) drawSandbagWall(g, bags.x, bags.y, bags.width ?? 28);
  for (const lamp of env.lamps ?? []) drawLampPost(g, lamp.x, lamp.y);
  for (const rubble of env.rubble ?? []) drawRubble(g, rubble.x, rubble.y);
  for (const crate of env.crates) drawCrate(g, crate.x, crate.y);
  for (const box of env.ammoBoxes ?? []) drawAmmoBox(g, box.x, box.y);
  for (const barrel of env.barrels) drawBarrel(g, barrel.x, barrel.y, barrel.variant ?? 'wood');
  for (const barrel of env.fireBarrels ?? []) drawBarrel(g, barrel.x, barrel.y, 'fire');
  for (const sign of env.signs) drawWarningSign(g, sign.x, sign.y, sign.variant ?? 'skull');
  for (const flag of env.flags ?? []) drawFlagPole(g, flag.x, flag.y);
}

/** Props whose art moves: flames, flags, lamp glow, tower beacon. */
export function drawEnvironmentAnim(g: Graphics, level: LevelData, time: number): void {
  g.clear();
  const env = level.environment;

  for (const barrel of env.fireBarrels ?? []) {
    drawFlame(g, barrel.x + 7, barrel.y - 17, time + barrel.x);
  }
  for (const flag of env.flags ?? []) {
    drawFlagCloth(g, flag.x + 2, flag.y - 40, time + flag.x * 0.1);
  }
  for (const lamp of env.lamps ?? []) {
    const flicker = 0.7 + Math.sin(time * 9 + lamp.x) * 0.06;
    // Light cone
    g.poly([
      lamp.x + 6, lamp.y - 40,
      lamp.x - 12, lamp.y,
      lamp.x + 24, lamp.y,
    ]);
    g.fill({ color: 0xffdd88, alpha: 0.07 * flicker });
    g.rect(lamp.x + 2, lamp.y - 42, 9, 3); g.fill({ color: 0xffeeaa, alpha: 0.9 * flicker });
    g.rect(lamp.x + 4, lamp.y - 41, 5, 1); g.fill({ color: WHITE, alpha: flicker });
  }
  for (const tower of env.towers ?? []) {
    const h = tower.height ?? 70;
    const blink = Math.sin(time * 2.2 + tower.x) > 0.4;
    if (blink) {
      g.rect(tower.x + 3, tower.y - h - 4, 3, 3); g.fill(0xff4444);
      g.circle(tower.x + 4, tower.y - h - 3, 5); g.fill({ color: 0xff4444, alpha: 0.16 });
    }
    // Sweeping searchlight from the mast
    const sweep = Math.sin(time * 0.45 + tower.x * 0.02);
    const tipX = tower.x + 4 + sweep * 120;
    g.poly([
      tower.x + 4, tower.y - h,
      tipX - 16, tower.y - h - 90,
      tipX + 16, tower.y - h - 90,
    ]);
    g.fill({ color: 0xcfe4ff, alpha: 0.03 });
  }
}

function drawTree(
  g: Graphics,
  x: number,
  baseY: number,
  variant: 'broadleaf' | 'pine' | 'dead',
  scale: number,
): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  const s = scale;

  if (variant === 'dead') {
    // Burnt skeleton — bare forked trunk
    g.rect(sx + 4, by - Math.round(30 * s), 3, Math.round(30 * s)); g.fill(0x2a231c);
    g.rect(sx + 5, by - Math.round(28 * s), 1, Math.round(26 * s)); g.fill(0x3b3128);
    g.rect(sx + 1, by - Math.round(24 * s), 4, 2); g.fill(0x2a231c);
    g.rect(sx - 1, by - Math.round(28 * s), 3, 2); g.fill(0x2a231c);
    g.rect(sx + 7, by - Math.round(26 * s), 5, 2); g.fill(0x2a231c);
    g.rect(sx + 10, by - Math.round(30 * s), 2, 3); g.fill(0x2a231c);
    g.rect(sx + 2, by - 2, 8, 2); g.fill(0x231d17);
    return;
  }

  if (variant === 'pine') {
    const h = Math.round(42 * s);
    g.rect(sx + 4, by - 10, 3, 10); g.fill(WOOD_DARK);
    for (let tier = 0; tier < 4; tier++) {
      const ty = by - 8 - tier * Math.round((h - 10) / 4);
      const w = Math.round((16 - tier * 3) * s);
      g.poly([sx + 5 - w / 2, ty, sx + 5, ty - Math.round(12 * s), sx + 5 + w / 2, ty]);
      g.fill(tier % 2 === 0 ? 0x1b4a2c : 0x225a34);
      g.poly([sx + 5 - w / 4, ty - 2, sx + 5, ty - Math.round(10 * s), sx + 5 + 1, ty - 2]);
      g.fill(0x2d6b3f);
    }
    g.rect(sx + 2, by - 2, 8, 2); g.fill(WOOD_DARK);
    return;
  }

  // Broadleaf — layered canopy
  const trunkH = Math.round(22 * s);
  g.rect(sx + 4, by - trunkH, 4, trunkH); g.fill(WOOD_DARK);
  g.rect(sx + 5, by - trunkH + 1, 2, trunkH - 2); g.fill(WOOD);
  // Bark notches
  g.rect(sx + 4, by - Math.round(14 * s), 4, 1); g.fill(0x3a2410);
  g.rect(sx + 4, by - Math.round(8 * s), 4, 1); g.fill(0x3a2410);

  const cy = by - trunkH;
  g.rect(sx - 3, cy - 8, 18, 9); g.fill(GRASS_DARK);
  g.rect(sx - 1, cy - 11, 14, 6); g.fill(0x24582d);
  g.rect(sx + 1, cy - 14, 10, 5); g.fill(GRASS);
  g.rect(sx + 3, cy - 16, 6, 3); g.fill(GRASS_LIGHT);
  // Leaf clumps breaking the silhouette
  g.rect(sx - 5, cy - 5, 4, 4); g.fill(GRASS_DARK);
  g.rect(sx + 15, cy - 7, 4, 4); g.fill(GRASS_DARK);
  g.rect(sx + 2, cy - 12, 3, 2); g.fill(GRASS_LIGHT);
  // Root flare
  g.rect(sx + 2, by - 2, 8, 2); g.fill(WOOD_DARK);
  g.rect(sx, by - 1, 12, 1); g.fill(0x33200f);
}

function drawCrate(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const cy = Math.round(baseY) - 14;

  g.rect(sx, cy, 14, 14); g.fill(WOOD);
  g.rect(sx + 1, cy + 1, 12, 12); g.fill(WOOD_DARK);
  g.rect(sx + 2, cy + 2, 10, 10); g.fill(WOOD);

  g.rect(sx + 1, cy, 12, 2); g.fill(WOOD_DARK);
  g.rect(sx + 1, cy + 12, 12, 2); g.fill(WOOD_DARK);
  g.rect(sx, cy + 2, 2, 10); g.fill(WOOD_DARK);
  g.rect(sx + 12, cy + 2, 2, 10); g.fill(WOOD_DARK);

  g.rect(sx + 3, cy + 3, 1, 1); g.fill(METAL_LIGHT);
  g.rect(sx + 10, cy + 3, 1, 1); g.fill(METAL_LIGHT);
  g.rect(sx + 3, cy + 10, 1, 1); g.fill(METAL_LIGHT);
  g.rect(sx + 10, cy + 10, 1, 1); g.fill(METAL_LIGHT);

  // Stencilled "this way up" arrow
  g.rect(sx + 5, cy + 6, 4, 2); g.fill(0xddcc88);
  g.rect(sx + 6, cy + 5, 2, 4); g.fill(0xddcc88);
  // Contact shadow
  g.rect(sx - 1, Math.round(baseY) - 1, 16, 1); g.fill({ color: BLACK, alpha: 0.35 });
}

function drawAmmoBox(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  // Two stacked steel ammo cases
  for (let i = 0; i < 2; i++) {
    const cy = by - 7 - i * 7;
    const off = i * 2;
    g.rect(sx + off, cy, 16, 7); g.fill(0x3b4a34);
    g.rect(sx + off + 1, cy + 1, 14, 5); g.fill(0x4a5c40);
    g.rect(sx + off + 1, cy + 1, 14, 1); g.fill(0x5d7150);
    g.rect(sx + off + 6, cy - 1, 4, 2); g.fill(METAL_DARK);
    g.rect(sx + off + 2, cy + 3, 6, 1); g.fill(0xc9a227);
  }
  g.rect(sx - 1, by - 1, 18, 1); g.fill({ color: BLACK, alpha: 0.35 });
}

function drawBarrel(g: Graphics, x: number, baseY: number, variant: 'wood' | 'fuel' | 'fire'): void {
  const sx = Math.round(x);
  const by = Math.round(baseY) - 18;

  if (variant === 'wood') {
    g.rect(sx + 2, by + 1, 10, 17); g.fill(WOOD_DARK);
    g.rect(sx + 1, by + 3, 12, 13); g.fill(WOOD);
    for (const ry of [by + 2, by + 8, by + 15]) {
      g.rect(sx + 1, ry, 12, 2); g.fill(METAL_DARK);
      g.rect(sx + 3, ry, 1, 1); g.fill(METAL_LIGHT);
      g.rect(sx + 10, ry, 1, 1); g.fill(METAL_LIGHT);
    }
    g.rect(sx + 2, by + 6, 2, 2); g.fill(RUST);
    g.rect(sx + 10, by + 11, 2, 1); g.fill(RUST);
  } else {
    // Steel drum — fuel (red) or burn barrel (charred)
    const body = variant === 'fuel' ? 0x8a3423 : 0x3a3a40;
    const bodyHi = variant === 'fuel' ? 0xa8452c : 0x4c4c54;
    g.rect(sx + 1, by, 12, 18); g.fill(shiftBrightness(body, -18));
    g.rect(sx + 2, by, 10, 18); g.fill(body);
    g.rect(sx + 3, by + 1, 3, 16); g.fill(bodyHi);
    for (const ry of [by + 3, by + 9, by + 15]) {
      g.rect(sx + 1, ry, 12, 2); g.fill(METAL_DARK);
      g.rect(sx + 1, ry, 12, 1); g.fill(METAL);
    }
    if (variant === 'fuel') {
      g.rect(sx + 5, by + 6, 4, 4); g.fill(0xf2d34a);
      g.rect(sx + 6, by + 7, 2, 2); g.fill(0x2a1a10);
    } else {
      // Charred rim, ready for the flame layer
      g.rect(sx + 1, by, 12, 2); g.fill(0x1c1c20);
      g.rect(sx + 2, by + 1, 10, 1); g.fill(0x2a2016);
      g.rect(sx + 3, by + 12, 2, 4); g.fill(RUST);
    }
    g.rect(sx + 9, by + 4, 2, 5); g.fill({ color: RUST, alpha: 0.6 });
  }
  g.rect(sx, Math.round(baseY) - 1, 14, 1); g.fill({ color: BLACK, alpha: 0.35 });
}

function drawWarningSign(
  g: Graphics,
  x: number,
  baseY: number,
  variant: 'skull' | 'arrow' | 'radiation',
): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);

  g.rect(sx + 5, by - 38, 2, 38); g.fill(METAL_DARK);
  g.rect(sx + 5, by - 38, 1, 38); g.fill(METAL);
  g.rect(sx + 3, by - 2, 6, 2); g.fill(STONE_DARK);

  g.rect(sx, by - 40, 12, 12); g.fill(METAL_DARK);
  g.rect(sx + 1, by - 39, 10, 10); g.fill(variant === 'radiation' ? 0xd8c23c : 0xddcc44);

  if (variant === 'skull') {
    g.rect(sx + 5, by - 37, 2, 1); g.fill(BLACK);
    g.rect(sx + 4, by - 36, 4, 2); g.fill(BLACK);
    g.rect(sx + 4, by - 34, 1, 2); g.fill(BLACK);
    g.rect(sx + 7, by - 34, 1, 2); g.fill(BLACK);
    g.rect(sx + 5, by - 33, 2, 1); g.fill(BLACK);
  } else if (variant === 'arrow') {
    g.rect(sx + 3, by - 35, 6, 2); g.fill(BLACK);
    g.rect(sx + 7, by - 37, 2, 6); g.fill(BLACK);
  } else {
    g.rect(sx + 5, by - 35, 2, 2); g.fill(BLACK);
    g.rect(sx + 3, by - 37, 2, 2); g.fill(BLACK);
    g.rect(sx + 7, by - 37, 2, 2); g.fill(BLACK);
    g.rect(sx + 5, by - 32, 2, 2); g.fill(BLACK);
  }
  // Bullet holes
  g.rect(sx + 2, by - 31, 1, 1); g.fill(BLACK);
  g.rect(sx + 9, by - 38, 1, 1); g.fill(BLACK);
}

function drawSandbagWall(g: Graphics, x: number, baseY: number, width: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  const rows = 3;

  for (let row = 0; row < rows; row++) {
    const ry = by - 5 - row * 5;
    const inset = row * 2;
    const stagger = row % 2 === 0 ? 0 : 3;
    for (let bx = sx + inset + stagger; bx < sx + width - inset; bx += 7) {
      const w = Math.min(7, sx + width - inset - bx);
      if (w < 4) continue;
      g.rect(bx, ry, w, 5); g.fill(SANDBAG_DARK);
      g.rect(bx + 1, ry, w - 2, 4); g.fill(SANDBAG);
      g.rect(bx + 1, ry, w - 2, 1); g.fill(shiftBrightness(SANDBAG, 16));
      g.rect(bx + w - 1, ry + 1, 1, 4); g.fill(SANDBAG_DARK);
    }
  }
  g.rect(sx - 1, by - 1, width + 2, 1); g.fill({ color: BLACK, alpha: 0.35 });
}

function drawBunker(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  const w = 46;
  const h = 26;

  // Concrete mass
  g.rect(sx, by - h, w, h); g.fill(CONCRETE_DARK);
  g.rect(sx + 1, by - h + 1, w - 2, h - 2); g.fill(CONCRETE);
  g.rect(sx + 1, by - h + 1, w - 2, 2); g.fill(CONCRETE_LIGHT);
  // Sloped roof cap
  g.rect(sx - 3, by - h - 4, w + 6, 5); g.fill(CONCRETE_DARK);
  g.rect(sx - 2, by - h - 4, w + 4, 2); g.fill(CONCRETE);
  // Firing slit with a hint of light inside
  g.rect(sx + 8, by - h + 10, w - 16, 5); g.fill(0x14141a);
  g.rect(sx + 10, by - h + 11, w - 20, 2); g.fill({ color: 0xff8855, alpha: 0.35 });
  // Weathering and rebar stains
  for (let i = 0; i < 5; i++) {
    const dx = sx + 3 + Math.round(hash(sx + i * 13) * (w - 8));
    g.rect(dx, by - h + 4, 1, 4 + Math.round(hash(sx + i) * 5));
    g.fill({ color: 0x3f3f47, alpha: 0.7 });
  }
  // Sandbag skirt
  for (let bx = sx - 4; bx < sx + w + 2; bx += 7) {
    g.rect(bx, by - 5, 6, 5); g.fill(SANDBAG_DARK);
    g.rect(bx + 1, by - 5, 4, 4); g.fill(SANDBAG);
  }
  g.rect(sx - 5, by - 1, w + 12, 1); g.fill({ color: BLACK, alpha: 0.4 });
}

function drawTankWreck(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);

  // Hull
  g.rect(sx, by - 14, 44, 10); g.fill(0x3c4038);
  g.rect(sx + 1, by - 13, 42, 8); g.fill(0x4a4f43);
  g.rect(sx + 1, by - 13, 42, 1); g.fill(0x5a6152);
  // Skirt over the tracks
  g.rect(sx + 2, by - 6, 40, 6); g.fill(0x2f332c);
  // Road wheels
  for (let i = 0; i < 5; i++) {
    g.circle(sx + 7 + i * 8, by - 3, 3); g.fill(0x22261f);
    g.circle(sx + 7 + i * 8, by - 3, 1); g.fill(0x3a4033);
  }
  // Broken track links spilling forward
  g.rect(sx + 40, by - 2, 10, 2); g.fill(0x22261f);
  g.rect(sx + 46, by - 4, 6, 2); g.fill(0x22261f);
  // Turret, blown askew
  g.rect(sx + 12, by - 22, 20, 9); g.fill(0x3c4038);
  g.rect(sx + 13, by - 21, 18, 7); g.fill(0x4a4f43);
  g.rect(sx + 14, by - 21, 16, 1); g.fill(0x5a6152);
  // Blast hole with charring
  g.rect(sx + 20, by - 19, 7, 5); g.fill(0x140f0c);
  g.rect(sx + 21, by - 18, 5, 3); g.fill(0x2a1c14);
  // Bent barrel drooping to the ground
  g.rect(sx + 30, by - 19, 16, 3); g.fill(0x33372f);
  g.rect(sx + 44, by - 17, 10, 3); g.fill(0x33372f);
  g.rect(sx + 52, by - 14, 6, 3); g.fill(0x3f443a);
  // Rust runs and scorch
  g.rect(sx + 5, by - 12, 2, 6); g.fill({ color: RUST, alpha: 0.55 });
  g.rect(sx + 34, by - 11, 2, 5); g.fill({ color: RUST, alpha: 0.45 });
  g.rect(sx - 4, by - 1, 62, 1); g.fill({ color: BLACK, alpha: 0.4 });
}

function drawBarbedFence(g: Graphics, x: number, baseY: number, width: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  const h = 20;

  for (let px = sx; px <= sx + width; px += 20) {
    // Leaning post
    g.rect(px, by - h, 2, h); g.fill(WOOD_DARK);
    g.rect(px, by - h, 1, h); g.fill(WOOD);
    g.rect(px - 1, by - 2, 4, 2); g.fill(0x33200f);
  }
  // Sagging wire runs
  for (let row = 0; row < 3; row++) {
    const wy = by - h + 3 + row * 6;
    for (let px = sx; px < sx + width; px += 4) {
      const sag = Math.round(Math.sin((px - sx) / width * Math.PI) * 2);
      g.rect(px, wy + sag, 3, 1); g.fill(0x6e6e74);
      // Barbs
      if ((px - sx) % 12 === 0) {
        g.rect(px + 1, wy + sag - 1, 1, 3); g.fill(0x8a8a90);
      }
    }
  }
}

function drawTent(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  const w = 34;
  const h = 22;

  // Canvas ridge tent
  g.poly([sx, by, sx + w / 2, by - h, sx + w, by]);
  g.fill(CANVAS_DARK);
  g.poly([sx + 3, by, sx + w / 2, by - h + 3, sx + w / 2, by]);
  g.fill(CANVAS_TAN);
  // Ridge line + seams
  g.rect(sx + w / 2 - 1, by - h, 2, h); g.fill(shiftBrightness(CANVAS_DARK, -10));
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    g.rect(sx + w / 2 - (w / 2) * t, by - h * (1 - t), 1, Math.round(h * (1 - t)));
    g.fill({ color: 0x3d381f, alpha: 0.5 });
  }
  // Dark doorway flap
  g.poly([sx + w / 2 - 5, by, sx + w / 2, by - 11, sx + w / 2 + 5, by]);
  g.fill(0x1e1c12);
  g.poly([sx + w / 2 - 4, by, sx + w / 2 - 1, by - 9, sx + w / 2 - 1, by]);
  g.fill(CANVAS_DARK);
  // Guy ropes + pegs
  g.rect(sx - 5, by - 1, 6, 1); g.fill(0x6d6244);
  g.rect(sx + w - 1, by - 1, 6, 1); g.fill(0x6d6244);
  g.rect(sx + w / 2 - 1, by - h - 3, 2, 4); g.fill(WOOD_DARK);
  g.rect(sx - 6, by - 2, 2, 2); g.fill(0x33200f);
  g.rect(sx + w + 4, by - 2, 2, 2); g.fill(0x33200f);
}

function drawBrokenWall(g: Graphics, x: number, baseY: number, width: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);

  // Jagged remains of a masonry wall
  for (let bx = sx; bx < sx + width; bx += 8) {
    const h = 10 + Math.round(hash(bx * 5 + 3) * 22);
    g.rect(bx, by - h, 8, h); g.fill(CONCRETE_DARK);
    g.rect(bx + 1, by - h + 1, 6, h - 1); g.fill(CONCRETE);
    g.rect(bx + 1, by - h + 1, 6, 1); g.fill(CONCRETE_LIGHT);
    // Exposed rebar
    if (hash(bx * 7) > 0.6) {
      g.rect(bx + 3, by - h - 4, 1, 5); g.fill(0x7a6a52);
      g.rect(bx + 5, by - h - 2, 1, 3); g.fill(0x7a6a52);
    }
    // Brick courses
    for (let cy = by - h + 4; cy < by; cy += 5) {
      g.rect(bx, cy, 8, 1); g.fill(0x3c3c44);
    }
  }
  g.rect(sx - 2, by - 2, width + 4, 2); g.fill(0x3c3c44);
}

function drawRubble(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);

  g.rect(sx, by - 4, 18, 4); g.fill(CONCRETE_DARK);
  g.rect(sx + 2, by - 6, 12, 3); g.fill(CONCRETE);
  g.rect(sx + 5, by - 8, 6, 2); g.fill(CONCRETE_LIGHT);
  // Loose chunks
  g.rect(sx - 3, by - 2, 4, 2); g.fill(CONCRETE_DARK);
  g.rect(sx + 18, by - 3, 5, 3); g.fill(CONCRETE_DARK);
  g.rect(sx + 19, by - 2, 3, 1); g.fill(CONCRETE);
  // Twisted rebar
  g.rect(sx + 8, by - 11, 1, 4); g.fill(0x7a6a52);
  g.rect(sx + 9, by - 12, 3, 1); g.fill(0x7a6a52);
}

function drawLampPost(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);

  g.rect(sx + 5, by - 42, 3, 42); g.fill(METAL_DARK);
  g.rect(sx + 5, by - 42, 1, 42); g.fill(METAL);
  g.rect(sx + 2, by - 3, 9, 3); g.fill(0x33333b);
  // Head
  g.rect(sx + 1, by - 45, 11, 4); g.fill(METAL_DARK);
  g.rect(sx + 2, by - 43, 9, 2); g.fill(0x2a2a30);
  // Support brace
  g.rect(sx + 3, by - 38, 2, 2); g.fill(METAL_DARK);
  g.rect(sx + 8, by - 38, 2, 2); g.fill(METAL_DARK);
}

function drawRadioTower(g: Graphics, x: number, baseY: number, height: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  const h = Math.round(height);

  // Tapering lattice mast
  for (let y = 0; y < h; y += 6) {
    const t = y / h;
    const halfW = Math.round(9 * (1 - t) + 2);
    const yy = by - y;
    g.rect(sx + 4 - halfW, yy - 1, 1, 6); g.fill(0x2f3a44);
    g.rect(sx + 4 + halfW, yy - 1, 1, 6); g.fill(0x2f3a44);
    g.rect(sx + 4 - halfW, yy - 6, halfW * 2, 1); g.fill(0x3b4854);
    // Cross bracing
    g.rect(sx + 4 - halfW + 1, yy - 3, halfW * 2 - 2, 1); g.fill({ color: 0x3b4854, alpha: 0.7 });
  }
  // Base pad + guy wires
  g.rect(sx - 6, by - 3, 20, 3); g.fill(CONCRETE_DARK);
  g.rect(sx - 5, by - 3, 18, 1); g.fill(CONCRETE);
  g.rect(sx + 4, by - h, 1, 8); g.fill(0x3b4854);
  // Dish
  g.rect(sx + 5, by - h + 18, 6, 6); g.fill(0x4a5560);
  g.rect(sx + 6, by - h + 19, 4, 4); g.fill(0x60707c);
}

function drawFlagPole(g: Graphics, x: number, baseY: number): void {
  const sx = Math.round(x);
  const by = Math.round(baseY);
  g.rect(sx, by - 46, 2, 46); g.fill(METAL_DARK);
  g.rect(sx, by - 46, 1, 46); g.fill(METAL);
  g.rect(sx - 2, by - 2, 6, 2); g.fill(0x33333b);
  g.rect(sx - 1, by - 47, 4, 2); g.fill(0xc9a227);
}

function drawFlagCloth(g: Graphics, x: number, y: number, phase: number): void {
  // Three-column banner, each column offset on a sine to read as cloth in wind
  for (let c = 0; c < 4; c++) {
    const wave = Math.round(Math.sin(phase * 4 + c * 0.9) * (1 + c * 0.6));
    g.rect(x + c * 4, y + wave, 4, 10); g.fill(0x8f2233);
    g.rect(x + c * 4, y + wave, 4, 3); g.fill(0xb02c3f);
    g.rect(x + c * 4, y + wave + 9, 4, 1); g.fill(0x6a1826);
  }
}

function drawFlame(g: Graphics, cx: number, cy: number, phase: number): void {
  const flick = Math.sin(phase * 8) * 0.5 + Math.sin(phase * 13.7) * 0.5;
  const h = 9 + flick * 3;

  g.ellipse(cx, cy + 2, 7, 5); g.fill({ color: EMBER, alpha: 0.13 });
  g.poly([cx - 4, cy + 3, cx, cy - h, cx + 4, cy + 3]);
  g.fill(0xd83b12);
  g.poly([cx - 3, cy + 3, cx + flick, cy - h * 0.75, cx + 3, cy + 3]);
  g.fill(0xff7722);
  g.poly([cx - 2, cy + 3, cx + flick * 0.5, cy - h * 0.45, cx + 2, cy + 3]);
  g.fill(0xffc244);
  g.rect(Math.round(cx - 1), Math.round(cy), 2, 3); g.fill(0xffeba8);
  // Rising sparks
  for (let i = 0; i < 3; i++) {
    const t = (phase * 1.6 + i * 0.33) % 1;
    g.rect(Math.round(cx - 2 + Math.sin(phase * 5 + i) * 3), Math.round(cy - h - t * 12), 1, 1);
    g.fill({ color: 0xffbb55, alpha: 1 - t });
  }
}

// ═══════════════════════════════════════════════════════════════
// PLAYER CHARACTER
// ═══════════════════════════════════════════════════════════════

export function drawPlayer(g: Graphics, player: PlayerState): void {
  if (player.isDead) {
    if (Math.floor(player.deathTimer * 10) % 2 === 0) {
      drawPlayerSprite(g, Math.round(player.x), Math.round(player.y), player);
    }
    return;
  }

  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) return;

  const sx = Math.round(player.x);
  const sy = Math.round(player.y);

  drawPlayerSprite(g, sx, sy, player);

  if (player.isShooting && player.shootCooldown > 0.12) {
    drawMuzzleFlash(g, sx, sy, player);
  }
}

function drawMuzzleFlash(g: Graphics, sx: number, sy: number, player: PlayerState): void {
  const isCrouch = player.isCrouching && player.isOnGround;
  const yShift = isCrouch ? 6 : 0;
  const aim = player.aimDirection || 'straight';
  const facingRight = player.facingRight;

  let fx = sx + (facingRight ? 16 : -4);
  let fy = sy + yShift + 6;

  if (aim === 'up') {
    fx = sx + (facingRight ? 10 : 2);
    fy = sy + yShift - 8;
  } else if (aim === 'down') {
    fx = sx + (facingRight ? 10 : 2);
    fy = sy + yShift + 22;
  } else if (aim === 'diagonal_up') {
    fx = sx + (facingRight ? 18 : -6);
    fy = sy + yShift - 4;
  } else if (aim === 'diagonal_down') {
    fx = sx + (facingRight ? 18 : -6);
    fy = sy + yShift + 16;
  }

  const flashColor = player.weaponType === 'plasma_beam' ? 0xff88ff : 0xffdd44;
  g.rect(fx, fy, 5, 5); g.fill(flashColor);
  g.rect(fx + 1, fy + 1, 3, 3); g.fill(0xffffff);
}

function drawPlayerSprite(g: Graphics, x: number, y: number, player: PlayerState): void {
  const facingRight = player.facingRight;
  const animFrame = player.animFrame;
  const aim = player.aimDirection || 'straight';
  const isCrouch = player.isCrouching && player.isOnGround;
  const charId = player.characterId || 'commando';

  const hex = parseColor(player.color);
  const dark = shiftBrightness(hex, -25);
  const darker = shiftBrightness(hex, -40);

  const rx = (lx: number) => facingRight ? x + lx : x + 15 - lx;
  const bodyY = isCrouch ? y + 6 : y;

  // ── BOOTS & LEGS ──
  if (isCrouch) {
    g.rect(rx(0), bodyY + 14, 6, 4); g.fill(darker);
    g.rect(rx(8), bodyY + 14, 6, 4); g.fill(darker);
    g.rect(rx(2), bodyY + 10, 4, 5); g.fill(dark);
    g.rect(rx(8), bodyY + 10, 4, 5); g.fill(dark);
  } else {
    const legTop = bodyY + 14;
    const bootY = bodyY + 20;
    g.rect(rx(1), bootY, 4, 4); g.fill(darker);
    g.rect(rx(7), bootY, 4, 4); g.fill(darker);
    g.rect(rx(1), bootY + 3, 3, 1); g.fill(darker);
    g.rect(rx(7), bootY + 3, 3, 1); g.fill(darker);

    if (animFrame === 0) {
      g.rect(rx(2), legTop, 3, 7); g.fill(dark);
      g.rect(rx(8), legTop, 3, 5); g.fill(dark);
      g.rect(rx(2), legTop + 4, 3, 2); g.fill(darker);
      g.rect(rx(8), legTop + 2, 3, 2); g.fill(darker);
    } else {
      g.rect(rx(2), legTop, 3, 5); g.fill(dark);
      g.rect(rx(8), legTop, 3, 7); g.fill(dark);
      g.rect(rx(2), legTop + 2, 3, 2); g.fill(darker);
      g.rect(rx(8), legTop + 4, 3, 2); g.fill(darker);
    }
  }

  // ── BELT ──
  g.rect(rx(1), bodyY + 12, 10, 2); g.fill(0x333333);
  g.rect(rx(5), bodyY + 12, 3, 2); g.fill(0xaa9955);

  // ── TORSO & CLASS ARMOR ──
  g.rect(rx(2), bodyY + 5, 8, 8); g.fill(hex);
  g.rect(rx(3), bodyY + 6, 6, 6); g.fill(dark);

  if (charId === 'commando') {
    g.rect(rx(3), bodyY + 6, 2, 6); g.fill(0x884422);
    g.rect(rx(7), bodyY + 6, 2, 6); g.fill(0x884422);
    g.rect(rx(3), bodyY + 7, 2, 1); g.fill(0xffff88);
    g.rect(rx(7), bodyY + 9, 2, 1); g.fill(0xffff88);
  } else if (charId === 'scout') {
    g.rect(rx(4), bodyY + 6, 4, 5); g.fill(darker);
    g.rect(rx(5), bodyY + 7, 2, 2); g.fill(0x08d9d6);
    const scarfOffset = (animFrame * 2) - 1;
    g.rect(rx(facingRight ? -3 : 13), bodyY + 5 + scarfOffset, 4, 3); g.fill(0x08d9d6);
  } else if (charId === 'heavy') {
    g.rect(rx(1), bodyY + 4, 11, 4); g.fill(darker);
    g.rect(rx(2), bodyY + 5, 9, 3); g.fill(0x2af598);
    g.rect(rx(0), bodyY + 4, 3, 5); g.fill(darker);
    g.rect(rx(10), bodyY + 4, 3, 5); g.fill(darker);
  } else if (charId === 'demolition') {
    g.rect(rx(3), bodyY + 6, 6, 6); g.fill(0x554422);
    g.rect(rx(4), bodyY + 7, 2, 2); g.fill(0xffde7d);
    g.rect(rx(7), bodyY + 9, 2, 2); g.fill(0xffde7d);
  } else if (charId === 'infiltrator') {
    g.rect(rx(3), bodyY + 5, 6, 7); g.fill(darker);
    g.rect(rx(5), bodyY + 6, 2, 5); g.fill(0x7160e8);
    g.rect(rx(4), bodyY + 8, 4, 1); g.fill(0x7160e8);
  } else if (charId === 'vanguard') {
    g.rect(rx(2), bodyY + 5, 8, 7); g.fill(0x444444);
    g.rect(rx(3), bodyY + 6, 6, 2); g.fill(0xff9f43);
    g.rect(rx(4), bodyY + 9, 4, 2); g.fill(0xff9f43);
  }

  // ── HEAD & HELMET ──
  g.rect(rx(3), bodyY, 6, 5); g.fill(hex);
  g.rect(rx(4), bodyY + 1, 4, 3); g.fill(FLESH);

  if (charId === 'commando') {
    g.rect(rx(2), bodyY - 1, 8, 3); g.fill(0xff2e63);
    g.rect(rx(facingRight ? 0 : 13), bodyY, 3, 2); g.fill(0xff2e63);
  } else if (charId === 'scout') {
    g.rect(rx(2), bodyY - 1, 8, 3); g.fill(darker);
    g.rect(facingRight ? rx(7) : rx(3), bodyY + 1, 3, 2); g.fill(0x08d9d6);
  } else if (charId === 'heavy') {
    g.rect(rx(2), bodyY - 2, 8, 4); g.fill(darker);
    g.rect(rx(3), bodyY - 3, 6, 2); g.fill(0x2af598);
    g.rect(facingRight ? rx(7) : rx(3), bodyY + 1, 3, 2); g.fill(0xffff44);
  } else if (charId === 'demolition') {
    g.rect(rx(2), bodyY - 2, 8, 4); g.fill(0xffde7d);
    g.rect(rx(3), bodyY - 3, 6, 2); g.fill(darker);
    g.rect(facingRight ? rx(6) : rx(3), bodyY + 1, 4, 2); g.fill(0x332211);
  } else if (charId === 'infiltrator') {
    g.rect(rx(2), bodyY - 2, 8, 5); g.fill(darker);
    g.rect(facingRight ? rx(7) : rx(3), bodyY + 1, 3, 1); g.fill(0xbb99ff);
  } else if (charId === 'vanguard') {
    g.rect(rx(2), bodyY - 2, 8, 4); g.fill(darker);
    g.rect(rx(4), bodyY - 3, 4, 2); g.fill(0xff9f43);
    g.rect(facingRight ? rx(7) : rx(3), bodyY + 1, 3, 2); g.fill(0xffffff);
  }

  drawPlayerWeaponAndArms(g, rx, bodyY, facingRight, aim, charId, hex);
}

function drawPlayerWeaponAndArms(
  g: Graphics,
  rx: (lx: number) => number,
  bodyY: number,
  facingRight: boolean,
  aim: string,
  charId: string,
  hex: number,
): void {
  const shoulderX = rx(facingRight ? 8 : 2);

  let gunX = rx(facingRight ? 10 : -4);
  let gunY = bodyY + 6;
  let gunW = 8;
  let gunH = 3;

  const gunColor = charId === 'heavy' ? 0x445566 : charId === 'infiltrator' ? 0x553377 : 0x555555;

  if (aim === 'up') {
    gunX = rx(facingRight ? 6 : 4);
    gunY = bodyY - 6;
    gunW = 3;
    gunH = 10;
    g.rect(shoulderX, bodyY + 1, 2, 6); g.fill(hex);
    g.rect(gunX, gunY, gunW, gunH); g.fill(gunColor);
    g.rect(gunX + 1, gunY - 2, 1, 3); g.fill(0x888888);
  } else if (aim === 'diagonal_up') {
    gunX = rx(facingRight ? 10 : -4);
    gunY = bodyY - 2;
    g.rect(shoulderX, bodyY + 3, 3, 4); g.fill(hex);
    g.rect(gunX, gunY + 2, 5, 3); g.fill(gunColor);
    g.rect(gunX + (facingRight ? 3 : 0), gunY, 4, 3); g.fill(0x777777);
  } else if (aim === 'diagonal_down') {
    gunX = rx(facingRight ? 10 : -4);
    gunY = bodyY + 8;
    g.rect(shoulderX, bodyY + 5, 3, 4); g.fill(hex);
    g.rect(gunX, gunY, 5, 3); g.fill(gunColor);
    g.rect(gunX + (facingRight ? 3 : 0), gunY + 2, 4, 3); g.fill(0x777777);
  } else if (aim === 'down') {
    gunX = rx(facingRight ? 6 : 4);
    gunY = bodyY + 12;
    gunW = 3;
    gunH = 10;
    g.rect(shoulderX, bodyY + 7, 2, 5); g.fill(hex);
    g.rect(gunX, gunY, gunW, gunH); g.fill(gunColor);
  } else {
    g.rect(rx(facingRight ? 7 : 1), bodyY + 6, 4, 2); g.fill(hex);
    g.rect(gunX + (facingRight ? 0 : -2), gunY, 8, 3); g.fill(gunColor);
    g.rect(gunX + (facingRight ? 4 : -4), gunY + 1, 4, 1); g.fill(0x888888);
  }
}

/** Edge marker shown while the scroll is carrying a player along, so being pushed by the
 * screen edge reads as intentional rather than as a stuck character. */
export function drawTetherEdge(
  g: Graphics,
  edge: 'left' | 'right',
  y: number,
  height: number,
  viewportW: number,
  color: number,
  time: number,
): void {
  const pulse = 0.35 + Math.sin(time * 7) * 0.25;
  const x = edge === 'left' ? 0 : viewportW - 2;
  const top = Math.round(y) - 3;
  g.rect(x, top, 2, height + 6); g.fill({ color, alpha: pulse });
  // Chevrons pointing the way the screen is pulling them
  const dir = edge === 'left' ? 1 : -1;
  for (let i = 0; i < 3; i++) {
    g.rect(x + (edge === 'left' ? 2 : -1) + i * dir, top + 4 + i, 1, height - 2 - i * 2);
    g.fill({ color, alpha: pulse * (0.6 - i * 0.18) });
  }
}

// ═══════════════════════════════════════════════════════════════
// ENEMIES
// ═══════════════════════════════════════════════════════════════

export function drawSoldier(g: Graphics, enemy: EnemyState): void {
  if (enemy.isDead) {
    if (Math.floor(enemy.deathTimer * 10) % 2 === 0) return;
    const sx = Math.round(enemy.x);
    g.rect(sx + 2, Math.round(enemy.y) + 14, 10, 10); g.fill(0x442222);
    g.rect(sx + 3, Math.round(enemy.y) + 16, 8, 6); g.fill(0x661111);
    return;
  }

  const sx = Math.round(enemy.x);
  const sy = Math.round(enemy.y);
  const bodyColor = 0x993333;
  const darkColor = 0x661111;
  const armorColor = 0x444444;

  g.rect(sx + 1, sy + 21, 4, 3); g.fill(darkColor);
  g.rect(sx + 7, sy + 21, 4, 3); g.fill(darkColor);

  g.rect(sx + 2, sy + 14, 3, 8); g.fill(bodyColor);
  g.rect(sx + 7, sy + 14, 3, 8); g.fill(bodyColor);
  g.rect(sx + 2, sy + 17, 3, 2); g.fill(darkColor);
  g.rect(sx + 7, sy + 17, 3, 2); g.fill(darkColor);

  g.rect(sx + 1, sy + 13, 10, 2); g.fill(armorColor);

  g.rect(sx + 1, sy + 5, 10, 9); g.fill(bodyColor);
  g.rect(sx + 2, sy + 6, 8, 6); g.fill(armorColor);
  g.rect(sx + 3, sy + 7, 6, 4); g.fill(0x555555);
  g.rect(sx + 5, sy + 8, 2, 3); g.fill(0xcc3333);

  g.rect(sx, sy + 4, 3, 4); g.fill(armorColor);
  g.rect(sx + 9, sy + 4, 3, 4); g.fill(armorColor);

  g.rect(sx, sy + 7, 2, 5); g.fill(bodyColor);
  g.rect(sx + 10, sy + 7, 2, 4); g.fill(bodyColor);

  g.rect(enemy.facingRight ? sx + 10 : sx - 3, sy + 7, 5, 2); g.fill(0x555555);
  g.rect(enemy.facingRight ? sx + 14 : sx - 3, sy + 7, 1, 2); g.fill(0x777777);

  g.rect(sx + 2, sy, 8, 6); g.fill(bodyColor);
  g.rect(sx + 1, sy - 1, 10, 4); g.fill(darkColor);
  g.rect(sx + 2, sy - 2, 8, 2); g.fill(armorColor);
  // Eyes track the facing direction
  g.rect(enemy.facingRight ? sx + 9 : sx + 1, sy + 1, 2, 1); g.fill(0xff2222);
  g.rect(enemy.facingRight ? sx + 9 : sx + 2, sy + 3, 1, 1); g.fill(0xff4444);
}

export function drawTurret(g: Graphics, enemy: EnemyState): void {
  if (enemy.isDead) {
    const sx = Math.round(enemy.x);
    g.rect(sx + 2, Math.round(enemy.y) + 6, 8, 6); g.fill(0x442222);
    g.rect(sx + 3, Math.round(enemy.y) + 8, 6, 3); g.fill(0x661111);
    return;
  }

  const sx = Math.round(enemy.x);
  const sy = Math.round(enemy.y);
  const right = enemy.facingRight;

  g.rect(sx + 1, sy + 12, 2, 4); g.fill(METAL_DARK);
  g.rect(sx + 9, sy + 12, 2, 4); g.fill(METAL_DARK);
  g.rect(sx + 5, sy + 14, 2, 3); g.fill(METAL_DARK);

  g.rect(sx, sy + 6, 12, 7); g.fill(METAL_DARK);
  g.rect(sx + 1, sy + 7, 10, 5); g.fill(METAL);
  g.rect(sx + 2, sy + 8, 8, 3); g.fill(METAL_LIGHT);

  g.rect(sx + 1, sy + 4, 4, 3); g.fill(0x664422);
  g.rect(sx + 1, sy + 3, 4, 2); g.fill(0x775533);

  // Barrel points at whoever it is tracking
  const bx = right ? sx + 10 : sx - 8;
  g.rect(bx, sy + 7, 10, 3); g.fill(METAL_DARK);
  g.rect(bx, sy + 8, 10, 1); g.fill(METAL_LIGHT);
  g.rect(right ? bx + 9 : bx - 1, sy + 7, 2, 3); g.fill(METAL);

  g.rect(sx + 6, sy + 9, 2, 2); g.fill(0xff2222);
  g.rect(sx + 7, sy + 9, 1, 1); g.fill(0xff6666);
}

export function drawBoss(g: Graphics, enemy: EnemyState): void {
  if (enemy.isDead) {
    if (Math.floor(enemy.deathTimer * 10) % 2 === 0) return;
    const sx = Math.round(enemy.x);
    g.rect(sx + 4, Math.round(enemy.y) + 20, 18, 16); g.fill(0x441111);
    return;
  }

  const sx = Math.round(enemy.x);
  const sy = Math.round(enemy.y);
  const bodyColor = 0x992222;
  const darkColor = 0x661111;
  const armorColor = 0x3a3a4a;
  const goldColor = 0xcc9933;

  g.rect(sx + 3, sy + 34, 6, 3); g.fill(darkColor);
  g.rect(sx + 15, sy + 34, 6, 3); g.fill(darkColor);
  g.rect(sx + 4, sy + 36, 4, 1); g.fill(0x440000);
  g.rect(sx + 16, sy + 36, 4, 1); g.fill(0x440000);

  g.rect(sx + 3, sy + 24, 5, 11); g.fill(bodyColor);
  g.rect(sx + 16, sy + 24, 5, 11); g.fill(bodyColor);
  g.rect(sx + 3, sy + 29, 5, 3); g.fill(armorColor);
  g.rect(sx + 16, sy + 29, 5, 3); g.fill(armorColor);

  g.rect(sx + 2, sy + 22, 20, 3); g.fill(0x555555);
  g.rect(sx + 9, sy + 22, 6, 3); g.fill(goldColor);

  g.rect(sx + 2, sy + 7, 20, 16); g.fill(bodyColor);
  g.rect(sx + 3, sy + 8, 18, 13); g.fill(armorColor);
  g.rect(sx + 5, sy + 9, 14, 4); g.fill(0x4a4a5a);
  g.rect(sx + 5, sy + 14, 14, 5); g.fill(0x4a4a5a);
  g.rect(sx + 5, sy + 9, 14, 1); g.fill(goldColor);
  g.rect(sx + 5, sy + 13, 14, 1); g.fill(goldColor);
  g.rect(sx + 5, sy + 18, 14, 1); g.fill(goldColor);

  g.rect(sx, sy + 4, 7, 10); g.fill(armorColor);
  g.rect(sx + 1, sy + 5, 5, 8); g.fill(0x4a4a5a);
  g.rect(sx, sy + 4, 7, 1); g.fill(goldColor);

  g.rect(sx + 17, sy + 4, 7, 10); g.fill(armorColor);
  g.rect(sx + 18, sy + 5, 5, 8); g.fill(0x4a4a5a);
  g.rect(sx + 17, sy + 4, 7, 1); g.fill(goldColor);

  g.rect(sx + 1, sy + 13, 3, 6); g.fill(bodyColor);
  g.rect(sx + 20, sy + 11, 3, 6); g.fill(bodyColor);
  g.rect(sx, sy + 14, 3, 3); g.fill(armorColor);
  g.rect(sx + 21, sy + 12, 3, 3); g.fill(armorColor);

  // Cannon arm follows the boss facing
  const flip = enemy.facingRight ? 1 : -1;
  const cannonX = enemy.facingRight ? sx + 20 : sx - 8;
  g.rect(cannonX, sy + 9, 12, 5); g.fill(0x444444);
  g.rect(cannonX + 1, sy + 10, 10, 3); g.fill(0x555555);
  g.rect(enemy.facingRight ? cannonX + 8 : cannonX - 1, sy + 9, 3, 5); g.fill(0x666666);
  g.rect(cannonX + (flip > 0 ? 5 : 5), sy + 10, 1, 3); g.fill(goldColor);

  g.rect(sx + 5, sy - 1, 14, 9); g.fill(bodyColor);
  g.rect(sx + 3, sy - 2, 18, 6); g.fill(darkColor);
  g.rect(sx + 4, sy - 3, 16, 4); g.fill(armorColor);
  g.rect(sx + 8, sy - 5, 8, 3); g.fill(armorColor);
  g.rect(sx + 10, sy - 4, 4, 1); g.fill(goldColor);
  g.rect(enemy.facingRight ? sx + 16 : sx + 3, sy + 1, 5, 2); g.fill(0xff2222);
  g.rect(enemy.facingRight ? sx + 17 : sx + 4, sy + 2, 3, 1); g.fill(0xff6644);
  g.rect(sx + 6, sy + 6, 12, 2); g.fill(armorColor);
}

// ═══════════════════════════════════════════════════════════════
// PROJECTILES
// ═══════════════════════════════════════════════════════════════

export function drawPlayerBullet(g: Graphics, proj: Projectile): void {
  const sx = Math.round(proj.x);
  const sy = Math.round(proj.y);
  const wtype = proj.weaponType || 'burst_rifle';

  if (wtype === 'dual_smg') {
    g.rect(sx, sy, proj.width, proj.height); g.fill(0x08d9d6);
    g.rect(sx + 1, sy, 2, 1); g.fill(0xffffff);
  } else if (wtype === 'heavy_cannon') {
    g.rect(sx - 2, sy - 1, proj.width + 2, proj.height + 2); g.fill(0xff6600);
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xffde7d);
    g.rect(sx + 2, sy + 1, 3, 2); g.fill(0xffffff);
  } else if (wtype === 'grenade_launcher') {
    g.rect(sx, sy, 5, 5); g.fill(0xff4422);
    g.rect(sx + 1, sy + 1, 3, 3); g.fill(0xffde7d);
    g.rect(sx + 2, sy - 1, 1, 1); g.fill(0xffff88);
  } else if (wtype === 'plasma_beam') {
    g.rect(sx - 3, sy - 1, proj.width + 6, proj.height + 2); g.fill(0x7160e8);
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xdd88ff);
    g.rect(sx + 2, sy + 1, proj.width - 2, 1); g.fill(0xffffff);
  } else if (wtype === 'spread_shotgun') {
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xff9f43);
    g.rect(sx + 1, sy, 1, 1); g.fill(0xffffff);
  } else {
    g.rect(sx - 3, sy, 3, 2); g.fill(0xffaa22);
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xffee44);
    g.rect(sx + 2, sy, 2, 2); g.fill(0xffffff);
  }
}

export function drawEnemyBullet(g: Graphics, proj: Projectile): void {
  const sx = Math.round(proj.x);
  const sy = Math.round(proj.y);
  g.rect(sx - 1, sy, 6, 4); g.fill(0x661111);
  g.rect(sx, sy + 1, 1, 2); g.fill(0xdd2222);
  g.rect(sx + 1, sy, 2, 4); g.fill(0xff4444);
  g.rect(sx + 3, sy + 1, 1, 2); g.fill(0xdd2222);
  g.rect(sx + 1, sy + 1, 2, 2); g.fill(0xffaa88);
}

export function drawBossBullet(g: Graphics, proj: Projectile): void {
  const sx = Math.round(proj.x);
  const sy = Math.round(proj.y);
  g.rect(sx - 1, sy, 8, 6); g.fill(0x661100);
  g.rect(sx, sy + 1, 6, 4); g.fill(0xff4400);
  g.rect(sx + 1, sy + 1, 4, 4); g.fill(0xff6600);
  g.rect(sx + 2, sy + 2, 2, 2); g.fill(0xffaa33);
  g.rect(sx + 2, sy + 2, 1, 2); g.fill(0xffdd88);
}

// ═══════════════════════════════════════════════════════════════
// POWER-UP CAPSULES
// ═══════════════════════════════════════════════════════════════

export function drawPowerUp(
  g: Graphics,
  powerUp: { x: number; y: number; type: string },
  time: number,
): void {
  const bob = Math.round(Math.sin(time * 3 + powerUp.x) * 1.5);
  const sx = Math.round(powerUp.x);
  const sy = Math.round(powerUp.y) + bob;

  // Pulsing halo so drops read against busy ground
  g.circle(sx + 6, sy + 6, 9); g.fill({ color: 0xffde7d, alpha: 0.10 + Math.sin(time * 6) * 0.05 });

  g.rect(sx, sy, 12, 12); g.fill(0x1f1e2e);
  g.rect(sx + 1, sy + 1, 10, 10); g.fill(0xffde7d);
  g.rect(sx + 2, sy + 2, 8, 8); g.fill(0x0f0e17);

  if (powerUp.type === 'spread') {
    g.rect(sx + 4, sy + 5, 4, 2); g.fill(0xff2e63);
    g.rect(sx + 4, sy + 3, 2, 2); g.fill(0xff2e63);
    g.rect(sx + 6, sy + 7, 2, 2); g.fill(0xff2e63);
  } else if (powerUp.type === 'laser') {
    g.rect(sx + 4, sy + 3, 4, 6); g.fill(0x7160e8);
    g.rect(sx + 6, sy + 7, 2, 2); g.fill(0x7160e8);
  } else if (powerUp.type === 'machinegun') {
    g.rect(sx + 4, sy + 3, 2, 6); g.fill(0x08d9d6);
    g.rect(sx + 8, sy + 3, 2, 6); g.fill(0x08d9d6);
    g.rect(sx + 6, sy + 4, 2, 3); g.fill(0x08d9d6);
  } else {
    g.rect(sx + 5, sy + 3, 2, 6); g.fill(0x2af598);
    g.rect(sx + 3, sy + 5, 6, 2); g.fill(0x2af598);
  }
}

// ═══════════════════════════════════════════════════════════════
// PARTICLES + EFFECTS
// ═══════════════════════════════════════════════════════════════

export function drawParticle(g: Graphics, p: Particle): void {
  const sx = Math.round(p.x);
  const sy = Math.round(p.y);
  const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));

  if (p.type === 'shell') {
    g.rect(sx, sy, 3, 1); g.fill({ color: 0xffdd44, alpha });
    g.rect(sx + 1, sy, 1, 1); g.fill({ color: WHITE, alpha });
  } else if (p.type === 'dust') {
    g.rect(sx, sy, 3, 2); g.fill({ color: 0xa7a9be, alpha: alpha * 0.6 });
    g.rect(sx + 1, sy - 1, 1, 1); g.fill({ color: 0xc9cbd8, alpha: alpha * 0.4 });
  } else if (p.type === 'smoke') {
    const grow = 1 + (1 - alpha) * 2;
    g.rect(sx - grow, sy - grow, 2 + grow * 2, 2 + grow * 2);
    g.fill({ color: 0x555566, alpha: alpha * 0.45 });
  } else {
    g.rect(sx, sy, 2, 2); g.fill({ color: p.color, alpha });
    if (alpha > 0.7) { g.rect(sx, sy, 1, 1); g.fill({ color: WHITE, alpha: alpha - 0.5 }); }
  }
}

export function drawExplosion(g: Graphics, ex: Explosion): void {
  const sx = Math.round(ex.x);
  const sy = Math.round(ex.y);
  const progress = 1 - ex.timer / ex.maxTime;
  const radius = Math.max(2, Math.round(ex.radius * (0.35 + progress * 0.75)));

  if (progress < 0.18) {
    // Ignition flash
    g.circle(sx, sy, radius + 3); g.fill({ color: WHITE, alpha: 0.9 });
    g.circle(sx, sy, radius + 8); g.fill({ color: 0xffeeaa, alpha: 0.35 });
    return;
  }

  const fade = 1 - progress;
  g.circle(sx, sy, radius + 4); g.fill({ color: 0x220e06, alpha: fade * 0.35 });
  g.circle(sx, sy, radius); g.fill({ color: 0xff5500, alpha: fade });
  g.circle(sx, sy, Math.round(radius * 0.7)); g.fill({ color: 0xff9911, alpha: fade });
  g.circle(sx, sy, Math.round(radius * 0.4)); g.fill({ color: 0xffdd66, alpha: fade });

  if (progress > 0.45) {
    // Smoke crown
    const t = (progress - 0.45) / 0.55;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + ex.seed;
      const d = radius * (0.5 + t * 0.9);
      g.circle(sx + Math.cos(a) * d, sy + Math.sin(a) * d - t * 6, 3 + t * 4);
      g.fill({ color: 0x4a4a52, alpha: (1 - t) * 0.35 });
    }
  }
}

export function drawShockRing(g: Graphics, ex: Explosion): void {
  const progress = 1 - ex.timer / ex.maxTime;
  if (progress > 0.5) return;
  const sx = Math.round(ex.x);
  const sy = Math.round(ex.y);
  const r = Math.round(ex.radius * (0.4 + progress * 2.2));
  g.circle(sx, sy, r); g.stroke({ width: 1, color: 0xffd9a0, alpha: (0.5 - progress) * 1.4 });
}

// ═══════════════════════════════════════════════════════════════
// SCREEN EFFECTS
// ═══════════════════════════════════════════════════════════════

export function drawVignette(
  g: Graphics,
  viewportW: number,
  viewportH: number,
  intensity: number,
): void {
  g.clear();
  if (intensity <= 0) return;
  const bands = 8;
  const max = Math.min(0.55, intensity);

  for (let i = 0; i < bands; i++) {
    const t = 1 - i / bands;
    const alpha = max * t * 0.32;
    const inset = i;
    // Feathered frame — each pass covers a thinner ring, so it reads as a gradient
    g.rect(0, inset, viewportW, 1); g.fill({ color: 0x000000, alpha });
    g.rect(0, viewportH - 1 - inset, viewportW, 1); g.fill({ color: 0x000000, alpha });
    g.rect(inset, 0, 1, viewportH); g.fill({ color: 0x000000, alpha: alpha * 0.8 });
    g.rect(viewportW - 1 - inset, 0, 1, viewportH); g.fill({ color: 0x000000, alpha: alpha * 0.8 });
  }
}

export function drawScreenFlash(
  g: Graphics,
  viewportW: number,
  viewportH: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  g.rect(0, 0, viewportW, viewportH);
  g.fill({ color: 0xffffff, alpha: Math.min(1, alpha) });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function parseColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function shiftBrightness(hex: number, amount: number): number {
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (hex & 0xff) + amount));
  return (r << 16) | (g << 8) | b;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(lerp(ar, br, t)) << 16)
    | (Math.round(lerp(ag, bg, t)) << 8)
    | Math.round(lerp(ab, bb, t));
}

/** Deterministic 0..1 noise — keeps baked scenery detail stable between builds. */
function hash(n: number): number {
  let x = Math.imul(Math.round(n) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
