// The only file of the heartbeat scenes that talks to the learning engine and the planner (Task 17B).
// The top half is pure (content views, picks to served items, result logs) and unit tested. createBridge()
// wraps the live calls; deps.ts builds the one bridge the scenes use from the store.
import { carrierKey, learnResultPayload, nextEgg, nextItem, nextNameReviews, shouldVisitDoor, spellingShareLow, visitStats } from '../../core/planner/index.ts';
import type { ItemRequest, Outcome, Pick, PlanContext } from '../../core/planner/index.ts';
import { currentStep, isSecure, stepStatus } from '../../core/learning/index.ts';
import type { Learner } from '../../core/learning/index.ts';
import type { Content, EggKind, MomentKind } from '../../core/content/types.ts';
import { nameKey } from '../../core/keys.ts';
import { nameGpcs } from '../../core/naming/review.ts';
import type { Rng } from '../../core/rng.ts';
import type { LearnLog } from '../../core/actions/heartbeat.ts';
import type { NameEntry, Scaffold, Served, Source, StationId, StepState, Strand, WordEntry } from '../../core/heartbeat/types.ts';
import { STATIONS } from '../../core/heartbeat/wish.ts';

export type HbSlot = 'wish' | 'naming' | 'door' | 'rollcall-door';
export type { Outcome };

const SOURCE: Record<string, Source> = {
  current: 'current', school: 'school', side: 'side', review: 'review', mixed: 'mixed', probe: 'probe', warmup: 'review',
  golden: 'golden', name: 'review',
};
export function sourceOf(slot: string): Source {
  return SOURCE[slot] ?? 'review';
}

const PAIR_TAG: Record<string, WordEntry['pairTag']> = {
  'a-e-u': 'aeu', 'final-d-t': 'final', 'final-g-k': 'final', 'final-b-p': 'final', 'v-w': 'vw', 'j-y': 'jy', th: 'th', 'ch-h': 'ch',
};

const gpcText = (c: Content, id: string): string => c.gpcs[id]?.text ?? id;

/** One entry per word, plus one per plural with a clip ('hats' with one: 'hat'). Twins give each other as pair. */
export function wordEntries(c: Content): Map<string, WordEntry> {
  const out = new Map<string, WordEntry>();
  const pairOf = new Map<string, { word: string; tag: WordEntry['pairTag'] }>();
  for (const [pair, list] of Object.entries(c.twins ?? {})) {
    for (const t of list) {
      if (!pairOf.has(t.a)) pairOf.set(t.a, { word: t.b, tag: PAIR_TAG[pair] ?? 'vowel' });
      if (!pairOf.has(t.b)) pairOf.set(t.b, { word: t.a, tag: PAIR_TAG[pair] ?? 'vowel' });
    }
  }
  for (const w of Object.values(c.words)) {
    const gr = w.gpcs.map((id) => gpcText(c, id));
    const station = w.kind === 'station' && (STATIONS as string[]).includes(w.w) ? (w.w as StationId) : undefined;
    const pair = pairOf.get(w.w);
    out.set(w.w, {
      word: w.w, gr, step: w.rStep ?? '', picture: w.pic ?? '', clip: w.clip, basket: w.kind === 'thing' && !!w.pic,
      ...(w.plural ? { plural: w.plural.w } : {}), ...(station ? { station } : {}),
      ...(pair ? { pair: pair.word, pairTag: pair.tag } : {}), ...(w.heart?.length ? { heart: w.heart } : {}),
    });
    if (w.plural && w.pluralClip && !c.words[w.plural.w]) {
      out.set(w.plural.w, {
        word: w.plural.w, gr: [...gr, `-${w.plural.ending}`], step: 'R19', picture: w.pic ?? '', clip: w.pluralClip,
        one: w.w, ending: `-${w.plural.ending}` as '-s' | '-es', basket: false,
      });
    }
  }
  return out;
}

/** The name bank as the naming logic reads it: a capital first gem, phonemes per grapheme, the GPC ids kept. */
export function nameEntries(c: Content): NameEntry[] {
  return c.names.map((n) => {
    const split = n.gpcs.map((id, i) => {
      const text = gpcText(c, id);
      return { g: i === 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text, ph: [...(c.gpcs[id]?.phonemes ?? [])], gpc: id };
    });
    return { name: n.name, key: n.slug, split, ph: split.flatMap((s) => s.ph), first: n.first, pic: n.pic ?? null, tier: 1 as const };
  });
}

/** A planner pick as the heartbeat scenes read it. Maths and door ids are learning's item ids ('m:pair:3+7'). */
export function servedFromPick(p: Pick, words: Map<string, WordEntry>, c?: Content): Served | null {
  const k = p.carrier;
  const base = {
    strand: p.strand as Strand, step: p.step ?? 'name', items: [...p.items], scaffold: p.scaffold as Scaffold, probe: p.probe,
    source: sourceOf(p.slot), moment: p.moment, slot: p.slot, pick: p, ...(p.display?.length ? { display: [...p.display] } : {}),
  };
  switch (k.kind) {
    case 'word': return { ...base, id: k.word, carrier: k.word };
    case 'plural': {
      const w = k.form === 'many' ? words.get(k.word)?.plural ?? k.word : k.word;
      return { ...base, id: w, carrier: w };
    }
    case 'twin': return { ...base, id: k.words[0], carrier: k.words[0], twin: k.words[1] };
    case 'maths': return { ...base, id: p.items[0] ?? '', carrier: '' };
    case 'door': return { ...base, id: `m:num:${k.n}`, carrier: '' };
    case 'spell': return { ...base, id: k.focus[0] ? (c ? gpcText(c, k.focus[0]) : k.focus[0]) : '', carrier: '' };
    case 'first-sound': return { ...base, id: c ? gpcText(c, k.gpc) : k.gpc, carrier: '' };
    case 'phrase': return { ...base, id: k.phrase, carrier: k.phrase };
    case 'name': return { ...base, id: k.babyId, carrier: k.name };
    default: return null;
  }
}

