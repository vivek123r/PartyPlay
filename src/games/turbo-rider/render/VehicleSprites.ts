import { Graphics } from 'pixi.js';

export type VehicleKind =
  | 'sedan'
  | 'truck'
  | 'bus'
  | 'bike'
  | 'cone'
  | 'barrel'
  | 'barrier'
  | 'oilslick';

// Real-world sizes (metres) — width = lateral, length = along-track (collision only), height = tall
export const VEHICLE_DIMENSIONS_M: Record<VehicleKind, { width: number; length: number; height: number }> = {
  sedan: { width: 1.9, length: 4.4, height: 1.5 },
  truck: { width: 2.6, length: 14.0, height: 4.0 },
  bus: { width: 2.5, length: 11.0, height: 3.2 },
  bike: { width: 0.8, length: 2.0, height: 1.5 },
  cone: { width: 0.4, length: 0.4, height: 0.7 },
  barrel: { width: 0.6, length: 0.6, height: 0.9 },
  barrier: { width: 1.8, length: 0.6, height: 1.0 },
  oilslick: { width: 2.0, length: 3.0, height: 0.02 },
};

export const HAZARD_KINDS: VehicleKind[] = ['cone', 'barrel', 'barrier', 'oilslick'];
export const MOVING_KINDS: VehicleKind[] = ['sedan', 'truck', 'bus', 'bike'];

function shadow(g: Graphics, drawX: number, groundY: number, w: number, alpha: number): void {
  const sw = Math.max(2, Math.round(w * 0.55));
  const sh = Math.max(1, Math.round(sw * 0.22));
  g.ellipse(drawX, groundY, sw / 2, sh / 2).fill({ color: 0x000000, alpha: 0.45 * alpha });
}

function mixColorLocal(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

function drawSedan(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 1.9));
  const h = Math.max(2, Math.round(ppm * 1.5));
  if (w < 2 || h < 2) { shadow(g, x, groundY, w, a); return; }

  shadow(g, x, groundY, w, a);

  const bodyH = Math.round(h * 0.62);
  const roofW = Math.round(w * 0.62);
  const roofH = h - bodyH;

  // Lower body / bumper
  g.rect(x - w / 2, groundY - bodyH, w, bodyH).fill({ color, alpha: a });
  // Bumper strip
  g.rect(x - w / 2, groundY - Math.round(bodyH * 0.22), w, Math.max(1, Math.round(bodyH * 0.14))).fill({ color: 0x1e272e, alpha: a * 0.6 });
  // Roof / rear glass pillar
  g.rect(x - roofW / 2, groundY - h, roofW, roofH).fill({ color, alpha: a });
  if (w > 6) {
    const glassW = Math.round(roofW * 0.82);
    const glassH = Math.max(1, Math.round(roofH * 0.55));
    g.rect(x - glassW / 2, groundY - h + Math.max(1, Math.round(roofH * 0.16)), glassW, glassH).fill({ color: 0x0984e3, alpha: a * 0.7 });
    // Defroster lines
    g.rect(x - glassW / 2 + 1, groundY - h + Math.round(roofH * 0.16) + Math.round(glassH * 0.5), glassW - 2, 1).fill({ color: 0x74b9ff, alpha: a * 0.35 });
  }
  if (w > 5) {
    // Wheel arches + tyre/rim hint peeking below the body
    const archW = Math.max(1, Math.round(w * 0.16));
    const archH = Math.max(1, Math.round(bodyH * 0.3));
    g.rect(x - Math.round(w * 0.36) - archW / 2, groundY - archH, archW, archH).fill({ color: 0x0f0e17, alpha: a * 0.7 });
    g.rect(x + Math.round(w * 0.36) - archW / 2, groundY - archH, archW, archH).fill({ color: 0x0f0e17, alpha: a * 0.7 });
    const tireR = Math.max(1, archH * 0.5);
    g.ellipse(x - Math.round(w * 0.36), groundY, tireR, tireR * 0.6).fill({ color: 0x1e272e, alpha: a * 0.85 });
    g.ellipse(x + Math.round(w * 0.36), groundY, tireR, tireR * 0.6).fill({ color: 0x1e272e, alpha: a * 0.85 });
  }
  if (w > 7) {
    // Livery accent stripe across the mid-body
    const stripeH = Math.max(1, Math.round(bodyH * 0.1));
    g.rect(x - w / 2, groundY - Math.round(bodyH * 0.55), w, stripeH).fill({ color: mixColorLocal(color, 0xffffff, 0.4), alpha: a * 0.5 });
  }
  if (w > 9) {
    // Bumper reflector dots
    g.rect(x - Math.round(w * 0.46), groundY - Math.round(bodyH * 0.12), 1, 1).fill({ color: 0xffa502, alpha: a * 0.8 });
    g.rect(x + Math.round(w * 0.46), groundY - Math.round(bodyH * 0.12), 1, 1).fill({ color: 0xffa502, alpha: a * 0.8 });
  }
  if (w > 8) {
    // Tail light clusters
    const tlW = Math.max(1, Math.round(w * 0.1));
    const tlH = Math.max(1, Math.round(bodyH * 0.32));
    const tlY = groundY - bodyH + Math.max(1, Math.round(bodyH * 0.12));
    g.rect(x - Math.round(w * 0.44), tlY, tlW, tlH).fill({ color: 0xff0055, alpha: a });
    g.rect(x + Math.round(w * 0.44) - tlW, tlY, tlW, tlH).fill({ color: 0xff0055, alpha: a });
    // License plate
    const plW = Math.max(2, Math.round(w * 0.22));
    const plH = Math.max(1, Math.round(bodyH * 0.16));
    g.rect(x - plW / 2, groundY - Math.round(bodyH * 0.42), plW, plH).fill({ color: 0xf4d160, alpha: a * 0.8 });
  }
  if (w > 10) {
    // Rear spoiler
    g.rect(x - roofW / 2 - 1, groundY - h - 1, roofW + 2, 1).fill({ color: 0x1e272e, alpha: a * 0.8 });
  }
}

