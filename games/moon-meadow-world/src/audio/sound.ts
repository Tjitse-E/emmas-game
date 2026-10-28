// Moon Meadow World's own sound channel (docs/v4/2.3.md section 20): ElevenLabs sound effects from files, a day
// background loop, and the music box tune made in code. It plays on the shared player's AudioContext
// (EmmaAudio.context) through its own gain nodes, so shared/audio.js and v3 do not change.
//
// Rules for learning. Nothing sounds under Elizabeth: while she speaks (her clips and every letter sound) an effect is
// skipped, and an effect still sounding when she starts fades out in 60 ms. Under a story line (Lumi, a foal) an
// effect may play ducked to 0.3 when it asks (`duck`). The music box goes down to 0.1 under any speech and the
// background loop to 0.08; the loop is silent during checked moments. A line that must follow an effect awaits fx(),
// which resolves at the effect's end and never later than FX_WAIT_MS after it started. audio.stop() stops neither
// the background loop nor the music box. The synthesised effects of audio.sfx() (tick, pop, chime and the others)
// play here too, by the same rule (section 8: no effect over or under Elizabeth, letter sounds included); under a
// story line they play on the ducked bus.
//
// The graph: every sound goes through one of three buses (effects, music box, background) into the channel's master,
// which follows the shared player's mute, and on to the destination. A file plays only when the manifest
// (public/audio/sfx/manifest.json, written by tools/audio/gen-sfx.py) lists it as approved, that is after Tjitse has
// listened to it; ?sfx=all and dev/sound.html play the others too. A missing file plays the synthesised fallback
// (synth.ts) on the same bus, or nothing. Nothing here throws or waits on a file that is not there. A manifest or a
// file that failed to load is tried again on a later fx() or ambience(), as shared/audio.js does not remember
// failures either (on an old iPad a decode can fail under memory pressure). Nothing starts on a clock that does not
// run (a suspended or interrupted context), because it would play whenever the context wakes, out of place.
import type { Sfx } from './index';
import { playSynth } from './synth';
import { BELL_DECAY_S, boxMs, hz, type TuneNote, tunePlan } from './tune';

/** The ElevenLabs effects (tools/audio/sfx.json), in its order; each lives in public/audio/sfx/<id>.mp3. */
export const SFX_FILES = [
  'egg-crack', 'nicker-1', 'nicker-2', 'stable-door', 'trunk-lid', 'gift-paper', 'dress-swish', 'bead-clink',
  'crown-twinkle', 'hay-rustle', 'splash-1', 'splash-2', 'slide-whoosh', 'bedtime-bell', 'owl', 'heart-glow',
] as const;
/** The ElevenLabs effects (tools/audio/sfx.json); each lives in public/audio/sfx/<id>.mp3. */
export type SfxFile = (typeof SFX_FILES)[number];
/** The background loops. Night has no file in 2.3.0 (it waits for 2.3.1), so night is quiet. */
export type Ambience = 'day' | 'night';
/** The file of each background loop (tools/audio/sfx.json `loops`); null while it waits (`later`). */
export const AMBIENCE_FILE: Readonly<Record<Ambience, string | null>> = { day: 'amb-day', night: null };
/** Who speaks now: Elizabeth (her clips and every letter sound) or a story voice (Lumi, a foal). */
export type Speaker = 'elizabeth' | 'story';

/** fx() resolves at the effect's end, or this long after it started, whichever comes first. */
export const FX_WAIT_MS = 1000;

/** A story line is Lumi's or a foal's (VOICES.md: the queen and the foals); every other clip is Elizabeth's. */
export function isStoryLine(id: string): boolean {
  return /^(lumi|foal)/.test(id);
}

export interface FxOpts {
  /**
   * Play under a story line that is going on, ducked to 0.3, instead of skipping it (the hatch crack under "It's
   * hatching!"). It never plays under Elizabeth: while she speaks the effect is skipped.
   */
  duck?: boolean;
  /** The synthesised effect to play while the file is missing (not generated yet, or failed to load). */
  fallback?: Sfx;
}

export interface MusicBox {
  /** Fade the tune out now (Done, or the wardrobe closing). audio.stop() never stops it. */
  stop(): void;
  /** Resolves at `ms` by a timer (also while the audio context is suspended), or when stopped. */
  readonly done: Promise<void>;
}

