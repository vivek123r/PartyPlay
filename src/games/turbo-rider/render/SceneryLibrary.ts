import { Graphics } from 'pixi.js';
import { PixelFont } from './PixelFont';

type PropDraw = (g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1) => void;

function nearEdge(x: number, w: number, side: 1 | -1, gap = 3): number {
  return side > 0 ? x + gap : x - gap - w;
}

// ---------------------------------------------------------------------------
// Phase 0 — COASTAL INTRO
// ---------------------------------------------------------------------------

function palm(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const h = Math.max(8, Math.round(ppm * (5 + (hash % 3))));
  const trunkW = Math.max(1, Math.round(ppm * 0.26));
  const lean = Math.round(side * ppm * 0.5);
  const bx = side > 0 ? x + 4 : x - 4 - trunkW;
  const topX = bx + lean;
  const topY = groundY - h;

  g.poly([bx, groundY, bx + trunkW, groundY, topX + trunkW, topY, topX, topY]).fill({ color: 0x6b4a2a, alpha });
  g.poly([bx + trunkW * 0.3, groundY, bx + trunkW * 0.5, groundY, topX + trunkW * 0.5, topY, topX + trunkW * 0.3, topY])
    .fill({ color: 0x4a3220, alpha: alpha * 0.6 });

  const frondLen = Math.max(5, Math.round(ppm * 2.2));
  const dirs: [number, number][] = [[-1, -0.6], [-0.6, -1], [0, -1.1], [0.6, -1], [1, -0.6], [0.3, -0.25], [-0.3, -0.25]];
  for (const [dx, dy] of dirs) {
    g.poly([
      topX, topY,
      topX + dx * frondLen - frondLen * 0.16, topY + dy * frondLen * 0.6,
      topX + dx * frondLen + frondLen * 0.16, topY + dy * frondLen * 0.6,
    ]).fill({ color: 0x1e8a4a, alpha: alpha * 0.85 });
  }
  g.circle(topX, topY, Math.max(1, Math.round(ppm * 0.3))).fill({ color: 0x8a5a2a, alpha });
}

function beachHut(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const w = Math.max(6, Math.round(ppm * 2.4));
  const h = Math.max(6, Math.round(ppm * 2.0));
  const bx = nearEdge(x, w, side, 4);
  const stiltH = Math.round(h * 0.25);

  g.rect(bx + 2, groundY - stiltH, 2, stiltH).fill({ color: 0x5a3a20, alpha: alpha * 0.7 });
  g.rect(bx + w - 4, groundY - stiltH, 2, stiltH).fill({ color: 0x5a3a20, alpha: alpha * 0.7 });

  const wallH = h - stiltH;
  g.rect(bx, groundY - stiltH - wallH, w, wallH).fill({ color: (hash & 1) ? 0xf0e4c8 : 0xe8d5b0, alpha });
  g.rect(bx + Math.round(w * 0.4), groundY - stiltH, Math.round(w * 0.2), Math.round(wallH * 0.6))
    .fill({ color: 0x3a2818, alpha: alpha * 0.8 });

  // Thatch roof
  const roofH = Math.round(h * 0.35);
  g.poly([
    bx - 2, groundY - stiltH - wallH,
    bx + w / 2, groundY - stiltH - wallH - roofH,
    bx + w + 2, groundY - stiltH - wallH,
  ]).fill({ color: 0xa07840, alpha });
}

function rockStack(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const sizes = [0.9, 0.65, 0.42];
  let by = groundY;
  const bx = side > 0 ? x + 5 : x - 5;
  for (let i = 0; i < 3; i++) {
    const rw = Math.max(2, Math.round(ppm * sizes[i]));
    const rh = Math.max(2, Math.round(rw * 0.75));
    g.ellipse(bx, by - rh * 0.4, rw / 2, rh / 2).fill({ color: i === 0 ? 0x8a8478 : 0x9a9488, alpha });
    g.ellipse(bx - rw * 0.15, by - rh * 0.55, rw * 0.2, rh * 0.15).fill({ color: 0xb8b2a4, alpha: alpha * 0.6 });
    by -= rh * 0.7;
  }
  if (hash % 3 === 0) {
    g.rect(bx - 1, groundY - Math.round(ppm * 0.5), 2, Math.round(ppm * 0.5)).fill({ color: 0x1e8a4a, alpha: alpha * 0.7 });
  }
}

