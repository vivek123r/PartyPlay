import { Graphics } from 'pixi.js';
import type { PlayerState, EnemyState, Projectile, Particle, Platform } from './types';

// ── Background ────────────────────────────────────────────────

export function drawSky(g: Graphics, viewportW: number, viewportH: number, skyColor: number): void {
  g.clear();
  g.rect(0, 0, viewportW, viewportH);
  g.fill(skyColor);
}

export function drawMountains(
  g: Graphics,
  cameraX: number,
  viewportW: number,
  viewportH: number,
  color: number
): void {
  g.clear();
  const parallax = cameraX * 0.3;
  const mountainBaseY = viewportH - 30;

  const peaks = [
    { x: 0, h: 60 },
    { x: 120, h: 80 },
    { x: 250, h: 55 },
    { x: 380, h: 70 },
    { x: 500, h: 50 },
    { x: 630, h: 75 },
    { x: 760, h: 45 },
    { x: 880, h: 65 },
    { x: 1000, h: 55 },
    { x: 1140, h: 70 },
    { x: 1280, h: 40 },
    { x: 1400, h: 60 },
    { x: 1540, h: 75 },
    { x: 1680, h: 50 },
    { x: 1800, h: 65 },
    { x: 1940, h: 55 },
    { x: 2100, h: 70 },
    { x: 2250, h: 45 },
  ];

  for (const peak of peaks) {
    const sx = peak.x - parallax;
    if (sx + 80 < -40 || sx > viewportW + 40) continue;
    const halfWidth = 60;
    g.poly([
      sx - halfWidth, mountainBaseY,
      sx, mountainBaseY - peak.h,
      sx + halfWidth, mountainBaseY,
    ]);
    g.fill(color);

    // Darker shade for depth
    g.poly([
      sx, mountainBaseY - peak.h,
      sx + halfWidth * 0.6, mountainBaseY,
      sx + halfWidth, mountainBaseY,
    ]);
    g.fill(hslShift(color, 0, 0, -15));

    // Snowcap for taller peaks
    if (peak.h >= 65) {
      const capH = 14;
      g.poly([
        sx - 12, mountainBaseY - peak.h + capH,
        sx, mountainBaseY - peak.h,
        sx + 12, mountainBaseY - peak.h + capH,
      ]);
      g.fill(0xffffff);
    }
  }
}

export function drawGround(
  g: Graphics,
  cameraX: number,
  groundY: number,
  viewportW: number,
  viewportH: number,
  groundColor: number
): void {
  g.clear();
  g.rect(0, groundY, viewportW, viewportH - groundY);
  g.fill(groundColor);

  // Dirt texture pixels
  const darkDirt = hslShift(groundColor, 0, 0, -12);
  const lightDirt = hslShift(groundColor, 0, 0, 8);
  const pxStart = Math.floor(cameraX);
  for (let px = Math.floor(pxStart % 4); px < viewportW; px += 4) {
    g.rect(px, groundY + 2, 2, 2);
    g.fill(darkDirt);
    g.rect(px + 2, groundY + 6, 2, 2);
    g.fill(lightDirt);
    g.rect(px + 1, groundY + 10, 2, 2);
    g.fill(darkDirt);
  }

  // Grass top line
  g.rect(0, groundY, viewportW, 3);
  g.fill(0x3a7d44);
  g.rect(0, groundY + 3, viewportW, 2);
  g.fill(0x2d6a36);

  // Grass blades
  for (let px = Math.floor(pxStart % 6); px < viewportW; px += 6) {
    g.rect(px, groundY - 2, 2, 4);
    g.fill(0x4a9d54);
    g.rect(px + 2, groundY - 3, 2, 5);
    g.fill(0x3a8d44);
  }
}

export function drawPlatform(
  g: Graphics,
  platform: Platform,
  cameraX: number,
  viewportW: number
): void {
  const sx = platform.x - cameraX;
  if (sx + platform.width < 0 || sx > viewportW) return;
  const roundX = Math.round(sx);
  const roundY = Math.round(platform.y);

  // Brown base
  g.rect(roundX, roundY + 3, platform.width, platform.height - 3);
  g.fill(0x6b4c3b);

  // Darker pixel texture
  const darkBrown = 0x5a3d2e;
  for (let px = roundX + 2; px < roundX + platform.width - 2; px += 6) {
    g.rect(px, roundY + 5, 3, 3);
    g.fill(darkBrown);
  }

  // Grass top
  g.rect(roundX, roundY, platform.width, 3);
  g.fill(0x3a7d44);

  // Grass edge highlight
  for (let px = roundX; px < roundX + platform.width; px += 4) {
    g.rect(px, roundY, 2, 2);
    g.fill(0x4a9d54);
  }
}

