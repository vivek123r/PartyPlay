import type { BikePhysics } from './BikePhysics';
import { BIKE_WIDTH_METERS, BIKE_LENGTH_METERS, ROAD_HALF_WIDTH_METERS } from './TrackConstants';

const Z_THRESH = BIKE_LENGTH_METERS; // combined (len+len)/2, both bikes equal
const X_THRESH = BIKE_WIDTH_METERS / ROAD_HALF_WIDTH_METERS; // (0.8+0.8)/(2*4.4)

const REAR_BUMP_IMPULSE_KMH = 10; // one-shot speed loss for the trailing rider on new contact
const REAR_BUMP_ASSIST_KMH = 3; // small one-shot reward for the leading rider (never harms them)
const REAR_DRAG_KMH_PER_SEC = 40; // continuous, dt-scaled drag on the trailing rider while overlapping
export const BUMP_COLLISION_COOLDOWN_S = 0.6; // throttles the one-shot event/feedback, not the continuous drag
const REAR_BUMP_HEALTH_DAMAGE = 8; // trailing rider only
const SIDE_BUMP_HEALTH_DAMAGE = 5; // both riders — modest, contact should be consequential, not punishing

export interface BumpEvent {
  aId: number; // leading rider in a rear bump; either side in a side bump
  bId: number; // trailing rider in a rear bump
  kind: 'side' | 'rear';
  idxA: number;
  idxB: number;
}

/**
 * Resolves overlap between human players' bikes. Never touches z, so a bump can never reorder
 * race standings — only ever nudges lateral position, speed, and (via applyDamage) health on
 * new contact; health reaching 0 can still trigger the normal crash/life-loss sequence, same as
 * any other damage source, but that's applyDamage's job, not this module's. Single i<j pass
 * (not TrafficManager's nested-forEach-over-two-arrays shape, which would double-count every
 * pair), minimum-translation-vector axis choice for side-vs-rear.
 */
export function resolveBikeCollisions(
  bikes: BikePhysics[],
  trackLength: number,
  dt: number,
  cooldowns: Map<string, number>
): BumpEvent[] {
  const events: BumpEvent[] = [];
  const n = bikes.length;
  const dxDelta = new Array<number>(n).fill(0);
  const speedDelta = new Array<number>(n).fill(0);

  for (const [key, t] of cooldowns) {
    const next = t - dt;
    if (next <= 0) cooldowns.delete(key);
    else cooldowns.set(key, next);
  }

  for (let i = 0; i < n; i++) {
    const a = bikes[i];
    if (a.eliminated || a.isCrashed || a.invulnerabilityTimer > 0) continue;
    for (let j = i + 1; j < n; j++) {
      const b = bikes[j];
      if (b.eliminated || b.isCrashed || b.invulnerabilityTimer > 0) continue;

      let dz = b.z - a.z;
      if (dz > trackLength / 2) dz -= trackLength;
      else if (dz < -trackLength / 2) dz += trackLength;
      const absDz = Math.abs(dz);
      if (absDz >= Z_THRESH) continue;

      const dx = b.x - a.x;
      const absDx = Math.abs(dx);
      if (absDx >= X_THRESH) continue;

      const penZ = (Z_THRESH - absDz) / Z_THRESH;
      const penX = (X_THRESH - absDx) / X_THRESH;
      const key = a.id < b.id ? `${a.id}_${b.id}` : `${b.id}_${a.id}`;
      const onCooldown = cooldowns.has(key);

      if (penZ < penX) {
        // ---- Rear-end: front/back determined by the wrapped sign of dz ----
        const frontIsB = dz > 0;
        const backIdx = frontIsB ? i : j;
        const frontIdx = frontIsB ? j : i;

        if (!onCooldown) {
          speedDelta[backIdx] -= REAR_BUMP_IMPULSE_KMH;
          speedDelta[frontIdx] += REAR_BUMP_ASSIST_KMH;
          bikes[backIdx].applyDamage(REAR_BUMP_HEALTH_DAMAGE);
          cooldowns.set(key, BUMP_COLLISION_COOLDOWN_S);
          events.push({ aId: bikes[frontIdx].id, bId: bikes[backIdx].id, kind: 'rear', idxA: frontIdx, idxB: backIdx });
        }
        speedDelta[backIdx] -= REAR_DRAG_KMH_PER_SEC * dt;
        bikes[backIdx].slipstreamBonus = 0;
      } else {
        // ---- Side: fully resolve overlap every frame, split 50/50 ----
        const pushDir = dx !== 0 ? Math.sign(dx) : (b.id > a.id ? 1 : -1);
        const push = (X_THRESH - absDx) * 0.5;
        dxDelta[i] -= pushDir * push;
        dxDelta[j] += pushDir * push;

        if (!onCooldown) {
          a.applyDamage(SIDE_BUMP_HEALTH_DAMAGE);
          b.applyDamage(SIDE_BUMP_HEALTH_DAMAGE);
          cooldowns.set(key, BUMP_COLLISION_COOLDOWN_S);
          events.push({ aId: a.id, bId: b.id, kind: 'side', idxA: i, idxB: j });
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (dxDelta[i] !== 0) bikes[i].x = Math.max(-1.8, Math.min(1.8, bikes[i].x + dxDelta[i]));
    if (speedDelta[i] !== 0) bikes[i].speed = Math.max(0, bikes[i].speed + speedDelta[i]);
  }

  return events;
}
