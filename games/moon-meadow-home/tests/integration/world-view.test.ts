import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { fakeDevice, hatch, named } from '../helpers/events.ts';
import { worldView } from '../../src/game/world-view.ts';
import type { FullState } from '../../src/game/world-view.ts';
import type { GameEventDraft } from '../../src/core/events.ts';

const folder = createGameFolder([]);
const deps = { hasName: (n: string) => n === 'Pip', firstSound: (n: string) => n[0].toLowerCase() };

function stateOf(drafts: GameEventDraft[]): FullState {
  const d = fakeDevice('aaaaaaaa');
  d.add([{ type: 'visit.start', visit: 'v1', tz: 120 }, ...drafts], 1_000);
  return { ...folder.full(d.events).state, learner: {} as never, places: {} as never };
}

describe('worldView', () => {
  it('numbers babies by hatch order and gives doors to the first ten', () => {
    const drafts = Array.from({ length: 12 }, (_, i) => hatch(`b${i + 1}`));
    const w = worldView(stateOf(drafts), deps);
    expect(w.herd.map((b) => b.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(w.rowsBuilt).toBe(1);
    expect(w.doors).toBe(10);
    expect(w.camp).toEqual(['b11', 'b12']);
    expect(w.byId.b11.door).toBeNull();
    expect(w.byId.b10.door).toBe(10);
    expect(w.flowers).toBe(12);
    expect(w.visitIndex).toBe(1);
  });

  it('marks a clip only when the list name is loaded', () => {
    const w = worldView(stateOf([hatch('b1'), named('b1', 'Pip'), hatch('b2'), { ...named('b2', 'Tamo'), listName: null }]), deps);
    expect(w.byId.b1).toMatchObject({ name: 'Pip', listName: 'Pip', clipKey: 'pip', hasClip: true, unknownName: false, firstSound: 'p', ordinal: 1 });
    expect(w.byId.b2).toMatchObject({ name: 'Tamo', listName: null, clipKey: null, hasClip: false, unknownName: true });
    const unnamed = worldView(stateOf([hatch('b3')]), deps).byId.b3;
    expect(unnamed).toMatchObject({ name: null, unknownName: false, firstSound: null, hasClip: false, ordinal: 0 });
  });

  it('a herd of 45 has five rows and nobody in the camp', () => {
    const drafts = Array.from({ length: 45 }, (_, i) => hatch(`b${i + 1}`));
    const s = stateOf([...drafts, ...[2, 3, 4, 5].map((n) => ({ type: 'building.done' as const, plot: `row-${n}` }))]);
    const w = worldView(s, deps);
    expect(w.rowsBuilt).toBe(5);
    expect(w.doors).toBe(50);
    expect(w.camp).toEqual([]);
    expect(w.byId.b45.door).toBe(45);
  });

  it('parent-corner settings with the contract keys reach world.settings (R39)', () => {
    const s = stateOf([
      { type: 'settings.set', key: 'skip-wish-after-three', value: true },
      { type: 'settings.set', key: 'parent-pin', value: '1357' },
      { type: 'settings.set', key: 'birthday', value: '05-14' },
    ]);
    expect(worldView(s, deps).settings).toEqual({ skipWishAfterThree: true, parentPin: '1357', birthday: '05-14' });
    expect(worldView(stateOf([]), deps).settings).toEqual({ skipWishAfterThree: false, parentPin: '2468', birthday: null });
  });

  it('reads announcements, the Bath Pond, row and sky names, and the visit it is given', () => {
    const drafts = Array.from({ length: 21 }, (_, i) => hatch(`b${i + 1}`));
    const s = stateOf([
      ...drafts,
      { type: 'opening.announced', opening: 'bubbles' },
      { type: 'building.done', plot: 'bath-pond' },
      { type: 'row.named', row: 1, name: 'Rose' },
      { type: 'sky.named', sky: 2, name: 'Star' },
    ]);
    const w = worldView(s, deps, 'v9');
    expect(w.announced.has('bubbles')).toBe(true);
    expect(w.bathPond).toBe(true);
    expect(w.rowNames[0]).toBe('Rose');
    expect(w.skyNames).toEqual([null, 'Star']);
    expect(w.sky).toEqual([{ index: 2, name: 'Star' }]);
    expect(w.visit).toBe('v9');
  });
});
