// Every heartbeat and naming sample action yields drafts that core's validator accepts (contracts C2).
import { describe, expect, it } from 'vitest';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat } from '../../src/core/actions/heartbeat.ts';
import { NAMING_SAMPLE_ACTIONS, applyNaming } from '../../src/core/actions/naming.ts';

const VISIT_SCOPED = ['place.enter', 'place.leave', 'learn.result', 'learn.idle', 'name.built'];
/** The fields integration's finishDraft adds (master Task I-1). */
const finish = (d: Record<string, unknown>) => ({
  ...d,
  ...(VISIT_SCOPED.includes(d.type as string) && d.visit === undefined ? { visit: 'v1' } : {}),
  ...(d.type === 'learn.result' ? { baby: d.baby ?? null, heart: false } : {}),
  ...(d.type === 'care.done' ? { heart: true } : {}),
});
let seq = 0;
const stamp = (d: Record<string, unknown>) => ({ id: `abcdefgh:${++seq}`, hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION, ...d });

describe('heartbeat drafts match contracts C2', () => {
  const cases = [['hb', HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat], ['naming', NAMING_SAMPLE_ACTIONS, applyNaming]] as const;
  for (const [name, actions, apply] of cases) {
    it(name, () => {
      expect(actions.length).toBeGreaterThan(0);
      for (const a of actions) for (const d of apply(a as never)) {
        const r = validateEvent(stamp(finish(d as never)) as never);
        expect(r.ok, `${(a as { type: string }).type}: ${JSON.stringify(r)}`).toBe(true);
      }
    });
  }
});
