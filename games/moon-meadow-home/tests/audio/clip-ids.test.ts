import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderClipIds } from '../../tools/audio/clip-ids-lib.ts';
import type { SceneFile } from '../../tools/audio/lines-lib.ts';

describe('renderClipIds', () => {
  const out = renderClipIds([
    { scene: 'heartbeat', lines: [{ id: 'g-egg', speaker: 'narrator', text: 'Egg.' }, { id: 'fb-hot', speaker: 'narrator', text: 'Hot!', also: ['bath-pond'] }] },
    { scene: 'toy-shelf', pack: 'places', lines: [{ id: 'pl-jar', speaker: 'narrator', text: 'Jar.' }] },
  ]);
  it('lists the ids as a sorted union', () => {
    expect(out).toContain("export type ClipId =\n  | 'fb-hot'\n  | 'g-egg'\n  | 'pl-jar';");
  });
  it('keeps every base scene, adds new scenes, and maps lines to scenes with also', () => {
    expect(out).toContain("'common': [],");
    expect(out).toContain("'heartbeat': ['g-egg', 'fb-hot'],");
    expect(out).toContain("'bath-pond': ['fb-hot'],");
    expect(out).toContain("'toy-shelf': ['pl-jar'],");
    expect(out).toMatch(/export const SCENES = \['common', .*'toy-shelf'\] as const;/);
  });
  it('is never an empty union', () => {
    expect(renderClipIds([])).toContain('export type ClipId = never;');
  });
});

describe('src/audio/clip-ids.generated.ts', () => {
  it('is up to date with content/lines (run npm run audio:ids)', () => {
    const dir = new URL('../../content/lines/', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
      .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as SceneFile);
    const committed = readFileSync(new URL('../../src/audio/clip-ids.generated.ts', import.meta.url), 'utf8');
    expect(committed).toBe(renderClipIds(files));
  });
});
