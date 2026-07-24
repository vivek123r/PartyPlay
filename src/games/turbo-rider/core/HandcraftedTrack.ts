import type { TrackSegment } from '../types';
import { ProjectionEngine } from '../render/ProjectionEngine';

export const TrackPhase = {
  COASTAL_INTRO: 0,      // 0 - 1500m
  MOUNTAIN_CLIMB: 1,     // 1500m - 3500m
  OCEAN_BRIDGE: 2,       // 3500m - 6000m
  NEON_TUNNEL: 3,        // 6000m - 8500m
  SUNSET_SPRINT: 4,      // 8500m - 10000m
} as const;

export type TrackPhaseType = typeof TrackPhase[keyof typeof TrackPhase];

export class HandcraftedTrack {
  public static readonly TOTAL_LENGTH_METERS = 10000;
  public static TOTAL_TRACK_DELTA_X = 0;

  public static generateTrack(): TrackSegment[] {
    const totalSegments = Math.floor(
      HandcraftedTrack.TOTAL_LENGTH_METERS / ProjectionEngine.SEGMENT_LENGTH
    );
    const segments: TrackSegment[] = [];

    let runningX = 0;
    let runningY = 0;

    for (let i = 0; i < totalSegments; i++) {
      const z = i * ProjectionEngine.SEGMENT_LENGTH;
      const phase = HandcraftedTrack.getPhaseForDistance(z);

      let curve = 0;
      let targetElevation = 0;
      let phaseName = 'COASTAL HIGHWAY';
      let grassColor = 0x10ac84;
      let rumbleColor = 0xff4757;
      let roadColor = 0x2f3542;
      let laneColor = 0xffffff;

      switch (phase) {
        case TrackPhase.COASTAL_INTRO: {
          phaseName = 'COASTAL INTRO';
          grassColor = i % 2 === 0 ? 0x10ac84 : 0x1dd1a1;
          rumbleColor = i % 2 === 0 ? 0xff4757 : 0xffffff;
          curve = i > 10 ? Math.sin((i - 10) / 12) * 1.5 : 0;
          targetElevation = 0;
          break;
        }

        case TrackPhase.MOUNTAIN_CLIMB: {
          phaseName = 'ALPINE MOUNTAIN CLIMB';
          grassColor = i % 2 === 0 ? 0x228b22 : 0x2e8b57;
          rumbleColor = i % 2 === 0 ? 0xffa502 : 0xffffff;
          const localI = i - 37;
          curve = Math.sin(localI / 8) * 3.6;
          targetElevation = Math.sin(localI / 12) * 110;
          break;
        }

        case TrackPhase.OCEAN_BRIDGE: {
          phaseName = 'OCEAN SUSPENSION BRIDGE';
          grassColor = 0x0984e3;
          rumbleColor = i % 2 === 0 ? 0x00cec9 : 0xffffff;
          roadColor = 0x1e272e;
          const localI = i - 87;
          curve = Math.cos(localI / 20) * 1.4;
          targetElevation = Math.sin(localI / 25) * 40;
          break;
        }

        case TrackPhase.NEON_TUNNEL: {
          phaseName = 'NEON UNDERGROUND TUNNEL';
          grassColor = 0x0f0e17;
          rumbleColor = i % 2 === 0 ? 0x00f0ff : 0xff0055;
          roadColor = 0x181824;
          laneColor = 0x00f0ff;
          const localI = i - 150;
          curve = Math.sin(localI / 10) * 2.8;
          targetElevation = -20;
          break;
        }

        case TrackPhase.SUNSET_SPRINT: {
          phaseName = 'SYNTHWAVE SUNSET SPRINT';
          grassColor = i % 2 === 0 ? 0x6c5ce7 : 0xa29bfe;
          rumbleColor = i % 2 === 0 ? 0xfd79a8 : 0xffffff;
          const localI = i - 212;
          curve = Math.sin(localI / 15) * 1.2;
          targetElevation = 0;
          break;
        }
      }

      const p1X = runningX;
      const p1Y = runningY;

      runningX += curve * 28;
      runningY = targetElevation;

      const p2X = runningX;
      const p2Y = runningY;

      segments.push({
        index: i,
        p1: {
          worldX: p1X,
          worldY: p1Y,
          worldZ: z,
        },
        p2: {
          worldX: p2X,
          worldY: p2Y,
          worldZ: z + ProjectionEngine.SEGMENT_LENGTH,
        },
        curve,
        elevation: targetElevation,
        color: {
          grass: grassColor,
          rumble: rumbleColor,
          road: roadColor,
          lane: laneColor,
        },
        phaseName,
        sprites: [],
      });
    }

    HandcraftedTrack.TOTAL_TRACK_DELTA_X = runningX;
    return segments;
  }

  private static getPhaseForDistance(z: number): TrackPhaseType {
    if (z < 1500) return TrackPhase.COASTAL_INTRO;
    if (z < 3500) return TrackPhase.MOUNTAIN_CLIMB;
    if (z < 6000) return TrackPhase.OCEAN_BRIDGE;
    if (z < 8500) return TrackPhase.NEON_TUNNEL;
    return TrackPhase.SUNSET_SPRINT;
  }
}
