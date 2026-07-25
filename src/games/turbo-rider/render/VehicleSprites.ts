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

/** Small tire silhouette shared by the AI bike's rear-view and side-view renders — a tire
 * body, inner rim, and hub highlight built from layered ellipses, rather than a single flat
 * rect. Mirrors the layered rear tire built for the player's own bike (see drawSuperbikeRear
 * in BikeSprite.ts), just scaled down and ellipse-based for this much smaller AI silhouette. */
function drawBikeTire(g: Graphics, cx: number, cy: number, r: number, a: number): void {
  const tireR = Math.max(1, r);
  // Tire body
  g.ellipse(cx, cy, tireR, tireR).fill({ color: 0x1e272e, alpha: a * 0.9 });
  // Dark sidewall shading either side of the tread
  g.ellipse(cx - tireR * 0.55, cy, tireR * 0.22, tireR * 0.75).fill({ color: 0x0f0e17, alpha: a * 0.35 });
  g.ellipse(cx + tireR * 0.55, cy, tireR * 0.22, tireR * 0.75).fill({ color: 0x0f0e17, alpha: a * 0.35 });
  // Inner rim
  const rimR = tireR * 0.5;
  g.ellipse(cx, cy, rimR, rimR).fill({ color: 0x2f3542, alpha: a * 0.9 });
  // Hub highlight
  const hubR = Math.max(0.5, tireR * 0.22);
  g.ellipse(cx, cy, hubR, hubR).fill({ color: 0xbdc3c7, alpha: a * 0.9 });
}

function drawAIBike(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(1, Math.round(ppm * 0.8));
  const h = Math.max(2, Math.round(ppm * 1.5));
  if (w < 1 || h < 2) { shadow(g, x, groundY, w, a); return; }

  shadow(g, x, groundY, w, a);

  const bodyH = Math.round(h * 0.42);
  g.rect(x - w / 2, groundY - bodyH, w, bodyH).fill({ color, alpha: a });

  // Rear tire — a real tire silhouette (body/rim/hub) instead of a flat dark rect, sitting on
  // the ground under the body.
  const tireR = Math.max(1, Math.round(bodyH * 0.42));
  drawBikeTire(g, x, groundY - tireR, tireR, a);

  // Exhaust pipe hint, tucked beside the rear tire
  const pipeW = Math.max(1, Math.round(tireR * 0.4));
  const pipeH = Math.max(1, Math.round(tireR * 1.1));
  g.rect(x + Math.round(tireR * 0.9), groundY - pipeH - Math.round(tireR * 0.2), pipeW, pipeH).fill({ color: 0xdcdde1, alpha: a * 0.85 });

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

/** Side profile of the AI bike — shown when a bike sits far enough off the camera's forward
 * axis (see SIDE_VISIBILITY_DEAD_ZONE_M) that its side, not its rear, is what the camera would
 * actually see. A ~2m bike is short enough along the track that a flat billboard reads fine
 * here; unlike the boxed vehicles it doesn't need real projected near/far depth faces. Sized
 * off `ppm` exactly like drawAIBike, using the bike's real length/height (see
 * VEHICLE_DIMENSIONS_M) so it matches drawAIBike's scale at the same distance. */
export function drawAIBikeSide(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const len = Math.max(2, Math.round(ppm * VEHICLE_DIMENSIONS_M.bike.length));
  const h = Math.max(2, Math.round(ppm * VEHICLE_DIMENSIONS_M.bike.height));
  if (len < 2 || h < 2) { shadow(g, x, groundY, len, a); return; }

  shadow(g, x, groundY, len, a);

  const wheelR = Math.max(1, Math.round(h * 0.16));
  const wheelCY = groundY - wheelR;
  const rearWheelX = x - len * 0.32;
  const frontWheelX = x + len * 0.32;

  // Frame / engine block silhouette between the wheels
  const frameH = Math.round(h * 0.22);
  const frameY = groundY - wheelR * 1.6 - frameH;
  g.rect(rearWheelX - wheelR * 0.3, frameY, (frontWheelX - rearWheelX) + wheelR * 0.6, frameH).fill({ color, alpha: a });
  // Engine block accent, centred between the wheels
  g.rect(x - len * 0.08, frameY + frameH * 0.15, len * 0.22, frameH * 0.7).fill({ color: 0x2f3542, alpha: a * 0.85 });

  // Exhaust pipe running along the side toward the rear
  const pipeH = Math.max(1, Math.round(frameH * 0.35));
  g.rect(rearWheelX - wheelR * 0.2, groundY - wheelR * 1.4, x - rearWheelX, pipeH).fill({ color: 0xdcdde1, alpha: a * 0.85 });

  // Wheels — shared tire silhouette also used by the rear view
  drawBikeTire(g, rearWheelX, wheelCY, wheelR, a);
  drawBikeTire(g, frontWheelX, wheelCY, wheelR, a);

  // Leaning rider: torso tucked low over the tank, leaning slightly toward the rear
  const torsoW = Math.max(1, Math.round(len * 0.16));
  const torsoH = Math.round(h * 0.32);
  const torsoX = x - len * 0.02;
  g.rect(torsoX - torsoW / 2, frameY - torsoH, torsoW, torsoH).fill({ color: 0x2d3436, alpha: a });

  // Helmet
  const helmR = Math.max(1, Math.round(h * 0.11));
  g.circle(torsoX + len * 0.05, frameY - torsoH - helmR * 0.6, helmR).fill({ color, alpha: a });

  // Tail light hint at the rear
  g.rect(rearWheelX - wheelR * 0.6, frameY + frameH * 0.2, wheelR * 0.8, frameH * 0.35).fill({ color: 0xff0055, alpha: a });
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
  const w = Math.max(1, Math.round(ppm * 0.5));
  const h = Math.max(2, Math.round(ppm * 0.85));
  shadow(g, x, groundY, w * 2, a);

  // Flared base plate — a distinct wider, flatter footing beneath the tapered cone body, so the
  // cone reads as sitting on a stable base rather than the ground shadow being its only "foot".
  const baseW = w * 1.6;
  const baseH = Math.max(1, Math.round(h * 0.14));
  g.poly([
    x - baseW / 2, groundY,
    x + baseW / 2, groundY,
    x + baseW * 0.32, groundY - baseH,
    x - baseW * 0.32, groundY - baseH,
  ]).fill({ color: 0x1e272e, alpha: a * 0.85 });
  g.poly([
    x - baseW / 2, groundY,
    x + baseW / 2, groundY,
    x + baseW * 0.32, groundY - baseH,
    x - baseW * 0.32, groundY - baseH,
  ]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });

  g.poly([x, groundY - h, x - w / 2, groundY - baseH, x + w / 2, groundY - baseH]).fill({ color: 0xff7043, alpha: a });
  g.poly([x, groundY - h, x - w / 2, groundY - baseH, x + w / 2, groundY - baseH]).stroke({ width: 1, color: 0x1e272e, alpha: a * 0.7 });
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
  drawHazardWarningRing(g, x, groundY, w, ppm, a);
}

