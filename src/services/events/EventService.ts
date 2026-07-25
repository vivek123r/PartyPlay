export type PlatformEventMap = {
  // Platform & Service Lifecycle
  'asset:loaded': { assetId: string; progress: number };
  'game:loaded': { gameId: string };
  'game:started': { gameId: string; seed: number };
  'game:destroyed': { gameId: string };
  'settings:changed': { key: string; value: any };
  'audio:mute': { isMuted: boolean };
  'audio:volumeChanged': { channel: 'master' | 'sfx' | 'music'; volume: number };
  'input:deviceConnected': { deviceId: string; type: string };
  'input:deviceDisconnected': { deviceId: string };

  // Gameplay Events
  'round:start': { seed: number; playerIds: number[] };
  'player:eliminated': { playerId: number; rank: number; position: { x: number; y: number } };
  'game:over': { winnerId: number; isTeamLoss?: boolean; isTeamVictory?: boolean; standings: { playerId: number; score: number }[] };
  'game:pause': void;
  'game:resume': void;
  'game:crash': { error: Error; gameId: string };
};

export class EventService {
  private listeners = new Map<string, Set<(data: any) => void>>();

  public on<K extends keyof PlatformEventMap>(
    event: K,
    handler: (data: PlatformEventMap[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  public emit<K extends keyof PlatformEventMap>(event: K, data: PlatformEventMap[K]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventService] Error in listener for event "${String(event)}":`, err);
      }
    });
  }

  public clear(): void {
    this.listeners.clear();
  }
}
