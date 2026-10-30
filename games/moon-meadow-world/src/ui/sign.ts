// The signpost moment on the trail (2.4.0, docs/v4/2.4.md section 5.5; Layer.sign): three print cards on the arms of
// the signpost, each pointing along its road. Only a card tap answers, on pointerdown. The signs-star lane fills it
// (docs/v4/2.4-plan.md Task 14); step 0's stub answers right at once, so a trip plays through without it.
import type { MomentResult, SignHooks, SignSpec } from '../contracts';
import type { LayerCtx, OpenMoment } from './moment';

/** One signpost: resolves when she has tapped the right card (or the ghost has, helped). */
export async function runSign(_ctx: LayerCtx, _spec: SignSpec, _hooks: SignHooks, _setOpen: (m: OpenMoment | null) => void): Promise<MomentResult> {
  return { outcome: 'first', misses: 0, ms: 0 };
}
