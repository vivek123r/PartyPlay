export interface InputDevice {
  id: string;
  type: 'keyboard' | 'gamepad' | 'touch';
  poll(): Map<string, boolean>;
  enable(): void;
  disable(): void;
}

export interface PlayerInput {
  readonly playerId: number;
  isActive(action: string): boolean;
  isJustPressed(action: string): boolean;
  isJustReleased(action: string): boolean;
}

export interface PlayerBindingConfig {
  playerId: number;
  deviceId: string;
  bindings: Record<string, string[]>; // action -> raw key codes
}
