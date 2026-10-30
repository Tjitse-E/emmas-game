// Step 0 of 2.4.0 (docs/v4/2.4-plan.md Task 0): the contracts every lane builds on. The bedtime constant, the 51 new
// lines with their speakers and texts, the address options, the report fields (the kind=play line under 400
// characters with every new field, the kind=hub line, pn on result lines), the star egg's fact and clips, and the sign
// fold. The lanes fill the bodies; these names and shapes stay.
import { describe, expect, it, vi } from 'vitest';
import type { Outcome } from '../src/contracts';
import { BEDTIME_MS } from '../src/game/hub';
import { lineFor } from '../tools/lines';
import { parseOptions, resolveStart } from '../src/game/options';
import { DIAG_MAX, type PlayLine, diagQuery, hubFields, playFields, resultFields } from '../src/game/results';
import { type ReadingState, foldReading, foldSigns } from '../src/game/reading';
import { GIFT_SETS } from '../src/wardrobe';

// src/assets.ts reads the page location when it loads (the sign words' pictures).
vi.stubGlobal('location', { pathname: '/' });
const { eggSums, factClip } = await import('../src/content/eggs');
const { seeded } = await import('../src/content/rand');
const { allClipIds } = await import('../src/content/clips');

const RUN_A: Record<string, [string, string]> = {
  'g4-pick': ['narrator', 'Where do you want to go? Tap a bubble!'],
  'g4-soon-bed': ['narrator', 'Soon it is bedtime!'],
  'g4-way-picnic': ['narrator', 'The picnic is this way.'],
  'g4-way-beads': ['narrator', 'The bead tree is this way.'],
  'g4-way-rack': ['narrator', 'The hay rack is this way.'],
  'g4-way-wish': ['narrator', 'The baby with a wish is this way.'],
  'lumi4-ducks': ['queen', 'The ducks are having their swim!'],
};
const WORDS = ['sand', 'stump', 'swing', 'stone', 'shed', 'ship', 'shell', 'barn', 'bench', 'beach', 'pond', 'pool', 'pines'];
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const RUN_B: Record<string, [string, string]> = {
  'g4-way-saddle': ['narrator', 'The saddle is this way.'],
  'lumi4-saddle': ['queen', 'The saddle is ready! Now you can ride.'],
  'g4-saddle': ['narrator', 'Tap the saddle, and ride!'],
  'g4-signs': ['narrator', 'Read the signs. Then tap the right one.'],
  'g4-ride-home': ['narrator', 'Time to ride home!'],
  'g4-star-egg': ['narrator', 'A star egg! The moon has stars for it.'],
  'g4-more-moon': ['narrator', 'How many more has the moon?'],
  'g4-fewer-egg': ['narrator', 'How many fewer has the egg?'],
  'h4-line-up': ['narrator', "Let's line up the stars."],
  ...Object.fromEntries(['bella', 'hazel'].flatMap((m) => WORDS.map((w) => [`g4-go-${m}-${w}`, ['narrator', `${m[0].toUpperCase()}${m.slice(1)} wants to go to the ${w}.`]]))),
  ...Object.fromEntries([7, 8, 9, 10].map((n) => [`num-moon-${n}`, ['narrator', `The moon has ${NUM[n]} stars.`]])),
  ...Object.fromEntries([3, 4, 5, 6, 7].map((n) => [`num-eggstar-${n}`, ['narrator', `The egg has ${NUM[n]} stars.`]])),
};

/** Every 2.3 field at its longest, the place order with 17 places, and every new number at 4 digits. */
const LONGEST_PLAY: PlayLine = {
  v: '2.4.0', plays: 9999, playMs: 99.9 * 60_000, checkedMs: 9_999_000, mirrorMs: 4_999_000, cornerDressMs: 4_999_000, cornerMs: 9_999_000,
  freeMs: 9_999_000, gate: { kind: 'phrase', first: 2 }, quests: ['picnic', 'rack', 'beads', 'corner'],
  gifts: Object.values(GIFT_SETS).flatMap((s) => [...s.items]), reading: 3, phrases: 3, band: 'b', patterns: 3,
  nr: 9999, ns: 9999, nm: 9999, r1: 9999, s1: 9999, m1: 9999, sq: 'e,o,s,o,w,o,p,o,b,o,r,o,r,o,w,c,o', pondVisits: 9999, pondMs: 9_999_000,
  rideMs: 9_999_000, bedtimeMin: 99.9, babies: 9999, signs: 3,
};

