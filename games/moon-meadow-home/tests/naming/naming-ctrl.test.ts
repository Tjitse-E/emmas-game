import { describe, it, expect } from 'vitest';
import { NamingCtrl, type NamingInput } from '../../src/scenes/heartbeat/naming.ctrl.ts';
import { indexBank } from '../../src/core/naming/check.ts';
import { compileBlocklist } from '../../src/core/naming/blocklist.ts';
import { applyNaming } from '../../src/core/actions/naming.ts';
import { fakeDeps, served as servedOf } from '../heartbeat/fakes.ts';
import { BANK, BLOCK_FILE, ctxAt } from './fixtures.ts';

const ALL = BANK.map((b) => b.key);
const spellPick = (step: string) => servedOf({ strand: 's', step, moment: 'naming-bells', items: ['s:g:k'], carrier: { kind: 'spell', focus: ['k'] } });
const served = spellPick('S03');
const input = (over: Partial<NamingInput> = {}): NamingInput => ({
  target: { kind: 'baby', baby: 'b9' }, served, ctx: ctxAt('S03', ['S02']), bank: BANK, index: indexBank(BANK),
  blocklist: compileBlocklist(BLOCK_FILE), herd: [{ id: 'b9', name: null, gems: [] }], spellingBehind: false, ...over,
});
const spellAll = (c: NamingCtrl) => { for (const m of c.answerMoves()) c.dropGem(m.slot, m.gem); };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const find = (actions: any[], type: string) => actions.find((a) => a.type === type);