function drawBus(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 2.5));
  const h = Math.max(2, Math.round(ppm * 3.2));
  if (w < 2 || h < 2) { shadow(g, x, groundY, w, a); return; }

  shadow(g, x, groundY, w, a);

  g.rect(x - w / 2, groundY - h, w, h).fill({ color, alpha: a });
  // Roofline highlight
  g.rect(x - w / 2, groundY - h, w, Math.max(1, Math.round(h * 0.03))).fill({ color: 0xffffff, alpha: a * 0.35 });
  // Destination panel band
  const bandY = groundY - h + Math.round(h * 0.08);
  const bandH = Math.max(1, Math.round(h * 0.09));
  g.rect(x - Math.round(w * 0.42), bandY, Math.round(w * 0.84), bandH).fill({ color: 0xf4d160, alpha: a * 0.75 });

  if (w > 8) {
    // Two rows of rear windows
    const winW = Math.max(1, Math.round(w / 8));
    const winH = Math.max(1, Math.round(h * 0.1));
    const rowsY = [groundY - h + Math.round(h * 0.24), groundY - h + Math.round(h * 0.42)];
    for (const wy of rowsY) {
      for (let i = 0; i < 7; i++) {
        g.rect(x - w / 2 + 3 + i * (winW + 1), wy, winW, winH).fill({ color: 0x0984e3, alpha: a * 0.65 });
      }
    }
  }
  // Rear door seam
  g.rect(x - 1, groundY - Math.round(h * 0.6), 1, Math.round(h * 0.55)).fill({ color: 0x0f0e17, alpha: a * 0.4 });
  // Lower bumper + mud flaps
  const bumpH = Math.max(1, Math.round(h * 0.06));
  g.rect(x - w / 2, groundY - bumpH, w, bumpH).fill({ color: 0x1e272e, alpha: a * 0.8 });
  if (w > 12) {
    const flapW = Math.max(1, Math.round(w * 0.08));
    g.rect(x - Math.round(w * 0.38), groundY - bumpH, flapW, bumpH).fill({ color: 0x0f0e17, alpha: a * 0.7 });
    g.rect(x + Math.round(w * 0.38) - flapW, groundY - bumpH, flapW, bumpH).fill({ color: 0x0f0e17, alpha: a * 0.7 });
  }
  if (w > 10) {
    // Rear wheel hint peeking from under the chassis
    const tireR = Math.max(1, Math.round(w * 0.07));
    g.ellipse(x - Math.round(w * 0.3), groundY, tireR, tireR * 0.55).fill({ color: 0x1e272e, alpha: a * 0.85 });
    g.ellipse(x + Math.round(w * 0.3), groundY, tireR, tireR * 0.55).fill({ color: 0x1e272e, alpha: a * 0.85 });
    // Livery accent stripe below the window rows
    const stripeH = Math.max(1, Math.round(h * 0.03));
    g.rect(x - w / 2, groundY - Math.round(h * 0.52), w, stripeH).fill({ color: mixColorLocal(color, 0xffffff, 0.5), alpha: a * 0.6 });
  }
  if (w > 10) {
    const tw = Math.max(1, Math.round(w * 0.07));
    g.rect(x - Math.round(w * 0.42), groundY - h + Math.round(h * 0.14), tw, tw).fill({ color: 0xff4757, alpha: a * 0.8 });
    g.rect(x + Math.round(w * 0.42) - tw, groundY - h + Math.round(h * 0.14), tw, tw).fill({ color: 0xff4757, alpha: a * 0.8 });
  }
}