function guardRail(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const postH = Math.max(3, Math.round(ppm * 0.6));
  const postW = Math.max(1, Math.round(ppm * 0.12));
  const bx = side > 0 ? x + 1 : x - 1 - postW;
  g.rect(bx, groundY - postH, postW, postH).fill({ color: 0xdcdde1, alpha });
  g.rect(bx - postW, groundY - Math.round(postH * 0.7), postW * 3, Math.max(1, Math.round(postH * 0.16)))
    .fill({ color: 0xff4757, alpha: alpha * 0.8 });
}

// ---------------------------------------------------------------------------
// Phase 1 — ALPINE MOUNTAIN CLIMB
// ---------------------------------------------------------------------------

function pine(tall: boolean) {
  return (g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void => {
    const h = Math.max(8, Math.round(ppm * (tall ? 6 + (hash % 3) : 3.5 + (hash % 2))));
    const trunkW = Math.max(1, Math.round(ppm * 0.16));
    const trunkH = Math.round(h * 0.2);
    const canopyH = h - trunkH;
    const canopyW = Math.round(canopyH * 0.55);
    const bx = side > 0 ? x + 3 : x - 3 - trunkW;
    const cx = bx + trunkW / 2;

    g.rect(bx, groundY - trunkH, trunkW, trunkH).fill({ color: 0x4a2818, alpha });
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
      const t0 = t / tiers, t1 = (t + 1) / tiers;
      const y0 = groundY - trunkH - canopyH * t0;
      const y1 = groundY - trunkH - canopyH * t1;
      const w0 = canopyW * (1 - t0) * 0.9 + canopyW * 0.15;
      g.poly([cx - w0 / 2, y0, cx + w0 / 2, y0, cx, y1]).fill({ color: 0x1a4a22, alpha: alpha * (0.85 + t * 0.05) });
    }
    if (tall && hash % 4 === 0) {
      g.poly([cx - canopyW * 0.12, groundY - h, cx + canopyW * 0.12, groundY - h, cx, groundY - h - canopyH * 0.12])
        .fill({ color: 0xffffff, alpha: alpha * 0.7 });
    }
  };
}
const pineTall = pine(true);
const pineShort = pine(false);

function boulder(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const w = Math.max(4, Math.round(ppm * (1.2 + (hash % 3) * 0.3)));
  const h = Math.round(w * 0.75);
  const bx = side > 0 ? x + 3 : x - 3 - w;
  g.poly([
    bx, groundY, bx - w * 0.05, groundY - h * 0.4, bx + w * 0.25, groundY - h,
    bx + w * 0.7, groundY - h * 0.85, bx + w, groundY - h * 0.3, bx + w * 0.9, groundY,
  ]).fill({ color: 0x5a6069, alpha });
  g.poly([bx + w * 0.2, groundY - h * 0.5, bx + w * 0.4, groundY - h * 0.85, bx + w * 0.55, groundY - h * 0.6])
    .fill({ color: 0x767c84, alpha: alpha * 0.6 });
}

function cliff(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const w = Math.max(6, Math.round(ppm * 2.2));
  const h = Math.max(10, Math.round(ppm * (7 + (hash % 3))));
  const bx = side > 0 ? x + 2 : x - 2 - w;
  const jag = side > 0 ? w * 0.15 : -w * 0.15;
  g.poly([
    bx, groundY, bx, groundY - h * 0.6, bx + jag, groundY - h * 0.8, bx + w * 0.4, groundY - h,
    bx + w, groundY - h * 0.7, bx + w, groundY,
  ]).fill({ color: 0x454b52, alpha });
  for (let i = 0; i < 3; i++) {
    const ly = groundY - h * (0.25 + i * 0.22);
    g.rect(bx + w * 0.1, ly, w * 0.8, 1).fill({ color: 0x2f3438, alpha: alpha * 0.4 });
  }
  if (hash % 3 === 0) {
    g.poly([bx + w * 0.3, groundY - h, bx + w * 0.5, groundY - h * 0.94, bx + w * 0.42, groundY - h * 0.82])
      .fill({ color: 0xffffff, alpha: alpha * 0.6 });
  }
}

function snowPatch(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const w = Math.max(4, Math.round(ppm * 1.4));
  const bx = side > 0 ? x + 1 : x - 1 - w;
  g.ellipse(bx + w / 2, groundY - 1, w / 2, Math.max(1, w * 0.22)).fill({ color: 0xf4f8ff, alpha: alpha * 0.75 });
}

