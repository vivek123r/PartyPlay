import { Graphics, Texture } from 'pixi.js';
import type { Point3D, TrackSegment, OpponentSprite } from '../types';
import type { AITrafficVehicle } from '../core/TrafficManager';
import type { PowerUp } from '../core/PowerUpManager';
import { HandcraftedTrack } from '../core/HandcraftedTrack';
import { ROAD_HALF_WIDTH_METERS, SEGMENT_LENGTH_METERS } from '../core/TrackConstants';
import { drawSkybox } from './Skybox';
import { drawSceneryProp, drawOverheadGantry, drawFinishGate } from './SceneryLibrary';
import { drawVehicle, drawVehicleDepth, isBoxedVehicleKind, VEHICLE_DIMENSIONS_M, type VehicleKind } from './VehicleSprites';
import { drawSuperbikeRear, drawPlayerTag, type BikeSpriteColors } from './BikeSprite';

/** Draw parameters for the local player's own bike — pushed into the shared depth-sorted
 * sprite list (at z = CAMERA_BACK) so a close opponent can correctly draw in front of it. */
export interface SelfBikeDraw {
  id: number;
  screenX: number;
  screenY: number;
  scale: number;
  leanAngle: number;
  isNitroActive: boolean;
  colors: BikeSpriteColors;
}

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
  public static readonly FINISH_DRAW_METERS = 500;
  public static readonly VEH_DRAW_METERS = 420;
  public static readonly PU_DRAW_METERS = 260;
  public static readonly OPP_DRAW_METERS = 420;
  public static readonly OPP_TAG_METERS = 150; // closer than this: floating player-number tag
  public static readonly OPP_MIN_PX = 3; // readability floor — the fixed-size tag carries ID below this

  public static project(
    p: Point3D,
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    viewW: number,
    horizonY: number,
    cameraDepth?: number
  ): Point3D {
    const camX = (p.worldX || 0) - cameraX;
    const camY = (p.worldY || 0) - cameraY;
    const camZ = (p.worldZ || 0) - cameraZ;

    const safeZ = Math.max(ProjectionEngine.NEAR_PLANE, camZ);
    const scale = (cameraDepth ?? ProjectionEngine.CAMERA_DEPTH) / safeZ;

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
    opponents: OpponentSprite[] = [],
    selfId?: number,
    selfBike?: SelfBikeDraw,
    cameraBack?: number,
    cameraDepth?: number
  ): void {
    if (segments.length === 0) return;

    const totalSegs = segments.length;
    const trackLength = totalSegs * ProjectionEngine.SEGMENT_LENGTH;

    const horizonY = Math.round(viewH * ProjectionEngine.horizonFractionFor(playerCount));
    const parallaxX = playerZ * 0.5;

    // Straight, flat track (curve/elevation are always 0) — camera X is just the lane offset.
    const cameraX = playerX * ProjectionEngine.ROAD_WIDTH;
    const cameraY = ProjectionEngine.CAMERA_HEIGHT;
    // Dynamic camera: nitro pulls the camera back and widens the FOV slightly (both smoothed
    // in the caller) so more of the near field stays visible and the whole scene reads as
    // faster — see plan H4/E. Both fall back to the static defaults.
    const effectiveCameraBack = cameraBack ?? ProjectionEngine.CAMERA_BACK;
    const effectiveCameraDepth = cameraDepth ?? ProjectionEngine.CAMERA_DEPTH;
    const cameraZ = playerZ - effectiveCameraBack;

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

      const proj1 = ProjectionEngine.project({ worldX: 0, worldY: 0, worldZ: worldZ1 }, cameraX, cameraY, cameraZ, viewW, horizonY, effectiveCameraDepth);
      const proj2 = ProjectionEngine.project({ worldX: 0, worldY: 0, worldZ: worldZ2 }, cameraX, cameraY, cameraZ, viewW, horizonY, effectiveCameraDepth);

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
      const scale = effectiveCameraDepth / camDist;
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

    // ---- Finish line — a single one-off gate at the fixed absolute end of the track, not a
    // repeating loop like gantries. No wraparound: the race is a straight point-to-point run,
    // so trackLength IS the one and only finish point, and it culls naturally once passed
    // (camDist goes negative, same as everything else).
    {
      const finishCamDist = trackLength - cameraZ;
      if (finishCamDist > ProjectionEngine.NEAR_PLANE && finishCamDist < ProjectionEngine.FINISH_DRAW_METERS) {
        const scale = effectiveCameraDepth / finishCamDist;
        const halfW = viewW / 2;
        const ppm = scale * halfW;
        const centerX = Math.round(halfW - scale * cameraX * halfW);
        const groundY = Math.round(horizonY + scale * ProjectionEngine.CAMERA_HEIGHT * halfW);
        const roadHalfWidthPx = ppm * ProjectionEngine.ROAD_WIDTH;
        const alpha = clamp01((ProjectionEngine.FINISH_DRAW_METERS - finishCamDist) / 250) * clamp01(finishCamDist / 10);
        if (alpha > 0) {
          sprites.push({
            z: finishCamDist,
            draw: () => drawFinishGate(g, centerX, groundY, roadHalfWidthPx, ppm, alpha),
          });
        }
      }
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

        const scale = effectiveCameraDepth / camDist;
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

      const fadeAlpha = clamp01(camDist / 3) * clamp01((ProjectionEngine.VEH_DRAW_METERS - camDist) / 70);
      if (fadeAlpha <= 0) continue;

      const halfW = viewW / 2;
      const vehType = veh.type as VehicleKind;

      if (isBoxedVehicleKind(vehType)) {
        // Sedan/truck/bus render as a projected box (rear + front face) so their real
        // world length reads as depth instead of a flat billboard — see VehicleSprites.ts.
        const halfLen = VEHICLE_DIMENSIONS_M[vehType].length / 2;
        const rearDist = Math.max(ProjectionEngine.NEAR_PLANE, camDist - halfLen);
        const frontDist = Math.max(ProjectionEngine.NEAR_PLANE, camDist + halfLen);
        const scaleRear = effectiveCameraDepth / rearDist;
        const scaleFront = effectiveCameraDepth / frontDist;
        const ppmNear = scaleRear * halfW;
        const ppmFar = scaleFront * halfW;
        const xNear = Math.round(halfW - scaleRear * cameraX * halfW + veh.laneX * ppmNear * ProjectionEngine.ROAD_WIDTH);
        const xFar = Math.round(halfW - scaleFront * cameraX * halfW + veh.laneX * ppmFar * ProjectionEngine.ROAD_WIDTH);
        const yNear = Math.round(horizonY + scaleRear * ProjectionEngine.CAMERA_HEIGHT * halfW);
        const yFar = Math.round(horizonY + scaleFront * ProjectionEngine.CAMERA_HEIGHT * halfW);
        // Real world-space lateral offset from the camera's forward axis — determines which
        // side face (if any) is actually visible; see VehicleSprites.ts's back-face culling.
        const lateralOffsetM = veh.laneX * ProjectionEngine.ROAD_WIDTH - cameraX;

        sprites.push({
          z: camDist,
          draw: () => drawVehicleDepth(g, { xNear, yNear, ppmNear, xFar, yFar, ppmFar }, vehType, veh.color, fadeAlpha, lateralOffsetM),
        });
      } else {
        const scale = effectiveCameraDepth / camDist;
        const ppm = scale * halfW;
        const centerX = halfW - scale * cameraX * halfW;
        const groundY = horizonY + scale * ProjectionEngine.CAMERA_HEIGHT * halfW;
        const drawX = centerX + veh.laneX * ppm * ProjectionEngine.ROAD_WIDTH;

        sprites.push({
          z: camDist,
          draw: () => drawVehicle(g, Math.round(drawX), Math.round(groundY), ppm, vehType, veh.color, fadeAlpha),
        });
      }
    }

    // ---- Opponents (other human players) ----
    const visibleOpponents: { opp: OpponentSprite; camDist: number }[] = [];
    for (const opp of opponents) {
      if (opp.id === selfId) continue;
      let oz = opp.z;
      oz += Math.floor((playerZ - oz + trackLength / 2) / trackLength) * trackLength;
      const camDist = oz - cameraZ;
      if (camDist <= ProjectionEngine.NEAR_PLANE || camDist > ProjectionEngine.OPP_DRAW_METERS) continue;
      visibleOpponents.push({ opp, camDist });
    }
    visibleOpponents.sort((a, b) => a.camDist - b.camDist);

    // One inverse-distance size law for every opponent, at every distance, ALWAYS drawn at
    // full detail. A prior LOD toggle (simplified/rider-less art beyond 55m or while crashed)
    // kept the numeric scale correct but silently dropped the sprite's visible top extent
    // from 28 to 17 "units" (helmet+rider omitted) at the exact same scale — a ~39% apparent
    // height cut that read as "opponent is way smaller than the player" even though the size
    // law itself was correct. With at most 3 opponents ever on screen and each draw being a
    // handful of cheap Graphics calls, the LOD wasn't saving anything worth that inconsistency.
    const baseBikeScale = viewH / 135;
    visibleOpponents.forEach(({ opp, camDist }) => {
      const scale = effectiveCameraDepth / camDist;
      const halfW = viewW / 2;
      const ppm = scale * halfW;
      const centerX = halfW - scale * cameraX * halfW;
      const groundY = horizonY + scale * ProjectionEngine.CAMERA_HEIGHT * halfW;
      const drawX = Math.round(centerX + opp.laneX * ppm * ProjectionEngine.ROAD_WIDTH);
      const groundYRounded = Math.round(groundY);
      const fadeAlpha = clamp01(camDist / 3) * clamp01((ProjectionEngine.OPP_DRAW_METERS - camDist) / 70);
      if (fadeAlpha <= 0) return;

      const clampedCamDist = Math.max(camDist, 2.0);
      const rawOppScale = baseBikeScale * (effectiveCameraBack / clampedCamDist);
      const floorScale = ProjectionEngine.OPP_MIN_PX / 28; // ~28px is the sprite's native height at scale=1
      const oppScale = Math.min(baseBikeScale * 3, Math.max(floorScale, rawOppScale));

      const showTag = camDist < ProjectionEngine.OPP_TAG_METERS;
      const flamePhase = opp.id * 1.7;

      sprites.push({
        z: camDist,
        draw: () => {
          if (opp.isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return; // flicker, matches local player
          const alpha = opp.eliminated ? fadeAlpha * 0.6 : fadeAlpha;
          drawSuperbikeRear(g, drawX, groundYRounded, oppScale, opp.leanAngle, opp.isNitroActive, {
            hull: opp.colorHex,
            suit: opp.suitColorHex,
            helmet: opp.helmetColorHex,
          }, flamePhase);
          if (showTag) drawPlayerTag(g, drawX, groundYRounded, opp.colorHex, opp.label, alpha, horizonY + 2);
        },
      });
    });

    // ---- Power-ups ----
    for (const pu of powerUps) {
      if (pu.collected) continue;
      let pz = pu.z;
      pz += Math.floor((playerZ - pz + trackLength / 2) / trackLength) * trackLength;
      const camDist = pz - cameraZ;
      if (camDist <= ProjectionEngine.NEAR_PLANE || camDist > ProjectionEngine.PU_DRAW_METERS) continue;

      const scale = effectiveCameraDepth / camDist;
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

    // Local player's own sprite, depth-sorted alongside everything else so a close opponent
    // (undertaking at < CAMERA_BACK metres) can correctly draw in front of it.
    if (selfBike) {
      sprites.push({
        z: effectiveCameraBack,
        draw: () => drawSuperbikeRear(
          g, selfBike.screenX, selfBike.screenY, selfBike.scale,
          selfBike.leanAngle, selfBike.isNitroActive, selfBike.colors, selfBike.id * 1.7
        ),
      });
    }

    // Far-to-near depth sort — sprites at greater camera distance draw first
    sprites.sort((a, b) => b.z - a.z);
    sprites.forEach((s) => s.draw());
  }

  private static renderPickup(g: Graphics, x: number, groundY: number, ppm: number, type: string, id: number, fadeAlpha: number): void {
    const floatH = ppm * 0.9;
    const size = Math.max(3, Math.round(ppm * 0.5));
    const y = groundY - floatH - Math.sin(Date.now() * 0.004 + id) * ppm * 0.15;
    const color = PICKUP_COLORS[type] ?? 0xf4d160;
    const pulse = (0.7 + Math.sin(Date.now() * 0.005 + id) * 0.3) * fadeAlpha;

    // Halo, shared by every type
    g.circle(x, y, size * 1.8).fill({ color, alpha: pulse * 0.15 });

    switch (type) {
      case 'boost': drawBoostIcon(g, x, y, size, color, pulse); break;
      case 'shield': drawShieldIcon(g, x, y, size, color, pulse); break;
      case 'nitroFull': drawNitroPickupIcon(g, x, y, size, color, pulse); break;
      case 'extraLife': drawHeartIcon(g, x, y, size, color, pulse); break;
      default: drawCoinIcon(g, x, y, size, color, pulse); break;
    }
  }
}

const PICKUP_COLORS: Record<string, number> = {
  boost: 0x00f0ff,
  shield: 0x55efc4,
  coin: 0xf4d160,
  nitroFull: 0xff8c00,
  extraLife: 0xff4757,
};

function drawBoostIcon(g: Graphics, x: number, y: number, size: number, color: number, a: number): void {
  for (const dy of [-size * 0.5, size * 0.15]) {
    g.poly([
      x - size * 0.8, y + dy + size * 0.5,
      x, y + dy - size * 0.1,
      x + size * 0.8, y + dy + size * 0.5,
      x, y + dy + size * 0.15,
    ]).fill({ color, alpha: a });
  }
}

function drawShieldIcon(g: Graphics, x: number, y: number, size: number, color: number, a: number): void {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + i * (Math.PI / 3);
    pts.push(x + Math.cos(ang) * size, y + Math.sin(ang) * size);
  }
  g.poly(pts).fill({ color, alpha: a });
  g.poly(pts).stroke({ width: 1, color: 0xffffff, alpha: a * 0.6 });
}

