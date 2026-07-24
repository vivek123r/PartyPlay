import type { BikePhysics } from './BikePhysics';

export interface AITrafficVehicle {
  id: number;
  laneX: number;  // -0.6 (left lane), 0.6 (right lane)
  z: number;      // track distance in meters
  speed: number;  // km/h
  type: 'sedan' | 'truck' | 'bike';
  color: number;
}

export class TrafficManager {
  public vehicles: AITrafficVehicle[] = [];
  public readonly MAX_VEHICLES = 14;

  public spawnTraffic(trackLengthMeters: number): void {
    this.vehicles = [];
    const lanes = [-0.6, 0.6];
    const types: ('sedan' | 'truck' | 'bike')[] = ['sedan', 'truck', 'bike'];
    const colors = [0xff4757, 0x1e90ff, 0x2ed573, 0xffa502, 0x70a1ff];

    // First traffic vehicle starts at z = 500m (giving 500m clear starting runway)
    let currentZ = 500;

    for (let i = 0; i < this.MAX_VEHICLES; i++) {
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const speed = 80 + Math.random() * 30; // 80-110 km/h

      this.vehicles.push({
        id: i + 1,
        laneX: lane,
        z: currentZ,
        speed,
        type,
        color,
      });

      // Maintain a minimum 600m gap between traffic vehicles
      currentZ += 600 + Math.random() * 300;
      if (currentZ > trackLengthMeters - 300) break;
    }
  }

  public update(dt: number, bikes: BikePhysics[], trackLengthMeters: number): void {
    // 1. Move AI Traffic along highway with matching 3.5x Arcade Velocity Scale
    const VELOCITY_SCALE = 3.5;
    this.vehicles.forEach((veh) => {
      veh.z += (veh.speed * 1000 / 3600) * VELOCITY_SCALE * dt;

      if (veh.z > trackLengthMeters) {
        veh.z -= trackLengthMeters;
      }
    });

    // 2. Check Collisions with player bikes (with invulnerability timer & continuous collision box)
    bikes.forEach((bike) => {
      if (bike.isCrashed || bike.invulnerabilityTimer > 0) return; // Full invulnerability protection

      this.vehicles.forEach((veh) => {
        let distZ = Math.abs(bike.z - veh.z);
        if (distZ > trackLengthMeters / 2) {
          distZ = trackLengthMeters - distZ;
        }

        const distX = Math.abs(bike.x - veh.laneX);

        // Accurate High-Speed Crash Collision Check (6.0m Z depth, 0.25 lane width)
        if (distZ < 6.0 && distX < 0.25) {
          bike.triggerCrash();
        }
      });
    });
  }
}