function drawBarrel(g: Graphics, x: number, groundY: number, ppm: number, a: number): void {
  const w = Math.max(1, Math.round(ppm * 0.7));
  const h = Math.max(2, Math.round(ppm * 1.05));
  shadow(g, x, groundY, w, a);
  // Rounded barrel profile — a body rect with elliptical top/bottom caps rather than a flat box
  g.rect(x - w / 2, groundY - h + h * 0.1, w, h * 0.8).fill({ color: 0xff9500, alpha: a });
  g.rect(x - w / 2, groundY - h + h * 0.1, w, h * 0.8).stroke({ width: 1, color: 0x1e272e, alpha: a * 0.6 });
  g.ellipse(x, groundY - h + h * 0.1, w / 2, Math.max(1, h * 0.1)).fill({ color: 0xffb74d, alpha: a });
  g.ellipse(x, groundY - h * 0.1, w / 2, Math.max(1, h * 0.1)).fill({ color: 0x7a3d00, alpha: a * 0.8 });
  if (h > 4) {
    const stripeH = Math.max(1, Math.round(h * 0.16));
    const stripeYs = [groundY - Math.round(h * 0.66), groundY - Math.round(h * 0.3)];
    for (const stripeY of stripeYs) {
      // Raised rib shading — a thin highlight above and shadow below each band sells it as a
      // rolled structural rib, not just a flat painted warning stripe
      g.rect(x - w / 2, stripeY - 1, w, 1).fill({ color: 0xffe0b2, alpha: a * 0.5 });
      g.rect(x - w / 2, stripeY, w, stripeH).fill({ color: 0xfffffe, alpha: a * 0.9 });
      g.rect(x - w / 2, stripeY + stripeH, w, 1).fill({ color: 0x6b3d00, alpha: a * 0.5 });
    }
  }
  // Rim highlight
  g.ellipse(x, groundY - h + h * 0.1, w / 2, Math.max(1, h * 0.1)).stroke({ width: 1, color: 0xffe0b2, alpha: a * 0.8 });
  // Bung/filler cap — the small raised plug on a real drum's top head
  if (w > 3) {
    const bungR = Math.max(1, w * 0.12);
    g.ellipse(x, groundY - h + h * 0.1, bungR, bungR * 0.6).fill({ color: 0x7a3d00, alpha: a * 0.9 });
    g.ellipse(x, groundY - h + h * 0.1, bungR, bungR * 0.6).stroke({ width: 1, color: 0x4a2400, alpha: a * 0.6 });
  }
  drawHazardWarningRing(g, x, groundY, w, ppm, a);
}

function drawBarrier(g: Graphics, x: number, groundY: number, ppm: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 2.0));
  const h = Math.max(2, Math.round(ppm * 1.15));
  shadow(g, x, groundY, w, a);

  const boardH = Math.max(1, Math.round(h * 0.55));
  const boardY = groundY - h;
  // Support legs — splayed outward toward the ground (A-frame/sawhorse stance) instead of
  // straight vertical props, so the barrier reads as free-standing rather than two floating rects
  const legTopY = groundY - Math.round(h * 0.5);
  const legW = Math.max(1, Math.round(w * 0.06));
  const legSplay = Math.max(1, Math.round(w * 0.06));
  const legAttachL = x - w / 2 + legW;
  const legAttachR = x + w / 2 - legW;
  const legFootL = legAttachL - legSplay;
  const legFootR = legAttachR + legSplay;
  g.poly([
    legAttachL - legW / 2, legTopY,
    legAttachL + legW / 2, legTopY,
    legFootL + legW / 2, groundY,
    legFootL - legW / 2, groundY,
  ]).fill({ color: 0x2d3436, alpha: a * 0.8 });
  g.poly([
    legAttachR - legW / 2, legTopY,
    legAttachR + legW / 2, legTopY,
    legFootR + legW / 2, groundY,
    legFootR - legW / 2, groundY,
  ]).fill({ color: 0x2d3436, alpha: a * 0.8 });

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
  // Irregular puddle silhouette — a few overlapping, offset lobes read as an organic spill edge
  // instead of a single perfect ellipse looking like a flat colored disc.
  const lobes: Array<[number, number, number, number]> = [
    [0, 0, 1, 1],
    [-w * 0.24, h * 0.14, 0.58, 0.62],
    [w * 0.26, -h * 0.1, 0.5, 0.58],
    [w * 0.06, h * 0.24, 0.42, 0.48],
  ];
  for (const [dx, dy, sx, sy] of lobes) {
    g.ellipse(x + dx, groundY + dy, (w / 2) * sx, (h / 2) * sy).fill({ color: 0x0a0a12, alpha: 0.6 * a });
  }
  g.ellipse(x - w * 0.12, groundY - h * 0.08, w * 0.22, h * 0.18).fill({ color: 0x3d4548, alpha: 0.4 * a });
  // Animated rainbow sheen — slowly cycles through an oily colour ramp, and a brighter rim so
  // the (deliberately dark) surface still registers as a hazard rather than a shadow
  const t = Date.now() * 0.0006;
  const sheenIdx = Math.floor(t) % OIL_SHEEN_COLORS.length;
  const sheenNext = OIL_SHEEN_COLORS[(sheenIdx + 1) % OIL_SHEEN_COLORS.length];
  const sheenColor = mixColorLocal(OIL_SHEEN_COLORS[sheenIdx], sheenNext, t % 1);
  g.ellipse(x + w * 0.1, groundY + h * 0.05, w * 0.16, h * 0.11).fill({ color: sheenColor, alpha: (0.3 + 0.15 * Math.sin(t * 4)) * a });
  g.ellipse(x - w * 0.15, groundY - h * 0.02, w * 0.08, h * 0.05).fill({ color: mixColorLocal(sheenColor, 0xffffff, 0.4), alpha: (0.25 + 0.1 * Math.cos(t * 5)) * a });
  drawHazardWarningRing(g, x, groundY, w, ppm, a);
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
  /** True once the camera has drawn level with the vehicle's rear face — i.e. the rear plane is
   * at or behind the camera's minimum visible distance, so it is no longer something the camera
   * can see. Without this the caller's clamp produced a rear face at absurd scale that covered
   * the front cap and flank entirely, which is why an overtaken vehicle never appeared to have
   * a front. When true the near-end geometry describes the vehicle's near-plane slice rather
   * than its rear face, and the rear face itself is skipped. */
  rearBehindCamera?: boolean;
  /** Along-track length actually in front of the camera, in metres. Equals the vehicle's full
   * length normally, but shrinks as the camera passes it (see `rearBehindCamera`). The side
   * face's along-track scale must use this, not the full length, or a partially-passed vehicle
   * gets a flank stretched over a length that is no longer visible. */
  visibleLengthM?: number;
}

