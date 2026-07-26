interface EngineVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

const NOTE_SMOOTH_TIME = 0.05;

export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMutedState = false;
  private masterVolume = 0.8;
  private sfxVolume = 1.0;
  private musicVolume = 0.6;

  private noiseBuffer: AudioBuffer | null = null;
  private sampleBuffers = new Map<string, AudioBuffer>();
  private sampleLoads = new Map<string, Promise<AudioBuffer | null>>();

  private engineVoices = new Map<number, EngineVoice>();

  private musicPlaying = false;
  private musicBpm = 128;
  private musicStep = 0;
  private musicNextNoteTime = 0;
  private musicTimerId: ReturnType<typeof setTimeout> | null = null;
  private musicDensity = 1;
  private readonly musicLookaheadMs = 25;
  private readonly musicScheduleAheadSec = 0.1;
  // Am - F - C - G, 4 beats/bar, 4-bar loop = 64 sixteenths
  private readonly musicBassFreqs = [110, 87.31, 65.41, 98.0];
  private readonly musicChordTones: number[][] = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [130.81, 164.81, 196.0],
    [196.0, 246.94, 293.66],
  ];
  // Syncopated 8th-note bassline (was flat quarters) — driving rather than plodding
  private readonly musicBassSteps = [0, 3, 6, 8, 11, 14];
  // A-minor pentatonic (A4-C5-D5-E5-G5-A5) — sits over all four chords without clashing, and
  // stays well above the engine drone's ~55-245Hz range and the alarm-prone 500-2000Hz band.
  private readonly musicLeadScale = [440, 523.25, 587.33, 659.25, 783.99, 880];
  // A real melodic phrase WITH rests — the old arp cycled 3 tones on every single 16th note
  // with no rest at all, which read as a warning tone rather than a hook.
  private readonly musicLeadPattern: (number | null)[] = [0, null, 2, null, 3, 2, null, 0, null, 4, null, 3, null, 2, 1, null];

  public async init(): Promise<void> {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    // sfx/music are fixed relative mix levels, set once here — NOT in updateGains(), which
    // runs every time the user touches the settings volume slider/mute toggle. Previously
    // updateGains() reset musicGain unconditionally on every call, which would stomp an
    // in-progress stopMusic() fade back to full volume the instant a setting changed.
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);

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

  public async suspendContext(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') {
      await this.ctx.suspend();
    }
  }

  public async resumeContext(): Promise<void> {
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
    if (!this.masterGain) return;
    const targetMaster = this.isMutedState ? 0 : this.masterVolume;
    this.masterGain.gain.setValueAtTime(targetMaster, this.ctx?.currentTime ?? 0);
  }

  /** Synthesizes simple audio tones when audio files are not provided.
   * `pan` (-1 left .. +1 right) is optional — omit for centred/mono, which is what every
   * existing call site does; only new per-player sounds need to pass it. */
  public playTone(
    freq: number,
    type: OscillatorType = 'sine',
    duration = 0.15,
    channel: 'sfx' | 'music' = 'sfx',
    volume = 0.2,
    pan = 0
  ): void {
    const output = channel === 'music' ? this.musicGain : this.sfxGain;
    if (!this.ctx || !output || this.isMutedState) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(0.001, Math.min(1, volume)), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      let last: AudioNode = osc;
      let panner: StereoPannerNode | null = null;
      if (pan !== 0) {
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
        last.connect(panner);
        last = panner;
      }
      last.connect(gain);
      gain.connect(output);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
      osc.onended = () => {
        osc.disconnect();
        panner?.disconnect();
        gain.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /** Plays a bundled one-shot sample through the SFX bus. Samples are decoded once and cached. */
  public playSample(url: string, volume = 0.65, pan = 0): void {
    if (!this.ctx || !this.sfxGain || this.isMutedState) return;
    void this.loadSample(url).then((buffer) => {
      if (!buffer || !this.ctx || !this.sfxGain || this.isMutedState) return;
      try {
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(Math.max(0.001, Math.min(1, volume)), this.ctx.currentTime);
        let last: AudioNode = source;
        let panner: StereoPannerNode | null = null;
        if (pan !== 0) {
          panner = this.ctx.createStereoPanner();
          panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
          last.connect(panner);
          last = panner;
        }
        last.connect(gain);
        gain.connect(this.sfxGain);
        source.start();
        source.onended = () => { source.disconnect(); panner?.disconnect(); gain.disconnect(); };
      } catch {
        // Ignore decoding/playback errors; callers retain their synthesized fallback.
      }
    });
  }

  /** Warms one-shot samples so the first combat input never waits for fetch/decode. */
  public preloadSamples(urls: readonly string[]): void {
    if (!this.ctx) return;
    for (const url of urls) void this.loadSample(url);
  }

  private loadSample(url: string): Promise<AudioBuffer | null> {
    const cached = this.sampleBuffers.get(url);
    if (cached) return Promise.resolve(cached);
    const loading = this.sampleLoads.get(url);
    if (loading) return loading;
    if (!this.ctx) return Promise.resolve(null);
    const request = fetch(url)
      .then((response) => response.ok ? response.arrayBuffer() : null)
      .then((data) => data ? this.ctx?.decodeAudioData(data) ?? null : null)
      .then((buffer) => { if (buffer) this.sampleBuffers.set(url, buffer); return buffer; })
      .catch(() => null)
      .finally(() => this.sampleLoads.delete(url));
    this.sampleLoads.set(url, request);
    return request;
  }

  /** Multi-note one-shot sequence (victory chime, upgrade jingle) */
  public playArpeggio(freqs: number[], noteDuration: number, type: OscillatorType = 'square', gain = 0.2): void {
    if (!this.ctx || this.isMutedState) return;
    const now = this.ctx.currentTime;
    freqs.forEach((freq, i) => {
      this.scheduleTone(freq, type, noteDuration * 1.1, gain, now + i * noteDuration);
    });
  }

  /** One-shot pitch-swept tone (nitro whoosh, pickup rise, elimination stinger). `pan` (-1..+1)
   * is optional, for spreading simultaneous per-player sounds — e.g. two players activating
   * nitro in the same frame previously played the identical sweep twice with no separation
   * at all, which summed into what sounded like a single event; pass a per-player pan (and
   * ideally a slightly different startFreq/endFreq too) to keep them audibly distinct. */
  public playSweep(opts: { type?: OscillatorType; startFreq: number; endFreq: number; duration: number; gain?: number; pan?: number }): void {
    if (!this.ctx || !this.sfxGain || this.isMutedState) return;
    const { type = 'sawtooth', startFreq, endFreq, duration, gain = 0.25, pan = 0 } = opts;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, startFreq), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      let last: AudioNode = osc;
      let panner: StereoPannerNode | null = null;
      if (pan !== 0) {
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
        last.connect(panner);
        last = panner;
      }
      last.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + duration);
      osc.onended = () => {
        osc.disconnect();
        panner?.disconnect();
        g.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /** Noise-based one-shot (skid, gravel, crash crunch, drum hits) */
  public playNoiseBurst(opts: {
    duration: number;
    filterType?: BiquadFilterType;
    filterFreq?: number;
    filterFreqEnd?: number;
    gain?: number;
    q?: number;
  }): void {
    if (!this.ctx || !this.sfxGain || this.isMutedState) return;
    const buffer = this.ensureNoiseBuffer();
    if (!buffer) return;
    const { duration, filterType = 'lowpass', filterFreq = 1200, filterFreqEnd, gain = 0.3, q = 1 } = opts;
    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = false;

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.Q.value = q;
      filter.frequency.setValueAtTime(filterFreq, now);
      if (filterFreqEnd !== undefined) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(1, filterFreqEnd), now + duration);
      }

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      src.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      src.start(now);
      src.stop(now + duration);
      src.onended = () => {
        src.disconnect();
        filter.disconnect();
        g.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
  }

  // ---- continuous per-player engine drone ----

  public startEngineVoice(voiceId: number, pan = 0): void {
    if (!this.ctx || !this.sfxGain) return;
    if (this.engineVoices.has(voiceId)) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, now);
      osc2.frequency.setValueAtTime(55, now);
      osc2.detune.setValueAtTime(6, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);

      this.engineVoices.set(voiceId, { osc1, osc2, filter, gain, panner });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  public updateEngineVoice(voiceId: number, params: { freq: number; gain: number; detune?: number; filterFreq?: number }): void {
    const voice = this.engineVoices.get(voiceId);
    if (!voice || !this.ctx) return;
    const now = this.ctx.currentTime;
    const detune = params.detune ?? 6;
    voice.osc1.frequency.setTargetAtTime(Math.max(1, params.freq), now, NOTE_SMOOTH_TIME);
    voice.osc2.frequency.setTargetAtTime(Math.max(1, params.freq), now, NOTE_SMOOTH_TIME);
    voice.osc2.detune.setTargetAtTime(detune, now, NOTE_SMOOTH_TIME);
    voice.filter.frequency.setTargetAtTime(Math.max(10, params.filterFreq ?? 800), now, NOTE_SMOOTH_TIME);
    voice.gain.gain.setTargetAtTime(Math.max(0, params.gain), now, NOTE_SMOOTH_TIME);
  }

  public stopEngineVoice(voiceId: number, fadeOutSec = 0.25): void {
    const voice = this.engineVoices.get(voiceId);
    if (!voice || !this.ctx) {
      this.engineVoices.delete(voiceId);
      return;
    }
    const now = this.ctx.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.01, fadeOutSec / 4));
      voice.osc1.stop(now + fadeOutSec + 0.1);
      voice.osc2.stop(now + fadeOutSec + 0.1);
      voice.osc1.onended = () => {
        voice.osc1.disconnect();
        voice.osc2.disconnect();
        voice.filter.disconnect();
        voice.gain.disconnect();
        voice.panner.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
    this.engineVoices.delete(voiceId);
  }

  public stopAllEngineVoices(fadeOutSec = 0.25): void {
    for (const voiceId of Array.from(this.engineVoices.keys())) {
      this.stopEngineVoice(voiceId, fadeOutSec);
    }
  }

  // ---- looping background music ----

  public startMusic(density = 1): void {
    if (!this.ctx || this.musicPlaying) return;
    this.ensureNoiseBuffer();
    // Always restore the music bus gain here rather than relying on a timer left over from a
    // previous stopMusic() fade — a race started again before that fade finished used to skip
    // the restore entirely and leave music silent for the rest of the session.
    this.musicGain?.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain?.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    this.musicPlaying = true;
    this.musicDensity = density;
    this.musicStep = 0;
    this.musicNextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduleMusic();
  }

  public isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  public stopMusic(fadeOutSec = 0.6): void {
    this.musicPlaying = false;
    if (this.musicTimerId !== null) {
      clearTimeout(this.musicTimerId);
      this.musicTimerId = null;
    }
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(0.0001, now, Math.max(0.01, fadeOutSec / 4));
    }
  }

  public stopAllLoops(): void {
    this.stopAllEngineVoices(0);
    this.stopMusic(0);
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.musicPlaying) return;
    while (this.musicNextNoteTime < this.ctx.currentTime + this.musicScheduleAheadSec) {
      this.scheduleMusicStep(this.musicStep, this.musicNextNoteTime);
      this.musicNextNoteTime += 60 / this.musicBpm / 4; // one 16th note
      this.musicStep = (this.musicStep + 1) % 64; // 4 bars * 16 steps
    }
    this.musicTimerId = setTimeout(() => this.scheduleMusic(), this.musicLookaheadMs);
  }

  private scheduleMusicStep(step: number, time: number): void {
    const bar = Math.floor(step / 16) % 4;
    const stepInBar = step % 16;

    // Bass — syncopated 8ths (was flat quarters), short plucked notes so they don't smear
    if (this.musicBassSteps.includes(stepInBar)) {
      this.scheduleTone(this.musicBassFreqs[bar], 'triangle', 0.16, 0.2, time, this.musicGain ?? undefined);
    }

    // Lead hook — a real melodic phrase with rests, kept up near 500-900Hz and above so it
    // doesn't collide with the engine drone (~55-245Hz) or read as a warning tone
    const degree = this.musicLeadPattern[stepInBar];
    if (degree !== null) {
      this.scheduleTone(this.musicLeadScale[degree], 'square', 0.13, 0.045, time, this.musicGain ?? undefined, 3200);
    }

    // Chord stab — the current bar's full chord, short and filtered, on the offbeat for lift
    if (stepInBar === 6 || stepInBar === 14) {
      for (const freq of this.musicChordTones[bar]) {
        this.scheduleTone(freq, 'triangle', 0.2, 0.035, time, this.musicGain ?? undefined, 1400);
      }
    }

    // Drums — four-on-the-floor kick + backbeat snare + offbeat hats, gated on the EXACT
    // 16th step. The previous version gated on `beatInBar = Math.floor(stepInBar/4)`, which
    // is constant across 4 consecutive steps — so every drum fired on 4 steps in a row, then
    // went silent, in a repeating machine-gun burst (~17 hits/sec): the reported "alarm/siren".
    // This fires once per beat/backbeat/offbeat as intended, ~10 hits per 1.875s bar.
    if (stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12) {
      this.scheduleKick(time);
    }
    if (stepInBar === 4 || stepInBar === 12) {
      this.scheduleSnare(time);
    }
    if (stepInBar % 4 === 2) {
      this.scheduleHat(time);
    }
    if (this.musicDensity > 0.75 && stepInBar === 15) {
      this.scheduleHat(time); // a little pickup fill into the next bar
    }
  }

  private scheduleTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    gain: number,
    when: number,
    destination?: AudioNode,
    lowpassFreq?: number
  ): void {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, when);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + duration);

      let last: AudioNode = osc;
      let filter: BiquadFilterNode | null = null;
      if (lowpassFreq) {
        filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lowpassFreq, when);
        last.connect(filter);
        last = filter;
      }
      last.connect(g);
      g.connect(destination ?? this.sfxGain ?? this.ctx.destination);

      osc.start(when);
      osc.stop(when + duration + 0.02);
      osc.onended = () => {
        osc.disconnect();
        filter?.disconnect();
        g.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
  }

  private scheduleKick(time: number): void {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      g.gain.setValueAtTime(0.3, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.2);
      osc.onended = () => {
        osc.disconnect();
        g.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
  }

  private scheduleSnare(time: number): void {
    const buffer = this.ensureNoiseBuffer();
    if (!buffer || !this.ctx || !this.musicGain) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, time);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      src.start(time);
      src.stop(time + 0.16);
      src.onended = () => {
        src.disconnect();
        filter.disconnect();
        g.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
  }

  private scheduleHat(time: number): void {
    const buffer = this.ensureNoiseBuffer();
    if (!buffer || !this.ctx || !this.musicGain) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.08, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      src.start(time);
      src.stop(time + 0.04);
      src.onended = () => {
        src.disconnect();
        filter.disconnect();
        g.disconnect();
      };
    } catch {
      // Ignore audio synthesis errors
    }
  }

  private ensureNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;
    const seconds = 2;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }
}
