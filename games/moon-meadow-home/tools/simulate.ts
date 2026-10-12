// G/tools/simulate.ts
// Prints the simulated learner report (learning Task A21).
// Usage: npm run simulate -- [--seed 1] [--accuracy 0.85] [--weeks 12] [--profile year1] [--release 1.0]
//        [--true R21,S12,M10 | --true none] [--visits 2-3] [--moments 15-19]
// For the year1 profile the probe answers follow Emma's level (R21, S12, M10) unless --true says otherwise.
import { parseArgs } from 'node:util';
import type { Release, StepId, Strand } from '../src/core/content/types.ts';
import { readContent } from './lib/read-content.ts';
import { formatReport, simulate } from './lib/sim.ts';

const EMMA: Partial<Record<Strand, StepId>> = { r: 'R21', s: 'S12', m: 'M10' };
const RELEASES: readonly Release[] = ['1.0', '1.1', '1.2', '1.3', 'later'];

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

const report = simulate({
  content,
  seed: num('seed', values.seed),
  accuracy: num('accuracy', values.accuracy),
  weeks: num('weeks', values.weeks),
  visitsPerWeek: range('visits', values.visits),
  momentsPerVisit: range('moments', values.moments),
  profile,
  trueLevel: trueLevel(values.true, profile),
});

const s = content.budget.share;
console.log(`Release ${content.release}, profile ${profile}, seed ${values.seed}, accuracy ${values.accuracy}, ${values.weeks} weeks`);
console.log(`Shares: current ${s.current}, review ${s.review}, mixed ${s.mixed}`);
console.log(formatReport(report));
