// The Wave A save fixture (docs/v3/next/plan.md task G2): every event is valid at schema v1, the save loads through
// the real store with nothing quarantined, and the herd is five named babies. tools/make-wave-a-save.ts writes it.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { parseSaveFile } from '../../src/core/save/export.ts';
import { openGameData } from '../../src/save/game-data.ts';
import { memoryBackend } from '../../src/save/backend.ts';
import { createGameFolder } from '../../src/core/world/index.ts';
import { createLearnerSlice, currentStep, type Learner } from '../../src/core/learning/index.ts';
import { createPlacesSlice } from '../../src/core/places/index.ts';
import { content } from '../../src/core/content/static.ts';
import { worldView } from '../../src/game/world-view.ts';
import { v2Deps } from '../../src/game/v2-deps.ts';

const text = readFileSync(new URL('../fixtures/wave-a-save.json', import.meta.url), 'utf8');

describe('the Wave A save fixture', () => {
  const parsed = parseSaveFile(text);

  it('is a v3 export file', () => {
    expect(parsed.kind).toBe('v3');
  });

  it('holds only events that pass validateEvent at schema v1', () => {
    const events = parsed.kind === 'v3' ? parsed.events : [];
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(validateEvent(e).ok, JSON.stringify(e)).toBe(true);
      expect((e as { v: number }).v).toBe(SCHEMA_VERSION);
    }
    const types = events.map((e) => (e as { type: string }).type);
    expect(types.filter((t) => t === 'visit.start')).toHaveLength(3);
    expect(types.filter((t) => t === 'visit.end')).toHaveLength(3);
    expect(types.filter((t) => t === 'placement.done')).toHaveLength(3);
  });

  it('loads through the store with nothing quarantined, five named babies and maths placed at M10', async () => {
    const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
    const data = await openGameData({
      folder, contentHash: 'test', codeVersion: 'test', backend: memoryBackend(), schedule: () => {},
    });
    const out = await data.importText(text, v2Deps);
    expect(out).toMatchObject({ kind: 'v3', quarantined: 0 });
    expect(data.status().quarantined).toBe(0);
    expect(await data.quarantine()).toEqual([]);
    const state = data.folded().state as never as { learner: Learner };
    const w = worldView(state as never, { hasName: () => true, firstSound: () => null }, null);
    expect(w.herd.map((b) => b.name).sort()).toEqual(['Bex', 'Dot', 'Fen', 'Pip', 'Tam']);
    // Without the store's reconcile (the 1.0.1 maths lift) her maths step is where Wave A left it.
    expect(currentStep(state.learner, content, 'm')).toBe('M10');
    expect(currentStep(state.learner, content, 'r')).toBe('R21');
    expect(currentStep(state.learner, content, 's')).toBe('S12');
  });
});
