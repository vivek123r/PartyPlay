# Specification Mining & Architecture Contract: Milestone 3 (M3)
**Module**: Insane Automation & Processing Workshop
**Target Project**: Mythic Farm (`src/games/mythic-farm`)
**Author**: Specification Miner Agent (`spec_miner_m3_3`)

---

## 1. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Automation | Cardinal Sprinkler | Waters 4 adjacent cardinal tiles (North, East, South, West) at day start/tick | Tile coordinate `(x,y)` | `TileData.watered = true` for 4 adjacent tiles | Out-of-bounds tiles ignored; locked tiles skipped | `types.ts`, `config.ts` |
| 2 | Automation | Radial Sprinkler | Waters 8 surrounding tiles in a 3x3 box centered on sprinkler | Tile coordinate `(x,y)` | `TileData.watered = true` for 8 surrounding tiles | Out-of-bounds tiles ignored; locked tiles skipped | `types.ts`, `config.ts` |
| 3 | Automation | Cross Sprinkler | Waters 12 tiles in cross pattern with 2-tile reach (`1 <= \|dx\|+\|dy\| <= 2`) | Tile coordinate `(x,y)` | `TileData.watered = true` for 12 cross tiles | Out-of-bounds tiles ignored; locked tiles skipped | `types.ts`, `config.ts` |
| 4 | Automation | Basic Scarecrow | Protects a 3x3 grid area (1-tile radius, 9 tiles total) from pest/crow attacks | Tile coordinate `(x,y)` | Pest event interception (`intercepted = true`) | Non-crop tiles unaffected | `types.ts`, `ORIGINAL_REQUEST.md` |
| 5 | Automation | Deluxe Scarecrow | Protects a 5x5 grid area (2-tile radius, 25 tiles total) from pest/crow attacks | Tile coordinate `(x,y)` | Pest event interception (`intercepted = true`) | Non-crop tiles unaffected | `types.ts`, `ORIGINAL_REQUEST.md` |
| 6 | Automation | Harvester Drone | Scans range for harvestable crops (`stage === 3`), harvests them, auto-deposits to inventory/shipping bin | Tile coordinate `(x,y)`, range | Item added to `inventory`/shipping bin, crop regrown or removed | Inventory full -> items dropped as physical pickups | `types.ts`, `PROJECT.md` |
| 7 | Processing | Preserves Jar | Converts raw fruits/vegetables into Jam/Jelly (2x base price + 50) after 30s | 1x Fruit/Vegetable item | 1x `artisan_jam` | Invalid input -> blocked; early remove -> refund input | `types.ts`, `config.ts` |
| 8 | Processing | Brewing Barrel | Converts fruits/grains into Wine/Cider/Mead (3x base price) after 60s | 1x Fruit/Grain item | 1x `artisan_wine` | Invalid input -> blocked; early remove -> refund input | `types.ts`, `config.ts` |
| 9 | Processing | Seed Maker | Converts harvested crops into 2-3 seed packets (or rare Ancient Seed) after 10s | 1x Harvested Crop | 2-3x `seed_*` items (0.5% ancient seed) | Invalid input -> blocked; early remove -> refund input | `types.ts`, `config.ts` |
| 10 | Processing | Loom | Converts Silk Thread into Fine Silk Cloth (flat 450 coins) after 45s | 1x `product_silk_thread` | 1x `artisan_cloth` | Invalid input -> blocked; early remove -> refund input | `types.ts`, `config.ts` |
| 11 | Processing | Mill | Converts Wheat into Flour (2x) or Sunflower into Sun Oil (1x) after 15s | 1x `crop_wheat` / `crop_sunflower` | 2x `artisan_flour` / 1x `artisan_sun_oil` | Invalid input -> blocked; early remove -> refund input | `types.ts`, `config.ts` |

---

