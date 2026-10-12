// Every translator's sample drafts, finished by the router, must pass core's validator (master Review Focus 1).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { apply, finishDraft } from '../../src/core/actions.ts';
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

// I-3b: the contract over all translators. Every action type a translator handles has a sample, every action
// type a scene dispatches is handled, and each sample validates after the real router (prefix, visit, hearts).
const SRC = new URL('../../src/', import.meta.url).pathname;
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const casesOf = (rel: string) => [...read(rel).matchAll(/case '([^']+)'/g)].map((m) => m[1]);
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(ts|svelte)$/.test(e.name) && !e.name.endsWith('.generated.ts') ? [p] : [];
  });
}
const TRANSLATORS: [string, string, readonly { type: string }[]][] = [
  ['heartbeat', 'core/actions/heartbeat.ts', HEARTBEAT_SAMPLE_ACTIONS],
  ['naming', 'core/actions/naming.ts', NAMING_SAMPLE_ACTIONS],
  ['places', 'core/places/actions.ts', PLACE_SAMPLE_ACTIONS],
  ['game', 'game/game-actions.ts', GAME_SAMPLE_ACTIONS],
];

describe('the contract over all translators', () => {
  it('every action type a translator handles has a sample action', () => {
    for (const [name, file, samples] of TRANSLATORS) {
      const handled = casesOf(file);
      expect(handled.length, `${name} handles no action types`).toBeGreaterThan(0);
      const sampled = new Set(samples.map((a) => a.type));
      expect(handled.filter((t) => !sampled.has(t)), `${name} actions without a sample`).toEqual([]);
    }
  });

  it('every action type the app dispatches is handled by a translator', () => {
    const handled = new Set(TRANSLATORS.flatMap(([, file]) => casesOf(file)));
    const unhandled: string[] = [];
    for (const f of sourceFiles(SRC)) {
      if (f.endsWith('types/contracts.ts')) continue;
      for (const m of readFileSync(f, 'utf8').matchAll(/type:\s*'((?:hb\.|naming\.|place\/|game\/)[a-z-]+)'/g)) {
        if (!handled.has(m[1])) unhandled.push(`${m[1]} in ${f.slice(SRC.length)}`);
      }
    }
    expect(unhandled).toEqual([]);
  });

  it('every sample validates after the real router', () => {
    const ctx = fullCtx();
    for (const [name, , samples] of TRANSLATORS) {
      for (const a of samples) {
        for (const d of apply(a as never, ctx)) {
          const r = validateEvent(stampOne(d as never));
          expect(r.ok, `${name} ${a.type}: ${JSON.stringify(r)}`).toBe(true);
        }
      }
    }
  });

  it('the router refuses an action type no translator owns', () => {
    expect(() => apply({ type: 'unknown/thing' }, fullCtx())).toThrow(/Unknown action/);
  });
});