function fence(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const postH = Math.max(3, Math.round(ppm * 0.7));
  const spanW = Math.max(6, Math.round(ppm * 1.8));
  const bx = side > 0 ? x + 2 : x - 2 - spanW;
  const postW = Math.max(1, Math.round(ppm * 0.1));
  g.rect(bx, groundY - postH, postW, postH).fill({ color: 0x6b4a2a, alpha });
  g.rect(bx + spanW - postW, groundY - postH, postW, postH).fill({ color: 0x6b4a2a, alpha });
  g.rect(bx, groundY - postH, spanW, Math.max(1, Math.round(postH * 0.12))).fill({ color: 0x8a6238, alpha: alpha * 0.8 });
  g.poly([bx, groundY, bx + spanW, groundY - postH]).stroke({ width: 1, color: 0x8a6238, alpha: alpha * 0.6 });
}

// ---------------------------------------------------------------------------
// Phase 2 — OCEAN SUSPENSION BRIDGE
// ---------------------------------------------------------------------------

function bridgeTower(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const w = Math.max(4, Math.round(ppm * 1.0));
  const h = Math.max(16, Math.round(ppm * 9));
  const bx = side > 0 ? x + 3 : x - 3 - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x8a949c, alpha });
  g.rect(bx, groundY - h, w, Math.max(1, Math.round(h * 0.02))).fill({ color: 0xdfe6e9, alpha: alpha * 0.6 });
  const braces = 4;
  for (let i = 1; i < braces; i++) {
    const by = groundY - (h / braces) * i;
    g.rect(bx, by, w, 1).fill({ color: 0x5a6069, alpha: alpha * 0.6 });
  }
  // Cable sag lines toward the vanishing point and back toward the camera
  g.moveTo(bx + w / 2, groundY - h).lineTo(bx + w / 2 + w * 6, groundY - h * 0.55)
    .stroke({ width: 1, color: 0x2f3438, alpha: alpha * 0.5 });
  g.moveTo(bx + w / 2, groundY - h).lineTo(bx + w / 2 - w * 4, groundY - h * 0.4)
    .stroke({ width: 1, color: 0x2f3438, alpha: alpha * 0.5 });
}

function buoy(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const w = Math.max(2, Math.round(ppm * 0.5));
  const h = Math.max(2, Math.round(ppm * 0.6));
  const bx = side > 0 ? x + 6 : x - 6 - w;
  g.ellipse(bx + w / 2, groundY, w / 2, Math.max(1, h * 0.25)).fill({ color: 0xff4757, alpha });
  g.rect(bx + w * 0.3, groundY - h, w * 0.4, h * 0.6).fill({ color: 0xfffffe, alpha: alpha * 0.9 });
}

function lampPostBridge(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const h = Math.max(6, Math.round(ppm * 2.6));
  const w = Math.max(1, Math.round(ppm * 0.14));
  const bx = side > 0 ? x + 1 : x - 1 - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x2f3438, alpha });
  g.circle(bx + w / 2, groundY - h, Math.max(1, Math.round(ppm * 0.3))).fill({ color: 0xfff2b8, alpha: alpha * 0.85 });
  g.circle(bx + w / 2, groundY - h, Math.max(2, Math.round(ppm * 0.6))).fill({ color: 0xfff2b8, alpha: alpha * 0.15 });
}

function railingPost(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const postH = Math.max(3, Math.round(ppm * 0.7));
  const postW = Math.max(1, Math.round(ppm * 0.1));
  const bx = side > 0 ? x + 1 : x - 1 - postW;
  g.rect(bx, groundY - postH, postW, postH).fill({ color: 0xdfe6e9, alpha });
  g.rect(bx - postW * 2, groundY - Math.round(postH * 0.8), postW * 5, Math.max(1, Math.round(postH * 0.14)))
    .fill({ color: 0x00cec9, alpha: alpha * 0.7 });
}

// ---------------------------------------------------------------------------
// Phase 3 — NEON UNDERGROUND TUNNEL
// ---------------------------------------------------------------------------

