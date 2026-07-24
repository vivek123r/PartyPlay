import type { GameManifest, GameModule } from './types';

export interface GameRegistryEntry {
  manifest: GameManifest;
  load: () => Promise<{ default: new () => GameModule }>;
}

class GameRegistryService {
  private entries = new Map<string, GameRegistryEntry>();

  constructor() {
    this.scanGames();
  }

  private scanGames(): void {
    // Eager import all manifests
    const manifestModules = import.meta.glob<{ default: GameManifest }>(
      '../games/*/manifest.ts',
      { eager: true }
    );

    // Lazy import game index files
    const gameModules = import.meta.glob<{ default: new () => GameModule }>(
      '../games/*/index.ts'
    );

    for (const [path, mod] of Object.entries(manifestModules)) {
      const manifest = mod.default;
      const dir = path.split('/')[2]; // ../games/<dir>/manifest.ts
      const entryKey = `../games/${dir}/index.ts`;

      if (gameModules[entryKey]) {
        this.entries.set(manifest.id, {
          manifest,
          load: gameModules[entryKey],
        });
      }
    }
  }

  public getAll(): GameRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  public get(id: string): GameRegistryEntry | undefined {
    return this.entries.get(id);
  }
}

export const GameRegistry = new GameRegistryService();