## 2. Edge Cases

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|------------------------------|
| 1 | Placement Validation | Attempting to place building/station on occupied crop tile | **Blocked**. Must display notification: "Cannot place building on occupied crop tile". |
| 2 | Placement Validation | Attempting to place building/station on locked tile (`unlocked === false`) | **Blocked**. Action returns `false`. |
| 3 | Placement Validation | Attempting to place building/station on tile with existing building/station | **Blocked**. Action returns `false`. |
| 4 | Station Removal | Demolishing station while timer is active (`active === true`) | **Refund Materials**. Remaining input item is returned to player `inventory`. Station item returned to inventory. `tile.station` removed. |
| 5 | Station Removal | Demolishing station with completed output ready (`timerRemaining <= 0`) | **Deliver Output**. Output item deposited to `inventory` (or dropped as pickup if full). Station item returned to inventory. |
| 6 | Day Transition Timing | Day transition tick while workshop station timer is running | **Uninterrupted Timer**. Timer is driven by delta time `dt`. Day transition time skip (e.g. 60s sleep) subtracts 60s from `timerRemaining`. If `timerRemaining <= 0`, station becomes inactive and output is ready. |
| 7 | Day Transition Timing | Daily hydration reset vs Sprinklers execution | **Sprinkler Priority**. Daily morning transition executes `resetDailyMoisture()` FIRST, then runs all Sprinklers to re-water target tiles BEFORE crop growth evaluation. |
| 8 | Empty/Invalid Inputs | Clicking station with empty hand or wrong item type | **Validation Guard**. If empty hand, shows status tooltip ("Empty" or "Processing [Item] X%"). If invalid item, displays error "Invalid item for this station". |
| 9 | Harvester Drone Target Overlap | Two drones scanning the same mature crop tile simultaneously | **Race Protection**. First drone harvests crop and updates `tile.crop` state. Second drone finds no mature crop and moves to next target. |
| 10 | Inventory Overflow | Harvester drone harvests crop when player inventory is full | **Ground Pickup Spill**. Items that cannot fit in inventory drop as physical pickup entities on the crop tile. |
| 11 | Out-of-Bounds Coverage | Sprinkler or Scarecrow placed at grid boundary (e.g. (0,0) or (15,9)) | **Bound Clamping**. Offsets outside `(0 <= x < 16, 0 <= y < 10)` are filtered out without index out of bounds exceptions. |

---

## 3. Detailed Specification Tables & Contracts

### 3.1 Sprinkler Machinery Specification

#### Coverage Formula & Relative Offsets
Given a sprinkler placed on tile $(X_s, Y_s)$:

1. **Cardinal Sprinkler (`sprinkler_cardinal`)**:
   - **Range**: 1 tile cardinal reach (4 tiles total)
   - **Relative Offsets $(dx, dy)$**:
     $$\{(0, -1), (1, 0), (0, 1), (-1, 0)\}$$
   - **Target Tiles**:
     $$\{(X_s + dx, Y_s + dy) \mid (dx, dy) \in \text{Cardinal Offsets}\}$$

2. **Radial Sprinkler (`sprinkler_radial`)**:
   - **Range**: 1 tile radial reach (3x3 area excluding center, 8 tiles total)
   - **Relative Offsets $(dx, dy)$**:
     $$\{(dx, dy) \mid dx \in \{-1, 0, 1\}, dy \in \{-1, 0, 1\}, (dx, dy) \neq (0,0)\}$$

3. **Cross Sprinkler (`sprinkler_cross`)**:
   - **Range**: 2-tile Manhattan reach (12 tiles total)
   - **Relative Offsets $(dx, dy)$**:
     $$\{(dx, dy) \mid 1 \le |dx| + |dy| \le 2\}$$
     - $|dx| + |dy| = 1$: $(0,-1), (1,0), (0,1), (-1,0)$ [4 cardinal inner]
     - $|dx| + |dy| = 2$: $(0,-2), (2,0), (0,2), (-2,0), (-1,-1), (1,-1), (-1,1), (1,1)$ [4 cardinal outer + 4 diagonal inner]

#### Watering Application Algorithm
```typescript
function applySprinklerWatering(grid: TileData[][], building: AutomationBuilding): number {
  let wateredCount = 0;
  const offsets = getSprinklerOffsets(building.type);
  
  for (const [dx, dy] of offsets) {
    const tx = building.tileX + dx;
    const ty = building.tileY + dy;
    
    // Bounds check
    if (tx >= 0 && tx < GRID_WIDTH && ty >= 0 && ty < GRID_HEIGHT) {
      const tile = grid[ty][tx];
      if (tile && tile.unlocked !== false && tile.tilled) {
        if (!tile.watered) {
          tile.watered = true;
          wateredCount++;
        }
        if (tile.crop) {
          tile.crop.wateredToday = true;
        }
      }
    }
  }
  return wateredCount;
}
```

---

### 3.2 Scarecrow Protection Specification

