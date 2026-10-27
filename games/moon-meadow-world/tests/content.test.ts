// The content lane: the maths floor, the stones, the words, the names, the doors, and that every clip the level
// can say exists (an ok clip in a v3 pack or in the demo's own pack) or has a line waiting for gen.sh.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { EggSpec, HerdMember, UnicornLook } from '../src/contracts.ts';
import { LOOK_ALIKE, UNICORN_FOODS } from '../../moon-meadow-home/src/core/heartbeat/feed.ts';
import { SENTENCES, lineFor } from '../tools/lines.ts';

// src/assets.ts reads the page location when it loads.
vi.stubGlobal('location', { pathname: '/' });
const C = await import('../src/content/index.ts');
const { DATA } = await import('../src/content/data.ts');
const W = await import('../src/content/wishes.ts');

const here = resolve(import.meta.dirname, '..');
const v3 = resolve(here, '../moon-meadow-home');
const repo = resolve(here, '../..');
const SEEDS = 600;
const seeds = Array.from({ length: SEEDS }, (_, i) => i + 1);

interface Clip { ok?: boolean; file?: string; speaker?: string }
const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1', 'places'];
function clipsIn(dir: string): Map<string, Clip> {
  const path = join(dir, 'manifest.json');
  if (!existsSync(path)) return new Map();
  const clips = (JSON.parse(readFileSync(path, 'utf8')) as { clips: Record<string, Clip> }).clips;
  return new Map(Object.entries(clips).filter(([, c]) => c.ok === true && c.file && existsSync(join(dir, c.file))));
}
const v3Clips = new Map(V3_PACKS.flatMap((p) => [...clipsIn(join(v3, 'public/audio', p))]));
const ownDir = join(here, 'public/audio/v4demo');
const ownClips = clipsIn(ownDir);
const clipExists = (id: string): boolean => ownClips.has(id) || v3Clips.has(id);
const phonics = new Set(Object.keys(JSON.parse(readFileSync(join(repo, 'shared/audio/phonics/index.json'), 'utf8')).sounds));

const isVowel = (g: string): boolean => /^[aeiou]/.test(g);
/** The letters a grapheme list spells ('a-e' puts its e after the next grapheme). */
function spell(gpcs: string[]): string {
  let out = '';
  let e = false;
  for (const g of gpcs) {
    out += /^[a-z]-e$/.test(g) ? g[0] : g;
    if (e) { out += 'e'; e = false; }
    if (/^[a-z]-e$/.test(g)) e = true;
  }
  return e ? out + 'e' : out;
}
const SAME_SOUND = [['c', 'k', 'ck'], ['s', 'ss'], ['l', 'll'], ['f', 'ff'], ['z', 'zz']];
const sameSound = (a: string, b: string): boolean => a === b || SAME_SOUND.some((f) => f.includes(a) && f.includes(b));

function eggs(kind: 'warm' | 'snow'): EggSpec[] {
  return seeds.flatMap((s) => {
    const r = C.seeded(s);
    return [C.eggSpec(kind, r, { first: s % 2 === 0 }), C.eggSpec(kind, r)];
  });
}

