// G/tests/learning/scaffold.test.ts
import { describe, it, expect } from 'vitest';
import { moveScaffold } from '../../src/core/learning/scaffold.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';

const s = (level: 1 | 2 | 3 = 1) => ({ level, up: 0, down: 0 });

describe('moveScaffold', () => {
  it('three first tries in a row move up one level', () => {
    const x = s();
    moveScaffold(x, 'first', 3, b); moveScaffold(x, 'first', 3, b);
    expect(x.level).toBe(1);
    moveScaffold(x, 'first', 3, b);
    expect(x).toEqual({ level: 2, up: 0, down: 0 });
  });
  it('a miss breaks the run', () => {
    const x = s();
    for (const r of ['first', 'first', 'miss', 'first'] as const) moveScaffold(x, r, 3, b);
    expect(x.level).toBe(1);
  });
  it('two misses or helped in a row move down one level', () => {
    const x = s(3);
    moveScaffold(x, 'miss', 3, b);
    expect(x.level).toBe(3);
    moveScaffold(x, 'helped', 3, b);
    expect(x.level).toBe(2);
  });
  it('one miss between first tries never moves down', () => {
    const x = s(3);
    for (const r of ['miss', 'first', 'miss', 'first'] as const) moveScaffold(x, r, 3, b);
    expect(x.level).toBe(3);
  });
  it('stays inside 1 and the top level', () => {
    const x = s();
    for (let i = 0; i < 9; i++) moveScaffold(x, 'first', 2, b);
    expect(x.level).toBe(2);
    const y = s();
    for (let i = 0; i < 4; i++) moveScaffold(y, 'miss', 3, b);
    expect(y.level).toBe(1);
    const z = s();
    for (let i = 0; i < 6; i++) moveScaffold(z, 'first', 1, b);
    expect(z.level).toBe(1);
  });
});
