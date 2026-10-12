import { describe, expect, it } from 'vitest';
import { ClipIndex, type ClipEntry } from '../../src/audio/clip-index.ts';

const clip = (ok?: boolean): ClipEntry => ({ hash: 'h', speaker: 'narrator', text: 't', file: 'f.mp3', ...(ok === undefined ? {} : { ok }) });

describe('ClipIndex', () => {
  it('knows clips across packs and treats ok: false as absent', () => {
    const ix = new ClipIndex();
    ix.set('core', { clips: { 'g-egg': clip() } });
    ix.set('names-t1', { clips: { 'name-pip': clip(true), 'name-lin': clip(false) } });
    ix.set('names-new', null);
    expect(ix.has('g-egg')).toBe(true);
    expect(ix.has('name-pip')).toBe(true);
    expect(ix.has('name-lin')).toBe(false);
    expect(ix.has('word-hat')).toBe(false);
    expect(ix.ids('name-')).toEqual(['name-pip']);
  });
  it('replaces a pack when it is set again', () => {
    const ix = new ClipIndex();
    ix.set('names-new', { clips: {} });
    expect(ix.has('name-zibbo')).toBe(false);
    ix.set('names-new', { clips: { 'name-zibbo': clip() } });
    expect(ix.has('name-zibbo')).toBe(true);
  });
});
