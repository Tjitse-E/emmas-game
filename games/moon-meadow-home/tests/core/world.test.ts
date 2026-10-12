import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { factKey, isWinningFact, missingFacts } from '../../src/core/world/facts.ts';
import { babyAtDoor, campBabies, rowCount, stallOf } from '../../src/core/world/herd.ts';
import { daysPlayed, localDay } from '../../src/core/world/visits.ts';
import { setting as readSetting } from '../../src/core/world/settings.ts';
import { unknownNamesFrom } from '../../src/core/world/names.ts';
import { mapV2 } from '../../src/core/save/v2.ts';
import type { V2Save } from '../../src/core/save/v2.ts';
import type { DraftOf, GameEventDraft } from '../../src/core/events.ts';
import { care, fakeDevice, hatch, named, pin, setting } from '../helpers/events.ts';
import { makeV2Save, testDeps } from '../fixtures/v2.ts';
import type { HerdBaby as ContractHerdBaby, HerdState as ContractHerdState } from '../../src/types/contracts.ts';
import type { Baby, HerdState } from '../../src/core/world/herd.ts';

// The herd slice and contracts C3 must stay the same shape, in both directions.
const toContract = (b: Baby): ContractHerdBaby => b;
const fromContract = (b: ContractHerdBaby): Baby => b;
const herdToContract = (h: HerdState): ContractHerdState => h;
void toContract; void fromContract; void herdToContract;

const folder = createGameFolder([]);
const built = (gems: string[], outcome: DraftOf<'name.built'>['outcome']): DraftOf<'name.built'> => ({
  type: 'name.built', visit: 'v1', baby: null, gems, phonemes: gems.join(' '), route: 'gold', outcome, listName: null, strong: false,
});
const done = (plot: string): DraftOf<'building.done'> => ({ type: 'building.done', plot });

describe('facts', () => {
  it('keys each fact type and keeps the earliest in fold order', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    b.add([{ type: 'title.given', title: 'nest-keeper' }], 1000);
    a.add([{ type: 'title.given', title: 'nest-keeper' }], 2000);
    const f = folder.full([...a.events, ...b.events]);
    expect(f.state.facts['title.given']['nest-keeper'].id).toBe('bbbbbbbb:1');
    expect(isWinningFact(f.state.facts, b.events[0])).toBe(true);
    expect(isWinningFact(f.state.facts, a.events[0])).toBe(false);
    expect(factKey({ type: 'step.passed', strand: 'r', step: 'R19' })).toBe('r:R19');
    expect(factKey({ type: 'placement.done', strand: 's', current: 'S12', placed: [], side: [] })).toBe('s');
    expect(factKey(setting('x', 1))).toBeNull();
  });

  it('missingFacts returns each unrecorded fact once and drops non-facts', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([{ type: 'step.passed', strand: 's', step: 'S10' }], 1000);
    const facts = folder.full(a.events).state.facts;
    const candidates: GameEventDraft[] = [
      { type: 'step.passed', strand: 's', step: 'S10' }, { type: 'step.passed', strand: 'r', step: 'R19' },
      { type: 'step.passed', strand: 'r', step: 'R19' }, setting('x', 1),
    ];
    expect(missingFacts(facts, candidates)).toEqual([{ type: 'step.passed', strand: 'r', step: 'R19' }]);
  });
});

