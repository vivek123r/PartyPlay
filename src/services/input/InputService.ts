import type { InputDevice, PlayerInput, PlayerBindingConfig } from './types';

export class InputService {
  private devices = new Map<string, InputDevice>();
  private bindings = new Map<number, PlayerBindingConfig>();

  private currentActionStates = new Map<number, Map<string, boolean>>();
  private previousActionStates = new Map<number, Map<string, boolean>>();

  public registerDevice(device: InputDevice): void {
    this.devices.set(device.id, device);
    device.enable();
  }

  public bindPlayer(config: PlayerBindingConfig): void {
    this.bindings.set(config.playerId, config);
  }

  public clearBindings(): void {
    this.bindings.clear();
    this.currentActionStates.clear();
    this.previousActionStates.clear();
  }

  public tick(): void {
    // Snapshot previous frame
    this.previousActionStates = new Map(
      Array.from(this.currentActionStates.entries()).map(([p, map]) => [p, new Map(map)])
    );

    // Poll devices and map to player actions
    for (const [playerId, config] of this.bindings.entries()) {
      const device = this.devices.get(config.deviceId);
      if (!device) continue;

      const rawState = device.poll();
      const actionMap = new Map<string, boolean>();

      for (const [action, keys] of Object.entries(config.bindings)) {
        const isPressed = keys.some((key) => rawState.get(key) === true);
        actionMap.set(action, isPressed);
      }


      this.currentActionStates.set(playerId, actionMap);
    }
  }

  public getPlayer(playerId: number): PlayerInput {
    const currentMap = this.currentActionStates.get(playerId);
    const previousMap = this.previousActionStates.get(playerId);

    return {
      playerId,
      isActive: (action: string) => currentMap?.get(action) ?? false,
      isJustPressed: (action: string) =>
        (currentMap?.get(action) ?? false) && !(previousMap?.get(action) ?? false),
      isJustReleased: (action: string) =>
        !(currentMap?.get(action) ?? false) && (previousMap?.get(action) ?? false),
    };
  }

  public destroy(): void {
    this.devices.forEach((d) => d.disable());
    this.devices.clear();
    this.clearBindings();
  }
}