function drawCoinIcon(g: Graphics, x: number, y: number, size: number, color: number, a: number): void {
  g.circle(x, y, size).fill({ color, alpha: a });
  g.circle(x, y, size * 0.6).stroke({ width: 1, color: 0xffffff, alpha: a * 0.7 });
}

function drawNitroPickupIcon(g: Graphics, x: number, y: number, size: number, color: number, a: number): void {
  g.poly([
    x, y - size * 1.2,
    x + size * 0.7, y + size * 0.3,
    x, y + size * 0.9,
    x - size * 0.7, y + size * 0.3,
  ]).fill({ color, alpha: a });
  g.poly([
    x, y - size * 0.5,
    x + size * 0.3, y + size * 0.3,
    x, y + size * 0.6,
    x - size * 0.3, y + size * 0.3,
  ]).fill({ color: 0xfff3b0, alpha: a * 0.85 });
}

function drawHeartIcon(g: Graphics, x: number, y: number, size: number, color: number, a: number): void {
  g.circle(x - size * 0.5, y - size * 0.2, size * 0.55).fill({ color, alpha: a });
  g.circle(x + size * 0.5, y - size * 0.2, size * 0.55).fill({ color, alpha: a });
  g.poly([x - size, y, x + size, y, x, y + size * 1.1]).fill({ color, alpha: a });
}

function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}
