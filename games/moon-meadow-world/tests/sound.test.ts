// The v4 sound channel (docs/v4/2.3.md sections 20 and 22.4, sound lane), tested on the real `audio` API of
// src/audio/index.ts with a fake shared player and a fake Web Audio graph: what reaches the speakers is the product of
// the gains on the way to the destination, so the tests check the rules (who may sound when, and how loud) and not
// how the channel is built. The generator (tools/audio/gen-sfx.py) runs in python3 with a fake HTTP layer.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AMBIENCE_FILE, SFX_FILES, loopWindow } from '../src/audio/sound';
import { BELL_DECAY_S, SLOW_TO, TUNE_BPM, tunePlan } from '../src/audio/tune';

vi.mock('@emma/audio-player', () => ({}));

const GAME = join(import.meta.dirname, '..');
const SFX_JSON = JSON.parse(readFileSync(join(GAME, 'tools/audio/sfx.json'), 'utf8')) as {
  probe: string;
  effects: Array<{ id: string; seconds: number; core?: boolean; text: string }>;
  loops: Array<{ id: string; seconds: number; text: string }>;
  later: Array<{ id: string }>;
};

// ---- a fake Web Audio graph ----------------------------------------------------------------------------------------

type Ev = { k: 'set' | 'lin' | 'exp'; v: number; t: number };

class FParam {
  events: Ev[] = [];
  private base: number;
  constructor(v: number) {
    this.base = v;
  }
  get value(): number {
    return this.base;
  }
  set value(v: number) {
    this.base = v;
  }
  private add(e: Ev): this {
    this.events.push(e);
    this.events.sort((a, b) => a.t - b.t);
    return this;
  }
  setValueAtTime(v: number, t: number) {
    return this.add({ k: 'set', v, t });
  }
  linearRampToValueAtTime(v: number, t: number) {
    return this.add({ k: 'lin', v, t });
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    return this.add({ k: 'exp', v, t });
  }
  cancelScheduledValues(t: number) {
    this.events = this.events.filter((e) => e.t < t);
    return this;
  }
  /** The value at time t, by the Web Audio rules: a ramp runs from the event before it. */
  at(t: number): number {
    let v = this.base;
    let t0 = 0;
    for (const e of this.events) {
      if (e.t <= t) {
        v = e.v;
        t0 = e.t;
        continue;
      }
      if (e.k === 'lin') return v + ((e.v - v) * (t - t0)) / (e.t - t0);
      if (e.k === 'exp') return v * (e.v / v) ** ((t - t0) / (e.t - t0));
      return v;
    }
    return v;
  }
}

class FNode {
  outs: FNode[] = [];
  connect(n: FNode): FNode {
    this.outs.push(n);
    return n;
  }
  disconnect(): void {
    this.outs = [];
  }
}
class FGain extends FNode {
  gain = new FParam(1);
}
interface FBuffer {
  id: string;
  duration: number;
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  getChannelData(): Float32Array;
}
class FSource extends FNode {
  buffer: FBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  startAt: number | null = null;
  offset = 0;
  stopAt: number | null = null;
  onended: (() => void) | null = null;
  start(t = 0, offset = 0) {
    this.startAt = t;
    this.offset = offset;
  }
  stop(t = 0) {
    this.stopAt = t;
  }
}
class FOsc extends FNode {
  type = 'sine';
  frequency = new FParam(440);
  startAt: number | null = null;
  stopAt: number | null = null;
  start(t = 0) {
    this.startAt = t;
  }
  stop(t = 0) {
    this.stopAt = t;
  }
}
class FFilter extends FNode {
  type = 'lowpass';
  Q = new FParam(1);
  frequency = new FParam(350);
}

function fakeBuffer(id: string, duration: number): FBuffer {
  const length = Math.round(duration * 44100);
  return { id, duration, length, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => new Float32Array(length) };
}

class FCtx {
  currentTime = 0;
  state = 'running';
  sampleRate = 44100;
  destination = new FNode();
  sources: FSource[] = [];
  oscs: FOsc[] = [];
  createGain() {
    return new FGain();
  }
  createBufferSource() {
    const s = new FSource();
    this.sources.push(s);
    return s;
  }
  createOscillator() {
    const o = new FOsc();
    this.oscs.push(o);
    return o;
  }
  createBiquadFilter() {
    return new FFilter();
  }
  createBuffer(_ch: number, length: number, sr: number) {
    return fakeBuffer('noise', length / sr);
  }
  /** The fake files hold their id and length as JSON. */
  decodeAudioData(data: ArrayBuffer, ok?: (b: FBuffer) => void): Promise<FBuffer> {
    const { id, duration } = JSON.parse(new TextDecoder().decode(data)) as { id: string; duration: number };
    const b = fakeBuffer(id, duration);
    ok?.(b);
    return Promise.resolve(b);
  }
  /** How loud a node reaches the speakers at time t: the gains on every path to the destination, multiplied. */
  level(n: FNode, t = this.currentTime): number {
    if (n === this.destination) return 1;
    const own = n instanceof FGain ? n.gain.at(t) : 1;
    return own * n.outs.reduce((sum, o) => sum + this.level(o, t), 0);
  }
  source(id: string): FSource | undefined {
    return this.sources.filter((s) => s.buffer?.id === id).at(-1);
  }
}

// ---- a fake shared player (shared/audio.js) ------------------------------------------------------------------------

/** One pending call of the fake player; end() lets it finish. */
interface Pending {
  what: string;
  end(): void;
}

function fakePlayer(ctx: FCtx | null) {
  const pending: Pending[] = [];
  const open = (what: string) =>
    new Promise<void>((resolve) => {
      const p: Pending = {
        what,
        end: () => {
          const i = pending.indexOf(p);
          if (i >= 0) pending.splice(i, 1);
          resolve();
        },
      };
      pending.push(p);
    });
  // A hold in the fake is a sustained one: neither stop() nor other speech resolves its done, only its own stop().
  const endAll = () => [...pending].filter((p) => !p.what.startsWith('hold-')).forEach((p) => p.end());
  return {
    pending,
    context: ctx,
    muted: false,
    missing: [] as string[],
    get speaking() {
      return pending.length > 0;
    },
    init() {},
    addPack: async () => null,
    unlock: async () => undefined,
    preload: async () => [],
    preloadSounds: async () => [],
    say(id: string) {
      endAll(); // a say without queue cuts the speech that plays, as the shared player does
      return open(id);
    },
    sayAll(ids: string[]) {
      endAll();
      return open(ids.join(','));
    },
    sound: (g: string) => open('snd-' + g),
    hold(g: string) {
      const done = open('hold-' + g);
      return { stop: () => pending.find((p) => p.what === 'hold-' + g)?.end(), done };
    },
    sfx: vi.fn(async () => undefined),
    stop: endAll,
    mute: () => false,
    has: async () => true,
    onMissing: () => () => undefined,
    /** Let the pending call whose name starts with `what` finish. */
    finish(what: string) {
      pending.find((p) => p.what.startsWith(what))?.end();
    },
  };
}

