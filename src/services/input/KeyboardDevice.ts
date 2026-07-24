import type { InputDevice } from './types';

export class KeyboardDevice implements InputDevice {
  public readonly id = 'keyboard-main';
  public readonly type = 'keyboard';
  private heldKeys = new Set<string>();
  private active = false;

  public enable(): void {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public disable(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.heldKeys.clear();
  }

  public poll(): Map<string, boolean> {
    const map = new Map<string, boolean>();
    this.heldKeys.forEach((key) => map.set(key, true));
    return map;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Prevent standard browser scrolling keys during game play
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
    this.heldKeys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };
}
