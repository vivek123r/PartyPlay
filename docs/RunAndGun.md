# Run & Gun — Developer Manual

> **BLAZING FURY** is a 2D side-scrolling run-and-gun game (Contra-inspired) running inside PartyPlay's browser console. Local co-op for 1–2 players on a single keyboard.

---

## 1. Architecture Overview

```
src/
├── games/run-and-gun/          # Game logic layer (Canvas runtime, no React)
│   ├── index.ts                # GameModule stub (Canvas gameplay — TODO)
│   ├── manifest.ts             # GameManifest for auto-discovery
│   ├── types.ts                # Shared types: Character, DifficultyConfig, etc.
│   └── config/
│       ├── characters.ts       # 6 soldier definitions
│       ├── controls.ts         # Player 1 & 2 key bindings
│       └── difficulty.ts       # Auto-derived difficulty by player count
│
├── platform/                   # React UI layer (menus, screens)
│   ├── stores/
│   │   └── runAndGunStore.ts   # Zustand store: menu state, selections, navigation
│   ├── screens/run-and-gun/
│   │   ├── RunAndGunTitleScreen.tsx        # Main title / mode select
│   │   ├── RunAndGunCharacterSelect.tsx    # Soldier picker (1P or 2P)
│   │   ├── RunAndGunPlayerSetup.tsx        # 2P setup with controls + difficulty
│   │   ├── RunAndGunControlsScreen.tsx     # Final control display before gameplay
│   │   ├── RunAndGunSettingsScreen.tsx     # Audio settings
│   │   └── useMenuNavigation.ts           # Shared keyboard nav hook
│   ├── components/
│   │   └── SoldierPortrait.tsx  # CSS pixel-art soldier renderer (6 weapon variants)
│   └── styles/
│       └── run-and-gun.css      # All menu styling
```

**Layer boundaries** follow PartyPlay rules: Platform screens import from Games layer for types/configs, but never the reverse.

---

## 2. Screen Flow

```
MainMenu
  │
  └── "▶ BLAZING FURY" → RunAndGunTitleScreen
       ├── 1 PLAYER  → RunAndGunCharacterSelect (single picker)
       │                 └── START → RunAndGunControlsScreen (1P) → game
       ├── 2 PLAYERS → RunAndGunCharacterSelect (P1 + P2 side-by-side)
       │                 └── START → RunAndGunPlayerSetup → Controls → game
       └── SETTINGS  → RunAndGunSettingsScreen → BACK → title
```

All transitions use `usePlatformStore.setScreen()` (no page reloads).

---

## 3. Zustand Store (`runAndGunStore.ts`)

```
useRunAndGunStore
├── screen: MenuScreen           ← 'title' | 'character-select' | 'player-setup' | 'controls' | 'settings'
├── gameMode: GameMode | null    ← '1-player' | '2-players'
├── player1: PlayerSelection     ← { characterId, color }
├── player2: PlayerSelection
├── difficulty: DifficultyConfig  ← auto-derived from player count
│
├── setScreen(screen)
├── selectGameMode(mode)         ← sets gameMode + auto-derives difficulty
├── selectCharacter(player, selection)
└── resetGameMode()              ← resets to defaults
```

---

## 4. Key Types (`types.ts`)

| Type | Fields |
|------|--------|
| `Character` | `id, name, color, description` |
| `PlayerSelection` | `characterId, color` |
| `DifficultyConfig` | `label, enemyCountMultiplier, enemyHealthMultiplier, bossHealthMultiplier, description[]` |
| `MenuScreen` | `'title' \| 'character-select' \| 'player-setup' \| 'controls' \| 'settings'` |
| `GameMode` | `'1-player' \| '2-players'` |

---

## 5. Characters (`config/characters.ts`)

6 soldiers, identical gameplay stats, different visuals:

| ID | Name | Color |
|----|------|-------|
| `commando` | COMMANDO | `#ff2e63` (Red) |
| `scout` | SCOUT | `#08d9d6` (Cyan) |
| `heavy` | HEAVY | `#2af598` (Green) |
| `demolition` | DEMOLITION | `#ffde7d` (Yellow) |
| `infiltrator` | INFILTRATOR | `#7160e8` (Purple) |
| `vanguard` | VANGUARD | `#ff9f43` (Orange) |

---

## 6. Difficulty (`config/difficulty.ts`)

Auto-derived — **player cannot manually select**:

| Player Count | Label | Enemies | Enemy HP | Boss HP |
|-------------|-------|---------|----------|---------|
| 1 | NORMAL | 1.0× | 1.0× | 1.0× |
| 2 | HARD | 1.5× | 1.3× | 1.8× |

Access via: `DIFFICULTY[1]` or `DIFFICULTY[2]`. Easily rebalanced by editing the constants.

---

## 7. Controls (`config/controls.ts`)

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| MOVE | W A S D | Arrow Keys |
| SHOOT | F | K |
| JUMP | G | L |

---

## 8. Keyboard Navigation Hook (`useMenuNavigation`)

```ts
useMenuNavigation({ itemCount, onSelect?, initialIndex? })
// Returns: { selectedIndex, setSelectedIndex }
```

- Arrow Up/Down: change selection (wraps)
- Enter: calls `onSelect(selectedIndex)`
- Attaches/removes `keydown` listener on mount/unmount

Grid screens (character select) add their own `ArrowLeft`/`ArrowRight` handlers on top.

---

## 9. SoldierPortrait Component

Renders CSS pixel-art soldiers with weapon variants:

```tsx
<SoldierPortrait character={CHARACTERS[0]} size="sm" | "md" />
```

Each character's weapon is drawn differently:
- **Commando**: horizontal rifle
- **Scout**: angled SMG
- **Heavy**: large barrel with magazine
- **Demolition**: wide grenade launcher
- **Infiltrator**: long silenced pistol
- **Vanguard**: short shotgun

---

## 10. Styling Rules

All styles are in `src/platform/styles/run-and-gun.css`. Follows ArtDirection v6:

- **No blur**: hard 4px text shadows only
- **No rounded corners**: `border-radius: 0` everywhere
- **No anti-aliasing**: `-webkit-font-smoothing: none`
- **No glow effects**: select highlights use `outline`, not `box-shadow`
- **Palette**: uses `--pixel-*` CSS custom properties exclusively
- **Fonts**: `Press Start 2P` for headings, `Pixelify Sans` for body
- **Animations**: `steps()` timing for pixel feel

---

## 11. Platform Screen States

Added to `ScreenState` in `platformStore.ts`:

```
'run-and-gun-title'
'run-and-gun-character'
'run-and-gun-setup'
'run-and-gun-controls'
'run-and-gun-settings'
```

Each maps to a React component in `App.tsx`'s switch statement.

---

## 12. Entry Point

Main menu button `"▶ BLAZING FURY"` in `MainMenu.tsx`:
```tsx
onClick={() => setScreen('run-and-gun-title')}
```

---

## 13. Future: Gameplay Integration

When ready to implement the Canvas game:

1. Replace `src/games/run-and-gun/index.ts` stub with real game logic
2. Game receives `GameContext` via `init()` — includes renderer (PixiJS), input, audio, etc.
3. Read player config from `useRunAndGunStore`: characters, game mode, difficulty
4. Set `usePlatformStore.setScreen('play')` to mount the PixiJS canvas
5. The `RunAndGunControlsScreen` "START MISSION" button currently logs to console — replace with actual launch

---

## 14. Verification Commands

```bash
npx tsc --noEmit      # Type check
npm run lint          # Lint
npm run dev           # Dev server → http://localhost:5173
npm run build         # Production build
```