/** One file in public/audio/sfx/manifest.json (tools/audio/gen-sfx.py). */
export interface SfxEntry {
  file: string;
  /** The length of the sound; for a loop, one period (the file holds two). */
  seconds: number;
  loop: boolean;
  /** For a loop: the middle period of the file, from half a period to one and a half. */
  loopStart?: number | null;
  loopEnd?: number | null;
  /** False until Tjitse has listened (sfx.sh --approve). The game plays only approved files. */
  approved: boolean;
}

/** The levels of the three buses (section 20). */
export const LEVELS = { fx: 0.8, fxStory: 0.3, box: 0.6, boxSpeech: 0.1, amb: 0.22, ambSpeech: 0.08 } as const;

/** What each bus is at for who speaks and whether a checked moment is open. */
export function busLevels(speaker: Speaker | null, checked: boolean): { fx: number; box: number; amb: number } {
  return {
    fx: speaker === 'elizabeth' ? 0 : speaker === 'story' ? LEVELS.fxStory : LEVELS.fx,
    box: speaker ? LEVELS.boxSpeech : LEVELS.box,
    amb: checked ? 0 : speaker ? LEVELS.ambSpeech : LEVELS.amb,
  };
}

/**
 * The loop window of a decoded loop. Decoders keep different amounts of the MP3 encoder's delay in front (Chrome none,
 * WebKit 576 samples), so gen-sfx.py writes the loop twice into its file and the window is the middle period
 * (loopStart to loopEnd). It is one period long and inside the sound whatever the decoder keeps, so the seam has no gap.
 * A file without that window loops whole.
 */
export function loopWindow(duration: number, e: Pick<SfxEntry, 'seconds' | 'loopStart' | 'loopEnd'>): { start: number; end: number } {
  const { loopStart: start, loopEnd: end } = e;
  if (start != null && end != null && start >= 0 && end - start > 0.5 && end <= duration) return { start, end };
  return { start: 0, end: Math.max(0, duration) };
}

// Fades, in seconds (section 20).
const FX_FADE_S = 0.06; // effects down under speech, and an effect cut when Elizabeth starts
const FX_BACK_AFTER_S = 0.4; // effects back to 0.8 this long after a story line ends
const FX_BACK_S = 0.2;
// After Elizabeth the effects bus is back at once: fx() asks only who speaks now, so an effect asked right after her
// line must not play into a bus that is still coming back (nothing played under her, so nothing jumps).
const FX_SNAP_S = 0.01;
const STOP_FADE_S = 0.03; // audio.stop(), as the shared player's
const BOX_DOWN_S = 0.08;
const BOX_BACK_AFTER_S = 0.3;
const BOX_BACK_S = 0.4;
const BOX_STOP_S = 0.25;
const AMB_SPEECH_S = 0.25;
const AMB_CHECKED_S = 0.4; // the loop goes out over 400 ms when a checked moment opens
const AMB_BACK_AFTER_SPEECH_S = 0.5;
const AMB_BACK_AFTER_CHECKED_S = 1.5; // and comes back 1.5 s after the moment
const AMB_BACK_S = 0.8;
const AMB_CROSSFADE_S = 2;
const MUTE_S = 0.05;
// The music box schedules its notes a little ahead on a timer, so a 60 s tune is never all built at once.
const BOX_AHEAD_S = 0.6;
const BOX_PUMP_MS = 200;
const BOX_LEAD_S = 0.05; // the tune's time 0 is this long after the box starts
const BELL_PEAK = 0.3;
const BELL_OCTAVE = 0.35;
/** The synthesised effects sound as loud as they did through shared/audio.js (gain 1): 0.8 on the bus times this. */
const SYNTH_GAIN = 1 / LEVELS.fx;
/** A failed manifest or file is tried again this long after it failed, on a later fx() or ambience(), at most 3 times. */
const RETRY_MS = 10_000;
const MAX_TRIES = 3;
const MANIFEST = 'manifest.json';

type Fetcher = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer> }>;

export interface SoundDeps {
  /** Who speaks now, or null. index.ts counts pending say, sayAll, sound and hold calls per speaker. */
  speaking(): Speaker | null;
  /** The shared player's AudioContext (EmmaAudio.context), or null where there is none. */
  context(): BaseAudioContext | null;
  /** The shared player's mute (EmmaAudio.muted). */
  muted?(): boolean;
  /** Where the effect files and their manifest are, relative to the page. */
  base?: string;
  fetch?: Fetcher;
  /** Also play files Tjitse has not approved yet (?sfx=all, dev/sound.html). Read when preloadFx() runs. */
  listenAll?(): boolean;
}

