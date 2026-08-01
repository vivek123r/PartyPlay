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

    // Rento is the production evolution of the experimental Driftspire
    // cartridge. Keep Driftspire's source and saves intact for development,
    // while exposing only its replacement in the public game library.
    if (this.entries.has('rento')) {
      this.entries.delete('driftspire');
    }
  }

  public getAll(): GameRegistryEntry[] {
    return Array.from(this.entries.values()).sort((left, right) => {
      if (left.manifest.id === 'rento') return -1;
      if (right.manifest.id === 'rento') return 1;
      return left.manifest.title.localeCompare(right.manifest.title);
    });
  }

  public get(id: string): GameRegistryEntry | undefined {
    return this.entries.get(id);
  }
}

export const GameRegistry = new GameRegistryService();
