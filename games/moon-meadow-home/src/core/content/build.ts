// G/src/core/content/build.ts
// Turns the raw JSON packs into one indexed Content object. Pure: no I/O.
import { baseText, phonemesOf, slugName } from './gpc.ts';
import { releaseAtMost } from './types.ts';
import type {
  Content, GpcId, Item, ItemId, Moment, NameEntry, Phrase, RawContent, RawGpc, RawPair, RawTwin, RawWord,
  Step, StepId, Strand, Word,
} from './types.ts';

/** The leading and trailing consonant runs of a GPC list, as cluster ids (`fr-`, `-st`) or null.
 *  A doubled consonant counts once, so "egg" has no cluster. */
export function consonantRuns(gs: readonly GpcId[], table: Record<GpcId, RawGpc>): { lead: string | null; trail: string | null } {
  const cons = (g: GpcId) => table[g] !== undefined && !table[g].vowel;
  let lead = 0;
  while (lead < gs.length && cons(gs[lead])) lead++;
  let trail = 0;
  while (trail < gs.length - lead && cons(gs[gs.length - 1 - trail])) trail++;
  const once = (run: readonly GpcId[]) => run.filter((g, i) => i === 0 || g !== run[i - 1]);
  const l = once(gs.slice(0, lead));
  const t = once(gs.slice(gs.length - trail));
  return {
    lead: l.length >= 2 ? `${l.map(baseText).join('')}-` : null,
    trail: t.length >= 2 ? `-${t.map(baseText).join('')}` : null,
  };
}

/** The reading or spelling items a word holds. Only ids that exist in the built item index are added. */
export function wordItems(word: RawWord, p: 'r' | 's', items: Record<ItemId, Item>, table: Record<GpcId, RawGpc>): ItemId[] {
  const out: ItemId[] = [];
  const add = (id: ItemId) => { if (items[id] && !out.includes(id)) out.push(id); };
  const gs = word.gpcs;
  for (const g of gs) add(`${p}:g:${g}`);
  const cons = (g: GpcId) => !table[g].vowel;
  const runs = consonantRuns(gs, table);
  if (runs.lead) add(`${p}:cl:${runs.lead}`);
  if (runs.trail) add(`${p}:cl:${runs.trail}`);
  if (runs.lead && runs.trail) add(`${p}:pat:ccvcc`);
  const digraphs = gs.filter(g => baseText(g).length >= 2 && !table[g].split).length;
  if (digraphs >= 2) add(`${p}:pat:two-digraphs`);
  if (gs.some((g, i) => i > 0 && g === gs[i - 1] && cons(g))) add(`${p}:pat:double`);
  if (word.compound) add(`${p}:pat:compound`);
  if ((word.syllables ?? 1) >= 2 && !word.compound) add(`${p}:pat:two-syllable`);
  if ((runs.lead || runs.trail) && gs.some(g => table[g].vowel && baseText(g).length >= 2)) add(`${p}:pat:long-cluster`);
  if (word.affix) add(`${p}:${word.affix === 'un' ? 'pre' : 'sfx'}:${word.affix}`);
  return out;
}

export function stepIndex(c: Pick<Content, 'steps'>, step: StepId): number {
  return c.steps[step]?.index ?? -1;
}

function highestStep(ids: readonly ItemId[], items: Record<ItemId, Item>, steps: Record<StepId, Step>): StepId | null {
  let best: StepId | null = null;
  for (const id of ids) {
    const s = items[id].step;
    if (best === null || steps[s].index > steps[best].index) best = s;
  }
  return best;
}