/** A gain whose value now is known without reading the AudioParam back (Safari's value during a ramp is unreliable). */
class Fader {
  readonly node: GainNode;
  target: number;
  private pts: Array<[number, number]>;
  private readonly ctx: BaseAudioContext;

  constructor(ctx: BaseAudioContext, value: number, to: AudioNode) {
    this.ctx = ctx;
    this.node = ctx.createGain();
    this.node.gain.value = value;
    this.node.connect(to);
    this.target = value;
    this.pts = [[0, value]];
  }

  valueAt(t: number): number {
    const p = this.pts;
    if (t <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) {
      if (t < p[i][0]) {
        const [t0, v0] = p[i - 1];
        const [t1, v1] = p[i];
        return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
      }
    }
    return p[p.length - 1][1];
  }

  /** Hold the value now for `after` seconds, then ramp to `value` over `over` seconds. */
  to(value: number, after: number, over: number): void {
    const now = this.ctx.currentTime;
    const v0 = this.valueAt(now);
    const at = now + Math.max(0, after);
    const end = at + Math.max(0.001, over);
    const g = this.node.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(v0, now);
    if (at > now) g.setValueAtTime(v0, at);
    g.linearRampToValueAtTime(value, end);
    this.pts = [[now, v0], [at, v0], [end, value]];
    this.target = value;
  }
}

interface Graph {
  ctx: BaseAudioContext;
  master: Fader;
  fx: Fader;
  box: Fader;
  amb: Fader;
}

interface FxVoice {
  out: Fader;
  src: AudioBufferSourceNode | null;
}

interface LoopVoice {
  id: string;
  src: AudioBufferSourceNode;
  gain: Fader;
}

const wait = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

/** Whether the context's clock runs. A sound started on a suspended or interrupted clock waits until it wakes. */
function running(ctx: BaseAudioContext): boolean {
  const state: string | undefined = ctx.state;
  return state === undefined || state === 'running';
}

function decode(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    // Older Safari only calls back; newer browsers also return a promise. Either settles this one.
    const p = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
    if (p && typeof p.then === 'function') p.then(resolve, reject);
  });
}

function isKnown(id: string): boolean {
  return (SFX_FILES as readonly string[]).includes(id) || Object.values(AMBIENCE_FILE).includes(id);
}

/** A bell note of the music box: a triangle and a sine an octave up, decaying over BELL_DECAY_S. */
function bell(ctx: BaseAudioContext, out: AudioNode, n: TuneNote, at: number): void {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(BELL_PEAK * n.level, at + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, at + BELL_DECAY_S);
  env.connect(out);
  const tri = ctx.createOscillator();
  tri.type = 'triangle';
  tri.frequency.value = hz(n.midi);
  tri.connect(env);
  const sine = ctx.createOscillator();
  sine.type = 'sine';
  sine.frequency.value = hz(n.midi) * 2;
  const octave = ctx.createGain();
  octave.gain.value = BELL_OCTAVE;
  sine.connect(octave);
  octave.connect(env);
  for (const o of [tri, sine]) {
    o.start(at);
    o.stop(at + BELL_DECAY_S + 0.05);
  }
}