type Manifest = Record<string, { seconds: number; loop?: boolean; loopStart?: number; loopEnd?: number; approved: boolean }>;

const MANIFEST: Manifest = {
  'bead-clink': { seconds: 0.6, approved: true },
  'bedtime-bell': { seconds: 2.0, approved: true },
  'egg-crack': { seconds: 1.5, approved: true },
  'crown-twinkle': { seconds: 1.2, approved: true },
  owl: { seconds: 1.5, approved: false },
  'amb-day': { seconds: 30.04, loop: true, loopStart: 7.5, loopEnd: 22.5, approved: true },
};

function fakeFetch(manifest: Manifest, failing: Record<string, number> = {}) {
  const clips = Object.fromEntries(Object.entries(manifest).map(([id, e]) => [id, { file: id + '.mp3', loop: false, ...e }]));
  const fetched: string[] = [];
  const left = { ...failing };
  const fn = async (url: string) => {
    fetched.push(url);
    if ((left[url] ?? 0) > 0) {
      left[url]--;
      throw new TypeError('Load failed');
    }
    if (url === 'audio/sfx/manifest.json') return { ok: true, json: async () => ({ clips }), arrayBuffer: async () => new ArrayBuffer(0) };
    const id = /audio\/sfx\/(.+)\.mp3$/.exec(url)?.[1];
    const e = id ? manifest[id] : undefined;
    if (!id || !e) return { ok: false, json: async () => null, arrayBuffer: async () => new ArrayBuffer(0) };
    const bytes = new TextEncoder().encode(JSON.stringify({ id, duration: e.seconds }));
    return { ok: true, json: async () => null, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
  };
  return Object.assign(fn, { fetched });
}

/** The real `audio` of src/audio/index.ts on a fresh fake player and graph. */
async function load(o: { search?: string; manifest?: Manifest; noContext?: boolean; failing?: Record<string, number> } = {}) {
  vi.resetModules();
  const ctx = o.noContext ? null : new FCtx();
  const A = fakePlayer(ctx);
  const net = fakeFetch(o.manifest ?? MANIFEST, o.failing);
  vi.stubGlobal('window', { EmmaAudio: A });
  vi.stubGlobal('location', { pathname: '/games/moon-meadow-world/', search: o.search ?? '' });
  vi.stubGlobal('fetch', net);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const { audio } = await import('../src/audio/index');
  audio.setup();
  return { audio, ctx: ctx as FCtx, A, net };
}

/** Run the clock: the audio context's time and the timers move together. */
async function tick(ctx: FCtx | null, ms: number, step = 10): Promise<void> {
  for (let t = 0; t < ms; t += step) {
    const d = Math.min(step, ms - t);
    if (ctx && ctx.state === 'running') ctx.currentTime += d / 1000;
    await vi.advanceTimersByTimeAsync(d);
  }
}

function watch(p: Promise<unknown>): () => boolean {
  let done = false;
  void p.then(() => (done = true));
  return () => done;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('effects and who speaks', () => {
  it('plays an approved effect at 0.8 when nobody speaks', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    void audio.fx('bead-clink');
    expect(ctx.level(ctx.source('bead-clink')!)).toBeCloseTo(0.8);
  });

  it('skips an effect while Elizabeth speaks and while a letter sound plays, and resolves at once', async () => {
    const { audio, ctx, A } = await load();
    await audio.preloadFx();
    void audio.say('fb-yes');
    const skipped = watch(audio.fx('bead-clink'));
    await tick(ctx, 0);
    expect(skipped()).toBe(true);
    expect(ctx.source('bead-clink')).toBeUndefined();
    A.finish('fb-yes');
    await tick(ctx, 0);

    void audio.sound('a');
    void audio.fx('bead-clink', { fallback: 'pop' });
    expect(ctx.source('bead-clink')).toBeUndefined();
    expect(ctx.oscs).toHaveLength(0);
    A.finish('snd-a');
    await tick(ctx, 0);

    const held = audio.hold('ee');
    void audio.fx('bead-clink');
    expect(ctx.source('bead-clink')).toBeUndefined();
    held.stop();
    await tick(ctx, 0);
    void audio.fx('bead-clink');
    expect(ctx.source('bead-clink')).toBeDefined();
  });

  it('counts a run of clips with any line of Elizabeth as hers, and only Lumi and the foals as story lines', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    void audio.sayAll(['lumi4-corner', 'g4-heart']);
    void audio.fx('egg-crack', { duck: true });
    expect(ctx.source('egg-crack')).toBeUndefined();
    void audio.sayAll(['lumi4-corner', 'foal-pretty']);
    await tick(ctx, 0);
    void audio.fx('egg-crack', { duck: true });
    expect(ctx.source('egg-crack')).toBeDefined();
  });

  it('under a story line plays an effect only with duck, at 0.3, and comes back 400 ms after the line', async () => {
    const { audio, ctx, A } = await load();
    await audio.preloadFx();
    void audio.say('lumi4-corner');
    const skipped = watch(audio.fx('crown-twinkle'));
    await tick(ctx, 0);
    expect(skipped()).toBe(true);
    expect(ctx.source('crown-twinkle')).toBeUndefined();

    void audio.fx('egg-crack', { duck: true });
    const crack = ctx.source('egg-crack')!;
    await tick(ctx, 70);
    expect(ctx.level(crack)).toBeCloseTo(0.3);
    A.finish('lumi4-corner');
    await tick(ctx, 350);
    expect(ctx.level(crack)).toBeCloseTo(0.3);
    await tick(ctx, 300);
    expect(ctx.level(crack)).toBeCloseTo(0.8);
  });

  it('fades out an effect that still sounds when Elizabeth starts, within 60 ms', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    void audio.fx('bedtime-bell');
    const bell = ctx.source('bedtime-bell')!;
    await tick(ctx, 500);
    expect(ctx.level(bell)).toBeCloseTo(0.8);
    const t = ctx.currentTime;
    void audio.say('g4-heart');
    expect(ctx.level(bell, t + 0.061)).toBeCloseTo(0, 5);
    expect(bell.stopAt).not.toBeNull();
    expect(bell.stopAt!).toBeLessThanOrEqual(t + 0.08);
  });

  it('plays an effect asked right after Elizabeth\'s line at 0.8 from its start', async () => {
    const { audio, ctx, A } = await load();
    await audio.preloadFx();
    void audio.say('g4-pattern');
    await tick(ctx, 500);
    A.finish('g4-pattern');
    await tick(ctx, 150);
    void audio.fx('bead-clink');
    const clink = ctx.source('bead-clink')!;
    for (const dt of [0, 0.1, 0.2, 0.3, 0.5]) expect(ctx.level(clink, ctx.currentTime + dt)).toBeCloseTo(0.8);
  });

  it('starts no effect on a suspended clock, where it would play whenever the context wakes', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    ctx.state = 'suspended';
    const fx = watch(audio.fx('bead-clink', { fallback: 'pop' }));
    const pop = watch(audio.sfx('pop'));
    await tick(ctx, 0);
    expect([fx(), pop()]).toEqual([true, true]);
    expect(ctx.source('bead-clink')).toBeUndefined();
    expect(ctx.oscs).toHaveLength(0);
  });

  it('a held letter sound stops counting as Elizabeth when audio.stop() or the next letter sound cuts it', async () => {
    const { audio, ctx, A } = await load();
    await audio.preloadFx();
    audio.hold('ee'); // sustained: the shared player resolves its done only when its stop() is called
    await tick(ctx, 10);
    expect(audio.soundState().speaker).toBe('elizabeth');
    audio.stop();
    await tick(ctx, 10);
    expect(audio.soundState().speaker).toBeNull();
    void audio.fx('bead-clink');
    expect(ctx.source('bead-clink')).toBeDefined();

    audio.hold('ee');
    void audio.sound('s');
    await tick(ctx, 10);
    expect(audio.soundState().speaker).toBe('elizabeth');
    A.finish('snd-s');
    await tick(ctx, 10);
    expect(audio.soundState().speaker).toBeNull();

    const one = audio.hold('ee');
    audio.hold('oo');
    one.stop();
    await tick(ctx, 10);
    expect(audio.soundState().speaker).toBe('elizabeth'); // the second hold still sounds
  });

  it('fx() resolves at the end of the effect and never later than 1 s after it started', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    const short = watch(audio.fx('bead-clink'));
    const long = watch(audio.fx('bedtime-bell'));
    await tick(ctx, 590);
    expect(short()).toBe(false);
    await tick(ctx, 20);
    expect(short()).toBe(true);
    await tick(ctx, 380);
    expect(long()).toBe(false);
    await tick(ctx, 20);
    expect(long()).toBe(true);
  });

  it('a missing file plays its fallback by the same rules, or nothing, and never throws or waits', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    const silent = watch(audio.fx('nicker-1'));
    await tick(ctx, 0);
    expect(silent()).toBe(true);
    expect(ctx.oscs).toHaveLength(0);

    const crack = watch(audio.fx('splash-1', { fallback: 'hatch' }));
    expect(ctx.oscs.length).toBeGreaterThan(0);
    const env = ctx.oscs[0].outs[0];
    await tick(ctx, 100);
    // A synthesised sound is as loud as it was through shared/audio.js: 0.8 on the bus, 1.25 on its own.
    expect(ctx.level(env.outs[0])).toBeCloseTo(1);
    void audio.say('fb-yes');
    expect(ctx.level(env.outs[0], ctx.currentTime + 0.061)).toBeCloseTo(0, 5);
    await tick(ctx, 1000);
    expect(crack()).toBe(true);
  });

  it('plays the synthesised sounds of audio.sfx() on the channel, never over or under Elizabeth', async () => {
    const { audio, ctx, A } = await load();
    const out = () => ctx.oscs.at(-1)!.outs[0].outs[0];
    void audio.sfx('chime');
    expect(ctx.oscs.length).toBeGreaterThan(0);
    await tick(ctx, 20);
    expect(ctx.level(out())).toBeCloseTo(1); // as loud as through shared/audio.js
    expect(A.sfx).not.toHaveBeenCalled();
    // A chime and then a name in the same tick (naming.ts): the chime fades out as she starts.
    void audio.sayAll(['word-green']);
    expect(ctx.level(out(), ctx.currentTime + 0.061)).toBeCloseTo(0, 5);
    // While she speaks, and while a letter sound plays, it is skipped.
    const n = ctx.oscs.length;
    const skipped = watch(audio.sfx('pop'));
    await tick(ctx, 0);
    expect(skipped()).toBe(true);
    A.finish('word-green');
    void audio.sound('m');
    void audio.sfx('tick');
    expect(ctx.oscs).toHaveLength(n);
    A.finish('snd-m');
    await tick(ctx, 100);
    // Under a story line it plays ducked.
    void audio.say('lumi4-soon');
    void audio.sfx('pop');
    expect(ctx.oscs.length).toBeGreaterThan(n);
    await tick(ctx, 70);
    expect(ctx.level(out())).toBeCloseTo(0.3 / 0.8);
  });

  it('tries a failed manifest again on a later effect, 10 s after it failed', async () => {
    const { audio, ctx, net } = await load({ failing: { 'audio/sfx/manifest.json': 1 } });
    await audio.preloadFx();
    void audio.fx('bead-clink');
    expect(ctx.source('bead-clink')).toBeUndefined();
    expect(net.fetched.filter((u) => u.endsWith('manifest.json'))).toHaveLength(1);
    await tick(ctx, 10_000, 100);
    void audio.fx('bead-clink');
    await tick(ctx, 100);
    void audio.fx('bead-clink');
    expect(ctx.source('bead-clink')).toBeDefined();
  });

  it('tries a failed file again on a later effect, and the day loop when it is asked for, at most 3 times', async () => {
    const { audio, ctx, net } = await load({ failing: { 'audio/sfx/bead-clink.mp3': 1, 'audio/sfx/amb-day.mp3': 5 } });
    await audio.preloadFx();
    void audio.fx('bead-clink');
    await tick(ctx, 100);
    void audio.fx('bead-clink');
    expect(ctx.source('bead-clink')).toBeUndefined(); // not again within 10 s
    await tick(ctx, 10_000, 100);
    void audio.fx('bead-clink');
    await tick(ctx, 100);
    void audio.fx('bead-clink');
    expect(ctx.source('bead-clink')).toBeDefined();

    for (let i = 0; i < 4; i++) {
      audio.ambience('day');
      await tick(ctx, 10_100, 100);
      audio.ambience(null);
    }
    expect(net.fetched.filter((u) => u.endsWith('amb-day.mp3'))).toHaveLength(3);
    expect(ctx.source('amb-day')).toBeUndefined();
  });

  it('plays a made file Tjitse has not approved yet, unless ?sfx=approved', async () => {
    const game = await load({ search: '?seed=3' });
    await game.audio.preloadFx();
    void game.audio.fx('owl');
    expect(game.ctx.source('owl')).toBeDefined();
    expect(game.net.fetched).toContain('audio/sfx/owl.mp3');

    const listening = await load({ search: '?seed=3&sfx=all' });
    await listening.audio.preloadFx();
    void listening.audio.fx('owl');
    expect(listening.ctx.source('owl')).toBeDefined();

    const approvedOnly = await load({ search: '?seed=3&sfx=approved' });
    await approvedOnly.audio.preloadFx();
    void approvedOnly.audio.fx('owl');
    expect(approvedOnly.ctx.source('owl')).toBeUndefined();
    expect(approvedOnly.net.fetched).not.toContain('audio/sfx/owl.mp3');
    void approvedOnly.audio.fx('bedtime-bell');
    expect(approvedOnly.ctx.source('bedtime-bell')).toBeDefined();
  });

  it('audio.stop() stops the effects', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    void audio.fx('bedtime-bell');
    const bell = ctx.source('bedtime-bell')!;
    await tick(ctx, 100);
    audio.stop();
    expect(ctx.level(bell, ctx.currentTime + 0.031)).toBeCloseTo(0, 5);
  });

  it('respects the shared mute', async () => {
    const { audio, ctx, A } = await load();
    await audio.preloadFx();
    audio.ambience('day');
    await tick(ctx, 2100);
    const day = ctx.source('amb-day')!;
    A.muted = true;
    const skipped = watch(audio.fx('bead-clink'));
    await tick(ctx, 60);
    expect(skipped()).toBe(true);
    expect(ctx.source('bead-clink')).toBeUndefined();
    expect(ctx.level(day)).toBeCloseTo(0, 5);
  });

  it('without an audio context nothing throws and nothing waits', async () => {
    const { audio } = await load({ noContext: true });
    await audio.preloadFx();
    audio.ambience('day');
    audio.checked(true);
    const fx = watch(audio.fx('egg-crack', { fallback: 'hatch' }));
    const box = audio.musicBox(500);
    await tick(null, 0);
    expect(fx()).toBe(true);
    const done = watch(box.done);
    await tick(null, 500);
    expect(done()).toBe(true);
  });
});