function tunnelRib(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const w = Math.max(3, Math.round(ppm * 0.7));
  const h = Math.max(14, Math.round(ppm * 6));
  const bx = side > 0 ? x : x - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x181824, alpha });
  g.rect(bx, groundY - h, Math.max(1, Math.round(w * 0.25)), h).fill({ color: 0x00f0ff, alpha: alpha * 0.55 });
  for (let i = 0; i < 3; i++) {
    g.rect(bx, groundY - h * (0.3 + i * 0.25), w, Math.max(1, Math.round(h * 0.02)))
      .fill({ color: 0x2a2a3a, alpha: alpha * 0.7 });
  }
}

function neonSign(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const w = Math.max(6, Math.round(ppm * 2.0));
  const h = Math.max(3, Math.round(ppm * 1.0));
  const y = groundY - Math.round(ppm * (2.5 + (hash % 3)));
  const bx = side > 0 ? x + 2 : x - 2 - w;
  const colors = [0xff2d95, 0x00f0ff, 0xf4d160, 0x55efc4];
  const color = colors[hash % colors.length];
  g.rect(bx, y, w, h).fill({ color: 0x0f0e17, alpha: alpha * 0.9 });
  g.rect(bx, y, w, h).stroke({ width: 1, color, alpha });
  const bars = 3;
  for (let i = 0; i < bars; i++) {
    const bw = w * (0.3 + ((hash + i) % 3) * 0.15);
    g.rect(bx + w * 0.1, y + h * (0.2 + i * 0.28), bw, Math.max(1, h * 0.14)).fill({ color, alpha: alpha * 0.85 });
  }
}

function pipeConduit(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const h = Math.max(10, Math.round(ppm * 5));
  const w = Math.max(1, Math.round(ppm * 0.3));
  const bx = side > 0 ? x + 1 : x - 1 - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x3a3a4a, alpha });
  const joints = 4;
  for (let i = 0; i <= joints; i++) {
    g.rect(bx - 1, groundY - (h / joints) * i, w + 2, Math.max(1, Math.round(ppm * 0.08)))
      .fill({ color: 0x1e1e28, alpha: alpha * 0.8 });
  }
}

function serviceDoor(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const w = Math.max(4, Math.round(ppm * 1.2));
  const h = Math.max(6, Math.round(ppm * 2.4));
  const bx = side > 0 ? x : x - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x2a2a38, alpha });
  g.rect(bx + w * 0.15, groundY - h * 0.85, w * 0.7, h * 0.3).fill({ color: 0x00f0ff, alpha: alpha * 0.35 });
  g.rect(bx, groundY - Math.max(1, h * 0.12), w, Math.max(1, h * 0.08)).fill({ color: 0xf4d160, alpha: alpha * 0.7 });
}

// ---------------------------------------------------------------------------
// Phase 4 — SYNTHWAVE SUNSET SPRINT
// ---------------------------------------------------------------------------

function synthPalm(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const h = Math.max(8, Math.round(ppm * (5 + (hash % 3))));
  const trunkW = Math.max(1, Math.round(ppm * 0.26));
  const lean = Math.round(side * ppm * 0.45);
  const bx = side > 0 ? x + 4 : x - 4 - trunkW;
  const topX = bx + lean;
  const topY = groundY - h;
  g.poly([bx, groundY, bx + trunkW, groundY, topX + trunkW, topY, topX, topY]).fill({ color: 0x120a2e, alpha });
  const frondLen = Math.max(5, Math.round(ppm * 2.0));
  const dirs: [number, number][] = [[-1, -0.6], [-0.5, -1], [0.2, -1.1], [0.8, -0.7], [-0.2, -0.3]];
  for (const [dx, dy] of dirs) {
    g.poly([
      topX, topY,
      topX + dx * frondLen - frondLen * 0.16, topY + dy * frondLen * 0.6,
      topX + dx * frondLen + frondLen * 0.16, topY + dy * frondLen * 0.6,
    ]).fill({ color: 0x1a0f3a, alpha: alpha * 0.9 });
  }
}

function billboard(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const w = Math.max(8, Math.round(ppm * 3.2));
  const h = Math.max(5, Math.round(ppm * 1.8));
  const legH = Math.max(3, Math.round(ppm * 1.6));
  const bx = nearEdge(x, w, side, 4);
  g.rect(bx + w * 0.2, groundY - legH, Math.max(1, Math.round(ppm * 0.15)), legH).fill({ color: 0x2f3438, alpha });
  g.rect(bx + w * 0.7, groundY - legH, Math.max(1, Math.round(ppm * 0.15)), legH).fill({ color: 0x2f3438, alpha });
  g.rect(bx, groundY - legH - h, w, h).fill({ color: 0x0f0e17, alpha });
  const grid = [0xff2d95, 0x00f0ff];
  for (let i = 0; i < 3; i++) {
    g.rect(bx + 2, groundY - legH - h + 2 + i * (h - 4) / 3, w - 4, Math.max(1, (h - 4) / 3 - 1))
      .fill({ color: grid[(hash + i) % 2], alpha: alpha * 0.5 });
  }
  g.rect(bx, groundY - legH - h, w, 1).fill({ color: 0xff2d95, alpha: alpha * 0.8 });
}

