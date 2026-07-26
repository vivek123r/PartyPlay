# M2 Specification Mining: Crop Growth Math, Weather Matrices, Fertilizer Modifiers & Pickup Physics

## Executive Summary
This document provides the authoritative mathematical and systemic specifications for **Milestone 2 (M2): Dynamic Farming, Soil & Orchard Grid Engine** of Mythic Farm. It covers exact growth progression formulas per tick/day for all 6 crop species, seasonal weather probability matrices and daily mechanics, fertilizer modifier calculations, quality yield tier probability curves, harvest quantity math, giant crop mutation rules, and item pickup physics with floating animation parameters.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F1 | Soil Engine | Grid Tile Tilling | Hoe action converts untilled grass/dirt tile into tilled soil | Hoe tool click on tile $(x,y)$ | Tile `tilled = true` | Ignored on locked plots or tiles with structures | `config.ts` & `PROJECT.md` |
| F2 | Soil Engine | Soil Moisture Hydration | Manual watering tool or rain marks tilled tile hydrated for current day | Watering can or weather tick | Tile `watered = true` | No effect if tile is untilled | `types.ts` & `config.ts` |
| F3 | Soil Engine | Soil Fertilizer Enrichment | Enriches tilled soil with speed, quality, bountiful, or water retention modifier | Fertilizer item applied to tilled tile | Tile `fertilizer = FertilizerType` | Fails if tile already contains a fertilizer | `types.ts` & `PROJECT.md` |
| F4 | Crop Engine | Seed Planting | Plants seeds of one of 6 crop species into tilled tile | Seed packet from hotbar | `CropEntity` created at Stage 0 | Fails if tile is untilled, occupied, or seed count is 0 | `types.ts` & `config.ts` |
| F5 | Crop Engine | Multi-Stage Growth Progression | Watered crops accumulate daily growth progress through 4 visual stages | Daily tick + watered status | `stage` advances $0 \to 1 \to 2 \to 3$ | Unwatered crops accumulate 0 growth progress | `types.ts` & `config.ts` |
| F6 | Crop Engine | Multi-Harvest Perennial Regrowth | Crystal Berry, Dragonfruit, and Ancient Elder-Oak reset to Stage 2 on harvest | Harvest action on Stage 3 crop | Item yield + crop `stage` resets to 2 | Annual crops (Wheat, Pumpkin, Sunflower) clear tile on harvest | `config.ts` |
| F7 | Crop Engine | Sunflower Speed Aura | Solar Sunflower increases growth speed of adjacent cardinal & diagonal crops by +15% | Adjacent crop position | Growth rate multiplier $1.15\times$ | Does not stack with multiple sunflowers on same crop | `config.ts` |
| F8 | Crop Engine | Giant Pumpkin Mutation | 3x3 grid of mature Pumpkins has a 5% daily chance to fuse into a Giant Pumpkin | 3x3 mature Pumpkin tile block | 3x3 Giant Pumpkin entity | Cannot fuse if any tile in 3x3 has different crop or stage < 3 | `config.ts` |
| F9 | Weather Engine | Seasonal Weather Cycle | Daily weather roll determines map moisture, crop bonuses, and disaster hazards | Day advance tick + season | `currentWeather` updated | Winter blizzard withers non-winter crops instantly | `types.ts` & `config.ts` |
| F10 | Harvest Engine | Crop & Fruit Harvesting | Harvesting Stage 3 crop awards yield items, Farm EXP, and spawns physical pickup entities | Interaction key on Stage 3 crop | Inventory updated, EXP awarded, pickup entity | Immature (Stage 0-2) or withered crops cannot be harvested | `types.ts` & `PROJECT.md` |
| F11 | Pickup Engine | Physical Item Arc Spawn | Harvested items launch upward in a parabolic 2D physics arc with ground bounces | Harvest event position $(x,y)$ | Item velocity $(v_x, v_y)$, bounce state | Clamped to canvas bounds $(0,0) \to (480,270)$ | `PROJECT.md` & `config.ts` |
| F12 | Pickup Engine | Floating Bobbing Animation | Resting item pickups float and bob vertically using a sinusoidal oscillator | Elapsed time $t$ | $y$-offset $3 \sin(\omega t + \phi)$, dynamic shadow | Clamped amplitude preventing clipping | `PROJECT.md` |
| F13 | Pickup Engine | Magnet Attraction & Auto-Pickup | Player proximity attracts resting item pickups toward player center | Distance to player $< 36\text{px}$ | Item accelerates to player, collected at $< 8\text{px}$ | Inventory full prevents collection; pickup stays at player feet | `PROJECT.md` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| E1 | Crop Growth | Unwatered tile at day start | Crop growth progress remains unchanged ($\Delta \text{growthProgress} = 0$). `daysPlanted` increments by 1. |
| E2 | Seasonal Mismatch | Season changes to a season not listed in crop's `seasons` array | `CropEntity.withered` set to `true`, `stage` set to 4 (Withered). Tile requires clearing with Scythe/Hoe. |
| E3 | Regrowth Harvest | Harvesting Crystal Berry or Dragonfruit at Stage 3 | Harvest yield awarded to inventory/pickup. Crop `stage` resets to 2 (Flowering), `growthProgress` resets to 0.0. `regrowDays` countdown begins. |
| E4 | Fertilizer Overwrite | Applying Quality fertilizer on tile with existing Speed fertilizer | Application fails/rejected. Only one fertilizer type allowed per tile. Fertilizer clears only after crop is harvested/cleared. |
| E5 | Bountiful Yield | Bountiful fertilizer applied to Pumpkin (`harvestYieldMin: 1`, `harvestYieldMax: 1`) | Yield increases by +1, yielding exactly 2 Pumpkins on harvest. |
| E6 | Giant Pumpkin Fusion | 3x3 Pumpkins mature, but 1 center tile was planted 1 day later | Fusion check fails until all 9 tiles reach Stage 3 simultaneously. Once all 9 are Stage 3, 5% roll occurs daily. |
| E7 | Winter Blizzard | Active Wheat crop in field on Winter day with Blizzard weather | Wheat is not valid in Winter (`seasons: ['spring', 'autumn']`). Blizzard causes instant withered state (`stage: 4`, `withered: true`). |
| E8 | Magnet Item Magnetizing | Player inventory full when walking over floating pickup | Item magnetizes to player center within 36px, but collection is blocked at 8px. Item hovers at player feet until inventory space is available. |
| E9 | Tile Clearing | Scythe used on Withered crop tile | Withered crop removed, tile resets to tilled soil, fertilizer cleared, 0 items returned. |
| E10 | Tree Harvest | Harvesting Ancient Elder-Oak fruit at Stage 3 | Fruit yield (1-3 Elder-Oak Fruits) collected. Tree entity remains on grid at Stage 2 (Mature Tree), regrowing fruit in 3 days. Tree is never destroyed by harvesting. |