describe('the music box', () => {
  /** The level after a note's envelope: the box's own fade, its bus and the master. */
  const route = (ctx: FCtx, t?: number) => {
    const tri = ctx.oscs.filter((o) => o.type === 'triangle').at(-1)!;
    return ctx.level(tri.outs[0].outs[0], t);
  };

  it('plays at 0.6, goes to 0.1 under any speech and comes back after it', async () => {
    const { audio, ctx, A } = await load();
    audio.musicBox(20_000);
    await tick(ctx, 2500);
    expect(route(ctx)).toBeCloseTo(0.6);
    void audio.say('word-green');
    await tick(ctx, 100);
    expect(route(ctx)).toBeCloseTo(0.1);
    A.finish('word-green');
    void audio.say('lumi4-corner');
    await tick(ctx, 100);
    expect(route(ctx)).toBeCloseTo(0.1);
    A.finish('lumi4-corner');
    await tick(ctx, 1000);
    expect(route(ctx)).toBeCloseTo(0.6);
  });

  it('plays on through audio.stop(); only its own stop() ends it', async () => {
    const { audio, ctx } = await load();
    const box = audio.musicBox(20_000);
    await tick(ctx, 2500);
    audio.stop();
    const before = ctx.oscs.length;
    await tick(ctx, 3000, 50);
    expect(ctx.oscs.length).toBeGreaterThan(before);
    expect(route(ctx)).toBeCloseTo(0.6);
    box.stop();
    await tick(ctx, 400, 50);
    const after = ctx.oscs.length;
    expect(route(ctx)).toBeCloseTo(0, 5);
    await tick(ctx, 3000, 50);
    expect(ctx.oscs.length).toBe(after);
  });

  it('done resolves at ms by its timer, also while the audio context is suspended', async () => {
    const { audio, ctx } = await load();
    ctx.state = 'suspended';
    const done = watch(audio.musicBox(45_000).done);
    await tick(ctx, 44_900, 100);
    expect(done()).toBe(false);
    await tick(ctx, 100);
    expect(done()).toBe(true);
  });

  it('leaves nothing to play when a suspended context wakes after the box', async () => {
    const { audio, ctx } = await load();
    ctx.state = 'suspended';
    const box = audio.musicBox(5000);
    const done = watch(box.done);
    await tick(ctx, 6000, 100);
    expect(done()).toBe(true);
    ctx.state = 'running';
    await tick(ctx, 3000, 100);
    expect(ctx.oscs).toHaveLength(0);
  });

  it('stays in step with its timer after the context was suspended, so it still ends at ms', async () => {
    const { audio, ctx } = await load();
    const ms = 20_000;
    const done = watch(audio.musicBox(ms).done);
    await tick(ctx, 5000, 50);
    ctx.state = 'suspended';
    await tick(ctx, 5000, 50);
    ctx.state = 'running';
    await tick(ctx, 10_000, 50);
    expect(done()).toBe(true);
    // The audio clock lags the wall clock by the 5 s it stood still; the last note still rings out at ms.
    const last = Math.max(...ctx.oscs.map((o) => o.startAt!));
    expect(last + BELL_DECAY_S).toBeCloseTo(ms / 1000 - 5 + 0.05, 1);
    const n = ctx.oscs.length;
    await tick(ctx, 2000, 100);
    expect(ctx.oscs).toHaveLength(n);
  });

  it('a box of no length is silent, done at once and leaves no timer behind; a longer one than 10 minutes is cut', async () => {
    const { audio, ctx } = await load();
    const timers = vi.getTimerCount();
    const done = watch(audio.musicBox(Number.NaN).done);
    await tick(ctx, 10);
    expect(done()).toBe(true);
    expect(ctx.oscs).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(timers);
    expect(tunePlan(Number.NaN)).toEqual([]);
    expect(tunePlan(-5)).toEqual([]);
    const plan = tunePlan(Number.POSITIVE_INFINITY);
    expect(plan.at(-1)!.t + BELL_DECAY_S).toBeCloseTo(600, 6);
  });

  it('stop() resolves done at once', async () => {
    const { audio, ctx } = await load();
    const box = audio.musicBox(45_000);
    const done = watch(box.done);
    box.stop();
    await tick(ctx, 0);
    expect(done()).toBe(true);
  });
});