// ── Player ────────────────────────────────────────────────────

export function drawPlayer(g: Graphics, player: PlayerState, cameraX: number): void {
  if (player.isDead) {
    if (Math.floor(player.deathTimer * 10) % 2 === 0) {
      drawPlayerBody(g, Math.round(player.x - cameraX), Math.round(player.y), player.color, player.facingRight, 0, false);
    }
    return;
  }

  // Invincibility flicker
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) return;

  const sx = Math.round(player.x - cameraX);
  const sy = Math.round(player.y);
  const shootPose = player.isShooting;
  const animFrame = player.animFrame;

  drawPlayerBody(g, sx, sy, player.color, player.facingRight, animFrame, shootPose);

  // Weapon muzzle flash
  if (shootPose && player.shootCooldown > 0.2) {
    const flashX = player.facingRight ? sx + 14 : sx - 6;
    g.rect(flashX, sy + 5, 4, 3);
    g.fill(0xffdd44);
  }
}

function drawPlayerBody(
  g: Graphics,
  x: number,
  y: number,
  color: string,
  facingRight: boolean,
  animFrame: number,
  shooting: boolean
): void {
  const hex = parseColor(color);
  const darkHex = hslShift(hex, 0, 0, -15);

  // Legs
  const legLeftX = facingRight ? x + 2 : x + 8;
  const legRightX = facingRight ? x + 7 : x + 3;
  const legTop = y + 14;
  if (animFrame === 0) {
    g.rect(legLeftX, legTop, 3, 6); g.fill(hex);
    g.rect(legRightX, legTop, 3, 8); g.fill(hex);
    // Boots
    g.rect(facingRight ? x + 2 : x + 8, y + 20, 3, 4); g.fill(darkHex);
    g.rect(facingRight ? x + 7 : x + 3, y + 22, 3, 4); g.fill(darkHex);
  } else {
    g.rect(legLeftX, legTop, 3, 8); g.fill(hex);
    g.rect(legRightX, legTop, 3, 6); g.fill(hex);
    g.rect(facingRight ? x + 2 : x + 8, y + 22, 3, 4); g.fill(darkHex);
    g.rect(facingRight ? x + 7 : x + 3, y + 20, 3, 4); g.fill(darkHex);
  }

  // Belt
  g.rect(facingRight ? x + 1 : x + 7, y + 13, 5, 2); g.fill(darkHex);

  // Torso
  g.rect(facingRight ? x + 1 : x + 7, y + 5, 5, 9); g.fill(hex);
  // Vest detail
  g.rect(facingRight ? x + 2 : x + 8, y + 7, 3, 4); g.fill(darkHex);

  // Arms
  if (shooting) {
    // Arm extended forward
    const armX = facingRight ? x + 7 : x - 4;
    g.rect(armX, y + 6, 6, 2); g.fill(hex);
    if (facingRight) {
      g.rect(x + 1, y + 6, 3, 5); g.fill(darkHex);
    } else {
      g.rect(x + 9, y + 6, 3, 5); g.fill(darkHex);
    }
  } else {
    g.rect(facingRight ? x : x + 10, y + 6, 3, 5); g.fill(hex);
    g.rect(facingRight ? x + 10 : x, y + 6, 3, 5); g.fill(hex);
  }

  // Weapon
  const weaponX = facingRight ? x + 7 : x - 3;
  const weaponY = y + 7;
  if (shooting) {
    g.rect(weaponX + (facingRight ? 4 : -2), weaponY - 1, 4, 3); g.fill(0x555555);
    g.rect(weaponX + (facingRight ? 1 : -1), weaponY, 3, 2); g.fill(0x777777);
  } else {
    g.rect(weaponX + (facingRight ? 1 : -1), weaponY + 1, 3, 2); g.fill(0x555555);
  }

  // Head
  const headX = facingRight ? x + 1 : x + 7;
  g.rect(headX, y, 5, 6); g.fill(hex);

  // Helmet
  g.rect(headX - 1, y - 1, 7, 4); g.fill(darkHex);
  // Visor
  const visorX = facingRight ? headX + 3 : headX - 1;
  g.rect(visorX, y + 1, 2, 2); g.fill(0x88ccff);
}

