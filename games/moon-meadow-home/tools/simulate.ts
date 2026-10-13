// G/tools/simulate.ts
// Prints the simulated learner report (learning Task A21).
// Usage: npm run simulate -- [--seed 1] [--accuracy 0.85] [--weeks 12] [--profile year1] [--release 1.0]
//        [--true R21,S12,M10 | --true none] [--visits 2-3] [--moments 15-19] [--lift-true M10]
// For the year1 profile the probe answers follow Emma's level (R21, S12, M10) unless --true says otherwise.
// The main run leaves out the 1.0.1 maths lift, so its pacing stays comparable with 1.0. For the year1 profile a
// second run starts from a save placed at M10 (her Wave A save), records the lift (docs/v3/next/plan.md N9) and the
// re-probe after it, serves maths as eggs (nextEgg: totals, easy review, next-band preview), and prints where the
// re-probe landed and when totals over 10 first came. --lift-true is how far her maths really goes (default M10:
// the re-probe then lands on M12A, the slowest case).
import { parseArgs } from 'node:util';
import { RELEASES, type Release, type StepId, type Strand } from '../src/core/content/types.ts';
import { readContent } from './lib/read-content.ts';
import { formatReport, simulate } from './lib/sim.ts';

const EMMA: Partial<Record<Strand, StepId>> = { r: 'R21', s: 'S12', m: 'M10' };

function fail(msg: string): never {
  console.error(msg);
  process.exit(2);
}

function num(name: string, raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) fail(`--${name} must be a number, got "${raw}"`);
  return n;
}

function range(name: string, raw: string): [number, number] {
  const m = /^(\d+)(?:-(\d+))?$/.exec(raw);
  if (!m) fail(`--${name} must be a number or a range like 2-3, got "${raw}"`);
  const lo = Number(m[1]);
  const hi = m[2] === undefined ? lo : Number(m[2]);
  if (hi < lo) fail(`--${name}: ${hi} is below ${lo}`);
  return [lo, hi];
}

function trueLevel(raw: string | undefined, profile: string): Partial<Record<Strand, StepId>> | undefined {
  if (raw === undefined) return profile === 'year1' ? EMMA : undefined;
  if (raw === 'none') return undefined;
  const out: Partial<Record<Strand, StepId>> = {};
  for (const step of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const strand = step[0]?.toLowerCase();
    if (strand !== 'r' && strand !== 's' && strand !== 'm') fail(`--true: "${step}" is not a reading, spelling or maths step`);
    out[strand] = step;
  }
  return out;
}

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    accuracy: { type: 'string', default: '0.85' },
    weeks: { type: 'string', default: '12' },
    profile: { type: 'string', default: 'year1' },
    release: { type: 'string' },
    true: { type: 'string' },
    visits: { type: 'string', default: '2-3' },
    moments: { type: 'string', default: '15-19' },
    'lift-true': { type: 'string', default: 'M10' },
  },
});

const release = values.release as Release | undefined;
if (release !== undefined && !RELEASES.includes(release)) fail(`--release must be one of ${RELEASES.join(', ')}`);
const content = readContent(release);
const profile = values.profile;
if (!content.budget.profiles[profile]) fail(`--profile must be one of ${Object.keys(content.budget.profiles).join(', ')}`);
for (const step of Object.values(trueLevel(values.true, profile) ?? {})) {
  if (!content.steps[step]) fail(`--true: unknown step ${step}`);
}

const options = {
  content,
  seed: num('seed', values.seed),
  accuracy: num('accuracy', values.accuracy),
  weeks: num('weeks', values.weeks),
  visitsPerWeek: range('visits', values.visits),
  momentsPerVisit: range('moments', values.moments),
  profile,
  trueLevel: trueLevel(values.true, profile),
};
const report = simulate({ ...options, lift: false });

const s = content.budget.share;
console.log(`Release ${content.release}, profile ${profile}, seed ${values.seed}, accuracy ${values.accuracy}, ${values.weeks} weeks`);
console.log(`Shares: current ${s.current}, review ${s.review}, mixed ${s.mixed}`);
console.log(formatReport(report));

if (profile === 'year1' && content.steps.M12F?.loaded) {
  const liftTrue = values['lift-true'];
  if (!content.steps[liftTrue] || content.steps[liftTrue].strand !== 'm') fail(`--lift-true: ${liftTrue} is not a maths step`);
  const lifted = simulate({
    ...options, trueLevel: { ...options.trueLevel, m: liftTrue }, lift: true, placedAt: { m: EMMA.m }, eggs: true,
  });
  const week = (t: number) => ((t - lifted.startT) / 604_800_000).toFixed(1);
  const firstOf = (totals: number[]): string => {
    const t = Math.min(...totals.map(n => lifted.firstTotalT[n] ?? Infinity));
    return t === Infinity ? `not within ${values.weeks} weeks` : `in week ${week(t)}`;
  };
  const m12f = lifted.steps.find(st => st.step === 'M12F');
  const days = m12f?.passT != null ? ((m12f.passT - lifted.startT) / 86_400_000).toFixed(0) : null;
  console.log('');
  console.log(`With the 1.0.1 maths lift, from a save placed at ${EMMA.m}, maths really up to ${liftTrue}:`);
  console.log(`  re-probe landed on ${lifted.liftLanded ?? '-'}`);
  console.log(`  first total 11 or 12 ${firstOf([11, 12])}, first total 13 to 15 ${firstOf([13, 14, 15])}`);
  console.log(`  maths steps passed ${lifted.passedCount.m}, current now ${lifted.finalCurrent.m ?? '-'}`);
  console.log(`  M12F passed ${days === null ? `not within ${values.weeks} weeks` : `after ${days} days`}`);
}
