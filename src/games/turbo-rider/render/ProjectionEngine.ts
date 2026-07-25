import { Graphics, Texture } from 'pixi.js';
import type { Point3D, TrackSegment } from '../types';
import type { AITrafficVehicle } from '../core/TrafficManager';
import type { PowerUp } from '../core/PowerUpManager';
import { HandcraftedTrack } from '../core/HandcraftedTrack';
import { ROAD_HALF_WIDTH_METERS, SEGMENT_LENGTH_METERS } from '../core/TrackConstants';
import { drawSkybox } from './Skybox';
import { drawSceneryProp, drawOverheadGantry } from './SceneryLibrary';
import { drawVehicle, type VehicleKind } from './VehicleSprites';

function hashOf(n: number): number {
  return (Math.imul(n, 2654435761) ^ (n >>> 3)) >>> 0;
}

function wrapMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

interface SpriteItem {
  z: number;
  draw: () => void;
}

/**
 * Pseudo-3D projection on a metric world scale. All axes share one scale
 * (`viewW`-based, "square pixels") so a single px-per-metre figure sizes
 * the road, traffic, scenery and the player bike consistently — see the
 * plan notes on why the old viewH-based vertical scale made tall sprites
 * float above the horizon in squashed split-screen viewports.
 *
 * The track itself is straight and flat (HandcraftedTrack always emits
 * worldX = worldY = curve = elevation = 0), so camera X only needs to
 * track the player's lane offset — there is no per-segment interpolation
 * to do for position.
 */
export class ProjectionEngine {
  public static readonly ROAD_WIDTH = ROAD_HALF_WIDTH_METERS; // metres, half-width
  public static readonly SEGMENT_LENGTH = SEGMENT_LENGTH_METERS; // metres
  public static readonly CAMERA_HEIGHT = 1.4; // metres
  public static readonly CAMERA_DEPTH = 3.0;
  public static readonly CAMERA_BACK = 9; // metres — camera trails the bike so impacts happen on-screen
  public static readonly NEAR_PLANE = 0.5; // metres

  public static readonly ROAD_DRAW_METERS = 200; // stride-1 quads out to here, then one far-fill
  public static readonly SCENERY_DRAW_METERS = 1500;
  public static readonly SCENERY_SPACING = 18; // metres between candidate prop slots, per side
  public static readonly GANTRY_SPACING = 150;
  public static readonly VEH_DRAW_METERS = 420;
  public static readonly PU_DRAW_METERS = 260;

  public static project(
    p: Point3D,
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    viewW: number,
    horizonY: number
  ): Point3D {
    const camX = (p.worldX || 0) - cameraX;
    const camY = (p.worldY || 0) - cameraY;
    const camZ = (p.worldZ || 0) - cameraZ;

    const safeZ = Math.max(ProjectionEngine.NEAR_PLANE, camZ);
    const scale = ProjectionEngine.CAMERA_DEPTH / safeZ;

    const halfW = viewW / 2;
    const screenX = Math.round(halfW + scale * camX * halfW);
    const screenY = Math.round(horizonY - scale * camY * halfW);
    const projectedWidth = Math.round(scale * ProjectionEngine.ROAD_WIDTH * halfW);

    return {
      worldX: p.worldX,
      worldY: p.worldY,
      worldZ: p.worldZ,
      cameraX: camX,
      cameraY: camY,
      cameraZ: camZ,
      scale,
      screenX,
      screenY,
      projectedWidth,
    };
  }

  private static horizonFractionFor(playerCount: number): number {
    if (playerCount >= 4) return 0.22;
    if (playerCount === 3) return 0.285;
    return 0.35;
  }

