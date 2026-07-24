# PartyPlay Audio Bible

PartyPlay uses a **100% asset-less procedural synth architecture**. All sound effects, feedback tones, and round jingles are synthesized in real-time via the Web Audio API without downloading `.mp3` or `.wav` files.

---

## 1. Web Audio Synth Architecture (`AudioService`)

```typescript
// src/services/audio/AudioService.ts
export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;

  private initContext(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public playTone(freq: number, type: OscillatorType, duration: number, volume = 0.2): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}
```

---

## 2. Waveform & Frequency Specifications

Different sound events map to specific oscillator waveforms to maintain semantic clarity:

| Sound Category | Oscillator Waveform | Frequency Range | Envelope Duration | Usage Example |
|----------------|---------------------|-----------------|-------------------|---------------|
| **Movement Tick** | `sine` | 300Hz – 500Hz | 0.04s (40ms) | Stepping, turning snake, moving left/right |
| **Pickup / Eat** | `triangle` | 550Hz – 880Hz | 0.10s (100ms) | Eating an apple, collecting power-ups |
| **Player Collision** | `sawtooth` | 180Hz – 250Hz | 0.15s (150ms) | Player-to-player bump |
| **Elimination / Hit** | `sawtooth` | 80Hz – 150Hz | 0.30s (300ms) | Hitting an obstacle, wall crash |
| **Victory Chime** | `square` | Arpeggio (523Hz → 659Hz → 784Hz) | 0.40s (400ms) | Round end, match win |
| **UI Focus Change** | `sine` | 440Hz | 0.03s (30ms) | D-pad navigation between buttons |
| **UI Select** | `triangle` | 660Hz | 0.08s (80ms) | Pressing a pixel button |

---

## 3. Player Auditory Identification System

To provide instant acoustic feedback on "which player did what", base frequencies are scaled by `playerId`:

$$\text{freq}_{\text{player}} = \text{freq}_{\text{base}} + (\text{playerId} - 1) \times 40\text{Hz}$$

- **Player 1**: Base pitch (e.g., 350Hz)
- **Player 2**: Base + 40Hz (390Hz)
- **Player 3**: Base + 80Hz (430Hz)
- **Player 4**: Base + 120Hz (470Hz)

---

## 4. Master Volume & Settings Store Binding

The `AudioService` is tightly integrated with `settingsStore`:

```typescript
useSettingsStore.subscribe((state) => {
  audioService.setMasterVolume(state.masterVolume);
  audioService.setMuted(state.isMuted);
});
```

Modifying master volume or clicking MUTE in `<Settings />` instantly modulation gain nodes without stopping running sound loops.