describe('herd', () => {
  it('hatches babies into stalls in hatch order and sends the eleventh to the Moonbeam Camp', () => {
    const a = fakeDevice('aaaaaaaa');
    for (let i = 1; i <= 11; i++) a.add([hatch(`b${i}`)], 1000 + i);
    const h = folder.full(a.events).state.herd;
    expect(rowCount(h)).toBe(1);
    expect(stallOf(h, 'b1')).toBe(1);
    expect(stallOf(h, 'b10')).toBe(10);
    expect(stallOf(h, 'b11')).toBeNull();
    expect(campBabies(h).map(b => b.id)).toEqual(['b11']);
    a.add([done('row-2')], 2000);
    const h2 = folder.full(a.events).state.herd;
    expect(stallOf(h2, 'b11')).toBe(11);
    expect(babyAtDoor(h2, 11)?.id).toBe('b11');
    expect(babyAtDoor(h2, 12)).toBeNull();
  });

  it('names once, counts duplicate names as royal ordinals, ignores a second naming', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([hatch('b1'), hatch('b2'), named('b1', 'Tim'), named('b2', 'tim'), named('b1', 'Max')], 1000);
    const h = folder.full(a.events).state.herd;
    expect(h.babies.b1).toMatchObject({ name: 'Tim', ordinal: 1, route: 'bell' });
    expect(h.babies.b2).toMatchObject({ name: 'tim', ordinal: 2 });
  });

  it('keeps the list name of the first naming, and starts clipHeard and comeAlong false', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([hatch('b1'), hatch('b2'), { ...named('b1', 'Lili'), listName: 'Lily' }, { ...named('b2', 'Zorp'), listName: null }], 1000);
    a.add([{ ...named('b1', 'Max'), listName: 'Max' }], 2000);
    const h = folder.full(a.events).state.herd;
    expect(h.babies.b1).toMatchObject({ name: 'Lili', listName: 'Lily', clipHeard: false, comeAlong: false });
    expect(h.babies.b2).toMatchObject({ name: 'Zorp', listName: null });
  });

  it('counts hearts only where the event says so, and pins fill the sash of ten before the pouch', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([hatch('b1'), care('b1'), care('b1', false), { type: 'name.clipHeard', baby: 'b1', heart: true }], 1000);
    for (let i = 1; i <= 12; i++) a.add([pin('b1', `star-${i}`)], 2000 + i);
    const b = folder.full(a.events).state.herd.babies.b1;
    expect(b.hearts).toBe(2);
    expect(b.clipHeard).toBe(true);
    expect(b.sash).toHaveLength(10);
    expect(b.pouch.map(p => p.pin)).toEqual(['star-11', 'star-12']);
  });

  it('cosmetic fields: the latest in fold order wins', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([hatch('b1')], 1000);
    b.add([{ type: 'outfit.saved', baby: 'b1', outfit: { head: 'crown' } }], 3000);
    a.add([{ type: 'outfit.saved', baby: 'b1', outfit: { head: 'bow' } }, { type: 'row.named', row: 1, name: 'Rose Row' }], 2000);
    const f = folder.full([...a.events, ...b.events]);
    expect(f.state.herd.babies.b1.outfit).toEqual({ head: 'crown' });
    expect(f.state.cosmetics.rowNames).toEqual({ 1: 'Rose Row' });
  });

  it('imports the v2 herd once, with the rows it needs, star pins for pin stickers and gifts', () => {
    const a = fakeDevice('aaaaaaaa');
    const draft = mapV2(makeV2Save() as V2Save, testDeps);
    a.add([draft], 1000);
    a.add([draft], 2000); // the same file again
    const f = folder.full(a.events);
    const h = f.state.herd;
    expect(h.order).toHaveLength(14);
    expect(rowCount(h)).toBe(2);
    expect(stallOf(h, h.order[13])).toBe(14);
    const sam = h.babies[h.order[0]];
    expect(sam).toMatchObject({ name: 'Sam', ordinal: 1, source: 'v2', breed: 'moon', route: 'import', listName: 'Sam', comeAlong: false });
    expect(sam.sash.map(p => p.kind)).toEqual(['sticker', 'sticker']);
    expect(sam.sash[0].at).toBe(a.events[0].t);
    expect(h.babies[h.order[13]]).toMatchObject({ name: null, listName: null, ordinal: 0 });
    expect(h.babies[h.order[7]]).toMatchObject({ name: 'Sam', ordinal: 2 });
    expect(f.state.cosmetics.v2Gifts).toEqual(['hat', 'cup']);
  });

  it('a newer v2 export adds new babies and hearts without doubling anyone', () => {
    const a = fakeDevice('aaaaaaaa');
    const first = makeV2Save();
    a.add([mapV2(first as V2Save, testDeps)], 1000);
    const later = makeV2Save();
    const herd = later.herd as Record<string, unknown>[];
    herd[1].hearts = 5;
    herd[0].stickers = ['pin', 'hat', 'pin', 'pin'];
    herd.push({ id: 15, name: 'zed', c: {}, traits: {}, hearts: 0, stickers: [], night: 6 });
    a.add([mapV2(later as V2Save, testDeps)], 2000);
    const h = folder.full(a.events).state.herd;
    expect(h.order).toHaveLength(15);
    expect(h.babies[h.order[1]].hearts).toBe(5);
    expect(h.babies[h.order[0]].sash).toHaveLength(3);
  });
});

