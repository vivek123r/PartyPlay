export class StorageService {
  private prefix: string;

  constructor(prefix = 'partyplay:') {
    this.prefix = prefix;
  }

  public get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  public set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[StorageService] Failed to save key "${key}":`, err);
    }
  }

  public remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (err) {
      console.warn(`[StorageService] Failed to remove key "${key}":`, err);
    }
  }

  public namespace(subPrefix: string): StorageService {
    return new StorageService(this.prefix + subPrefix + ':');
  }
}
