import { describe, expect, it } from 'vitest';
import { buildExport, exportFileName, parseSaveFile } from '../../src/core/save/export.ts';
import { fakeDevice, setting } from '../helpers/events.ts';
import { makeV2Save } from '../fixtures/v2.ts';

describe('save file', () => {
  it('exports events in fold order and reads them back', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1), setting('x', 2)], 1000);
    const file = buildExport([...a.events].reverse(), 1_760_000_000_000);
    expect(file).toMatchObject({ format: 'moon-meadow-save', v: 1, exportedAt: 1_760_000_000_000 });
    expect(file.events.map(e => e.id)).toEqual(['aaaaaaaa:1', 'aaaaaaaa:2']);
    expect(parseSaveFile(JSON.stringify(file))).toEqual({ kind: 'v3', events: file.events, exportedAt: 1_760_000_000_000 });
    expect(exportFileName(Date.UTC(2026, 11, 3, 18))).toBe('moon-meadow-2026-12-03.json');
  });

  it('recognises a raw v2 save as written by move.html, with or without a byte order mark', () => {
    const text = JSON.stringify(makeV2Save());
    expect(parseSaveFile(text)).toMatchObject({ kind: 'v2' });
    expect(parseSaveFile('\uFEFF' + text)).toMatchObject({ kind: 'v2' });
  });

  it('explains files it cannot read', () => {
    expect(parseSaveFile('not json')).toEqual({ kind: 'invalid', reason: 'This file is not a save file.' });
    expect(parseSaveFile('{"format":"moon-meadow-save","v":2,"events":[]}')).toMatchObject({ kind: 'invalid' });
    expect(parseSaveFile('{"hello":1}')).toEqual({ kind: 'invalid', reason: 'This file is not a Moon Meadow or Unicorn Egg Nest save.' });
  });
});