---

## Detailed Crop Species Growth Progression Math

### 1. Catalog of 6 Crop Species

| Species ID | Name | Category | Growth Days | Regrows? | Regrow Days | Seed Cost | Harvest Yield (Min - Max) | Base Price | EXP Yield | Thrive Seasons | Giant Chance | Special Effect / Aura |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `wheat` | Golden Wheat | Grain | 2 | No | N/A | 10g | 1 - 2 | 25g | 12 | Spring, Autumn | 0.00 | Processed in Mill into Flour |
| `pumpkin` | Mythic Pumpkin | Vegetable | 4 | No | N/A | 40g | 1 - 1 | 120g | 35 | Autumn | 0.05 | 3x3 Giant Pumpkin Fusion |
| `crystal_berry` | Crystal Berry | Mythical | 5 | Yes | 2 | 80g | 2 - 4 | 280g | 50 | Winter, Spring | 0.00 | Glows in dark; 2.0x growth during Astral Rain |
| `dragonfruit` | Solar Dragonfruit | Fruit | 6 | Yes | 3 | 120g | 1 - 3 | 450g | 75 | Summer | 0.00 | High-value artisan Wine crop |
| `elder_oak` | Ancient Elder-Oak | Tree | 8 | Yes | 3 | 250g | 1 - 3 | 150g | 90 | All Seasons | 0.00 | Perennial tree; never dies across seasons |
| `sunflower` | Solar Sunflower | Flower | 3 | No | N/A | 30g | 1 - 3 | 90g | 25 | Summer, Spring | 0.00 | Boosts adjacent crop growth by +15% |

---

### 2. Growth Stage Progression Formulas

Growth stage index $S \in \{0, 1, 2, 3, 4\}$ where:
- $S = 0$: Seedling
- $S = 1$: Sprout
- $S = 2$: Flowering
- $S = 3$: Harvestable
- $S = 4$: Withered