function neonPylon(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const h = Math.max(10, Math.round(ppm * 6));
  const w = Math.max(1, Math.round(ppm * 0.3));
  const bx = side > 0 ? x + 2 : x - 2 - w;
  const color = hash % 2 === 0 ? 0xff2d95 : 0x00f0ff;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x1a0f3a, alpha });
  const rings = 4;
  for (let i = 0; i < rings; i++) {
    const ry = groundY - (h / rings) * (i + 0.5);
    g.rect(bx - w, ry, w * 3, Math.max(1, Math.round(ppm * 0.1))).fill({ color, alpha: alpha * 0.75 });
  }
}

function gridLampPost(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const h = Math.max(6, Math.round(ppm * 2.4));
  const w = Math.max(1, Math.round(ppm * 0.14));
  const bx = side > 0 ? x + 1 : x - 1 - w;
  const color = hash % 2 === 0 ? 0xff2d95 : 0x00f0ff;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x2a1a4a, alpha });
  g.circle(bx + w / 2, groundY - h, Math.max(1, Math.round(ppm * 0.3))).fill({ color, alpha: alpha * 0.85 });
  g.circle(bx + w / 2, groundY - h, Math.max(2, Math.round(ppm * 0.6))).fill({ color, alpha: alpha * 0.18 });
}

// ---------------------------------------------------------------------------
// Phase 5 — DESERT HIGHWAY
// ---------------------------------------------------------------------------

function cactus(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const h = Math.max(6, Math.round(ppm * (2.5 + (hash % 3))));
  const w = Math.max(2, Math.round(ppm * 0.5));
  const bx = side > 0 ? x + 3 : x - 3 - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x2d6a4f, alpha });
  g.rect(bx + w * 0.2, groundY - h * 0.85, Math.max(1, Math.round(w * 0.15)), h * 0.5).fill({ color: 0x1e4d38, alpha: alpha * 0.6 });
  if (hash % 2 === 0) {
    const armH = Math.max(2, Math.round(h * 0.4));
    const armW = Math.max(1, Math.round(w * 0.8));
    const armY = groundY - h * 0.55;
    g.rect(bx - armW, armY - armH, armW, armH + armW).fill({ color: 0x2d6a4f, alpha });
  }
}

function duneMound(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const w = Math.max(6, Math.round(ppm * (3 + (hash % 3))));
  const h = Math.max(3, Math.round(w * 0.35));
  const bx = side > 0 ? x + 4 : x - 4 - w;
  g.ellipse(bx + w / 2, groundY - h * 0.3, w / 2, h / 2).fill({ color: 0xd9b382, alpha });
  g.ellipse(bx + w * 0.35, groundY - h * 0.45, w * 0.22, h * 0.3).fill({ color: 0xe8c99a, alpha: alpha * 0.7 });
}

function oasisPalm(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  palm(g, x, groundY, ppm, alpha, hash, side);
  const poolW = Math.max(4, Math.round(ppm * 1.2));
  const bx = side > 0 ? x + 2 : x - 2 - poolW;
  g.ellipse(bx + poolW / 2, groundY + 1, poolW / 2, poolW * 0.18).fill({ color: 0x2596be, alpha: alpha * 0.6 });
}

function mileMarker(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const h = Math.max(4, Math.round(ppm * 1.0));
  const w = Math.max(1, Math.round(ppm * 0.25));
  const bx = side > 0 ? x + 1 : x - 1 - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0xc9a66b, alpha });
  g.rect(bx - w * 0.5, groundY - h * 0.85, w * 2, Math.max(1, Math.round(h * 0.18))).fill({ color: 0xd35400, alpha: alpha * 0.9 });
}

// ---------------------------------------------------------------------------
// Phase 6 — OPEN SEA CAUSEWAY
// ---------------------------------------------------------------------------

