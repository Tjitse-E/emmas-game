// The heartbeat state machine (spec 2.2): egg, naming, wish, move-in and a door visit.
// A start with a baby still unnamed resumes at naming for that baby and hatches no second egg (Review focus 3).
export type HbStage = 'egg-choice' | 'egg' | 'naming' | 'wish' | 'move-in' | 'door-visit' | 'done';
export type HbState = { stage: HbStage; baby: string | null; eggsInRow: number };
export type HbSignal =
  | { s: 'start'; unnamedBaby: string | null; offerChoice: boolean }
  | { s: 'egg-picked' }
  | { s: 'hatched'; baby: string }
  | { s: 'named' }
  | { s: 'wish-done' }
  | { s: 'moved-in'; visit: boolean }
  | { s: 'visit-done' }
  | { s: 'left' }
  | { s: 'other-activity' };
/** skipWishAfterThree: the parent setting 'skip-wish-after-three' (world.settings.skipWishAfterThree, R39). */
export type FlowOpts = { skipWishAfterThree: boolean };

export const IDLE: HbState = { stage: 'done', baby: null, eggsInRow: 0 };

export function step(st: HbState, sig: HbSignal, opts: FlowOpts): HbState {
  switch (sig.s) {
    case 'start':
      if (st.stage !== 'done') return st;
      if (sig.unnamedBaby) return { ...st, stage: 'naming', baby: sig.unnamedBaby };
      return { ...st, stage: sig.offerChoice ? 'egg-choice' : 'egg', baby: null };
    case 'egg-picked':
      return st.stage === 'egg-choice' ? { ...st, stage: 'egg' } : st;
    case 'hatched':
      return st.stage === 'egg' ? { stage: 'naming', baby: sig.baby, eggsInRow: st.eggsInRow + 1 } : st;
    case 'named':
      if (st.stage !== 'naming') return st;
      // Spec 2.2 "Measured risk": a parent switch, off by default.
      return { ...st, stage: opts.skipWishAfterThree && st.eggsInRow > 3 ? 'move-in' : 'wish' };
    case 'wish-done':
      return st.stage === 'wish' ? { ...st, stage: 'move-in' } : st;
    case 'moved-in':
      return st.stage === 'move-in' ? { ...st, stage: sig.visit ? 'door-visit' : 'done' } : st;
    case 'visit-done':
      return st.stage === 'door-visit' ? { ...st, stage: 'done' } : st;
    case 'left':
      return { ...st, stage: 'done' };
    case 'other-activity':
      return { ...st, eggsInRow: 0 };
  }
}
