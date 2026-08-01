import { Graphics } from 'pixi.js';
import type { PlayerState, EnemyState, Projectile, Particle, Platform } from './types';

// ═══════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════

const SKY_TOP = 0x0a0a1a;
const SKY_BOT = 0x1a1a3e;
const CLOUD = 0x334466;
const CLOUD_HI = 0x445577;
const STAR = 0x8899bb;
const MTN_FAR = 0x101828;
const MTN_MID = 0x151e30;
const MTN_NEAR = 0x1b2a3a;
const DIRT_DARK = 0x3a2818;
const DIRT_MID = 0x4d3520;
const DIRT_LIGHT = 0x5c4028;
const GRASS = 0x2a6636;
const GRASS_LIGHT = 0x3a8646;
const GRASS_DARK = 0x1d4a26;
const STONE = 0x5a5a6a;
const STONE_DARK = 0x4a4a5a;
const STONE_LIGHT = 0x6a6a7a;
const MOSS = 0x2a5530;
const METAL = 0x667788;
const METAL_DARK = 0x556677;
const METAL_LIGHT = 0x8899aa;
const WOOD = 0x6b4423;
const WOOD_DARK = 0x4a2e15;
const RUST = 0x884422;
const FLESH = 0xeebb99;
const WHITE = 0xffffff;
const BLACK = 0x111111;

// ═══════════════════════════════════════════════════════════════
// BACKGROUND — Sky Gradient + Stars + Parallax Clouds
// ═══════════════════════════════════════════════════════════════

export function drawSky(g: Graphics, viewportW: number, viewportH: number): void {
  g.clear();
  // Vertical gradient via horizontal strips
  const strips = 30;
  for (let i = 0; i < strips; i++) {
    const t = i / strips;
    const r = lerp(((SKY_TOP >> 16) & 0xff), ((SKY_BOT >> 16) & 0xff), t);
    const gn = lerp(((SKY_TOP >> 8) & 0xff), ((SKY_BOT >> 8) & 0xff), t);
    const b = lerp((SKY_TOP & 0xff), (SKY_BOT & 0xff), t);
    const color = (Math.round(r) << 16) | (Math.round(gn) << 8) | Math.round(b);
    const stripH = Math.ceil(viewportH / strips);
    g.rect(0, i * stripH, viewportW, stripH);
    g.fill(color);
  }
  // Stars
  const seed = 42;
  for (let i = 0; i < 40; i++) {
    const sx = ((seed * (i + 1) * 73 + i * 137) % 1000) / 1000 * viewportW;
    const sy = ((seed * (i + 2) * 97 + i * 151) % 600) / 1000 * viewportH * 0.55;
    const brightness = 1 - (sy / (viewportH * 0.55)) * 0.6;
    const starColor = lerpColor(BLACK, STAR, brightness);
    g.rect(Math.round(sx), Math.round(sy), 1, 1);
    g.fill(starColor);
  }
}

// ═══════════════════════════════════════════════════════════════
// PARALLAX MOUNTAINS — 3 Layers
// ═══════════════════════════════════════════════════════════════

export function drawMountains(
  g: Graphics,
  cameraX: number,
  viewportW: number,
  viewportH: number,
): void {
  g.clear();
  const baseY = viewportH - 28;

  // Far mountains — slowest parallax
  drawMountainRange(g, cameraX * 0.2, baseY, viewportW, MTN_FAR, [
    { x: 80, h: 90 }, { x: 280, h: 110 }, { x: 470, h: 75 },
    { x: 650, h: 100 }, { x: 820, h: 85 }, { x: 990, h: 105 },
    { x: 1160, h: 80 }, { x: 1330, h: 95 }, { x: 1500, h: 70 },
    { x: 1670, h: 100 }, { x: 1830, h: 85 },
  ], 1);

  // Mid mountains
  drawMountainRange(g, cameraX * 0.4, baseY, viewportW, MTN_MID, [
    { x: 40, h: 55 }, { x: 190, h: 70 }, { x: 350, h: 50 },
    { x: 520, h: 65 }, { x: 690, h: 55 }, { x: 850, h: 75 },
    { x: 1010, h: 60 }, { x: 1180, h: 50 }, { x: 1350, h: 68 },
    { x: 1520, h: 58 }, { x: 1690, h: 72 }, { x: 1860, h: 52 },
  ], 1.5);

  // Near foothills — fastest parallax, darker
  drawMountainRange(g, cameraX * 0.7, baseY, viewportW, MTN_NEAR, [
    { x: 0, h: 32 }, { x: 120, h: 40 }, { x: 250, h: 28 },
    { x: 380, h: 36 }, { x: 500, h: 30 }, { x: 630, h: 38 },
    { x: 760, h: 34 }, { x: 900, h: 42 }, { x: 1030, h: 28 },
    { x: 1160, h: 35 }, { x: 1290, h: 32 }, { x: 1420, h: 40 },
    { x: 1550, h: 30 }, { x: 1680, h: 36 },
  ], 2);
}

