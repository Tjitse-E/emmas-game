import { describe, it, expect } from 'vitest';
import { moonName, pendingMoonNames } from '../../src/scenes/heartbeat/moon-name.ts';
import { moonHintDue } from '../../src/core/heartbeat/flow.ts';
import { applyNaming } from '../../src/core/actions/naming.ts';
import { fakeDeps } from './fakes.ts';

describe('the moon told me a new name', () => {
  const herd = [
    { id: 'a', name: 'Tamo', unknownName: true, clipHeard: false },
    { id: 'b', name: 'Zib', unknownName: true, clipHeard: false },
    { id: 'c', name: 'Lili', unknownName: true, clipHeard: true },
    { id: 'd', name: 'Ken', unknownName: false, clipHeard: false },
  ];
  it('finds invented names whose clip has arrived and was not heard yet', () => {
    expect(pendingMoonNames(herd, (k) => ['Tamo', 'Lili', 'Ken'].includes(k))).toEqual(['a']);
  });
  it('plays Lumi, then the name, then records it', async () => {
    const f = fakeDeps({ names: ['tamo'] });
    await moonName(herd[0], f.deps);
    expect(f.said).toEqual(['lumi-moon-name', 'name:tamo!', 'foal-yay']);
    expect(f.actions).toEqual([{ type: 'naming.clip-heard', baby: 'a' }]);
    expect(applyNaming(f.actions[0])).toEqual([{ type: 'name.clipHeard', baby: 'a', heart: true }]);
  });
});

describe('moonHintDue (R54)', () => {
  const none = new Set<string>();
  it('is due only in visit 1, from the third hatch, before it was announced', () => {
    expect(moonHintDue({ visitIndex: 1, hatchesThisVisit: 3, announced: none })).toBe(true);
    expect(moonHintDue({ visitIndex: 1, hatchesThisVisit: 2, announced: none })).toBe(false);
    expect(moonHintDue({ visitIndex: 2, hatchesThisVisit: 3, announced: none })).toBe(false);
    expect(moonHintDue({ visitIndex: 1, hatchesThisVisit: 4, announced: new Set(['moon-hint']) })).toBe(false);
  });
});