describe('the tune', () => {
  const beat = 60 / TUNE_BPM;
  const isC = (midi: number) => midi % 12 === 0;

  it.each([60_000, 45_000, 30_000, 12_345, 5_000])('ends at ms on the tonic (%i ms)', (ms) => {
    const plan = tunePlan(ms);
    const last = plan.at(-1)!;
    expect(last.t + BELL_DECAY_S).toBeCloseTo(ms / 1000, 6);
    const final = plan.filter((n) => Math.abs(n.t - last.t) < 1e-9);
    expect(final.length).toBeGreaterThan(0);
    expect(final.every((n) => isC(n.midi))).toBe(true);
    expect(plan.every((n) => n.t >= 0 && n.t <= last.t)).toBe(true);
  });

  it('is in 3/4 at 92 a minute, and its last four bars slow to 70%', () => {
    const plan = tunePlan(60_000);
    const bass = plan.filter((n) => n.bass).map((n) => n.t);
    const gaps = bass.slice(1).map((t, i) => t - bass[i]);
    // A bar of three beats between bass notes until the slow ending; the ending's three bars grow longer.
    for (const g of gaps.slice(0, -3)) expect(g).toBeCloseTo(3 * beat, 6);
    const end = gaps.slice(-3);
    expect(end[0]).toBeGreaterThan(3 * beat);
    expect(end[1]).toBeGreaterThan(end[0]);
    expect(end[2]).toBeGreaterThan(end[1]);
    // The note before the last comes a beat at 70% of the tempo earlier.
    const times = [...new Set(plan.map((n) => n.t))];
    expect(times.at(-1)! - times.at(-2)!).toBeCloseTo(beat / SLOW_TO, 6);
  });

  it.each([60_000, 45_000, 30_000, 12_345, 5_000, 2_000])('starts on a bar line with its bass, less than a bar in (%i ms)', (ms) => {
    const plan = tunePlan(ms);
    const t = plan[0].t;
    expect(plan.filter((n) => n.t === t).some((n) => n.bass)).toBe(true);
    expect(t).toBeLessThan((3 * beat) / SLOW_TO);
    if (ms >= 20_000) expect(t).toBeLessThan(3 * beat);
  });

  it('a box shorter than one note still sounds the tonic', () => {
    const plan = tunePlan(800);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((n) => n.t === 0 && isC(n.midi))).toBe(true);
  });
});