#### Daily Growth Increment Formula
On each morning day-advance tick (06:00 in-game time):

$$\Delta \text{growthProgress} = \frac{1}{D_{\text{growth}}} \times M_{\text{watered}} \times M_{\text{fertilizer}} \times M_{\text{aura}} \times M_{\text{weather}}$$

Where parameters are defined as:
1. **Watered Modifier** ($M_{\text{watered}}$):
   $$M_{\text{watered}} = \begin{cases} 1.0 & \text{if tile is watered today} \\ 0.0 & \text{if tile is unwatered today} \end{cases}$$
2. **Fertilizer Growth Speed Modifier** ($M_{\text{fertilizer}}$):
   $$M_{\text{fertilizer}} = \begin{cases} 1.5 & \text{if tile has 'speed' fertilizer} \\ 1.0 & \text{otherwise} \end{cases}$$
3. **Sunflower Aura Speed Modifier** ($M_{\text{aura}}$):
   $$M_{\text{aura}} = \begin{cases} 1.15 & \text{if at least 1 mature Solar Sunflower is in 8-neighbor tiles} \\ 1.00 & \text{otherwise} \end{cases}$$
4. **Weather Speed Modifier** ($M_{\text{weather}}$):
   $$M_{\text{weather}} = \begin{cases} 2.00 & \text{if species is 'crystal_berry' and weather is 'astral_rain'} \\ 1.00 & \text{otherwise} \end{cases}$$

#### Stage Transition Mechanics
For initial growth ($S < 3$):
$$\text{growthProgress}_{\text{new}} = \text{growthProgress}_{\text{old}} + \Delta \text{growthProgress}$$

If $\text{growthProgress}_{\text{new}} \ge 1.0$ and $S < 3$:
$$S_{\text{new}} = S_{\text{old}} + 1$$
$$\text{growthProgress}_{\text{new}} = 0.0$$

#### Regrowth Mechanics for Perennials (`crystal_berry`, `dragonfruit`, `elder_oak`)
When a crop with `regrows = true` is harvested at $S = 3$:
- Crop is NOT destroyed.
- Stage resets to Flowering ($S = 2$).
- Growth progress resets to $0.0$.
- Regrowth daily increment formula uses $D_{\text{regrow}}$ instead of $D_{\text{growth}}$:

$$\Delta \text{growthProgress}_{\text{regrow}} = \frac{1}{D_{\text{regrow}}} \times M_{\text{watered}} \times M_{\text{fertilizer}} \times M_{\text{aura}} \times M_{\text{weather}}$$

---

### 3. Step-by-Step Daily Breakdown per Crop Species (Base Unfertilized & Watered)

#### A. Golden Wheat (`wheat`)
- $D_{\text{growth}} = 2$ days. Daily base progress = $+0.50$ (50%).
- **Day 0**: Planted $\to$ Stage 0 (Seedling), `growthProgress = 0.0`.
- **Day 1**: Watered $\to$ `growthProgress` reaches $0.50$. Transitions to Stage 1 (Sprout).
- **Day 2**: Watered $\to$ `growthProgress` reaches $1.00$. Transitions to Stage 3 (Harvestable).
- Total time to harvest: **2 days**. Single harvest.

#### B. Mythic Pumpkin (`pumpkin`)
- $D_{\text{growth}} = 4$ days. Daily base progress = $+0.25$ (25%).
- **Day 0**: Planted $\to$ Stage 0 (Seedling).
- **Day 1**: Watered $\to$ Stage 1 (Sprout).
- **Day 2**: Watered $\to$ Stage 2 (Flowering).
- **Day 3**: Watered $\to$ Stage 2 (Flowering, 75%).
- **Day 4**: Watered $\to$ Stage 3 (Harvestable).
- Total time to harvest: **4 days**. Single harvest. Giant chance: 5% daily when 3x3 block matures.

#### C. Crystal Berry (`crystal_berry`)
- $D_{\text{growth}} = 5$ days ($+0.20$/day), $D_{\text{regrow}} = 2$ days ($+0.50$/day).
- **Day 0**: Planted $\to$ Stage 0 (Seedling).
- **Day 1**: Watered $\to$ Stage 1 (Sprout, 20%).
- **Day 2**: Watered $\to$ Stage 1 (Sprout, 40%).
- **Day 3**: Watered $\to$ Stage 2 (Flowering, 60%).
- **Day 4**: Watered $\to$ Stage 2 (Flowering, 80%).
- **Day 5**: Watered $\to$ Stage 3 (Harvestable).
- **On Harvest**: Resets to Stage 2 (Flowering), `growthProgress = 0.0`.
- **Day 6**: Watered $\to$ Stage 2 (Flowering, 50%).
- **Day 7**: Watered $\to$ Stage 3 (Harvestable again!).
- Initial harvest: **5 days**. Regrowth cycle: **every 2 days**.