function drawSemiTruck(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 2.6));
  const h = Math.max(2, Math.round(ppm * 4.0));
  if (w < 2 || h < 2) { shadow(g, x, groundY, w, a); return; }

  shadow(g, x, groundY, w, a);

  // Trailer box
  g.rect(x - w / 2, groundY - h, w, h).fill({ color, alpha: a });
  g.rect(x - w / 2, groundY - h, w, Math.max(1, Math.round(h * 0.02))).fill({ color: 0xffffff, alpha: a * 0.3 });
  // Rear door seam down the middle
  g.rect(x - 1, groundY - h, 1, h).fill({ color: 0x0f0e17, alpha: a * 0.35 });
  g.rect(x, groundY - h, 1, h).fill({ color: 0x0f0e17, alpha: a * 0.35 });

  // Marker lights along the top edge (amber, evenly spaced)
  if (w > 10) {
    const markers = 5;
    for (let i = 0; i < markers; i++) {
      const mx = x - w / 2 + (w / (markers - 1)) * i;
      g.rect(mx - 1, groundY - h, 2, Math.max(1, Math.round(h * 0.015))).fill({ color: 0xffa502, alpha: a * 0.85 });
    }
  }

  // Reflective chevron stripe near the bottom (red/white diagonal hazard pattern)
  const chevronY = groundY - Math.round(h * 0.32);
  const chevronH = Math.max(1, Math.round(h * 0.1));
  if (w > 8) {
    const stripes = Math.max(3, Math.round(w / 6));
    for (let i = 0; i < stripes; i++) {
      const sx = x - w / 2 + (w / stripes) * i;
      g.poly([
        sx, chevronY + chevronH,
        sx + w / stripes * 0.5, chevronY,
        sx + w / stripes, chevronY + chevronH,
      ]).fill({ color: i % 2 === 0 ? 0xff0055 : 0xfffffe, alpha: a * 0.75 });
    }
  }

  // Underride guard bar
  const barH = Math.max(1, Math.round(h * 0.05));
  g.rect(x - Math.round(w * 0.46), groundY - barH * 2, Math.round(w * 0.92), barH).fill({ color: 0x1e272e, alpha: a * 0.85 });
  // Mudflaps
  if (w > 12) {
    const flapW = Math.max(1, Math.round(w * 0.1));
    g.rect(x - Math.round(w * 0.4), groundY - barH, flapW, barH).fill({ color: 0x0f0e17, alpha: a * 0.8 });
    g.rect(x + Math.round(w * 0.4) - flapW, groundY - barH, flapW, barH).fill({ color: 0x0f0e17, alpha: a * 0.8 });
  }
  // Tail lights
  if (w > 8) {
    const tw = Math.max(1, Math.round(w * 0.06));
    const th = Math.max(1, Math.round(h * 0.05));
    g.rect(x - Math.round(w * 0.42), groundY - barH * 2 - th, tw, th).fill({ color: 0xff0055, alpha: a });
    g.rect(x + Math.round(w * 0.42) - tw, groundY - barH * 2 - th, tw, th).fill({ color: 0xff0055, alpha: a });
    // License plate, centred under the tail lights
    const plW = Math.max(2, Math.round(w * 0.14));
    const plH = Math.max(1, Math.round(h * 0.025));
    g.rect(x - plW / 2, groundY - barH * 2 - th - plH - 1, plW, plH).fill({ color: 0xf4d160, alpha: a * 0.8 });
  }
  if (w > 12) {
    // Tandem rear-axle wheel hint, peeking below the underride bar
    const tireR = Math.max(1, Math.round(w * 0.06));
    g.ellipse(x - Math.round(w * 0.32), groundY, tireR, tireR * 0.5).fill({ color: 0x1e272e, alpha: a * 0.85 });
    g.ellipse(x + Math.round(w * 0.32), groundY, tireR, tireR * 0.5).fill({ color: 0x1e272e, alpha: a * 0.85 });
  }
}

