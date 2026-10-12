import { describe, it, expect } from 'vitest';
import { content } from '../../src/core/content/static.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { CARE_OF_TOOL, FOAL_LINE, MEADOW_MAX, meadowBabies } from '../../src/core/heartbeat/meadow.ts';
import { DOOR_DECOR, doorDecor, doorDecorKey, nextDecor } from '../../src/core/heartbeat/decor.ts';
import { breedForStep } from '../../src/core/eggs/breed.ts';
import { currentEggBreed, BREEDS } from '../../src/core/eggs/index.ts';
import { ownSlots, planTray } from '../../src/core/phonics/tray.ts';
import { canReviewName } from '../../src/core/naming/review.ts';
import { rollBuildingHatch } from '../../src/core/heartbeat/hatch.ts';
import { applyHeartbeat } from '../../src/core/actions/heartbeat.ts';
import { heartbeatLines } from '../../src/core/heartbeat/lines.ts';
import { makeRng } from '../../src/core/rng.ts';
import { T0, override, resetSeq, visitStart } from '../fixtures/events.ts';

/** A learner whose current steps are set by overrides, as the parent corner would. */
function learnerAt(steps: Record<'r' | 's' | 'm', string>) {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0)];
  for (const [strand, step] of Object.entries(steps) as ['r' | 's' | 'm', string][]) {
    evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, content), content, strand, step)));
  }
  return foldLearner(evs, content);
}

describe('meadow life', () => {
  it('shows favourites first, then the newest, at most twelve', () => {
    const herd = Array.from({ length: 20 }, (_, i) => ({ id: `b${i + 1}`, order: i + 1, favourite: i === 2 }));
    const m = meadowBabies(herd);
    expect(m).toHaveLength(MEADOW_MAX);
    expect(m[0].id).toBe('b3');
    expect(m[1].id).toBe('b20');
  });
  it('maps care tools to care stations and every care to a baby line', () => {
    expect(CARE_OF_TOOL).toEqual({ brush: 'brush', treat: 'treat', heart: 'cuddle' });
    const ids = new Set(heartbeatLines().map((l) => l.id));
    for (const id of Object.values(FOAL_LINE)) expect(ids.has(id)).toBe(true);
  });
});

describe('stall-door decorations (R57)', () => {
  it('cycles each decoration and wraps round to the plain door', () => {
    expect(nextDecor('lantern', null)).toBe('lantern-lit');
    expect(nextDecor('lantern', 'lantern-lit')).toBe('lantern-none');
    expect(nextDecor('paint', 'paint-lilac')).toBe('paint-none');
    expect(doorDecorKey(3, 'paint')).toBe('stall-3-paint');
  });
  it('reads the latest variant per door from the decor records', () => {
    const d = doorDecor({ 'stall-3-paint': { item: 'paint-blue' }, 'stall-3-flowers': { item: 'nonsense' } }, 3);
    expect(d).toEqual({ paint: 'paint-blue', flowers: DOOR_DECOR.flowers[0], lantern: 'lantern-none' });
  });
  it('places a decoration as decor.placed in the stables', () => {
    expect(applyHeartbeat({ type: 'hb.decor', decor: 'stall-3-paint', item: 'paint-blue', x: 412, y: 300 }))
      .toEqual([{ type: 'decor.placed', decor: 'stall-3-paint', item: 'paint-blue', area: 'stalls', x: 412, y: 300 }]);
  });
});

describe('parts for places', () => {
  it('gives the breed of an egg step and of her current egg', () => {
    expect(breedForStep(content, 'M10')).toBe('pebble');
    expect(breedForStep(content, 'M05')).toBe('nestling');
    expect(breedForStep(content, 'M11')).toBe('cosy');
    expect(breedForStep(null, null)).toBe('moon');
    expect(currentEggBreed(null, learnerAt({ r: 'R05', s: 'S04', m: 'M10' }), content)).toBe('pebble');
    expect(BREEDS.find((b) => b.id === 'bubble')).toEqual({ id: 'bubble', egg: null, building: 'bath-pond' });
  });
  it('marks own slots by her spelling step', () => {
    const late = learnerAt({ r: 'R05', s: 'S12', m: 'M02' });
    expect(ownSlots(['f', 'o', 'x'], late, content)).toEqual([true, true, true]);
    const early = learnerAt({ r: 'R05', s: 'S03', m: 'M02' });
    expect(ownSlots(['b', 'ee'], early, content)).toEqual([false, false]);
  });
  it('plans a tray of GPC ids with distractors by level', () => {
    const t1 = planTray(['h', 'a', 't'], 'S12', 1, makeRng(1));
    expect(t1).toEqual(expect.arrayContaining(['h', 'a', 't']));
    expect(t1).toHaveLength(5);
    expect(planTray(['h', 'a', 't'], 'S12', 2, makeRng(1))).toHaveLength(7);
  });
  it('allows name review for names she can decode at her reading step', () => {
    const l = learnerAt({ r: 'R05', s: 'S04', m: 'M02' });
    expect(canReviewName({ name: 'Tam', gems: ['t', 'a', 'm'], listName: 'Tam' }, l, content)).toBe(true);
    expect(canReviewName({ name: 'Charlotte', gems: ['ch', 'ar', 'l', 'o', 't', 't', 'e'], listName: 'Charlotte' }, l, content)).toBe(false);
    expect(canReviewName({ name: null, gems: [], listName: null }, l, content)).toBe(false);
  });
  it('hatches a building baby of the building breed, never shiny, without a learning result', () => {
    const roll = rollBuildingHatch('bubble', makeRng(2));
    expect(roll.breed).toBe('bubble');
    expect(roll.traits.shiny).toBe(false);
    const d = applyHeartbeat({ type: 'hb.hatched', baby: 'b9', egg: 'building', kind: 'building', breed: 'bubble', colours: roll.colours, traits: roll.traits, source: 'building' });
    expect(d).toEqual([{ type: 'egg.hatched', baby: 'b9', egg: 'building', kind: 'building', breed: 'bubble', colours: roll.colours, traits: roll.traits, source: 'building' }]);
  });
});
