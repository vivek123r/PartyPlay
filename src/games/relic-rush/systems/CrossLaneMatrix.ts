export type CrossActionType =
  | 'extend_bridge'
  | 'drop_boulder'
  | 'toggle_door'
  | 'trigger_flame'
  | 'close_exit';

export interface CrossLaneEvent {
  sourcePlayerId: number;
  sourceLaneIndex: number;
  targetLaneIndex: number | 'all';
  actionType: CrossActionType;
  duration?: number;
  message?: string;
  data?: any;
}

export type CrossLaneListener = (event: CrossLaneEvent) => void;

export class CrossLaneMatrix {
  private listeners: CrossLaneListener[] = [];
  public totalCrossEventsTriggered = 0;

  public subscribe(listener: CrossLaneListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public emit(event: CrossLaneEvent): void {
    this.totalCrossEventsTriggered++;
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[CrossLaneMatrix] Error handling cross-lane trigger event:', err);
      }
    });
  }

  public clear(): void {
    this.listeners = [];
    this.totalCrossEventsTriggered = 0;
  }
}
