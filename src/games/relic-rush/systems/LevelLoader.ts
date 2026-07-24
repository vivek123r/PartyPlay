import type { RectBounds } from './PhysicsEngine';
import { CrossTrigger, GateDoor } from '../entities/CrossTrigger';
import { Trap } from '../entities/Traps';
import { Collectible } from '../entities/Collectibles';
import { BreakableCrate, WaterZone } from '../entities/InteractiveObjects';
import { TileRenderer } from './TileRenderer';
import { Graphics } from 'pixi.js';
import { RELIC_RUSH_CONFIG } from '../config';

export interface LevelData {
  worldIndex: number;
  worldName: string;
  bgColor: number;
  wallColor: number;
  levelWidth: number;
  laneHeight: number;
  platforms: RectBounds[];
  triggers: CrossTrigger[];
  doors: GateDoor[];
  traps: Trap[];
  collectibles: Collectible[];
  crates: BreakableCrate[];
  waterZones: WaterZone[];
  exitX: number;
  laneBgGraphics: Graphics[];
}

export class LevelLoader {
  public static loadLevel(stageIndex: number, playerCount: number): LevelData {
    const worldIdx = stageIndex % RELIC_RUSH_CONFIG.WORLDS.length;
    const worldPreset = RELIC_RUSH_CONFIG.WORLDS[worldIdx];

    const activeLanes = Math.min(4, Math.max(2, playerCount));
    const levelWidth = 2400; // 2400px wide (5 full screens)
    const laneHeight = Math.floor(RELIC_RUSH_CONFIG.VIRTUAL_HEIGHT / activeLanes);
    const tileSize = 16;

    const platforms: RectBounds[] = [];
    const triggers: CrossTrigger[] = [];
    const doors: GateDoor[] = [];
    const traps: Trap[] = [];
    const collectibles: Collectible[] = [];
    const crates: BreakableCrate[] = [];
    const waterZones: WaterZone[] = [];
    const laneBgGraphics: Graphics[] = [];

    for (let lane = 0; lane < activeLanes; lane++) {
      const tileGraphics = new Graphics();
      const minY = lane * laneHeight;
      const maxY = minY + laneHeight;
      const floorY = maxY - 12;

      // 1. Draw Background Recessed Wall Texture Tiles across full 2400px width
      for (let tx = 0; tx < levelWidth; tx += tileSize) {
        for (let ty = minY; ty < maxY; ty += tileSize) {
          TileRenderer.drawTile(
            tileGraphics,
            'bg_wall',
            tx,
            ty,
            tileSize,
            0,
            worldPreset.wallColor,
            worldPreset.bgColor
          );
        }
      }

      // Torches along background wall
      for (let torchX = 80; torchX < levelWidth; torchX += 240) {
        TileRenderer.drawTile(
          tileGraphics,
          'torch',
          torchX,
          minY + 6,
          tileSize,
          0,
          worldPreset.wallColor,
          worldPreset.bgColor
        );
      }

      // Lane Divider Line at top of lane
      if (lane > 0) {
        tileGraphics.rect(0, minY, levelWidth, 2).fill({ color: worldPreset.wallColor, alpha: 0.6 });
      }

      // ==========================================
      // SECTION 1: Spawn & Jumpable Stone Pillar (0 - 400px)
      // ==========================================
      platforms.push({ x: 0, y: floorY, width: 380, height: 12, laneIndex: lane });
      for (let tx = 0; tx < 380; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'floor', tx, floorY, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }
      collectibles.push(new Collectible('relic_shard', lane, 120, maxY - 24));

      // Jumpable Stone Pillar 1 (x: 280, height: 26px, 36px headroom -> jumpable!)
      const pillar1Y = floorY - 26;
      platforms.push({ x: 280, y: pillar1Y, width: 16, height: 26, laneIndex: lane });
      TileRenderer.drawTile(tileGraphics, 'pillar', 280, pillar1Y, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);

      // ==========================================
      // SECTION 2: Treasure Vault & Jumpable Pillar 2 (400 - 800px)
      // ==========================================
      const vaultTopY = maxY - 34;
      platforms.push({ x: 420, y: vaultTopY, width: 120, height: 10, laneIndex: lane });
      for (let tx = 420; tx < 540; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'brick', tx, vaultTopY, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }

      TileRenderer.drawTile(tileGraphics, 'spikes', 460, floorY - 4, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      platforms.push({ x: 540, y: floorY, width: 240, height: 12, laneIndex: lane });
      for (let tx = 540; tx < 780; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'floor', tx, floorY, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }

      const pillar2Y = floorY - 26;
      platforms.push({ x: 720, y: pillar2Y, width: 16, height: 26, laneIndex: lane });
      TileRenderer.drawTile(tileGraphics, 'pillar', 720, pillar2Y, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);

      crates.push(new BreakableCrate(lane, 600, floorY - 16));
      collectibles.push(new Collectible('treasure_chest', lane, 680, floorY - 26));

      // ==========================================
      // SECTION 3: Water & Moving Platforms (800 - 1200px)
      // ==========================================
      waterZones.push(new WaterZone(lane, 820, floorY - 16, 96, 24));

      const step1Y = maxY - 30;
      platforms.push({ x: 940, y: step1Y, width: 80, height: 10, laneIndex: lane });
      for (let tx = 940; tx < 1020; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'brick', tx, step1Y, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }

      platforms.push({ x: 1040, y: floorY, width: 140, height: 12, laneIndex: lane });
      for (let tx = 1040; tx < 1180; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'floor', tx, floorY, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }
      collectibles.push(new Collectible('relic_shard', lane, 970, step1Y - 20));

      // ==========================================
      // SECTION 4: Cross-Lane Sabotage & Jumpable Pillar 3 (1200 - 1600px)
      // ==========================================
      const targetLane = (lane + 1) % activeLanes;

      platforms.push({ x: 1220, y: floorY, width: 360, height: 12, laneIndex: lane });
      for (let tx = 1220; tx < 1580; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'floor', tx, floorY, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }

      const pillar3Y = floorY - 26;
      platforms.push({ x: 1460, y: pillar3Y, width: 16, height: 26, laneIndex: lane });
      TileRenderer.drawTile(tileGraphics, 'pillar', 1460, pillar3Y, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);

      const sabotageTrigger = new CrossTrigger(
        `sabotage_${lane}`,
        lane,
        targetLane,
        'drop_boulder',
        1300,
        floorY - 16
      );
      triggers.push(sabotageTrigger);

      const door = new GateDoor(targetLane, 1500, maxY - 44);
      doors.push(door);

      if (stageIndex > 0) {
        traps.push(new Trap('flame_jet', lane, 1420, floorY - 20));
      }

      // ==========================================
      // SECTION 5: Boulder Escape Chase (1600 - 2000px)
      // ==========================================
      platforms.push({ x: 1620, y: floorY, width: 360, height: 12, laneIndex: lane });
      for (let tx = 1620; tx < 1980; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'floor', tx, floorY, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }

      const boulderTrap = new Trap('rolling_boulder', lane, 1940, floorY - 24);
      traps.push(boulderTrap);

      crates.push(new BreakableCrate(lane, 1720, floorY - 16));
      collectibles.push(new Collectible('relic_shard', lane, 1800, floorY - 20));

      // ==========================================
      // SECTION 6: Exit Gate & Victory Arch (2000 - 2400px)
      // ==========================================
      platforms.push({ x: 2020, y: floorY, width: 380, height: 12, laneIndex: lane });
      for (let tx = 2020; tx < 2400; tx += tileSize) {
        TileRenderer.drawTile(tileGraphics, 'floor', tx, floorY, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      }

      if (lane === 0) {
        collectibles.push(new Collectible('golden_idol', lane, 2140, floorY - 34));
      }

      TileRenderer.drawTile(tileGraphics, 'door', levelWidth - 50, maxY - 28, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);
      TileRenderer.drawTile(tileGraphics, 'exit_flag', levelWidth - 30, maxY - 28, tileSize, 0, worldPreset.wallColor, worldPreset.bgColor);

      laneBgGraphics.push(tileGraphics);
    }

    return {
      worldIndex: worldIdx,
      worldName: worldPreset.name,
      bgColor: worldPreset.bgColor,
      wallColor: worldPreset.wallColor,
      levelWidth,
      laneHeight,
      platforms,
      triggers,
      doors,
      traps,
      collectibles,
      crates,
      waterZones,
      exitX: levelWidth - 45,
      laneBgGraphics,
    };
  }
}
