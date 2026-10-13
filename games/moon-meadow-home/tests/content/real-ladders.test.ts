// G/tests/content/real-ladders.test.ts
import { describe, it, expect } from 'vitest';
import { readContent, readPhonicsKeys } from '../../tools/lib/read-content.ts';
import { realErrors } from './real.ts';

describe('real ladders', () => {
  const c = readContent('1.0');

  it('has every curriculum step plus the two new contrast steps', () => {
    expect(c.order.r).toHaveLength(55);
    expect(c.order.s).toHaveLength(46);
    expect(c.order.m).toHaveLength(54);
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

describe('the 1.0.1 maths steps (docs/v3/next/plan.md 3.2)', () => {
  const c = readContent('1.0.1');
  const NEW = ['M12A', 'M12B', 'M12C', 'M12D', 'M12E', 'M12F'];
  const totalOf = (t: { op: string; a?: number; b?: number; whole?: number }) => (t.op === 'pair' ? t.a! + t.b! : t.whole!);

  it('loads the six new steps between M12 and M13, in order', () => {
    const at = c.order.m.indexOf('M12');
    expect(c.order.m.slice(at, at + 8)).toEqual(['M12', ...NEW, 'M13']);
    for (const id of NEW) expect(c.steps[id], id).toMatchObject({ loaded: true, release: '1.0', top: 3 });
  });

  it('asks totals 7 to 15 but never 10, with stones and shown parts 2 to 9', () => {
    for (const id of NEW) {
      for (const it of c.steps[id].items) {
        const t = c.items[it.id].task!;
        const total = totalOf(t as never);
        expect([7, 8, 9, 11, 12, 13, 14, 15], it.id).toContain(total);
        const nums = t.op === 'pair' ? [t.a, t.b] : t.op === 'missing' ? [t.part, t.whole - t.part] : [];
        expect(nums, it.id).toHaveLength(2);
        for (const n of nums) {
          expect(n, it.id).toBeGreaterThanOrEqual(2);
          expect(n, it.id).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it('never lists two neighbouring items with the same total', () => {
    for (const id of NEW) {
      const totals = c.steps[id].items.map((it) => totalOf(c.items[it.id].task as never));
      for (let i = 1; i < totals.length; i++) expect(totals[i], `${id} item ${i}`).not.toBe(totals[i - 1]);
    }
  });

  // The planner offers new items in content order, three a day, so the first three are her first day on a step.
  // Review 2026-10-13: a first day of 2+5, 2+6, 2+7 was all "count on two".
  it('starts each step with three items that share no part', () => {
    for (const id of NEW) {
      type Part = { op: string; a?: number; b?: number; whole?: number; part?: number };
      const first = c.steps[id].items.slice(0, 3).map((it) => c.items[it.id].task as Part);
      if (first[0].op === 'pair') {
        const parts = first.flatMap((t) => [...new Set([t.a!, t.b!])]);
        expect(new Set(parts).size, `${id} ${JSON.stringify(first)}`).toBe(parts.length);
      } else {
        const shown = first.map((t) => t.part!);
        const answers = first.map((t) => t.whole! - t.part!);
        expect(new Set(shown).size, `${id} shown parts ${shown}`).toBe(3);
        expect(new Set(answers).size, `${id} answers ${answers}`).toBe(3);
      }
      const all = new Set(c.steps[id].items.map((it) => totalOf(c.items[it.id].task as never)));
      expect(new Set(first.map((t) => totalOf(t as never))).size, `${id} totals`).toBe(Math.min(3, all.size));
    }
  });

  it('puts each pair step before the missing step of the same totals', () => {
    const ops = (id: string) => new Set(c.steps[id].items.map((it) => c.items[it.id].task!.op));
    for (const [pairStep, gapStep] of [['M12A', 'M12B'], ['M12C', 'M12D'], ['M12E', 'M12F']]) {
      expect(c.steps[pairStep].index).toBeLessThan(c.steps[gapStep].index);
      expect([...ops(pairStep)]).toEqual(['pair']);
      expect([...ops(gapStep)]).toEqual(['missing']);
      const totals = (id: string) => [...new Set(c.steps[id].items.map((it) => totalOf(c.items[it.id].task as never)))].sort();
      expect(totals(pairStep)).toEqual(totals(gapStep));
    }
  });

  it('has the hay rack on exactly M12, M12B, M12D and M12F', () => {
    const withRack = c.order.m.filter((id) => c.steps[id].moments.includes('hay-rack'));
    expect(withRack).toEqual(['M12', 'M12B', 'M12D', 'M12F']);
  });

  it('keeps every 1.1 step and moment unloaded at 1.0.1', () => {
    for (const s of Object.values(c.steps)) if (s.release === '1.1') expect(s.loaded, s.id).toBe(false);
    for (const m of Object.values(c.moments)) if (m.release === '1.1') expect(m.loaded, m.id).toBe(false);
  });
});
