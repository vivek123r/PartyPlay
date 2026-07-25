import type { BikePhysics } from './BikePhysics';
import { ROAD_HALF_WIDTH_METERS, BIKE_WIDTH_METERS, BIKE_LENGTH_METERS } from './TrackConstants';
import { VEHICLE_DIMENSIONS_M, HAZARD_KINDS, MOVING_KINDS, type VehicleKind } from '../render/VehicleSprites';

export type { VehicleKind };

export interface AITrafficVehicle {
  id: number;
  laneX: number;  // -0.6 (left lane), 0.6 (right lane); hazards may sit off-centre
  z: number;      // track distance in metres
  speed: number;  // km/h, 0 for stationary hazards
  type: VehicleKind;
  color: number;
}

const MOVING_COLORS = [0xff4757, 0x1e90ff, 0x2ed573, 0xffa502, 0x70a1ff, 0xe17055, 0xa29bfe];
const VELOCITY_SCALE = 1.0; // must match BikePhysics.VELOCITY_SCALE — both operate on the same metric world

// Per-type hit severity — health damage + an immediate speed penalty applied on every hit,
// separate from whatever triggerCrash() does once health actually reaches 0. A cone and a
// truck used to produce the exact identical one-life-loss outcome; this is what varies it.
const HIT_SEVERITY: Record<VehicleKind, { health: number; speedFactor: number }> = {
  cone: { health: 8, speedFactor: 0.9 },
  barrel: { health: 15, speedFactor: 0.85 },
  barrier: { health: 25, speedFactor: 0.75 },
  oilslick: { health: 10, speedFactor: 0.95 },
  bike: { health: 20, speedFactor: 0.85 },
  sedan: { health: 30, speedFactor: 0.75 },
  bus: { health: 45, speedFactor: 0.6 },
  truck: { health: 60, speedFactor: 0.5 },
};
const HIT_COOLDOWN_S = 0.5; // stops a stationary hazard draining health every single frame

export class TrafficManager {
  public vehicles: AITrafficVehicle[] = [];
  public readonly MAX_VEHICLES = 40;
  private hitCooldowns = new Map<string, number>();

  public spawnTraffic(trackLengthMeters: number, density = 1.0): void {
    this.vehicles = [];
    const lanes = [-0.6, 0.6];

    const minGap = 110 / density;
    const maxVeh = Math.max(20, Math.floor(this.MAX_VEHICLES * density));

    let currentZ = 220; // clear starting runway

    for (let i = 0; i < maxVeh; i++) {
      const isHazard = Math.random() < 0.18;
      const type: VehicleKind = isHazard
        ? HAZARD_KINDS[Math.floor(Math.random() * HAZARD_KINDS.length)]
        : MOVING_KINDS[Math.floor(Math.random() * MOVING_KINDS.length)];
      const color = isHazard ? 0xf4d160 : MOVING_COLORS[Math.floor(Math.random() * MOVING_COLORS.length)];
      const laneX = isHazard
        ? (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.5)
        : lanes[Math.floor(Math.random() * lanes.length)];
      const speed = isHazard ? 0 : 70 + Math.random() * 35;

      this.vehicles.push({ id: i + 1, laneX, z: currentZ, speed, type, color });

      currentZ += minGap + Math.random() * (140 / density);
      if (currentZ > trackLengthMeters - 100) break;
    }
  }

  public update(dt: number, bikes: BikePhysics[], trackLengthMeters: number): void {
    this.vehicles.forEach((veh) => {
      if (veh.speed === 0) return; // stationary hazard
      veh.z += (veh.speed * 1000 / 3600) * VELOCITY_SCALE * dt;
      if (veh.z > trackLengthMeters) veh.z -= trackLengthMeters;
    });

    for (const [key, t] of this.hitCooldowns) {
      const next = t - dt;
      if (next <= 0) this.hitCooldowns.delete(key);
      else this.hitCooldowns.set(key, next);
    }

    bikes.forEach((bike) => {
      if (bike.isCrashed || bike.invulnerabilityTimer > 0) return;

      this.vehicles.forEach((veh) => {
        let distZ = Math.abs(bike.z - veh.z);
        if (distZ > trackLengthMeters / 2) distZ = trackLengthMeters - distZ;

        const dims = VEHICLE_DIMENSIONS_M[veh.type];
        const zThresh = (dims.length + BIKE_LENGTH_METERS) / 2;
        if (distZ > zThresh + 25) return; // cheap early-out well beyond collision range

        const distX = Math.abs(bike.x - veh.laneX);
        const xThresh = (dims.width + BIKE_WIDTH_METERS) / (2 * ROAD_HALF_WIDTH_METERS);

        if (distZ < zThresh && distX < xThresh) {
          const key = `${bike.id}_${veh.id}`;
          if (this.hitCooldowns.has(key)) return;
          this.hitCooldowns.set(key, HIT_COOLDOWN_S);

          const sev = HIT_SEVERITY[veh.type];
          bike.applyDamage(sev.health, sev.speedFactor);
          if (veh.type === 'oilslick') bike.slipTimer = 1.5;
        }
      });
    });
  }
}
