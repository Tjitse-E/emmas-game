// The ladders in plain graphemes, for the naming and spelling logic (makeSpellCtx) and the wish print.
import type { Content } from '../content/types.ts';

const gpcText = (c: Content, id: string): string => c.gpcs[id]?.text ?? id;

/** Spelling ladder in plain graphemes. Clusters, marks and tricky words have no grapheme. */
export function spellLadder(c: Content): { id: string; items: string[] }[] {
  return c.order.s.map((id) => ({
    id,
    items: (c.steps[id]?.items ?? []).map((it) => (it.gpc ? gpcText(c, it.gpc) : it.kind === 'capital' ? 'capital' : '')).filter(Boolean),
  }));
}

/** Reading ladder in plain graphemes and endings ('-s'). */
export function readLadder(c: Content): { id: string; items: string[] }[] {
  return c.order.r.map((id) => ({
    id,
    items: (c.steps[id]?.items ?? []).map((it) => (it.gpc ? gpcText(c, it.gpc) : it.ending && it.ending !== 'none' ? `-${it.ending}` : '')).filter(Boolean),
  }));
}