/** The learning result of a served moment, built only by learning's learnResultPayload (R17). Null for a free moment. */
export function learnLog(served: Served | null | undefined, o: Outcome, baby: string | null): LearnLog | null {
  if (!served?.pick) return null;
  return { payload: learnResultPayload(served.pick, o), baby };
}

/** The same pick for another step and items (the S11 capital is its own result). */
export function pickFor(p: Pick, step: string, items: string[], slot: Pick['slot'], scaffold: Scaffold = 1): Pick {
  return { ...p, step, items, slot, scaffold, probe: false };
}

export { spellLadder, readLadder } from '../../core/phonics/ladders.ts';
export { nameGpcs } from '../../core/naming/review.ts';

/** The planner requests of the heartbeat places (Wave A moments; phrase moments come with Tasks 26 and 27). */
export const REQUESTS: Record<HbSlot, ItemRequest> = {
  // R34: station wishes are served only as review or mixed picks; the planner enforces it.
  wish: { strand: 'r', moments: ['wish', 'one-or-many', 'twin-wish', 'station-wish'] as MomentKind[], place: 'wish' },
  naming: { strand: 's', moments: ['naming-bells', 'naming-garden', 'first-sound'] as MomentKind[], place: 'naming' },
  door: { strand: 'm', moments: ['door-visit'] as MomentKind[], place: 'stalls' },
  'rollcall-door': { strand: 'm', moments: ['roll-call-door'] as MomentKind[], place: 'goodnight' },
};

export type BridgeSource = { planContext(): PlanContext; readonly learner: unknown; readonly content: unknown };
export type HerdForReview = { id: string; name: string | null; gems: string[]; listName: string | null };

/** The live calls. Every function reads the store's current learner and content. */
export function createBridge(src: BridgeSource) {
  const c = () => src.content as Content;
  const l = () => src.learner as Learner;
  let wordsCache: Map<string, WordEntry> | null = null;
  const words = () => (wordsCache ??= wordEntries(c()));

  return {
    words,
    names: (): NameEntry[] => nameEntries(c()),
    content: c,
    serve(slot: HbSlot, rng: Rng, accept: (s: Served) => boolean = () => true, extra: Partial<ItemRequest> = {}): Served | null {
      const avoid: string[] = [...(extra.avoid ?? [])];
      for (let i = 0; i < 4; i++) {
        let seen: Served | null = null;
        const req: ItemRequest = {
          ...REQUESTS[slot], ...extra, avoid,
          accept: (p) => {
            const s = servedFromPick(p, words(), c());
            if (!s || !accept(s)) return false;
            seen = s;
            return true;
          },
        };
        const p = nextItem(src.planContext(), req, rng);
        if (!p) return null;
        const s = seen ?? servedFromPick(p, words(), c());
        if (s && accept(s)) return s;
        avoid.push(carrierKey(p.carrier));
      }
      return null;
    },
    serveEgg(rng: Rng): { kind: EggKind; served: Served | null } {
      const offer = nextEgg(src.planContext(), rng);
      return { kind: offer.kind, served: offer.pick ? servedFromPick(offer.pick, words(), c()) : null };
    },
    stepStatusOf(step: string): StepState {
      return c().steps[step]?.loaded ? stepStatus(l(), c(), step) : 'locked';
    },
    currentStepOf(strand: 'r' | 's' | 'm'): string {
      return currentStep(l(), c(), strand) ?? (strand === 'r' ? 'R01' : strand === 's' ? 'S01' : 'M01');
    },
    secure(step: string): boolean {
      return c().steps[step] ? isSecure(l(), c(), step) : false;
    },
    spellingBehind(): boolean {
      return spellingShareLow(l(), c());
    },
    /** Learning's door-visit rule: while the door range is being learnt, else every few newborns. */
    shouldVisitDoor(herdCount: number): boolean {
      return shouldVisitDoor(l(), c(), herdCount);
    },
    checkedCount(): number {
      return visitStats(l()).total;
    },
    /** Learning's nextNameReviews applies spec 3.7: decodable or read before, due first, one per name, clip needed. */
    nameReviewIds(herd: HerdForReview[], n: number, rng: Rng): string[] {
      const cands = herd.filter((b) => b.name).map((b) => ({ babyId: b.id, name: b.name!, gpcs: nameGpcs(c(), b.name!, b.gems, b.listName) }));
      return nextNameReviews(src.planContext(), cands, n, 'roll-call', rng).map((p) => (p.carrier as { babyId: string }).babyId);
    },
    /** The roll-call name pick of one baby, for its learning result. */
    namePick(baby: { id: string; name: string }): Pick {
      return { strand: 'name', step: null, slot: 'name', moment: 'roll-call', items: [`name:${nameKey(baby.name)}`],
        carrier: { kind: 'name', babyId: baby.id, name: baby.name }, scaffold: 3, probe: false };
    },
  };
}
export type Bridge = ReturnType<typeof createBridge>;
