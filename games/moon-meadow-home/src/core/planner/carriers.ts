// G/src/core/planner/carriers.ts
// The carrier for one item at one moment kind: the word, plural, twin, spelling focus, maths task, door or
// phrase a scene shows, and which items the moment logs. Never a carrier whose picture or clip is missing.
import type { Content, GpcId, Item, ItemId, MomentKind, StepId, Word } from '../content/types.ts';
import { splitUsual } from '../content/gpc.ts';
import { isPassedStep, isPlacedStep, knownSteps, spellingKnowledge } from '../learning/status.ts';
import type { Rng } from '../rng.ts';
import { shuffle } from '../rng.ts';
import type { Carrier, CarrierChoice, ItemRequest, PlanContext } from './types.ts';
import { visitRange } from './visit.ts';

const MATHS_MOMENTS: readonly MomentKind[] = ['post-sash', 'parcel', 'trim', 'beads', 'post-pin', 'wall'];
const DOOR_MOMENTS: readonly MomentKind[] = ['door-visit', 'roll-call-door'];
const PHRASE_MOMENTS: readonly MomentKind[] = ['note', 'tricky-act', 'basket-and', 'basket-adj', 'salon-card', 'asking-bubble', 'two-state-wish'];
const WORD_ITEM_KINDS: readonly string[] = ['grapheme', 'cluster', 'pattern'];
const LABEL_ITEM_KINDS: readonly string[] = ['grapheme', 'cluster', 'pattern', 'suffix', 'prefix', 'pair'];

export function carrierKey(c: Carrier): string {
  switch (c.kind) {
    case 'word': return c.word;
    case 'plural': return `${c.word}:${c.form}`;
    case 'twin': return `${c.words[0]}|${c.words[1]}`;
    case 'spell': return `spell:${c.focus.join('+')}`;
    case 'first-sound': return `fs:${c.gpc}`;
    case 'maths': {
      const { op, ...rest } = c.task as { op: string } & Record<string, unknown>;
      return `m:${op}:${Object.values(rest).join(',')}`;
    }
    case 'door': return `door:${c.n}`;
    case 'phrase': return c.phrase;
    case 'letters': return c.letters.join('');
    case 'name': return c.babyId;
  }
}

/** Per-call memo so one nextItem call computes known steps and spelling knowledge once. */
export type CarrierCache = { known: Map<string, Record<StepId, true>>; own: GpcId[] | null };
export const newCarrierCache = (): CarrierCache => ({ known: new Map(), own: null });

type Env = { ctx: PlanContext; req: ItemRequest; rng: Rng; cache: CarrierCache };

function known(env: Env, step: StepId, assumeBelow: boolean): Record<StepId, true> {
  const key = `${step}|${assumeBelow ? 1 : 0}`;
  let k = env.cache.known.get(key);
  if (!k) {
    k = knownSteps(env.ctx.l, env.ctx.c, 'r', step, assumeBelow);
    env.cache.known.set(key, k);
  }
  return k;
}

function ownGpcs(env: Env): GpcId[] {
  env.cache.own ??= spellingKnowledge(env.ctx.l, env.ctx.c).own;
  return env.cache.own;
}

function needs(c: Content, moment: MomentKind): { pic: boolean; clip: boolean } {
  const n = c.moments[moment]?.needs ?? [];
  return { pic: n.includes('pic'), clip: n.includes('clip') };
}

/** A word can carry the moment: right kind, picture and clip as the moment needs, the place's tags. */
function wordShown(env: Env, w: Word | undefined, moment: MomentKind, clip: string | null, kind: Word['kind'] = 'thing'): w is Word {
  if (!w || w.kind !== kind) return false;
  const { c, assets } = env.ctx;
  const n = needs(c, moment);
  if (n.pic && (w.pic === null || !assets.picture(w.pic))) return false;
  // A word carrier always needs its clip: Elizabeth says the word after the act (Review Focus 3).
  if (clip === null || !assets.clip(clip)) return false;
  const tags = moment === 'bath-wish' ? [...(env.req.tags ?? []), 'bath'] : env.req.tags ?? [];
  if (tags.length > 0 && !(w.tags ?? []).some(t => tags.includes(t))) return false;
  return true;
}

/** She can read every reading item of the word. */
function readable(env: Env, w: Word, step: StepId, assumeBelow: boolean): boolean {
  if (w.rStep === null) return false;
  const k = known(env, step, assumeBelow);
  return w.rItems.every(id => k[env.ctx.c.items[id]?.step ?? ''] === true);
}

/** Fresh candidates first, then those shown recently or avoided, each group in random order. */
function ordered<T>(env: Env, xs: T[], key: (x: T) => string | string[]): T[] {
  const recent = new Set([...env.ctx.l.visit.recent, ...(env.req.avoid ?? [])]);
  const isRecent = (x: T) => { const k = key(x); return (Array.isArray(k) ? k : [k]).some(s => recent.has(s)); };
  const fresh = xs.filter(x => !isRecent(x));
  const stale = xs.filter(x => isRecent(x));
  return [...shuffle(fresh, env.rng), ...shuffle(stale, env.rng)];
}

