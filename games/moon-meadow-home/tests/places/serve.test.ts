import { describe, expect, it } from 'vitest';
import {
  canonicalItem, createPlaceAdapter, logItems, mathsCarrier, requestFor, resultAction, toServed, type PlannerItem, type PlannerPick,
} from '../../src/places/serve.ts';
import { applyPlaceAction } from '../../src/core/places/actions.ts';
import { SCHEMA_VERSION, validateEvent } from '../../src/core/events.ts';
import { content } from '../../src/core/content/static.ts';
import { mulberry32 } from '../../src/core/rng.ts';
import { setup } from '../planner/setup.ts';
import { laneCtx, served } from './helpers.ts';

const items: Record<string, PlannerItem> = {
  'r:g:ai': { id: 'r:g:ai', kind: 'grapheme', gpc: 'ai' },
  'r:end:s': { id: 'r:end:s', kind: 'ending', ending: 's' },
  'r:end:none': { id: 'r:end:none', kind: 'ending', ending: 'none' },
  's:end:es': { id: 's:end:es', kind: 'ending', ending: 'es' },
  's:mark:q': { id: 's:mark:q', kind: 'mark', pattern: 'q' },
  's:t:was': { id: 's:t:was', kind: 'tricky', word: 'was' },
  'r:pre:un': { id: 'r:pre:un', kind: 'prefix', affix: 'un' },
  'm:pair:6-4': { id: 'm:pair:6-4', kind: 'bond' },
};
const deps = (r = 0.9) => ({ item: (id: string) => items[id], gpcText: (id: string) => id, plural: (w: string) => (w === 'fox' ? 'es' as const : 's' as const), rng: () => r });
const pick = (o: Partial<PlannerPick>): PlannerPick => ({ strand: 'r', step: 'R13', slot: 'current', moment: 'wish', items: ['r:g:ai'], carrier: { kind: 'word', word: 'rain' }, scaffold: 1, probe: false, ...o });

describe('planner adapter', () => {
  it('asks for the moments each place can host', () => {
    expect(requestFor('bath-pond', 'pond-word')).toEqual({ strand: 'r', moments: ['one-or-many', 'bath-wish'], place: 'bath-pond', tags: ['bath'] });
    expect(requestFor('toy-shelf', 'label')).toEqual({ strand: 's', moments: ['label', 'label-plural'], place: 'toy-shelf' });
    expect(requestFor('building', 'sum')).toEqual({ strand: 'm', moments: ['wall'], place: 'building' });
    expect(requestFor('post-box', 'fewest')?.moments).toEqual(['post-pin']);
    expect(requestFor('salon', 'salon-word')?.moments).toEqual(['salon-card']);
    expect(requestFor('nowhere', 'x')).toBeNull();
  });

  it('turns maths tasks into the carriers place code reads', () => {
    expect(mathsCarrier({ op: 'pair', a: 6, b: 4 })).toBe('6+4');
    expect(mathsCarrier({ op: 'missing', whole: 7, part: 4 })).toBe('4+3');
    expect(mathsCarrier({ op: 'add', a: 5, b: 3 })).toBe('5+3');
    expect(mathsCarrier({ op: 'compare', want: 'fewest' })).toBe('fewest');
    expect(mathsCarrier({ op: 'pattern', unit: 'ABB' })).toBe('ABB');
    expect(mathsCarrier({ op: 'take', a: 9, b: 5 })).toBeNull();
  });

  it('names items the way place code expects', () => {
    const g = (id: string) => id;
    expect(canonicalItem(items['r:g:ai'], g)).toBe('ai');
    expect(canonicalItem(items['s:end:es'], g)).toBe('-es');
    expect(canonicalItem(items['r:end:none'], g)).toBe('none');
    expect(canonicalItem(items['s:mark:q'], g)).toBe('mark-?');
    expect(canonicalItem(items['s:t:was'], g)).toBe('was');
    expect(canonicalItem(items['r:pre:un'], g)).toBe('un');
    expect(canonicalItem(undefined, g)).toBeNull();
  });

  it('serves a word, keeping the planner ids and the pick for the log', () => {
    const p = pick({});
    expect(toServed(p, deps(), 'meadow')).toEqual({ strand: 'r', step: 'R13', items: ['ai'], carrier: 'rain', scaffold: 1, probe: false, kind: 'current', log: ['r:g:ai'], pick: p, place: 'meadow' });
  });

  it('serves one or many with the right ending and count', () => {
    const many = toServed(pick({ step: 'R19', slot: 'school', items: ['r:end:s'], carrier: { kind: 'plural', word: 'fox', form: 'many', count: 4 } }), deps())!;
    expect(many).toMatchObject({ items: ['-es'], carrier: 'fox', count: 4, kind: 'school' });
    const one = toServed(pick({ step: 'R19', items: ['r:end:none'], carrier: { kind: 'plural', word: 'duck', form: 'one', count: 1 } }), deps())!;
    expect(one.items).toEqual(['none']);
    const jarOfOne = toServed(pick({ strand: 's', step: 'S10', items: ['s:end:es'], carrier: { kind: 'plural', word: 'fox', form: 'one', count: 1 } }), deps())!;
    expect(jarOfOne).toMatchObject({ items: ['-es'], count: 1 });
  });

  it('serves maths with the fact as the item', () => {
    const m = toServed(pick({ strand: 'm', step: 'M10', items: ['m:pair:6-4'], carrier: { kind: 'maths', task: { op: 'pair', a: 6, b: 4 } } }), deps())!;
    expect(m).toMatchObject({ carrier: '6+4', items: ['6+4'], log: ['m:pair:6-4'] });
  });

  it('asks for both directions of an R37 wish', () => {
    const p = pick({ step: 'R37', items: ['r:pre:un'], carrier: { kind: 'phrase', phrase: 'unpack-basket' } });
    expect(toServed(p, deps(0.9))!.items).toEqual(['un']);
    expect(toServed(p, deps(0.1))!.items).toEqual(['base']);
  });

  it('serves nothing for names, missing picks or carriers places cannot show', () => {
    expect(toServed(null, deps())).toBeNull();
    expect(toServed(pick({ strand: 'name' }), deps())).toBeNull();
    expect(toServed(pick({ carrier: { kind: 'door', n: 4 } }), deps())).toBeNull();
    expect(toServed(pick({ strand: 'm', step: 'M14', carrier: { kind: 'maths', task: { op: 'take', a: 9, b: 5 } } }), deps())).toBeNull();
  });

  it('logs own slots under their planner ids and the rest with the moment result', () => {
    const s = { ...served('s', 'S10', 'fox', ['-es']), log: ['s:end:es'] };
    const toId = (text: string) => (text === 'f' ? 's:g:f' : text === 'o' ? 's:g:o' : null);
    expect(logItems(s, [{ id: 'f', r: 'first' }, { id: 'o', r: 'miss' }, { id: '-es', r: 'first' }], 'miss', toId)).toEqual([
      { id: 's:g:f', r: 'first' }, { id: 's:g:o', r: 'miss' }, { id: 's:end:es', r: 'first' },
    ]);
    expect(logItems(s, [{ id: 'f', r: 'first' }], 'miss', toId)).toEqual([{ id: 's:g:f', r: 'first' }, { id: 's:end:es', r: 'miss' }]);
    expect(logItems(served('s', 'S10', 'fox', ['-es']), [{ id: '-es', r: 'first' }], 'first', toId)).toEqual([{ id: '-es', r: 'first' }]);
  });

  it('logs nothing for an item that did not come from the planner', () => {
    expect(resultAction(served('r', 'R13', 'rain', ['ai']), [], { result: 'first', ms: 900 }, null, () => null)).toBeNull();
  });
});

