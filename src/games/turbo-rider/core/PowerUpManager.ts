import type { BikePhysics } from './BikePhysics';

export interface PowerUp {
  id: number;
  laneX: number;
  z: number;
  type: 'boost' | 'shield' | 'coin';
  collected: boolean;
  respawnTimer: number;
}

const LANES = [-0.7, -0.3, 0.3, 0.7];
const TYPES: ('boost' | 'shield' | 'coin')[] = ['boost', 'boost', 'shield', 'coin'];

export class PowerUpManager {
  public pickups: PowerUp[] = [];
  private nextId = 1;

  public spawnForTrack(trackLength: number): void {
    this.pickups = [];
    let z = 150;
    while (z < trackLength - 150) {
      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      const laneX = LANES[Math.floor(Math.random() * LANES.length)];
      this.pickups.push({
        id: this.nextId++,
        laneX,
        z,
        type,
        collected: false,
        respawnTimer: 0,
      });
      z += 200 + Math.random() * 160;
    }
  }

  public update(dt: number, bikes: BikePhysics[], trackLength: number): void {
    // Respawn collected pickups
    this.pickups.forEach((pu) => {
      if (pu.collected) {
        pu.respawnTimer -= dt;
        if (pu.respawnTimer <= 0) {
          pu.collected = false;
          pu.respawnTimer = 0;
        }
      }
    });

    // Check collection by each bike
    bikes.forEach((bike) => {
      if (bike.isCrashed || bike.eliminated) return;

      this.pickups.forEach((pu) => {
        if (pu.collected) return;

        let dz = Math.abs(bike.z - pu.z);
        if (dz > trackLength / 2) dz = trackLength - dz;
        const dx = Math.abs(bike.x - pu.laneX);

        if (dz < 2.5 && dx < 0.2) {
          pu.collected = true;
          pu.respawnTimer = 15;
          this.applyPickup(bike, pu.type);
        }
      });
    });
  }

  private applyPickup(bike: BikePhysics, type: string): void {
    if (type === 'boost') {
      bike.speed = Math.min(bike.stats.topSpeed * 1.45, bike.speed * 1.3 + 60);
    } else if (type === 'shield') {
      bike.shieldTimer = 10;
      bike.lives = Math.min(3, bike.lives + 1);
    } else if (type === 'coin') {
      bike.coinsCollected++;
    }
  }
}