function boatSilhouette(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const w = Math.max(5, Math.round(ppm * (2 + (hash % 2))));
  const h = Math.max(2, Math.round(w * 0.3));
  const bx = side > 0 ? x + 4 : x - 4 - w;
  g.poly([bx, groundY, bx + w, groundY, bx + w * 0.8, groundY - h, bx + w * 0.2, groundY - h]).fill({ color: 0x1e272e, alpha });
  g.rect(bx + w * 0.45, groundY - h - Math.round(h * 1.5), Math.max(1, Math.round(w * 0.06)), Math.round(h * 1.5)).fill({ color: 0x2f3542, alpha: alpha * 0.8 });
}

function lighthouse(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, _hash: number, side: 1 | -1): void {
  const h = Math.max(10, Math.round(ppm * 4.5));
  const w = Math.max(2, Math.round(ppm * 0.8));
  const bx = side > 0 ? x + 4 : x - 4 - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0xf5f5f5, alpha });
  for (let i = 0; i < 3; i++) {
    g.rect(bx, groundY - h + i * (h / 3), w, Math.max(1, Math.round(h * 0.08))).fill({ color: 0xff4757, alpha: alpha * 0.85 });
  }
  const capH = Math.round(h * 0.18);
  g.poly([bx - 1, groundY - h, bx + w + 1, groundY - h, bx + w / 2, groundY - h - capH]).fill({ color: 0xff4757, alpha });
  g.circle(bx + w / 2, groundY - h + capH * 0.4, Math.max(1, Math.round(w * 0.4))).fill({ color: 0xfff176, alpha: alpha * (0.6 + 0.3 * Math.sin(Date.now() * 0.005)) });
}

function gullPost(g: Graphics, x: number, groundY: number, ppm: number, alpha: number, hash: number, side: 1 | -1): void {
  const h = Math.max(4, Math.round(ppm * 1.4));
  const w = Math.max(1, Math.round(ppm * 0.15));
  const bx = side > 0 ? x + 1 : x - 1 - w;
  g.rect(bx, groundY - h, w, h).fill({ color: 0x5a6069, alpha });
  const gy = groundY - h - Math.round(ppm * 0.3);
  const gx = bx + w / 2 + (hash % 2 === 0 ? -Math.round(ppm * 0.5) : Math.round(ppm * 0.5));
  const wing = Math.max(2, Math.round(ppm * 0.4));
  g.poly([gx - wing, gy + wing * 0.4, gx, gy, gx + wing, gy + wing * 0.4]).stroke({ width: 1, color: 0xffffff, alpha: alpha * 0.8 });
}

// ---------------------------------------------------------------------------

const PHASE_PROPS: PropDraw[][] = [
  [palm, beachHut, rockStack, guardRail],
  [pineTall, pineShort, boulder, cliff, snowPatch, fence],
  [bridgeTower, buoy, lampPostBridge, railingPost],
  [tunnelRib, neonSign, pipeConduit, serviceDoor],
  [synthPalm, billboard, neonPylon, gridLampPost],
  [cactus, duneMound, oasisPalm, mileMarker],
  [boatSilhouette, lighthouse, buoy, gullPost],
];

/** Deterministically draws one roadside prop for the given phase, position hash and side. */
export function drawSceneryProp(
  g: Graphics,
  phaseIndex: number,
  x: number,
  groundY: number,
  pxPerMetre: number,
  alpha: number,
  hash: number,
  side: 1 | -1
): void {
  if (alpha <= 0) return;
  const pool = PHASE_PROPS[phaseIndex] ?? PHASE_PROPS[0];
  const propFn = pool[hash % pool.length];
  propFn(g, x, groundY, pxPerMetre, alpha, hash, side);
}

const GANTRY_ACCENT: number[] = [0xffa502, 0xdfe6e9, 0x00cec9, 0x00f0ff, 0xff2d95, 0xd35400, 0x00cec9];

