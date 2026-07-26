import { Graphics } from 'pixi.js';
import { PixelFont } from './PixelFont';
import { PIXEL_SCALE } from './RenderScale';

export interface BikeSpriteColors {
  hull: number;
  suit: number;
  helmet: number;
}

function mixColorLocal(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

/** Layered procedural exhaust flame (smoke -> orange body -> white-hot core), flickering off
 * a per-bike phase so two bikes boosting side by side never pulse in lockstep. Replaces the
 * old shared fire.mp4 video texture, which — being one singleton Texture instance drawn for
 * every bike in every viewport — couldn't be tinted or scaled per bike and was the likely
 * cause of nitro visuals bleeding between players. */
function drawExhaustFlame(g: Graphics, x: number, y: number, s: (n: number) => number, tint: number, phase: number): void {
  const flicker = 0.82 + 0.18 * Math.sin(Date.now() * 0.022 + phase);
  const len = s(9) * flicker;

  const outerW = s(3.4);
  g.poly([x - outerW / 2, y, x + outerW / 2, y, x, y + len * 1.2]).fill({ color: mixColorLocal(0xff7b00, tint, 0.25), alpha: 0.3 });

  const bodyW = s(2.2) * flicker;
  g.poly([x - bodyW / 2, y, x + bodyW / 2, y, x, y + len]).fill({ color: 0xff7b00, alpha: 0.85 });

  const coreW = s(1.1) * flicker;
  g.poly([x - coreW / 2, y, x + coreW / 2, y, x, y + len * 0.55]).fill({ color: 0xfff3b0, alpha: 0.95 });
}

/**
 * Rear-view pixel-art superbike + rider, scale-driven so the same art works for the
 * local player (pinned to a fixed screen position) and for opponents at arbitrary
 * projected distance (see ProjectionEngine's opponent render loop). Always drawn at full
 * detail — a prior "core silhouette only" cheap-draw mode for distant opponents was removed
 * because it silently cut the sprite's visible height by ~39% (no rider/helmet) at the exact
 * same numeric scale, which read as "opponent is way smaller than the player" even though
 * sizing itself was correct. At most 3 opponents are ever on screen, so full detail is cheap.
 */
export function drawSuperbikeRear(
  g: Graphics,
  bikeScreenX: number,
  bikeScreenY: number,
  scale: number,
  leanAngle: number,
  isNitroActive: boolean,
  colors: BikeSpriteColors,
  flamePhase = 0
): void {
  const leanRot = Math.max(-25, Math.min(25, leanAngle * 25));
  const leanOffset = leanRot * 0.15 * scale;
  const s = (n: number) => n * scale;
  const hexColor = colors.hull;
  const suitColor = colors.suit;
  const helmetColor = colors.helmet;

  // Contact shadow, drawn first so the bike sits on top of it
  g.ellipse(bikeScreenX, bikeScreenY, s(7), s(2)).fill({ color: 0x000000, alpha: 0.35 });

  // 1. Rear race tire — always drawn, part of the core silhouette
  g.rect(bikeScreenX - s(5), bikeScreenY - s(8), s(10), s(8)).fill({ color: 0x1e272e });
  g.rect(bikeScreenX - s(3), bikeScreenY - s(7), s(6), s(6)).fill({ color: 0x2f3542 });
  g.rect(bikeScreenX - s(1), bikeScreenY - s(5), s(2), s(2)).fill({ color: 0xbdc3c7 });
  g.rect(bikeScreenX - s(3), bikeScreenY - s(8), s(1), s(8)).fill({ color: 0x0f0e17, alpha: 0.5 });
  g.rect(bikeScreenX + s(1), bikeScreenY - s(8), s(1), s(8)).fill({ color: 0x0f0e17, alpha: 0.5 });

  // 2. Dual chrome exhaust pipes
  g.rect(bikeScreenX - s(7) + leanOffset * 0.2, bikeScreenY - s(5), s(2), s(4)).fill({ color: 0xdcdde1 });
  g.rect(bikeScreenX + s(5) + leanOffset * 0.2, bikeScreenY - s(5), s(2), s(4)).fill({ color: 0xdcdde1 });

  if (isNitroActive) {
    drawExhaustFlame(g, bikeScreenX - s(6) + leanOffset * 0.2, bikeScreenY - s(1), s, hexColor, flamePhase);
    drawExhaustFlame(g, bikeScreenX + s(6) + leanOffset * 0.2, bikeScreenY - s(1), s, hexColor, flamePhase + 1.7);
  }

  // 3. Sculpted Tail Section — core silhouette, always drawn
  g.rect(bikeScreenX - s(6) + leanOffset * 0.5, bikeScreenY - s(14), s(12), s(7)).fill({ color: hexColor });
  g.rect(bikeScreenX - s(4) + leanOffset * 0.6, bikeScreenY - s(17), s(8), s(4)).fill({ color: hexColor });

  // 4. Red LED Brake Light Unit
  g.rect(bikeScreenX - s(4) + leanOffset * 0.5, bikeScreenY - s(10), s(8), s(3)).fill({ color: 0xff4757 });

  // 5. Leaning Rider
  g.rect(bikeScreenX - s(8) + leanOffset * 0.3, bikeScreenY - s(12), s(4), s(5)).fill({ color: 0x0f0e17 });
  g.rect(bikeScreenX + s(4) + leanOffset * 0.3, bikeScreenY - s(12), s(4), s(5)).fill({ color: 0x0f0e17 });

  g.rect(bikeScreenX - s(5) + leanOffset * 0.8, bikeScreenY - s(22), s(10), s(7)).fill({ color: suitColor });
  g.rect(bikeScreenX - s(6) + leanOffset * 0.8, bikeScreenY - s(22), s(2), s(2)).fill({ color: 0xbdc3c7 });
  g.rect(bikeScreenX + s(4) + leanOffset * 0.8, bikeScreenY - s(22), s(2), s(2)).fill({ color: 0xbdc3c7 });

  g.rect(bikeScreenX - s(3) + leanOffset, bikeScreenY - s(28), s(6), s(6)).fill({ color: helmetColor });
  g.rect(bikeScreenX - s(1) + leanOffset, bikeScreenY - s(22), s(2), s(1)).fill({ color: 0x0f0e17 });

  // Near-tier: additive only, gated on the sprite already being drawn large (close by or the
  // local player at native resolution) — never removes or resizes anything the base draw above
  // already produced, per this file's "always full detail, additive tiers only" invariant.
  if (scale >= 1.6) {
    // Mirror stubs
    g.rect(bikeScreenX - s(9) + leanOffset * 0.8, bikeScreenY - s(23), s(1.5), s(1.5)).fill({ color: 0x2f3542 });
    g.rect(bikeScreenX + s(7.5) + leanOffset * 0.8, bikeScreenY - s(23), s(1.5), s(1.5)).fill({ color: 0x2f3542 });
    // Tyre tread rows on the rear tire
    g.rect(bikeScreenX - s(3), bikeScreenY - s(6), s(6), s(0.6)).fill({ color: 0x0f0e17, alpha: 0.5 });
    g.rect(bikeScreenX - s(3), bikeScreenY - s(4), s(6), s(0.6)).fill({ color: 0x0f0e17, alpha: 0.5 });
    // Rider hands on the bars
    g.rect(bikeScreenX - s(9) + leanOffset * 0.3, bikeScreenY - s(16), s(2), s(2)).fill({ color: 0x0f0e17 });
    g.rect(bikeScreenX + s(7) + leanOffset * 0.3, bikeScreenY - s(16), s(2), s(2)).fill({ color: 0x0f0e17 });
    // Brake-light bloom
    g.rect(bikeScreenX - s(5) + leanOffset * 0.5, bikeScreenY - s(11), s(10), s(5)).fill({ color: 0xff4757, alpha: 0.2 });
  }
}

/**
 * Fixed-pixel-size player-identifying tag (colored chevron + "P2"-style label), drawn above
 * an opponent's head. Does NOT scale with ppm/distance — it must stay legible at range, and it
 * is what lets a human rival be told apart from a similarly-colored AI traffic bike regardless
 * of how small the opponent's own (always full-detail, see `drawSuperbikeRear` above) sprite has
 * projected to. Scales with `PIXEL_SCALE` (RenderScale.ts) so it keeps its screen-space size when
 * the game's render resolution changes, rather than shrinking to half its intended size.
 */
export function drawPlayerTag(
  g: Graphics,
  x: number,
  groundY: number,
  color: number,
  label: string,
  alpha: number,
  minY: number
): void {
  const tagH = 9 * PIXEL_SCALE;
  const offset = 34 * PIXEL_SCALE;
  const chevronSize = 4 * PIXEL_SCALE;
  const chevronY = Math.max(minY, groundY - offset - tagH);
  const textY = Math.max(minY, groundY - offset);

  g.poly([x - chevronSize, chevronY + chevronSize * 1.25, x, chevronY, x + chevronSize, chevronY + chevronSize * 1.25]).fill({ color, alpha: alpha * 0.9 });
  const tw = PixelFont.measure(label, PIXEL_SCALE);
  PixelFont.drawText(g, label, Math.round(x - tw / 2), Math.round(textY), 0xfffffe, PIXEL_SCALE, alpha);
}
