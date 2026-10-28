// The bead tree's pattern moment (docs/v4/2.3.md section 19.2): a necklace string over the baby with 3 gaps and a
// tray of 3 or 4 beads below. She drags a bead to the string and it goes to the glowing gap. Each gap is its own
// checked choice with its own hint ladder (HintRunner 'maths'): the first miss runs the light contrast (the bead rolls
// back, one full repeat of the pattern lights up, "Look at the pattern again."), an idle gives the focused hint (the
// repeat lights bead by bead with a tick and the matching place pulses: helped), a second miss brings the ghost. A
// wrong bead is never more fun than a right one: a right bead clinks into place and sparkles. On her first visit
// ever (`demo`) the ghost carries the right bead into the first gap, as the first egg's "Drag one stone" did.
//
// Step 0 stub: every gap is a first try at once. The patterns lane builds it.
import type { Layer, MomentResult } from '../contracts';
import type { LayerCtx, OpenMoment } from './moment';

type BeadsArgs = Parameters<Layer['beads']>;

export function runBeads(
  _ctx: LayerCtx, spec: BeadsArgs[0], hooks: BeadsArgs[1], _setOpen: (m: OpenMoment | null) => void, _o: BeadsArgs[2] = {},
): Promise<MomentResult[]> {
  const out = spec.gaps.map((_, i) => {
    const r: MomentResult = { outcome: 'first', misses: 0, ms: 0 };
    hooks.gap(i, r);
    return r;
  });
  return Promise.resolve(out);
}
