import { describe, expect, it } from 'vitest';
import { createAudio, DYNAMIC_CLIP_LIMIT, silentPlayer, type PlayerLike } from '../../src/audio/facade.ts';
import type { ClipEntry, ClipManifest } from '../../src/audio/clip-index.ts';

const clip = (ok = true): ClipEntry => ({ hash: 'h', speaker: 'narrator', text: 't', file: 'f.mp3', ok });
const WORDS = Array.from({ length: 70 }, (_, i) => `word-w${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + (i % 26))}`);
const MANIFESTS: Record<string, ClipManifest> = {
  core: { clips: { 'g-egg': clip(), 'g-stone': clip() } },
  numbers: { clips: { 'num-movein-19': clip(), 'num-3': clip() } },
  'words-year1': { clips: Object.fromEntries(WORDS.map((w) => [w, clip()])) },
  'names-t1': { clips: { 'name-pip': clip(), 'name-lily': clip(false) } },
};

function fakePlayer(manifests: Record<string, ClipManifest | null> = MANIFESTS) {
  const calls: string[] = [];
  const missing: string[] = [];
  const player: PlayerLike = {
    init: (o) => { calls.push(`init:${o?.base}:${o?.phonics}`); return player as never; },
    unlock: async () => {},
    addPack: async (name, base, o) => { calls.push(`pack:${name}:${base}:${o?.fresh ? 'fresh' : 'cached'}`); return manifests[name] ?? null; },
    preload: async (ids) => { calls.push(`preload:${ids.join(',')}`); return []; },
    forget: (ids) => { calls.push(`forget:${ids.join(',')}`); },
    say: async (id) => { calls.push(`say:${id}`); },
    sound: async (c) => { calls.push(`sound:${c}`); },
    hold: () => ({ stop() {}, done: Promise.resolve() }),
    sfx: async () => {},
    stop: () => { calls.push('stop'); },
    mute: () => true,
    onMissing: () => () => {},
    reportMissing: (id) => { if (!missing.includes(id)) missing.push(id); },
    missing,
    speaking: false,
  };
  return { player, calls };
}

const PACKS = [{ name: 'core' }, { name: 'numbers' }, { name: 'words-year1' }, { name: 'names-t1', fresh: true }];
const SCENES = { common: ['g-egg'], heartbeat: ['g-egg', 'g-stone'], places: ['g-stone'] };

async function ready() {
  const f = fakePlayer();
  const audio = createAudio(f.player, PACKS, SCENES);
  await audio.init({ base: '/g/audio/' });
  return { audio, calls: f.calls };
}
const says = (calls: string[]) => calls.filter((c) => c.startsWith('say:'));

