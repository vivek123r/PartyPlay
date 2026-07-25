import type { BikePhysics } from './BikePhysics';

export type PowerUpType = 'boost' | 'shield' | 'coin' | 'nitroFull' | 'extraLife';

export interface PowerUp {
  id: number;
  laneX: number;
  z: number;
  type: PowerUpType;
  collected: boolean;
  respawnTimer: number;
}

const LANES = [-0.7, -0.3, 0.3, 0.7];
// Weighted spawn pool (3:3:2:2:1) — boost/coin common, shield/nitroFull moderate,
// extraLife rare and higher-value.
const TYPES: PowerUpType[] = [
  'boost', 'boost', 'boost',
  'coin', 'coin', 'coin',
  'shield', 'shield',
  'nitroFull', 'nitroFull',
  'extraLife',
];

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

  public update(
    dt: number,
    bikes: BikePhysics[],
    trackLength: number,
    onCollect?: (bike: BikePhysics, type: PowerUpType) => void
  ): void {
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
          onCollect?.(bike, pu.type);
        }
      });
    });
  }

  private applyPickup(bike: BikePhysics, type: PowerUpType): void {
    if (type === 'boost') {
      bike.speed = Math.min(bike.stats.topSpeed * 1.45, bike.speed * 1.3 + 60);
    } else if (type === 'shield') {
      // Redefined now that health exists: temporary invulnerability + full health restore.
      // No longer also grants a life — extraLife is the dedicated (rarer) pickup for that.
      bike.shieldTimer = 10;
      bike.health = 100;
    } else if (type === 'coin') {
      bike.coinsCollected++;
      bike.nitroGauge = Math.min(100, bike.nitroGauge + 15);
    } else if (type === 'nitroFull') {
      bike.nitroGauge = 100;
    } else if (type === 'extraLife') {
      bike.lives = Math.min(3, bike.lives + 1);
    }
  }
}
