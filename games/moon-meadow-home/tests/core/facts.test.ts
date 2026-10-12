import { describe, expect, it } from 'vitest';
import { FACT_KEYS } from '../../src/types/contracts.ts';
import { FACT_TYPES, factKey, factsSlice, isWinningFact, missingFacts } from '../../src/core/world/facts.ts';
import { createFolder } from '../../src/core/fold/engine.ts';
import { fakeDevice, pin } from '../helpers/events.ts';
import type { DraftOf, GameEventDraft } from '../../src/core/events.ts';

const momentPin = (baby: string, key: string): DraftOf<'pin.given'> => ({ type: 'pin.given', baby, pin: 'moon', kind: 'moment', set: null, key });

describe('recorded facts', () => {
  it('covers the same types as contracts FACT_KEYS', () => {
    expect([...FACT_TYPES].sort()).toEqual(Object.keys(FACT_KEYS).sort());
  });

  it('treats a pin with a key as a fact and a pin without one as a normal event', () => {
    expect(factKey(pin('b1', 'star-1'))).toBeNull();
    expect(factKey(momentPin('b1', 'first-bath'))).toBe('first-bath');
    const a = fakeDevice('aaaaaaaa');
    a.add([momentPin('b1', 'first-bath'), momentPin('b2', 'first-bath'), pin('b1', 'star-1')], 1000);
    const f = createFolder([factsSlice]).full(a.events);
    expect(Object.keys(f.state.facts['pin.given'])).toEqual(['first-bath']);
    expect(f.state.facts['pin.given']['first-bath'].payload.baby).toBe('b1');
    expect(isWinningFact(f.state.facts, a.events[0])).toBe(true);
    expect(isWinningFact(f.state.facts, a.events[1])).toBe(false);
    expect(isWinningFact(f.state.facts, a.events[2])).toBe(true);
  });

  it('lists only the missing facts, each key once', () => {
    const facts = factsSlice.init();
    const drafts: GameEventDraft[] = [
      { type: 'step.passed', strand: 'r', step: 'R01' }, { type: 'step.passed', strand: 'r', step: 'R01' },
      { type: 'novelty.given', item: 'kite' }, { type: 'settings.set', key: 'x', value: 1 },
    ];
    expect(missingFacts(facts, drafts)).toEqual([drafts[0], drafts[2]]);
  });
});
