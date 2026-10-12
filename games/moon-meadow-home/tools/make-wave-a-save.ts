// G/tools/make-wave-a-save.ts
// Writes tests/fixtures/wave-a-save.json: a save as Wave A (release 1.0) wrote it, for the 1.0.1 upgrade checks
// (docs/v3/next/plan.md task G2). Three visits, placement ended at R21, S12 and M10, five named babies, and egg
// results on bonds to 10. Events go through the real translators and the real stamp, so ids, clocks and hearts are
// what the game itself writes. Usage, from G: node tools/make-wave-a-save.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyHeartbeat } from '../src/core/actions/heartbeat.ts';
import { applyNaming } from '../src/core/actions/naming.ts';
import { finishDraft } from '../src/core/actions.ts';
import { stamp, type DeviceMeta } from '../src/core/factory.ts';
import { uuid5 } from '../src/core/ids.ts';
import { buildExport, type ExportFile } from '../src/core/save/export.ts';
import { createLearner } from '../src/core/learning/index.ts';
import { placementLists } from '../src/core/learning/status.ts';
import { spellingToGems } from '../src/core/naming/sounds.ts';
import { breedForStep } from '../src/core/eggs/breed.ts';
import type { GameEvent, GameEventDraft } from '../src/core/events.ts';
import type { StepId, Strand } from '../src/core/content/types.ts';
import { GAME_ROOT, readContent } from './lib/read-content.ts';

/** Emma's Wave A level (tools/simulate.ts EMMA) and the maths placement the 1.0.1 plan names (section 9, G2). */
const PLACED: Record<Strand, StepId> = { r: 'R21', s: 'S12', m: 'M10' };
const M_PLACED: StepId[] = ['M01', 'M02', 'M05', 'M07', 'M08', 'M09'];
const NAMES = ['Tam', 'Pip', 'Dot', 'Fen', 'Bex'];
/** Fixed namespace, so the baby ids are the same on every run and the fixture only changes when this file does. */
const NS = '6f1c2a40-8d1e-4b7a-9a52-3c0e5d7f1a22';
/** 9, 10 and 11 October 2026 at 17:00 in Cyprus (UTC+3 in October). */
const DAY = 86_400_000;
const START = Date.UTC(2026, 9, 9, 14, 0, 0);
const TZ = 180;

const c = readContent('1.0');
let meta: DeviceMeta = { dev: 'emmawave', nextSeq: 1, hlc: '0000000000000-0000' };
const events: GameEvent[] = [];
let now = START;
let visit = 'none';

function write(drafts: readonly unknown[], stepMs = 20_000): void {
  const done = drafts.map((d) => finishDraft(d as Record<string, unknown> & { type: string }, {
    visit, now, heartedThisVisit: () => false,
  } as never)) as GameEventDraft[];
  const r = stamp(meta, done, now);
  meta = r.meta;
  events.push(...r.events);
  now += stepMs;
}

function babyId(n: number): string { return uuid5(`wave-a-baby-${n}`, NS); }

function hatch(n: number, item: string | null): void {
  const baby = babyId(n);
  const [a, b] = item ? item.slice('m:pair:'.length).split('+').map(Number) : [0, 0];
  const learn = item ? {
    baby,
    payload: {
      type: 'learn.result' as const, strand: 'm' as const, step: 'M10', carrier: `m:pair:${a},${b}`,
      items: [{ id: item, r: 'first' as const }], result: 'first' as const, ms: 4200, scaffold: 1 as const, error: null,
      place: 'nest', moment: 'egg-two-stone' as const, slot: 'current' as const, probe: false,
    },
  } : null;
  write(applyHeartbeat({
    type: 'hb.hatched', baby, egg: 'plain', kind: item ? 'two-stone' : 'moon', breed: breedForStep(c, item ? 'M10' : 'M01'),
    colours: { body: '#ffe0ef', mane: '#ff7fbf', mane2: '#9d7bff' },
    traits: { shiny: false, speckled: false, golden: false, founder: n === 0 }, source: 'nest', learn,
  } as never));
  const name = NAMES[n];
  write(applyNaming({ type: 'naming.assign', baby, name, gems: spellingToGems(name.toLowerCase()), route: 'gold', listName: name }));
}

function startVisit(day: number): void {
  now = START + day * DAY;
  visit = `v-wavea${day}`;
  write([{ type: 'visit.start', visit, tz: TZ }]);
}
function endVisit(): void { write([{ type: 'visit.end', visit, reason: 'goodnight' }]); }

// Visit 1: placement ends in every strand (the store writes these facts after the probes), then two eggs.
startVisit(0);
const fresh = createLearner(c);
for (const strand of ['r', 's', 'm'] as const) {
  const lists = strand === 'm' ? { placed: M_PLACED, side: [] } : placementLists(fresh, c, strand, PLACED[strand]);
  write([{ type: 'placement.done', strand, current: PLACED[strand], ...lists }]);
}
hatch(0, null);
hatch(1, 'm:pair:3+7');
endVisit();
// Visit 2: two more eggs on bonds to 10.
startVisit(1);
hatch(2, 'm:pair:4+6');
hatch(3, 'm:pair:3+7');
endVisit();
// Visit 3: one egg, then goodnight.
startVisit(2);
hatch(4, 'm:pair:4+6');
endVisit();

const file: ExportFile = buildExport(events, now);
const out = join(GAME_ROOT, 'tests', 'fixtures', 'wave-a-save.json');
writeFileSync(out, JSON.stringify(file, null, 1) + '\n');
console.log(`wrote ${events.length} events to ${out}`);