  public static renderViewportRoad(
    g: Graphics,
    segments: TrackSegment[],
    playerZ: number,
    playerX: number,
    viewW: number,
    viewH: number,
    playerCount: number,
    trafficVehicles: AITrafficVehicle[] = [],
    powerUps: PowerUp[] = [],
    skyboxTexture?: Texture | null,
    fireTexture?: Texture | null
  ): void {
    if (segments.length === 0) return;
    void fireTexture; // reserved for future nitro-trail scenery interactions

    const totalSegs = segments.length;
    const trackLength = totalSegs * ProjectionEngine.SEGMENT_LENGTH;

    const horizonY = Math.round(viewH * ProjectionEngine.horizonFractionFor(playerCount));
    const parallaxX = playerZ * 0.5;

    // Straight, flat track (curve/elevation are always 0) — camera X is just the lane offset.
    const cameraX = playerX * ProjectionEngine.ROAD_WIDTH;
    const cameraY = ProjectionEngine.CAMERA_HEIGHT;
    const cameraZ = playerZ - ProjectionEngine.CAMERA_BACK;

    const phaseNow = HandcraftedTrack.getPhaseForDistance(wrapMod(playerZ, trackLength));
    drawSkybox(g, viewW, horizonY, phaseNow, parallaxX, skyboxTexture);

    // Horizon accent line
    const hlOffset = (playerZ * 0.04) % viewW;
    g.rect(0 - hlOffset, horizonY - 1, viewW, 1).fill({ color: 0x00f0ff, alpha: 0.2 });
    g.rect(viewW - hlOffset, horizonY - 1, viewW, 1).fill({ color: 0x00f0ff, alpha: 0.2 });

    const sprites: SpriteItem[] = [];

    // ---- Road quads (stride 1, near field) + one far-fill haze ----
    const roadSegCount = Math.max(1, Math.ceil(ProjectionEngine.ROAD_DRAW_METERS / ProjectionEngine.SEGMENT_LENGTH));
    const startGlobalIdx = Math.floor(cameraZ / ProjectionEngine.SEGMENT_LENGTH) - 1;

    interface ProjSeg { p1: Point3D; p2: Point3D; color: TrackSegment['color']; worldZ: number }
    const projectedSegs: ProjSeg[] = [];

    for (let n = 0; n < roadSegCount; n++) {
      const globalSegIdx = startGlobalIdx + n;
      const segIndex = wrapMod(globalSegIdx, totalSegs);
      const seg = segments[segIndex];
      const worldZ1 = globalSegIdx * ProjectionEngine.SEGMENT_LENGTH;
      const worldZ2 = worldZ1 + ProjectionEngine.SEGMENT_LENGTH;

      const proj1 = ProjectionEngine.project({ worldX: 0, worldY: 0, worldZ: worldZ1 }, cameraX, cameraY, cameraZ, viewW, horizonY);
      const proj2 = ProjectionEngine.project({ worldX: 0, worldY: 0, worldZ: worldZ2 }, cameraX, cameraY, cameraZ, viewW, horizonY);

      projectedSegs.push({ p1: proj1, p2: proj2, color: seg.color, worldZ: worldZ1 });
    }

    // Far-fill haze — closes the road into the horizon beyond the stride-1 window instead of a hard cutoff
    const farSeg = projectedSegs[projectedSegs.length - 1];
    if (farSeg && (farSeg.p2.cameraZ || 0) > ProjectionEngine.NEAR_PLANE) {
      const fx = farSeg.p2.screenX || 0;
      const fy = farSeg.p2.screenY || 0;
      const fw = farSeg.p2.projectedWidth || 0;
      if (fy > horizonY) {
        g.rect(0, horizonY, viewW, fy - horizonY).fill({ color: farSeg.color.grass, alpha: 0.55 });
        g.poly([fx - fw, fy, fx + fw, fy, viewW / 2, horizonY]).fill({ color: farSeg.color.road, alpha: 0.65 });
      }
    }

    const BAND_SEGS = 2; // ~12m alternating asphalt bands
    const DASH_SEGS = 2; // ~12m dash cycle for the centre line

    for (let n = projectedSegs.length - 1; n >= 0; n--) {
      const seg = projectedSegs[n];
      const p1 = seg.p1;
      const p2 = seg.p2;

      if ((p2.cameraZ || 0) <= ProjectionEngine.NEAR_PLANE) continue;
      if (!p1.cameraZ || p1.cameraZ <= ProjectionEngine.NEAR_PLANE) continue;

      const x1 = p1.screenX || 0, y1 = p1.screenY || 0, w1 = p1.projectedWidth || 0;
      const x2 = p2.screenX || 0, y2 = p2.screenY || 0, w2 = p2.projectedWidth || 0;
      if (y1 <= y2) continue;

      const segGlobalIdx = Math.round(seg.worldZ / ProjectionEngine.SEGMENT_LENGTH);
      const band = Math.floor(segGlobalIdx / BAND_SEGS) % 2 === 0;

      g.poly([0, y2, viewW, y2, viewW, y1, 0, y1]).fill({ color: seg.color.grass });

      // Rumble strips — narrower than before so they don't blow out past the frame in the near field
      const rW1 = w1 * 0.08;
      const rW2 = w2 * 0.08;
      g.poly([x1 - w1 - rW1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - rW2, y2]).fill({ color: seg.color.rumble });
      g.poly([x1 + w1, y1, x1 + w1 + rW1, y1, x2 + w2 + rW2, y2, x2 + w2, y2]).fill({ color: seg.color.rumble });

      const roadColor = band ? seg.color.road : mixColor(seg.color.road, 0x000000, 0.12);
      g.poly([x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2]).fill({ color: roadColor });

      // Dashed centre line
      if (Math.floor(segGlobalIdx / DASH_SEGS) % 2 === 0) {
        const cW1 = w1 * 0.05, cW2 = w2 * 0.05;
        g.poly([x1 - cW1, y1, x1 + cW1, y1, x2 + cW2, y2, x2 - cW2, y2]).fill({ color: seg.color.lane });
      }

      // Solid inner lane divider marks
      const sW1 = w1 * 0.03, sW2 = w2 * 0.03;
      const off1 = w1 * 0.32, off2 = w2 * 0.32;
      g.poly([x1 - off1 - sW1, y1, x1 - off1 + sW1, y1, x2 - off2 + sW2, y2, x2 - off2 - sW2, y2]).fill({ color: seg.color.lane, alpha: 0.5 });
      g.poly([x1 + off1 - sW1, y1, x1 + off1 + sW1, y1, x2 + off2 + sW2, y2, x2 + off2 - sW2, y2]).fill({ color: seg.color.lane, alpha: 0.5 });

      // Solid outer edge lines
      const eW1 = w1 * 0.05, eW2 = w2 * 0.05;
      const eOff1 = w1 * 0.82, eOff2 = w2 * 0.82;
      g.poly([x1 - eOff1 - eW1, y1, x1 - eOff1 + eW1, y1, x2 - eOff2 + eW2, y2, x2 - eOff2 - eW2, y2]).fill({ color: seg.color.lane, alpha: 0.8 });
      g.poly([x1 + eOff1 - eW1, y1, x1 + eOff1 + eW1, y1, x2 + eOff2 + eW2, y2, x2 + eOff2 - eW2, y2]).fill({ color: seg.color.lane, alpha: 0.8 });

      // Occasional skid mark / patched asphalt, sparse and deterministic
      const patchHash = hashOf(segGlobalIdx);
      if (patchHash % 23 === 0) {
        const pw1 = w1 * 0.18, pw2 = w2 * 0.18;
        const pOff = ((patchHash >> 4) % 2 === 0 ? -1 : 1) * 0.3;
        g.poly([
          x1 + w1 * pOff - pw1, y1, x1 + w1 * pOff + pw1, y1,
          x2 + w2 * pOff + pw2, y2, x2 + w2 * pOff - pw2, y2,
        ]).fill({ color: 0x0a0a0f, alpha: 0.3 });
      }
    }

    // ---- Overhead gantries — sign gantry / bridge span / tunnel ring, spaced along the track ----
    const gantrySpacing = playerCount >= 3 ? ProjectionEngine.GANTRY_SPACING * 1.4 : ProjectionEngine.GANTRY_SPACING;
    const firstGantry = Math.ceil(cameraZ / gantrySpacing) * gantrySpacing;
    for (let gz = firstGantry; gz < cameraZ + ProjectionEngine.SCENERY_DRAW_METERS; gz += gantrySpacing) {
      const camDist = gz - cameraZ;
      if (camDist <= ProjectionEngine.NEAR_PLANE) continue;
      const scale = ProjectionEngine.CAMERA_DEPTH / camDist;
      const halfW = viewW / 2;
      const ppm = scale * halfW;
      const centerX = Math.round(halfW - scale * cameraX * halfW);
      const groundY = Math.round(horizonY + scale * ProjectionEngine.CAMERA_HEIGHT * halfW);
      const roadHalfWidthPx = ppm * ProjectionEngine.ROAD_WIDTH;
      const alpha = clamp01((ProjectionEngine.SCENERY_DRAW_METERS - camDist) / 200) * clamp01(camDist / 10);
      if (alpha <= 0) continue;
      const wrappedZ = wrapMod(gz, trackLength);
      const phase = HandcraftedTrack.getPhaseForDistance(wrappedZ);
      const hash = hashOf(Math.round(gz / gantrySpacing));
      sprites.push({
        z: camDist,
        draw: () => drawOverheadGantry(g, centerX, groundY, roadHalfWidthPx, ppm, phase, alpha, hash),
      });
    }

    // ---- Roadside scenery — independent of road stride, runs much further out ----
    const sceneryDrawDist = playerCount >= 3 ? ProjectionEngine.SCENERY_DRAW_METERS * 0.65 : ProjectionEngine.SCENERY_DRAW_METERS;
    const scenerySpacing = playerCount >= 3 ? ProjectionEngine.SCENERY_SPACING * 1.5 : ProjectionEngine.SCENERY_SPACING;

    for (const side of [-1, 1] as const) {
      const phaseOffset = side > 0 ? scenerySpacing * 0.5 : 0;
      const firstSlot = Math.ceil((cameraZ + 4 - phaseOffset) / scenerySpacing) * scenerySpacing + phaseOffset;

      for (let wz = firstSlot; wz < cameraZ + sceneryDrawDist; wz += scenerySpacing) {
        const camDist = wz - cameraZ;
        if (camDist <= ProjectionEngine.NEAR_PLANE) continue;

        const bucket = Math.round(wz / scenerySpacing);
        const hash = hashOf(bucket * 2 + (side > 0 ? 1 : 0));
        if (hash % 5 === 0) continue; // leave gaps so it doesn't read as a grid

        const scale = ProjectionEngine.CAMERA_DEPTH / camDist;
        const halfW = viewW / 2;
        const ppm = scale * halfW;
        const centerX = halfW - scale * cameraX * halfW;
        const groundY = horizonY + scale * ProjectionEngine.CAMERA_HEIGHT * halfW;
        const projectedWidth = ppm * ProjectionEngine.ROAD_WIDTH;
        const edgeX = centerX + side * projectedWidth;

        const alpha = clamp01(camDist / 6) * clamp01((sceneryDrawDist - camDist) / 180);
        if (alpha <= 0) continue;

        const wrappedZ = wrapMod(wz, trackLength);
        const phase = HandcraftedTrack.getPhaseForDistance(wrappedZ);

        sprites.push({
          z: camDist,
          draw: () => drawSceneryProp(g, phase, edgeX, groundY, ppm, alpha, hash, side),
        });
      }
    }

    // ---- Traffic vehicles & hazards ----
    for (const veh of trafficVehicles) {
      let vz = veh.z;
      vz += Math.floor((playerZ - vz + trackLength / 2) / trackLength) * trackLength;
      const camDist = vz - cameraZ;
      if (camDist <= ProjectionEngine.NEAR_PLANE || camDist > ProjectionEngine.VEH_DRAW_METERS) continue;

      const scale = ProjectionEngine.CAMERA_DEPTH / camDist;
      const halfW = viewW / 2;
      const ppm = scale * halfW;
      const centerX = halfW - scale * cameraX * halfW;
      const groundY = horizonY + scale * ProjectionEngine.CAMERA_HEIGHT * halfW;
      const drawX = centerX + veh.laneX * ppm * ProjectionEngine.ROAD_WIDTH;

      const fadeAlpha = clamp01(camDist / 3) * clamp01((ProjectionEngine.VEH_DRAW_METERS - camDist) / 70);
      if (fadeAlpha <= 0) continue;

      sprites.push({
        z: camDist,
        draw: () => drawVehicle(g, Math.round(drawX), Math.round(groundY), ppm, veh.type as VehicleKind, veh.color, fadeAlpha),
      });
    }

    // ---- Power-ups ----
    for (const pu of powerUps) {
      if (pu.collected) continue;
      let pz = pu.z;
      pz += Math.floor((playerZ - pz + trackLength / 2) / trackLength) * trackLength;
      const camDist = pz - cameraZ;
      if (camDist <= ProjectionEngine.NEAR_PLANE || camDist > ProjectionEngine.PU_DRAW_METERS) continue;

      const scale = ProjectionEngine.CAMERA_DEPTH / camDist;
      const halfW = viewW / 2;
      const ppm = scale * halfW;
      const centerX = halfW - scale * cameraX * halfW;
      const groundY = horizonY + scale * ProjectionEngine.CAMERA_HEIGHT * halfW;
      const drawX = centerX + pu.laneX * ppm * ProjectionEngine.ROAD_WIDTH;

      const fadeAlpha = clamp01(camDist / 2) * clamp01((ProjectionEngine.PU_DRAW_METERS - camDist) / 40);
      if (fadeAlpha <= 0) continue;

      sprites.push({
        z: camDist,
        draw: () => ProjectionEngine.renderPickup(g, Math.round(drawX), groundY, ppm, pu.type, pu.id, fadeAlpha),
      });
    }

    // Far-to-near depth sort — sprites at greater camera distance draw first
    sprites.sort((a, b) => b.z - a.z);
    sprites.forEach((s) => s.draw());
  }

  private static renderPickup(g: Graphics, x: number, groundY: number, ppm: number, type: string, id: number, fadeAlpha: number): void {
    const floatH = ppm * 0.9;
    const size = Math.max(2, Math.round(ppm * 0.35));
    const y = groundY - floatH - Math.sin(Date.now() * 0.004 + id) * ppm * 0.15;
    const color = type === 'boost' ? 0x00f0ff : type === 'shield' ? 0x55efc4 : 0xf4d160;
    const pulse = (0.7 + Math.sin(Date.now() * 0.005 + id) * 0.3) * fadeAlpha;

    g.circle(x, y, size * 1.7).fill({ color, alpha: pulse * 0.15 });
    g.poly([x, y - size, x + size, y, x, y + size, x - size, y]).fill({ color, alpha: pulse });
    g.poly([x, y - size, x + size, y, x, y + size, x - size, y]).stroke({ width: 1, color: 0xffffff, alpha: pulse * 0.5 });
  }
}

function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}
