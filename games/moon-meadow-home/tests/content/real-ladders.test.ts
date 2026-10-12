// G/tests/content/real-ladders.test.ts
import { describe, it, expect } from 'vitest';
import { readContent, readPhonicsKeys } from '../../tools/lib/read-content.ts';
import { realErrors } from './real.ts';

describe('real ladders', () => {
  const c = readContent('1.0');

  it('has every curriculum step plus the two new contrast steps', () => {
    expect(c.order.r).toHaveLength(55);
    expect(c.order.s).toHaveLength(46);
    expect(c.order.m).toHaveLength(48);
    expect(c.order.r.indexOf('R04D')).toBe(c.order.r.indexOf('R04') + 1);
    expect(c.order.s.indexOf('S03D')).toBe(c.order.s.indexOf('S03') + 1);
  });

  it('flags school and contrast steps', () => {
    expect(c.steps.R19.school && c.steps.S10.school).toBe(true);
    for (const s of ['R04D', 'R11', 'R20', 'S03D', 'S06']) expect(c.steps[s].contrast).toBe(true);
    expect(c.steps.R06.display && c.steps.R25.display).toBe(true);
  });

  it('loads steps by release', () => {
    expect(c.steps.R30.loaded).toBe(true);
    expect(c.steps.R24.loaded).toBe(false);
    expect(c.steps.M03.loaded).toBe(false);
    expect(readContent('1.1').steps.M03.loaded).toBe(true);
    expect(readContent('1.2').steps.R27.loaded).toBe(true);
    expect(c.steps.R31.loaded).toBe(false);
  });

  it('starts Emma at R13 and R21, S09 and S12, M01 and M10', () => {
    expect(c.budget.profiles.year1.r).toEqual({ lo: 'R13', probe: 'R21', floor: 'R01' });
    expect(c.budget.defaultProfile).toBe('year1');
  });

  it('has the maths items the eggs need', () => {
    expect(c.steps.M09.items).toHaveLength(9);
    expect(c.steps.M12.items).toHaveLength(26);
    expect(c.items['m:pair:3+7'].task).toEqual({ op: 'pair', a: 3, b: 7 });
  });

  it('has the wall and station-wish moments (R22, R34)', () => {
    expect(c.moments.wall).toMatchObject({ strand: 'm', release: '1.0', loaded: true });
    expect(c.moments['station-wish']).toMatchObject({ strand: 'r', release: '1.0', loaded: true });
    for (const s of ['M05', 'M09', 'M10', 'M11', 'M12']) expect(c.steps[s].moments, s).toContain('wall');
  });

  it('uses the audio stream letter-sound keys (R24)', () => {
    expect(c.gpcs['oo.uu'].sound).toBe('oo-short');
    expect(c.gpcs['u.uu'].sound).toBe('oo-short');
    for (const id of ['ew', 'ue.yoo', 'u-e', 'u.yoo']) expect(c.gpcs[id].sound, id).toBe('yoo');
    const keys = new Set(readPhonicsKeys());
    for (const g of Object.values(c.gpcs)) if (g.sound !== null) expect(keys.has(g.sound), g.id).toBe(true);
  });

  it('passes the validator for GPCs, steps, items, moments and the budget', () => {
    expect(realErrors(['BUILD', 'GPC_', 'MOMENT_', 'STEP_', 'ITEM_', 'PAIR_UNLOCK', 'BUDGET_'])).toEqual([]);
  });
});