function drawAIBike(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(1, Math.round(ppm * 0.8));
  const h = Math.max(2, Math.round(ppm * 1.5));
  if (w < 1 || h < 2) { shadow(g, x, groundY, w, a); return; }

  shadow(g, x, groundY, w, a);

  const bodyH = Math.round(h * 0.42);
  g.rect(x - w / 2, groundY - bodyH, w, bodyH).fill({ color, alpha: a });
  // Rear tire hint
  g.rect(x - Math.round(w * 0.3), groundY - Math.round(bodyH * 0.4), Math.round(w * 0.6), Math.max(1, Math.round(bodyH * 0.4))).fill({ color: 0x1e272e, alpha: a * 0.7 });
  // Rider torso
  const torsoW = Math.max(1, Math.round(w * 0.75));
  const torsoH = Math.round(h * 0.4);
  g.rect(x - torsoW / 2, groundY - bodyH - torsoH, torsoW, torsoH).fill({ color: 0x2d3436, alpha: a });
  // Helmet
  const helmW = Math.max(1, Math.round(w * 0.5));
  const helmH = Math.max(1, Math.round(h * 0.2));
  g.rect(x - helmW / 2, groundY - bodyH - torsoH - helmH, helmW, helmH).fill({ color, alpha: a });
  // Tail light
  g.rect(x - Math.round(w * 0.25), groundY - bodyH + 1, Math.round(w * 0.5), Math.max(1, Math.round(bodyH * 0.14))).fill({ color: 0xff0055, alpha: a });
}

/** A hazard is easy to miss against dark asphalt at a glance — a slow pulsing ring within
 * ~40m gives the player time to react. `ppm` alone is a reliable distance proxy here since
 * viewW (and therefore halfW) is constant across all player counts; only viewH varies. */
function drawHazardWarningRing(g: Graphics, x: number, groundY: number, w: number, ppm: number, a: number): void {
  if (ppm < 18) return;
  const pulse = 0.35 + 0.3 * Math.sin(Date.now() * 0.008);
  const ringR = Math.max(2, w * 0.85);
  g.ellipse(x, groundY, ringR, ringR * 0.32).stroke({ width: 1, color: 0xfff200, alpha: a * pulse });
}

