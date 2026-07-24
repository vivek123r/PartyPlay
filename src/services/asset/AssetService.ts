import { Assets, Texture } from 'pixi.js';

export class AssetService {
  private loadedAssets = new Map<string, any>();

  public async loadTexture(alias: string, url: string): Promise<Texture> {
    if (this.loadedAssets.has(alias)) {
      return this.loadedAssets.get(alias);
    }
    const texture = await Assets.load(url);
    this.loadedAssets.set(alias, texture);
    return texture;
  }

  public getTexture(alias: string): Texture | null {
    return this.loadedAssets.get(alias) ?? null;
  }

  public unload(alias: string): void {
    if (this.loadedAssets.has(alias)) {
      Assets.unload(alias);
      this.loadedAssets.delete(alias);
    }
  }

  public clear(): void {
    this.loadedAssets.forEach((_, alias) => Assets.unload(alias));
    this.loadedAssets.clear();
  }
}