const BOXED_KINDS: VehicleKind[] = ['sedan', 'truck', 'bus'];

// How far off the camera's forward axis (in metres) a vehicle must sit before it shows a
// side face at all — dead-ahead traffic has no visible side, just its rear.
export const SIDE_VISIBILITY_DEAD_ZONE_M = 0.15;

/** Shared tyre glyph — tyre body, rim and hub dot. Every wheel drawn by the front/side faces
 * goes through here so the visual language (and the squash ratio that sells a ground-plane
 * ellipse rather than a circle floating in space) stays identical everywhere. */
function drawWheel(g: Graphics, x: number, groundY: number, radius: number, alpha: number): void {
  const r = Math.max(1, radius);
  // Tyre body — sits on the ground line, squashed vertically to read as a wheel seen from
  // roughly bumper height rather than side-on.
  g.ellipse(x, groundY - r * 0.55, r, r * 0.85).fill({ color: 0x14161a, alpha: alpha * 0.95 });
  if (r >= 2) {
    // Rim
    g.ellipse(x, groundY - r * 0.55, r * 0.52, r * 0.44).fill({ color: 0x9aa5ad, alpha: alpha * 0.8 });
  }
  if (r >= 3) {
    // Hub dot
    g.ellipse(x, groundY - r * 0.55, r * 0.18, r * 0.16).fill({ color: 0x2d3436, alpha: alpha * 0.9 });
  }
}

/** Signature shared by the front-cap and rear-face painters — both are billboard faces drawn
 * around a single centre X at one projected scale. */
type FaceFn = (g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number) => void;

/** Geometry of the visible side face: the quad running from the near (rear) edge back to the
 * far (front) edge. `tOf`/`xAt`/`yAt`/`ppmAt` let a painter place detail at a normalised
 * position along the vehicle's length (0 = rear, 1 = front) and get back the correctly
 * foreshortened screen position *and* the local pixels-per-metre at that point — a window at
 * the front of a 14m trailer is metres further from the camera than one at the back, so it must
 * be drawn smaller. Interpolating a single flat scale is what made the old side face read as a
 * sheared solid block. */
interface SideGeom {
  /** +1 when the visible side is the vehicle's right-hand flank on screen, -1 for the left. */
  sideSign: number;
  nearX: number;
  nearGroundY: number;
  nearPpm: number;
  farX: number;
  farGroundY: number;
  farPpm: number;
  /** The vehicle's real length in metres — the along-track span this face covers. */
  lengthM: number;
  /** Total screen width the whole flank occupies, in px. Tiny for near-dead-ahead traffic
   * (a flank seen almost edge-on genuinely is a sliver), which is what gates fine detail. */
  spanPx: number;
  /** Screen X of the side plane at length fraction t (0 = rear edge, 1 = front edge). */
  xAt: (t: number) => number;
  /** Screen Y of the ground line at length fraction t. */
  yAt: (t: number) => number;
  /** Local pixels-per-metre *across* the face (heights) at length fraction t. */
  ppmAt: (t: number) => number;
  /** Local pixels-per-metre *along the track* at length fraction t. Far smaller than ppmAt
   * for a face seen at a shallow angle — this is the scale any along-track dimension (a
   * wheel's diameter, a wheel arch's length) must use, or it bursts out of the vehicle. */
  alongPxPerM: (t: number) => number;
}

type SideFn = (g: Graphics, s: SideGeom, color: number, a: number) => void;

/** Minimum projected flank width (px) before a side face is worth glazing and wheeling.
 * Traffic that is nearly dead-ahead genuinely shows its flank almost edge-on — a real photo
 * would show a sliver too — and cramming windows and tyres into ~10px of screen produced the
 * speckled noise that read as an unfinished, half-transparent block. Below this the flank
 * stays a cleanly shaded panel and the (fully detailed) rear face carries the vehicle's
 * identity, which is what the camera actually sees from behind. */
const SIDE_DETAIL_MIN_SPAN_PX = 20;

/** Perspective-correct interpolation between the two projected end scales.
 *
 * Distance grows linearly along the vehicle's length, and screen scale goes as 1/distance, so
 * `1/ppm` is the quantity that is linear in the length fraction t — that gives `ppmAt`.
 *
 * Screen X and Y are *not* linear in t. For a point on the flank (constant world X, constant
 * height) the projection is `screen = vanishing + worldOffset * ppm`, i.e. screen position is
 * an affine function of the local ppm, hence hyperbolic in t. Solving that affine relation
 * from the two known endpoints recovers both the vanishing point and the world offset without
 * needing the caller's camera parameters. A previous version lerped screen X/Y linearly in t
 * (its "perspective parameter" simplified algebraically to exactly t), which placed flank
 * detail at visibly wrong positions along a long trailer. */
