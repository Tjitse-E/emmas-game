// The one place that turns scene actions into event drafts (spec 4.2 Actions, contracts C7).
// Translators are pure and return drafts without `visit` and hearts; finishDraft adds what only the store knows.
import { PAYLOAD_CHECKS } from './events.ts';
import type { GameEventDraft } from './events.ts';
import { applyHeartbeat } from './actions/heartbeat.ts';
import { applyNaming } from './actions/naming.ts';
import { applyPlaceAction } from './places/actions.ts';
import { applyGame } from '../game/game-actions.ts';
import type { ActionCtx } from '../types/contracts.ts';

export type { ActionCtx };
export type Action = { type: string; [k: string]: unknown };
export type RouterCtx = { visit: string; heartedThisVisit(baby: string): boolean };

/** Event types whose payload has a `visit` field (core's validator is the source). */
const VISIT_SCOPED = new Set(
  Object.entries(PAYLOAD_CHECKS).filter(([, c]) => typeof c === 'object' && Object.hasOwn(c, 'visit')).map(([t]) => t),
);
/** Spec 2.7 growth: a wish answered for a baby gives that baby a heart. */
const WISH_MOMENTS = new Set([
  'wish', 'bath-wish', 'twin-wish', 'one-or-many', 'tricky-act', 'basket-and', 'basket-adj', 'asking-bubble', 'two-state-wish',
]);

/** Fills the fields only the store knows: the visit, the baby default and the hearts. */
export function finishDraft(d: Record<string, unknown> & { type: string }, ctx: RouterCtx): GameEventDraft {
  const out: Record<string, unknown> = { ...d };
  // name.built may carry visit: null on purpose (a row or sky name outside a visit); only a missing visit is filled.
  if (VISIT_SCOPED.has(d.type) && (out.visit === undefined || (out.visit === null && d.type !== 'name.built'))) out.visit = ctx.visit;
  if (d.type === 'learn.result') {
    out.baby = (d.baby as string | null | undefined) ?? null;
    out.heart = out.baby !== null && WISH_MOMENTS.has(d.moment as string);
  }
  if (d.type === 'care.done') out.heart = d.station === 'rollcall' ? true : !ctx.heartedThisVisit(d.baby as string);
  if (d.type === 'name.clipHeard' && out.heart === undefined) out.heart = true;
  return out as GameEventDraft;
}

export function apply(action: Action, ctx: ActionCtx): GameEventDraft[] {
  let drafts: readonly unknown[];
  if (action.type.startsWith('hb.')) drafts = applyHeartbeat(action as never);
  else if (action.type.startsWith('naming.')) drafts = applyNaming(action as never);
  else if (action.type.startsWith('place/')) drafts = applyPlaceAction(action as never, ctx);
  else if (action.type.startsWith('game/')) drafts = applyGame(action, ctx);
  else throw new Error(`Unknown action ${action.type}`);
  return drafts.map((d) => finishDraft(d as Record<string, unknown> & { type: string }, ctx));
}
