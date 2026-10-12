import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkAudio } from '../../tools/audio/check-audio.ts';
import { PACKS } from '../../src/audio/packs.ts';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'audio-check-'));
  const pack = (name: string, lines: unknown[], clips: Record<string, unknown> | null, files: string[]) => {
    mkdirSync(join(root, name));
    writeFileSync(join(root, name, 'lines.json'), JSON.stringify({ lines }));
    if (clips) writeFileSync(join(root, name, 'manifest.json'), JSON.stringify({ clips }));
    for (const f of files) writeFileSync(join(root, name, f), 'x');
  };
  const stt = (text: string, match = true) => ({ hash: 'h', text, match, how: match ? 'exact' : 'miss' });
  pack('core', [
    { id: 'g-a', speaker: 'narrator', text: 'A.' },
    { id: 'g-b', speaker: 'narrator', text: 'B.' },
    { id: 'g-c', speaker: 'narrator', text: 'C new.' },
    { id: 'foal-d', speaker: 'foal', text: 'Yay!' },
    { id: 'g-e', speaker: 'narrator', text: 'E.' },
  ], {
    'g-a': { file: 'g-a.mp3', text: 'A.', stt: stt('A.') },
    'g-c': { file: 'g-c.mp3', text: 'C old.', stt: stt('C old.') },
    'foal-d': { file: 'foal-d.mp3', text: 'Yay!' },
    'g-e': { file: 'g-e.mp3', text: 'E.', stt: stt('A.') },
  }, ['g-a.mp3', 'g-c.mp3', 'foal-d.mp3']);
  pack('names-t1', [
    { id: 'name-pip', speaker: 'narrator', text: 'Pip!' },
    { id: 'name-lin', speaker: 'narrator', text: 'Lin!' },
    { id: 'name-sam', speaker: 'narrator', text: 'Sam!' },
    { id: 'name-zed', speaker: 'narrator', text: 'Zed!' },
  ], {
    'name-pip': { file: 'name-pip.mp3', text: 'Pip!', stt: stt('Pip') },
    'name-lin': { file: 'name-lin.mp3', text: 'Lin!', ok: false, stt: stt('Lean', false) },
    'name-sam': { file: 'name-sam.mp3', text: 'Sam!' },
  }, ['name-pip.mp3', 'name-lin.mp3', 'name-sam.mp3']);
  pack('places', [
    { id: 'g-a', speaker: 'narrator', text: 'A again.' },
    { id: 'model-cat', speaker: 'queen', text: 'Cat.' },
  ], {}, []);
  pack('empty', [], null, []);
  return root;
}

describe('checkAudio', () => {
  it('reports duplicate ids, wrong voices, missing, stale, unchecked and excluded clips with the right severity', () => {
    const issues = checkAudio(fixture()).map((i) => [i.pack, i.id, i.severity, i.kind]);
    expect(issues).toEqual([
      ['core', 'g-b', 'error', 'no-clip'],
      ['core', 'g-c', 'error', 'stale'],
      ['core', 'g-e', 'error', 'no-file'],
      ['names-t1', 'name-lin', 'warn', 'excluded'],
      ['names-t1', 'name-sam', 'error', 'unchecked'],
      ['names-t1', 'name-zed', 'warn', 'no-clip'],
      ['places', 'g-a', 'error', 'duplicate'],
      ['places', 'g-a', 'error', 'no-clip'],
      ['places', 'model-cat', 'error', 'voice'],
      ['places', 'model-cat', 'error', 'no-clip'],
    ]);
  });
});

describe('flows/audio-check.html', () => {
  it('decodes the same packs the app loads', () => {
    const html = readFileSync(new URL('../../flows/audio-check.html', import.meta.url), 'utf8');
    const list = /var PACKS = \[([^\]]*)\]/.exec(html)![1].match(/'[^']+'/g)!.map((s) => s.slice(1, -1));
    expect(list).toEqual([...PACKS]);
  });
});
