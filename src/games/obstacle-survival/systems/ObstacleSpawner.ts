import { Container } from 'pixi.js';
import { Obstacle } from '../entities/Obstacle';
import type { ObstacleType } from '../entities/Obstacle';
import { Projectile } from '../entities/Projectile';
import { Portal } from '../entities/Portal';
import type { PRNG } from '@shared/utils/random';

export class ObstacleSpawner {
  private parentContainer: Container;
  private random: PRNG;
  private playerRadius: number;
  private obstacles: Obstacle[] = [];
  private projectiles: Projectile[] = [];
  private portals: Portal[] = [];
  private spawnTimer = 0;
  private waveCount = 0;
  private lastPortalWave = 0;

  constructor(parentContainer: Container, random: PRNG, playerRadius: number) {
    this.parentContainer = parentContainer;
    this.random = random;
    this.playerRadius = playerRadius;
  }

  public update(
    dt: number,
    scrollSpeed: number,
    screenWidth: number,
    screenHeight: number,
    densityMultiplier: number
  ): void {
    // 1. Move & update active obstacles
    this.obstacles.forEach((obs) => obs.update(dt, scrollSpeed));

    // Remove out-of-bounds or shattered obstacles
    this.obstacles = this.obstacles.filter((obs) => {
      if (obs.isOutOfBounds(screenHeight) || obs.isShattered) {
        obs.destroy();
        return false;
      }
      return true;
    });

    // 2. Move & update active projectiles
    this.projectiles.forEach((proj) => proj.update(dt, scrollSpeed));
    this.projectiles = this.projectiles.filter((proj) => {
      if (proj.isOutOfBounds(screenWidth, screenHeight) || !proj.isAlive) {
        proj.destroy();
        return false;
      }
      return true;
    });

    // 3. Move & update active portals
    this.portals.forEach((portal) => portal.update(dt, scrollSpeed));
    this.portals = this.portals.filter((portal) => {
      if (portal.isOutOfBounds(screenHeight) || !portal.isAlive) {
        portal.destroy();
        return false;
      }
      return true;
    });

    // 4. Fair Spawn Timer Check (1.6s interval base)
    const currentInterval = 1.6 / densityMultiplier;
    this.spawnTimer += dt;

    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.waveCount++;
      this.spawnFairMultiPathRow(screenWidth);
    }
  }

  private spawnFairMultiPathRow(screenWidth: number): void {
    const gapWidth = 90;
    const laneWidth = screenWidth / 3;

    // Determine gap placement
    const pathChoice = this.random();
    let gapPositions: number[] = [];

    if (pathChoice < 0.45) {
      const isLeft = this.random() > 0.5;
      gapPositions = [isLeft ? 25 : screenWidth - gapWidth - 25];
    } else if (pathChoice < 0.80) {
      gapPositions = [25, screenWidth - gapWidth - 25];
    } else {
      gapPositions = [laneWidth + (laneWidth - gapWidth) / 2];
    }

    // Build row blocks around gaps
    let currentX = 0;
    const sortedGaps = gapPositions.sort((a, b) => a - b);

    sortedGaps.forEach((gapX) => {
      if (gapX > currentX + 12) {
        const blockWidth = gapX - currentX;
        const obstacleType = blockWidth > 50 ? this.selectObstacleType() : 'standard';
        const obstacle = new Obstacle(currentX, -40, blockWidth, 28, obstacleType);
        this.obstacles.push(obstacle);
        this.parentContainer.addChild(obstacle.container);
      }
      currentX = gapX + gapWidth;
    });

    // Final trailing block
    if (screenWidth > currentX + 12) {
      const blockWidth = screenWidth - currentX;
      const obstacleType = blockWidth > 50 ? this.selectObstacleType() : 'standard';
      const obstacle = new Obstacle(currentX, -40, blockWidth, 28, obstacleType);
      this.obstacles.push(obstacle);
      this.parentContainer.addChild(obstacle.container);
    }

    // Spawn Heavy Crusher Boulder in an open gap lane (~25% chance after wave 3)
    if (this.waveCount > 3 && this.random() < 0.28) {
      const firstGapX = sortedGaps[0];
      const crusherX = firstGapX + Math.round((gapWidth - 24) / 2);
      const crusher = new Obstacle(crusherX, -60, 24, 24, 'crusher');
      this.obstacles.push(crusher);
      this.parentContainer.addChild(crusher.container);
    }

    // Spawn Hyper Portal in an open clear gap (~8% chance after wave 6, min 12 waves gap)
    if (this.waveCount > 6 && (this.waveCount - this.lastPortalWave >= 12) && this.random() < 0.08) {
      this.lastPortalWave = this.waveCount;
      const firstGapX = sortedGaps[0];
      const portalX = firstGapX + Math.round(gapWidth / 2);
      const portal = new Portal(portalX, -30);
      this.portals.push(portal);
      this.parentContainer.addChild(portal.container);
    }

    // Fair Projectile Spawning
    if (this.waveCount > 3 && this.random() < 0.35) {
      const fromLeft = this.random() > 0.5;
      const projX = fromLeft ? -10 : screenWidth + 10;
      const projVx = fromLeft ? 75 : -75;
      const projectile = new Projectile(projX, -70, projVx, 0);
      this.projectiles.push(projectile);
      this.parentContainer.addChild(projectile.container);
    }
  }

  private selectObstacleType(): ObstacleType {
    if (this.waveCount < 3) return 'standard';

    const rand = this.random();
    if (rand < 0.20) return 'laser_turret';
    if (rand < 0.40) return 'fragile';
    return 'standard';
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public getPortals(): Portal[] {
    return this.portals;
  }

  public destroy(): void {
    this.obstacles.forEach((o) => o.destroy());
    this.projectiles.forEach((p) => p.destroy());
    this.portals.forEach((p) => p.destroy());
    this.obstacles = [];
    this.projectiles = [];
    this.portals = [];
  }
}
