// Every fixed line id the heartbeat scenes speak is defined in the heartbeat lines (which include audio's common ones).
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { heartbeatLines } from '../../src/core/heartbeat/lines.ts';

const root = new URL('../../src/', import.meta.url);
/** Every .ts and .svelte file in a scenes folder (and below it when `deep`), or none when the folder does not exist yet. */
const sceneDir = (dir: string, deep = false): URL[] => {
  const u = new URL(`${dir}/`, root);
  if (!existsSync(u)) return [];
  return readdirSync(u, { recursive: deep, encoding: 'utf8' }).filter((f) => f.endsWith('.ts') || f.endsWith('.svelte')).map((f) => new URL(f, u));
};
const files = [
  ...sceneDir('scenes/heartbeat'),
  // 1.0.1 (docs/v3/next/plan.md I-0.8): the stable, the lantern walk and feeding
  ...sceneDir('scenes/goodnight', true),
  ...sceneDir('scenes/feed', true),
  new URL('core/maths/eggs.ts', root),
  ...['core/heartbeat/feed.ts', 'core/heartbeat/walk.ts'].map((f) => new URL(f, root)).filter((u) => existsSync(u)),
  ...['Nest', 'Hatch', 'Naming', 'Wish', 'Stalls', 'Goodnight'].map((s) => new URL(`scenes/${s}.svelte`, root)),
];

describe('line coverage', () => {
  it('uses only line ids that heartbeatLines defines', () => {
    const ids = new Set(heartbeatLines().map((l) => l.id));
    const missing: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/'((?:g|fb|h|lumi|foal)-[a-z0-9-]+)'/g)) {
        if (!ids.has(m[1])) missing.push(`${m[1]} in ${f.pathname.split('/src/')[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