describe('the background loop', () => {
  it('plays the day loop at 0.22, is 0 in checked moments (nested) and comes back 1.5 s after them', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    audio.ambience('day');
    const day = ctx.source('amb-day')!;
    expect(day.loop).toBe(true);
    await tick(ctx, 2100);
    expect(ctx.level(day)).toBeCloseTo(0.22);

    audio.checked(true);
    await tick(ctx, 410);
    expect(ctx.level(day)).toBeCloseTo(0, 5);
    audio.checked(true);
    audio.checked(false);
    await tick(ctx, 3000, 50);
    expect(ctx.level(day)).toBeCloseTo(0, 5);
    audio.checked(false);
    await tick(ctx, 1490);
    expect(ctx.level(day)).toBeCloseTo(0, 5);
    await tick(ctx, 1000);
    expect(ctx.level(day)).toBeCloseTo(0.22);
  });

  it('stays silent in a checked moment while speech starts and ends', async () => {
    const { audio, ctx, A } = await load();
    await audio.preloadFx();
    audio.ambience('day');
    await tick(ctx, 2100);
    const day = ctx.source('amb-day')!;
    audio.checked(true);
    void audio.say('h-sounds');
    await tick(ctx, 500);
    A.finish('h-sounds');
    await tick(ctx, 2000, 50);
    expect(ctx.level(day)).toBeCloseTo(0, 5);
  });

  it('keeps its 1.5 s after a checked moment when speech starts in that time', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    audio.ambience('day');
    await tick(ctx, 2100);
    const day = ctx.source('amb-day')!;
    audio.checked(true);
    await tick(ctx, 500);
    audio.checked(false);
    await tick(ctx, 300);
    void audio.say('g4-heart');
    await tick(ctx, 1100); // 1.4 s after the moment
    expect(ctx.level(day)).toBeCloseTo(0, 5);
    await tick(ctx, 1000);
    expect(ctx.level(day)).toBeCloseTo(0.08);
  });

  it('goes to 0.08 under speech', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    audio.ambience('day');
    await tick(ctx, 2100);
    void audio.say('lumi4-soon');
    await tick(ctx, 300);
    expect(ctx.level(ctx.source('amb-day')!)).toBeCloseTo(0.08);
  });

  it('plays on through audio.stop()', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    audio.ambience('day');
    await tick(ctx, 2100);
    const day = ctx.source('amb-day')!;
    audio.stop();
    await tick(ctx, 500);
    expect(day.stopAt).toBeNull();
    expect(ctx.level(day)).toBeCloseTo(0.22);
  });

  it('starts once its file has loaded, and fades out over 2 s at night, which is quiet in 2.3.0', async () => {
    const { audio, ctx } = await load();
    audio.ambience('day');
    expect(ctx.source('amb-day')).toBeUndefined();
    await audio.preloadFx();
    const day = ctx.source('amb-day')!;
    expect(day).toBeDefined();
    await tick(ctx, 2100);
    audio.ambience('night');
    await tick(ctx, 2010);
    expect(ctx.level(day)).toBeCloseTo(0, 5);
    expect(day.stopAt).not.toBeNull();
    expect(ctx.sources.filter((s) => s.buffer?.id === 'amb-day')).toHaveLength(1);
    expect(audio.soundState()).toMatchObject({ ambience: 'night', loop: null });
  });

  it('loops the middle period of its file, which is the same in every decoder', async () => {
    const { audio, ctx } = await load();
    await audio.preloadFx();
    audio.ambience('day');
    const day = ctx.source('amb-day')!;
    expect([day.loopStart, day.loopEnd]).toEqual([7.5, 22.5]);
    expect(day.offset).toBe(7.5);
    // A file whose window does not fit loops whole, never into silence past its end.
    expect(loopWindow(14, { seconds: 15, loopStart: 7.5, loopEnd: 22.5 })).toEqual({ start: 0, end: 14 });
  });
});

