// The synthesised fallbacks of the v4 sound channel (docs/v4/2.3.md section 20): when an effect file is missing, fx()
// plays one of these on the channel's own effects bus, so a fallback follows the same rules as a file (it fades out
// when Elizabeth starts and ducks under a story line). The recipes are copies of shared/audio.js's EFFECTS, which
// keeps them private; shared/audio.js and v3 stay unchanged. tick, pop and chime keep playing through audio.sfx().
import type { Sfx } from './index';

const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(ctx: BaseAudioContext): AudioBuffer {
  let b = noises.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noises.set(ctx, b);
  }
  return b;
}

function tone(ctx: BaseAudioContext, out: AudioNode, type: OscillatorType, f0: number, f1: number, t0: number,
  dur: number, peak: number, attack = 0.01): OscillatorNode {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
  return o;
}

function hiss(ctx: BaseAudioContext, out: AudioNode, type: BiquadFilterType, f0: number, f1: number, q: number,
  t0: number, dur: number, peak: number): void {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.05, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f);
  f.connect(g);
  g.connect(out);
  s.start(t0, Math.random() * 0.5);
  s.stop(t0 + dur + 0.05);
}

type Recipe = (ctx: BaseAudioContext, o: AudioNode, t: number) => number;

const RECIPES: Record<Sfx, Recipe> = {
  pop: (c, o, t) => (tone(c, o, 'sine', 700, 180, t, 0.12, 0.35, 0.004), 0.15),
  chime: (c, o, t) => {
    tone(c, o, 'sine', 1046.5, 0, t, 1.2, 0.22, 0.005);
    tone(c, o, 'sine', 1568, 0, t + 0.002, 0.9, 0.1, 0.005);
    tone(c, o, 'sine', 2093, 0, t + 0.004, 0.6, 0.05, 0.005);
    return 1.2;
  },
  sparkle: (c, o, t) => {
    const notes = [2093, 2637, 3136, 2349, 3520, 2794];
    notes.forEach((f, i) => tone(c, o, 'sine', f, 0, t + i * 0.055, 0.35, 0.08, 0.004));
    return 0.65;
  },
  whoosh: (c, o, t) => (hiss(c, o, 'bandpass', 300, 2400, 1.2, t, 0.55, 0.35), 0.6),
  'soft-no': (c, o, t) => {
    tone(c, o, 'triangle', 392, 0, t, 0.22, 0.14, 0.02);
    tone(c, o, 'triangle', 330, 0, t + 0.2, 0.32, 0.14, 0.02);
    return 0.55;
  },
  fanfare: (c, o, t) => {
    const n = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < 3; i++) tone(c, o, 'triangle', n[i], 0, t + i * 0.13, 0.25, 0.16, 0.01);
    tone(c, o, 'triangle', n[3], 0, t + 0.39, 0.8, 0.18, 0.01);
    tone(c, o, 'sine', n[3] * 2, 0, t + 0.39, 0.6, 0.05, 0.01);
    return 1.2;
  },
  splash: (c, o, t) => {
    hiss(c, o, 'lowpass', 3000, 300, 0.7, t, 0.5, 0.3);
    for (let i = 0; i < 4; i++) tone(c, o, 'sine', 500 + Math.random() * 500, 1200, t + 0.12 + i * 0.07, 0.08, 0.06, 0.003);
    return 0.6;
  },
  munch: (c, o, t) => {
    for (let i = 0; i < 3; i++) hiss(c, o, 'lowpass', 900, 300, 0.8, t + i * 0.16, 0.09, 0.4);
    return 0.5;
  },
  tick: (c, o, t) => (tone(c, o, 'sine', 1600, 1200, t, 0.04, 0.12, 0.002), 0.06),
  magic: (c, o, t) => {
    const osc = tone(c, o, 'sine', 400, 1600, t, 0.9, 0.12, 0.05);
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 9;
    depth.gain.value = 18;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + 1);
    RECIPES.sparkle(c, o, t + 0.5);
    return 1.2;
  },
  hatch: (c, o, t) => {
    hiss(c, o, 'highpass', 2500, 1800, 0.7, t, 0.05, 0.35);
    hiss(c, o, 'highpass', 2200, 1600, 0.7, t + 0.12, 0.06, 0.35);
    tone(c, o, 'sine', 600, 200, t + 0.3, 0.12, 0.3, 0.004);
    RECIPES.sparkle(c, o, t + 0.4);
    return 1.05;
  },
};

/** Play a synthesised effect into `out` at time `t`; returns its length in seconds. */
export function playSynth(ctx: BaseAudioContext, out: AudioNode, name: Sfx, t: number): number {
  return RECIPES[name](ctx, out, t);
}