// ── Enemies ───────────────────────────────────────────────────

export function drawSoldier(g: Graphics, enemy: EnemyState, cameraX: number): void {
  if (enemy.isDead) {
    if (Math.floor(enemy.deathTimer * 10) % 2 === 0) return;
    const sx = Math.round(enemy.x - cameraX);
    g.rect(sx + 2, Math.round(enemy.y) + 14, 10, 10);
    g.fill(0x662222);
    return;
  }

  const sx = Math.round(enemy.x - cameraX);
  const sy = Math.round(enemy.y);
  const bodyColor = enemy.type === 'boss' ? 0x992222 : 0x883333;
  const darkColor = 0x551111;

  // Legs
  g.rect(sx + 2, sy + 14, 3, 7); g.fill(bodyColor);
  g.rect(sx + 7, sy + 14, 3, 7); g.fill(bodyColor);
  g.rect(sx + 2, sy + 21, 3, 3); g.fill(darkColor);
  g.rect(sx + 7, sy + 21, 3, 3); g.fill(darkColor);

  // Belt
  g.rect(sx + 1, sy + 13, 10, 2); g.fill(0x444444);

  // Torso
  g.rect(sx + 1, sy + 5, 10, 9); g.fill(bodyColor);
  g.rect(sx + 3, sy + 7, 6, 4); g.fill(darkColor);

  // Arms
  g.rect(sx, sy + 6, 3, 5); g.fill(bodyColor);
  g.rect(sx + 9, sy + 6, 3, 5); g.fill(bodyColor);

  // Weapon
  g.rect(sx + 9, sy + 8, 4, 2); g.fill(0x555555);

  // Head
  g.rect(sx + 2, sy, 7, 6); g.fill(bodyColor);
  // Helmet
  g.rect(sx + 1, sy - 1, 9, 4); g.fill(darkColor);
  // Eyes (red glow)
  g.rect(sx + 8, sy + 2, 2, 1); g.fill(0xdd2222);
}

export function drawTurret(g: Graphics, enemy: EnemyState, cameraX: number): void {
  if (enemy.isDead) {
    const sx = Math.round(enemy.x - cameraX);
    g.rect(sx + 2, Math.round(enemy.y) + 6, 8, 6);
    g.fill(0x662222);
    return;
  }

  const sx = Math.round(enemy.x - cameraX);
  const sy = Math.round(enemy.y);

  // Base
  g.rect(sx, sy + 6, 12, 10);
  g.fill(0x664444);
  g.rect(sx + 2, sy + 8, 8, 6);
  g.fill(0x553333);

  // Barrel
  const barrelLen = 8;
  g.rect(sx + 9, sy + 8, barrelLen, 3);
  g.fill(0x444444);
  g.rect(sx + 9, sy + 9, barrelLen, 1);
  g.fill(0x555555);

  // Base mount
  g.rect(sx + 2, sy + 16, 8, 2);
  g.fill(0x332222);
}

