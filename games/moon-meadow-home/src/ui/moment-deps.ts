// The moment controller's real deps (Task A3): the store's dispatch, the platform clock, the audio facade,
// and platform's moonbeam and ghost hand (R10). Kept apart from moment.ts so its unit test loads no store.
import { game } from '../game.svelte.ts';
import { audio, type SpeakId } from '../audio/index.ts';
import { clock } from '../platform/clock.ts';
import { timing } from '../platform/timing.ts';
import { ghost } from './ghost-hand.svelte.ts';
import { moonbeam } from './moonbeam.svelte.ts';
import type { MomentDeps } from './moment.ts';
import type { PlaceAction } from '../core/places/actions.ts';

export function defaultDeps(dispatch: (a: PlaceAction) => void = (a) => { game.dispatch(a); }): MomentDeps {
  return {
    now: () => clock.now(),
    // Idle is Emma's time, so it is never scaled. In fast mode (flows) there is no idle timer at all:
    // a flow drives idle through the test hook, and a zero delay would repeat the hints without end.
    setTimer: (fn, ms) => {
      if (timing.speed === 0) return () => {};
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    },
    say: (ids) => audio.sayAll(ids as SpeakId[]),
    act: () => audio.act(),
    dispatch,
    hasClip: (id) => audio.hasClip(id),
    show: (t) => moonbeam.show(t),
    demo: (t) => ghost.tap(t),
    clear: () => { moonbeam.clear(); ghost.hide(); },
  };
}