describe('NamingCtrl', () => {
  it('opens on the gold bell when no bell names are left', async () => {
    const f = fakeDeps({ names: [] });
    const c = new NamingCtrl(input(), f.deps);
    expect(c.showBells).toBe(false);
    await c.begin();
    expect(c.mode).toBe('gold');
    expect(f.said[0]).toBe('g-gold');
  });
  it('spells a bell name right first time, then names the baby', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    await c.begin();
    expect(f.said[0]).toBe('g-bells');
    await c.choose('ken');
    expect(c.tray).toEqual(expect.arrayContaining(['k', 'e', 'n']));
    spellAll(c);
    expect(await c.slide()).toBe('right');
    const spelled = find(f.actions, 'naming.spelled');
    expect(spelled).toMatchObject({ route: 'bell', gems: ['k', 'e', 'n'], listName: 'Ken' });
    expect(spelled.learn[0]).toMatchObject({ baby: 'b9', payload: { strand: 's', step: 'S03', result: 'first', place: 'naming', moment: 'naming-bells' } });
    expect(spelled.learn[0].payload.items).toEqual([{ id: 's:g:k', r: 'first' }, { id: 's:g:e', r: 'first' }, { id: 's:g:n', r: 'first' }]);
    expect(find(f.actions, 'naming.assign')).toEqual({ type: 'naming.assign', baby: 'b9', name: 'Ken', gems: ['k', 'e', 'n'], route: 'bell', listName: 'Ken' });
    expect(c.named).toMatchObject({ clipKey: 'ken', ordinal: 1, unknown: false });
    expect(f.said).toEqual(expect.arrayContaining(['g-spell', 'name:ken!', 'fb-spelled', 'foal-yay']));
    expect(f.said.indexOf('g-spell')).toBeLessThan(f.said.indexOf('name:ken!'));
    expect(c.mode).toBe('done');
    // The drafts validate as contract events (shape check through the translator).
    expect(applyNaming(spelled).map((d) => d.type)).toEqual(['learn.result', 'name.built']);
  });
  it('reads back a wrong gem, pops it out and counts the name as a miss', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    await c.begin();
    await c.choose('ken');
    c.dropGem(0, 'k'); c.dropGem(1, 'i'); c.dropGem(2, 'n');
    expect(await c.slide()).toBe('wrong');
    expect(c.slots[1]).toMatchObject({ gem: null, hum: true, misses: 1 });
    expect(f.said).toEqual(expect.arrayContaining(['fb-that-says', 'snd:i', 'g-listen']));
    c.dropGem(1, 'e');
    expect(await c.slide()).toBe('right');
    const p = find(f.actions, 'naming.spelled').learn[0].payload;
    expect(p.result).toBe('miss');
    expect(p.error).toBe('vowel');
    expect(p.items).toEqual([{ id: 's:g:k', r: 'first' }, { id: 's:g:e', r: 'miss' }, { id: 's:g:n', r: 'first' }]);
  });
  it('asks for the capital from S11 and logs it as its own result', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input({ ctx: ctxAt('S12', ['S02', 'S03', 'S11']), served: spellPick('S12') }), f.deps);
    await c.begin();
    await c.choose(c.bells[0].key);
    const first = c.slots[0].slot.g.toLowerCase();
    spellAll(c);
    c.dropGem(0, first);
    expect(await c.slide()).toBe('wrong');
    spellAll(c);
    expect(await c.slide()).toBe('right');
    const learn = find(f.actions, 'naming.spelled').learn;
    expect(learn[1].payload).toMatchObject({ step: 'S11', items: [{ id: 's:cap:name', r: 'miss' }], slot: 'review' });
  });
  it('runs the gold bell checks', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    c.openGold(['t', 'm', 'n']);
    expect(await c.goldSlide()).toBe('no-vowel');
    expect(f.said).toContain('fb-no-vowel');
    c.openGold(['f', 'u', 'k']);
    expect(await c.goldSlide()).toBe('blocked');
    expect(c.gold.every((g) => g === null)).toBe(true);
    expect(f.said).toContain('fb-silly');
    expect(f.said).not.toContain('snd:f');
    expect(f.actions.some((a) => a.type === 'naming.assign')).toBe(false);
    c.openGold(['L', 'i', 'l', 'i']);
    expect(await c.goldSlide()).toBe('list');
    expect(find(f.actions, 'naming.assign')).toMatchObject({ name: 'Lili', listName: 'Lily', route: 'gold' });
    expect(c.named).toMatchObject({ clipKey: 'lily', unknown: false });
    expect(f.said).toEqual(expect.arrayContaining(['name:lily!', 'fb-gold-yes']));
    expect(f.actions.filter((a) => a.type === 'naming.gold').map((a) => a.outcome.outcome)).toEqual(['no-vowel', 'blocked', 'list']);
  });
  it('accepts an unknown name with the kind line, and makes a duplicate royal', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input({ herd: [{ id: 'b1', name: 'Tamobel', gems: [] }, { id: 'b9', name: null, gems: [] }] }), f.deps);
    c.openGold(['T', 'a', 'm', 'o', 'b', 'e', 'l']);
    expect(await c.goldSlide()).toBe('unknown');
    expect(f.said).toContain('fb-tricky');
    expect(find(f.actions, 'naming.assign')).toMatchObject({ name: 'Tamobel', listName: null });
    expect(c.named).toMatchObject({ clipKey: null, unknown: true, ordinal: 2 });
    expect(f.said).toContain('ord-2');
  });
  it('adds slots up to eight and removes empty ones down to two', () => {
    const c = new NamingCtrl(input(), fakeDeps({ names: ALL }).deps);
    c.openGold();
    for (let i = 0; i < 5; i++) expect(c.addSlot()).toBe(true);
    expect(c.addSlot()).toBe(false);
    expect(c.gold).toHaveLength(8);
    c.goldDrop(0, 't');
    expect(c.removeSlot(0)).toBe(false);
    for (let i = 0; i < 6; i++) expect(c.removeSlot(1)).toBe(true);
    expect(c.removeSlot(1)).toBe(false);
    expect(c.gold).toHaveLength(2);
  });
  it('keeps her gems and logs filled slots when she switches to the gold bell', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    await c.begin();
    await c.choose('ken');
    c.dropGem(0, 'k'); c.dropGem(1, 'e');
    await c.switchToGold();
    expect(c.mode).toBe('gold');
    expect(c.gold).toEqual(['k', 'e', null]);
    expect(find(f.actions, 'naming.partial').learn[0].payload.items).toEqual([{ id: 's:g:k', r: 'first' }, { id: 's:g:e', r: 'first' }]);
  });
  it('logs no spelling result for a free-naming garden name', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input({ ctx: ctxAt('S12', ['S02', 'S03', 'S04']), served: spellPick('S12') }), f.deps);
    c.garden('flowers');
    await c.choose('rose');
    spellAll(c);
    expect(await c.slide()).toBe('right');
    expect(find(f.actions, 'naming.spelled')).toMatchObject({ route: 'garden-pic', learn: [] });
    expect(find(f.actions, 'naming.assign')).toMatchObject({ name: 'Rose', route: 'garden-pic' });
  });
  it('names a sky unicorn without assigning a baby', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input({ target: { kind: 'sky', index: 0 } }), f.deps);
    c.openGold(['T', 'a', 'm']);
    expect(await c.goldSlide()).toBe('list');
    expect(f.actions.some((a) => a.type === 'naming.assign')).toBe(false);
    expect(c.named).toMatchObject({ name: 'Tam', ordinal: 1 });
  });
});