function makeSideGeom(
  sideSign: number,
  nearX: number,
  nearGroundY: number,
  nearPpm: number,
  farX: number,
  farGroundY: number,
  farPpm: number,
  lengthM: number
): SideGeom {
  const invNear = 1 / Math.max(0.0001, nearPpm);
  const invFar = 1 / Math.max(0.0001, farPpm);
  const dInv = invFar - invNear;
  const ppmAt = (t: number): number => 1 / (invNear + dInv * t);

  // screen = base + slope * ppm, fitted through (ppmNear -> near) and (ppmFar -> far).
  const dPpm = nearPpm - farPpm;
  const degenerate = Math.abs(dPpm) < 1e-6;
  const slopeX = degenerate ? 0 : (nearX - farX) / dPpm;
  const baseX = degenerate ? nearX : nearX - slopeX * nearPpm;
  const slopeY = degenerate ? 0 : (nearGroundY - farGroundY) / dPpm;
  const baseY = degenerate ? nearGroundY : nearGroundY - slopeY * nearPpm;

  const xAt = degenerate
    ? (t: number) => nearX + (farX - nearX) * t
    : (t: number) => baseX + slopeX * ppmAt(t);
  const yAt = degenerate
    ? (t: number) => nearGroundY + (farGroundY - nearGroundY) * t
    : (t: number) => baseY + slopeY * ppmAt(t);

  // d(screenX)/d(length in metres): x(t) = baseX + slopeX * ppm(t), and dppm/dt = -dInv * ppm²,
  // so |dx/dt| = |slopeX * dInv| * ppm², divided by lengthM to get per-metre.
  const safeLen = Math.max(0.0001, lengthM);
  const alongPxPerM = (t: number): number => {
    if (degenerate) return Math.abs(farX - nearX) / safeLen;
    const p = ppmAt(t);
    return Math.abs(slopeX * dInv) * p * p / safeLen;
  };

  return {
    sideSign,
    nearX,
    nearGroundY,
    nearPpm,
    farX,
    farGroundY,
    farPpm,
    lengthM,
    spanPx: Math.abs(farX - nearX),
    xAt,
    yAt,
    ppmAt,
    alongPxPerM,
  };
}

// ---------------------------------------------------------------------------
// Front faces — what the player sees of an overtaken vehicle's nose. Each type
// gets its own treatment; a semi's flat cab front and a sedan's raked hood are
// nothing alike, and the old shared "dark rect + two lamp pixels" read as a lid
// on an open box rather than a vehicle front.
// ---------------------------------------------------------------------------

function drawSedanFront(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 1.9));
  const h = Math.max(2, Math.round(ppm * 1.5));
  const body = mixColorLocal(color, 0x000000, 0.22);

  // Nose block — slightly darker than the rear face since it faces away from the light.
  g.rect(x - w / 2, groundY - h, w, h).fill({ color: body, alpha: a });
  if (w < 4) return;

  const bodyH = Math.round(h * 0.62);
  const roofH = h - bodyH;
  const cabinW = Math.round(w * 0.66);

  // Raked windshield — a trapezoid narrowing toward the roof, which is what actually
  // distinguishes a car's front from its flat-ish rear glass.
  const glassTopW = Math.round(cabinW * 0.78);
  const glassBotW = cabinW;
  const glassTop = groundY - h + Math.max(1, Math.round(roofH * 0.14));
  const glassBot = groundY - bodyH - Math.max(1, Math.round(roofH * 0.1));
  g.poly([
    x - glassTopW / 2, glassTop,
    x + glassTopW / 2, glassTop,
    x + glassBotW / 2, glassBot,
    x - glassBotW / 2, glassBot,
  ]).fill({ color: 0x0984e3, alpha: a * 0.62 });
  if (w > 8) {
    // Wiper pair parked along the windshield base
    g.rect(x - Math.round(cabinW * 0.34), glassBot - 1, Math.round(cabinW * 0.28), 1).fill({ color: 0x1e272e, alpha: a * 0.55 });
    g.rect(x + Math.round(cabinW * 0.06), glassBot - 1, Math.round(cabinW * 0.28), 1).fill({ color: 0x1e272e, alpha: a * 0.55 });
  }

  // Hood line — the crease where the bonnet meets the windshield base
  g.rect(x - w / 2, groundY - bodyH, w, Math.max(1, Math.round(h * 0.02))).fill({ color: mixColorLocal(body, 0xffffff, 0.28), alpha: a * 0.65 });

  // Grille bar, centred between the headlamps
  const grilleW = Math.round(w * 0.4);
  const grilleH = Math.max(1, Math.round(bodyH * 0.2));
  const grilleY = groundY - Math.round(bodyH * 0.62);
  g.rect(x - grilleW / 2, grilleY, grilleW, grilleH).fill({ color: 0x11141a, alpha: a * 0.85 });
  if (w > 10) {
    g.rect(x - grilleW / 2, grilleY + Math.round(grilleH * 0.5), grilleW, 1).fill({ color: 0x5f6a72, alpha: a * 0.5 });
  }

  // Angular headlight pair — wedges swept toward the centre, not squares.
  if (w > 5) {
    const lampW = Math.max(2, Math.round(w * 0.2));
    const lampH = Math.max(1, Math.round(bodyH * 0.2));
    const lampY = grilleY;
    const lx = x - w / 2 + Math.max(1, Math.round(w * 0.04));
    g.poly([
      lx, lampY,
      lx + lampW, lampY + Math.round(lampH * 0.3),
      lx + lampW, lampY + lampH,
      lx, lampY + lampH,
    ]).fill({ color: 0xfff9c4, alpha: a * 0.85 });
    const rx = x + w / 2 - Math.max(1, Math.round(w * 0.04));
    g.poly([
      rx, lampY,
      rx - lampW, lampY + Math.round(lampH * 0.3),
      rx - lampW, lampY + lampH,
      rx, lampY + lampH,
    ]).fill({ color: 0xfff9c4, alpha: a * 0.85 });
  }

  // Bumper + lower air intake
  const bumperH = Math.max(1, Math.round(bodyH * 0.16));
  g.rect(x - w / 2, groundY - bumperH * 2, w, bumperH).fill({ color: 0x1e272e, alpha: a * 0.8 });
  if (w > 9) {
    const intakeW = Math.round(w * 0.5);
    g.rect(x - intakeW / 2, groundY - bumperH, intakeW, bumperH).fill({ color: 0x11141a, alpha: a * 0.7 });
  }

  // Front wheel hints at both base corners
  if (w > 6) {
    const r = Math.max(1, ppm * 0.29);
    drawWheel(g, x - Math.round(w * 0.37), groundY, r, a * 0.9);
    drawWheel(g, x + Math.round(w * 0.37), groundY, r, a * 0.9);
    // Wheel arches over each tyre
    const archW = Math.max(2, Math.round(w * 0.22));
    const archH = Math.max(1, Math.round(bodyH * 0.3));
    g.rect(x - Math.round(w * 0.37) - archW / 2, groundY - archH, archW, 1).fill({ color: 0x0f0e17, alpha: a * 0.6 });
    g.rect(x + Math.round(w * 0.37) - archW / 2, groundY - archH, archW, 1).fill({ color: 0x0f0e17, alpha: a * 0.6 });
  }
}