describe('names, visits, settings, diagnostics', () => {
  it('collects unknown names with counts, from builds and from the v2 wishes', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([built(['t', 'a', 'm', 'o'], 'unknown'), built(['f', 'u', 'k'], 'blocked'), built(['t', 'a', 'm', 'o'], 'unknown')], 1000);
    a.add([mapV2(makeV2Save() as V2Save, testDeps)], 2000);
    const s = folder.full(a.events).state.names;
    expect(s.totals).toMatchObject({ unknown: 2, blocked: 1 });
    expect(s.blocked).toHaveLength(1);
    expect(s.unknown.tamo).toMatchObject({ count: 3, firstT: 1000, lastT: 2000, fromV2: true });
    expect(unknownNamesFrom(a.events).map(u => u.spelling)).toEqual(['tamo', 'lunabel']);
  });

  it('visits keep their local day for day counts', () => {
    const a = fakeDevice('aaaaaaaa');
    const day = Date.UTC(2026, 11, 3, 22, 30); // 22:30 UTC is 00:30 the next day in Cyprus (UTC+2)
    a.add([{ type: 'visit.start', visit: 'v1', tz: 120 }], day);
    a.add([{ type: 'visit.end', visit: 'v1', reason: 'goodnight' }], day + 60_000);
    a.add([{ type: 'visit.start', visit: 'v2', tz: 120 }], day + 3_600_000);
    const s = folder.full(a.events).state.visits;
    expect(s.list[0]).toMatchObject({ visit: 'v1', end: day + 60_000, reason: 'goodnight', dev: 'aaaaaaaa' });
    expect(localDay(day, 120)).toBe('2026-12-04');
    expect(daysPlayed(s)).toBe(1);
  });

  it('settings: latest wins; diagnostics list each missing clip once', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('pin', 1234), setting('pin', 4321), { type: 'audio.missing', clip: 'word-hat' }, { type: 'audio.missing', clip: 'word-hat' }], 1000);
    const st = folder.full(a.events).state;
    expect(readSetting(st.settings, 'pin', 0)).toBe(4321);
    expect(readSetting(st.settings, 'missing', 'x')).toBe('x');
    expect(st.diag.audioMissing).toEqual(['word-hat']);
  });
});

describe('merging two devices that played offline', () => {
  it('keeps every baby, pin and name, and folds the same whatever order the logs arrive in', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([hatch('a1'), named('a1', 'Pip'), pin('a1', 'p1')], 1000);
    b.add([hatch('b1'), named('b1', 'Pip'), pin('b1', 'p2'), { type: 'building.done', plot: 'bath-pond' }], 1500);
    a.add([{ type: 'building.done', plot: 'bath-pond' }], 2000);
    const ab = folder.full([...a.events, ...b.events]);
    const ba = folder.full([...b.events, ...a.events]);
    expect(ab).toEqual(ba);
    const h = ab.state.herd;
    expect(h.order).toEqual(['a1', 'b1']);
    expect(h.babies.a1).toMatchObject({ name: 'Pip', ordinal: 1, sash: [expect.objectContaining({ pin: 'p1' })] });
    expect(h.babies.b1).toMatchObject({ name: 'Pip', ordinal: 2, sash: [expect.objectContaining({ pin: 'p2' })] });
    expect(ab.state.facts['building.done']['bath-pond'].id).toBe('bbbbbbbb:4');
  });
});
