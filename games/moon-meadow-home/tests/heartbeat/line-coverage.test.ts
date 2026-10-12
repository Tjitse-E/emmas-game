// Every fixed line id the heartbeat scenes speak is defined in the heartbeat lines (which include audio's common ones).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { heartbeatLines } from '../../src/core/heartbeat/lines.ts';

const root = new URL('../../src/', import.meta.url);
const files = [
  ...readdirSync(new URL('scenes/heartbeat/', root)).filter((f) => f.endsWith('.ts') || f.endsWith('.svelte')).map((f) => new URL(`scenes/heartbeat/${f}`, root)),
  new URL('core/maths/eggs.ts', root),
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