function drawTruckFront(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 2.6));
  const h = Math.max(2, Math.round(ppm * 4.0));
  const body = mixColorLocal(color, 0x000000, 0.22);

  // Cab front is a flat wall the full width of the trailer, but only the lower ~62% of a
  // semi's height is cab — above that is the trailer roofline behind it.
  const cabTop = groundY - Math.round(h * 0.62);
  g.rect(x - w / 2, groundY - h, w, h).fill({ color: mixColorLocal(color, 0x000000, 0.34), alpha: a });
  g.rect(x - w / 2, cabTop, w, groundY - cabTop).fill({ color: body, alpha: a });
  if (w < 4) return;

  const cabH = groundY - cabTop;

  // Sun-visor strip along the top of the cab
  const visorH = Math.max(1, Math.round(cabH * 0.1));
  g.rect(x - w / 2, cabTop, w, visorH).fill({ color: mixColorLocal(body, 0x000000, 0.4), alpha: a * 0.9 });

  // Large flat-front windshield, split by a centre pillar
  const glassW = Math.round(w * 0.84);
  const glassH = Math.max(1, Math.round(cabH * 0.3));
  const glassY = cabTop + visorH + Math.max(1, Math.round(cabH * 0.04));
  g.rect(x - glassW / 2, glassY, glassW, glassH).fill({ color: 0x0984e3, alpha: a * 0.6 });
  if (w > 9) {
    g.rect(x - 1, glassY, 1, glassH).fill({ color: 0x11141a, alpha: a * 0.55 });
    // Wipers along the glass base
    g.rect(x - Math.round(glassW * 0.42), glassY + glassH - 1, Math.round(glassW * 0.34), 1).fill({ color: 0x1e272e, alpha: a * 0.5 });
    g.rect(x + Math.round(glassW * 0.08), glassY + glassH - 1, Math.round(glassW * 0.34), 1).fill({ color: 0x1e272e, alpha: a * 0.5 });
  }

  // Horizontal chrome grille slats
  const grilleW = Math.round(w * 0.56);
  const grilleTop = glassY + glassH + Math.max(1, Math.round(cabH * 0.06));
  const grilleH = Math.max(2, Math.round(cabH * 0.26));
  g.rect(x - grilleW / 2, grilleTop, grilleW, grilleH).fill({ color: 0x11141a, alpha: a * 0.9 });
  const slats = Math.max(2, Math.min(6, Math.round(grilleH / 2)));
  for (let i = 0; i < slats; i++) {
    const sy = grilleTop + Math.round((grilleH / slats) * i) + 1;
    g.rect(x - grilleW / 2 + 1, sy, grilleW - 2, 1).fill({ color: 0xb2bec3, alpha: a * 0.55 });
  }

  // Headlight pair flanking the grille
  if (w > 6) {
    const lampW = Math.max(2, Math.round(w * 0.14));
    const lampH = Math.max(1, Math.round(cabH * 0.12));
    const lampY = grilleTop + Math.round(grilleH * 0.35);
    g.rect(x - w / 2 + 1, lampY, lampW, lampH).fill({ color: 0xfff9c4, alpha: a * 0.85 });
    g.rect(x + w / 2 - 1 - lampW, lampY, lampW, lampH).fill({ color: 0xfff9c4, alpha: a * 0.85 });
    // Amber indicator beneath each headlamp
    g.rect(x - w / 2 + 1, lampY + lampH + 1, lampW, Math.max(1, Math.round(lampH * 0.4))).fill({ color: 0xffa502, alpha: a * 0.75 });
    g.rect(x + w / 2 - 1 - lampW, lampY + lampH + 1, lampW, Math.max(1, Math.round(lampH * 0.4))).fill({ color: 0xffa502, alpha: a * 0.75 });
  }

  // Side mirrors on stalks, standing proud of the cab width
  if (w > 8) {
    const mirW = Math.max(1, Math.round(w * 0.07));
    const mirH = Math.max(2, Math.round(cabH * 0.2));
    const mirY = glassY + Math.round(glassH * 0.1);
    g.rect(x - w / 2 - mirW, mirY, mirW, mirH).fill({ color: 0x1e272e, alpha: a * 0.9 });
    g.rect(x + w / 2, mirY, mirW, mirH).fill({ color: 0x1e272e, alpha: a * 0.9 });
  }

  // Heavy steel bumper
  const bumperH = Math.max(1, Math.round(cabH * 0.12));
  g.rect(x - w / 2, groundY - bumperH * 2, w, bumperH).fill({ color: 0x596275, alpha: a * 0.85 });
  g.rect(x - w / 2, groundY - bumperH * 2, w, 1).fill({ color: 0xb2bec3, alpha: a * 0.4 });

  // Steer axle
  if (w > 6) {
    const r = Math.max(1, ppm * 0.5);
    drawWheel(g, x - Math.round(w * 0.36), groundY, r, a * 0.9);
    drawWheel(g, x + Math.round(w * 0.36), groundY, r, a * 0.9);
  }
}

