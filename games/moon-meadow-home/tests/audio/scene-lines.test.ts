import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NARRATOR_ONLY_PREFIXES } from '../../src/core/keys.ts';
import { numberLines } from '../../tools/audio/number-lines.ts';

type Line = { id: string; speaker: string; text: string; also?: string[]; note?: string; seed?: number; expect?: string[] };
const FILES = ['common', 'start', 'moving-day'] as const;
const read = (name: string) => JSON.parse(readFileSync(new URL(`../../content/lines/${name}.json`, import.meta.url), 'utf8')) as { scene: string; pack?: string; lines: Line[] };

describe("audio's hand-written Wave A line files", () => {
  const files = FILES.map((f) => ({ f, ...read(f) }));
  const all = files.flatMap((x) => x.lines);

  it('name their scene after the file and use the core pack', () => {
    for (const x of files) {
      expect(x.scene).toBe(x.f);
      expect(x.pack ?? 'core').toBe('core');
    }
  });
  it('have unique ids, also against the number lines', () => {
    const ids = [...all.map((l) => l.id), ...numberLines().map((l) => l.id)];
    expect(ids.length - new Set(ids).size).toBe(0);
  });
  it('use known speakers, keep learning prefixes for Elizabeth and only known keys', () => {
    for (const l of all) {
      expect(['narrator', 'queen', 'foal']).toContain(l.speaker);
      if (NARRATOR_ONLY_PREFIXES.some((p) => l.id.startsWith(p))) expect(l.speaker).toBe('narrator');
      expect(Object.keys(l).every((k) => ['id', 'speaker', 'text', 'also', 'note', 'seed', 'expect'].includes(k))).toBe(true);
      expect(l.text.trim()).toBe(l.text);
      expect(/\d/.test(l.text)).toBe(false);
    }
  });
  it('keep the v2 texts for lines that existed in v2, so their clips are free', () => {
    const v2 = JSON.parse(readFileSync(new URL('../../../../ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json', import.meta.url), 'utf8')).lines as Line[];
    for (const id of ['lumi-hello', 'lumi-crown', 'foal-hello', 'foal-yay', 'foal-yawn', 'fb-lovely', 'fb-letters', 'h-sounds', 'fb-listen']) {
      const mine = all.find((l) => l.id === id)!;
      const old = v2.find((l) => l.id === id)!;
      expect([mine.speaker, mine.text]).toEqual([old.speaker, old.text]);
    }
  });
  it('define the lines Welcome and Moving Day speak (master plan I-2)', () => {
    const ids = new Set(all.map((l) => l.id));
    for (const id of ['lumi-hello', 'lumi-meadow-yours', 'lumi-crown', 'lumi-moving', 'g-here-they-come', 'g-pins-came', 'fb-lovely', 'lumi-hello-back', 'g-egg-waiting']) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