#### D. Solar Dragonfruit (`dragonfruit`)
- $D_{\text{growth}} = 6$ days ($+0.1667$/day), $D_{\text{regrow}} = 3$ days ($+0.3333$/day).
- **Day 0**: Planted $\to$ Stage 0.
- **Day 2**: Stage 1.
- **Day 4**: Stage 2.
- **Day 6**: Stage 3 (Harvestable).
- **On Harvest**: Resets to Stage 2.
- **Day 9**: Stage 3 (Harvestable again!).
- Initial harvest: **6 days**. Regrowth cycle: **every 3 days**.

#### E. Ancient Elder-Oak (`elder_oak`)
- $D_{\text{growth}} = 8$ days ($+0.125$/day), $D_{\text{regrow}} = 3$ days ($+0.3333$/day).
- **Day 0**: Planted $\to$ Stage 0 (Sapling).
- **Day 3**: Stage 1 (Young Tree).
- **Day 5**: Stage 2 (Mature Tree).
- **Day 8**: Stage 3 (Harvestable Fruit Tree).
- **On Harvest**: Resets to Stage 2 (Mature Tree).
- **Day 11**: Stage 3 (Harvestable Fruit Tree again!).
- Initial harvest: **8 days**. Regrowth cycle: **every 3 days**. Multi-season tree (never withers).

#### F. Solar Sunflower (`sunflower`)
- $D_{\text{growth}} = 3$ days ($+0.3333$/day).
- **Day 0**: Planted $\to$ Stage 0.
- **Day 1**: Stage 1.
- **Day 2**: Stage 2.
- **Day 3**: Stage 3 (Harvestable).
- Total time to harvest: **3 days**. Single harvest. Emits +15% speed aura to surrounding 8 tiles while alive.

---

## Seasonal Weather Probability Matrices & Mechanics

### 1. Weather Distribution Table (% Probability per Daily Roll)

| Season | Sunny | Rain | Thunderstorm | Astral Rain | Blizzard | Total |
|---|---|---|---|---|---|---|
| **Spring** | 60% | 30% | 5% | 5% | 0% | 100% |
| **Summer** | 75% | 15% | 10% | 0% | 0% | 100% |
| **Autumn** | 50% | 35% | 10% | 5% | 0% | 100% |
| **Winter** | 40% | 0% | 0% | 10% | 50% | 100% |

---

### 2. Weather System Specifications & Rules

#### A. `sunny` (Standard Weather)
- **Soil Hydration**: 0% automatic watering. Players or sprinklers must water tiles.
- **Moisture Decay**: Un-fertilized tiles reset to `watered = false` at 06:00.
- **Crop Risk**: 5% daily chance per unprotected crop block of Crow/Pest attack (prevented by Scarecrow within 5x5 radius).

#### B. `rain` (Rainy Weather)
- **Soil Hydration**: 100% automatic watering of all tilled tiles at 06:00.
- **Moisture Decay**: Soil remains `watered = true` throughout the entire day.
- **Energy Saver**: Player does not spend watering can energy.

#### C. `thunder` (Thunderstorm)
- **Soil Hydration**: 100% automatic watering of all tilled tiles at 06:00.
- **Lightning Hazard**: 2.0% chance per thunderstorm day that lightning strikes a random crop/tree on the grid.
- **Lightning Strike Resolution**:
  - If target tile is within a Scarecrow protection radius (5x5): Scarecrow absorbs lightning harmlessly.
  - If unprotected: Crop is destroyed and replaced with a `Charcoal` pickup item.

#### D. `astral_rain` (Rare Mythical Weather)
- **Occurrence**: 5% chance in Spring/Autumn, 10% chance in Winter.
- **Soil Hydration**: 100% automatic watering of all tilled tiles.
- **Astral Growth Surge**:
  - All planted crops gain $+1$ immediate growth stage advancement at day start.
  - `crystal_berry` crops gain a $2.0\times$ growth speed multiplier for the day.
  - Animal product quality on Astral Rain days guarantees Silver tier or higher.

