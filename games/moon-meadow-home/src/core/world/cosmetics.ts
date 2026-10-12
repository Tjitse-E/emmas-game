// Cosmetic home state. The latest event in fold order wins per field.
import type { Slice } from '../fold/engine.ts';
import { isWinningFact } from './facts.ts';
import type { FactsState } from './facts.ts';

export type DecorRec = { item: string; area: string; x: number; y: number };
export type CosmeticsState = {
  rowNames: Record<string, string>;
  skyNames: Record<string, string>;
  decor: Record<string, DecorRec>;
  /** Gifts from the v2 jar, shown as decorations in the meadow. */
  v2Gifts: string[];
};

export const cosmeticsSlice: Slice<'cosmetics', CosmeticsState> = {
  name: 'cosmetics',
  version: '1',
  init: () => ({ rowNames: {}, skyNames: {}, decor: {}, v2Gifts: [] }),
  apply(s, e, ctx) {
    switch (e.type) {
      case 'row.named': s.rowNames[String(e.row)] = e.name; break;
      case 'sky.named': s.skyNames[String(e.sky)] = e.name; break;
      case 'decor.placed': s.decor[e.decor] = { item: e.item, area: e.area, x: e.x, y: e.y }; break;
      case 'import.v2':
        if (isWinningFact(ctx.get<FactsState>('facts'), e) && e.gifts.length > s.v2Gifts.length) s.v2Gifts = [...e.gifts];
        break;
      default: break;
    }
    return s;
  },
};
