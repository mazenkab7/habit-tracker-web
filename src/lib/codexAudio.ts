/**
 * Codex Ritualis Procedural Web Audio Engine
 * Zero external MP3 assets. Zero latency. Pure Web Audio API synthesis.
 */

class CodexAudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = false;
  private lastTypeSoundTime: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.soundEnabled = localStorage.getItem("codex_sound_enabled") === "true";
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("codex_sound_enabled", enabled ? "true" : "false");
    }
    if (enabled) {
      this.initCtx();
    }
  }

  public toggle(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    if (next) {
      this.playWaxSeal();
    }
    return next;
  }

  /**
   * Soft pen-on-paper scratch or mechanical typewriter key sound
   */
  public playPenScratch() {
    this.playTypingSound("pen");
  }

  public playTypingSound(variant: "pen" | "typewriter" | "handwriting" = "pen") {
    if (!this.soundEnabled) return;
    const now = performance.now();
    if (now - this.lastTypeSoundTime < 60) return; // throttle typing audio
    this.lastTypeSoundTime = now;

    this.initCtx();
    if (!this.ctx) return;

    try {
      if (variant === "typewriter") {
        // Crisp mechanical click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1400 + Math.random() * 300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.025);

        gain.gain.setValueAtTime(0.045, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
      } else {
        // Organic pen nib / parchment scritch
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2600 + (Math.random() * 600 - 300), this.ctx.currentTime);
        filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.032);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
      }
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Resonant low-frequency wax seal press or codex stamp thud
   */
  public playWaxSeal() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.22);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      // Low thump noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(240, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Crisp parchment paper rustle when flipping entries or opening book
   */
  public playPageTurn() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const dur = 0.24;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.linearRampToValueAtTime(1700, now + dur * 0.5);
      filter.frequency.linearRampToValueAtTime(450, now + dur);
      filter.Q.setValueAtTime(1.8, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.09, now + dur * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Harmonic amber chime when etching entry
   */
  public playEtchRitual() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    this.playWaxSeal();
    try {
      const now = this.ctx.currentTime + 0.05;
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.035, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.55);
      });
    } catch {
      // Ignore audio failure
    }
  }
}

export const codexAudio = new CodexAudioEngine();