function drawBusFront(g: Graphics, x: number, groundY: number, ppm: number, color: number, a: number): void {
  const w = Math.max(2, Math.round(ppm * 2.5));
  const h = Math.max(2, Math.round(ppm * 3.2));
  const body = mixColorLocal(color, 0x000000, 0.22);

  g.rect(x - w / 2, groundY - h, w, h).fill({ color: body, alpha: a });
  if (w < 4) return;

  // Roofline highlight, matching the rear face's treatment
  g.rect(x - w / 2, groundY - h, w, Math.max(1, Math.round(h * 0.03))).fill({ color: 0xffffff, alpha: a * 0.3 });

  // Destination-sign band — same amber styling the rear face uses
  const bandY = groundY - h + Math.round(h * 0.08);
  const bandH = Math.max(1, Math.round(h * 0.09));
  g.rect(x - Math.round(w * 0.42), bandY, Math.round(w * 0.84), bandH).fill({ color: 0xf4d160, alpha: a * 0.75 });
  if (w > 12) {
    // Route glyphs on the sign
    for (let i = 0; i < 3; i++) {
      g.rect(x - Math.round(w * 0.3) + i * Math.round(w * 0.12), bandY + 1, Math.max(1, Math.round(w * 0.05)), Math.max(1, bandH - 2)).fill({ color: 0x2d1c00, alpha: a * 0.6 });
    }
  }

  // Wide flat windshield spanning nearly the full width
  const glassW = Math.round(w * 0.88);
  const glassH = Math.max(1, Math.round(h * 0.24));
  const glassY = bandY + bandH + Math.max(1, Math.round(h * 0.03));
  g.rect(x - glassW / 2, glassY, glassW, glassH).fill({ color: 0x0984e3, alpha: a * 0.6 });
  if (w > 9) {
    // Centre pillar + wiper hints
    g.rect(x - 1, glassY, 1, glassH).fill({ color: 0x11141a, alpha: a * 0.5 });
    g.rect(x - Math.round(glassW * 0.44), glassY + glassH - 1, Math.round(glassW * 0.36), 1).fill({ color: 0x1e272e, alpha: a * 0.55 });
    g.rect(x + Math.round(glassW * 0.08), glassY + glassH - 1, Math.round(glassW * 0.36), 1).fill({ color: 0x1e272e, alpha: a * 0.55 });
  }

  // Livery accent stripe — same as the rear face's
  const stripeH = Math.max(1, Math.round(h * 0.03));
  g.rect(x - w / 2, groundY - Math.round(h * 0.52), w, stripeH).fill({ color: mixColorLocal(color, 0xffffff, 0.5), alpha: a * 0.6 });

  // Grille panel + headlight pair beneath the glass
  const grilleW = Math.round(w * 0.44);
  const grilleH = Math.max(1, Math.round(h * 0.07));
  const grilleY = groundY - Math.round(h * 0.26);
  g.rect(x - grilleW / 2, grilleY, grilleW, grilleH).fill({ color: 0x11141a, alpha: a * 0.85 });
  if (w > 6) {
    const lampW = Math.max(2, Math.round(w * 0.13));
    const lampH = Math.max(1, Math.round(h * 0.06));
    g.rect(x - w / 2 + Math.max(1, Math.round(w * 0.04)), grilleY, lampW, lampH).fill({ color: 0xfff9c4, alpha: a * 0.85 });
    g.rect(x + w / 2 - Math.max(1, Math.round(w * 0.04)) - lampW, grilleY, lampW, lampH).fill({ color: 0xfff9c4, alpha: a * 0.85 });
  }

  // Bumper
  const bumperH = Math.max(1, Math.round(h * 0.06));
  g.rect(x - w / 2, groundY - bumperH, w, bumperH).fill({ color: 0x1e272e, alpha: a * 0.8 });

  // Front axle
  if (w > 6) {
    const r = Math.max(1, ppm * 0.4);
    drawWheel(g, x - Math.round(w * 0.34), groundY, r, a * 0.9);
    drawWheel(g, x + Math.round(w * 0.34), groundY, r, a * 0.9);
  }
}

// ---------------------------------------------------------------------------
// Side faces — the flank the camera sees whenever the vehicle sits off the
// forward axis (most of the time). Detail is placed by length fraction t via
// SideGeom so everything foreshortens correctly from the near (rear) end to the
// far (front) end instead of being smeared across one flat scale.
// ---------------------------------------------------------------------------

/** Fills the side quad between two length fractions at a given height band, expressed in
 * metres above the ground. Both edges use their own local ppm, so the panel tapers with
 * perspective exactly like the face it sits on. */
function sidePanel(
  g: Graphics,
  s: SideGeom,
  t0: number,
  t1: number,
  yBottomM: number,
  yTopM: number,
  color: number,
  alpha: number
): void {
  const x0 = s.xAt(t0), x1 = s.xAt(t1);
  const g0 = s.yAt(t0), g1 = s.yAt(t1);
  const p0 = s.ppmAt(t0), p1 = s.ppmAt(t1);
  g.poly([
    x0, g0 - yBottomM * p0,
    x1, g1 - yBottomM * p1,
    x1, g1 - yTopM * p1,
    x0, g0 - yTopM * p0,
  ]).fill({ color, alpha });
}

/** A wheel on the side face, positioned by length fraction.
 *
 * Its *height* scales with the across-face ppm, but its *width* runs along the track and so
 * must use the far smaller along-track scale — a wheel is a circle in the vehicle's own frame,
 * but the camera sees that circle foreshortened into an ellipse. Sizing the width from the
 * across-face ppm (as an earlier version did) made a single wheel nearly as wide as an entire
 * 11m flank, so wheels burst clean out of the bodywork and read as detached blobs. */
function sideWheel(g: Graphics, s: SideGeom, t: number, radiusM: number, alpha: number): void {
  const rVert = Math.max(1, radiusM * s.ppmAt(t));
  const rHoriz = Math.max(0.6, radiusM * s.alongPxPerM(t));
  const x = s.xAt(t);
  const cy = s.yAt(t) - rVert;

  g.ellipse(x, cy, rHoriz, rVert).fill({ color: 0x14161a, alpha: alpha * 0.95 });
  // Rim, only once the tyre is wide enough for anything to read inside it.
  if (rHoriz >= 2 && rVert >= 2) {
    g.ellipse(x, cy, rHoriz * 0.5, rVert * 0.52).fill({ color: 0x9aa5ad, alpha: alpha * 0.75 });
  }
  if (rHoriz >= 4 && rVert >= 4) {
    g.ellipse(x, cy, rHoriz * 0.18, rVert * 0.2).fill({ color: 0x2d3436, alpha: alpha * 0.9 });
  }
}

/** Arch line above a side wheel — the dark crescent that stops a tyre reading as a sticker.
 * Its length runs along the track, so it uses the along-track scale for the same reason
 * sideWheel's width does. */
function sideArch(g: Graphics, s: SideGeom, t: number, halfLenM: number, heightM: number, alpha: number): void {
  const p = s.ppmAt(t);
  const x = s.xAt(t);
  const gy = s.yAt(t);
  const half = Math.max(1, halfLenM * s.alongPxPerM(t));
  g.rect(x - half, gy - heightM * p, half * 2, Math.max(1, Math.round(p * 0.05))).fill({ color: 0x0f0e17, alpha: alpha * 0.65 });
}

