// Place lines (Task A16, R6, R53): content/lines/places.json holds every line the place code and content name,
// and nothing that another line file already says. Numbers come from audio's number lines (num-up, num-more,
// num-over), the plural feedback from heartbeat (fb-more-than-one, fb-just-one).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Line = { id: string; speaker: string; text: string; seed?: number };
const file = JSON.parse(readFileSync('content/lines/places.json', 'utf8')) as { scene: string; pack: string; lines: Line[] };
const lines = file.lines;
const ids = new Set(lines.map((l) => l.id));

const readLines = (p: string): Line[] => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as { lines: Line[] }).lines : []);
const otherFiles = readdirSync('content/lines').filter((f) => f.endsWith('.json') && f !== 'places.json').map((f) => join('content/lines', f));
const otherIds = new Set(otherFiles.flatMap(readLines).map((l) => l.id));
/** Packs built from other sources: learning's words, names and phrases, audio's numbers. */
const packIds = new Set(readdirSync('public/audio').filter((d) => d !== 'places').flatMap((d) => readLines(join('public/audio', d, 'lines.json'))).map((l) => l.id));

function sources(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|svelte|json)$/.test(p) ? [p] : [];
  });
}

describe('place lines', () => {
  it('is one places scene in the places pack', () => {
    expect(file.scene).toBe('places');
    expect(file.pack).toBe('places');
  });

  it('has unique kebab-case ids that no other line file uses', () => {
    expect(ids.size).toBe(lines.length);
    for (const l of lines) expect(l.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(lines.filter((l) => otherIds.has(l.id) || packIds.has(l.id)).map((l) => l.id)).toEqual([]);
  });

  it('uses Elizabeth for every word, name, number and sound line', () => {
    for (const l of lines) if (/^(word|name|num|sound|phrase|ord|model)-/.test(l.id)) expect(l.speaker, l.id).toBe('narrator');
  });

  it('writes numbers as words, without em dashes, and keeps audio tags to the babies', () => {
    for (const l of lines) {
      expect(l.text, l.id).not.toMatch(/\d/);
      expect(l.text, l.id).not.toContain('—');
      if (l.speaker !== 'foal') expect(l.text, l.id).not.toMatch(/\[/);
    }
  });

  it('keeps Lumi to story lines and babies to tiny words', () => {
    for (const l of lines.filter((x) => x.speaker === 'foal')) {
      expect(l.text.replace(/\[[^\]]*\]/g, '').trim().split(/\s+/).filter(Boolean).length, l.id).toBeGreaterThan(0);
      expect(l.text.replace(/\[[^\]]*\]/g, '').trim().split(/\s+/).filter(Boolean).length, l.id).toBeLessThanOrEqual(2);
    }
    for (const l of lines.filter((x) => x.speaker === 'queen')) expect(l.id.startsWith('lumi-'), l.id).toBe(true);
    for (const l of lines.filter((x) => x.id.startsWith('lumi-'))) expect(l.speaker, l.id).toBe('queen');
  });

  it('never asks a question in a goal (goals are acts)', () => {
    for (const l of lines.filter((x) => /goal|^bd-|^lb-|^pd-/.test(x.id))) expect(l.text, l.id).not.toContain('?');
  });

  it('has a line for every line id the place code and content use', () => {
    const used = new Set<string>();
    const prefixes = /['"`]((?:mw|lb|pl|pd|bd|nm|jw|nv|dc|pb|nt|hb|sl|ll|vm|ti|hp|ca|y1|lumi|foal|fb|g|num|word)-[a-z0-9${}.-]+)['"`]/g;
    const mine = ['moment.ts', 'moment-deps.ts', 'ReplayButton.svelte', 'Bubble.svelte', 'Crown.svelte', 'JewelBox.svelte', 'MeadowArrow.svelte', 'places-svg.ts']
      .map((f) => `src/ui/${f}`).filter((f) => existsSync(f));
    const files = [...sources('src/core/places'), ...sources('src/scenes/places'), ...sources('src/places'), ...sources('src/parent'), ...mine, ...sources('content/places')];
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(prefixes)) used.add(m[1]);
    const known = (id: string) => ids.has(id) || otherIds.has(id) || packIds.has(id);
    const dynamic = /-$|\$\{/;
    expect([...used].filter((id) => !dynamic.test(id) && !known(id))).toEqual([]);
  });

  it('covers the template ids the building and the wall build at run time', () => {
    for (let n = 2; n <= 10; n++) expect(ids.has(`bd-needs-${n}`), `bd-needs-${n}`).toBe(true);
    for (const kind of ['up', 'more', 'over']) for (let n = 1; n <= 9; n++) expect(packIds.has(`num-${kind}-${n}`), `num-${kind}-${n}`).toBe(true);
    for (const id of ['fb-more-than-one', 'fb-just-one', 'lumi-hello-back', 'g-egg-waiting']) expect(otherIds.has(id), id).toBe(true);
  });
});

describe('place art requests', () => {
  const listed = new Set<string>();
  for (const f of ['items.txt', 'backgrounds.txt', 'words.txt', 'words-top.txt']) {
    const p = join('art-src/lists', f);
    if (!existsSync(p)) continue;
    for (const ln of readFileSync(p, 'utf8').split('\n')) if (ln.trim() && !ln.startsWith('#')) listed.add(ln.split('|')[0].trim());
  }
  const requests = readFileSync('content/places/art-requests.txt', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));

  it('writes each request as id | step-or-kind | description', () => {
    for (const r of requests) {
      const parts = r.split('|').map((s) => s.trim());
      expect(parts, r).toHaveLength(3);
      expect(parts[0]).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(parts[2].length).toBeGreaterThan(10);
    }
  });

  it('asks for every plot picture of a release up to 1.3 that the art lists do not have', () => {
    const asked = new Set([...listed, ...requests.map((r) => r.split('|')[0].trim())]);
    const plots = (JSON.parse(readFileSync('content/places/plots.json', 'utf8')) as { plots: { picture: string; release: string }[] }).plots;
    const missing = plots.filter((p) => ['1.0', '1.1', '1.2', '1.3'].includes(p.release) && !asked.has(p.picture)).map((p) => p.picture);
    expect(missing).toEqual([]);
  });
});
