// Actions that belong to no place: visits, settings, overrides, exclusion, missing clips, announcements.
import type { Action, RouterCtx } from '../core/actions.ts';

/** One sample per action type, for the integration contract test. */
export const GAME_SAMPLE_ACTIONS: Action[] = [
  { type: 'game/visit-start', visit: 'v2', tz: 120 }, { type: 'game/visit-end', reason: 'goodnight' },
  { type: 'game/enter', place: 'nest' }, { type: 'game/leave', place: 'nest' },
  { type: 'game/setting', key: 'skip-wish-after-three', value: true },
  { type: 'game/override', payload: { op: 'profile', profile: 'fresh' } },
  { type: 'game/override', payload: { type: 'learn.override', op: 'set-current', strand: 'r', step: 'R13', placed: ['R01'], side: [] } },
  { type: 'game/pass', strand: 'r', step: 'R13' }, { type: 'game/exclude', device: 'bbbbbbbb', on: true },
  { type: 'game/audio-missing', clip: 'word-hat' }, { type: 'game/announce', opening: 'bath-pond' },
  { type: 'game/clip-heard', baby: 'b1' },
];

export function applyGame(a: Action, ctx: RouterCtx): Record<string, unknown>[] {
  switch (a.type) {
    case 'game/visit-start': return [{ type: 'visit.start', visit: a.visit, tz: a.tz }];
    case 'game/visit-end': return [{ type: 'visit.end', visit: ctx.visit, reason: a.reason }];
    case 'game/enter': return [{ type: 'place.enter', place: a.place }];
    case 'game/leave': return [{ type: 'place.leave', place: a.place }];
    case 'game/setting': return [{ type: 'settings.set', key: a.key, value: a.value }];
    // learning's setCurrentOverride returns the payload with its type; the event type always wins.
    case 'game/override': return [{ ...(a.payload as object), type: 'learn.override' }];
    case 'game/pass': return [{ type: 'step.passed', strand: a.strand, step: a.step }];
    case 'game/exclude': return [{ type: 'exclude', device: a.device, on: a.on }];
    case 'game/audio-missing': return [{ type: 'audio.missing', clip: a.clip }];
    case 'game/announce': return [{ type: 'opening.announced', opening: a.opening }];
    case 'game/clip-heard': return [{ type: 'name.clipHeard', baby: a.baby, heart: true }];
    default: throw new Error(`Unknown game action ${a.type}`);
  }
}