function drawSedanSide(g: Graphics, s: SideGeom, color: number, a: number): void {
  const bodyM = 1.5;
  const beltM = bodyM * 0.62;            // top of the lower body / bottom of the glass
  const flank = mixColorLocal(color, 0x000000, 0.42);
  const nearPpm = s.nearPpm;

  // Lower flank, full length
  sidePanel(g, s, 0, 1, 0, beltM, flank, a * 0.9);
  // Cabin flank — a sedan's greenhouse is inset from both ends (boot behind, bonnet ahead)
  sidePanel(g, s, 0.2, 0.68, beltM, bodyM, mixColorLocal(color, 0x000000, 0.34), a * 0.9);
  // Bonnet + boot decks, lower than the roof
  sidePanel(g, s, 0.68, 1, beltM, beltM + (bodyM - beltM) * 0.18, mixColorLocal(color, 0x000000, 0.3), a * 0.85);
  sidePanel(g, s, 0, 0.2, beltM, beltM + (bodyM - beltM) * 0.22, mixColorLocal(color, 0x000000, 0.3), a * 0.85);

  if (nearPpm < 8 || s.spanPx < SIDE_DETAIL_MIN_SPAN_PX) {
    // Too small for glazing detail — just keep the leading-edge crease so the box still reads.
    g.poly([s.nearX, s.nearGroundY - bodyM * s.nearPpm, s.nearX, s.nearGroundY]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });
    return;
  }

  // Side windows: rear quarter light, rear door, front door — separated by a B-pillar.
  const glassBot = beltM + (bodyM - beltM) * 0.16;
  const glassTop = bodyM - (bodyM - beltM) * 0.2;
  const windows: Array<[number, number]> = [[0.23, 0.36], [0.39, 0.5], [0.53, 0.65]];
  for (const [t0, t1] of windows) {
    sidePanel(g, s, t0, t1, glassBot, glassTop, 0x0984e3, a * 0.6);
  }
  // B-pillar between the two door windows
  sidePanel(g, s, 0.5, 0.53, glassBot, glassTop, mixColorLocal(color, 0x000000, 0.55), a * 0.9);

  // Door seam between front and rear door
  const seamP = s.ppmAt(0.51);
  const seamX = s.xAt(0.51);
  const seamG = s.yAt(0.51);
  g.rect(seamX, seamG - beltM * seamP, 1, Math.max(1, beltM * seamP * 0.85)).fill({ color: 0x0f0e17, alpha: a * 0.45 });

  // Rocker-panel accent stripe low on the flank
  sidePanel(g, s, 0.02, 0.98, beltM * 0.22, beltM * 0.3, mixColorLocal(color, 0xffffff, 0.4), a * 0.45);

  // Side mirror, just ahead of the front door glass
  if (nearPpm > 12) {
    const mp = s.ppmAt(0.66);
    const mx = s.xAt(0.66);
    const mg = s.yAt(0.66);
    const mw = Math.max(1, Math.round(mp * 0.16));
    g.rect(mx - (s.sideSign < 0 ? mw : 0), mg - glassBot * mp - Math.max(1, Math.round(mp * 0.1)), mw, Math.max(1, Math.round(mp * 0.14))).fill({ color: 0x1e272e, alpha: a * 0.85 });
  }

  // Wheels: near end of the face = the rear wheel (closest to camera), far end = front wheel.
  sideArch(g, s, 0.19, 0.42, beltM * 0.62, a);
  sideArch(g, s, 0.79, 0.42, beltM * 0.62, a);
  sideWheel(g, s, 0.19, 0.31, a * 0.95);
  sideWheel(g, s, 0.79, 0.31, a * 0.95);

  // Leading-edge crease so the flank separates from the front cap
  g.poly([s.nearX, s.nearGroundY - bodyM * s.nearPpm, s.nearX, s.nearGroundY]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });
}

function drawTruckSide(g: Graphics, s: SideGeom, color: number, a: number): void {
  const trailerM = 4.0;
  const cabM = 3.0;
  const flank = mixColorLocal(color, 0x000000, 0.42);
  const nearPpm = s.nearPpm;

  // A 14m semi is mostly trailer: the rear ~72% is the tall flat box wall, then the cab.
  const cabStart = 0.74;
  sidePanel(g, s, 0, cabStart, 0, trailerM, flank, a * 0.9);
  // Cab is shorter than the trailer it tows — that step is the whole silhouette.
  sidePanel(g, s, cabStart, 1, 0, cabM, mixColorLocal(color, 0x000000, 0.32), a * 0.9);

  if (nearPpm < 8 || s.spanPx < SIDE_DETAIL_MIN_SPAN_PX) {
    g.poly([s.nearX, s.nearGroundY - trailerM * s.nearPpm, s.nearX, s.nearGroundY]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });
    return;
  }

  // Trailer wall ribs — evenly spaced vertical creases along the long flat panel
  const ribs = 7;
  for (let i = 1; i < ribs; i++) {
    const t = (cabStart / ribs) * i;
    const p = s.ppmAt(t);
    g.rect(s.xAt(t), s.yAt(t) - trailerM * p, 1, Math.max(1, trailerM * p * 0.9)).fill({ color: 0x0f0e17, alpha: a * 0.22 });
  }
  // Top rail highlight along the trailer
  sidePanel(g, s, 0, cabStart, trailerM * 0.96, trailerM, mixColorLocal(color, 0xffffff, 0.3), a * 0.4);
  // Reflective side stripe, matching the rear face's hazard palette
  sidePanel(g, s, 0.02, cabStart, trailerM * 0.16, trailerM * 0.22, 0xfffffe, a * 0.35);

  // Cab door + window
  sidePanel(g, s, 0.82, 0.96, cabM * 0.52, cabM * 0.82, 0x0984e3, a * 0.6);
  const doorP = s.ppmAt(0.81);
  g.rect(s.xAt(0.81), s.yAt(0.81) - cabM * 0.86 * doorP, 1, Math.max(1, cabM * 0.8 * doorP)).fill({ color: 0x0f0e17, alpha: a * 0.45 });
  // Grab handle / step below the door
  sidePanel(g, s, 0.85, 0.93, cabM * 0.16, cabM * 0.2, 0x596275, a * 0.5);

  // Fuel-tank cylinder hint, slung behind the cab. Its length lies along the track, so — like
  // the wheels — its on-screen width comes from the along-track scale; using the across-face
  // ppm made it a grey blob wider than the cab it hangs off.
  const tankT = 0.78;
  const tankP = s.ppmAt(tankT);
  const tankX = s.xAt(tankT);
  const tankG = s.yAt(tankT);
  const tankR = Math.max(1, tankP * 0.38);
  const tankHalfLen = Math.max(1, 0.9 * s.alongPxPerM(tankT));
  g.ellipse(tankX, tankG - tankR * 1.6, tankHalfLen, tankR).fill({ color: 0xb2bec3, alpha: a * 0.7 });
  g.ellipse(tankX, tankG - tankR * 1.6, tankHalfLen, tankR).stroke({ width: 1, color: 0x596275, alpha: a * 0.5 });

  // Skirt shadow under the trailer floor
  sidePanel(g, s, 0, cabStart, 0, trailerM * 0.1, 0x0a0a12, a * 0.5);

  // Axles: tandem rear pair on the trailer (two close together — a semi never has one),
  // plus the cab's drive and steer wheels.
  const rearTs = [0.1, 0.19];
  for (const t of rearTs) {
    sideArch(g, s, t, 0.6, 1.15, a);
    sideWheel(g, s, t, 0.52, a * 0.95);
  }
  sideArch(g, s, 0.72, 0.6, 1.15, a);
  sideWheel(g, s, 0.72, 0.52, a * 0.95);
  sideArch(g, s, 0.96, 0.6, 1.1, a);
  sideWheel(g, s, 0.96, 0.5, a * 0.95);

  g.poly([s.nearX, s.nearGroundY - trailerM * s.nearPpm, s.nearX, s.nearGroundY]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });
}