function drawMountainRange(
  g: Graphics,
  scrollX: number,
  baseY: number,
  viewportW: number,
  color: number,
  peaks: Array<{ x: number; h: number }>,
  detailScale: number,
): void {
  for (const peak of peaks) {
    const sx = peak.x - scrollX;
    if (sx + 100 < -40 || sx - 100 > viewportW + 40) continue;

    const halfW = 70 * detailScale;
    const snowLevel = peak.h * 0.72;

    // Main mountain triangle
    g.poly([
      sx - halfW, baseY,
      sx, baseY - peak.h,
      sx + halfW, baseY,
    ]);
    g.fill(color);

    // Dark side
    const darkShade = shiftBrightness(color, -12);
    g.poly([
      sx, baseY - peak.h,
      sx + halfW * 0.5, baseY,
      sx + halfW, baseY,
    ]);
    g.fill(darkShade);

    // Light edge
    const lightShade = shiftBrightness(color, 8);
    g.poly([
      sx - halfW * 0.3, baseY,
      sx, baseY - peak.h,
      sx - halfW * 0.15, baseY,
    ]);
    g.fill(lightShade);

    // Snowcap for taller peaks
    if (peak.h > 55 * detailScale) {
      const capW = halfW * 0.25;
      g.poly([
        sx - capW, baseY - snowLevel,
        sx, baseY - peak.h,
        sx + capW, baseY - snowLevel,
      ]);
      g.fill(0xddeeff);

      // Snow detail
      g.rect(sx - capW * 0.5, baseY - snowLevel + 2, capW, 2);
      g.fill(0xeef4ff);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CLOUDS — Parallax layer
// ═══════════════════════════════════════════════════════════════

export function drawClouds(
  g: Graphics,
  cameraX: number,
  viewportW: number,
  time: number,
): void {
  g.clear();
  const scrollX = cameraX * 0.15;

  const cloudDefs = [
    { x: 100, y: 30, w: 60 }, { x: 350, y: 50, w: 80 },
    { x: 600, y: 25, w: 50 }, { x: 900, y: 45, w: 70 },
    { x: 1150, y: 35, w: 55 }, { x: 1400, y: 55, w: 65 },
    { x: 1700, y: 28, w: 75 }, { x: 2000, y: 40, w: 60 },
  ];

  for (const cloud of cloudDefs) {
    let sx = cloud.x - scrollX;
    // Wrap around
    while (sx < -100) sx += 2200;
    while (sx > viewportW + 100) sx -= 2200;

    if (sx + cloud.w < -20 || sx > viewportW + 20) continue;

    const bob = Math.sin(time * 0.3 + cloud.x * 0.01) * 3;
    const sy = cloud.y + bob;

    // Cloud body
    g.rect(Math.round(sx), Math.round(sy + 4), cloud.w, 8);
    g.fill(CLOUD);
    g.rect(Math.round(sx + 6), Math.round(sy), cloud.w - 12, 12);
    g.fill(CLOUD);
    g.rect(Math.round(sx + 12), Math.round(sy - 3), cloud.w - 24, 10);
    g.fill(CLOUD_HI);
    // Highlight
    g.rect(Math.round(sx + 8), Math.round(sy - 2), cloud.w - 20, 4);
    g.fill(CLOUD_HI);
  }
}

// ═══════════════════════════════════════════════════════════════
// GROUND — Rich layered earth with texture
// ═══════════════════════════════════════════════════════════════

export function drawGround(
  g: Graphics,
  cameraX: number,
  groundY: number,
  viewportW: number,
  viewportH: number,
): void {
  g.clear();

  // Deep earth fill
  g.rect(0, groundY, viewportW, viewportH - groundY);
  g.fill(DIRT_DARK);

  const pxStart = Math.floor(cameraX);

  // Horizontal strata bands
  for (let row = 0; row < 3; row++) {
    const by = groundY + 3 + row * 6;
    g.rect(0, by, viewportW, 2);
    g.fill(row === 1 ? DIRT_LIGHT : DIRT_MID);
  }

  // Dirt texture — scattered darker/lighter pixels
  for (let px = Math.floor(pxStart % 3); px < viewportW; px += 3) {
    g.rect(px, groundY + 4, 1, 2);
    g.fill(DIRT_LIGHT);
    g.rect(px + 1, groundY + 10, 2, 1);
    g.fill(DIRT_DARK);
    g.rect(px, groundY + 16, 2, 2);
    g.fill(DIRT_LIGHT);
  }

  // Small rocks in dirt
  for (let px = Math.floor(pxStart % 18); px < viewportW; px += 18) {
    g.rect(px, groundY + 12, 3, 2);
    g.fill(STONE_DARK);
    g.rect(px + 1, groundY + 14, 2, 2);
    g.fill(STONE);
  }

  // Grass layer — 4px thick
  g.rect(0, groundY, viewportW, 4);
  g.fill(GRASS_DARK);
  g.rect(0, groundY, viewportW, 2);
  g.fill(GRASS);

  // Detailed grass tufts
  for (let px = Math.floor(pxStart % 5); px < viewportW; px += 5) {
    // Tall blade
    g.rect(px, groundY - 3, 1, 5);
    g.fill(GRASS);
    // Medium blade
    g.rect(px + 2, groundY - 2, 1, 4);
    g.fill(GRASS_LIGHT);
    // Short blade
    g.rect(px + 1, groundY - 1, 2, 3);
    g.fill(GRASS);
    // Dark base
    g.rect(px, groundY + 1, 3, 1);
    g.fill(GRASS_DARK);
  }

  // Occasional taller grass clumps
  for (let px = Math.floor(pxStart % 30); px < viewportW; px += 30) {
    g.rect(px, groundY - 5, 1, 7);
    g.fill(GRASS_LIGHT);
    g.rect(px + 3, groundY - 4, 1, 6);
    g.fill(GRASS);
    g.rect(px + 1, groundY - 3, 2, 5);
    g.fill(GRASS);
  }

  // Ground surface highlight edge
  g.rect(0, groundY, viewportW, 1);
  g.fill(GRASS_LIGHT);
}

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT OBJECTS — Trees, Barrels, Crates, Signs
// ═══════════════════════════════════════════════════════════════

export function drawTree(
  g: Graphics,
  x: number,
  groundY: number,
  cameraX: number,
  viewportW: number,
): void {
  const sx = Math.round(x - cameraX);
  if (sx < -20 || sx > viewportW + 20) return;

  const ty = groundY - 10;

  // Trunk
  g.rect(sx + 4, ty - 18, 4, 20);
  g.fill(WOOD_DARK);
  g.rect(sx + 5, ty - 18, 2, 18);
  g.fill(WOOD);

  // Canopy layers (bottom to top, wider to narrower)
  g.rect(sx, ty - 32, 12, 8);
  g.fill(GRASS_DARK);
  g.rect(sx + 2, ty - 34, 8, 4);
  g.fill(GRASS);

  g.rect(sx - 2, ty - 24, 16, 8);
  g.fill(GRASS_DARK);
  g.rect(sx, ty - 26, 12, 5);
  g.fill(GRASS);
  g.rect(sx + 2, ty - 28, 8, 3);
  g.fill(GRASS_LIGHT);

  // Trunk roots
  g.rect(sx + 2, ty + 1, 8, 2);
  g.fill(WOOD_DARK);
}

export function drawCrate(
  g: Graphics,
  x: number,
  y: number,
  cameraX: number,
  viewportW: number,
): void {
  const sx = Math.round(x - cameraX);
  if (sx < -20 || sx > viewportW + 20) return;

  const cy = Math.round(y);
  // Main body
  g.rect(sx, cy, 14, 14);
  g.fill(WOOD);
  g.rect(sx + 1, cy + 1, 12, 12);
  g.fill(WOOD_DARK);
  g.rect(sx + 2, cy + 2, 10, 10);
  g.fill(WOOD);

  // Cross planks
  g.rect(sx + 1, cy, 12, 2);
  g.fill(WOOD_DARK);
  g.rect(sx + 1, cy + 12, 12, 2);
  g.fill(WOOD_DARK);
  g.rect(sx, cy + 2, 2, 10);
  g.fill(WOOD_DARK);
  g.rect(sx + 12, cy + 2, 2, 10);
  g.fill(WOOD_DARK);

  // Nail rivets
  g.rect(sx + 3, cy + 3, 1, 1); g.fill(METAL_LIGHT);
  g.rect(sx + 10, cy + 3, 1, 1); g.fill(METAL_LIGHT);
  g.rect(sx + 3, cy + 10, 1, 1); g.fill(METAL_LIGHT);
  g.rect(sx + 10, cy + 10, 1, 1); g.fill(METAL_LIGHT);

  // Arrow marking
  g.rect(sx + 5, cy + 6, 4, 2); g.fill(0xddcc88);
  g.rect(sx + 6, cy + 5, 2, 4); g.fill(0xddcc88);
}

export function drawBarrel(
  g: Graphics,
  x: number,
  y: number,
  cameraX: number,
  viewportW: number,
): void {
  const sx = Math.round(x - cameraX);
  if (sx < -20 || sx > viewportW + 20) return;

  const by = Math.round(y);
  // Barrel body
  g.rect(sx + 2, by + 1, 10, 16);
  g.fill(WOOD_DARK);
  // Curved body (wider middle)
  g.rect(sx + 1, by + 3, 12, 12);
  g.fill(WOOD);

  // Metal bands
  g.rect(sx + 1, by + 2, 12, 2);
  g.fill(METAL_DARK);
  g.rect(sx + 1, by + 7, 12, 2);
  g.fill(METAL_DARK);
  g.rect(sx + 1, by + 14, 12, 2);
  g.fill(METAL_DARK);

  // Band rivets
  for (let ry of [by + 3, by + 8, by + 15]) {
    g.rect(sx + 3, ry, 1, 1); g.fill(METAL_LIGHT);
    g.rect(sx + 10, ry, 1, 1); g.fill(METAL_LIGHT);
  }

  // RUST accent
  g.rect(sx + 2, by + 6, 2, 2); g.fill(RUST);
  g.rect(sx + 10, by + 11, 2, 1); g.fill(RUST);
}

export function drawWarningSign(
  g: Graphics,
  x: number,
  y: number,
  cameraX: number,
  viewportW: number,
): void {
  const sx = Math.round(x - cameraX);
  if (sx < -20 || sx > viewportW + 20) return;

  const sy = Math.round(y);
  // Post
  g.rect(sx + 5, sy - 8, 2, 24);
  g.fill(METAL_DARK);

  // Sign board
  g.rect(sx, sy - 18, 12, 10);
  g.fill(METAL_DARK);
  g.rect(sx + 1, sy - 17, 10, 8);
  g.fill(0xddcc44);

  // Skull symbol
  g.rect(sx + 5, sy - 16, 2, 1); g.fill(BLACK);
  g.rect(sx + 4, sy - 15, 4, 1); g.fill(BLACK);
  g.rect(sx + 4, sy - 14, 1, 2); g.fill(BLACK);
  g.rect(sx + 7, sy - 14, 1, 2); g.fill(BLACK);
  g.rect(sx + 5, sy - 13, 2, 1); g.fill(BLACK);

  // Post base
  g.rect(sx + 3, sy + 16, 6, 2);
  g.fill(STONE_DARK);
}

// ═══════════════════════════════════════════════════════════════
// PLATFORMS — Stone brick with moss
// ═══════════════════════════════════════════════════════════════

export function drawPlatform(
  g: Graphics,
  platform: Platform,
  cameraX: number,
  viewportW: number,
): void {
  const sx = Math.round(platform.x - cameraX);
  if (sx + platform.width < 0 || sx > viewportW) return;
  const rx = Math.round(sx);
  const ry = Math.round(platform.y);
  const pw = platform.width;
  const ph = platform.height;

  // Stone body
  g.rect(rx, ry + 3, pw, ph - 3);
  g.fill(STONE_DARK);

  // Brick pattern
  const brickH = Math.max(4, Math.floor((ph - 3) / 2));
  for (let row = 0; row < 2; row++) {
    const by = ry + 3 + row * brickH;
    const offset = row % 2 === 0 ? 0 : 4;
    for (let bx = rx + offset; bx < rx + pw; bx += 8) {
      const bw = Math.min(7, rx + pw - bx);
      if (bw < 3) continue;
      g.rect(bx, by, bw, brickH - 1);
      g.fill(STONE);
      // Brick highlight
      g.rect(bx + 1, by + 1, bw - 2, 1);
      g.fill(STONE_LIGHT);
    }
    // Mortar line
    g.rect(rx, by + brickH - 1, pw, 1);
    g.fill(STONE_DARK);
  }

  // Moss top — 3px grass layer
  g.rect(rx, ry, pw, 3);
  g.fill(MOSS);
  g.rect(rx, ry, pw, 1);
  g.fill(GRASS);

  // Moss drips
  for (let px = rx + 2; px < rx + pw - 4; px += 8) {
    g.rect(px, ry + 2, 1, 2);
    g.fill(MOSS);
    g.rect(px + 3, ry + 2, 2, 1);
    g.fill(GRASS);
  }

  // Edge highlight
  g.rect(rx, ry + 3, 1, ph - 3);
  g.fill(STONE_LIGHT);
}

// ═══════════════════════════════════════════════════════════════
// EXPLOSION — Reusable burst effect
// ═══════════════════════════════════════════════════════════════

function drawExplosionCore(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  flash: boolean,
): void {
  if (flash) {
    // White flash core
    g.rect(cx - radius, cy - radius, radius * 2, radius * 2);
    g.fill(WHITE);
    return;
  }
  // Orange/yellow burst
  g.rect(cx - radius, cy - radius + 1, radius * 2, radius * 2 - 2);
  g.fill(0xff6600);
  g.rect(cx - radius + 1, cy - radius, radius * 2 - 2, radius * 2);
  g.fill(0xff8800);
  g.rect(cx - radius + 2, cy - radius + 2, radius - 2, radius - 2);
  g.fill(0xffaa00);
  g.rect(cx - 1, cy - 1, 3, 3);
  g.fill(0xffdd44);
}

// ═══════════════════════════════════════════════════════════════
// PLAYER CHARACTER — Detailed 16×24 pixel art
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// PLAYER CHARACTER — Detailed 16-Bit Pixel Art per Character Class
// ═══════════════════════════════════════════════════════════════

export function drawPlayer(
  g: Graphics,
  player: PlayerState,
  cameraX: number,
): void {
  if (player.isDead) {
    if (Math.floor(player.deathTimer * 10) % 2 === 0) {
      drawPlayerSprite(g, Math.round(player.x - cameraX), Math.round(player.y), player);
    }
    return;
  }

  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) return;

  const sx = Math.round(player.x - cameraX);
  const sy = Math.round(player.y);

  drawPlayerSprite(g, sx, sy, player);

  // Muzzle flash
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

function drawPlayerSprite(
  g: Graphics,
  x: number,
  y: number,
  player: PlayerState,
): void {
  const colorStr = player.color;
  const facingRight = player.facingRight;
  const animFrame = player.animFrame;
  const shooting = player.isShooting;
  const aim = player.aimDirection || 'straight';
  const isCrouch = player.isCrouching && player.isOnGround;
  const charId = player.characterId || 'commando';

  const hex = parseColor(colorStr);
  const dark = shiftBrightness(hex, -25);
  const darker = shiftBrightness(hex, -40);

  const rx = (lx: number) => facingRight ? x + lx : x + 15 - lx;
  const bodyY = isCrouch ? y + 6 : y;

  // ── BOOTS & LEGS ──
  if (isCrouch) {
    // Crouching legs (knee bent forward)
    g.rect(rx(0), bodyY + 14, 6, 4); g.fill(darker);
    g.rect(rx(8), bodyY + 14, 6, 4); g.fill(darker);
    g.rect(rx(2), bodyY + 10, 4, 5); g.fill(dark);
    g.rect(rx(8), bodyY + 10, 4, 5); g.fill(dark);
  } else {
    // Standing / Walking legs
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

  // Class-specific torso detailing
  if (charId === 'commando') {
    // Double bandolier strap across chest
    g.rect(rx(3), bodyY + 6, 2, 6); g.fill(0x884422);
    g.rect(rx(7), bodyY + 6, 2, 6); g.fill(0x884422);
    g.rect(rx(3), bodyY + 7, 2, 1); g.fill(0xffff88);
    g.rect(rx(7), bodyY + 9, 2, 1); g.fill(0xffff88);
  } else if (charId === 'scout') {
    // Lightweight tech harness + glowing cyan core
    g.rect(rx(4), bodyY + 6, 4, 5); g.fill(darker);
    g.rect(rx(5), bodyY + 7, 2, 2); g.fill(0x08d9d6);
    // Trailing scarf bit
    const scarfOffset = (animFrame * 2) - 1;
    g.rect(rx(facingRight ? -3 : 13), bodyY + 5 + scarfOffset, 4, 3); g.fill(0x08d9d6);
  } else if (charId === 'heavy') {
    // Reinforced juggernaut chest plate + massive pauldrons
    g.rect(rx(1), bodyY + 4, 11, 4); g.fill(darker);
    g.rect(rx(2), bodyY + 5, 9, 3); g.fill(0x2af598);
    g.rect(rx(0), bodyY + 4, 3, 5); g.fill(darker);
    g.rect(rx(10), bodyY + 4, 3, 5); g.fill(darker);
  } else if (charId === 'demolition') {
    // Blast armor + explosive pouch bandolier
    g.rect(rx(3), bodyY + 6, 6, 6); g.fill(0x554422);
    g.rect(rx(4), bodyY + 7, 2, 2); g.fill(0xffde7d);
    g.rect(rx(7), bodyY + 9, 2, 2); g.fill(0xffde7d);
  } else if (charId === 'infiltrator') {
    // Stealth suit circuit lines
    g.rect(rx(3), bodyY + 5, 6, 7); g.fill(darker);
    g.rect(rx(5), bodyY + 6, 2, 5); g.fill(0x7160e8);
    g.rect(rx(4), bodyY + 8, 4, 1); g.fill(0x7160e8);
  } else if (charId === 'vanguard') {
    // Riot chest plate with orange trim
    g.rect(rx(2), bodyY + 5, 8, 7); g.fill(0x444444);
    g.rect(rx(3), bodyY + 6, 6, 2); g.fill(0xff9f43);
    g.rect(rx(4), bodyY + 9, 4, 2); g.fill(0xff9f43);
  }

  // ── HEAD & HELMET / ACCESSORIES ──
  g.rect(rx(3), bodyY, 6, 5); g.fill(hex);
  g.rect(rx(4), bodyY + 1, 4, 3); g.fill(FLESH);

  if (charId === 'commando') {
    // Red bandana with trailing knot tail
    g.rect(rx(2), bodyY - 1, 8, 3); g.fill(0xff2e63);
    g.rect(rx(facingRight ? 0 : 13), bodyY, 3, 2); g.fill(0xff2e63);
  } else if (charId === 'scout') {
    // Recon goggles / scouter visor
    g.rect(rx(2), bodyY - 1, 8, 3); g.fill(darker);
    const visorX = facingRight ? rx(7) : rx(3);
    g.rect(visorX, bodyY + 1, 3, 2); g.fill(0x08d9d6);
  } else if (charId === 'heavy') {
    // Heavy tactical helmet + visor shield
    g.rect(rx(2), bodyY - 2, 8, 4); g.fill(darker);
    g.rect(rx(3), bodyY - 3, 6, 2); g.fill(0x2af598);
    const visorX = facingRight ? rx(7) : rx(3);
    g.rect(visorX, bodyY + 1, 3, 2); g.fill(0xffff44);
  } else if (charId === 'demolition') {
    // Gold blast helmet with protective visor
    g.rect(rx(2), bodyY - 2, 8, 4); g.fill(0xffde7d);
    g.rect(rx(3), bodyY - 3, 6, 2); g.fill(darker);
    const visorX = facingRight ? rx(6) : rx(3);
    g.rect(visorX, bodyY + 1, 4, 2); g.fill(0x332211);
  } else if (charId === 'infiltrator') {
    // Full tech cowl + glowing purple eye slit
    g.rect(rx(2), bodyY - 2, 8, 5); g.fill(darker);
    const visorX = facingRight ? rx(7) : rx(3);
    g.rect(visorX, bodyY + 1, 3, 1); g.fill(0xbb99ff);
  } else if (charId === 'vanguard') {
    // Tactical helmet with orange crest
    g.rect(rx(2), bodyY - 2, 8, 4); g.fill(darker);
    g.rect(rx(4), bodyY - 3, 4, 2); g.fill(0xff9f43);
    const visorX = facingRight ? rx(7) : rx(3);
    g.rect(visorX, bodyY + 1, 3, 2); g.fill(0xffffff);
  }

  // ── WEAPON & ARMS RENDERING (8-Way Aiming) ──
  drawPlayerWeaponAndArms(g, rx, bodyY, facingRight, shooting, aim, charId, hex);
}

function drawPlayerWeaponAndArms(
  g: Graphics,
  rx: (lx: number) => number,
  bodyY: number,
  facingRight: boolean,
  _shooting: boolean,
  aim: string,
  charId: string,
  hex: number,
): void {
  // Base arm coordinates
  const shoulderX = rx(facingRight ? 8 : 2);
  const shoulderY = bodyY + 6;

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
    // Arm extended up
    g.rect(shoulderX, bodyY + 1, 2, 6); g.fill(hex);
    // Weapon tube straight up
    g.rect(gunX, gunY, gunW, gunH); g.fill(gunColor);
    g.rect(gunX + 1, gunY - 2, 1, 3); g.fill(0x888888);
  } else if (aim === 'diagonal_up') {
    gunX = rx(facingRight ? 10 : -4);
    gunY = bodyY - 2;
    gunW = 7;
    gunH = 6;
    g.rect(shoulderX, bodyY + 3, 3, 4); g.fill(hex);
    // Diagonal gun shape
    g.rect(gunX, gunY + 2, 5, 3); g.fill(gunColor);
    g.rect(gunX + (facingRight ? 3 : 0), gunY, 4, 3); g.fill(0x777777);
  } else if (aim === 'diagonal_down') {
    gunX = rx(facingRight ? 10 : -4);
    gunY = bodyY + 8;
    gunW = 7;
    gunH = 6;
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
    // Straight horizontal
    g.rect(rx(facingRight ? 7 : 1), bodyY + 6, 4, 2); g.fill(hex);
    g.rect(gunX + (facingRight ? 0 : -2), gunY, 8, 3); g.fill(gunColor);
    g.rect(gunX + (facingRight ? 4 : -4), gunY + 1, 4, 1); g.fill(0x888888);
  }
}


// ═══════════════════════════════════════════════════════════════
// ENEMIES
// ═══════════════════════════════════════════════════════════════

export function drawSoldier(
  g: Graphics,
  enemy: EnemyState,
  cameraX: number,
): void {
  if (enemy.isDead) {
    if (Math.floor(enemy.deathTimer * 10) % 2 === 0) return;
    const sx = Math.round(enemy.x - cameraX);
    g.rect(sx + 2, Math.round(enemy.y) + 14, 10, 10);
    g.fill(0x442222);
    g.rect(sx + 3, Math.round(enemy.y) + 16, 8, 6);
    g.fill(0x661111);
    return;
  }

  const sx = Math.round(enemy.x - cameraX);
  const sy = Math.round(enemy.y);
  const bodyColor = 0x993333;
  const darkColor = 0x661111;
  const armorColor = 0x444444;

  // Boots
  g.rect(sx + 1, sy + 21, 4, 3); g.fill(darkColor);
  g.rect(sx + 7, sy + 21, 4, 3); g.fill(darkColor);

  // Legs
  g.rect(sx + 2, sy + 14, 3, 8); g.fill(bodyColor);
  g.rect(sx + 7, sy + 14, 3, 8); g.fill(bodyColor);
  g.rect(sx + 2, sy + 17, 3, 2); g.fill(darkColor);
  g.rect(sx + 7, sy + 17, 3, 2); g.fill(darkColor);

  // Belt
  g.rect(sx + 1, sy + 13, 10, 2); g.fill(armorColor);

  // Torso
  g.rect(sx + 1, sy + 5, 10, 9); g.fill(bodyColor);
  // Armor plate
  g.rect(sx + 2, sy + 6, 8, 6); g.fill(armorColor);
  g.rect(sx + 3, sy + 7, 6, 4); g.fill(0x555555);
  // Red insignia
  g.rect(sx + 5, sy + 8, 2, 3); g.fill(0xcc3333);

  // Shoulder pads
  g.rect(sx, sy + 4, 3, 4); g.fill(armorColor);
  g.rect(sx + 9, sy + 4, 3, 4); g.fill(armorColor);

  // Arms
  g.rect(sx, sy + 7, 2, 5); g.fill(bodyColor);
  g.rect(sx + 10, sy + 7, 2, 4); g.fill(bodyColor);

  // Weapon
  g.rect(sx + 10, sy + 7, 5, 2); g.fill(0x555555);

  // Head
  g.rect(sx + 2, sy, 8, 6); g.fill(bodyColor);
  // Helmet
  g.rect(sx + 1, sy - 1, 10, 4); g.fill(darkColor);
  g.rect(sx + 2, sy - 2, 8, 2); g.fill(armorColor);
  // Glowing red eyes
  g.rect(sx + 9, sy + 1, 2, 1); g.fill(0xff2222);
  g.rect(sx + 9, sy + 3, 1, 1); g.fill(0xff4444);
}

export function drawTurret(
  g: Graphics,
  enemy: EnemyState,
  cameraX: number,
): void {
  if (enemy.isDead) {
    const sx = Math.round(enemy.x - cameraX);
    g.rect(sx + 2, Math.round(enemy.y) + 6, 8, 6);
    g.fill(0x442222);
    g.rect(sx + 3, Math.round(enemy.y) + 8, 6, 3);
    g.fill(0x661111);
    return;
  }

  const sx = Math.round(enemy.x - cameraX);
  const sy = Math.round(enemy.y);

  // Tripod base
  g.rect(sx + 1, sy + 12, 2, 4); g.fill(METAL_DARK);
  g.rect(sx + 9, sy + 12, 2, 4); g.fill(METAL_DARK);
  g.rect(sx + 5, sy + 14, 2, 3); g.fill(METAL_DARK);

  // Base plate
  g.rect(sx, sy + 6, 12, 7); g.fill(METAL_DARK);
  g.rect(sx + 1, sy + 7, 10, 5); g.fill(METAL);
  g.rect(sx + 2, sy + 8, 8, 3); g.fill(METAL_LIGHT);

  // Ammo box
  g.rect(sx + 1, sy + 4, 4, 3); g.fill(0x664422);
  g.rect(sx + 1, sy + 3, 4, 2); g.fill(0x775533);

  // Barrel
  g.rect(sx + 10, sy + 7, 10, 3); g.fill(METAL_DARK);
  g.rect(sx + 10, sy + 8, 10, 1); g.fill(METAL_LIGHT);
  // Barrel tip
  g.rect(sx + 19, sy + 7, 2, 3); g.fill(METAL);

  // Red sensor eye
  g.rect(sx + 6, sy + 9, 2, 2); g.fill(0xff2222);
  g.rect(sx + 7, sy + 9, 1, 1); g.fill(0xff6666);
}

export function drawBoss(
  g: Graphics,
  enemy: EnemyState,
  cameraX: number,
): void {
  if (enemy.isDead) {
    if (Math.floor(enemy.deathTimer * 10) % 2 === 0) return;
    const sx = Math.round(enemy.x - cameraX);
    g.rect(sx + 4, Math.round(enemy.y) + 20, 18, 16);
    g.fill(0x441111);
    return;
  }

  const sx = Math.round(enemy.x - cameraX);
  const sy = Math.round(enemy.y);
  const bodyColor = 0x992222;
  const darkColor = 0x661111;
  const armorColor = 0x3a3a4a;
  const goldColor = 0xcc9933;

  // ── BOOTS ──
  g.rect(sx + 3, sy + 34, 6, 3); g.fill(darkColor);
  g.rect(sx + 15, sy + 34, 6, 3); g.fill(darkColor);
  // Boot treads
  g.rect(sx + 4, sy + 36, 4, 1); g.fill(0x440000);
  g.rect(sx + 16, sy + 36, 4, 1); g.fill(0x440000);

  // ── LEGS ──
  g.rect(sx + 3, sy + 24, 5, 11); g.fill(bodyColor);
  g.rect(sx + 16, sy + 24, 5, 11); g.fill(bodyColor);
  // Knee guards
  g.rect(sx + 3, sy + 29, 5, 3); g.fill(armorColor);
  g.rect(sx + 16, sy + 29, 5, 3); g.fill(armorColor);

  // ── BELT ──
  g.rect(sx + 2, sy + 22, 20, 3); g.fill(0x555555);
  g.rect(sx + 9, sy + 22, 6, 3); g.fill(goldColor);

  // ── TORSO ──
  g.rect(sx + 2, sy + 7, 20, 16); g.fill(bodyColor);
  // Heavy chest armor
  g.rect(sx + 3, sy + 8, 18, 13); g.fill(armorColor);
  g.rect(sx + 5, sy + 9, 14, 4); g.fill(0x4a4a5a);
  g.rect(sx + 5, sy + 14, 14, 5); g.fill(0x4a4a5a);
  // Golden trim
  g.rect(sx + 5, sy + 9, 14, 1); g.fill(goldColor);
  g.rect(sx + 5, sy + 13, 14, 1); g.fill(goldColor);
  g.rect(sx + 5, sy + 18, 14, 1); g.fill(goldColor);

  // ── MASSIVE SHOULDER PADS ──
  g.rect(sx, sy + 4, 7, 10); g.fill(armorColor);
  g.rect(sx + 1, sy + 5, 5, 8); g.fill(0x4a4a5a);
  g.rect(sx, sy + 4, 7, 1); g.fill(goldColor);

  g.rect(sx + 17, sy + 4, 7, 10); g.fill(armorColor);
  g.rect(sx + 18, sy + 5, 5, 8); g.fill(0x4a4a5a);
  g.rect(sx + 17, sy + 4, 7, 1); g.fill(goldColor);

  // ── ARMS ──
  g.rect(sx + 1, sy + 13, 3, 6); g.fill(bodyColor);
  g.rect(sx + 20, sy + 11, 3, 6); g.fill(bodyColor);
  // Arm guards
  g.rect(sx, sy + 14, 3, 3); g.fill(armorColor);
  g.rect(sx + 21, sy + 12, 3, 3); g.fill(armorColor);

  // ── HEAVY CANNON (right arm) ──
  g.rect(sx + 20, sy + 9, 12, 5); g.fill(0x444444);
  g.rect(sx + 21, sy + 10, 10, 3); g.fill(0x555555);
  g.rect(sx + 28, sy + 9, 3, 5); g.fill(0x666666);
  g.rect(sx + 25, sy + 10, 1, 3); g.fill(goldColor);

  // ── HEAD ──
  g.rect(sx + 5, sy - 1, 14, 9); g.fill(bodyColor);
  // Menacing helmet
  g.rect(sx + 3, sy - 2, 18, 6); g.fill(darkColor);
  g.rect(sx + 4, sy - 3, 16, 4); g.fill(armorColor);
  // Helmet crest
  g.rect(sx + 8, sy - 5, 8, 3); g.fill(armorColor);
  g.rect(sx + 10, sy - 4, 4, 1); g.fill(goldColor);
  // Glowing red visor slit
  g.rect(sx + 16, sy + 1, 5, 2); g.fill(0xff2222);
  g.rect(sx + 17, sy + 2, 3, 1); g.fill(0xff6644);
  // Jaw guard
  g.rect(sx + 6, sy + 6, 12, 2); g.fill(armorColor);
}

// ═══════════════════════════════════════════════════════════════
// PROJECTILES
// ═══════════════════════════════════════════════════════════════

export function drawPlayerBullet(g: Graphics, proj: Projectile, cameraX: number): void {
  const sx = Math.round(proj.x - cameraX);
  const sy = Math.round(proj.y);
  const wtype = proj.weaponType || 'burst_rifle';

  if (wtype === 'dual_smg') {
    // Small fast cyan spark
    g.rect(sx, sy, proj.width, proj.height); g.fill(0x08d9d6);
    g.rect(sx + 1, sy, 2, 1); g.fill(0xffffff);
  } else if (wtype === 'heavy_cannon') {
    // Heavy cannon slug
    g.rect(sx - 2, sy - 1, proj.width + 2, proj.height + 2); g.fill(0xff6600);
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xffde7d);
    g.rect(sx + 2, sy + 1, 3, 2); g.fill(0xffffff);
  } else if (wtype === 'grenade_launcher') {
    // Arcing round explosive grenade shell
    g.rect(sx, sy, 5, 5); g.fill(0xff4422);
    g.rect(sx + 1, sy + 1, 3, 3); g.fill(0xffde7d);
    g.rect(sx + 2, sy - 1, 1, 1); g.fill(0xffff88);
  } else if (wtype === 'plasma_beam') {
    // Glowing neon plasma beam segment
    g.rect(sx - 3, sy - 1, proj.width + 6, proj.height + 2); g.fill(0x7160e8);
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xdd88ff);
    g.rect(sx + 2, sy + 1, proj.width - 2, 1); g.fill(0xffffff);
  } else if (wtype === 'spread_shotgun') {
    // Shotgun pellet diamond
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xff9f43);
    g.rect(sx + 1, sy, 1, 1); g.fill(0xffffff);
  } else {
    // Standard assault rifle tracer
    g.rect(sx - 3, sy, 3, 2); g.fill(0xffaa22);
    g.rect(sx, sy, proj.width, proj.height); g.fill(0xffee44);
    g.rect(sx + 2, sy, 2, 2); g.fill(0xffffff);
  }
}