describe('the adapter on the real content', () => {
  const { c, ctx } = setup({ r: 'R13', s: 'S10', m: 'M10' }, { content });
  let seed = 7;
  const adapter = createPlaceAdapter({ ctx: () => ctx(), rng: () => mulberry32(seed++) });

  it('serves the toy shelf a label and logs it as a valid learn.result through learnResultPayload', () => {
    const s = adapter.serve('s', 'toy-shelf', 'label');
    expect(s).not.toBeNull();
    expect(s!.pick?.moment).toMatch(/^label/);
    const mine = s!.items.map((id) => ({ id, r: 'first' as const }));
    const a = adapter.resultAction(s!, mine, { result: 'first', ms: 2400 }, 'b1')!;
    expect(a.type).toBe('place/learn');
    const drafts = applyPlaceAction(a, laneCtx());
    expect(drafts).toHaveLength(1);
    const draft = { ...drafts[0], visit: 'v1', heart: false };
    const r = validateEvent({ id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION, ...draft });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(draft).toMatchObject({ type: 'learn.result', place: 'toy-shelf', strand: 's', baby: 'b1' });
    for (const it of (draft as unknown as { items: { id: string }[] }).items) expect(c.items[it.id], it.id).toBeDefined();
  });

  it('gives a wall fact to the building and nothing for a slot that is not a place slot', () => {
    const w = adapter.serve('m', 'building', 'sum');
    if (w) expect(w.carrier).toMatch(/^\d+\+\d+$/);
    expect(adapter.serve('r', 'toy-shelf', 'label')).toBeNull();
    expect(adapter.canServeSlot('toy-shelf', 'label')).toBe(true);
    expect(adapter.canServeSlot('nowhere', 'x')).toBe(false);
  });

  it('reads the learner as places do', () => {
    const v = adapter.learnerView();
    expect(v.current).toEqual({ r: 'R13', s: 'S11', m: 'M10' });   // S10 is a school step, so the current spelling step is S11
    expect(v.placementEnded).toEqual({ r: true, s: true, m: true });
    expect(v.reached('R05')).toBe(true);
    expect(v.reached('R30')).toBe(false);
    expect(adapter.spellStepNow()).toBe('S11');
    const plan = adapter.visitPlan();
    expect(plan.moments).toBeGreaterThanOrEqual(0);
    expect(adapter.wordViews().find((w) => w.word === 'fox')?.plural?.ending).toBe('es');
  });
});
