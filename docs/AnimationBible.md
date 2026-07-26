# PartyPlay Animation  Bible

All animations in PartyPlay must feel crisp, punchy, and authentically retro. Smooth subpixel interpolation or bezier curve easing is strictly forbidden.

---

## 1. Step-Based Animation Timing

Every CSS animation or transition MUST specify a `steps()` timing function to enforce discrete frame jumps:

```css
/* Correct: Step-based button press */
.pixel-btn {
  transition: transform 0.1s steps(2);
}

.pixel-btn:active {
  animation: buttonPress 0.1s steps(2) forwards;
}

/* Keyframes use abrupt discrete frames */
@keyframes buttonPress {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes pixelBounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}

@keyframes blinkText {
  0%, 49%   { opacity: 1; }
  50%, 100% { opacity: 0; }
}
```

---

## 2. Frame-by-Frame Sprite Budgets

For sprite animations inside PixiJS games, maintain strict frame budgets:

| Animation State | Frame Budget | Frame Rate | Description |
|-----------------|--------------|------------|-------------|
| **Idle** | 4 to 8 frames | 8 FPS | Subtle 2px bob or eye blink |
| **Walk / Run** | 6 to 8 frames | 12 FPS | Crisp leg/body step swap |
| **Anticipation** | 2 to 3 frames | 15 FPS | Pre-dash/pre-jump compression |
| **Action / Attack** | 4 to 6 frames | 20 FPS | Extended arm/projectile spawn |
| **Hit / Damage** | 2 frames | 30 FPS | High-contrast color flash (white/red) |
| **Elimination** | 8 to 12 frames | 15 FPS | Particle burst & sprite shatter |

---

## 3. Hit Stop Micro-Pauses

To communicate impact and weight during collisions or eliminations, the runtime executes a **Hit Stop**:

```typescript
// Freeze game loop logic for 2-3 frames on heavy collision
public triggerHitStop(frames = 2): void {
  this.hitStopCounter = frames;
}

// In GameLoop.frame():
if (this.hitStopCounter > 0) {
  this.hitStopCounter--;
  return; // Skip update logic tick, hold frame stationary
}
```

### Impact Behavior
- **Player Elimination**: 3-frame hit stop + screen color flash + retro synth noise.
- **Player-to-Player Bump**: 1-frame hit stop + solid pushback vector calculation.

---

## 4. Squash & Stretch

Even in a 16-bit pixel world, squash and stretch creates life:

```typescript
// Example: Player jump squash
public onJump(): void {
  // Compress height to 75%, stretch width to 125% for 1 frame
  this.graphics.scale.set(1.25, 0.75);
}

public update(dt: number): void {
  // Rapid step restore back to 1.0, 1.0
  this.graphics.scale.x = Math.max(1.0, this.graphics.scale.x - dt * 8);
  this.graphics.scale.y = Math.min(1.0, this.graphics.scale.y + dt * 8);
}
```

---

## 5. Whole-Pixel Particle Emitter Systems

When a player is eliminated, they shatter into square pixel particles:

```typescript
export class PixelParticle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size = 2; // 2x2 pixel square
  public color: number;
  public life = 0.4; // 400ms lifespan

  public update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  public render(g: Graphics): void {
    if (this.life <= 0) return;
    // Whole-pixel snapping
    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
    g.rect(drawX, drawY, this.size, this.size).fill({ color: this.color });
  }
}
```

### Rules
- Particles move on fractional vectors internally, but render strictly at `Math.round(x)`, `Math.round(y)`.
- Particles flicker between white and player color before disappearing (no alpha opacity fade).