function drawCone(g: Graphics, x: number, groundY: number, ppm: number, a: number): void {
  const w = Math.max(1, Math.round(ppm * 0.4));
  const h = Math.max(2, Math.round(ppm * 0.7));
  shadow(g, x, groundY, w * 2, a);
  g.poly([x, groundY - h, x - w / 2, groundY, x + w / 2, groundY]).fill({ color: 0xff7043, alpha: a });
  g.poly([x, groundY - h, x - w / 2, groundY, x + w / 2, groundY]).stroke({ width: 1, color: 0x1e272e, alpha: a * 0.7 });
  if (h > 3) {
    const bandH = Math.max(1, Math.round(h * 0.18));
    const bandY = groundY - Math.round(h * 0.4);
    g.poly([
      x - w * 0.32, bandY + bandH,
      x + w * 0.32, bandY + bandH,
      x + w * 0.18, bandY,
      x - w * 0.18, bandY,
    ]).fill({ color: 0xfffffe, alpha: a * 0.95 });
  }
  g.rect(x - w * 0.65, groundY - 1, w * 1.3, 1).fill({ color: 0x1e272e, alpha: a * 0.7 });
  drawHazardWarningRing(g, x, groundY, w, ppm, a);
}

function drawBarrel(g: Graphics, x: number, groundY: number, ppm: number, a: number): void {
  const w = Math.max(1, Math.round(ppm * 0.6));
  const h = Math.max(2, Math.round(ppm * 0.9));
  shadow(g, x, groundY, w, a);
  // Rounded barrel profile — a body rect with elliptical top/bottom caps rather than a flat box
  g.rect(x - w / 2, groundY - h + h * 0.1, w, h * 0.8).fill({ color: 0xff9500, alpha: a });
  g.rect(x - w / 2, groundY - h + h * 0.1, w, h * 0.8).stroke({ width: 1, color: 0x1e272e, alpha: a * 0.6 });
  g.ellipse(x, groundY - h + h * 0.1, w / 2, Math.max(1, h * 0.1)).fill({ color: 0xffb74d, alpha: a });
  g.ellipse(x, groundY - h * 0.1, w / 2, Math.max(1, h * 0.1)).fill({ color: 0x7a3d00, alpha: a * 0.8 });
  if (h > 4) {
    const stripeH = Math.max(1, Math.round(h * 0.16));
    g.rect(x - w / 2, groundY - Math.round(h * 0.66), w, stripeH).fill({ color: 0xfffffe, alpha: a * 0.9 });
    g.rect(x - w / 2, groundY - Math.round(h * 0.3), w, stripeH).fill({ color: 0xfffffe, alpha: a * 0.9 });
  }
  // Rim highlight
  g.ellipse(x, groundY - h + h * 0.1, w / 2, Math.max(1, h * 0.1)).stroke({ width: 1, color: 0xffe0b2, alpha: a * 0.8 });
  drawHazardWarningRing(g, x, groundY, w, ppm, a);
}

function drawBarrier(g: Graphics, x: number, groundY: number, ppm: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 1.8));
  const h = Math.max(2, Math.round(ppm * 1.0));
  shadow(g, x, groundY, w, a);

  const boardH = Math.max(1, Math.round(h * 0.55));
  const boardY = groundY - h;
  // Support legs
  const legW = Math.max(1, Math.round(w * 0.06));
  g.rect(x - w / 2 + legW, groundY - Math.round(h * 0.5), legW, Math.round(h * 0.5)).fill({ color: 0x2d3436, alpha: a * 0.8 });
  g.rect(x + w / 2 - legW * 2, groundY - Math.round(h * 0.5), legW, Math.round(h * 0.5)).fill({ color: 0x2d3436, alpha: a * 0.8 });

  // Diagonal red/white plank
  const stripes = Math.max(3, Math.round(w / 5));
  for (let i = 0; i < stripes; i++) {
    const sx = x - w / 2 + (w / stripes) * i;
    g.rect(sx, boardY, w / stripes + 1, boardH).fill({ color: i % 2 === 0 ? 0xff0055 : 0xfffffe, alpha: a * 0.95 });
  }
  g.rect(x - w / 2, boardY, w, 1).fill({ color: 0x1e272e, alpha: a * 0.7 });
  g.rect(x - w / 2, boardY + boardH, w, 1).fill({ color: 0x1e272e, alpha: a * 0.7 });
  // Reflector dots — the small bright pips that make road barriers readable at night/distance
  const dotCount = Math.max(2, Math.round(w / 8));
  for (let i = 0; i < dotCount; i++) {
    const dx = x - w / 2 + (w / (dotCount - 1 || 1)) * i;
    g.rect(dx - 1, boardY + boardH * 0.5 - 1, 2, 2).fill({ color: 0xfff200, alpha: a * 0.85 });
  }
  drawHazardWarningRing(g, x, groundY, w, ppm, a);
}

