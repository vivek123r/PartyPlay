# PartyPlay Motion & Physics Bible

This document defines the physics calculations, entity movement rules, collision resolution formulas, and coordinate clamping for PartyPlay.

---

## 1. Whole-Pixel Spatial Alignment

Subpixel rendering is strictly forbidden. Rendering an entity at $x = 12.435$ causes subpixel blur and shimmering when integer scaled.

### Position Update Pipeline
```typescript
// Step 1: Accumulate physics in floating-point precision
this.x += this.vx * dt;
this.y += this.vy * dt;

// Step 2: Snap container display to integer pixel coordinates
this.container.x = Math.round(this.x);
this.container.y = Math.round(this.y);
```

---

## 2. Physics & Collision Math Specs

### A. Solid Circle vs Circle (Player-to-Player Bump)
Used in *Obstacle Survival* to resolve solid physical collisions between players:

```typescript
public resolvePlayerPlayer(players: Player[]): void {
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];
      if (!p1.isAlive || !p2.isAlive) continue;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distSq = dx * dx + dy * dy;
      const minDist = p1.radius + p2.radius;

      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;

        // Push horizontally apart
        p1.x -= nx * overlap;
        p2.x += nx * overlap;
      }
    }
  }
}
```

### B. Circle vs AABB (Player-to-Obstacle Collision)
Used for player circle vs rectangular obstacle detection:

```typescript
public checkPlayerObstacle(player: Player, obstacle: Obstacle): boolean {
  if (!player.isAlive) return false;

  // Find closest point on obstacle AABB to player center
  const closestX = Math.max(obstacle.x, Math.min(player.x, obstacle.x + obstacle.width));
  const closestY = Math.max(obstacle.y, Math.min(player.y, obstacle.y + obstacle.height));

  const dx = player.x - closestX;
  const dy = player.y - closestY;

  return (dx * dx + dy * dy) < (player.radius * player.radius);
}
```

### C. Grid-Stepping Motion (Snake Arena)
Used in grid-based arcade games:
- Virtual Grid: **48 Columns × 27 Rows** (Cell size = 10px).
- Head movement moves exactly 1 grid cell per step tick ($dt = 0.12s$).
- Tail segments follow head position history array.

---

## 3. Motion & Velocity Bounds

| Parameter | Virtual Bound | Rule |
|-----------|---------------|------|
| **X Limits** | `[radius, 480 - radius]` | Clamped horizontally unless wrap-around modifier is enabled |
| **Y Limits** | `[radius, 270 - radius]` | Clamped vertically unless falling out-of-bounds |
| **Max Velocity** | `320 px/s` | Maximum allowable speed to prevent collision tunneling |
| **Scroll Speed** | `90 px/s` to `180 px/s` | Base downward scroll speed in Obstacle Survival |
