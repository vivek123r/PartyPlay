# Original User Request

## 2026-07-25T20:58:42Z

Build "MYTHIC FARM: SINGLE-PLAYER FARMVILLE & MAGIC ORCHARD", an insane, vibrant 2D isometric/top-down single-player farming simulation game featuring multi-stage crops, fruit orchards, mythical livestock, automated harvesting machinery, processing workshops, dynamic market economy, and rich single-player quest progression.

Working directory: /home/viv/Projects/PartyPlay/src/games/mythic-farm
Integrity mode: development

## Requirements

### R1. Dynamic Farming, Soil & Orchard Grid Engine
Implement an interactive grid-based farm grid allowing the single player to till soil, plant diverse crops (wheat, pumpkin, crystal berry, ancient elder-oak trees, dragonfruit), water plants, fertilize soil, and watch multi-stage visual growth (seedling → sprout → flowering → harvestable → withered) with real-time growth timers and seasonal weather effects.

### R2. Insane Automation & Processing Workshop
Implement automated farm machinery and artisan processing stations:
- **Automation**: Magical sprinklers (radial/cross watering), automated scarecrows, and harvester drones.
- **Processing**: Preserves jar (jam/jelly), brewing barrel (wine/cider), seed maker, and loom/mill.

### R3. Mythical Livestock & Animal Barns
Implement animal pastures for mythical livestock (Golden Goats, Astral Bees, Silk Moths, Feathered Chocobos) requiring feeding, grooming, and producing valuable resources (golden milk, astral honey, silk thread, golden eggs).

### R4. Dynamic Market Economy & Expansion System
Implement a dynamic marketplace with fluctuating crop prices, order delivery board, farm leveling, land expansion unlocks, tool upgrades (gold hoe, titanium watering can), and a sleek modern HUD showing coins, energy, season calendar, and quest goals.

### R5. Single-Player Story Campaign & Arcade Integration
Integrate into the PartyPlay game engine architecture as a single-player experience with player avatar customization, tool hotbar navigation, quest progression milestones, ambient background music, sound effects, and smooth 60 FPS performance.

## Acceptance Criteria

### Core Farming & Orchard Mechanics
- [ ] Grid tiles support tilling, planting, watering, fertilizing, and harvesting in single-player mode.
- [ ] At least 6 distinct crop/tree types exist with 4 visual growth stages each.
- [ ] Harvesting crops awards coins, EXP, and produces physical pickup items.

### Automation & Workshop
- [ ] Sprinklers automatically water adjacent crops at the start of each in-game day/timer tick.
- [ ] Processing stations convert raw crops into artisan goods after a countdown.

### Livestock & Economy
- [ ] Animals spawn in pastures, consume feed, and produce harvestable animal products.
- [ ] Marketplace UI allows selling crops/goods with live coin updates.
- [ ] `npm run build` compiles cleanly with zero errors.
