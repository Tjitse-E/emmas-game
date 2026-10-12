import { describe, expect, it } from 'vitest';
import { apply, finishDraft } from '../../src/core/actions.ts';
import { applyPlaceAction } from '../../src/core/places/actions.ts';
import { applyGame } from '../../src/game/game-actions.ts';
import { fullCtx } from './ctx.ts';

const ctx = { visit: 'v7', heartedThisVisit: (b: string) => b === 'b2' };

describe('finishDraft', () => {
  it('adds the visit, the baby and the wish heart to a learn.result', () => {
    const d = finishDraft({ type: 'learn.result', strand: 'r', step: 'R19', carrier: 'hats', items: [{ id: 'r:end:s', r: 'first' }],
      result: 'first', ms: 900, scaffold: 1, error: null, place: 'wish', moment: 'one-or-many', slot: 'school', probe: false, baby: 'b1' } as never, ctx);
    expect(d).toMatchObject({ visit: 'v7', baby: 'b1', heart: true });
  });
  it('gives no heart for a result without a baby or outside a wish', () => {
    const base = { type: 'learn.result', strand: 'm', step: 'M10', carrier: 'egg', items: [], result: 'first', ms: 900, scaffold: 1,
      error: null, place: 'nest', slot: 'current', probe: false };
    expect(finishDraft({ ...base, moment: 'wish' } as never, ctx)).toMatchObject({ baby: null, heart: false });
    expect(finishDraft({ ...base, moment: 'egg-two-stone', baby: 'b1' } as never, ctx)).toMatchObject({ baby: 'b1', heart: false });
  });
  it('gives at most one care heart per baby per visit, and always one for roll call', () => {
    expect(finishDraft({ type: 'care.done', baby: 'b1', station: 'brush' } as never, ctx)).toMatchObject({ heart: true });
    expect(finishDraft({ type: 'care.done', baby: 'b2', station: 'brush' } as never, ctx)).toMatchObject({ heart: false });
    expect(finishDraft({ type: 'care.done', baby: 'b2', station: 'rollcall' } as never, ctx)).toMatchObject({ heart: true });
  });
  it('fills visit on visit-scoped events and leaves others alone', () => {
    expect(finishDraft({ type: 'place.enter', place: 'nest' } as never, ctx)).toEqual({ type: 'place.enter', place: 'nest', visit: 'v7' });
    expect(finishDraft({ type: 'title.given', title: 'nest-keeper' }, ctx)).toEqual({ type: 'title.given', title: 'nest-keeper' });
    expect(finishDraft({ type: 'name.built', visit: null, baby: null } as never, ctx)).toMatchObject({ visit: null });
  });
  it('the parent corner writes the contract setting keys (R39)', () => {
    expect(applyPlaceAction({ type: 'place/setting', key: 'skip-wish-after-three', value: true } as never, fullCtx()))
      .toEqual([{ type: 'settings.set', key: 'skip-wish-after-three', value: true }]);
  });
});

describe('apply', () => {
  it('routes each prefix to its translator and finishes the drafts', () => {
    const c = fullCtx();
    expect(apply({ type: 'game/enter', place: 'nest' }, c)).toEqual([{ type: 'place.enter', place: 'nest', visit: 'v1' }]);
    expect(apply({ type: 'hb.row-named', row: 2, name: 'Pip' }, c)).toEqual([{ type: 'row.named', row: 2, name: 'Pip' }]);
    expect(apply({ type: 'place/care', baby: 'b1', station: 'bath' }, c)).toEqual([{ type: 'care.done', baby: 'b1', station: 'bath', heart: true }]);
    expect(apply({ type: 'game/visit-end', reason: 'goodnight' }, c)).toEqual([{ type: 'visit.end', visit: 'v1', reason: 'goodnight' }]);
  });
  it('refuses an unknown prefix or game action', () => {
    expect(() => apply({ type: 'nope' }, fullCtx())).toThrow(/Unknown action/);
    expect(() => applyGame({ type: 'game/nope' }, fullCtx())).toThrow(/Unknown game action/);
  });
});
