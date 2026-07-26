import type { AudioService } from '@services/audio/AudioService';

export class AudioSynthesizer {
  private audio: AudioService;
  private bgmStep = 0;
  private isBgmPlaying = false;
  private bgmTimer: ReturnType<typeof setTimeout> | null = null;
  private sfxTimers: Set<ReturnType<typeof setTimeout>> = new Set();

  // C Major Pentatonic frequency scale for ambient background music
  private readonly bgmNotes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

  constructor(audio: AudioService) {
    this.audio = audio;
  }

  private safeTimeout(fn: () => void, delay: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.sfxTimers.delete(timer);
      fn();
    }, delay);
    this.sfxTimers.add(timer);
    return timer;
  }

  /**
   * Earthy thud simulating shovel tilling soil.
   */
  public playTill(): void {
    this.audio.playTone(130, 'sawtooth', 0.1, 'sfx', 0.25);
  }

  /**
   * Water splashing pitch sweep.
   */
  public playWater(): void {
    this.audio.playTone(350, 'sine', 0.14, 'sfx', 0.2);
    this.safeTimeout(() => this.audio.playTone(550, 'sine', 0.1, 'sfx', 0.15), 50);
  }

  /**
   * Gentle rustling seed placement chime.
   */
  public playPlant(): void {
    this.audio.playTone(440, 'triangle', 0.08, 'sfx', 0.18);
    this.safeTimeout(() => this.audio.playTone(554, 'triangle', 0.08, 'sfx', 0.18), 60);
  }

  /**
   * Ascending arpeggio rewarding crop harvest.
   */
  public playHarvest(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      if (idx === 0) {
        this.audio.playTone(freq, 'sine', 0.08, 'sfx', 0.25);
      } else {
        this.safeTimeout(() => this.audio.playTone(freq, 'sine', 0.08, 'sfx', 0.25), idx * 60);
      }
    });
  }

  public playWateringSound(): void { this.playWater(); }
  public playBuildSound(): void { this.playWorkshop(); }
  public playChimeSound(): void { this.playLevelUp(); }
  public playHarvestSound(): void { this.playHarvest(); }

  /**
   * Bleating goat vocalization synth tone.
   */
  public playAnimalGoat(): void {
    this.audio.playTone(220, 'triangle', 0.25, 'sfx', 0.22);
  }

  /**
   * Low buzzing insect flight vibration.
   */
  public playAnimalBee(): void {
    this.audio.playTone(140, 'sawtooth', 0.2, 'sfx', 0.15);
  }

  /**
   * High-pitched chocobo bird chirp.
   */
  public playAnimalChocobo(): void {
    this.audio.playTone(880, 'sine', 0.08, 'sfx', 0.2);
    this.safeTimeout(() => this.audio.playTone(1174, 'sine', 0.1, 'sfx', 0.2), 50);
  }

  /**
   * Soft moth wing flutter tone.
   */
  public playAnimalMoth(): void {
    this.audio.playTone(500, 'triangle', 0.15, 'sfx', 0.12);
  }

  /**
   * Workshop gear activation sound.
   */
  public playWorkshop(): void {
    this.audio.playTone(300, 'square', 0.05, 'sfx', 0.2);
    this.safeTimeout(() => this.audio.playTone(450, 'square', 0.05, 'sfx', 0.2), 50);
  }

  /**
   * Bright cash register coin payout chime.
   */
  public playCoins(): void {
    this.audio.playTone(987, 'sine', 0.08, 'sfx', 0.3);
    this.safeTimeout(() => this.audio.playTone(1318, 'sine', 0.12, 'sfx', 0.35), 70);
  }

  /**
   * Grand level up fanfare ascension.
   */
  public playLevelUp(): void {
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((freq, idx) => {
      if (idx === 0) {
        this.audio.playTone(freq, 'triangle', 0.1, 'sfx', 0.35);
      } else {
        this.safeTimeout(() => this.audio.playTone(freq, 'triangle', 0.1, 'sfx', 0.35), idx * 70);
      }
    });
  }

  /**
   * Low buzz indicating error or invalid move.
   */
  public playError(): void {
    this.audio.playTone(180, 'sawtooth', 0.22, 'sfx', 0.25);
  }

  /**
   * Starts ambient background music pentatonic loop.
   */
  public startAmbientBGM(): void {
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.scheduleNextBgmNote();
  }

  /**
   * Stops ambient background music loop.
   */
  public stopAmbientBGM(): void {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleNextBgmNote(): void {
    if (!this.isBgmPlaying) return;
    const note = this.bgmNotes[this.bgmStep % this.bgmNotes.length];
    this.audio.playTone(note, 'sine', 0.35, 'music', 0.1);
    this.bgmStep = (this.bgmStep + 1) % 16;
    this.bgmTimer = setTimeout(() => this.scheduleNextBgmNote(), 500);
  }

  /**
   * Cleans up BGM and all scheduled SFX timeouts.
   */
  public destroy(): void {
    this.stopAmbientBGM();
    for (const timer of this.sfxTimers) {
      clearTimeout(timer);
    }
    this.sfxTimers.clear();
  }
}
