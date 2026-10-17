import { SaveManager } from './SaveManager';

export type SfxName =
  | 'shoot' | 'bounce' | 'hit' | 'pop' | 'combo' | 'powerup' | 'fall' | 'win'
  | 'lose' | 'click' | 'crack' | 'warning' | 'star' | 'freeze' | 'explode';

interface PlayOpts {
  /** Pitch step (e.g. pop index within a chain). */
  index?: number;
}

const NOTE = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
const MIN_GAP_MS: Partial<Record<SfxName, number>> = { pop: 28, fall: 40, bounce: 60, crack: 50 };

/**
 * Procedural audio via WebAudio (no files needed). Music and sound effects can be
 * toggled independently. Every call is safe if audio is unavailable.
 */
class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private last = new Map<SfxName, number>();
  private failed = false;

  /** Must be called from a user gesture (first pointer/key event). */
  unlock(): void {
    if (this.failed) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) {
          this.failed = true;
          return;
        }
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.5;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.8;
        this.sfxGain.connect(this.master);
        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.applySettings();
    } catch {
      this.failed = true;
    }
  }

  applySettings(): void {
    const s = SaveManager.settings;
    if (s.music) this.startMusic();
    else this.stopMusic();
  }

  private get soundOn(): boolean {
    return !!this.ctx && SaveManager.settings.sound;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0, out: GainNode | null = this.sfxGain): void {
    const ctx = this.ctx;
    if (!ctx || !out) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq = 1200, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf || !this.sfxGain) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name: SfxName, opts: PlayOpts = {}): void {
    if (!this.soundOn) return;
    const now = performance.now();
    const gap = MIN_GAP_MS[name];
    if (gap && now - (this.last.get(name) ?? 0) < gap) return;
    this.last.set(name, now);
    try {
      const i = opts.index ?? 0;
      switch (name) {
        case 'shoot': this.tone(380, 0.13, 'sine', 0.3, 900); break;
        case 'bounce': this.tone(520, 0.07, 'square', 0.08, 380); break;
        case 'hit': this.tone(180, 0.1, 'sine', 0.35, 90); this.noise(0.05, 0.12, 900); break;
        case 'pop': this.tone(NOTE(72 + Math.min(i, 9) * 2), 0.14, 'sine', 0.28, NOTE(84 + Math.min(i, 9) * 2)); this.noise(0.04, 0.08, 2600); break;
        case 'combo': [76, 79, 83, 88].forEach((n, k) => this.tone(NOTE(n + Math.min(i, 5)), 0.16, 'triangle', 0.22, undefined, k * 0.07)); break;
        case 'powerup': this.tone(300, 0.35, 'sawtooth', 0.14, 1500); this.tone(450, 0.35, 'sine', 0.2, 2200); break;
        case 'fall': this.tone(620, 0.35, 'sine', 0.16, 140); break;
        case 'win': [72, 76, 79, 84, 88].forEach((n, k) => this.tone(NOTE(n), 0.3, 'triangle', 0.26, undefined, k * 0.11)); break;
        case 'lose': [67, 64, 60, 55].forEach((n, k) => this.tone(NOTE(n), 0.34, 'triangle', 0.26, undefined, k * 0.18)); break;
        case 'click': this.tone(900, 0.05, 'square', 0.1, 600); break;
        case 'crack': this.noise(0.1, 0.25, 3200); this.tone(1400, 0.06, 'square', 0.07, 700); break;
        case 'warning': this.tone(220, 0.16, 'sawtooth', 0.14, 180); this.tone(220, 0.16, 'sawtooth', 0.14, 180, 0.22); break;
        case 'star': this.tone(NOTE(84 + i * 3), 0.3, 'sine', 0.3, NOTE(90 + i * 3)); break;
        case 'freeze': this.tone(1800, 0.45, 'sine', 0.18, 500); this.noise(0.3, 0.1, 6000); break;
        case 'explode': this.noise(0.45, 0.45, 300); this.tone(120, 0.4, 'sine', 0.45, 40); break;
      }
    } catch {
      /* ignore audio errors */
    }
  }

  // ---- music: a gentle generated loop (C - Am - F - G) ----
  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null || !SaveManager.settings.music) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 120);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const stepDur = 60 / 104 / 2; // eighth notes at 104 BPM
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    while (this.nextNoteTime < ctx.currentTime + 0.35) {
      const bar = Math.floor(this.step / 8) % chords.length;
      const chord = chords[bar];
      const inBar = this.step % 8;
      const delay = Math.max(0, this.nextNoteTime - ctx.currentTime);
      const arp = chord[[0, 1, 2, 1, 2, 1, 0, 1][inBar] % 3] + 12;
      this.tone(NOTE(arp), stepDur * 1.6, 'triangle', 0.07, undefined, delay, this.musicGain);
      if (inBar === 0 || inBar === 4) this.tone(NOTE(chord[0] - 12), stepDur * 3.5, 'sine', 0.12, undefined, delay, this.musicGain);
      if (inBar === 0) this.tone(NOTE(chord[2] + 12), stepDur * 6, 'sine', 0.03, undefined, delay, this.musicGain);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }
}

export const AudioManager = new AudioManagerImpl();