const OIL_SHEEN_COLORS = [0x6c5ce7, 0x00cec9, 0xfd79a8, 0x0984e3];

function drawOilSlick(g: Graphics, x: number, groundY: number, ppm: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 2.0));
  const h = Math.max(1, Math.round(w * 0.34));
  g.ellipse(x, groundY, w / 2, h / 2).fill({ color: 0x0a0a12, alpha: 0.6 * a });
  g.ellipse(x, groundY, w / 2, h / 2).stroke({ width: 1, color: 0x2d3436, alpha: a * 0.6 });
  g.ellipse(x - w * 0.12, groundY - h * 0.08, w * 0.22, h * 0.18).fill({ color: 0x3d4548, alpha: 0.4 * a });
  // Animated rainbow sheen — slowly cycles through an oily colour ramp, and a brighter rim so
  // the (deliberately dark) surface still registers as a hazard rather than a shadow
  const t = Date.now() * 0.0006;
  const sheenIdx = Math.floor(t) % OIL_SHEEN_COLORS.length;
  const sheenNext = OIL_SHEEN_COLORS[(sheenIdx + 1) % OIL_SHEEN_COLORS.length];
  const sheenColor = mixColorLocal(OIL_SHEEN_COLORS[sheenIdx], sheenNext, t % 1);
  g.ellipse(x + w * 0.1, groundY + h * 0.05, w * 0.16, h * 0.11).fill({ color: sheenColor, alpha: (0.3 + 0.15 * Math.sin(t * 4)) * a });
  g.ellipse(x - w * 0.15, groundY - h * 0.02, w * 0.08, h * 0.05).fill({ color: mixColorLocal(sheenColor, 0xffffff, 0.4), alpha: (0.25 + 0.1 * Math.cos(t * 5)) * a });
}

/** Rear and front face projections for a boxed vehicle — the caller (ProjectionEngine) computes
 * these from the vehicle's real length, projecting each face at its own camera distance so the
 * box reads with correct perspective foreshortening, not just a flat billboard. */
export interface DepthFaces {
  xNear: number;
  yNear: number;
  ppmNear: number;
  xFar: number;
  yFar: number;
  ppmFar: number;
}

const BOXED_KINDS: VehicleKind[] = ['sedan', 'truck', 'bus'];

// How far off the camera's forward axis (in metres) a vehicle must sit before it shows a
// side face at all — dead-ahead traffic has no visible side, just its rear.
const SIDE_VISIBILITY_DEAD_ZONE_M = 0.15;