describe('audio facade', () => {
  it('adds every pack under the base, names fresh', async () => {
    const { calls } = await ready();
    expect(calls).toEqual([
      'init:/g/audio/core/:/g/audio/phonics/',
      'pack:core:/g/audio/core/:cached',
      'pack:numbers:/g/audio/numbers/:cached',
      'pack:words-year1:/g/audio/words-year1/:cached',
      'pack:names-t1:/g/audio/names-t1/:fresh',
    ]);
  });

  it('loads the real player only at init when given a loader', async () => {
    const f = fakePlayer();
    let loads = 0;
    const audio = createAudio(async () => { loads++; return f.player; }, PACKS, SCENES);
    expect(loads).toBe(0);
    await audio.speak('g-egg');
    expect(says(f.calls)).toEqual([]);
    await audio.init({ base: '/g/audio/' });
    await audio.speak('g-egg');
    expect(loads).toBe(1);
    expect(says(f.calls)).toEqual(['say:g-egg']);
  });

  it('drops dynamic ids without a usable clip, records them except names, and keeps static ids', async () => {
    const { audio, calls } = await ready();
    await audio.speak(audio.nameClip('Bella', '!'), 'num-movein-19', 'num-movein-99', 'name-bella', 'g-egg', 'g-missing');
    expect(says(calls)).toEqual(['say:num-movein-19', 'say:g-egg', 'say:g-missing']);
    expect(audio.missing).toEqual(['num-movein-99']);
  });

  it('finds names, falls back from "?" to "!", and treats an excluded clip as no clip', async () => {
    const { audio, calls } = await ready();
    expect(audio.hasName('Pip')).toBe(true);
    expect(audio.hasName('Lily')).toBe(false);
    expect(audio.nameClip('Pip', '?')).toBe('name-pip');
    expect(await audio.sayName('Lily', '!')).toBe(false);
    expect(await audio.sayName('Pip', '?')).toBe(true);
    expect(says(calls)).toEqual(['say:name-pip']);
    expect(audio.missing).toEqual([]);
  });

  it('has sayAll and has as aliases', async () => {
    const { audio, calls } = await ready();
    expect(audio.has('g-egg')).toBe(true);
    await audio.sayAll(['g-egg', null, 'g-stone']);
    expect(says(calls)).toEqual(['say:g-egg', 'say:g-stone']);
  });

  it('in fast mode plays nothing, records what it would have said, and still records missing clips', async () => {
    const { audio, calls } = await ready();
    audio.setFast(true);
    await audio.speak('g-egg', 'num-movein-19', 'g-missing', 'num-99');
    expect(calls.some((c) => c.startsWith('say:'))).toBe(false);
    expect(audio.said).toEqual(['g-egg', 'num-movein-19', 'g-missing']);
    expect(audio.missing).toEqual(['num-99', 'g-missing']);
    expect(await audio.sayName('Pip', '!')).toBe(true);
  });

  it('tells listeners who is talking', async () => {
    const { audio } = await ready();
    const seen: Array<string | null> = [];
    const off = audio.onTalk((id) => seen.push(id));
    await audio.speak('g-egg');
    off();
    await audio.speak('g-stone');
    expect(seen).toEqual(['g-egg', null]);
  });

  it('stop() also ends the rest of a running sequence (a scene change)', async () => {
    const f = fakePlayer();
    let release!: () => void;
    f.player.say = (id) => { f.calls.push(`say:${id}`); return new Promise<void>((r) => { release = r; }); };
    const audio = createAudio(f.player, PACKS, SCENES);
    await audio.init({ base: '/g/audio/' });
    const done = audio.speak('g-egg', 'g-stone');
    await new Promise((r) => setTimeout(r, 0));
    audio.stop();
    release();
    await done;
    expect(says(f.calls)).toEqual(['say:g-egg']);
  });

  it('preloads a scene and releases only clips no loaded scene still needs', async () => {
    const { audio, calls } = await ready();
    await audio.preloadScene('heartbeat');
    await audio.preloadScene('places');
    audio.release('heartbeat');
    expect(calls).toContain('preload:g-egg,g-stone');
    expect(calls.filter((c) => c.startsWith('forget:'))).toEqual([]);
    audio.release('places');
    expect(calls.at(-1)).toBe('forget:g-stone');
  });

  it(`keeps at most ${DYNAMIC_CLIP_LIMIT} decoded dynamic clips, least recently used out first`, async () => {
    const { audio, calls } = await ready();
    expect(DYNAMIC_CLIP_LIMIT).toBe(60);
    for (const w of WORDS.slice(0, 60)) await audio.listen(w);
    expect(calls.filter((c) => c.startsWith('forget:'))).toEqual([]);
    await audio.speak(WORDS[0]);              // used again, so WORDS[1] is now the oldest
    await audio.speak(WORDS[60]);
    expect(calls.filter((c) => c.startsWith('forget:'))).toEqual([`forget:${WORDS[1]}`]);
  });

  it('after 61 different word clips the first is forgotten', async () => {
    const { audio, calls } = await ready();
    for (const w of WORDS.slice(0, 61)) await audio.speak(w);
    expect(calls.filter((c) => c.startsWith('forget:'))).toEqual([`forget:${WORDS[0]}`]);
  });

  it('release(scene) also forgets the dynamic clips that scene played', async () => {
    const { audio, calls } = await ready();
    await audio.preloadScene('heartbeat');
    await audio.speak('g-egg', 'num-3', WORDS[0]);
    audio.release('heartbeat');
    expect(calls.at(-1)).toBe(`forget:num-3,${WORDS[0]},g-stone`);
    await audio.speak(WORDS[1]);   // no scene loaded: kept until the limit pushes it out
    expect(calls.at(-1)).toBe(`say:${WORDS[1]}`);
  });

  it('refreshNames fetches the fresh packs again', async () => {
    const { audio, calls } = await ready();
    await audio.refreshNames();
    expect(calls.filter((c) => c.startsWith('pack:names-t1'))).toHaveLength(2);
  });
});

describe('silentPlayer', () => {
  it('resolves everything and records missing clips once', async () => {
    const p = silentPlayer();
    const heard: string[] = [];
    p.onMissing((id) => heard.push(id));
    await p.say('g-egg');
    p.reportMissing('num-99');
    p.reportMissing('num-99');
    expect(p.missing).toEqual(['num-99']);
    expect(heard).toEqual(['num-99']);
    expect(await p.addPack('core', '/a/', {})).toBeNull();
  });
});