export function drawEnemyBullet(g: Graphics, proj: Projectile, cameraX: number): void {
  const sx = Math.round(proj.x - cameraX);
  const sy = Math.round(proj.y);
  // Outer glow
  g.rect(sx - 1, sy, 6, 4); g.fill(0x661111);
  // Red diamond shape
  g.rect(sx, sy + 1, 1, 2); g.fill(0xdd2222);
  g.rect(sx + 1, sy, 2, 4); g.fill(0xff4444);
  g.rect(sx + 3, sy + 1, 1, 2); g.fill(0xdd2222);
  // Hot core
  g.rect(sx + 1, sy + 1, 2, 2); g.fill(0xffaa88);
}

export function drawBossBullet(g: Graphics, proj: Projectile, cameraX: number): void {
  const sx = Math.round(proj.x - cameraX);
  const sy = Math.round(proj.y);
  // Outer flame
  g.rect(sx - 1, sy, 8, 6); g.fill(0x661100);
  g.rect(sx, sy + 1, 6, 4); g.fill(0xff4400);
  // Energy ball
  g.rect(sx + 1, sy + 1, 4, 4); g.fill(0xff6600);
  g.rect(sx + 2, sy + 2, 2, 2); g.fill(0xffaa33);
  // Core
  g.rect(sx + 2, sy + 2, 1, 2); g.fill(0xffdd88);
}