describe('eggs', () => {
  it('the very first warm egg says how to drag a stone after its goal', () => {
    expect(C.eggSpec('warm', C.seeded(1), { first: true }).clips.afterGoal).toEqual(['g-stone']);
    expect(C.eggSpec('warm', C.seeded(1)).clips.afterGoal).toBeUndefined();
    expect(C.eggSpec('snow', C.seeded(1), { first: true }).clips.afterGoal).toBeUndefined();
  });

  it('every combination can come up', () => {
    for (const kind of ['warm', 'snow'] as const) {
      const seen = new Set(eggs(kind).map((e) => `${e.need}/${e.have}`));
      expect(seen.size).toBe(C.eggCombos(kind).length);
    }
  });

  it('says the right clips', () => {
    const [w] = eggs('warm').filter((e) => e.clips.intro.length);
    expect(w.clips.intro).toEqual(['g-egg']);
    expect(w.clips.goal).toEqual([`num-egg-${w.need}`, `num-warm-${w.have}`]);
    expect(w.clips.right[0]).toBe('fb-warm');
    expect(w.clips.tooBig(2)).toEqual(['fb-hot', 'num-over-2']);
    expect(w.clips.tooSmall(1)).toEqual(['fb-brr', 'num-cold-1']);
    expect(w.clips.hint).toEqual(['h-peek']);
    const [s] = eggs('snow').filter((e) => e.clips.intro.length);
    expect(s.clips.goal).toEqual([`num-egg-${s.need}`, `num-toowarm-${s.have}`, 'g4-snow']);
    expect(s.clips.right).toEqual(['fb4-just-right', `num-take-${s.have}-${s.answer}`]);
    expect(s.clips.tooBig(1)).toEqual(['fb-brr', 'num-over-1']);
    expect(s.clips.tooSmall(2)).toEqual(['fb-hot', 'num-still-warm-2']);
    expect(s.clips.hint).toEqual(['h4-count-extra']);
    for (const e of [...eggs('warm'), ...eggs('snow')]) {
      expect(e.clips.count).toEqual(Array.from({ length: e.answer }, (_, i) => `num-${i + 1}`));
      if (!e.clips.intro.length) expect(e.clips.intro).toEqual([]);
    }
    expect(eggs('warm').some((e) => e.clips.intro.length === 0)).toBe(true);
  });
});

describe('wishes', () => {
  const KINDS = ['dress', 'bath', 'picnic', 'food'] as const;
  const poolWords = [...new Set(KINDS.flatMap((k) => W.wishWords(k)))];

  it('every pool word obeys spec 4.3, is pictured and has its clip', () => {
    expect(poolWords.length).toBe(DATA.words.length);
    for (const w of poolWords) {
      expect(w.word.length).toBeLessThanOrEqual(5);
      expect(w.gpcs.filter(isVowel)).toHaveLength(1);
      expect(spell(w.gpcs)).toBe(w.word);
      for (const g of w.gpcs) expect(phonics.has(g)).toBe(true);
      expect(existsSync(join(v3, 'public/art/words', `${w.pic}.webp`))).toBe(true);
      expect(v3Clips.has(w.clip)).toBe(true);
    }
  });

  it('baskets hold 4 or 5 different things of their own pool, the target among them, no look-alikes', () => {
    for (const s of seeds) {
      for (const kind of KINDS) {
        const level = ((s % 3) + 1) as 1 | 2 | 3;
        const exclude = s % 4 === 0 ? W.wishTargets(kind, 2).slice(0, 3).map((w) => w.word) : [];
        const spec = C.wishSpec(kind, C.seeded(s), exclude, { level });
        const words = spec.basket.map((b) => b.word);
        const pool = W.wishWords(kind);
        expect(words).toHaveLength(spec.level === 1 ? 4 : 5);
        expect(new Set(words).size).toBe(words.length);
        expect(new Set(spec.basket.map((b) => b.pic)).size).toBe(words.length);
        expect(words).toContain(spec.target.word);
        expect(exclude).not.toContain(spec.target.word);
        for (const b of spec.basket) {
          const d = pool.find((w) => w.word === b.word)!;
          expect(d).toBeDefined();
          expect(b.pic).toBe(`/v3/art/words/${d.pic}.webp`);
          expect(b.tier).toBe(d.tier);
          for (const o of spec.basket) if (o !== b) expect(d.alike ?? []).not.toContain(o.word);
        }
        expect(Object.keys(spec.decoys).sort()).toEqual(words.filter((w) => w !== spec.target.word).sort());
        expect(spec.clips.right).toEqual(['fb-yes']);
        expect(spec.clips.hint).toEqual(['h-sounds']);
        expect(spec.clips.again).toEqual(['fb-letters']);
        expect(spec.clips.goal).toEqual(kind === 'food' ? ['g-hungry'] : ['g4-give']);
      }
    }
  });

  it('?contrast=0 drops clips.again, so a miss keeps v3\'s rule', () => {
    const spec = C.wishSpec('dress', C.seeded(1), [], { contrast: false });
    expect(spec.clips.again).toBeUndefined();
    expect(spec.clips.goal).toEqual(['g4-give']);
  });

  it('each item says how the baby takes it', () => {
    for (const s of seeds.slice(0, 100)) {
      for (const b of C.wishSpec('dress', C.seeded(s)).basket) expect(b.react).toBe('wear');
      for (const b of C.wishSpec('bath', C.seeded(s)).basket) expect(b.react).toBe('play');
      for (const b of C.wishSpec('picnic', C.seeded(s)).basket) expect(b.react).toBe(DATA.foods.includes(b.word) ? 'munch' : 'play');
      expect(C.wishSpec('food', C.seeded(s)).target.react).toBe('munch');
    }
    for (const w of ['plum', 'milk', 'tart', 'jam']) expect(W.reactOf('picnic', w)).toBe('munch');
    for (const w of ['mug', 'plate', 'mat', 'pan', 'spoon']) expect(W.reactOf('picnic', w)).toBe('play');
  });

  it('the free-play basket has four foods that look nothing alike', () => {
    const f = C.foods();
    expect(f.map((x) => x.word)).toEqual(['plum', 'corn', 'cake', 'peach']);
    for (const x of f) expect(UNICORN_FOODS).toContain(x.word);
    for (const x of f) expect(x.react).toBe('munch');
    const groups = f.map((x) => LOOK_ALIKE.findIndex((g) => g.includes(x.word))).filter((g) => g >= 0);
    expect(new Set(groups).size).toBe(groups.length);
  });
});

