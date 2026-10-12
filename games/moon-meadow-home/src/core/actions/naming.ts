// Naming actions to event drafts (contracts C2, C7). Gems in events are lowercase; the display spelling keeps its capital.
import type { DraftOf, NameRoute as EventRoute } from '../../types/contracts.ts';
import type { NameRoute, NameTarget } from '../heartbeat/types.ts';
import type { GoldOutcome } from '../naming/check.ts';
import { builtPhonemes } from '../naming/sounds.ts';
import type { LearnDraft, LearnLog } from './heartbeat.ts';

export type NamingAction =
  /** Every slide of the gold bell's star, whatever the outcome. */
  | { type: 'naming.gold'; target: NameTarget; gems: string[]; outcome: GoldOutcome }
  /** A bell or garden name she spelled, with the spelling results (free naming has none). */
  | { type: 'naming.spelled'; target: NameTarget; route: 'bell' | 'garden-pic' | 'garden-sound'; gems: string[]; phonemes: string[]; listName: string; learn?: LearnLog[] }
  /** She left in the middle of spelling: log what she did. */
  | { type: 'naming.partial'; learn: LearnLog[] }
  /** The name goes to the baby. listName: the name-bank name whose clip says it, null for an unknown name. */
  | { type: 'naming.assign'; baby: string; name: string; gems: string[]; route: NameRoute; listName: string | null }
  /** The moon brought the clip of her invented name, and she heard it. */
  | { type: 'naming.clip-heard'; baby: string };

export type NamingDraft = LearnDraft | DraftOf<'name.built'> | DraftOf<'baby.named'> | DraftOf<'name.clipHeard'>;

const lower = (gems: string[]) => gems.map((g) => g.toLowerCase()).slice(0, 12);
const eventRoute = (r: NameRoute): EventRoute => (r === 'garden-pic' || r === 'garden-sound' ? 'garden' : r);
const babyOf = (t: NameTarget): string | null => (t.kind === 'baby' ? t.baby : null);
const phonemeText = (ph: string[]) => ph.filter((p) => p !== '').join(' ').slice(0, 64);
const learnDrafts = (ls: LearnLog[] | undefined): LearnDraft[] => (ls ?? []).map((l) => ({ ...l.payload, baby: l.baby }));

export function applyNaming(a: NamingAction): NamingDraft[] {
  switch (a.type) {
    case 'naming.gold': {
      const o = a.outcome;
      return [{
        type: 'name.built', visit: null, baby: babyOf(a.target), gems: lower(a.gems), phonemes: phonemeText(builtPhonemes(a.gems)),
        route: 'gold', outcome: o.outcome, listName: o.outcome === 'list' ? o.entry.name : null,
        // A slur is treated as strong: both are the words that must never be shown or played.
        strong: o.outcome === 'blocked' && (o.kind === 'strong' || o.kind === 'slur'),
      }];
    }
    case 'naming.spelled':
      return [
        ...learnDrafts(a.learn),
        {
          type: 'name.built', visit: null, baby: babyOf(a.target), gems: lower(a.gems), phonemes: phonemeText(a.phonemes),
          route: eventRoute(a.route), outcome: 'chosen', listName: a.listName, strong: false,
        },
      ];
    case 'naming.partial':
      return learnDrafts(a.learn);
    case 'naming.assign':
      return [{ type: 'baby.named', baby: a.baby, name: a.name, gems: lower(a.gems), route: eventRoute(a.route), listName: a.listName }];
    case 'naming.clip-heard':
      return [{ type: 'name.clipHeard', baby: a.baby, heart: true }];
    default:
      throw new Error(`Unknown naming action ${(a as { type: string }).type}`);
  }
}

const KEN_LEARN: LearnLog = {
  baby: 'b1',
  payload: { type: 'learn.result', strand: 's', step: 'S03', carrier: 'Ken', items: [{ id: 's:g:k', r: 'first' }, { id: 's:g:e', r: 'miss' }, { id: 's:g:n', r: 'first' }],
    result: 'miss', ms: 5200, scaffold: 1, error: 'vowel', place: 'naming', moment: 'naming-bells', slot: 'current', probe: false },
};

/** One sample per naming action type, for the integration contract test (master Task I-1). */
export const NAMING_SAMPLE_ACTIONS: NamingAction[] = [
  {
    type: 'naming.gold', target: { kind: 'baby', baby: 'b1' }, gems: ['L', 'i', 'l', 'i'],
    outcome: { outcome: 'list', entry: { name: 'Lily', key: 'lily', split: [{ g: 'L', ph: ['l'] }, { g: 'i', ph: ['i'] }, { g: 'l', ph: ['l'] }, { g: 'y', ph: ['ee'] }], ph: ['l', 'i', 'l', 'ee'], first: 'l', pic: 'flowers', tier: 1 } },
  },
  { type: 'naming.spelled', target: { kind: 'baby', baby: 'b1' }, route: 'bell', gems: ['K', 'e', 'n'], phonemes: ['k', 'e', 'n'], listName: 'Ken', learn: [KEN_LEARN] },
  { type: 'naming.partial', learn: [KEN_LEARN] },
  { type: 'naming.assign', baby: 'b1', name: 'Lili', gems: ['L', 'i', 'l', 'i'], route: 'gold', listName: 'Lily' },
  { type: 'naming.clip-heard', baby: 'b1' },
];
