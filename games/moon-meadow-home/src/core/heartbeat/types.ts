// Shared types of the heartbeat workstream. Shapes that other streams share come from contracts (R41).
import type {
  BreedId as ContractBreedId, Colours as ContractColours, ErrorTag as ContractErrorTag, LearnStrand, Pick,
  Result as ContractResult, StepStatus, Traits as ContractTraits,
} from '../../types/contracts.ts';

export type Strand = LearnStrand;
export type Result = ContractResult;
export type ErrorTag = ContractErrorTag;
export type Scaffold = 1 | 2 | 3;
/** Learning's step status, plus 'locked' for a step that is not loaded or not reached. */
export type StepState = StepStatus | 'locked';
export type Source = 'current' | 'review' | 'mixed' | 'school' | 'probe' | 'golden' | 'side';
export type PlaceId = 'nest' | 'wish' | 'twin-wish' | 'station' | 'naming' | 'door' | 'rollcall';
export type Colours = ContractColours;
/** Four required booleans (contracts C1). */
export type Traits = ContractTraits;
/** The nine breeds (contracts C1). */
export type BreedId = ContractBreedId;
export type StationId = 'hay' | 'brush' | 'hat' | 'nap' | 'swing' | 'bath';
export type CareKind = 'brush' | 'cuddle' | 'treat' | 'trick' | 'splash' | 'station' | 'rollcall';
export type NameTarget = { kind: 'baby'; baby: string } | { kind: 'row'; row: number } | { kind: 'sky'; index: number };
export type NameRoute = 'bell' | 'garden-pic' | 'garden-sound' | 'gold';
/** Heartbeat's internal view of a result. Events are built only by learning's learnResultPayload (17B). */
export type LearnResultDraft = {
  type: 'learn.result'; strand: Strand; step: string; carrier: string;
  items: { id: string; result: Result }[]; result: Result; ms: number; scaffold: Scaffold; error?: ErrorTag;
  place: PlaceId; probe: boolean; source: Source; baby?: string; moment?: string; slot?: string;
};
/** Built from learning's Pick by src/scenes/heartbeat/learn-bridge.ts (Task 17B); moment and slot pass through to the event. */
export type Served = {
  strand: Strand; step: string; id: string; carrier: string; items: string[]; scaffold: Scaffold;
  probe: boolean; source: Source; twin?: string; moment?: string; slot?: string;
  /** The planner's pick behind it. Only learning's learnResultPayload(pick, outcome) builds a result from it (R17). */
  pick?: Pick;
  /** R36: display-only tricky words printed before the carrier ('the'). Never items, never logged. */
  display?: string[];
};
/** The heartbeat's own views of words and names. learn-bridge.ts builds them from learning's Content. */
export type WordEntry = {
  word: string; gr: string[]; step: string; picture: string; clip: string; one?: string; plural?: string;
  ending?: '-s' | '-es'; pair?: string; pairTag?: 'aeu' | 'final' | 'vw' | 'jy' | 'th' | 'ch' | 'r20' | 'split-e' | 'vowel';
  station?: StationId; confuse?: string[]; basket: boolean;
  /** R36: indexes into gr of heart-part graphemes (tricky words). */
  heart?: number[];
  /** A food a baby unicorn eats (docs/v3/next/plan.md N25): tagged food in content and on the allow-list. */
  food?: true;
};
export type NameEntry = {
  /** split[i].gpc: learning's GPC id of that grapheme, when the name comes from the name bank. */
  name: string; key: string; split: { g: string; ph: string[]; gpc?: string }[]; ph: string[]; first: string;
  pic: 'flowers' | 'gems' | 'sky' | 'sweets' | null; tier: 1 | 2;
};
