import type { WeaponId } from '../types';
import { useSettings } from '../state/settings';

/**
 * Efeitos sonoros sintetizados com WebAudio: sem ficheiros, sem downloads,
 * latência mínima. Tem de ser inicializado dentro de um gesto do utilizador.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    const seconds = 1;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  private get now() {
    return this.ctx?.currentTime ?? 0;
  }

  private noise(duration: number, gain: number, freq: number, type: BiquadFilterType = 'lowpass', q = 1) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.now);
    g.gain.exponentialRampToValueAtTime(0.0001, this.now + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(this.now);
    src.stop(this.now + duration);
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    freqEnd = freq,
    delay = 0,
  ) {
    if (!this.ctx || !this.master) return;
    const t0 = this.now + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  shoot(weapon: WeaponId) {
    switch (weapon) {
      case 'pistol':
        this.noise(0.12, 0.7, 1800, 'lowpass');
        this.tone(220, 0.08, 'square', 0.25, 60);
        break;
      case 'rifle':
        this.noise(0.09, 0.55, 2600, 'bandpass', 0.7);
        this.tone(180, 0.06, 'sawtooth', 0.22, 70);
        break;
      case 'shotgun':
        this.noise(0.28, 0.95, 900, 'lowpass');
        this.tone(120, 0.18, 'square', 0.35, 40);
        break;
      case 'sniper':
        this.noise(0.35, 0.9, 1400, 'lowpass');
        this.tone(300, 0.25, 'sawtooth', 0.3, 50);
        break;
    }
  }

  empty() {
    this.tone(1200, 0.04, 'square', 0.12, 900);
  }

  hit() {
    this.tone(880, 0.07, 'triangle', 0.3, 1100);
  }

  kill() {
    this.tone(660, 0.08, 'triangle', 0.35, 990);
    this.tone(990, 0.12, 'triangle', 0.3, 1320, 0.06);
  }

  bonus() {
    [880, 1100, 1320, 1760].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.3, f, i * 0.05));
  }

  bomb() {
    this.noise(0.5, 1, 400, 'lowpass');
    this.tone(200, 0.5, 'sawtooth', 0.4, 40);
  }

  escape() {
    // explosão: estrondo grave + descida
    this.tone(90, 0.42, 'sawtooth', 0.5, 40);
    this.tone(260, 0.22, 'square', 0.22, 120);
  }

  reload(duration: number) {
    this.tone(700, 0.03, 'square', 0.15, 500);
    this.tone(900, 0.03, 'square', 0.15, 600, Math.min(0.35, duration * 0.4));
    this.tone(1100, 0.04, 'square', 0.18, 1400, Math.max(0.1, duration - 0.08));
  }

  waveStart() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.3, f, i * 0.09));
  }

  waveComplete() {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.3, f, i * 0.1));
  }

  gameOver() {
    [440, 392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.25, f * 0.9, i * 0.22));
  }

  click() {
    this.tone(1500, 0.03, 'square', 0.1, 1200);
  }

  /** cápsula apanhada: arpejo rápido ascendente */
  pickup() {
    [660, 880, 1320, 1760].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.3, f * 1.02, i * 0.045));
    this.noise(0.12, 0.2, 3000, 'highpass');
  }

  /** o chefe dispara contra o jogador */
  bossAttack() {
    this.tone(140, 0.35, 'sawtooth', 0.45, 60);
    this.noise(0.3, 0.7, 700, 'lowpass');
    this.tone(55, 0.5, 'sine', 0.5, 35, 0.05);
  }

  /** o chefe leva um tiro */
  bossHit() {
    this.tone(330, 0.1, 'square', 0.25, 220);
    this.noise(0.08, 0.3, 1200, 'bandpass', 1.5);
  }

  /** o chefe cai */
  bossDown() {
    this.noise(0.9, 1, 500, 'lowpass');
    this.tone(160, 0.7, 'sawtooth', 0.45, 30);
    [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.32, f, 0.35 + i * 0.09));
  }

  /** alerta: o chefe vai atacar */
  bossWarn() {
    this.tone(1100, 0.06, 'square', 0.12, 1100);
    this.tone(1100, 0.06, 'square', 0.12, 1100, 0.1);
  }
}

export const sfx = new Sfx();

export function vibrate(pattern: number | number[]) {
  if (!useSettings.getState().vibration) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sem suporte */
  }
}
