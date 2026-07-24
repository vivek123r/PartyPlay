export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMutedState = false;
  private masterVolume = 0.8;
  private sfxVolume = 1.0;
  private musicVolume = 0.6;

  private soundBuffers = new Map<string, AudioBuffer>();

  public async init(): Promise<void> {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.updateGains();
  }

  public async unlockAutoplay(): Promise<void> {
    if (!this.ctx) await this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateGains();
  }

  public setMuted(muted: boolean): void {
    this.isMutedState = muted;
    this.updateGains();
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  private updateGains(): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;
    const targetMaster = this.isMutedState ? 0 : this.masterVolume;
    this.masterGain.gain.setValueAtTime(targetMaster, this.ctx?.currentTime ?? 0);
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx?.currentTime ?? 0);
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx?.currentTime ?? 0);
  }

  /** Synthesizes simple audio tones for SFX when audio files are not provided */
  public playTone(freq: number, type: OscillatorType = 'sine', duration = 0.15): void {
    if (!this.ctx || !this.sfxGain || this.isMutedState) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio synthesis errors
    }
  }
}
