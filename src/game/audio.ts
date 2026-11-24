import { GamePhase, LanguageCode, MusicZone } from './types';

const VOICE_LANG_MAP: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  uk: 'uk-UA',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  pt: 'pt-PT',
  zh: 'zh-CN',
  ar: 'ar-SA',
  ja: 'ja-JP',
  pl: 'pl-PL',
  it: 'it-IT',
  vi: 'vi-VN',
  fa: 'fa-IR',
};

class SlavicAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = false;
  private sfxVolume = 0.78;
  private musicVolume = 0.55;
  private musicZone: MusicZone = 'title';
  private phase: GamePhase = 'title';
  private musicTimer: number | null = null;
  private stepIdx = 0;
  private lastVoiceMs = 0;
  private lastVoiceCue = '';

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    if (m && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore in sandboxed browsers
      }
    }
    this.syncVolumes();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.syncVolumes();
  }

  public setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    this.syncVolumes();
  }

  public setMusicContext(zone: MusicZone, phase: GamePhase): void {
    this.musicZone = zone;
    this.phase = phase;
  }

  public startMusicLoop(): void {
    if (typeof window === 'undefined' || this.musicTimer !== null) return;
    this.musicTimer = window.setInterval(() => {
      this.tickMusicStep();
    }, 340);
  }

  public stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private syncVolumes(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfxVolume, now, 0.04);
    }
    if (this.musicGain) {
      const pauseScale = this.phase === 'paused' ? 0.25 : 1;
      this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.musicVolume * 0.42 * pauseScale, now, 0.12);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.syncVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.syncVolumes();
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    vol: number,
    dest: AudioNode,
    cutoff = 1400,
    attack = 0.02,
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(vol, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private playDrumHit(pitch: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.22);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  private tickMusicStep(): void {
    if (this.muted || !this.ctx || !this.musicGain) return;
    if (this.ctx.state !== 'running') return;

    const s = this.stepIdx++;
    const zone = this.musicZone;

    // Modal Slavic scales in Hz (D Dorian / Aeolian / Phrygian / F Lydian)
    if (zone === 'title' || zone === 'sanctuary') {
      const gusli = [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 329.63, 293.66];
      const bass = [73.42, 73.42, 87.31, 65.41];
      if (s % 2 === 0) {
        const note = gusli[(s / 2) % gusli.length];
        this.playTone(note, 0.9, 'triangle', 0.16, this.musicGain, 1500, 0.015);
      }
      if (s % 8 === 0) {
        const root = bass[Math.floor(s / 8) % bass.length];
        this.playTone(root, 2.6, 'sawtooth', 0.12, this.musicGain, 260, 0.28);
      }
      if (s % 16 === 6) {
        this.playTone(587.33, 1.3, 'sine', 0.09, this.musicGain, 1100, 0.18);
      }
    } else if (zone === 'river') {
      const waterChime = [329.63, 392.0, 493.88, 587.33, 659.25, 587.33, 493.88, 392.0];
      if (s % 2 === 0) {
        const note = waterChime[(s / 2 + (s % 3)) % waterChime.length];
        this.playTone(note, 1.15, 'sine', 0.13, this.musicGain, 1800, 0.03);
      }
      if (s % 8 === 0) {
        this.playTone(98.0, 2.4, 'triangle', 0.1, this.musicGain, 320, 0.25);
      }
    } else if (zone === 'cursed_woods') {
      const eerie = [146.83, 155.56, 220.0, 233.08, 196.0, 155.56];
      if (s % 8 === 0) {
        this.playTone(55.0, 2.7, 'sawtooth', 0.16, this.musicGain, 190, 0.4);
      }
      if (s % 3 === 0) {
        const n = eerie[Math.floor(s / 3) % eerie.length];
        this.playTone(n, 1.35, 'triangle', 0.11, this.musicGain, 640, 0.22);
      }
    } else if (zone === 'combat') {
      const ostinato = [146.83, 146.83, 174.61, 220.0, 146.83, 164.81, 196.0, 130.81];
      const n = ostinato[s % ostinato.length];
      this.playTone(n, 0.34, 'sawtooth', 0.13, this.musicGain, 820, 0.01);
      if (s % 2 === 0) this.playDrumHit(s % 4 === 0 ? 105 : 78, s % 4 === 0 ? 0.26 : 0.17);
      if (s % 8 === 0) {
        this.playTone(73.42, 1.4, 'sawtooth', 0.16, this.musicGain, 280, 0.08);
      }
      if (s % 16 === 12) {
        this.playTone(293.66, 0.8, 'sawtooth', 0.11, this.musicGain, 950, 0.06);
      }
    } else if (zone === 'victory') {
      const fanfare = [293.66, 369.99, 440.0, 587.33];
      if (s % 2 === 0) {
        this.playTone(fanfare[(s / 2) % fanfare.length], 1.1, 'triangle', 0.15, this.musicGain, 1700, 0.04);
      }
    } else if (zone === 'defeat') {
      if (s % 6 === 0) {
        this.playTone(s % 12 === 0 ? 110.0 : 98.0, 2.0, 'sawtooth', 0.13, this.musicGain, 240, 0.3);
      }
    }
  }

  public unlockAndStartMusic(): void {
    this.ensureContext();
    this.startMusicLoop();
  }

  public playMenuHover(): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted || !this.sfxGain) return;
    this.playTone(540, 0.065, 'triangle', 0.032, this.sfxGain, 1600, 0.004);
  }

  public playMenuClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.09);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playHeroSalute(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    this.playHit(true);
    this.playTone(293.66, 0.55, 'triangle', 0.12, this.sfxGain, 1800, 0.02);
    window.setTimeout(() => {
      if (this.sfxGain) {
        this.playTone(440.0, 0.72, 'triangle', 0.11, this.sfxGain, 2100, 0.02);
      }
    }, 90);
  }

  public playWarHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    this.startMusicLoop();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(146.8, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(98, now + 1.15);

    osc2.frequency.setValueAtTime(55, now);
    osc2.frequency.exponentialRampToValueAtTime(73.4, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(760, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(240, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 1.3);
    osc2.stop(now + 1.3);
  }

  public playBossTelegraph(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(235, now + 0.45);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playBossPhaseRoar(phase: 2 | 3): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'sine';
    const startFreq = phase === 3 ? 118 : 96;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 1.25);

    sub.frequency.setValueAtTime(startFreq * 0.55, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 1.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(phase === 3 ? 920 : 640, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 1.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(phase === 3 ? 0.24 : 0.19, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 1.4);
    sub.stop(now + 1.4);

    if (phase === 3) {
      this.playThunderClap();
    }
  }

  public playVictoryFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const notes = [293.66, 369.99, 440.0, 587.33];
    notes.forEach((n, idx) => {
      window.setTimeout(() => {
        if (this.sfxGain) {
          this.playTone(n, 0.9, 'triangle', 0.13, this.sfxGain, 2200, 0.03);
        }
      }, idx * 140);
    });
  }

  public playDefeatToll(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    this.playTone(110, 1.4, 'sawtooth', 0.14, this.sfxGain, 320, 0.06);
    window.setTimeout(() => {
      if (this.sfxGain) {
        this.playTone(82.41, 1.7, 'sawtooth', 0.15, this.sfxGain, 240, 0.08);
      }
    }, 320);
  }

  public playEventVoice(cueKey: string, text: string, lang: LanguageCode): void {
    if (this.muted || !text || typeof window === 'undefined') return;
    const now = Date.now();
    if (cueKey === this.lastVoiceCue && now - this.lastVoiceMs < 4000) return;
    if (now - this.lastVoiceMs < 2400) return;
    this.lastVoiceMs = now;
    this.lastVoiceCue = cueKey;

    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      return;
    }
    try {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = VOICE_LANG_MAP[lang] ?? 'en-US';
      utter.rate = 0.95;
      utter.pitch = 0.88;
      utter.volume = Math.max(0.2, Math.min(1, this.sfxVolume * 0.9));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {
      // Headless or speech-blocked browser: ignore safely
    }
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playHit(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const pitchJitter = 0.92 + Math.random() * 0.16;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime((heavy ? 185 : 260) * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + (heavy ? 0.19 : 0.1));

    gain.gain.setValueAtTime(heavy ? 0.16 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.21 : 0.11));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playThunderClap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.55);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  public playChime(high = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const base = high ? 523.25 : 329.63;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.25, now + 0.18);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playArrow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620 + Math.random() * 90, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.08);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playOrderAck(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playFrostNova(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.42);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public playWolfHowl(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.65);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  public playBuildComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    this.playChime(true);
    this.playHit(false);
  }

  public playUpgradeComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    this.playChime(true);
    window.setTimeout(() => this.playChime(true), 110);
  }

  public playRelicPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    this.playChime(false);
    window.setTimeout(() => this.playChime(true), 80);
  }
}

export const audioEngine = new SlavicAudioEngine();