export function buildContent(raw: RawContent): Content {
  // 1. GPCs
  const gpcs: Record<GpcId, RawGpc> = {};
  for (const g of raw.gpcs) {
    if (gpcs[g.id]) throw new Error(`Duplicate GPC ${g.id}`);
    gpcs[g.id] = g;
  }

  // 2. Moments
  const moments: Record<string, Moment> = {};
  for (const m of raw.moments.moments) moments[m.id] = { ...m, loaded: releaseAtMost(m.release, raw.release) };

  // 3. Steps and items
  const steps: Record<StepId, Step> = {};
  const items: Record<ItemId, Item> = {};
  const order: Record<Strand, StepId[]> = { r: [], s: [], m: [] };
  const loaded: Record<Strand, StepId[]> = { r: [], s: [], m: [] };
  for (const ladder of raw.ladders) {
    ladder.steps.forEach((rs, index) => {
      if (steps[rs.id]) throw new Error(`Duplicate step ${rs.id}`);
      const isLoaded = releaseAtMost(rs.release, raw.release) && rs.moments.some(m => moments[m]?.loaded === true);
      steps[rs.id] = { ...rs, strand: ladder.strand, index, loaded: isLoaded, top: rs.levels };
      order[ladder.strand].push(rs.id);
      if (isLoaded) loaded[ladder.strand].push(rs.id);
      for (const it of rs.items) {
        if (items[it.id]) throw new Error(`Duplicate item ${it.id}`);
        items[it.id] = { ...it, strand: ladder.strand, step: rs.id, carriers: null };
      }
    });
  }

  // 4. Words
  const words: Record<string, Word> = {};
  const wordsByItem: Record<ItemId, string[]> = {};
  for (const pack of raw.words) {
    for (const rw of pack.words) {
      if (words[rw.w]) throw new Error(`Duplicate word ${rw.w}`);
      const rItems = wordItems(rw, 'r', items, gpcs);
      const sItems = wordItems(rw, 's', items, gpcs);
      const readable = rw.gpcs.every(g => items[`r:g:${g}`] !== undefined);
      words[rw.w] = {
        ...rw,
        pack: pack.pack,
        clip: `word-${rw.w}`,
        pluralClip: rw.plural ? `word-${rw.plural.w}` : null,
        rItems,
        sItems,
        rStep: readable ? highestStep(rItems, items, steps) : null,
        sStep: highestStep(sItems, items, steps),
      };
      for (const id of [...rItems, ...sItems]) (wordsByItem[id] ??= []).push(rw.w);
    }
  }

  // 5. Names
  const names: NameEntry[] = raw.names.names.map(n => {
    const phonemes = phonemesOf(n.gpcs, gpcs);
    return { ...n, slug: slugName(n.name), phonemes, first: phonemes[0] };
  });

  // 6. Pairs and twins
  const pairs: Record<string, RawPair> = {};
  for (const p of raw.pairs.pairs) pairs[p.id] = p;
  const twins: Record<string, RawTwin[]> = {};
  for (const t of raw.pairs.twins) (twins[t.pair] ??= []).push(t);

  // 7. Phrases
  const phrases: Record<string, Phrase> = {};
  const phrasesByItem: Record<ItemId, string[]> = {};
  for (const pack of raw.phrases) {
    for (const rp of pack.phrases) {
      if (phrases[rp.id]) throw new Error(`Duplicate phrase ${rp.id}`);
      phrases[rp.id] = { ...rp, pack: pack.pack, clipId: rp.clip ? `phrase-${rp.id}` : null, loaded: moments[rp.moment]?.loaded ?? false };
      for (const id of rp.items) (phrasesByItem[id] ??= []).push(rp.id);
    }
  }

  // 8. Carriers per reading item
  const pictured = Object.values(words).filter(w => w.kind === 'thing' && w.pic !== null);
  for (const item of Object.values(items)) {
    if (item.strand !== 'r') continue;
    const at = steps[item.step].index;
    if (item.kind === 'grapheme' || item.kind === 'cluster' || item.kind === 'pattern') {
      item.carriers = pictured.filter(w => w.rStep === item.step && w.rItems.includes(item.id)).length;
    } else if (item.kind === 'pair') {
      const ok = (word: string) => {
        const w = words[word];
        return w !== undefined && w.kind === 'thing' && w.pic !== null && w.rStep !== null && steps[w.rStep].index <= at;
      };
      item.carriers = (twins[item.pair ?? ''] ?? []).filter(t => ok(t.a) && ok(t.b)).length;
    } else if (item.kind === 'ending') {
      item.carriers = pictured.filter(w => w.plural && (item.ending === 'none' || w.plural.ending === item.ending)).length;
    } else {
      item.carriers = (phrasesByItem[item.id] ?? []).length;
    }
  }

  return {
    release: raw.release, budget: raw.budget, gpcs, steps, order, loaded, items, words, wordsByItem,
    names, pairs, twins, moments, phrases, phrasesByItem,
  };
}
