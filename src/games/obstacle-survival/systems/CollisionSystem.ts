import type { Player } from '../entities/Player';
import type { Obstacle } from '../entities/Obstacle';
import type { Projectile } from '../entities/Projectile';
import type { Portal } from '../entities/Portal';
import type { CoopBarrier } from '../entities/CoopBarrier';

export class CollisionSystem {
  /** Circle vs AABB (Player vs Obstacle) */
  public checkPlayerObstacle(player: Player, obstacle: Obstacle): boolean {
    if (!player.isAlive || obstacle.isShattered || player.isHyperActive) return false;

    const closestX = Math.max(obstacle.x, Math.min(player.x, obstacle.x + obstacle.width));
    const closestY = Math.max(obstacle.y, Math.min(player.y, obstacle.y + obstacle.height));

    const dx = player.x - closestX;
    const dy = player.y - closestY;

    const isColliding = dx * dx + dy * dy < player.radius * player.radius;

    if (isColliding) {
      // If player has shield active, shatter obstacle on contact!
      if (player.isShieldActive) {
        obstacle.shatter();
        return false; // Immune!
      }
      if (obstacle.type === 'fragile') {
        obstacle.touchFragile();
      }
    }

    return isColliding;
  }

  /** Overhead Barrier vs Obstacle Deflection Check */
  public checkBarrierObstacle(barrier: CoopBarrier, obstacle: Obstacle): boolean {
    if (!barrier.isShieldActive || obstacle.isShattered) return false;

    const obsBottom = obstacle.y + obstacle.height;
    const obsLeft = obstacle.x;
    const obsRight = obstacle.x + obstacle.width;

    const isOverlapX = obsRight >= barrier.minX && obsLeft <= barrier.maxX;
    const isOverlapY = obsBottom >= barrier.canopyY && obstacle.y <= barrier.canopyY + 12;

    return isOverlapX && isOverlapY;
  }

  /** Overhead Barrier vs Projectile Deflection Check */
  public checkBarrierProjectile(barrier: CoopBarrier, projectile: Projectile): boolean {
    if (!barrier.isShieldActive || !projectile.isAlive) return false;

    const projBottom = projectile.y + projectile.radius;
    const isOverlapX = projectile.x >= barrier.minX && projectile.x <= barrier.maxX;
    const isOverlapY = projBottom >= barrier.canopyY && projectile.y <= barrier.canopyY + 14;

    return isOverlapX && isOverlapY;
  }

  /** Player vs Laser Beam Check */
  public checkPlayerLaser(player: Player, obstacle: Obstacle): boolean {
    if (!player.isAlive || obstacle.type !== 'laser_turret' || !obstacle.isLaserActive || player.isHyperActive || player.isShieldActive) {
      return false;
    }

    const laserWorldX = obstacle.x + obstacle.laserX;
    const laserTopY = obstacle.y + obstacle.height;
    const laserBottomY = laserTopY + 300;

    const inBeamX = Math.abs(player.x - laserWorldX) < player.radius + 3;
    const inBeamY = player.y >= laserTopY - player.radius && player.y <= laserBottomY;

    return inBeamX && inBeamY;
  }

  /** Player vs Projectile Check (Circle vs Circle) */
  public checkPlayerProjectile(player: Player, projectile: Projectile): boolean {
    if (!player.isAlive || !projectile.isAlive || player.isHyperActive || player.isShieldActive) return false;

    const dx = player.x - projectile.x;
    const dy = player.y - projectile.y;
    const minDist = player.radius + projectile.radius;

    return dx * dx + dy * dy < minDist * minDist;
  }

  /** Player vs Portal Check (Circle vs Circle) */
  public checkPlayerPortal(player: Player, portal: Portal): boolean {
    if (!player.isAlive || !portal.isAlive) return false;

    const dx = player.x - portal.x;
    const dy = player.y - portal.y;
    const minDist = player.radius + portal.radius;

    return dx * dx + dy * dy < minDist * minDist;
  }

  /** Solid Circle vs Circle (Player vs Player solid physical bump) */
  public resolvePlayerPlayer(players: Player[]): void {
    const alive = players.filter((p) => p.isAlive);

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const p1 = alive[i];
        const p2 = alive[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;

          p1.x -= nx * overlap;
          p2.x += nx * overlap;
        }
      }
    }
  }
}