#### Coverage & Pest Interception Contracts
1. **Basic Scarecrow (`scarecrow` / `scarecrow_basic`)**:
   - Radius: 1 tile box ($3 \times 3$ area centered on scarecrow, 9 tiles total).
   - Protection condition for crop at $(X_c, Y_c)$:
     $$\max(|X_c - X_s|, |Y_c - Y_s|) \le 1$$

2. **Deluxe Scarecrow (`scarecrow_deluxe`)**:
   - Radius: 2 tile box ($5 \times 5$ area centered on scarecrow, 25 tiles total).
   - Protection condition for crop at $(X_c, Y_c)$:
     $$\max(|X_c - X_s|, |Y_c - Y_s|) \le 2$$

#### Pest Event Generation Algorithm
```typescript
interface PestEventResult {
  totalCropsChecked: number;
  protectedCount: number;
  damagedCount: number;
}

function processDailyPestEvents(grid: TileData[][], scarecrows: AutomationBuilding[], basePestChance = 0.12): PestEventResult {
  let totalCropsChecked = 0;
  let protectedCount = 0;
  let damagedCount = 0;

  for (let r = 0; r < GRID_HEIGHT; r++) {
    for (let c = 0; c < GRID_WIDTH; c++) {
      const tile = grid[r][c];
      if (tile.crop && tile.crop.stage < 3 && !tile.crop.withered) {
        totalCropsChecked++;
        
        // Check if covered by any active scarecrow
        const isProtected = scarecrows.some(sc => {
          if (!sc.active) return false;
          const maxDist = Math.max(Math.abs(c - sc.tileX), Math.abs(r - sc.tileY));
          const radius = sc.type === 'scarecrow_deluxe' ? 2 : 1;
          return maxDist <= radius;
        });

        if (isProtected) {
          protectedCount++;
        } else {
          // Roll pest attack
          if (Math.random() < basePestChance) {
            tile.crop.withered = true;
            tile.crop.stage = 4; // Withered
            damagedCount++;
          }
        }
      }
    }
  }
  return { totalCropsChecked, protectedCount, damagedCount };
}
```

---

### 3.3 Harvester Drone Specification

#### Drone Attributes & Operational Loop
- **Building Type**: `harvester_drone`
- **Scan Range**: Default 4 tiles radius ($9 \times 9$ area centered on drone) or global farm plot.
- **Harvest Priority**: Nearest mature crop ($stage === 3$) first.

#### Tick Execution Algorithm
```typescript
function tickHarvesterDrone(
  drone: AutomationBuilding,
  grid: TileData[][],
  inventory: Record<string, number>,
  cropSpeciesMap: Record<string, CropSpecies>
): boolean {
  if (!drone.active) return false;

  for (let r = 0; r < GRID_HEIGHT; r++) {
    for (let c = 0; c < GRID_WIDTH; c++) {
      const maxDist = Math.max(Math.abs(c - drone.tileX), Math.abs(r - drone.tileY));
      if (maxDist > drone.range) continue;

      const tile = grid[r][c];
      if (tile.crop && tile.crop.stage === 3 && !tile.crop.withered) {
        const species = cropSpeciesMap[tile.crop.speciesId];
        if (!species) continue;

        // Calculate yield quantity
        const yieldCount = Math.floor(
          Math.random() * (species.harvestYieldMax - species.harvestYieldMin + 1)
        ) + species.harvestYieldMin;

        // Deposit item to inventory
        const itemId = species.harvestItemId;
        inventory[itemId] = (inventory[itemId] || 0) + yieldCount;

        // Regrow or clear crop
        if (species.regrows) {
          tile.crop.stage = 2; // Flowering
          tile.crop.growthProgress = 0.5;
        } else {
          tile.crop = undefined;
        }

        return true; // Harvested 1 crop this tick
      }
    }
  }
  return false;
}
```

---

### 3.4 Artisan Workshop Station Recipes Table

