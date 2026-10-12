// G/src/core/planner/types.ts
// Planner shapes (contracts C6). The planner is pure: content, learner, time and assets come in as a PlanContext.
import type { Content, GpcId, ItemId, LearnStrand, MathsTask, MomentKind, StepId, Strand, WordTag } from '../content/types.ts';
import type { Learner, Slot } from '../learning/types.ts';

export type { Rng } from '../rng.ts';
export type { MathsTask } from '../content/types.ts';

export type AssetIndex = { clip(id: string): boolean; picture(id: string): boolean };
export type PlanContext = {
  c: Content;
  l: Learner;
  now: number;
  assets: AssetIndex;
  /** R59: test builds only (the setScaffold hook). The planner uses it instead of the learned level. */
  testScaffold?: Partial<Record<StepId, 1 | 2 | 3>>;
};
export type ItemRequest = {
  strand: Strand;
  moments: MomentKind[];             // what this place can host
  place: string;                     // for the log
  firstWish?: boolean;               // the newborn's first wish
  tags?: WordTag[];                  // word tags the place needs, for example ['bath']
  doors?: { built: number; own: number | null };
  avoid?: string[];                  // carrier keys not to repeat
  accept?: (p: Pick) => boolean;     // the place can veto a candidate pick (for example a door that is hidden)
};
export type Carrier =
  | { kind: 'word'; word: string }
  | { kind: 'plural'; word: string; form: 'one' | 'many'; count: number }
  | { kind: 'twin'; pair: string; words: [string, string] }
  | { kind: 'spell'; focus: GpcId[] }
  | { kind: 'first-sound'; gpc: GpcId }
  | { kind: 'maths'; task: MathsTask }
  | { kind: 'door'; n: number }
  | { kind: 'phrase'; phrase: string }
  | { kind: 'letters'; letters: string[] }
  | { kind: 'name'; babyId: string; name: string };
export type Pick = {
  strand: LearnStrand;
  step: StepId | null;
  slot: Slot;
  moment: MomentKind;
  items: ItemId[];
  carrier: Carrier;
  scaffold: 1 | 2 | 3;
  probe: boolean;
  pair?: string;
  /** R36: display-only tricky words printed with the carrier ('the' before a wish word). Never items, never logged. */
  display?: string[];
};
export type CarrierChoice = { carrier: Carrier; items: ItemId[]; pair?: string };
