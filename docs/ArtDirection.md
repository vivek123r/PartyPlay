# PartyPlay Art Direction — Creative Constitution (v6)

PartyPlay strictly enforces the **Creative Constitution (v6)** to guarantee a cohesive, authentic 16-bit retro arcade aesthetic across all games and platform UI screens.

---

## 1. Golden Rules of Pixel Art Specification

### Virtual Resolution & Scaling
1. **Virtual Native Viewport**: Exactly **480 × 270** (16:9 ratio).
2. **Integer Scaling Only**: Scaled to browser dimensions strictly via integer multipliers ($1\times, 2\times, 3\times, 4\times, \dots$). Letterbox black bars cover remaining viewport margins.
3. **Nearest-Neighbor Sampling**:
   - PixiJS: `TextureSource.defaultOptions.scaleMode = 'nearest'`.
   - CSS: `image-rendering: pixelated; image-rendering: crisp-edges;`.
   - WebGL: `roundPixels = true`, `resolution = 1`, `antialias = false`.
4. **Whole-Pixel Position Snapping**: Every entity render position MUST execute `Math.round(x)` and `Math.round(y)`. Zero subpixel rendering or subpixel interpolation.

---

## 2. Palette & Visual Restrictions

### Curated Retro Color Palette (Max 32 Colors)

All elements must use these defined CSS variables / Hex codes:

```css
:root {
  /* Surface & Base */
  --pixel-bg: #0f0e17;       /* Deep Arcade Black */
  --pixel-surface: #1f1e2e;  /* Dark Slate Blue */
  --pixel-border: #fffffe;   /* Pure Crisp White */
  --pixel-text: #fffffe;     /* Text White */
  --pixel-muted: #a7a9be;    /* Muted Silver */

  /* Vibrant Accent Palette */
  --pixel-red: #ff2e63;      /* Neon Crimson */
  --pixel-blue: #08d9d6;     /* Electric Cyan */
  --pixel-green: #2af598;    /* Arcade Mint */
  --pixel-yellow: #ffde7d;   /* Retro Gold */
  --pixel-purple: #7160e8;   /* Deep Synth Purple */
}
```

| Token | Hex | Usage |
|-------|-----|-------|
| `--pixel-bg` | `#0f0e17` | Screen backgrounds, letterbox fill |
| `--pixel-surface` | `#1f1e2e` | Panel backgrounds, card fill, obstacle body |
| `--pixel-border` | `#fffffe` | 2px solid panel borders, highlight lines |
| `--pixel-red` | `#ff2e63` | Danger, elimination, Player 1 default, food items |
| `--pixel-blue` | `#08d9d6` | Primary buttons, Player 2 default, active selection |
| `--pixel-green` | `#2af598` | Success, Player 3 default, badges |
| `--pixel-yellow` | `#ffde7d` | Trophies, victory highlights, Player 4 default |
| `--pixel-purple` | `--7160e8` | Secondary buttons, header text shadows |

---

## 3. Pixel Typography

We use two custom Google Fonts loaded in `index.html`:

1. **Heading Font**: `'Press Start 2P', monospace`
   - Used for main titles, screen headers, winner announcements, HUD pause overlays.
   - Characterized by 8-bit blocky geometry.
2. **UI & Body Font**: `'Pixelify Sans', monospace`
   - Used for card descriptions, player names, button labels, settings controls.
   - Highly readable pixel font at small point sizes.

---

## 4. Strict Prohibition List

To maintain the authenticity of a retro console:

- ❌ **NO Glassmorphism / Neumorphism**
- ❌ **NO Rounded SVG icons or vector illustrations** (use text/emoji symbols like `▶`, `◀`, `⚙`, `☠`, `🏆`)
- ❌ **NO Soft gradients, ambient blurs, or glow effects** (`box-shadow` with blur spread is strictly prohibited)
- ❌ **NO 3D lighting, dynamic ambient occlusion, or lens flares**
- ❌ **NO Subpixel movement or anti-aliased font smoothing** (`-webkit-font-smoothing: none;`)
- ❌ **NO Non-integer scaling or blurry texture filtering**