/** Overhead structure spanning the road — sign gantry / bridge span / tunnel ring, depending on phase. */
export function drawOverheadGantry(
  g: Graphics,
  centerX: number,
  groundY: number,
  roadHalfWidthPx: number,
  pxPerMetre: number,
  phaseIndex: number,
  alpha: number,
  hash: number
): void {
  if (alpha <= 0 || roadHalfWidthPx < 2) return;
  const clearance = Math.max(6, Math.round(pxPerMetre * 4.5));
  const beamY = groundY - clearance;
  const legW = Math.max(1, Math.round(pxPerMetre * 0.2));
  const spanL = centerX - roadHalfWidthPx * 1.05;
  const spanR = centerX + roadHalfWidthPx * 1.05;
  const accent = GANTRY_ACCENT[phaseIndex] ?? 0xffa502;
  const structColor = phaseIndex === 3 ? 0x181824 : 0x5a6069;

  g.rect(spanL, beamY, legW, groundY - beamY).fill({ color: structColor, alpha });
  g.rect(spanR - legW, beamY, legW, groundY - beamY).fill({ color: structColor, alpha });
  g.rect(spanL, beamY, spanR - spanL, Math.max(1, Math.round(pxPerMetre * 0.35))).fill({ color: structColor, alpha });
  g.rect(spanL, beamY, spanR - spanL, 1).fill({ color: accent, alpha: alpha * 0.7 });

  if (hash % 2 === 0) {
    const signW = Math.max(4, Math.round((spanR - spanL) * 0.3));
    g.rect(centerX - signW / 2, beamY + 1, signW, Math.max(2, Math.round(pxPerMetre * 0.6)))
      .fill({ color: 0x0f0e17, alpha: alpha * 0.85 });
    g.rect(centerX - signW / 2, beamY + 1, signW, Math.max(2, Math.round(pxPerMetre * 0.6)))
      .stroke({ width: 1, color: accent, alpha: alpha * 0.7 });
  }
}

/** The finish line — a single one-off gate at the end of the track (not a repeating loop like
 * drawOverheadGantry). Checkered beam, blinking marquee bulbs, and a hanging "FINISH" banner. */
export function drawFinishGate(
  g: Graphics,
  centerX: number,
  groundY: number,
  roadHalfWidthPx: number,
  pxPerMetre: number,
  alpha: number
): void {
  if (alpha <= 0 || roadHalfWidthPx < 2) return;
  const clearance = Math.max(6, Math.round(pxPerMetre * 4.5));
  const beamY = groundY - clearance;
  const beamH = Math.max(2, Math.round(pxPerMetre * 0.6));
  const legW = Math.max(1, Math.round(pxPerMetre * 0.25));
  const spanL = centerX - roadHalfWidthPx * 1.05;
  const spanR = centerX + roadHalfWidthPx * 1.05;
  const beamW = spanR - spanL;

  // Legs
  g.rect(spanL, beamY, legW, groundY - beamY).fill({ color: 0x2f3542, alpha });
  g.rect(spanR - legW, beamY, legW, groundY - beamY).fill({ color: 0x2f3542, alpha });

  // Checkered beam — alternating black/white squares
  const squares = Math.max(4, Math.round(beamW / Math.max(2, pxPerMetre * 0.8)));
  const squareW = beamW / squares;
  for (let i = 0; i < squares; i++) {
    g.rect(spanL + i * squareW, beamY, squareW, beamH).fill({ color: i % 2 === 0 ? 0xfffffe : 0x0f0e17, alpha });
  }

  // Blinking marquee bulbs along the beam's lower edge
  const bulbCount = Math.max(6, Math.round(beamW / Math.max(3, pxPerMetre * 0.7)));
  for (let i = 0; i < bulbCount; i++) {
    const bx = spanL + (beamW / (bulbCount - 1)) * i;
    const on = Math.floor(Date.now() * 0.006 + i) % 2 === 0;
    g.circle(bx, beamY + beamH + 1, Math.max(1, pxPerMetre * 0.06)).fill({ color: on ? 0xf4d160 : 0xff0055, alpha: alpha * (on ? 0.95 : 0.5) });
  }

  // Hanging "FINISH" banner
  const bannerText = 'FINISH';
  const bannerScale = Math.max(1, Math.round(pxPerMetre * 0.12));
  const bannerW = bannerText.length * 4 * bannerScale;
  const bannerH = 5 * bannerScale;
  const bannerY = beamY + beamH + Math.max(3, pxPerMetre * 0.5);
  g.rect(centerX - bannerW / 2 - 2, bannerY - 2, bannerW + 4, bannerH + 4).fill({ color: 0x0f0e17, alpha: alpha * 0.85 });
  PixelFont.drawText(g, bannerText, Math.round(centerX - bannerW / 2), Math.round(bannerY), 0xf4d160, bannerScale, alpha);
}
