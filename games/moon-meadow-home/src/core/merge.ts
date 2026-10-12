// The union of event sets by id, in fold order.
import { compareEvents } from './events.ts';
import type { EventBase, GameEvent } from './events.ts';
import { canonicalJson } from './hash.ts';

export function sortEvents<E extends EventBase>(events: readonly E[]): E[] {
  return [...events].sort(compareEvents);
}

/** Union by id. If one id carries two different bodies (never in normal play), the lower canonical JSON wins, so merge stays commutative. */
export function merge(a: readonly GameEvent[], b: readonly GameEvent[]): GameEvent[] {
  const byId = new Map<string, GameEvent>();
  for (const e of [...a, ...b]) {
    const prev = byId.get(e.id);
    if (!prev) byId.set(e.id, e);
    else if (prev !== e && canonicalJson(e) < canonicalJson(prev)) byId.set(e.id, e);
  }
  return sortEvents([...byId.values()]);
}