describe('names', () => {
  const herd: HerdMember[] = C.herd();

  it('the herd is 12 in doors 1 to 12: 8 babies, 4 foals, all four breeds, no two alike', () => {
    expect(herd.map((h) => h.door)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(herd.filter((h) => h.look.stage === 'baby')).toHaveLength(8);
    expect(herd.filter((h) => h.look.stage === 'foal')).toHaveLength(4);
    expect(new Set(herd.map((h) => h.look.breed))).toEqual(new Set(['moon', 'nestling', 'snow', 'berry']));
    expect(new Set(herd.map((h) => `${h.look.body}${h.look.mane}${h.look.mane2}`)).size).toBe(12);
    expect(new Set(herd.map((h) => h.id)).size).toBe(12);
    expect(new Set(herd.map((h) => h.name)).size).toBe(12);
    for (const h of herd) {
      expect(h.clip).toBe(`name-${h.name.toLowerCase()}`);
      expect(v3Clips.has(h.clip)).toBe(true);
      for (const c of [h.look.body, h.look.mane, h.look.mane2]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('a newborn looks like none of the herd and has its egg\'s breed', () => {
    const herdKeys = new Set(herd.map((h) => `${h.look.body}${h.look.mane}${h.look.mane2}`));
    for (const s of seeds) {
      const r = C.seeded(s);
      const warm: UnicornLook = C.babyLook('warm', r);
      const snow: UnicornLook = C.babyLook('snow', r, [warm]);
      expect(['nestling', 'berry', 'moon']).toContain(warm.breed);
      expect(snow.breed).toBe('snow');
      for (const l of [warm, snow]) {
        expect(l.stage).toBe('baby');
        expect(l.mane).not.toBe(l.mane2);
        expect(herdKeys.has(`${l.body}${l.mane}${l.mane2}`)).toBe(false);
      }
    }
  });

  it('bells are three short decodable names with clips and letter sounds, never a herd name or an excluded one', () => {
    const herdNames = new Set(herd.map((h) => h.name));
    for (const s of seeds) {
      const exclude = s % 2 ? ['Pip', 'Meg'] : [];
      const spec = C.namingSpec(C.seeded(s), exclude);
      expect(spec.bells).toHaveLength(3);
      expect(new Set(spec.bells.map((b) => b.name)).size).toBe(3);
      expect(new Set(spec.bells.map((b) => b.gpcs[0])).size).toBe(3);
      for (const b of spec.bells) {
        expect(herdNames.has(b.name)).toBe(false);
        expect(exclude).not.toContain(b.name);
        expect(b.gpcs.length).toBeGreaterThanOrEqual(3);
        expect(b.gpcs.length).toBeLessThanOrEqual(4);
        expect(b.gpcs.filter(isVowel)).toHaveLength(1);
        expect(spell(b.gpcs)).toBe(b.name.toLowerCase());
        expect(v3Clips.has(b.clip)).toBe(true);
        for (const g of [...b.gpcs, ...b.distractors]) expect(phonics.has(g.toLowerCase())).toBe(true);
        // Naming 1: a near capital for slot 1, a near vowel and a near consonant (2.2.md 3.1).
        expect(b.distractors).toHaveLength(3);
        expect(new Set(b.distractors).size).toBe(3);
        expect(b.distractors.filter(isVowel)).toHaveLength(1);
        const caps = b.distractors.filter((d) => d !== d.toLowerCase());
        expect(caps).toHaveLength(1);
        expect(caps[0].toLowerCase()).not.toBe(b.gpcs[0]);
        for (const d of b.distractors) for (const g of b.gpcs) expect(sameSound(d.toLowerCase(), g)).toBe(false);
      }
      expect(spec.clips).toEqual({
        bells: ['g-bells'], drag: ['g-bell-drag'], spell: ['g-spell'], gems: ['g-gems'], slide: ['g-slide'], done: ['fb-spelled'], again: ['fb-listen'],
      });
    }
  });
});

describe('doors', () => {
  const herd = C.herd();
  const pip = C.newborn({ name: 'Pip', gpcs: ['p', 'i', 'p'], clip: 'name-pip', distractors: [] }, C.babyLook('warm', C.seeded(1)), 13);
  const bud = C.newborn({ name: 'Bud', gpcs: ['b', 'u', 'd'], clip: 'name-bud', distractors: [] }, C.babyLook('snow', C.seeded(1)), 14);
  // At the visit both newborns have moved in: every door from 1 to 14 is occupied.
  const occupied = [...herd.map((h) => h.door), 13, 14];

  it('moving in says the name and the door', () => {
    expect(C.moveIn(pip)).toEqual(['name-pip', 'num-movein-13']);
    expect(C.moveIn(bud)).toEqual(['name-bud', 'num-movein-14']);
  });

  it('the visit asks an occupied teen door from 11 to 14 that is not its own', () => {
    for (const visitor of [pip, bud]) {
      const seen = new Set<number>();
      for (const s of seeds) {
        const v = C.doorVisit(visitor, occupied, C.seeded(s));
        expect(v.door).toBeGreaterThanOrEqual(11);
        expect(v.door).toBeLessThanOrEqual(14);
        expect(v.door).not.toBe(visitor.door);
        expect(occupied).toContain(v.door);
        expect(v.goal).toEqual([visitor.clip, `num-visit-${v.door}`]);
        expect(v.wrong(11)).toEqual(['num-that-11']);
        seen.add(v.door);
      }
      expect([...seen].sort((a, b) => a - b)).toEqual([11, 12, 13, 14].filter((d) => d !== visitor.door));
    }
    // The roll call's doors are avoided while another door is left.
    for (const s of seeds) expect(C.doorVisit(pip, occupied, C.seeded(s), [11, 12]).door).toBe(14);
    expect(C.doorVisit(pip, [11, 13], C.seeded(1), [11]).door).toBe(11);
  });

  it('roll call asks different doors from 7 to 12, never one excluded', () => {
    const seen = new Set<number>();
    for (const s of seeds) {
      const r = C.seeded(s);
      const calls = C.rollCall(herd.map((h) => h.door), r, 2, [9]);
      expect(calls).toHaveLength(2);
      expect(calls[0].door).not.toBe(calls[1].door);
      for (const c of calls) {
        expect(c.door).toBeGreaterThanOrEqual(7);
        expect(c.door).toBeLessThanOrEqual(12);
        expect(c.door).not.toBe(9);
        expect(c.goal).toEqual([`num-door-bed-${c.door}`]);
        expect(c.wrong(c.door + 1)).toEqual([`num-that-${c.door + 1}`]);
        seen.add(c.door);
      }
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([7, 8, 10, 11, 12]);
    expect(C.rollCall([7, 8], C.seeded(1), 5, [8]).map((c) => c.door)).toEqual([7]);
    expect(C.rollCall([13, 14], C.seeded(1), 2)).toEqual([]);
  });
});

describe('clips', () => {
  const all = new Set(C.allClipIds());

  it('every clip the level can use exists as an ok clip (v3 or the demo pack), or has a line for gen.sh', () => {
    // New lines are generated once, after all 2.2.0 lanes merge (docs/v4/2.2.md 7.3).
    const missing = [...all].filter((id) => !clipExists(id) && !lineFor(id));
    expect(missing).toEqual([]);
  });

  it('every clip any spec can say is in allClipIds', () => {
    const herd = C.herd();
    const used = new Set<string>([...herd.map((h) => h.clip), ...C.foods().map((f) => f.clip)]);
    for (const s of seeds) {
      const r = C.seeded(s);
      for (const kind of ['warm', 'snow'] as const) C.eggClipIds(C.eggSpec(kind, r, { first: true })).forEach((id) => used.add(id));
      const naming = C.namingSpec(r, []);
      C.namingClipIds(naming).forEach((id) => used.add(id));
      for (const kind of ['food', 'bath'] as const) C.wishClipIds(C.wishSpec(kind, r)).forEach((id) => used.add(id));
      const baby = C.newborn(naming.bells[0], C.babyLook('warm', r), 13);
      const baby2 = C.newborn(naming.bells[1], C.babyLook('snow', r), 14);
      C.moveIn(baby).forEach((id) => used.add(id));
      C.moveIn(baby2).forEach((id) => used.add(id));
      const calls = C.rollCall(herd.map((h) => h.door), r, 2);
      const occupied = [...herd.map((h) => h.door), 13, 14];
      const visits = [C.doorVisit(baby, occupied, r), C.doorVisit(baby2, occupied, r, calls.map((c) => c.door))];
      C.doorClipIds([...visits, ...calls]).forEach((id) => used.add(id));
    }
    for (const v of Object.values(C.CLIPS)) {
      if (Array.isArray(v)) v.forEach((id) => used.add(id));
    }
    for (const place of ['nest', 'pond', 'slide', 'wildEgg', 'stable'] as const) C.wayTo(place).forEach((id) => used.add(id));
    C.CLIPS.herdCount(14).forEach((id) => used.add(id));
    expect([...used].filter((id) => !all.has(id))).toEqual([]);
  });

  it('the right clip of every egg exists', () => {
    for (const kind of ['warm', 'snow'] as const) {
      for (const c of C.eggCombos(kind)) {
        const spec = C.eggSpec(kind, C.seeded(1));
        const id = kind === 'warm' ? `num-bond-${c.have}-${c.answer}` : `num-take-${c.have}-${c.answer}`;
        expect(clipExists(id), id).toBe(true);
        expect(clipExists(`num-egg-${c.need}`)).toBe(true);
        expect(clipExists(kind === 'warm' ? `num-warm-${c.have}` : `num-toowarm-${c.have}`)).toBe(true);
        expect(spec.clips.right[1]).toMatch(kind === 'warm' ? /^num-bond-/ : /^num-take-/);
      }
    }
    for (const id of ['g-stone', 'h-peek']) expect(v3Clips.has(id)).toBe(true);
  });

  it('miss lines exist for every k a stone of 3 to 9 can give', () => {
    for (const kind of ['warm', 'snow'] as const) {
      const e = C.eggSpec(kind, C.seeded(3));
      for (let k = 1; k <= 6; k++) for (const id of [...e.clips.tooBig(k), ...e.clips.tooSmall(k)]) expect(clipExists(id)).toBe(true);
    }
  });

  it('the demo pack follows the voice rules and never shadows a v3 clip', () => {
    const lines = JSON.parse(readFileSync(join(ownDir, 'lines.json'), 'utf8')).lines as { id: string; speaker: string; text: string }[];
    for (const l of [...lines, ...SENTENCES]) {
      expect(l.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(v3Clips.has(l.id)).toBe(false);
      expect(l.speaker).toBe(l.id.startsWith('lumi4-') ? 'queen' : 'narrator');
      expect(l.text).not.toMatch(/\d/);
    }
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    expect(new Set(SENTENCES.map((l) => l.id)).size).toBe(SENTENCES.length);
  });

  it('every letter sound the moments can play exists', () => {
    for (const g of C.allGraphemes()) expect(phonics.has(g)).toBe(true);
  });
});