describe('the effect list', () => {
  const manifestPath = join(GAME, 'public/audio/sfx/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { clips: Record<string, { file: string }> };
  const later = SFX_JSON.later.map((l) => l.id);

  it('every SfxFile is in sfx.json and every effect in sfx.json is an SfxFile', () => {
    expect([...SFX_FILES].sort()).toEqual(SFX_JSON.effects.map((e) => e.id).sort());
  });

  it('the day loop is a loop in sfx.json, and night waits in later with no file', () => {
    expect(SFX_JSON.loops.map((l) => l.id)).toContain(AMBIENCE_FILE.day);
    expect(AMBIENCE_FILE.night).toBeNull();
    expect(later).toContain('amb-night');
  });

  it('nothing in later is made, and every made file is listed', () => {
    const made = readdirSync(join(GAME, 'public/audio/sfx')).filter((f) => f.endsWith('.mp3'));
    for (const id of later) {
      expect(manifest.clips[id]).toBeUndefined();
      expect(made).not.toContain(id + '.mp3');
    }
    const known = new Set<string>([...SFX_FILES, ...SFX_JSON.loops.map((l) => l.id)]);
    for (const [id, c] of Object.entries(manifest.clips)) {
      expect(known.has(id)).toBe(true);
      expect(existsSync(join(GAME, 'public/audio/sfx', c.file))).toBe(true);
    }
    for (const f of made) expect(Object.values(manifest.clips).map((c) => c.file)).toContain(f);
  });

  it('the probe is a core effect of 2 s', () => {
    const p = SFX_JSON.effects.find((e) => e.id === SFX_JSON.probe)!;
    expect(p).toMatchObject({ seconds: 2, core: true });
  });
});

// ---- the generator ------------------------------------------------------------------------------------------------

const GEN = join(GAME, 'tools/audio/gen-sfx.py');
const BUDGET = JSON.parse(readFileSync(join(GAME, 'tools/audio/budget.json'), 'utf8')) as Record<string, unknown>;

/** Loads gen-sfx.py and runs main() with a fake API: every call is an event, the ledger is read at each POST. */
const DRIVER = String.raw`
import contextlib, importlib.util, io, json, sys
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('gen_sfx', sys.argv[1])
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)
case = json.loads(Path(sys.argv[2]).read_text())
d = Path(case['dir'])
paths = SimpleNamespace(sfx=d / 'sfx.json', budget=d / 'budget.json', ledger=d / 'ledger.jsonl', out=d / 'out',
                        cache=d / 'cache', root=d)
events = []
counter = list(case.get('counter') or [30000])
posts = [0]

def run_line():
    if not paths.ledger.exists():
        return None
    for line in paths.ledger.read_text().splitlines():
        rec = json.loads(line)
        if rec.get('lines') == 'sfx':
            return rec
    return None

def credits_left():
    v = counter.pop(0) if len(counter) > 1 else counter[0]
    events.append({'k': 'counter', 'v': v})
    return v, {}

def http(path, data=None, params=None, raw=False, headers=None, body=None, tries=6):
    posts[0] += 1
    rec = run_line()
    events.append({'k': 'post', 'path': path, 'data': data, 'params': params, 'raw': raw, 'tries': tries,
                   'booked': rec and rec['credits'], 'attempts': rec and rec['attempts']})
    if posts[0] in case.get('fail', []):
        raise RuntimeError('HTTP 500 on ' + path)
    return b'x' * 1000

def process(item, raw, out):
    out.write_bytes(raw.read_bytes())
    s = float(item['seconds'])
    return {'seconds': s, 'loopStart': s / 2 if item['loop'] else None, 'loopEnd': 1.5 * s if item['loop'] else None}

api = SimpleNamespace(load_key=lambda: events.append({'k': 'key'}), http=http, credits_left=credits_left,
                      read_ledger=gen.speech_module().read_ledger, min_floor=8000)
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    try:
        code = gen.main(case['argv'], api=api, paths=paths, sleep=lambda s: events.append({'k': 'sleep', 's': s}),
                        process=process)
    except SystemExit as e:
        code = e.code if isinstance(e.code, int) else 1
        print(e)
ledger = [json.loads(l) for l in paths.ledger.read_text().splitlines()] if paths.ledger.exists() else []
m = d / 'out' / 'manifest.json'
print(json.dumps({'code': code, 'out': buf.getvalue(), 'events': events, 'ledger': ledger,
                  'budget': json.loads(paths.budget.read_text()), 'manifest': json.loads(m.read_text()) if m.exists() else None}))
`;

interface GenCase {
  /** Raw files in the cache, as a run that stopped after its POST leaves them. */
  raw?: string[];
  ledger?: number[];
  budget?: Record<string, unknown>;
  made?: string[];
  counter?: number[];
  fail?: number[];
  manifest?: { clips: Record<string, Record<string, unknown>> };
}
interface GenEvent {
  k: 'key' | 'counter' | 'post' | 'sleep';
  v?: number;
  s?: number;
  path?: string;
  data?: Record<string, unknown>;
  params?: Record<string, string>;
  raw?: boolean;
  tries?: number;
  booked?: number;
  attempts?: number;
}
interface GenRun {
  code: number;
  out: string;
  events: GenEvent[];
  ledger: Array<Record<string, unknown>>;
  budget: Record<string, unknown>;
  manifest: { clips: Record<string, Record<string, unknown>> } | null;
}

const work = mkdtempSync(join(tmpdir(), 'mmw-sfx-'));
const driver = join(work, 'driver.py');
writeFileSync(driver, DRIVER);
let runs = 0;

function gen(argv: string[], c: GenCase = {}): GenRun {
  const dir = join(work, 'run' + ++runs);
  mkdirSync(join(dir, 'out'), { recursive: true });
  writeFileSync(join(dir, 'sfx.json'), JSON.stringify(SFX_JSON));
  writeFileSync(join(dir, 'budget.json'), JSON.stringify({ ...BUDGET, ...c.budget }));
  const old = (c.ledger ?? [2276.9]).map((credits) => JSON.stringify({ t: '2026-10-28T00:00:00', lines: 'speech', credits }));
  writeFileSync(join(dir, 'ledger.jsonl'), old.join('\n') + '\n');
  for (const id of c.made ?? []) writeFileSync(join(dir, 'out', id + '.mp3'), 'made before');
  mkdirSync(join(dir, 'cache'), { recursive: true });
  for (const id of c.raw ?? []) writeFileSync(join(dir, 'cache', id + '-20261029T120000.mp3'), 'r'.repeat(1000));
  if (c.manifest) writeFileSync(join(dir, 'out', 'manifest.json'), JSON.stringify(c.manifest));
  const caseFile = join(dir, 'case.json');
  writeFileSync(caseFile, JSON.stringify({ dir, argv, counter: c.counter, fail: c.fail }));
  const r = spawnSync('python3', ['-I', '-B', driver, GEN, caseFile], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('driver failed: ' + r.stderr);
  return JSON.parse(r.stdout) as GenRun;
}

const ITEMS = [...SFX_JSON.effects.map((e) => ({ ...e, loop: false })), ...SFX_JSON.loops.map((l) => ({ ...l, loop: true }))];
const credits = (ids: string[], rate = 40) =>
  Math.round(ITEMS.filter((i) => ids.includes(i.id)).reduce((s, i) => s + i.seconds * rate, 0) * 100) / 100;
const ALL = ITEMS.map((i) => i.id);
const posts = (r: GenRun) => r.events.filter((e) => e.k === 'post');
const calls = (r: GenRun) => r.events.filter((e) => e.k !== 'sleep');
const runLine = (r: GenRun) => r.ledger.find((l) => l.lines === 'sfx');

describe('the generator', () => {
  it('a dry run plans every effect and the day loop at 40 credits a second and calls nothing', () => {
    const r = gen(['--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain(`Planned: ${credits(ALL)} credits`);
    expect(credits(ALL)).toBe(1404); // section 21: 804 for the effects, 600 for the day loop
    for (const id of ALL) expect(r.out).toContain(id);
    expect(r.out).not.toContain('amb-night');
    expect(calls(r)).toEqual([]);
  });

  it('a dry run skips what is made and plans only the core effects and the loop with --core', () => {
    expect(gen(['--dry-run'], { made: ['egg-crack', 'amb-day'] }).out).toContain(`Planned: ${credits(ALL) - 660} credits`);
    const core = ITEMS.filter((i) => i.loop || (i as { core?: boolean }).core).map((i) => i.id);
    expect(core).toHaveLength(9);
    expect(gen(['--dry-run', '--core']).out).toContain(`Planned: ${credits(core)} credits`);
  });

  it('never plans below 40 credits a second', () => {
    expect(gen(['--dry-run'], { budget: { sfxPerSecond: 25 } }).out).toContain(`Planned: ${credits(ALL)} credits`);
    expect(gen(['--dry-run'], { budget: { sfxPerSecond: 50 } }).out).toContain(`Planned: ${credits(ALL, 50)} credits`);
  });

  it('a dry run refuses past the cap, and with --left under the floor', () => {
    const cap = BUDGET.cap as number;
    const atCap = gen(['--dry-run'], { ledger: [cap - 1404] });
    expect(atCap.code).toBe(0);
    const over = gen(['--dry-run'], { ledger: [cap - 1403] });
    expect(over.code).toBe(1);
    expect(over.out).toContain('over the cap');
    const floor = BUDGET.floor as number;
    expect(gen(['--dry-run', '--left', String(floor + 1404)]).code).toBe(0);
    const under = gen(['--dry-run', '--left', String(floor + 1403)]);
    expect(under.code).toBe(1);
    expect(under.out).toContain('under the floor');
    expect(calls(under)).toEqual([]);
  });

  it('never makes what waits in later', () => {
    for (const argv of [['--only', 'amb-night'], ['--retake', 'amb-night'], ['--dry-run', '--only', 'amb-night']]) {
      const r = gen(argv, { counter: [20000] });
      expect(r.code).toBe(1);
      expect(posts(r)).toEqual([]);
    }
  });

  it('makes each file with one attempt per POST, every attempt booked before its call', () => {
    const r = gen([], { counter: [20000] });
    expect(r.code).toBe(0);
    expect(r.events[0].k).toBe('key');
    const p = posts(r);
    expect(p).toHaveLength(ITEMS.length);
    let booked = 0;
    p.forEach((e, i) => {
      const item = ITEMS[i];
      booked = Math.round((booked + item.seconds * 40) * 100) / 100;
      expect(e).toMatchObject({ path: '/v1/sound-generation', tries: 1, raw: true, params: { output_format: 'mp3_44100_128' } });
      expect(e.data).toMatchObject({ text: item.text, duration_seconds: item.seconds, model_id: 'eleven_text_to_sound_v2', prompt_influence: 0.5 });
      expect(e.data!.loop === true).toBe(item.loop);
      expect(e.attempts).toBe(i + 1);
      expect(e.booked).toBeCloseTo(booked, 2);
    });
    expect(r.ledger).toHaveLength(2);
    expect(runLine(r)).toMatchObject({ lines: 'sfx', made: ITEMS.length, attempts: ITEMS.length, credits: 1404, credits_before: 20000 });
    expect(Object.keys(r.manifest!.clips)).toEqual(ALL);
    expect(Object.values(r.manifest!.clips).every((c) => c.approved === false)).toBe(true);
    expect(r.manifest!.clips['amb-day']).toMatchObject({ loop: true, seconds: 15, loopStart: 7.5, loopEnd: 22.5 });
  });

  it('stops at the first failed attempt, which stays booked', () => {
    const r = gen([], { counter: [20000], fail: [3] });
    expect(r.code).toBe(1);
    expect(posts(r)).toHaveLength(3);
    expect(runLine(r)).toMatchObject({ attempts: 3, made: 2, credits: credits(ALL.slice(0, 3)) });
    expect(Object.keys(r.manifest!.clips)).toEqual(ALL.slice(0, 2));
  });

  it('refuses before any POST when the account would fall under the floor, or the ledger would pass the cap', () => {
    const floor = BUDGET.floor as number;
    const low = gen([], { counter: [floor + 1403] });
    expect(low.code).toBe(1);
    expect(posts(low)).toEqual([]);
    expect(runLine(low)).toBeUndefined();
    const full = gen([], { counter: [50000], ledger: [BUDGET.cap as number] });
    expect(full.code).toBe(1);
    expect(posts(full)).toEqual([]);
  });

  it('makes a file again only with --retake', () => {
    const skip = gen(['--only', 'egg-crack'], { counter: [20000], made: ['egg-crack'] });
    expect(posts(skip)).toEqual([]);
    const again = gen(['--retake', 'egg-crack'], { counter: [20000], made: ['egg-crack'] });
    expect(posts(again).map((e) => e.data!.text)).toEqual([SFX_JSON.effects[0].text]);
  });

  it('the probe makes only bedtime-bell and polls the counter every 30 s until it moves', () => {
    // The first two reads (60 s apart) agree, so the counter stands still before the probe.
    const r = gen(['--probe'], { counter: [30000, 30000, 30000, 30000, 29900] });
    expect(r.code).toBe(0);
    expect(posts(r).map((e) => e.data!.duration_seconds)).toEqual([2]);
    expect(Object.keys(r.manifest!.clips)).toEqual(['bedtime-bell']);
    const sleeps = r.events.filter((e) => e.k === 'sleep');
    expect(sleeps.map((e) => e.s)).toEqual([60, 30, 30, 30]);
    expect(r.budget.sfxPerSecond).toBe(50);
    expect(r.budget.sfxProbe).toMatchObject({ id: 'bedtime-bell', before: 30000, after: 29900, credits: 100, minutes: 1.5 });
    expect(runLine(r)).toMatchObject({ credits: 100, attempts: 1 }); // booked at 80, then what it really took
  });

  it('the probe never writes a rate below 40', () => {
    const r = gen(['--probe'], { counter: [30000, 30000, 29980] });
    expect(r.budget.sfxPerSecond).toBe(40);
    expect(r.budget.sfxProbe).toMatchObject({ credits: 20 });
  });

  it('the probe waits at most 10 minutes, and a counter that has not moved gives no rate', () => {
    const r = gen(['--probe'], { counter: [30000], budget: { sfxPerSecond: 45 } });
    expect(r.code).toBe(0);
    const polls = r.events.slice(r.events.findIndex((e) => e.k === 'post')).filter((e) => e.k === 'sleep');
    expect(polls.reduce((s, e) => s + e.s!, 0)).toBe(600);
    expect(r.budget.sfxPerSecond).toBe(45);
    expect(r.budget.sfxProbe).toMatchObject({ credits: null, minutes: 10 });
  });

  it('says when the pack must shrink to the core effects', () => {
    expect(gen(['--probe'], { counter: [30000, 30000, 29760] }).out).toContain('--core');
    expect(gen(['--probe'], { counter: [30000, 30000, 29900] }).out).not.toContain('--core');
  });

  it('the probe first waits until the counter stands still, so an earlier run\'s charge is not taken for its cost', () => {
    // An earlier run's 300 credits land while the probe waits to start.
    const r = gen(['--probe'], { counter: [30300, 30000, 30000, 30000, 29920] });
    expect(r.code).toBe(0);
    expect(r.events.filter((e) => e.k === 'sleep').map((e) => e.s)).toEqual([60, 60, 30, 30]);
    expect(r.events.findIndex((e) => e.k === 'post')).toBeGreaterThan(r.events.findIndex((e) => e.k === 'sleep' && e.s === 60));
    expect(r.budget.sfxProbe).toMatchObject({ before: 30000, after: 29920, credits: 80 });
    expect(r.budget.sfxPerSecond).toBe(40);

    const moving = gen(['--probe'], { counter: Array.from({ length: 14 }, (_, i) => 30000 - 10 * i) });
    expect(moving.code).toBe(1);
    expect(posts(moving)).toEqual([]);
    expect(runLine(moving)).toBeUndefined();
    expect(moving.events.filter((e) => e.k === 'sleep').reduce((s, e) => s + e.s!, 0)).toBe(600);
  });

  it('refuses the whole pack after a probe above 50 a second or 200 a call, unless --core, --only or --full', () => {
    const dear = { sfxPerSecond: 60 };
    const r = gen([], { counter: [20000], budget: dear });
    expect(r.code).toBe(1);
    expect(posts(r)).toEqual([]);
    expect(runLine(r)).toBeUndefined();
    expect(r.out).toContain('--core');
    expect(gen(['--dry-run'], { budget: dear }).code).toBe(1);
    expect(gen([], { counter: [20000], budget: { sfxPerSecond: 40, sfxProbe: { credits: 200 } } }).code).toBe(1);
    expect(posts(gen(['--core'], { counter: [20000], budget: dear }))).toHaveLength(9);
    expect(posts(gen(['--only', 'owl'], { counter: [20000], budget: dear }))).toHaveLength(1);
    expect(posts(gen(['--full'], { counter: [20000], budget: dear }))).toHaveLength(ITEMS.length);
    expect(gen([], { counter: [20000], budget: { sfxPerSecond: 50 } }).code).toBe(0);
  });

  it('makes a file from the raw file an earlier run paid for, without a call', () => {
    const r = gen(['--only', 'amb-day'], { counter: [20000], raw: ['amb-day'] });
    expect(r.code).toBe(0);
    expect(calls(r)).toEqual([]);
    expect(runLine(r)).toBeUndefined();
    expect(r.manifest!.clips['amb-day']).toMatchObject({ loop: true, raw: 'amb-day-20261029T120000.mp3' });
    expect(gen(['--dry-run'], { raw: ['amb-day'] }).out).toContain(`Planned: ${credits(ALL) - 600} credits`);
    const again = gen(['--retake', 'amb-day'], { counter: [20000], raw: ['amb-day'], made: ['amb-day'] });
    expect(posts(again)).toHaveLength(1);
  });

  it('the probe is made only once', () => {
    const r = gen(['--probe'], { counter: [30000], made: ['bedtime-bell'] });
    expect(r.code).toBe(1);
    expect(posts(r)).toEqual([]);
  });

  it('--approve marks made files as listened to and calls nothing', () => {
    const manifest = { clips: { 'egg-crack': { file: 'egg-crack.mp3', approved: false }, owl: { file: 'owl.mp3', approved: false } } };
    const r = gen(['--approve', 'egg-crack'], { manifest, made: ['egg-crack', 'owl'] });
    expect(r.code).toBe(0);
    expect(calls(r)).toEqual([]);
    expect(r.manifest!.clips['egg-crack'].approved).toBe(true);
    expect(r.manifest!.clips.owl.approved).toBe(false);
    const notMade = gen(['--approve', 'heart-glow'], { manifest });
    expect(notMade.code).toBe(1);
  });
});

// ---- the generator's ffmpeg steps ----------------------------------------------------------------------------------

/** Runs process_loop and process_effect of gen-sfx.py on synthetic sines, and measures what they wrote. */
const FFMPEG_DRIVER = String.raw`
import importlib.util, json, re, subprocess, sys
from pathlib import Path

spec = importlib.util.spec_from_file_location('gen_sfx', sys.argv[1])
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)
d = Path(sys.argv[2])

def ff(*a):
    subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', *a], check=True, capture_output=True)

def decoded(p):
    w = p.with_suffix('.check.wav')
    ff('-i', str(p), '-c:a', 'pcm_s16le', str(w))
    return {'seconds': int(gen.probe_value(w, 'duration_ts')) / 44100, 'rate': gen.probe_value(w, 'sample_rate'),
            'channels': gen.probe_value(w, 'channels')}

def levels(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(p), '-af', 'volumedetect,ebur128=framelog=quiet',
                        '-f', 'null', '-'], capture_output=True, text=True)
    return {'peak': float(re.search(r'max_volume:\s*(-?[\d.]+) dB', r.stderr).group(1)),
            'lufs': float(re.findall(r'I:\s*(-?[\d.]+) LUFS', r.stderr)[-1])}

# A 4 s loop (a stereo 220 Hz sine at -12 dBFS), and a 1 s effect (880 Hz at -20 dBFS) with 1 s of silence after it.
ff('-f', 'lavfi', '-i', 'sine=frequency=220:duration=4:sample_rate=44100', '-af', 'volume=-12dB', '-ac', '2',
   '-c:a', 'libmp3lame', '-b:a', '128k', str(d / 'loop-raw.mp3'))
ff('-f', 'lavfi', '-i', 'sine=frequency=880:duration=1:sample_rate=44100', '-af', 'volume=-20dB,apad=pad_dur=1',
   '-c:a', 'libmp3lame', '-b:a', '128k', str(d / 'fx-raw.mp3'))
loop = gen.process_loop(d / 'loop-raw.mp3', d / 'loop.mp3')
fx = gen.process_effect(d / 'fx-raw.mp3', d / 'fx.mp3')
print(json.dumps({'period': decoded(d / 'loop-raw.mp3')['seconds'], 'loop': loop, 'loopFile': decoded(d / 'loop.mp3'),
                  'loopLevels': levels(d / 'loop.mp3'), 'fx': fx, 'fxFile': decoded(d / 'fx.mp3'),
                  'fxLevels': levels(d / 'fx.mp3')}))
`;

const hasFfmpeg = ['ffmpeg', 'ffprobe'].every((t) => spawnSync(t, ['-version'], { encoding: 'utf8' }).status === 0);

describe.skipIf(!hasFfmpeg)("the generator's ffmpeg steps", () => {
  const dir = join(work, 'ffmpeg');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'driver.py');
  writeFileSync(file, FFMPEG_DRIVER);
  type Decoded = { seconds: number; rate: number; channels: number };
  type Levels = { peak: number; lufs: number };
  let r: {
    period: number;
    loop: { seconds: number; loopStart: number; loopEnd: number };
    loopFile: Decoded;
    loopLevels: Levels;
    fx: { seconds: number; loopStart: null; loopEnd: null };
    fxFile: Decoded;
    fxLevels: Levels;
  };
  beforeAll(() => {
    const run = spawnSync('python3', ['-I', '-B', file, GEN, dir], { encoding: 'utf8', timeout: 60_000 });
    if (run.status !== 0) throw new Error('ffmpeg driver failed: ' + run.stderr);
    r = JSON.parse(run.stdout) as typeof r;
  });

  it('a loop holds two periods, and its window is the middle period, from half a period on', () => {
    expect(r.loop.seconds).toBeCloseTo(r.period, 3);
    expect(r.loop.loopStart).toBeCloseTo(r.period / 2, 3);
    expect(r.loop.loopEnd - r.loop.loopStart).toBeCloseTo(r.period, 5);
    expect(r.loopFile.seconds).toBeGreaterThan(2 * r.period - 0.03);
    expect(r.loopFile.seconds).toBeLessThan(2 * r.period + 0.03);
    expect(r.loop.loopEnd).toBeLessThanOrEqual(r.loopFile.seconds);
  });

  it('a loop is mono, 44.1 kHz, at -20 LUFS', () => {
    expect(r.loopFile).toMatchObject({ rate: 44100, channels: 1 });
    expect(Math.abs(r.loopLevels.lufs + 20)).toBeLessThan(1);
  });

  it('an effect is mono, 44.1 kHz, its peak at -3 dBFS and its trailing silence trimmed', () => {
    expect(r.fxFile).toMatchObject({ rate: 44100, channels: 1 });
    expect(Math.abs(r.fxLevels.peak + 3)).toBeLessThan(0.6);
    expect(r.fx.seconds).toBeGreaterThan(0.99);
    expect(r.fx.seconds).toBeLessThan(1.15); // 1 s of sound and 50 ms of the silence, not the 2 s of the raw file
    expect(r.fx.loopStart).toBeNull();
  });
});