| Station Type | Station ID | Input Item ID | Input Qty | Output Item ID | Output Qty | Timer (sec) | Price Formula | Base Input Price | Output Sell Price |
|--------------|------------|---------------|-----------|----------------|------------|-------------|---------------|------------------|-------------------|
| Preserves Jar | `preserves_jar` | `crop_pumpkin` | 1 | `artisan_jam` | 1 | 30s | $2 \times P_{base} + 50$ | 120 coins | 290 coins |
| Preserves Jar | `preserves_jar` | `crop_crystal_berry` | 1 | `artisan_jam` | 1 | 30s | $2 \times P_{base} + 50$ | 280 coins | 610 coins |
| Preserves Jar | `preserves_jar` | `crop_dragonfruit` | 1 | `artisan_jam` | 1 | 30s | $2 \times P_{base} + 50$ | 450 coins | 950 coins |
| Brewing Barrel | `brewing_barrel` | `crop_dragonfruit` | 1 | `artisan_wine` | 1 | 60s | $3 \times P_{base}$ | 450 coins | 1350 coins |
| Brewing Barrel | `brewing_barrel` | `crop_crystal_berry` | 1 | `artisan_wine` | 1 | 60s | $3 \times P_{base}$ | 280 coins | 840 coins |
| Brewing Barrel | `brewing_barrel` | `crop_wheat` | 1 | `artisan_wine` | 1 | 60s | $3 \times P_{base}$ | 25 coins | 75 coins |
| Seed Maker | `seed_maker` | `crop_wheat` | 1 | `seed_wheat` | 2 | 10s | $1 \times P_{base}$ | 25 coins | 25 coins |
| Seed Maker | `seed_maker` | `crop_pumpkin` | 1 | `seed_pumpkin` | 2 | 10s | $1 \times P_{base}$ | 120 coins | 80 coins |
| Seed Maker | `seed_maker` | `crop_crystal_berry` | 1 | `seed_crystal_berry` | 2 | 10s | $1 \times P_{base}$ | 280 coins | 160 coins |
| Loom | `loom` | `product_silk_thread` | 1 | `artisan_cloth` | 1 | 45s | Flat 450 | 180 coins | 450 coins |
| Mill | `mill` | `crop_wheat` | 1 | `artisan_flour` | 2 | 15s | Flat 30/ea | 25 coins | 60 coins total |
| Mill | `mill` | `crop_sunflower` | 1 | `artisan_sun_oil` | 1 | 15s | Flat 70 | 90 coins | 70 coins |

---

## 4. Test Suite Design

### 4.1 Unit Test Specifications (`tests/M3_Automation_Unit.test.ts` & `tests/M3_Workshop_Unit.test.ts`)

#### Unit Test Group 1: Sprinkler Engine
- **UT-M3-01: Cardinal Sprinkler Hydration**
  - *Setup*: Place `sprinkler_cardinal` at `(5,5)`. Till tiles `(5,4)`, `(6,5)`, `(5,6)`, `(4,5)`, and `(7,5)`.
  - *Action*: Call `applySprinklerWatering()`.
  - *Assert*: Target tiles `(5,4)`, `(6,5)`, `(5,6)`, `(4,5)` have `watered === true`. Non-cardinal tile `(7,5)` remains `watered === false`.
- **UT-M3-02: Radial Sprinkler 3x3 Hydration**
  - *Setup*: Place `sprinkler_radial` at `(5,5)`. Till all surrounding tiles in `(4..6, 4..6)`.
  - *Action*: Call `applySprinklerWatering()`.
  - *Assert*: All 8 surrounding tiles are `watered === true`. Center tile `(5,5)` is not updated.
- **UT-M3-03: Cross Sprinkler 12-Tile Hydration**
  - *Setup*: Place `sprinkler_cross` at `(5,5)`. Till entire grid.
  - *Action*: Call `applySprinklerWatering()`.
  - *Assert*: Exactly 12 tiles matching $1 \le |dx|+|dy| \le 2$ are `watered === true`.
- **UT-M3-04: Sprinkler Grid Boundary Safety**
  - *Setup*: Place `sprinkler_radial` at corner `(0,0)`.
  - *Action*: Call `applySprinklerWatering()`.
  - *Assert*: No index out of bounds error. Valid tiles `(1,0)`, `(0,1)`, `(1,1)` are `watered === true`.

#### Unit Test Group 2: Scarecrow & Pest Protection
- **UT-M3-05: Basic Scarecrow 3x3 Protection**
  - *Setup*: Place `scarecrow` at `(3,3)`. Plant crop at `(4,4)` (dist 1) and `(5,5)` (dist 2).
  - *Action*: Call `processDailyPestEvents()`.
  - *Assert*: Crop at `(4,4)` is protected (`protectedCount === 1`). Crop at `(5,5)` is subjected to pest roll.