export function drawBoss(g: Graphics, enemy: EnemyState, cameraX: number): void {
  if (enemy.isDead) {
    if (Math.floor(enemy.deathTimer * 10) % 2 === 0) return;
    const sx = Math.round(enemy.x - cameraX);
    g.rect(sx + 3, Math.round(enemy.y) + 20, 18, 16);
    g.fill(0x662222);
    return;
  }

  const sx = Math.round(enemy.x - cameraX);
  const sy = Math.round(enemy.y);
  const bodyColor = 0x992222;
  const darkColor = 0x661111;
  const armorColor = 0x444455;

  // Legs (thick, armored)
  g.rect(sx + 3, sy + 24, 5, 10); g.fill(bodyColor);
  g.rect(sx + 16, sy + 24, 5, 10); g.fill(bodyColor);
  g.rect(sx + 3, sy + 34, 5, 3); g.fill(darkColor);
  g.rect(sx + 16, sy + 34, 5, 3); g.fill(darkColor);

  // Belt
  g.rect(sx + 2, sy + 22, 20, 3); g.fill(0x555555);

  // Torso (wide, armored)
  g.rect(sx + 2, sy + 7, 20, 16); g.fill(bodyColor);
  // Armor plates
  g.rect(sx + 4, sy + 9, 16, 6); g.fill(armorColor);
  g.rect(sx + 6, sy + 16, 12, 5); g.fill(armorColor);

  // Shoulder pads
  g.rect(sx, sy + 5, 6, 8); g.fill(armorColor);
  g.rect(sx + 18, sy + 5, 6, 8); g.fill(armorColor);

  // Arms
  g.rect(sx, sy + 12, 4, 6); g.fill(bodyColor);
  g.rect(sx + 20, sy + 10, 4, 6); g.fill(bodyColor);

  // Big weapon (right arm)
  g.rect(sx + 20, sy + 9, 10, 4); g.fill(0x555555);
  g.rect(sx + 26, sy + 9, 3, 4); g.fill(0x777777);

  // Head (bigger)
  g.rect(sx + 4, sy, 12, 8); g.fill(bodyColor);
  // Helmet
  g.rect(sx + 2, sy - 2, 16, 6); g.fill(darkColor);
  g.rect(sx + 3, sy - 4, 14, 4); g.fill(armorColor);
  // Red visor
  g.rect(sx + 14, sy + 1, 4, 2); g.fill(0xff3333);
  // Eye glow
  g.rect(sx + 16, sy + 2, 2, 2); g.fill(0xff6666);
}

// ── Projectiles ───────────────────────────────────────────────

export function drawPlayerBullet(g: Graphics, proj: Projectile, cameraX: number): void {
  const sx = Math.round(proj.x - cameraX);
  const sy = Math.round(proj.y);
  // Bright yellow with white core
  g.rect(sx, sy, proj.width, proj.height);
  g.fill(0xffee44);
  g.rect(sx + 2, sy, 2, proj.height);
  g.fill(0xffffff);
}

export function drawEnemyBullet(g: Graphics, proj: Projectile, cameraX: number): void {
  const sx = Math.round(proj.x - cameraX);
  const sy = Math.round(proj.y);
  // Red diamond/devil shot
  g.rect(sx, sy + 1, 1, 2); g.fill(0xdd2222);
  g.rect(sx + 1, sy, 2, 4); g.fill(0xff4444);
  g.rect(sx + 3, sy + 1, 1, 2); g.fill(0xdd2222);
  // Glow core
  g.rect(sx + 1, sy + 1, 2, 2); g.fill(0xff8888);
}

export function drawBossBullet(g: Graphics, proj: Projectile, cameraX: number): void {
  const sx = Math.round(proj.x - cameraX);
  const sy = Math.round(proj.y);
  // Large orange energy ball
  g.rect(sx + 1, sy, 4, 6); g.fill(0xff6600);
  g.rect(sx, sy + 1, 6, 4); g.fill(0xff8800);
  g.rect(sx + 2, sy + 1, 2, 4); g.fill(0xffaa33);
  g.rect(sx + 1, sy + 2, 4, 2); g.fill(0xffcc66);
}

// ── Particles ─────────────────────────────────────────────────

export function drawParticle(g: Graphics, p: Particle, cameraX: number): void {
  const sx = Math.round(p.x - cameraX);
  const sy = Math.round(p.y);
  const alpha = Math.max(0, p.life / p.maxLife);
  const r = ((p.color >> 16) & 0xff);
  const gr = ((p.color >> 8) & 0xff);
  const b = (p.color & 0xff);
  const fadedColor = ((Math.round(r * alpha) << 16) | (Math.round(gr * alpha) << 8) | Math.round(b * alpha));
  g.rect(sx, sy, 2, 2);
  g.fill(fadedColor);
}

// ── Helpers ───────────────────────────────────────────────────

function parseColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function hslShift(hex: number, _h: number, _s: number, l: number): number {
  // Simple lightness shift approximation for dark colors
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 0xff) + l));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 0xff) + l));
  const b = Math.max(0, Math.min(255, (hex & 0xff) + l));
  return (r << 16) | (g << 8) | b;
}