#### E. `blizzard` (Winter Storm)
- **Occurrence**: 50% chance on Winter days.
- **Soil Hydration**: Soil freezes (0% watering).
- **Frost Damage Math**:
  - Any active crop whose `seasons` array does NOT include `'winter'` immediately transitions to `withered = true` and `stage = 4`.
  - Winter-thriven crops (`crystal_berry`, `elder_oak`) are immune to blizzard frost.

---

## Fertilizer Modifiers & Quality Yield Math

### 1. Fertilizer Types & Attributes

| Fertilizer ID | Name | Effect | Speed Multiplier | Quality Multiplier | Yield Bonus | Water Retention Chance |
|---|---|---|---|---|---|---|
| `speed` | Speed-Grow | Accelerates growth progression speed | $1.50\times$ (+50%) | $1.0\times$ | $+0$ | 0% |
| `quality` | Quality-Boost | Increases probability of Silver, Gold, and Mythic crop yields | $1.00\times$ | $2.5\times$ Mythic chance | $+0$ | 0% |
| `bountiful` | Bountiful Yield | Grants +1 bonus item quantity per harvest | $1.00\times$ | $1.0\times$ | $+1$ item | 0% |
| `water_retention` | Soil Retention | 50% chance tile remains watered overnight | $1.00\times$ | $1.0\times$ | $+0$ | 50% |

---

### 2. Crop Quality Tier Math & Price Multipliers

Harvested crops belong to 1 of 4 quality tiers:

| Quality Tier | Quality Name | Price Multiplier | Visual Indicator | Base Probability (Standard) | Probability with `quality` Fertilizer |
|---|---|---|---|---|---|
| Tier 1 | Normal | $1.00\times$ | None | 70% | 40% |
| Tier 2 | Silver | $1.25\times$ | Silver Star | 20% | 30% |
| Tier 3 | Gold | $1.50\times$ | Gold Star | 9% | 22% |
| Tier 4 | Mythic | $2.00\times$ | Rainbow Sparkle Star | 1% | 8% |

#### Quality Roll Algorithm
When harvesting a crop, a uniform random variable $R \in [0, 1)$ is evaluated:
```
If fertilized with 'quality':
  R < 0.08  => Mythic  (Tier 4, 2.0x value)
  R < 0.30  => Gold    (Tier 3, 1.5x value)
  R < 0.60  => Silver  (Tier 2, 1.25x value)
  Else      => Normal  (Tier 1, 1.0x value)
Else (Standard):
  R < 0.01  => Mythic  (Tier 4, 2.0x value)
  R < 0.10  => Gold    (Tier 3, 1.5x value)
  R < 0.30  => Silver  (Tier 2, 1.25x value)
  Else      => Normal  (Tier 1, 1.0x value)
```

---

### 3. Harvest Yield Quantity Math

$$\text{Quantity} = \text{randomInt}(\text{harvestYieldMin}, \text{harvestYieldMax}) + \begin{cases} 1 & \text{if tile has 'bountiful' fertilizer} \\ 0 & \text{otherwise} \end{cases}$$

#### Yield Range Output Table

| Crop Species | Base Yield Range | Yield with `bountiful` Fertilizer |
|---|---|---|
| Golden Wheat (`wheat`) | 1 - 2 items | 2 - 3 items |
| Mythic Pumpkin (`pumpkin`) | 1 item | 2 items |
| Crystal Berry (`crystal_berry`) | 2 - 4 items | 3 - 5 items |
| Solar Dragonfruit (`dragonfruit`) | 1 - 3 items | 2 - 4 items |
| Ancient Elder-Oak (`elder_oak`) | 1 - 3 items | 2 - 4 items |
| Solar Sunflower (`sunflower`) | 1 - 3 items | 2 - 4 items |

---

### 4. Giant Pumpkin Mutation Math

- **Trigger Condition**: A $3 \times 3$ grid block of tiles (9 adjacent tiles) all planted with `pumpkin` at Stage 3 (Harvestable).
- **Daily Roll**: On each day start tick, if a $3 \times 3$ mature pumpkin block exists, evaluate $R_{\text{giant}} \in [0, 1)$.
- **Threshold**: If $R_{\text{giant}} < 0.05$ (5% probability):
  - The 9 individual Pumpkin entities are removed.
  - A single $3 \times 3$ `Giant Pumpkin` entity is spawned spanning grid coordinates $(x..x+2, y..y+2)$.
