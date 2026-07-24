import { Graphics, Texture } from 'pixi.js';
import type { Point3D, TrackSegment } from '../types';
import type { AITrafficVehicle } from '../core/TrafficManager';
import { HandcraftedTrack } from '../core/HandcraftedTrack';

export class ProjectionEngine {
  public static readonly ROAD_WIDTH = 2000;
  public static readonly SEGMENT_LENGTH = 40;  // High-resolution 40m segments
  public static readonly DRAW_DISTANCE = 150;   // Draw 150 segments ahead (6000m depth)
  public static readonly CAMERA_DEPTH = 0.55;  // Perspective focal depth scale
  public static readonly CAMERA_HEIGHT = 600;

  public static project(
    p: Point3D,
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    screenWidth: number,
    screenHeight: number,
    horizonY: number
  ): Point3D {
    const camX = (p.worldX || 0) - cameraX;
    const camY = (p.worldY || 0) - cameraY;
    const camZ = (p.worldZ || 0) - cameraZ;

    const scale = ProjectionEngine.CAMERA_DEPTH / Math.max(1, camZ);

    const screenX = Math.round(
      screenWidth / 2 + (scale * camX * screenWidth) / 2
    );
    const screenY = Math.round(
      horizonY - (scale * camY * screenHeight) / 2
    );
    const projectedWidth = Math.round(
      (scale * ProjectionEngine.ROAD_WIDTH * screenWidth) / 2
    );

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

  public static renderViewportRoad(
    g: Graphics,
    segments: TrackSegment[],
    playerZ: number,
    playerX: number,
    viewW: number,
    viewH: number,
    trafficVehicles: AITrafficVehicle[] = [],
    skyboxTexture?: Texture | null,
    fireTexture?: Texture | null
  ): void {
    if (segments.length === 0) return;

    const totalSegs = segments.length;
    const trackLength = totalSegs * ProjectionEngine.SEGMENT_LENGTH;
    const totalTrackDeltaX = HandcraftedTrack.TOTAL_TRACK_DELTA_X;

    const startSegmentIndex = Math.floor(playerZ / ProjectionEngine.SEGMENT_LENGTH);
    const baseSegmentIndex = startSegmentIndex % totalSegs;
    const nextSegmentIndex = (startSegmentIndex + 1) % totalSegs;
    const baseLoop = Math.floor(startSegmentIndex / totalSegs);

    const baseSegment = segments[baseSegmentIndex];
    const nextSegment = segments[nextSegmentIndex];

    const percent = (playerZ % ProjectionEngine.SEGMENT_LENGTH) / ProjectionEngine.SEGMENT_LENGTH;
    
    let nextWorldX = nextSegment.p1.worldX;
    if (nextSegmentIndex === 0) {
      nextWorldX += totalTrackDeltaX;
    }

    const curTrackX = baseSegment.p1.worldX + (nextWorldX - baseSegment.p1.worldX) * percent + baseLoop * totalTrackDeltaX;
    const curTrackY = baseSegment.p1.worldY + (nextSegment.p1.worldY - baseSegment.p1.worldY) * percent;

    const cameraX = curTrackX + playerX * ProjectionEngine.ROAD_WIDTH;
    const cameraY = ProjectionEngine.CAMERA_HEIGHT + curTrackY;
    const cameraZ = playerZ;

    // 1. Render Video / Synthwave Sunset Skybox Backdrop
    const horizonY = Math.round(viewH * 0.45);

    if (skyboxTexture && skyboxTexture !== Texture.WHITE) {
      g.texture(skyboxTexture, 0xffffff, 0, 0, viewW, horizonY);
    } else {
      g.rect(0, 0, viewW, horizonY).fill({ color: 0x0f0e17 });
      g.circle(viewW / 2, horizonY - 12, 22).fill({ color: 0xff0055 });
      g.circle(viewW / 2, horizonY - 12, 16).fill({ color: 0xf4d160 });

      const mountPoly = [
        0, horizonY,
        40, horizonY - 14,
        90, horizonY - 4,
        150, horizonY - 22,
        220, horizonY - 6,
        290, horizonY - 18,
        360, horizonY - 5,
        420, horizonY - 16,
        viewW, horizonY
      ];
      g.poly(mountPoly).fill({ color: 0x2d3436 });
    }

    // Ocean / Cyber Horizon Line
    g.rect(0, horizonY - 3, viewW, 3).fill({ color: 0x00f0ff, alpha: 0.6 });

    // 2. Project Segment Coordinates continuously in 3D Absolute Space into a Local Array
    const projectedSegs: { p1: Point3D; p2: Point3D; color: any; curve: number; index: number; worldZ: number }[] = [];

    for (let n = 0; n < ProjectionEngine.DRAW_DISTANCE; n++) {
      const globalSegIdx = startSegmentIndex + n;
      const segIndex = globalSegIdx % totalSegs;
      const segLoop = Math.floor(globalSegIdx / totalSegs);
      const loopOffsetX = segLoop * totalTrackDeltaX;

      const seg = segments[segIndex];
      const nextSegIndex = (segIndex + 1) % totalSegs;
      const nextSeg = segments[nextSegIndex];
      const nextLoopOffsetX = Math.floor((globalSegIdx + 1) / totalSegs) * totalTrackDeltaX;

      const worldZ1 = globalSegIdx * ProjectionEngine.SEGMENT_LENGTH;
      const worldZ2 = (globalSegIdx + 1) * ProjectionEngine.SEGMENT_LENGTH;

      const rawP1: Point3D = {
        worldX: seg.p1.worldX + loopOffsetX,
        worldY: seg.p1.worldY,
        worldZ: worldZ1,
      };

      const rawP2: Point3D = {
        worldX: seg.p2.worldX + nextLoopOffsetX,
        worldY: nextSeg.p1.worldY,
        worldZ: worldZ2,
      };

      const proj1 = ProjectionEngine.project(rawP1, cameraX, cameraY, cameraZ, viewW, viewH, horizonY);
      const proj2 = ProjectionEngine.project(rawP2, cameraX, cameraY, cameraZ, viewW, viewH, horizonY);

      projectedSegs.push({
        p1: proj1,
        p2: proj2,
        color: seg.color,
        curve: seg.curve,
        index: segIndex,
        worldZ: worldZ1,
      });
    }

    // 3. Render 3D Road Quads & 3D AI Traffic Vehicles (Back-to-Front iteration)
    for (let n = projectedSegs.length - 1; n >= 0; n--) {
      const seg = projectedSegs[n];
      const p1 = seg.p1;
      const p2 = seg.p2;

      if ((p2.cameraZ || 0) <= ProjectionEngine.CAMERA_DEPTH) continue;

      const x1 = p1.screenX || 0;
      const y1 = p1.screenY || 0;
      const w1 = p1.projectedWidth || 0;

      const x2 = p2.screenX || 0;
      const y2 = p2.screenY || 0;
      const w2 = p2.projectedWidth || 0;

      if (y1 <= y2) continue;

      // a) Grass Field
      g.poly([0, y2, viewW, y2, viewW, y1, 0, y1]).fill({ color: seg.color.grass });

      // b) Rumble Strips
      const rW1 = w1 * 0.18;
      const rW2 = w2 * 0.18;
      g.poly([x1 - w1 - rW1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - rW2, y2]).fill({ color: seg.color.rumble });
      g.poly([x1 + w1, y1, x1 + w1 + rW1, y1, x2 + w2 + rW2, y2, x2 + w2, y2]).fill({ color: seg.color.rumble });

      // c) Dark Asphalt Tarmac Road Surface Quad
      g.poly([x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2]).fill({ color: seg.color.road });

      // d) White Center Lane Stripe
      if (Math.floor(seg.index / 3) % 2 === 0) {
        const cW1 = w1 * 0.04;
        const cW2 = w2 * 0.04;
        g.poly([x1 - cW1, y1, x1 + cW1, y1, x2 + cW2, y2, x2 - cW2, y2]).fill({ color: seg.color.lane });
      }

      // Render Roadside 3D Pillars with Live Transparent Fire Video Torches!
      if (seg.index % 8 === 0) {
        const sideX = x1 + w1 + 18;
        const sideH = Math.max(4, Math.round(w1 * 0.35));
        const sideW = Math.max(3, Math.round(w1 * 0.15));

        // Pillar Base
        g.rect(sideX, y1 - sideH, sideW, sideH).fill({ color: 0x2d3436 });

        // Live Burning Fire Torch with 100% Transparent Background!
        if (fireTexture && fireTexture !== Texture.WHITE) {
          const fireW = Math.max(12, Math.round(w1 * 0.48));
          const fireH = Math.max(16, Math.round(w1 * 0.68));
          const fireX = sideX - fireW / 3;
          const fireY = y1 - sideH - fireH + 3;

          g.texture(fireTexture, 0xfffffe, fireX, fireY, fireW, fireH);
        }
      }

      // Render Visible 3D AI Traffic Vehicles with Sub-Segment Interpolation
      const vehiclesHere = trafficVehicles.filter((v) => {
        let vz = v.z;
        vz += Math.floor((playerZ - vz + trackLength / 2) / trackLength) * trackLength;
        return vz >= seg.worldZ && vz < seg.worldZ + ProjectionEngine.SEGMENT_LENGTH;
      });

      for (const veh of vehiclesHere) {
        let vz = veh.z;
        vz += Math.floor((playerZ - vz + trackLength / 2) / trackLength) * trackLength;

        const t = (vz - seg.worldZ) / ProjectionEngine.SEGMENT_LENGTH;
        const segX = (p1.screenX || 0) + ((p2.screenX || 0) - (p1.screenX || 0)) * t;
        const segY = (p1.screenY || 0) + ((p2.screenY || 0) - (p1.screenY || 0)) * t;
        const segW = (p1.projectedWidth || 0) + ((p2.projectedWidth || 0) - (p1.projectedWidth || 0)) * t;

        const vehX = Math.round(segX + veh.laneX * segW);
        const vehY = Math.round(segY);

        ProjectionEngine.renderAIVehicle(g, vehX, vehY, segW, veh.type, veh.color);
      }
    }
  }

  private static renderAIVehicle(g: Graphics, x: number, y: number, segW: number, type: string, color: number): void {
    if (type === 'truck') {
      const w = Math.max(16, Math.round(segW * 0.55));
      const h = Math.max(14, Math.round(segW * 0.48));

      g.rect(x - w / 2, y - 2, w, 4).fill({ color: 0x000000, alpha: 0.5 });
      g.rect(x - w / 2, y - h, w, h).fill({ color: color });
      g.rect(x - w / 2 + 2, y - h + 2, w - 4, h - 4).fill({ color: 0x353b48 });

      const ribs = 4;
      for (let r = 1; r < ribs; r++) {
        const rx = x - w / 2 + (w / ribs) * r;
        g.rect(rx - 1, y - h + 3, 2, h - 6).fill({ color: 0x7f8c8d });
      }

      g.rect(x - w * 0.4, y - h + 3, w * 0.8, Math.max(2, h * 0.12)).fill({ color: 0xff0055 });

      const flapW = Math.max(3, w * 0.22);
      const flapH = Math.max(3, h * 0.25);
      g.rect(x - w * 0.45, y - flapH, flapW, flapH).fill({ color: 0x1e272e });
      g.rect(x + w * 0.45 - flapW, y - flapH, flapW, flapH).fill({ color: 0x1e272e });
      g.rect(x - w * 0.45, y - 2, flapW, 2).fill({ color: 0xdcdde1 });
      g.rect(x + w * 0.45 - flapW, y - 2, flapW, 2).fill({ color: 0xdcdde1 });

      g.rect(x - w * 0.48, y - flapH + 1, flapW - 1, flapH - 2).fill({ color: 0x0f0e17 });
      g.rect(x + w * 0.48 - flapW + 1, y - flapH - 1, flapW - 1, flapH - 2).fill({ color: 0x0f0e17 });

    } else if (type === 'bike') {
      const w = Math.max(10, Math.round(segW * 0.28));
      const h = Math.max(10, Math.round(segW * 0.26));

      g.rect(x - 3, y - 6, 6, 6).fill({ color: 0x1e272e });
      g.rect(x - w / 2, y - h, w, Math.max(3, h * 0.4)).fill({ color: color });
      g.rect(x - 3, y - h - 3, 6, 4).fill({ color: 0x2d3436 });

    } else {
      const w = Math.max(14, Math.round(segW * 0.42));
      const h = Math.max(10, Math.round(segW * 0.32));

      g.rect(x - w / 2, y - 2, w, 3).fill({ color: 0x000000, alpha: 0.4 });
      g.rect(x - w / 2, y - h * 0.65, w, h * 0.65).fill({ color: color });

      g.rect(x - w * 0.36, y - h, w * 0.72, h * 0.4).fill({ color: 0x1e272e });
      g.rect(x - w * 0.32, y - h + 1, w * 0.64, h * 0.35).fill({ color: 0x0984e3, alpha: 0.8 });

      g.rect(x - w * 0.45, y - h * 0.45, w * 0.9, h * 0.3).fill({ color: color });

      const tailW = Math.max(2, w * 0.24);
      const tailH = Math.max(2, h * 0.2);
      g.rect(x - w * 0.46, y - h * 0.45, tailW, tailH).fill({ color: 0xff0055 });
      g.rect(x + w * 0.46 - tailW, y - h * 0.45, tailW, tailH).fill({ color: 0xff0055 });

      g.rect(x - 3, y - h * 0.3, 6, 3).fill({ color: 0xfffffe });

      g.rect(x - w * 0.3, y - 2, 3, 2).fill({ color: 0xdcdde1 });
      g.rect(x + w * 0.3 - 3, y - 2, 3, 2).fill({ color: 0xdcdde1 });

      const tireW = Math.max(2, w * 0.18);
      const tireH = Math.max(3, h * 0.3);
      g.rect(x - w * 0.48, y - tireH, tireW, tireH).fill({ color: 0x1e272e });
      g.rect(x + w * 0.48 - tireW, y - tireH, tireW, tireH).fill({ color: 0x1e272e });
    }
  }
}