export function createSound(deps: SoundDeps) {
  const base = deps.base ?? 'audio/sfx/';
  const get: Fetcher = deps.fetch ?? ((url, init) => fetch(url, init));
  const muted = () => !!deps.muted?.();
  let g: Graph | null = null;
  let mutedNow = false;
  let checkedDepth = 0;
  let checkedEnded = -Infinity;
  let wanted: Ambience | null = null;
  let loop: LoopVoice | null = null;
  /** The first preloadFx() has run: only then may fx() and ambience() try a failed load again. */
  let started = false;
  let listenAll = false;
  /** The manifest's clips once it has loaded; null before that and while it fails. */
  let clips: Record<string, SfxEntry> | null = null;
  /** The load that runs now (the whole pack, or one file again), so two never run at once. */
  let busy: Promise<void> | null = null;
  let loading: Promise<void> = Promise.resolve();
  const files = new Map<string, { buffer: AudioBuffer; entry: SfxEntry }>();
  /** What failed to load (the manifest, or a clip id): when it last failed, and how often. */
  const failed = new Map<string, { at: number; tries: number }>();
  const voices = new Set<FxVoice>();

  function graph(): Graph | null {
    const ctx = deps.context();
    if (!ctx) return null;
    if (!g || g.ctx !== ctx) {
      mutedNow = muted();
      const lv = busLevels(deps.speaking(), checkedDepth > 0);
      const master = new Fader(ctx, mutedNow ? 0 : 1, ctx.destination);
      g = { ctx, master, fx: new Fader(ctx, lv.fx, master.node), box: new Fader(ctx, lv.box, master.node), amb: new Fader(ctx, lv.amb, master.node) };
    }
    const m = muted();
    if (m !== mutedNow) {
      mutedNow = m;
      g.master.to(m ? 0 : 1, 0, MUTE_S);
    }
    return g;
  }

  /**
   * Down at once, up after a pause: speech and checked moments win, the sounds come back gently. Down or up is judged
   * against the level the bus has now, not where it was going: a background loop still held at 0 after a checked
   * moment keeps its 1.5 s when speech starts, instead of rising to the speech level at once.
   */
  function move(bus: Fader, target: number, now: number, down: number, after: number, back: number): void {
    if (target === bus.target) return;
    if (target < bus.valueAt(now)) bus.to(target, 0, down);
    else bus.to(target, after, back);
  }

  function apply(cause: 'speech' | 'checked'): void {
    const gr = graph();
    if (!gr) return;
    const now = gr.ctx.currentTime;
    const lv = busLevels(deps.speaking(), checkedDepth > 0);
    const afterHer = gr.fx.target === 0; // only Elizabeth puts the effects bus at 0
    move(gr.fx, lv.fx, now, FX_FADE_S, afterHer ? 0 : FX_BACK_AFTER_S, afterHer ? FX_SNAP_S : FX_BACK_S);
    move(gr.box, lv.box, now, BOX_DOWN_S, BOX_BACK_AFTER_S, BOX_BACK_S);
    const after = Math.max(AMB_BACK_AFTER_SPEECH_S, checkedEnded + AMB_BACK_AFTER_CHECKED_S - now);
    move(gr.amb, lv.amb, now, cause === 'checked' ? AMB_CHECKED_S : AMB_SPEECH_S, after, AMB_BACK_S);
  }

  function release(v: FxVoice, fade: number): void {
    if (!voices.delete(v)) return;
    v.out.to(0, 0, fade);
    try {
      v.src?.stop((g?.ctx.currentTime ?? 0) + fade + 0.01);
    } catch {
      // already stopped
    }
    setTimeout(() => v.out.node.disconnect(), (fade + 0.1) * 1000);
  }

  function cutFx(fade: number): void {
    for (const v of [...voices]) release(v, fade);
  }

  /** The graph an effect may start on now, or null when it is skipped: Elizabeth speaks, a story line plays and the
   * effect does not duck, the shared player is muted, or the clock does not run. */
  function effectGraph(duck: boolean): Graph | null {
    const who = deps.speaking();
    if (who === 'elizabeth' || (who === 'story' && !duck)) return null;
    const gr = graph();
    return gr && !mutedNow && running(gr.ctx) ? gr : null;
  }

  /** Keep a voice cuttable (Elizabeth's start, audio.stop()) until it has ended. */
  function keep(v: FxVoice, seconds: number): void {
    voices.add(v);
    setTimeout(() => {
      if (voices.delete(v)) setTimeout(() => v.out.node.disconnect(), 100);
    }, (seconds + 0.1) * 1000);
  }

  /** A synthesised effect on the effects bus; returns its length in seconds. */
  function synthVoice(gr: Graph, name: Sfx): number {
    const out = new Fader(gr.ctx, SYNTH_GAIN, gr.fx.node);
    const seconds = playSynth(gr.ctx, out.node, name, gr.ctx.currentTime + 0.01) + 0.01;
    keep({ out, src: null }, seconds);
    return seconds;
  }

  function syncLoop(): void {
    const id = wanted ? AMBIENCE_FILE[wanted] : null;
    if (loop && loop.id === id) return;
    const gr = graph();
    if (loop) {
      const old = loop;
      loop = null;
      old.gain.to(0, 0, AMB_CROSSFADE_S);
      try {
        old.src.stop((gr?.ctx.currentTime ?? 0) + AMB_CROSSFADE_S + 0.05);
      } catch {
        // already stopped
      }
      setTimeout(() => old.gain.node.disconnect(), (AMB_CROSSFADE_S + 0.2) * 1000);
    }
    const file = id ? files.get(id) : undefined;
    if (!gr || !id || !file) return;
    const { ctx } = gr;
    const w = loopWindow(file.buffer.duration, file.entry);
    const gain = new Fader(ctx, 0, gr.amb.node);
    gain.to(1, 0, AMB_CROSSFADE_S);
    const src = ctx.createBufferSource();
    src.buffer = file.buffer;
    src.loop = true;
    src.loopStart = w.start;
    src.loopEnd = w.end;
    src.connect(gain.node);
    src.start(ctx.currentTime, w.start);
    loop = { id, src, gain };
  }

  async function json(url: string): Promise<{ clips?: Record<string, SfxEntry> } | null> {
    try {
      const r = await get(url, { cache: 'no-cache' }); // a new pack must not wait for the browser cache
      return r.ok ? ((await r.json()) as { clips?: Record<string, SfxEntry> }) : null;
    } catch {
      return null;
    }
  }

  function fail(key: string): void {
    failed.set(key, { at: Date.now(), tries: (failed.get(key)?.tries ?? 0) + 1 });
  }

  /** Whether a failed load may be tried again now. */
  function due(key: string): boolean {
    const f = failed.get(key);
    return !!f && f.tries < MAX_TRIES && Date.now() - f.at >= RETRY_MS;
  }

  /** Whether the game may play this entry: a known id with a file, approved by Tjitse (or ?sfx=all). */
  function playable(id: string, entry: SfxEntry | undefined): entry is SfxEntry {
    return isKnown(id) && !!entry && typeof entry.file === 'string' && (entry.approved || listenAll);
  }

  /** Run one load at a time. */
  function run(job: () => Promise<void>): Promise<void> {
    const p: Promise<void> = job().finally(() => {
      if (busy === p) busy = null;
    });
    busy = p;
    return p;
  }

  async function loadFile(ctx: BaseAudioContext, id: string, entry: SfxEntry): Promise<void> {
    try {
      const r = await get(base + entry.file);
      if (!r.ok) throw new Error('HTTP error');
      files.set(id, { buffer: await decode(ctx, await r.arrayBuffer()), entry });
      failed.delete(id);
    } catch {
      fail(id);
      console.warn('[sound] cannot load ' + base + entry.file);
      return;
    }
    if (wanted && AMBIENCE_FILE[wanted] === id) syncLoop();
  }

  async function load(ctx: BaseAudioContext): Promise<void> {
    const m = await json(base + MANIFEST);
    if (!m) {
      fail(MANIFEST);
      console.warn('[sound] cannot load ' + base + MANIFEST);
      return;
    }
    failed.delete(MANIFEST);
    clips = m.clips ?? {};
    // The loops first, so the day sound starts as soon as it can.
    const list = Object.entries(clips).sort(([, a], [, b]) => Number(!!b?.loop) - Number(!!a?.loop));
    for (const [id, entry] of list) if (playable(id, entry)) await loadFile(ctx, id, entry);
  }

  /** Try a failed load again: the whole pack when the manifest failed, else the one file `id`. */
  function retry(id: string | null): void {
    const ctx = deps.context();
    if (!started || busy || !id || !ctx) return;
    if (!clips) {
      if (due(MANIFEST)) loading = run(() => load(ctx));
      return;
    }
    const entry = clips[id];
    if (!files.has(id) && playable(id, entry) && due(id)) void run(() => loadFile(ctx, id, entry));
  }

  function startTune(ms: number): { stop(): void } | null {
    const gr = graph();
    if (!gr) return null;
    const { ctx } = gr;
    const plan = tunePlan(ms);
    const out = new Fader(ctx, 1, gr.box.node);
    const began = Date.now();
    // The audio time of the tune's time 0. The notes go on the audio clock, which stands still while the context is
    // suspended; then nothing is scheduled, and when it runs again time 0 is set anew from the wall clock, so the tune
    // stays in step with the box's timer and still ends at `ms`.
    let t0: number | null = null;
    let i = 0;
    let stopped = false;
    let iv: ReturnType<typeof setInterval> | undefined;
    const pump = () => {
      if (!running(ctx)) {
        t0 = null;
        return;
      }
      const now = ctx.currentTime;
      const zero = (t0 ??= now + BOX_LEAD_S - (Date.now() - began) / 1000);
      while (i < plan.length && zero + plan[i].t < now + BOX_AHEAD_S) {
        const n = plan[i++];
        const at = zero + n.t;
        if (at >= now - 0.05) bell(ctx, out.node, n, at); // a timer that ran late skips notes, never piles them up
      }
      if (i >= plan.length) clearInterval(iv);
    };
    iv = setInterval(pump, BOX_PUMP_MS);
    pump();
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        clearInterval(iv);
        out.to(0, 0, BOX_STOP_S);
        setTimeout(() => out.node.disconnect(), (BOX_STOP_S + 0.1) * 1000);
      },
    };
  }

  return {
    /**
     * One effect. Skipped while Elizabeth speaks, and while a story line plays unless `duck`. Resolves at its end, at
     * most FX_WAIT_MS after it started, at once when it was skipped or has nothing to play.
     */
    fx(id: SfxFile, o: FxOpts = {}): Promise<void> {
      const file = files.get(id);
      if (!file) retry(id);
      const gr = effectGraph(!!o.duck);
      if (!gr) return Promise.resolve();
      let seconds: number;
      if (file) {
        const out = new Fader(gr.ctx, 1, gr.fx.node);
        const src = gr.ctx.createBufferSource();
        src.buffer = file.buffer;
        src.connect(out.node);
        src.start(gr.ctx.currentTime);
        seconds = file.buffer.duration;
        keep({ out, src }, seconds);
      } else if (o.fallback) {
        seconds = synthVoice(gr, o.fallback);
      } else {
        return Promise.resolve();
      }
      return wait(Math.min(seconds * 1000, FX_WAIT_MS));
    },
    /**
     * A synthesised effect (audio.sfx: tick, pop, chime and the others). The rule of fx(): skipped while Elizabeth
     * speaks or a letter sound plays, faded out when she starts. Under a story line it plays on the ducked bus (0.3).
     * Resolves at its end, at once when skipped.
     */
    synth(name: Sfx): Promise<void> {
      const gr = effectGraph(true);
      if (!gr) return Promise.resolve();
      return wait(synthVoice(gr, name) * 1000 + 50);
    },
    /** The background loop: day, night, or none. It fades over 2 s and keeps playing through audio.stop(). */
    ambience(kind: Ambience | null): void {
      wanted = kind;
      syncLoop();
      const id = kind ? AMBIENCE_FILE[kind] : null;
      if (id && !files.has(id)) retry(id);
    },
    /** A checked moment opens (true) or ends (false); while any is open the background loop is silent. Nests. */
    checked(on: boolean): void {
      const was = checkedDepth > 0;
      checkedDepth = Math.max(0, checkedDepth + (on ? 1 : -1));
      const is = checkedDepth > 0;
      if (was === is) return;
      if (!is) checkedEnded = graph()?.ctx.currentTime ?? -Infinity;
      apply('checked');
    },
    /** index.ts calls this whenever who speaks changes. Elizabeth's start cuts every effect that still sounds. */
    speakerChanged(): void {
      if (deps.speaking() === 'elizabeth') cutFx(FX_FADE_S);
      apply('speech');
    },
    /** audio.stop(): the effects stop; the background loop and the music box play on. */
    stopFx(): void {
      cutFx(STOP_FADE_S);
    },
    /** Load and decode the effects and the day loop. Call after the speech preloads. */
    preloadFx(): Promise<void> {
      const ctx = deps.context();
      if (!ctx) return Promise.resolve(); // no audio here (yet): a later call loads
      if (!started) {
        started = true;
        listenAll = !!deps.listenAll?.();
        loading = run(() => load(ctx));
      } else if (!clips && !busy && due(MANIFEST)) {
        loading = run(() => load(ctx));
      }
      return loading;
    },
    /**
     * The music box tune for `ms`, ending on its last note at `ms`; it goes down to 0.1 under speech. Its timer
     * resolves `done` at `ms` and ends the tune there, so nothing of it is left to play when a suspended context wakes
     * after the box. A box of no length (NaN, 0 or less) is silent and done at once.
     */
    musicBox(ms: number): MusicBox {
      const length = boxMs(ms);
      let resolve!: () => void;
      let over = false;
      const done = new Promise<void>((r) => (resolve = r));
      const tune = length > 0 ? startTune(length) : null;
      const finish = () => {
        tune?.stop();
        if (over) return;
        over = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, length);
      return { stop: finish, done };
    },
    /** For the test hook: the loop asked for, whether a checked moment silences it, who speaks, the loop playing. */
    state(): { ambience: Ambience | null; checked: boolean; speaker: Speaker | null; loop: string | null; files: number } {
      return { ambience: wanted, checked: checkedDepth > 0, speaker: deps.speaking(), loop: loop?.id ?? null, files: files.size };
    },
  };
}

export type Sound = ReturnType<typeof createSound>;