describe('the 2.4 contracts', () => {
  it('BEDTIME_MS is 30 minutes', () => expect(BEDTIME_MS).toBe(1_800_000));

  it('has the 51 new lines with their speakers and texts', () => {
    for (const [id, [speaker, text]] of Object.entries({ ...RUN_A, ...RUN_B })) expect(lineFor(id), id).toMatchObject({ speaker, text });
    expect(Object.keys(RUN_A)).toHaveLength(7);
    expect(Object.keys(RUN_B)).toHaveLength(44);
    const chars = (r: Record<string, [string, string]>) => Object.keys(r).reduce((n, id) => n + lineFor(id)!.text.length, 0);
    expect([chars(RUN_A), chars(RUN_B)]).toEqual([196, 1266]);
  });

  it('parses the 2.4 address options', () => {
    const o = parseOptions('?at=hub&place=ride&step=sign2&babies=4&bed=90&sign=3&mount=hazel');
    expect(o).toMatchObject({ at: 'hub', place: 'ride', step: 'sign2', babies: 4, bedMs: 90_000, signLevel: 3, mount: 'hazel' });
    expect(parseOptions('?at=free&quest=rack')).toMatchObject({ place: 'rack', quest: 'rack' });
    expect(parseOptions('?babies=5&bed=0&sign=4&mount=luna')).toMatchObject({ babies: null, bedMs: null, signLevel: null, mount: null });
  });

  it('keeps 2.3.3\'s parts in step 0: the hub and free play give free, an egg place its egg part', () => {
    const at = (s: string) => resolveStart(parseOptions(s));
    expect(at('')).toBeNull();
    expect(at('?at=hub')).toEqual({ part: 'free', place: null, step: null, done: [] });
    expect(at('?at=hub&place=egg&step=naming')).toMatchObject({ part: 'naming1', place: 'egg', step: 'naming' });
    expect(at('?at=hub&place=shore&step=wish')).toMatchObject({ part: 'wish2', place: 'shore', step: 'wish' });
    expect(at('?at=hub&place=pond')).toMatchObject({ part: 'pond', place: 'pond' });
    expect(at('?at=free&quest=corner')).toMatchObject({ part: 'free', place: 'corner' });
    expect(at('?at=hub&place=ride')).toMatchObject({ part: 'free', place: 'ride' });
    expect(at('?at=egg2')).toMatchObject({ part: 'egg2', place: 'shore', done: [] });
    expect(at('?at=bedtime')?.part).toBe('bedtime');
  });

  it('keeps the kind=play line under 400 characters with every new field at its longest', () => {
    const q = diagQuery(playFields(LONGEST_PLAY));
    expect(q.length).toBeLessThanOrEqual(DIAG_MAX);
    for (const k of ['nr', 'ns', 'nm', 'r1', 's1', 'm1', 'sq', 'pv', 'po', 'ri', 'bt', 'bb', 'sg']) expect(q).toContain(`&${k}=`);
    expect(q.indexOf('&sq=')).toBeLessThan(q.indexOf('&gf='));
  });

  it('has the kind=hub line and pn on result lines, pl still the answer\'s place', () => {
    expect(diagQuery(hubFields({ v: '2.4.0', pn: 3, p: 'r', n: 2, min: 25.9, t: 306, ck: 140 }))).toBe('kind=hub&v=2.4.0&pn=3&p=r&n=2&min=25.9&t=306&ck=140');
    const f = resultFields({ part: 'egg-nest', strand: 'm', outcome: 'first', misses: 0, ms: 900, pn: 3, detail: { stones: [3, 4, 5, 6], place: 2 } });
    expect(f).toMatchObject({ pn: 3, pl: 2 });
  });

  it('says the star egg\'s own fact, num-take-<moon>-<egg>, after every right stone, and lists every star clip', () => {
    expect(factClip('star', { need: 5, have: 9, answer: 4 })).toBe('num-take-9-5');
    expect(factClip('snow', { need: 5, have: 9, answer: 4 })).toBe('num-take-9-4');
    for (let s = 1; s <= 200; s++) for (const x of eggSums('star', seeded(s))) expect(x.clips.right.at(-1)).toBe(`num-take-${x.have}-${x.need}`);
    const ids = allClipIds();
    for (const id of ['g4-star-egg', 'g4-more-moon', 'h4-line-up', 'num-moon-7', 'num-eggstar-7', 'g4-go-hazel-pines']) expect(ids, id).toContain(id);
  });

  it('folds sign outcomes as the reading level folds', () => {
    const s: ReadingState = { level: 1, recent: [] };
    expect(foldSigns(s, ['first', 'first', 'first'])).toEqual(['first', 'first', 'first'].reduce((a, o) => foldReading(a, o as Outcome), s));
  });
});
