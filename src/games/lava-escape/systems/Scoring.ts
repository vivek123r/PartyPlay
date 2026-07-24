import type { MatchRecord } from '../types';
import { LAVA_ESCAPE_CONFIG } from '../config';

export function pointsForPosition(position: number): number {
  return LAVA_ESCAPE_CONFIG.FINISH_POINTS[position - 1] ?? 0;
}

export function compareMatchRecords(a: MatchRecord, b: MatchRecord): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.firstPlaces !== b.firstPlaces) return b.firstPlaces - a.firstPlaces;
  if (a.levelsSurvived !== b.levelsSurvived) return b.levelsSurvived - a.levelsSurvived;
  if (a.cumulativeTime !== b.cumulativeTime) return a.cumulativeTime - b.cumulativeTime;
  if (a.lastProgress !== b.lastProgress) return b.lastProgress - a.lastProgress;
  return a.playerId - b.playerId;
}

export function rankMatchRecords(records: Iterable<MatchRecord>): MatchRecord[] {
  return Array.from(records).sort(compareMatchRecords);
}