function wordsFor(c: Content, item: ItemId): Word[] {
  return (c.wordsByItem[item] ?? []).map(w => c.words[w]).filter((w): w is Word => w !== undefined);
}

function wishChoices(env: Env, step: StepId, it: Item, moment: MomentKind, assumeBelow: boolean, kind: Word['kind']): CarrierChoice[] {
  const { c } = env.ctx;
  if (!WORD_ITEM_KINDS.includes(it.kind)) return [];
  const ws = wordsFor(c, it.id).filter(w => wordShown(env, w, moment, w.clip, kind) && readable(env, w, step, assumeBelow));
  return ordered(env, ws, w => w.w).map(w => ({
    carrier: { kind: 'word', word: w.w },
    items: w.rItems.filter(id => c.items[id]?.step === step),
  }));
}

function oneOrManyChoices(env: Env, step: StepId, it: Item, moment: MomentKind, assumeBelow: boolean): CarrierChoice[] {
  const { c } = env.ctx;
  if (it.kind !== 'ending' || !it.ending) return [];
  const ending = it.ending;
  const ws = Object.values(c.words).filter(w => {
    if (!w.plural) return false;
    if (ending !== 'none' && w.plural.ending !== ending) return false;
    const clip = ending === 'none' ? w.clip : w.pluralClip;
    return wordShown(env, w, moment, clip) && readable(env, w, step, assumeBelow);
  });
  const form: 'one' | 'many' = ending === 'none' ? 'one' : 'many';
  return ordered(env, ws, w => `${w.w}:${form}`).map(w => ({
    carrier: { kind: 'plural', word: w.w, form, count: form === 'one' ? 1 : 3 + Math.floor(env.rng() * 3) },
    items: [it.id],
  }));
}

function twinChoices(env: Env, step: StepId, it: Item, moment: MomentKind, assumeBelow: boolean): CarrierChoice[] {
  const { c } = env.ctx;
  if (it.kind !== 'pair' || !it.pair) return [];
  const pair = it.pair;
  const ok = (word: string) => {
    const w = c.words[word];
    return wordShown(env, w, moment, w?.clip ?? null) && readable(env, w, step, assumeBelow);
  };
  const ts = (c.twins[pair] ?? []).filter(t => ok(t.a) && ok(t.b));
  return ordered(env, ts, t => [`${t.a}|${t.b}`, `${t.b}|${t.a}`]).map(t => {
    const words: [string, string] = env.rng() < 0.5 ? [t.a, t.b] : [t.b, t.a];
    return { carrier: { kind: 'twin', pair, words }, items: [it.id], pair };
  });
}

function pairWords(c: Content, pairId: string): Word[] {
  const p = c.pairs[pairId];
  if (!p) return [];
  return Object.values(c.words).filter(w => w.gpcs.some((g, i) => p.gpcs.includes(g) && (
    p.position === 'any' || (p.position === 'initial' && i === 0) || (p.position === 'final' && i === w.gpcs.length - 1))));
}

function labelChoices(env: Env, it: Item, moment: MomentKind): CarrierChoice[] {
  const { c } = env.ctx;
  if (!LABEL_ITEM_KINDS.includes(it.kind)) return [];
  const pair = it.kind === 'pair' ? it.pair : undefined;
  const pool = pair !== undefined ? pairWords(c, pair) : wordsFor(c, it.id);
  const ws = pool.filter(w => wordShown(env, w, moment, w.clip));
  const own = ownGpcs(env);
  const outside = (w: Word) => w.gpcs.filter(g => !own.includes(g)).length;
  // Fresh words first, then the fewest letters she does not own yet, then random.
  const recent = new Set([...env.ctx.l.visit.recent, ...(env.req.avoid ?? [])]);
  const sorted = shuffle(ws, env.rng)
    .map((w, i) => ({ w, i, r: recent.has(w.w) ? 1 : 0, o: outside(w) }))
    .sort((a, b) => a.r - b.r || a.o - b.o || a.i - b.i)
    .map(x => x.w);
  return sorted.map(w => ({ carrier: { kind: 'word', word: w.w }, items: [it.id], ...(pair !== undefined ? { pair } : {}) }));
}

function labelPluralChoices(env: Env, it: Item, moment: MomentKind, scaffold: 1 | 2 | 3): CarrierChoice[] {
  const { c } = env.ctx;
  if (it.kind !== 'ending' || (it.ending !== 's' && it.ending !== 'es')) return [];
  const ending = it.ending;
  const ws = Object.values(c.words).filter(w => w.plural?.ending === ending && wordShown(env, w, moment, w.pluralClip));
  return ordered(env, ws, w => [`${w.w}:one`, `${w.w}:many`]).map(w => {
    let count = 3;
    if (scaffold === 3) count = env.rng() < 0.25 ? 1 : 2 + Math.floor(env.rng() * 4);
    const form: 'one' | 'many' = count === 1 ? 'one' : 'many';
    return { carrier: { kind: 'plural', word: w.w, form, count }, items: [it.id] };
  });
}

