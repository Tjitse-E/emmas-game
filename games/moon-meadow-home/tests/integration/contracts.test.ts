// Every translator's sample drafts, finished by the router, must pass core's validator (master Review Focus 1).
import { describe, expect, it } from 'vitest';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { finishDraft } from '../../src/core/actions.ts';
import { HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat } from '../../src/core/actions/heartbeat.ts';
import { NAMING_SAMPLE_ACTIONS, applyNaming } from '../../src/core/actions/naming.ts';
import { PLACE_SAMPLE_ACTIONS, applyPlaceAction } from '../../src/core/places/actions.ts';
import { GAME_SAMPLE_ACTIONS, applyGame } from '../../src/game/game-actions.ts';
import { fullCtx } from './ctx.ts';

let seq = 0;
const stampOne = (d: Record<string, unknown>) => ({ id: `abcdefgh:${++seq}`, hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION, ...d });

describe('every translator emits valid events', () => {
  const ctx = fullCtx();
  const cases: [string, readonly unknown[], (a: never) => unknown[]][] = [
    ['heartbeat', HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat as never],
    ['naming', NAMING_SAMPLE_ACTIONS, applyNaming as never],
    ['places', PLACE_SAMPLE_ACTIONS, ((a: never) => applyPlaceAction(a, ctx)) as never],
    ['game', GAME_SAMPLE_ACTIONS, ((a: never) => applyGame(a, ctx)) as never],
  ];
  for (const [name, actions, run] of cases) {
    it(name, () => {
      expect(actions.length).toBeGreaterThan(0);
      for (const a of actions) {
        const drafts = run(a as never);
        expect(drafts.length, `${name} ${(a as { type: string }).type} gives no draft`).toBeGreaterThan(0);
        for (const d of drafts) {
          const r = validateEvent(stampOne(finishDraft(d as never, ctx) as never));
          expect(r.ok, `${name} ${(a as { type: string }).type}: ${JSON.stringify(r)}`).toBe(true);
        }
      }
    });
  }

  it('the sample lists hold the actions the master plan names', () => {
    const types = [...HEARTBEAT_SAMPLE_ACTIONS, ...PLACE_SAMPLE_ACTIONS].map((a) => a.type);
    for (const t of ['place/idle', 'place/favourite', 'place/learn', 'hb.decor', 'hb.learn', 'hb.test-hatch']) expect(types).toContain(t);
  });
});