// ═══════════════════════════════════════════════════════════════
// POWER-UP CAPSULES
// ═══════════════════════════════════════════════════════════════

export function drawPowerUp(g: Graphics, powerUp: { x: number; y: number; type: string }, cameraX: number): void {
  const sx = Math.round(powerUp.x - cameraX);
  const sy = Math.round(powerUp.y);

  // Outer red/gold capsule container
  g.rect(sx, sy, 12, 12); g.fill(0x1f1e2e);
  g.rect(sx + 1, sy + 1, 10, 10); g.fill(0xffde7d);
  g.rect(sx + 2, sy + 2, 8, 8); g.fill(0x0f0e17);

  // Icon symbol based on type
  if (powerUp.type === 'spread') {
    g.rect(sx + 4, sy + 5, 4, 2); g.fill(0xff2e63); // S
    g.rect(sx + 4, sy + 3, 2, 2); g.fill(0xff2e63);
    g.rect(sx + 6, sy + 7, 2, 2); g.fill(0xff2e63);
  } else if (powerUp.type === 'laser') {
    g.rect(sx + 4, sy + 3, 4, 6); g.fill(0x7160e8); // L
    g.rect(sx + 6, sy + 7, 2, 2); g.fill(0x7160e8);
  } else if (powerUp.type === 'machinegun') {
    g.rect(sx + 4, sy + 3, 2, 6); g.fill(0x08d9d6); // M
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

export function drawParticle(g: Graphics, p: Particle, cameraX: number): void {
  const sx = Math.round(p.x - cameraX);
  const sy = Math.round(p.y);
  const alpha = Math.max(0, p.life / p.maxLife);
  const faded = fadeColor(p.color, alpha);

  if (p.type === 'shell') {
    // Brass ejection casing (golden 2x1 rect)
    g.rect(sx, sy, 3, 1); g.fill(0xffdd44);
    g.rect(sx + 1, sy, 1, 1); g.fill(0xffffff);
  } else if (p.type === 'dust') {
    // Jump/landing dust puff
    g.rect(sx, sy, 3, 2); g.fill(fadeColor(0xa7a9be, alpha * 0.6));
  } else if (p.type === 'smoke') {
    g.rect(sx - 1, sy - 1, 3, 3); g.fill(fadeColor(0x555566, alpha * 0.5));
  } else {
    g.rect(sx, sy, 2, 2); g.fill(faded);
  }
}

export function drawExplosion(
  g: Graphics,
  x: number,
  y: number,
  cameraX: number,
  timer: number,
  maxTime: number,
): void {
  const sx = Math.round(x - cameraX);
  const sy = Math.round(y);
  const progress = 1 - timer / maxTime;
  const radius = 4 + progress * 12;

  if (progress < 0.3) {
    drawExplosionCore(g, sx, sy, Math.round(radius), true);
  } else {
    drawExplosionCore(g, sx, sy, Math.round(radius), false);
    // Smoke ring
    if (progress > 0.5) {
      const smokeR = Math.round(radius + 4);
      const smokeAlpha = (progress - 0.5) * 2;
      const smokeColor = fadeColor(0x444444, smokeAlpha);
      g.rect(sx - smokeR, sy - smokeR + 1, smokeR * 2, smokeR * 2 - 2);
      g.fill(smokeColor);
      g.rect(sx - smokeR + 1, sy - smokeR, smokeR * 2 - 2, smokeR * 2);
      g.fill(smokeColor);
    }
  }
}

export function drawHitSpark(
  g: Graphics,
  x: number,
  y: number,
  cameraX: number,
): void {
  const sx = Math.round(x - cameraX);
  const sy = Math.round(y);
  // Cross spark
  g.rect(sx - 2, sy, 5, 1); g.fill(0xffffff);
  g.rect(sx, sy - 2, 1, 5); g.fill(0xffffff);
  g.rect(sx - 1, sy - 1, 3, 3); g.fill(0xffdd44);
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
  if (intensity <= 0) return;
  g.clear();
  // Simple corner darkening
  const alpha = Math.min(0.6, intensity);
  const color = fadeColor(0x000000, alpha);

  // Top
  g.rect(0, 0, viewportW, 6); g.fill(color);
  // Bottom
  g.rect(0, viewportH - 6, viewportW, 6); g.fill(color);
  // Left
  g.rect(0, 0, 4, viewportH); g.fill(color);
  // Right
  g.rect(viewportW - 4, 0, 4, viewportH); g.fill(color);
}

export function drawScreenFlash(
  g: Graphics,
  viewportW: number,
  viewportH: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  g.clear();
  g.rect(0, 0, viewportW, viewportH);
  g.fill(fadeColor(0xffffff, Math.min(1, alpha)));
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

function fadeColor(hex: number, alpha: number): number {
  const r = Math.round(((hex >> 16) & 0xff) * alpha);
  const g = Math.round(((hex >> 8) & 0xff) * alpha);
  const b = Math.round((hex & 0xff) * alpha);
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