- **UT-M3-06: Deluxe Scarecrow 5x5 Protection**
  - *Setup*: Place `scarecrow_deluxe` at `(3,3)`. Plant crop at `(5,5)` (dist 2) and `(6,6)` (dist 3).
  - *Action*: Call `processDailyPestEvents()`.
  - *Assert*: Crop at `(5,5)` is protected (`protectedCount === 1`). Crop at `(6,6)` is subjected to pest roll.

#### Unit Test Group 3: Harvester Drone Engine
- **UT-M3-07: Harvester Drone Scanning & Harvesting**
  - *Setup*: Place `harvester_drone` at `(2,2)` with range 4. Plant harvestable wheat (`stage === 3`) at `(3,3)`.
  - *Action*: Call `tickHarvesterDrone()`.
  - *Assert*: Crop at `(3,3)` is harvested (`tile.crop === undefined`), inventory `crop_wheat` count increases by yield amount.

#### Unit Test Group 4: Processing Workshop Stations
- **UT-M3-08: Preserves Jar Recipe Processing**
  - *Setup*: Create `preserves_jar` station at `(1,1)`. Insert `crop_pumpkin`.
  - *Action*: Tick timer by 30 seconds.
  - *Assert*: `station.active === false`, `station.outputItem === 'artisan_jam'`, output sell value formula evaluates to 290 coins.
- **UT-M3-09: Brewing Barrel Recipe Processing**
  - *Setup*: Create `brewing_barrel` station at `(1,1)`. Insert `crop_dragonfruit`.
  - *Action*: Tick timer by 60 seconds.
  - *Assert*: `station.outputItem === 'artisan_wine'`, sell value formula evaluates to 1350 coins.
- **UT-M3-10: Seed Maker Output Yield**
  - *Setup*: Create `seed_maker` station at `(1,1)`. Insert `crop_wheat`.
  - *Action*: Tick timer by 10 seconds.
  - *Assert*: `station.outputItem === 'seed_wheat'`, output quantity is 2.

---

### 4.2 Integration Test Specifications (`tests/M3_Integration.test.ts`)

- **IT-M3-01: Daily Tick Automation Execution Order**
  - *Setup*: Grid with Cardinal Sprinkler, Basic Scarecrow, growing crops, and mature crops.
  - *Action*: Trigger `FarmingSystem.processDailyTick()`.
  - *Assert Execution Order*:
    1. Daily moisture reset performed.
    2. Sprinklers water target tiles.
    3. Crop growth updated (hydration counted).
    4. Pest roll executed (scarecrow intercepts unprotected crops).
    5. Harvester drone scans and auto-harvests mature crops.
- **IT-M3-02: Demolish Station with Active Contents**
  - *Setup*: Station processing `crop_pumpkin` with 15s remaining.
  - *Action*: Demolish station (`removeStation(tileX, tileY)`).
  - *Assert*: `crop_pumpkin` quantity restored to `state.inventory`. Station building returned to inventory. `tile.station` set to undefined.
- **IT-M3-03: Sprinkler & Fertilizer Combination**
  - *Setup*: Soil tilled with `water_retention` fertilizer and `speed` fertilizer. Cardinal sprinkler placed.
  - *Action*: Run daily tick.
  - *Assert*: Soil stays watered continuously; `speed` fertilizer accelerates growth alongside sprinkler hydration.

---

### 4.3 System Test Specifications (`tests/M3_System.test.ts`)

- **ST-M3-01: Full Automated Farm & Processing Workshop Lifecycle (10 Simulated Days)**
  - *Setup*: 16x10 farm plot with 4 Cardinal Sprinklers, 2 Basic Scarecrows, 1 Harvester Drone, 2 Preserves Jams, 1 Brewing Barrel. Initial inventory: 20x `seed_wheat`, 10x `seed_dragonfruit`.
  - *Action*: Execute a 10-day loop simulating player planting, daily tick transitions, harvester drone auto-deposits, and workshop processing cycles.
  - *Assert System Invariants*:
    - Zero unhandled exceptions or NaN values in `FarmState`.
    - Sprinklers water 100% of target tilled tiles each morning.
    - Zero crops destroyed by pests within scarecrow protection radii.
    - Mature crops auto-collected into inventory.
    - Artisan goods successfully crafted and ready for marketplace sale with correct price formulas.
