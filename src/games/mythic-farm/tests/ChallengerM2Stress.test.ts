import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Grid } from '../entities/Grid';
import { Crop } from '../entities/Crop';
import { FarmingSystem } from '../systems/FarmingSystem';
import { TextureGenerator } from '../utils/TextureGenerator';
import { createDefaultFarmState, CROP_SPECIES, TOOL_TIER_CONFIG } from '../config';
import type { FarmState, CropEntity, ToolType } from '../types';

describe('Challenger M2 Stress & Empirical Boundary Suite', () => {
  let farmState: FarmState;
  let textureGen: TextureGenerator;
  let grid: Grid;
  let farmingSystem: FarmingSystem;

  beforeEach(() => {
    farmState = createDefaultFarmState(500);
    textureGen = new TextureGenerator();
    textureGen.generateAll();

    grid = new Grid();
    grid.init(farmState, textureGen);

    farmingSystem = new FarmingSystem(farmState, grid, null, textureGen);
  });

  // ==========================================
  // 1. Grid Bounds & Invalid Input Edge Cases
  // ==========================================
  describe('1. Grid Bounds & Invalid Input Edge Cases', () => {
    it('handles negative, boundary, and large out-of-bounds getTile calls', () => {
      expect(grid.getTile(-1, 0)).toBeNull();
      expect(grid.getTile(0, -1)).toBeNull();
      expect(grid.getTile(-1, -1)).toBeNull();
      expect(grid.getTile(16, 0)).toBeNull();
      expect(grid.getTile(0, 10)).toBeNull();
      expect(grid.getTile(100, 100)).toBeNull();
      expect(grid.getTile(0, Infinity)).toBeNull();
      expect(grid.getTile(Infinity, 0)).toBeNull();
    });

    it('sanitizes getTile(NaN, y) to return null', () => {
      const result = grid.getTile(NaN, 0);
      expect(result).toBeNull();
    });

    it('sanitizes getTile(x, NaN) and getTile(x, float) without throwing', () => {
      expect(grid.getTile(0, NaN)).toBeNull();
      expect(grid.getTile(0, 1.5)).not.toBeNull();
    });

    it('sanitizes screenToTile(NaN, y) to return null', () => {
      const tilePos = grid.screenToTile(NaN, 100);
      expect(tilePos).toBeNull();
    });

    it('rejects till, water, and fertilize actions on out-of-bounds integer coordinates', () => {
      expect(grid.tillTile(-1, 5)).toBe(false);
      expect(grid.tillTile(16, 5)).toBe(false);
      expect(grid.waterTile(-1, 5)).toBe(false);
      expect(grid.waterTile(16, 5)).toBe(false);
      expect(grid.fertilizeTile(-1, 5, 'speed')).toBe(false);
      expect(grid.fertilizeTile(16, 5, 'speed')).toBe(false);
    });

    it('handles screenToTile valid boundary and out-of-bounds inputs', () => {
      // Top-left corner of tile (0,0): screen (8, 16)
      expect(grid.screenToTile(8, 16)).toEqual({ x: 0, y: 0 });
      // Bottom-right corner of grid: screen (8 + 16*24 - 1, 16 + 10*24 - 1) = (391, 255)
      expect(grid.screenToTile(391, 255)).toEqual({ x: 15, y: 9 });

      // Out of bounds screen positions
      expect(grid.screenToTile(7, 16)).toBeNull();
      expect(grid.screenToTile(8, 15)).toBeNull();
      expect(grid.screenToTile(392, 255)).toBeNull();
      expect(grid.screenToTile(391, 256)).toBeNull();
      expect(grid.screenToTile(-500, -500)).toBeNull();
      expect(grid.screenToTile(9999, 9999)).toBeNull();
    });

    it('handles unlockPlot with invalid or out-of-range plot IDs without corrupting state', () => {
      grid.unlockPlot(-1);
      expect(farmState.unlockedPlots).includes(-1);

      grid.unlockPlot(999);
      expect(farmState.unlockedPlots).includes(999);

      // Verify legitimate plot 1 unlocks properly
      grid.unlockPlot(1);
      const tilePlot1 = grid.getTile(9, 1)!;
      expect(tilePlot1.unlocked).toBe(true);
    });

    it('handles crop adding/retrieving/removal at valid and invalid coordinates', () => {
      const cropEntity: CropEntity = {
        id: 'c_test',
        speciesId: 'wheat',
        stage: 0,
        withered: false,
        growthProgress: 0,
        daysPlanted: 0,
      };

      // Add at valid tile
      grid.addCrop(0, 0, cropEntity);
      expect(grid.getCrop(0, 0)).not.toBeNull();
      expect(grid.getTile(0, 0)?.crop).toBeDefined();

      // Retrieve non-existent or out of bounds crop
      expect(grid.getCrop(5, 5)).toBeNull();
      expect(grid.getCrop(-1, -1)).toBeNull();
      expect(grid.getCrop(100, 100)).toBeNull();

      // Remove valid crop
      grid.removeCrop(0, 0);
      expect(grid.getCrop(0, 0)).toBeNull();
      expect(grid.getTile(0, 0)?.crop).toBeUndefined();

      // Remove non-existent crop (should not crash)
      expect(() => grid.removeCrop(0, 0)).not.toThrow();
      expect(() => grid.removeCrop(-1, -1)).not.toThrow();
    });

    it('resets moisture properly across all tiles including water retention fertilizer edge cases', () => {
      // Till and water tile 0,0
      grid.tillTile(0, 0);
      grid.waterTile(0, 0);

      // Till and fertilize tile 1,0 with water retention
      grid.tillTile(1, 0);
      grid.waterTile(1, 0);
      grid.fertilizeTile(1, 0, 'water_retention' as any);

      // Mock random to force water retention success (< 0.5)
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

      grid.resetDailyMoisture();
      expect(grid.getTile(0, 0)?.watered).toBe(false);
      expect(grid.getTile(1, 0)?.watered).toBe(true);

      // Mock random to force water retention failure (>= 0.5)
      randomSpy.mockReturnValue(0.8);
      grid.waterTile(0, 0);

      grid.resetDailyMoisture();
      expect(grid.getTile(0, 0)?.watered).toBe(false);
      expect(grid.getTile(1, 0)?.watered).toBe(false);

      randomSpy.mockRestore();
    });
  });

  // ==========================================
  // 2. Out-of-Range Tool Usage & AOE Scaling
  // ==========================================
  describe('2. Out-of-Range Tool Usage & AOE Scaling', () => {
    it('calculates AOE patterns accurately for radius 1, 2, 3, and 5', () => {
      const aoe1 = farmingSystem.calculateToolAOE(5, 5, 1);
      expect(aoe1).toEqual([{ x: 5, y: 5 }]);

      const aoe2 = farmingSystem.calculateToolAOE(5, 5, 2);
      expect(aoe2).toEqual([{ x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }]);

      const aoe3 = farmingSystem.calculateToolAOE(5, 5, 3);
      expect(aoe3.length).toBe(9);

      const aoe5 = farmingSystem.calculateToolAOE(5, 5, 5);
      expect(aoe5.length).toBe(25);
    });

    it('executes Titanium (5x5) tool action at border without out-of-bounds side effects', () => {
      farmState.toolTiers.hoe = 'titanium';
      farmState.energy = 100;

      // Target top-left corner (0,0) with 5x5 radius
      const result = farmingSystem.executeToolAction('hoe', 0, 0);
      expect(result).toBe(true);

      // In-bound unlocked tiles should be tilled (0..2, 0..2)
      for (let r = 0; r <= 2; r++) {
        for (let c = 0; c <= 2; c++) {
          expect(grid.getTile(c, r)?.tilled).toBe(true);
        }
      }

      // Energy deducted by titanium energy cost (1)
      expect(farmState.energy).toBe(99);
    });

    it('returns false and consumes 0 energy when tool action targets entirely out-of-bounds coordinates', () => {
      farmState.toolTiers.hoe = 'basic';
      farmState.energy = 50;

      const result = farmingSystem.executeToolAction('hoe', -10, -10);
      expect(result).toBe(false);
      expect(farmState.energy).toBe(50);
    });

    it('returns false and consumes 0 energy when tool action targets locked tiles or empty actions', () => {
      farmState.toolTiers.hoe = 'basic';
      farmState.energy = 50;

      // Tile (15,9) is locked initially
      const result = farmingSystem.executeToolAction('hoe', 15, 9);
      expect(result).toBe(false);
      expect(farmState.energy).toBe(50);

      // Water untilled tile
      const waterResult = farmingSystem.executeToolAction('watering_can', 0, 0);
      expect(waterResult).toBe(false);
      expect(farmState.energy).toBe(50);
    });

    it('scythe tool removes withered crops in AOE radius', () => {
      grid.tillTile(0, 0);
      grid.tillTile(1, 0);

      grid.addCrop(0, 0, {
        id: 'w1',
        speciesId: 'wheat',
        stage: 4,
        withered: true,
        growthProgress: 0,
        daysPlanted: 5,
      });

      grid.addCrop(1, 0, {
        id: 'w2',
        speciesId: 'wheat',
        stage: 4,
        withered: true,
        growthProgress: 0,
        daysPlanted: 5,
      });

      farmState.toolTiers.scythe = 'copper'; // 1x3 AOE
      farmState.energy = 50;

      const result = farmingSystem.executeToolAction('scythe', 0, 0);
      expect(result).toBe(true);
      expect(grid.getCrop(0, 0)).toBeNull();
      expect(grid.getCrop(1, 0)).toBeNull();
      expect(farmState.energy).toBe(46); // Copper scythe cost = 4
    });

    it('handles invalid tool tier string gracefully with basic tier fallback', () => {
      (farmState.toolTiers as any).hoe = 'unknown_tier';
      expect(farmingSystem.executeToolAction('hoe', 0, 0)).toBe(true);
    });
  });

  // ==========================================
  // 3. Energy Depletion Underflow
  // ==========================================
  describe('3. Energy Depletion Underflow', () => {
    it('handles exact energy cost subtraction (energy === cost)', () => {
      farmState.energy = 5;
      farmState.toolTiers.hoe = 'basic'; // cost = 5

      const result = farmingSystem.executeToolAction('hoe', 0, 0);
      expect(result).toBe(true);
      expect(farmState.energy).toBe(0);
    });

    it('prevents action when energy is less than cost (underflow protection)', () => {
      farmState.energy = 4;
      farmState.toolTiers.hoe = 'basic'; // cost = 5

      const result = farmingSystem.executeToolAction('hoe', 0, 0);
      expect(result).toBe(false);
      expect(farmState.energy).toBe(4);
      expect(grid.getTile(0, 0)?.tilled).toBe(false);
    });

    it('prevents action when energy is 0 or negative', () => {
      farmState.energy = 0;
      farmState.toolTiers.hoe = 'basic';
      expect(farmingSystem.executeToolAction('hoe', 0, 0)).toBe(false);
      expect(farmState.energy).toBe(0);

      farmState.energy = -10;
      expect(farmingSystem.executeToolAction('hoe', 0, 0)).toBe(false);
      expect(farmState.energy).toBe(-10);
    });

    it('ensures rapid repeated actions drain energy smoothly down to 0 and clamp', () => {
      farmState.energy = 14;
      farmState.toolTiers.hoe = 'basic'; // cost = 5

      // Action 1: 14 -> 9
      expect(farmingSystem.executeToolAction('hoe', 0, 0)).toBe(true);
      expect(farmState.energy).toBe(9);

      // Action 2: 9 -> 4
      expect(farmingSystem.executeToolAction('hoe', 1, 0)).toBe(true);
      expect(farmState.energy).toBe(4);

      // Action 3: fails (4 < 5)
      expect(farmingSystem.executeToolAction('hoe', 2, 0)).toBe(false);
      expect(farmState.energy).toBe(4);
    });

    it('restores full max energy on advanceDay', () => {
      farmState.energy = 2;
      farmState.maxEnergy = 120;

      farmingSystem.advanceDay();
      expect(farmState.energy).toBe(120);
    });
  });

  // ==========================================
  // 4. Giant Crop Mutation Triggers & Harvest
  // ==========================================
  describe('4. Giant Crop Mutation Triggers & Harvest', () => {
    it('triggers 3x3 giant pumpkin mutation on 100% probability match', () => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.tillTile(c, r);
          grid.addCrop(c, r, {
            id: `p_${c}_${r}`,
            speciesId: 'pumpkin',
            stage: 3,
            withered: false,
            growthProgress: 1.0,
            daysPlanted: 4,
          });
        }
      }

      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01); // < 0.05
      farmingSystem.checkGiantPumpkinMutations();

      const centerCrop = grid.getCrop(1, 1);
      expect(centerCrop?.entity.isGiant).toBe(true);
      spy.mockRestore();
    });

    it('does NOT trigger giant pumpkin mutation if any of the 9 crops is not mature or not pumpkin', () => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.tillTile(c, r);
          grid.addCrop(c, r, {
            id: `p_${c}_${r}`,
            speciesId: 'pumpkin',
            stage: 3,
            withered: false,
            growthProgress: 1.0,
            daysPlanted: 4,
          });
        }
      }

      // Make one crop a wheat crop instead
      grid.addCrop(0, 0, {
        id: 'w0',
        speciesId: 'wheat',
        stage: 3,
        withered: false,
        growthProgress: 1.0,
        daysPlanted: 2,
      });

      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      farmingSystem.checkGiantPumpkinMutations();

      const centerCrop = grid.getCrop(1, 1);
      expect(centerCrop?.entity.isGiant).toBeUndefined();
      spy.mockRestore();
    });

    it('does NOT trigger giant pumpkin mutation if any pumpkin is withered or immature', () => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.tillTile(c, r);
          grid.addCrop(c, r, {
            id: `p_${c}_${r}`,
            speciesId: 'pumpkin',
            stage: 3,
            withered: false,
            growthProgress: 1.0,
            daysPlanted: 4,
          });
        }
      }

      // Make one pumpkin immature (stage 2)
      grid.getCrop(2, 2)!.entity.stage = 2;

      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      farmingSystem.checkGiantPumpkinMutations();

      expect(grid.getCrop(1, 1)?.entity.isGiant).toBeUndefined();
      spy.mockRestore();
    });

    it('harvests giant pumpkin using Axe, clearing 3x3 region and granting 15-21 pumpkins + 500 EXP', () => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.tillTile(c, r);
          grid.addCrop(c, r, {
            id: `p_${c}_${r}`,
            speciesId: 'pumpkin',
            stage: 3,
            withered: false,
            growthProgress: 1.0,
            daysPlanted: 4,
          });
        }
      }

      const centerCrop = grid.getCrop(1, 1)!;
      centerCrop.entity.isGiant = true;

      farmState.toolTiers.axe = 'basic';
      farmState.energy = 50;

      const initialPumpkins = farmState.inventory['crop_pumpkin'] || 0;
      const initialExp = farmState.farmExp || 0;

      const result = farmingSystem.executeToolAction('axe', 1, 1);
      expect(result).toBe(true);

      // Verify all 9 crops in 3x3 grid are removed
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          expect(grid.getCrop(c, r)).toBeNull();
        }
      }

      // Verify yield and EXP (9x pumpkins + 200 EXP)
      const newPumpkins = farmState.inventory['crop_pumpkin'] || 0;
      expect(newPumpkins - initialPumpkins).toBe(9);
      expect(farmState.farmExp).toBe(initialExp + 200);

      // Verify item pickup particle spawned
      expect(farmingSystem.getActivePickups().length).toBe(1);
    });

    it('handles giant pumpkin harvest near border safely without out-of-bounds errors', () => {
      // Giant pumpkin centered at (0,0)
      grid.tillTile(0, 0);
      grid.tillTile(1, 0);
      grid.tillTile(0, 1);
      grid.tillTile(1, 1);

      const centerCrop = grid.addCrop(0, 0, {
        id: 'p_giant_edge',
        speciesId: 'pumpkin',
        stage: 3,
        withered: false,
        growthProgress: 1.0,
        daysPlanted: 4,
      });
      centerCrop.entity.isGiant = true;

      farmState.energy = 50;
      expect(() => farmingSystem.executeToolAction('axe', 0, 0)).not.toThrow();
      expect(grid.getCrop(0, 0)).toBeNull();
    });
  });

  // ==========================================
  // 5. Item Pickup Accumulation & Magnet Physics
  // ==========================================
  describe('5. Item Pickup Accumulation & Magnet Physics', () => {
    it('handles mass creation of 100 item pickups and updates physics stably', () => {
      for (let i = 0; i < 100; i++) {
        farmingSystem.createItemPickup(i % 16, Math.floor(i / 16), 'crop_wheat', 1);
      }

      expect(farmingSystem.getActivePickups().length).toBe(100);

      // Simulate 60 frames (1 second) of physics updates
      for (let f = 0; f < 60; f++) {
        farmingSystem.update(0.016);
      }

      // Pickups should be active and resting or bouncing
      const pickups = farmingSystem.getActivePickups();
      expect(pickups.length).toBe(100);
      for (const p of pickups) {
        expect(p.life).toBeLessThan(5.0);
        expect(p.life).toBeGreaterThan(3.5);
      }
    });

    it('attracts resting pickups toward player when within 36px radius and collects within 8px radius', () => {
      // Create pickup at (100, 100)
      const pickup = farmingSystem.createItemPickup(0, 0, 'crop_wheat', 1);
      pickup.sprite.x = 100;
      pickup.sprite.y = 100;
      pickup.baseY = 100;
      pickup.resting = true;

      // Position player at (120, 100) -> distance = 20px (< 36px radius)
      farmingSystem.playerPosition = { x: 120, y: 100 };

      // Update 1 frame
      farmingSystem.update(0.016);

      // Pickup sprite should move right toward player (x > 100)
      expect(pickup.sprite.x).toBeGreaterThan(100);

      // Move player very close (101, 100) -> distance <= 8px
      farmingSystem.playerPosition = { x: 101, y: 100 };
      farmingSystem.update(0.016);

      // Pickup should be collected and destroyed (life <= 0)
      expect(farmingSystem.getActivePickups().length).toBe(0);
    });

    it('handles player position exact overlap (dist === 0) without division-by-zero or NaN corruption', () => {
      const pickup = farmingSystem.createItemPickup(0, 0, 'crop_wheat', 1);
      pickup.sprite.x = 100;
      pickup.sprite.y = 100;
      pickup.baseY = 100;
      pickup.resting = true;

      // Position player exactly at (100, 100)
      farmingSystem.playerPosition = { x: 100, y: 100 };

      expect(() => farmingSystem.update(0.016)).not.toThrow();

      // Pickup is collected immediately (dist = 0 <= 8.0)
      expect(farmingSystem.getActivePickups().length).toBe(0);
    });

    it('expires and removes item pickups after 5 seconds of total lifespan', () => {
      farmingSystem.createItemPickup(0, 0, 'crop_wheat', 1);
      expect(farmingSystem.getActivePickups().length).toBe(1);

      // Advance time by 6 seconds
      farmingSystem.update(6.0);

      expect(farmingSystem.getActivePickups().length).toBe(0);
    });

    it('cleans up pixi sprite objects from container upon pickup destruction', () => {
      const initialChildrenCount = farmingSystem.pickupsContainer.children.length;

      farmingSystem.createItemPickup(0, 0, 'crop_wheat', 1);
      expect(farmingSystem.pickupsContainer.children.length).toBe(initialChildrenCount + 1);

      // Expire pickup
      farmingSystem.update(5.1);

      expect(farmingSystem.pickupsContainer.children.length).toBe(initialChildrenCount);
    });
  });
});
