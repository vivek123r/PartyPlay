import type { TrackSegment } from '../types';
import { SEGMENT_LENGTH_METERS } from './TrackConstants';

export const TrackPhase = {
  COASTAL_INTRO: 0,
  MOUNTAIN_CLIMB: 1,
  OCEAN_BRIDGE: 2,
  NEON_TUNNEL: 3,
  SUNSET_SPRINT: 4,
} as const;

export type TrackPhaseType = typeof TrackPhase[keyof typeof TrackPhase];

export class HandcraftedTrack {
  // 6000m divides evenly by SEGMENT_LENGTH_METERS (6m) -> exactly 1000 segments,
  // and at VELOCITY_SCALE = 1.0 gives a ~70-100s race matching the manifest's estimate.
  public static readonly TOTAL_LENGTH_METERS = 6000;
  public static TOTAL_TRACK_DELTA_X = 0;

  public static generateTrack(): TrackSegment[] {
    const totalSegments = Math.floor(
      HandcraftedTrack.TOTAL_LENGTH_METERS / SEGMENT_LENGTH_METERS
    );
    const segments: TrackSegment[] = [];

    for (let i = 0; i < totalSegments; i++) {
      const z = i * SEGMENT_LENGTH_METERS;
      const phase = HandcraftedTrack.getPhaseForDistance(z);
      const phaseIndex = phase;

      let phaseName = 'COASTAL HIGHWAY';
      let grassColor = 0x10ac84;
      let rumbleColor = 0xff4757;
      let roadColor = 0x2f3542;
      let laneColor = 0xffffff;

      switch (phase) {
        case TrackPhase.COASTAL_INTRO:
          phaseName = 'COASTAL INTRO';
          grassColor = 0x10ac84;
          rumbleColor = 0xff4757;
          break;
        case TrackPhase.MOUNTAIN_CLIMB:
          phaseName = 'ALPINE MOUNTAIN CLIMB';
          grassColor = 0x228b22;
          rumbleColor = 0xffa502;
          break;
        case TrackPhase.OCEAN_BRIDGE:
          phaseName = 'OCEAN SUSPENSION BRIDGE';
          grassColor = 0x0984e3;
          rumbleColor = 0x00cec9;
          roadColor = 0x1e272e;
          break;
        case TrackPhase.NEON_TUNNEL:
          phaseName = 'NEON UNDERGROUND TUNNEL';
          grassColor = 0x0f0e17;
          rumbleColor = 0x00f0ff;
          roadColor = 0x181824;
          laneColor = 0x00f0ff;
          break;
        case TrackPhase.SUNSET_SPRINT:
          phaseName = 'SYNTHWAVE SUNSET SPRINT';
          grassColor = 0x6c5ce7;
          rumbleColor = 0xfd79a8;
          break;
      }

      segments.push({
        index: i,
        p1: { worldX: 0, worldY: 0, worldZ: z },
        p2: { worldX: 0, worldY: 0, worldZ: z + SEGMENT_LENGTH_METERS },
        curve: 0,
        elevation: 0,
        color: { grass: grassColor, rumble: rumbleColor, road: roadColor, lane: laneColor },
        phaseName,
        phaseIndex,
        sprites: [],
      });
    }

    HandcraftedTrack.TOTAL_TRACK_DELTA_X = 0;
    return segments;
  }

  // Fractions of TOTAL_LENGTH_METERS rather than absolute metres, so the phase
  // split stays correct if the track length is ever retuned again.
  public static getPhaseForDistance(z: number): TrackPhaseType {
    const total = HandcraftedTrack.TOTAL_LENGTH_METERS;
    if (z < total * 0.15) return TrackPhase.COASTAL_INTRO;
    if (z < total * 0.35) return TrackPhase.MOUNTAIN_CLIMB;
    if (z < total * 0.60) return TrackPhase.OCEAN_BRIDGE;
    if (z < total * 0.85) return TrackPhase.NEON_TUNNEL;
    return TrackPhase.SUNSET_SPRINT;
  }
}