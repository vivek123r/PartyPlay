# PartyPlay UI & Presentation Bible

The outer application functions as a virtual browser game console presentation shell.

---

## 1. Platform Presentation Shell

PartyPlay's UI frames the 480×270 virtual resolution canvas while embedding retro CRT visual cues:

```html
<div className="screen-transition" style={{ position: 'relative', width: '100vw', height: '100vh' }}>
  <!-- Scanline CRT overlay covering entire screen -->
  <div className="scanline-overlay" />
  
  <!-- Screen content / PixiJS canvas -->
  <main className="pixel-panel">
    ...
  </main>
</div>
```

### Scanline Overlay CSS (`.scanline-overlay`)
```css
.scanline-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
    linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  background-size: 100% 4px, 3px 100%;
  pointer-events: none;
  z-index: 9999;
}
```

---

## 2. Component Design System

All UI components MUST adhere strictly to retro pixel styling:

### Pixel Panels (`.pixel-panel`)
- **Border**: `2px solid var(--pixel-border)`
- **Border Radius**: Strictly `0px` (or max 2px sharp corners)
- **Background**: `var(--pixel-surface)` (`#1f1e2e`)

```css
.pixel-panel {
  background-color: var(--pixel-surface);
  border: 2px solid var(--pixel-border);
  border-radius: 0;
  padding: 16px;
  image-rendering: pixelated;
}
```

### Pixel Buttons (`.pixel-btn`)
- **Press Animation**: `scale(1) → scale(1.08) → scale(1)` using `steps(2)`.
- **Variants**:
  - `.pixel-btn-primary`: Background `--pixel-blue` (`#08d9d6`), Text `--pixel-bg`.
  - `.pixel-btn-secondary`: Background `--pixel-purple` (`#7160e8`), Text `--pixel-text`.
  - `.pixel-btn-danger`: Background `--pixel-red` (`#ff2e63`), Text `--pixel-border`.

```css
.pixel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--pixel-surface);
  border: 2px solid var(--pixel-border);
  color: var(--pixel-text);
  padding: 12px 16px;
  font-family: var(--font-pixel-heading);
  font-size: 1rem;
  text-transform: uppercase;
  transition: transform 0.1s steps(2);
  cursor: pointer;
}

.pixel-btn:active {
  animation: buttonPress 0.1s steps(2) forwards;
}
```

---

## 3. Screen Registry Reference (All 8 Screens)

| Screen Component | File Location | Purpose | Key UI Elements |
|------------------|---------------|---------|-----------------|
| `<LoadingScreen />` | `src/platform/screens/LoadingScreen.tsx` | Boot splash screen (1200ms auto-transition) | Bouncing title, blinking "BROWSER GAME CONSOLE" |
| `<MainMenu />` | `src/platform/screens/MainMenu.tsx` | Main console menu | `▶ PLAY`, `⚙ SETTINGS`, blinking "PRESS START" |
| `<GameBrowser />` | `src/platform/screens/GameBrowser.tsx` | Game selection library | `◀ BACK`, card grid with category badges & `▶ SELECT` |
| `<PlayerSetup />` | `src/platform/screens/PlayerSetup.tsx` | Configure player count & modifiers | Player count toggle (2/3/4), key maps, speed slider |
| `<GamePlay />` | `src/platform/screens/GamePlay.tsx` | Active game canvas container | Pixi canvas mount, pixel `⏸` HUD button, pause overlay |
| `<GameResults />` | `src/platform/screens/GameResults.tsx` | End-of-round standings screen | 🏆 emoji, color-coded standings list, `PLAY AGAIN` |
| `<Settings />` | `src/platform/screens/Settings.tsx` | Console audio configuration | Master volume range slider, `MUTE/UNMUTE` toggle |
| `<CrashScreen />` | `src/platform/screens/CrashScreen.tsx` | Runtime error boundary display | ☠ skull, red stack trace block, `RETURN TO LIBRARY` |

---

## 4. Single-Focus Controller Navigation

PartyPlay UI is navigable via Keyboard / Gamepad D-Pad:
- **Focus Indicator**: High-contrast 2px cyan outline (`outline: 3px solid var(--pixel-blue);`).
- **Input Mapping**: Arrow Up/Down/Left/Right moves active element index; `Enter`/`Space`/`Button A` fires `onClick`.