function drawDepthShell(
  g: Graphics,
  faces: DepthFaces,
  color: number,
  a: number,
  widthM: number,
  heightM: number,
  lateralOffsetM: number,
  drawRearFace: (g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number) => void
): void {
  const { xNear, yNear, ppmNear, xFar, yFar, ppmFar } = faces;
  const wNear = Math.max(2, Math.round(ppmNear * widthM));
  const hNear = Math.max(2, Math.round(ppmNear * heightM));
  const wFar = Math.max(1, Math.round(ppmFar * widthM));
  const hFar = Math.max(1, Math.round(ppmFar * heightM));
  const roofNearY = yNear - hNear;
  const roofFarY = yFar - hFar;

  // Full-length ground shadow — the strongest depth cue there is: a 14m semi should visibly
  // cast a long shadow, not a single dot under its rear bumper.
  g.poly([
    xNear - wNear / 2, yNear,
    xNear + wNear / 2, yNear,
    xFar + wFar / 2, yFar,
    xFar - wFar / 2, yFar,
  ]).fill({ color: 0x000000, alpha: a * 0.3 });

  // Side face — back-face culled: only the side actually facing the camera is drawn, chosen
  // from which side of the camera's forward axis the vehicle sits. Drawing both (or always
  // the same hardcoded one) is what made this read as flat width/height with no real box.
  if (Math.abs(lateralOffsetM) > SIDE_VISIBILITY_DEAD_ZONE_M) {
    const sideSign = lateralOffsetM > 0 ? -1 : 1;
    const nearSideX = xNear + (sideSign * wNear) / 2;
    const farSideX = xFar + (sideSign * wFar) / 2;
    g.poly([
      nearSideX, roofNearY,
      nearSideX, yNear,
      farSideX, yFar,
      farSideX, roofFarY,
    ]).fill({ color: mixColorLocal(color, 0x000000, 0.5), alpha: a * 0.85 });
    g.poly([nearSideX, roofNearY, nearSideX, yNear]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });
  }

  // Roof: a real vehicle roof above the camera's 1.4m eye height is never actually seen from
  // behind at ground level, so drawing one there was wasted, invisible fill work. Give a tall
  // vehicle a top-edge highlight instead (what genuinely catches light on a real roofline);
  // reserve the full sunlit-roof quad for anything shorter than eye height.
  if (heightM < 1.4) {
    g.poly([
      xNear - wNear / 2, roofNearY,
      xNear + wNear / 2, roofNearY,
      xFar + wFar / 2, roofFarY,
      xFar - wFar / 2, roofFarY,
    ]).fill({ color: mixColorLocal(color, 0xffffff, 0.2), alpha: a * 0.85 });
  } else {
    g.rect(xNear - wNear / 2, roofNearY, wNear, Math.max(1, Math.round(ppmNear * 0.04))).fill({ color: mixColorLocal(color, 0xffffff, 0.35), alpha: a * 0.6 });
  }

  // Rear face on top, reusing the existing detailed per-type silhouette
  drawRearFace(g, xNear, yNear, ppmNear, color, a);

  // Outline the rear silhouette so the box separates cleanly from similarly-dark road/scenery
  g.rect(xNear - wNear / 2, roofNearY, wNear, hNear).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.4 });
}

/** Draws a boxed vehicle (sedan/truck/bus) with real projected depth — see DepthFaces.
 * `lateralOffsetM` is the vehicle's world-space lateral distance from the camera's forward
 * axis (metres, signed) and determines which side face — if any — is visible. */
export function drawVehicleDepth(
  g: Graphics,
  faces: DepthFaces,
  type: VehicleKind,
  color: number,
  a: number,
  lateralOffsetM: number
): void {
  const dims = VEHICLE_DIMENSIONS_M[type];
  const rearFn = type === 'sedan' ? drawSedan : type === 'bus' ? drawBus : drawSemiTruck;
  drawDepthShell(g, faces, color, a, dims.width, dims.height, lateralOffsetM, rearFn);
}

export function isBoxedVehicleKind(type: VehicleKind): boolean {
  return BOXED_KINDS.includes(type);
}

/** Draws a traffic vehicle or hazard, feet-first at `groundY`, using a single px-per-metre
 * scale so silhouettes stay proportionally correct at every distance. `drawX` must already
 * include the lane's lateral screen offset. */
export function drawVehicle(
  g: Graphics,
  drawX: number,
  groundY: number,
  pxPerMetre: number,
  type: VehicleKind,
  color: number,
  fadeAlpha: number
): void {
  switch (type) {
    case 'sedan': return drawSedan(g, drawX, groundY, pxPerMetre, color, fadeAlpha);
    case 'bus': return drawBus(g, drawX, groundY, pxPerMetre, color, fadeAlpha);
    case 'truck': return drawSemiTruck(g, drawX, groundY, pxPerMetre, color, fadeAlpha);
    case 'bike': return drawAIBike(g, drawX, groundY, pxPerMetre, color, fadeAlpha);
    case 'cone': return drawCone(g, drawX, groundY, pxPerMetre, fadeAlpha);
    case 'barrel': return drawBarrel(g, drawX, groundY, pxPerMetre, fadeAlpha);
    case 'barrier': return drawBarrier(g, drawX, groundY, pxPerMetre, fadeAlpha);
    case 'oilslick': return drawOilSlick(g, drawX, groundY, pxPerMetre, fadeAlpha);
  }
}
