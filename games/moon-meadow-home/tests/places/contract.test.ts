// Every place sample action yields drafts that core's validator accepts (contracts C2).
// Master Task I-1 repeats this with a fully folded ctx; this lane test uses a hand-built one.
import { describe, expect, it } from 'vitest';
import { PAYLOAD_CHECKS, SCHEMA_VERSION, validateEvent } from '../../src/core/events.ts';
import { PLACE_SAMPLE_ACTIONS, applyPlaceAction } from '../../src/core/places/actions.ts';
import { laneCtx } from './helpers.ts';

/** The fields integration's finishDraft adds (master Task I-1). */
const finish = (d: Record<string, unknown>) => ({
  ...d,
  ...('visit' in ((PAYLOAD_CHECKS as Record<string, object>)[d.type as string] ?? {}) &&d.visit === undefined ? { visit: 'v1' } : {}),
  ...(d.type === 'learn.result' ? { baby: d.baby ?? null, heart: false } : {}),
  ...(d.type === 'care.done' ? { heart: true } : {}),
});
let seq = 0;
const stamp = (d: Record<string, unknown>) => ({ id: `abcdefgh:${++seq}`, hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION, ...d });

describe('place drafts match contracts C2', () => {
  it('has one sample per action type, including the ones integration names', () => {
    const types = PLACE_SAMPLE_ACTIONS.map((a) => a.type);
    expect(new Set(types).size).toBe(types.length);
    for (const t of ['place/idle', 'place/favourite', 'place/learn', 'place/setting']) expect(types).toContain(t);
    expect(PLACE_SAMPLE_ACTIONS.find((a) => a.type === 'place/idle')).toHaveProperty('level');
  });

  it('every sample action gives at least one draft, and every draft validates', () => {
    const ctx = laneCtx();
    expect(PLACE_SAMPLE_ACTIONS.length).toBeGreaterThan(0);
    for (const a of PLACE_SAMPLE_ACTIONS) {
      const drafts = applyPlaceAction(a, ctx);
      expect(drafts.length, a.type).toBeGreaterThan(0);
      for (const d of drafts) {
        expect(d, `${a.type} must leave visit to the router`).not.toHaveProperty('visit');
        const r = validateEvent(stamp(finish(d as Record<string, unknown>)));
        expect(r.ok, `${a.type}: ${JSON.stringify(r)}`).toBe(true);
      }
    }
  });
});