function spellFocus(c: Content, it: Item, moment: MomentKind): GpcId[] | null {
  const sign = moment === 'sign';
  switch (it.kind) {
    case 'grapheme': return it.gpc ? [it.gpc] : null;
    case 'cluster': return it.cluster ? splitUsual(it.cluster.replace(/-/g, ''), c.gpcs) : null;
    case 'capital': return sign ? null : [];
    case 'suffix': case 'prefix': {
      if (!sign) return null;
      const affix = it.affix ?? it.id.split(':').pop() ?? '';
      return splitUsual(affix, c.gpcs);
    }
    case 'pattern': return sign && (it.pattern === 'compound' || it.id.endsWith(':compound')) ? [] : null;
    default: return null;
  }
}

function mathsChoices(env: Env, it: Item, moment: MomentKind): CarrierChoice[] {
  if (!it.task) return [];
  if (DOOR_MOMENTS.includes(moment)) {
    const doors = env.req.doors;
    if (!doors || it.task.op !== 'numeral') return [];
    const n = it.task.n;
    const range = visitRange(env.ctx.l, env.ctx.c);
    if (!range || n < range[0] || n > range[1] || n > doors.built || n === doors.own) return [];
    return [{ carrier: { kind: 'door', n }, items: [it.id] }];
  }
  return [{ carrier: { kind: 'maths', task: it.task }, items: [it.id] }];
}

const stripSize = (id: string): string => id.replace(/@(big|tiny)$/, '');

function phraseChoices(env: Env, step: StepId, it: Item, moment: MomentKind): CarrierChoice[] {
  const { c, l, assets } = env.ctx;
  const n = needs(c, moment);
  const ps = (c.phrasesByItem[it.id] ?? []).map(id => c.phrases[id]).filter(p => {
    if (!p || !p.loaded || p.moment !== moment) return false;
    if (!p.words.every(w => { const pic = c.words[w]?.pic ?? null; return pic !== null && assets.picture(pic); })) return false;
    const act = p.act;
    const pics: string[] = act.kind === 'give' ? [...act.target, ...act.options]
      : act.kind === 'toggle' || act.kind === 'his-her' || act.kind === 'put' ? [act.thing] : [];
    if (!pics.every(id => assets.picture(stripSize(id)))) return false;
    if (n.clip && (p.clipId === null || !assets.clip(p.clipId))) return false;
    return true;
  });
  return ordered(env, ps, p => p.id).map(p => ({
    carrier: { kind: 'phrase', phrase: p.id },
    items: p.items.filter(id => {
      const s = c.items[id]?.step;
      return s !== undefined && (s === step || isPassedStep(l, s) || isPlacedStep(l, c, s));
    }),
  }));
}

/** Every usable carrier for one item at one moment, best first. */
export function carrierChoices(
  ctx: PlanContext, step: StepId, item: ItemId, moment: MomentKind, scaffold: 1 | 2 | 3, rng: Rng, req: ItemRequest,
  assumeBelow = false, cache: CarrierCache = newCarrierCache(),
): CarrierChoice[] {
  const { c } = ctx;
  const it = c.items[item];
  const m = c.moments[moment];
  if (!it || !m || it.step !== step) return [];
  const env: Env = { ctx, req, rng, cache };
  switch (moment) {
    case 'wish': case 'bath-wish': return wishChoices(env, step, it, moment, assumeBelow, 'thing');
    case 'station-wish': return wishChoices(env, step, it, moment, assumeBelow, 'station');
    case 'one-or-many': return oneOrManyChoices(env, step, it, moment, assumeBelow);
    case 'twin-wish': return twinChoices(env, step, it, moment, assumeBelow);
    case 'label': return labelChoices(env, it, moment);
    case 'label-plural': return labelPluralChoices(env, it, moment, scaffold);
    case 'naming-bells': case 'naming-garden': case 'sign': {
      const focus = spellFocus(c, it, moment);
      return focus ? [{ carrier: { kind: 'spell', focus }, items: [it.id] }] : [];
    }
    case 'first-sound':
      return it.kind === 'first-sound' && it.gpc ? [{ carrier: { kind: 'first-sound', gpc: it.gpc }, items: [it.id] }] : [];
    default: break;
  }
  if (m.egg || MATHS_MOMENTS.includes(moment) || DOOR_MOMENTS.includes(moment)) return mathsChoices(env, it, moment);
  if (PHRASE_MOMENTS.includes(moment)) {
    const ph = phraseChoices(env, step, it, moment);
    // A Salon card for a word item may show the word itself when no phrase fits.
    if (ph.length === 0 && moment === 'salon-card') return wishChoices(env, step, it, moment, assumeBelow, 'thing');
    return ph;
  }
  return [];
}

export function carrierFor(
  ctx: PlanContext, step: StepId, item: ItemId, moment: MomentKind, scaffold: 1 | 2 | 3, rng: Rng, req: ItemRequest,
  assumeBelow = false,
): CarrierChoice | null {
  return carrierChoices(ctx, step, item, moment, scaffold, rng, req, assumeBelow)[0] ?? null;
}