function drawBusSide(g: Graphics, s: SideGeom, color: number, a: number): void {
  const bodyM = 3.2;
  const flank = mixColorLocal(color, 0x000000, 0.42);
  const nearPpm = s.nearPpm;

  sidePanel(g, s, 0, 1, 0, bodyM, flank, a * 0.9);
  // Roofline highlight, as on the rear face
  sidePanel(g, s, 0, 1, bodyM * 0.97, bodyM, mixColorLocal(color, 0xffffff, 0.35), a * 0.45);

  if (nearPpm < 8 || s.spanPx < SIDE_DETAIL_MIN_SPAN_PX) {
    g.poly([s.nearX, s.nearGroundY - bodyM * s.nearPpm, s.nearX, s.nearGroundY]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });
    return;
  }

  // Single row of passenger windows running the length — the same glass styling the rear
  // face's two rows use, adapted to a side profile.
  const winBot = bodyM * 0.55;
  const winTop = bodyM * 0.82;
  const count = 8;
  for (let i = 0; i < count; i++) {
    const t0 = 0.04 + (0.86 / count) * i;
    const t1 = t0 + (0.86 / count) * 0.78;
    sidePanel(g, s, t0, t1, winBot, winTop, 0x0984e3, a * 0.62);
  }

  // Accordion door near the front — two leaves with a centre seam
  const doorT0 = 0.9, doorT1 = 0.985;
  sidePanel(g, s, doorT0, doorT1, bodyM * 0.1, winTop, mixColorLocal(color, 0x000000, 0.55), a * 0.85);
  sidePanel(g, s, doorT0 + 0.008, (doorT0 + doorT1) / 2 - 0.004, bodyM * 0.16, winTop - bodyM * 0.04, 0x0984e3, a * 0.5);
  sidePanel(g, s, (doorT0 + doorT1) / 2 + 0.004, doorT1 - 0.008, bodyM * 0.16, winTop - bodyM * 0.04, 0x0984e3, a * 0.5);

  // Livery accent stripe — same colour/placement the rear face uses
  sidePanel(g, s, 0, 1, bodyM * 0.48, bodyM * 0.51, mixColorLocal(color, 0xffffff, 0.5), a * 0.6);

  // Skirt shadow along the sills
  sidePanel(g, s, 0, 1, 0, bodyM * 0.08, 0x0a0a12, a * 0.45);

  // Dual rear wheel (two tyres side by side on one axle, drawn as a close pair) and a single
  // front wheel tucked just behind the cab door.
  sideArch(g, s, 0.14, 0.55, 1.0, a);
  sideWheel(g, s, 0.12, 0.44, a * 0.9);
  sideWheel(g, s, 0.17, 0.44, a * 0.95);
  sideArch(g, s, 0.86, 0.5, 1.0, a);
  sideWheel(g, s, 0.86, 0.42, a * 0.95);

  g.poly([s.nearX, s.nearGroundY - bodyM * s.nearPpm, s.nearX, s.nearGroundY]).stroke({ width: 1, color: 0x0f0e17, alpha: a * 0.5 });
}

function drawDepthShell(
  g: Graphics,
  faces: DepthFaces,
  color: number,
  a: number,
  widthM: number,
  heightM: number,
  lengthM: number,
  lateralOffsetM: number,
  drawRearFace: FaceFn,
  drawFrontFace: FaceFn,
  drawSideFace: SideFn
): void {
  const {
    xNear, yNear, ppmNear, xFar, yFar, ppmFar,
    rearBehindCamera = false,
    visibleLengthM = lengthM,
  } = faces;
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

  // Front cap — closes the box's open far end. Never a literal photographed grille (the camera
  // never sees oncoming traffic on this straight one-way track), but a closed silhouette reads
  // as a solid vehicle from any angle — including the ~8.5m window where an overtaken vehicle
  // keeps rendering after being passed, which used to show an open-ended shell with nothing at
  // the front. Each type paints its own nose (raked sedan hood, flat semi cab, wide bus screen)
  // at the far end's own projected scale.
  if (wFar > 2) {
    drawFrontFace(g, xFar, yFar, ppmFar, color, a * 0.9);
  }

  // Side face — back-face culled: only the side actually facing the camera is drawn, chosen
  // from which side of the camera's forward axis the vehicle sits. Drawing both (or always
  // the same hardcoded one) is what made this read as flat width/height with no real box.
  if (Math.abs(lateralOffsetM) > SIDE_VISIBILITY_DEAD_ZONE_M) {
    const sideSign = lateralOffsetM > 0 ? -1 : 1;
    const nearSideX = xNear + (sideSign * wNear) / 2;
    const farSideX = xFar + (sideSign * wFar) / 2;
    drawSideFace(
      g,
      makeSideGeom(sideSign, nearSideX, yNear, ppmNear, farSideX, yFar, ppmFar, visibleLengthM),
      color,
      a
    );
  }

  // Once the camera is level with the vehicle's tail there is no rear face to see, and the
  // caller's near-plane clamp would otherwise scale it to cover the whole viewport (hiding the
  // front cap and flank that *are* genuinely visible). Stop here: the flank and nose already
  // drawn are the correct picture of a vehicle you are drawing alongside.
  if (rearBehindCamera) return;

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
  const frontFn = type === 'sedan' ? drawSedanFront : type === 'bus' ? drawBusFront : drawTruckFront;
  const sideFn = type === 'sedan' ? drawSedanSide : type === 'bus' ? drawBusSide : drawTruckSide;
  drawDepthShell(g, faces, color, a, dims.width, dims.height, dims.length, lateralOffsetM, rearFn, frontFn, sideFn);
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