- **Giant Pumpkin Harvest Yield**:
  - Requires Axe or Scythe tool action.
  - Spawns **15 to 21 Mythic Pumpkins** + **500 Farm EXP**.

---

## Item Pickup Physics & Floating Animation Parameters

When crops, orchard fruits, or animal items are harvested, physical item pickup entities spawn into the 2D game world.

### 1. Parabolic Launch Arc & Ground Bounce Physics

When harvested, the item pickup originates at the crop tile center in canvas pixel space $(x_0, y_0)$:

#### Initial Kinematics
- Initial Position: $x(0) = x_0$, $y(0) = y_0 - 4\text{px}$
- Horizontal Velocity $v_x$: Uniform random $[-24.0, +24.0]$ px/sec
- Initial Vertical Velocity $v_y$: Uniform random $[-75.0, -105.0]$ px/sec (upward pop)
- Downward Gravity $g$: $320.0$ px/sec$^2$
- Elasticity / Restitution Coefficient $e$: $0.45$
- Target Floor Offset $y_{\text{floor}} = y_0 + \text{random}(-3.0, +3.0)\text{px}$

#### Discrete Integration Equations (per tick $dt$)
$$v_y(t + dt) = v_y(t) + g \cdot dt$$
$$x(t + dt) = x(t) + v_x(t) \cdot dt$$
$$y(t + dt) = y(t) + v_y(t) \cdot dt$$

#### Bounce Collision Logic
If $y(t + dt) \ge y_{\text{floor}}$ and $\text{bounceCount} < 2$:
$$v_y = -v_y \times e$$
$$v_x = v_x \times e$$
$$\text{bounceCount} = \text{bounceCount} + 1$$

If $\text{bounceCount} \ge 2$ and $|v_y| < 5.0$:
- Velocity set to $0.0$.
- State transitions to **Resting / Floating State**.

---

### 2. Sinusoidal Floating & Bobbing Animation Equations

Once resting on the ground, the item floats smoothly in mid-air above its ground shadow:

$$y_{\text{render}}(t) = y_{\text{floor}} - 4.0 + A \cdot \sin(\omega t + \phi)$$

Where parameters are:
- **Floating Amplitude** ($A$): $3.0$ pixels.
- **Oscillation Frequency** ($f$): $1.5$ Hz ($\omega = 2\pi f \approx 9.4248$ rad/sec).
- **Phase Offset** ($\phi$): Instance random float $[0, 2\pi]$ to desynchronize multiple items.
- **Dynamic Shadow Scaling**:
  $$\text{shadowScale}(t) = 1.0 - 0.20 \cdot \sin(\omega t + \phi)$$
  (Shadow shrinks when item reaches apex of bobbing arc, expanding when item lowers).

---

### 3. Player Magnet Attraction & Pickup Mechanics

#### Proximity Detection
Every 60 FPS tick, compute distance $d$ between player avatar center $(x_p, y_p)$ and item pickup $(x_i, y_i)$:

$$d = \sqrt{(x_p - x_i)^2 + (y_p - y_i)^2}$$

- **Detection Radius** ($R_{\text{detect}}$): $36.0$ pixels (1.5 grid tiles).
- **Collection Radius** ($R_{\text{collect}}$): $8.0$ pixels.

#### Magnet Acceleration Logic
If $d \le R_{\text{detect}}$:
$$\mathbf{u} = \left( \frac{x_p - x_i}{d}, \frac{y_p - y_i}{d} \right)$$
$$\mathbf{a}_{\text{magnet}} = \mathbf{u} \times 450.0\text{ px/sec}^2$$
$$\mathbf{v}_{\text{item}} = \text{clamp}(\mathbf{v}_{\text{item}} + \mathbf{a}_{\text{magnet}} \cdot dt, v_{\text{max}} = 200.0\text{ px/sec})$$
$$\mathbf{p}_{\text{item}} = \mathbf{p}_{\text{item}} + \mathbf{v}_{\text{item}} \cdot dt$$

#### Collection Resolution
If $d \le R_{\text{collect}}$:
- Check player inventory capacity:
  - If inventory has space or item stacks:
    - Item quantity added to `FarmState.inventory`.
    - Farm EXP awarded to `FarmState.farmExp`.
    - `AudioService.playHarvest()` chime played.
    - Pickup entity destroyed.
  - If inventory is 100% full:
    - Collection blocked. Pickup remains floating at player position until inventory space opens.
