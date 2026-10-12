// G/tools/lib/validate.ts
// Pure content validation. Every check returns findings; nothing throws.
import { buildContent, wordItems } from '../../src/core/content/build.ts';
import { buildBlocklist, checkBlocked, type RawBlocklist } from '../../src/core/content/blocklist.ts';
import { PHONEMES, phonemesOf, slugName, spell } from '../../src/core/content/gpc.ts';
import { KEY_RE, NARRATOR_ONLY_PREFIXES, nameId } from '../../src/core/keys.ts';
import { RELEASES } from '../../src/core/content/types.ts';
import type { Budget, Content, Item, RawContent, RawGpc, RawWord, StepId } from '../../src/core/content/types.ts';

export type LineEntry = { id: string; speaker: string; text: string; note?: string; seed?: number; also?: string[]; expect?: string[] };
export type Finding = { level: 'error' | 'warn'; code: string; msg: string };
export type Thresholds = {
  wordsPerReadingStep: number; carriersPerItem: number; twinsPerPair: number;
  pluralS: number; pluralEs: number; namesMin: number; namesTarget: number; namesPriority1: number;
  requireV2Names: boolean;
};
export const DEFAULT_THRESHOLDS: Thresholds = {
  wordsPerReadingStep: 6, carriersPerItem: 2, twinsPerPair: 1, pluralS: 20, pluralEs: 8,
  namesMin: 300, namesTarget: 1000, namesPriority1: 300, requireV2Names: true,
};
export type ValidateInput = {
  raw: RawContent; blocklist: RawBlocklist; phonics: string[];
  lines: { pack: string; lines: LineEntry[] }[];
  manifests: Record<string, string[]> | null;   // null in --data-only mode
  pictures: string[] | null;                    // null in --data-only mode
  codeIds: string[];
  /** Ids from hand-written line files (content/lines/*.json) that audio builds into its packs. Known for code ids only. */
  sourceLineIds?: string[];
  /** R62: `--assets=warn` reports ASSET_PIC and ASSET_CLIP as warnings. Default error. */
  assets?: 'error' | 'warn';
};

export const V2_NAMES = [
  'sam','tam','pam','tim','nim','sid','dan','tad','sim','pim','mip','tan','san','sap','sis','sip','sas','tas','tat','tip','tin','tid',
  'pat','pap','pad','pit','pip','pid','nas','nat','nap','nan','nam','nin','nid','nis','mas','mat','man','mam','mit','min','mim','mid',
  'das','dat','dap','dit','dip','din','tom','pod','ted','kip','ken','ron','kit','cam','tig','ben','fen','lin','tess','rob','fin','liss',
  'tod','rod','ned','kim','kin','ked','ren','rib',
] as const;
export const EXCLUDED_WORDS = [
  'hurt','rescue','cruel','argue','unhappy','unkind','unfriendly','unwell','unlucky','unsafe','unfair','sad','hungry','scary','slimy',
  'shocked','stormy','explode','bulldoze','fight','crime','soldier','witch','alien','gecko','fat',
  'dogs','doctors','turtles','ballerinas','mountains','clowns','pirates','tigers','lions','tractors','buses','churches','witches','watches','matches',
] as const;
export const DUTCH_WORDS = [
  'de','het','een','ik','jij','je','niet','nee','goed','mooi','zo','dag','hoi','doei','lief','kusje','eend','paard','huis','meisje',
  'jongen','prinses','koningin','eenhoorn','ei','eieren','bloem','boom','en','van','met','voor','maar','ook','nog','wel','heel',
  'lekker','slapen','eten','drinken','spelen','kijk','luister','klaar','knap','prima','gezellig','alsjeblieft','dank','bedankt',
  'welterusten','slaap','ster','maan','zon','fijn','leuk','tot','ziens','waar','wat','wie','hoe','waarom',
] as const;

const BUDGET_KEYS: (keyof Budget)[] = [
  'share', 'oneShare', 'newPerStrandPerDay', 'strandVisitCap', 'visitCap', 'tiredEggMinBox', 'spellShareMin', 'spellShareAfter',
  'box0Gap', 'box1MinHours', 'boxDays', 'retiredDays', 'fluencyWindow', 'fluencyCeilingMs', 'fluencyRecomputeDays',
  'fluencyMinSamples', 'scaffoldUp', 'scaffoldDown', 'passWindow', 'passFirst', 'passDays', 'reopenWindow', 'reopenMinFirst',
  'closeWindow', 'closeFirst', 'reopenWeight', 'placement', 'defaultProfile', 'profiles', 'doorRanges', 'visitSecureEvery',
  'recentCarriers',
];
const LINE_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DUTCH = new Set<string>(DUTCH_WORDS);
const EXCLUDED = new Set<string>(EXCLUDED_WORDS);
const PHONEME_SET = new Set<string>(PHONEMES);

const err = (code: string, msg: string): Finding => ({ level: 'error', code, msg });
const warn = (code: string, msg: string): Finding => ({ level: 'warn', code, msg });

type Ctx = { input: ValidateInput; raw: RawContent; t: Thresholds; c: Content | null; table: Record<string, RawGpc> };

const allSteps = (raw: RawContent) => raw.ladders.flatMap(l => l.steps.map(s => ({ ...s, strand: l.strand })));
const allWords = (raw: RawContent) => raw.words.flatMap(p => p.words.map(w => ({ ...w, pack: p.pack })));
const pictured = (w: { pic: string | null }) => w.pic !== null;
const thing = (w: { kind: string }) => w.kind === 'thing';
const isLoaded = (c: Content, s: StepId | null) => s !== null && c.steps[s]?.loaded === true;

/* ---------------- GPCs ---------------- */

function checkGpcs({ raw, input, c }: Ctx): Finding[] {
  const out: Finding[] = [];
  for (const g of raw.gpcs) {
    for (const p of g.phonemes) if (!PHONEME_SET.has(p)) out.push(err('GPC_PHONEME', `${g.id}: phoneme ${p} is not in PHONEMES`));
    const dot = g.id.indexOf('.');
    const ok = /^[a-z]+$/.test(g.id) || /^[a-z]+-e$/.test(g.id)
      || (dot > 0 && /^[a-z]+$/.test(g.id.slice(0, dot)) && PHONEME_SET.has(g.id.slice(dot + 1)));
    if (!ok) out.push(err('GPC_ID', `${g.id}: not <letters>, <letters>-e or <letters>.<phoneme>`));
  }
  if (c) {
    const phonics = new Set(input.phonics);
    const seen = new Set<string>();
    for (const step of Object.values(c.steps)) {
      if (!step.loaded) continue;
      for (const it of step.items) {
        if ((it.kind !== 'grapheme' && it.kind !== 'first-sound') || !it.gpc || seen.has(it.gpc)) continue;
        seen.add(it.gpc);
        const g = c.gpcs[it.gpc];
        if (!g) continue;
        if (g.sound === null || !phonics.has(g.sound)) out.push(err('GPC_SOUND', `${g.id}: letter sound ${g.sound ?? 'null'} is not in the phonics library`));
      }
    }
  }
  return out;
}

/* ---------------- Steps and items ---------------- */

function checkSteps({ raw, c }: Ctx): Finding[] {
  const out: Finding[] = [];
  const moments = new Map(raw.moments.moments.map(m => [m.id as string, m]));
  const stepIds = new Set(allSteps(raw).map(s => s.id));
  for (const s of allSteps(raw)) {
    const known = s.moments.filter(m => moments.has(m));
    for (const m of s.moments) {
      const mo = moments.get(m);
      if (!mo) { out.push(err('MOMENT_UNKNOWN', `${s.id}: moment ${m} is not in moments.json`)); continue; }
      if (mo.strand !== s.strand) out.push(err('STEP_MOMENT_STRAND', `${s.id}: moment ${m} belongs to strand ${mo.strand}`));
    }
    if (s.release === 'later') {
      const live = known.filter(m => c?.moments[m]?.loaded);
      if (live.length) out.push(err('STEP_RELEASE', `${s.id}: release later but moment ${live[0]} is loaded`));
    } else if (known.length === 0) {
      out.push(err('STEP_RELEASE', `${s.id}: release ${s.release} but no known moment`));
    } else {
      const earliest = known.map(m => moments.get(m)!.release).sort((a, b) => RELEASES.indexOf(a) - RELEASES.indexOf(b))[0];
      if (earliest !== s.release) out.push(err('STEP_RELEASE', `${s.id}: release ${s.release}, its earliest moment is ${earliest}`));
    }
    const loaded = c?.steps[s.id]?.loaded === true;
    if (loaded && !s.display && s.items.length === 0) out.push(err('STEP_EMPTY', `${s.id}: loaded step without items`));
    if (loaded && s.face.length === 0) out.push(err('STEP_FACE', `${s.id}: loaded step without a face`));
    for (const it of s.items) {
      if (!it.id.startsWith(`${s.strand}:`)) out.push(err('ITEM_PREFIX', `${it.id}: does not start with ${s.strand}:`));
      if (!KEY_RE.test(it.id)) out.push(err('ITEM_ID', `${it.id}: not a valid item id`));
      if (it.kind === 'grapheme' || it.kind === 'first-sound') {
        if (!it.gpc || !raw.gpcs.some(g => g.id === it.gpc)) out.push(err('ITEM_GPC', `${it.id}: unknown GPC ${it.gpc ?? '(none)'}`));
        else if (it.kind === 'grapheme' && it.id !== `${s.strand}:g:${it.gpc}`) out.push(err('ITEM_GPC', `${it.id}: grapheme item id must be ${s.strand}:g:${it.gpc}`));
      }
      if (s.strand === 'm' && !it.task) out.push(err('ITEM_TASK', `${it.id}: maths item without a task`));
      if (s.strand !== 'm' && it.task) out.push(err('ITEM_TASK', `${it.id}: only maths items have a task`));
      if (it.kind === 'pair' && !raw.pairs.pairs.some(p => p.id === it.pair)) out.push(err('ITEM_PAIR', `${it.id}: unknown pair ${it.pair ?? '(none)'}`));
    }
  }
  for (const p of raw.pairs.pairs) {
    for (const [strand, step] of Object.entries(p.unlock)) {
      if (step && !stepIds.has(step)) out.push(err('PAIR_UNLOCK', `${p.id}: unlock step ${step} (${strand}) does not exist`));
    }
  }
  return out;
}

/* ---------------- Pairs and twins ---------------- */

function checkTwins({ raw, c, t }: Ctx): Finding[] {
  const out: Finding[] = [];
  const words = new Set(allWords(raw).map(w => w.w));
  for (const tw of raw.pairs.twins) {
    for (const w of [tw.a, tw.b]) if (!words.has(w)) out.push(err('TWIN_WORD', `${tw.pair}: twin word ${w} is not in a words pack`));
  }
  if (!c) return out;
  for (const item of Object.values(c.items)) {
    if (item.strand !== 'r' || item.kind !== 'pair') continue;
    const step = c.steps[item.step];
    if (!step.loaded || !step.moments.includes('twin-wish')) continue;
    const ok = (w: string) => {
      const word = c.words[w];
      return word !== undefined && word.pic !== null && word.rStep !== null && c.steps[word.rStep].index <= step.index;
    };
    const n = (c.twins[item.pair ?? ''] ?? []).filter(tw => ok(tw.a) && ok(tw.b)).length;
    if (n < t.twinsPerPair) out.push(err('PAIR_NO_TWIN', `${item.id}: ${n} readable twins at ${item.step}, needs ${t.twinsPerPair}`));
  }
  return out;
}

/* ---------------- Words ---------------- */

function pluralOk(w: string, plural: { w: string; ending: 's' | 'es' }): boolean {
  const es = /(s|x|ch|sh|ss|zz)$/.test(w);
  return es ? plural.w === `${w}es` && plural.ending === 'es' : plural.w === `${w}s` && plural.ending === 's';
}

function checkWords({ raw, c, t, table }: Ctx): Finding[] {
  const out: Finding[] = [];
  const words = allWords(raw);
  const forms = new Map<string, number>();
  for (const w of words) {
    forms.set(w.w, (forms.get(w.w) ?? 0) + 1);
    if (w.plural) forms.set(w.plural.w, (forms.get(w.plural.w) ?? 0) + 1);
  }
  for (const w of words) {
    const unknown = w.gpcs.filter(g => !table[g]);
    if (unknown.length) out.push(err('WORD_GPC', `${w.w}: unknown GPC ${unknown.join(', ')}`));
    else {
      let spelled: string | null = null;
      try { spelled = spell(w.gpcs, table); } catch (e) { spelled = `(${(e as Error).message})`; }
      if (spelled !== w.w) out.push(err('WORD_SPELL', `${w.w}: GPCs spell ${spelled}`));
    }
    if (w.pic !== null && w.pic !== w.w) out.push(err('WORD_PIC', `${w.w}: picture id ${w.pic} must be the word itself or null`));
    if (w.plural) {
      if (!pluralOk(w.w, w.plural)) out.push(err('WORD_PLURAL', `${w.w}: plural ${w.plural.w} (${w.plural.ending}) does not follow the s or es rule`));
      if ((forms.get(w.plural.w) ?? 0) > 1) out.push(err('WORD_DUP', `${w.w}: plural ${w.plural.w} is also another word or plural`));
    }
    for (const f of [w.w, w.plural?.w, w.irregular?.w]) {
      if (f && EXCLUDED.has(f)) out.push(err('WORD_EXCLUDED', `${w.w}: ${f} is an excluded word`));
    }
    if (c) {
      const cw = c.words[w.w];
      if (cw && thing(cw) && cw.rStep === null) out.push(warn('WORD_STEP', `${w.w}: thing word with no reading step`));
      if (cw && thing(cw) && isLoaded(c, cw.rStep) && !unknown.length) out.push(...clusterFindings(cw, c, table));
    }
  }
  return out;
}

function clusterFindings(w: RawWord, c: Content, table: Record<string, RawGpc>): Finding[] {
  const out: Finding[] = [];
  const gs = w.gpcs;
  const cons = (g: string) => !table[g].vowel;
  let lead = 0;
  while (lead < gs.length && cons(gs[lead])) lead++;
  let trail = 0;
  while (trail < gs.length - lead && cons(gs[gs.length - 1 - trail])) trail++;
  const base = (g: string) => g.split('.')[0];
  if (lead >= 2) {
    const id = `r:cl:${gs.slice(0, lead).map(base).join('')}-`;
    if (!c.items[id]) out.push(err('WORD_CLUSTER', `${w.w}: cluster item ${id} does not exist`));
  }
  if (trail >= 2) {
    const id = `r:cl:-${gs.slice(gs.length - trail).map(base).join('')}`;
    if (!c.items[id]) out.push(err('WORD_CLUSTER', `${w.w}: cluster item ${id} does not exist`));
  }
  return out;
}

/* ---------------- Tricky words (R36) ---------------- */

function checkTricky({ raw, c }: Ctx): Finding[] {
  const out: Finding[] = [];
  const words = new Map(allWords(raw).map(w => [w.w, w]));
  const find = (x: string) => words.get(x) ?? words.get(x.toLowerCase());
  const tricky = new Set<string>();
  for (const s of allSteps(raw)) {
    for (const it of s.items) if (it.kind === 'tricky' && it.word) tricky.add(it.word);
    if (s.strand === 'r' && s.display) {
      for (const f of s.face) {
        if (!/^[A-Za-z']+$/.test(f)) continue;
        tricky.add(f);
        if (c?.steps[s.id]?.loaded && !find(f)) out.push(err('TRICKY_HEART', `${s.id}: display word ${f} has no word entry`));
      }
    }
  }
  for (const x of tricky) {
    const w = find(x);
    if (!w) continue;
    if (!w.heart || w.heart.length === 0) out.push(err('TRICKY_HEART', `${w.w}: tricky word without heart marks`));
    else if (w.heart.some(i => !Number.isInteger(i) || i < 0 || i >= w.gpcs.length)) out.push(err('TRICKY_HEART', `${w.w}: heart index out of range`));
  }
  return out;
}

/* ---------------- Coverage ---------------- */

function checkCoverage({ c, t, table }: Ctx): Finding[] {
  if (!c) return [];
  const out: Finding[] = [];
  const words = Object.values(c.words);
  const carriersOf = (item: Item) => item.carriers ?? 0;
  for (const sid of c.loaded.r) {
    const step = c.steps[sid];
    if (step.display || step.items.length === 0) continue;
    const items = step.items.map(i => c.items[i.id]);
    if (items.every(i => carriersOf(i) === 0)) out.push(err('COVER_STEP', `${sid}: no item has a carrier`));
    const wordStep = step.moments.includes('wish') && items.every(i => i.kind === 'grapheme' || i.kind === 'cluster' || i.kind === 'pattern');
    if (!wordStep) continue;
    const n = words.filter(w => thing(w) && pictured(w) && w.rStep === sid).length;
    if (n < t.wordsPerReadingStep) out.push(warn('COVER_WORDS', `${sid}: ${n} pictured words, needs ${t.wordsPerReadingStep}`));
    for (const i of items) {
      if (carriersOf(i) < t.carriersPerItem) out.push(warn('COVER_ITEM', `${i.id}: ${carriersOf(i)} carriers at ${sid}, needs ${t.carriersPerItem}`));
    }
  }
  const nameItems = c.names.map(n => wordItems({ w: n.slug, gpcs: n.gpcs, pic: null, kind: 'other' }, 's', c.items, table));
  for (const sid of c.loaded.s) {
    const step = c.steps[sid];
    if (!step.moments.some(m => m === 'naming-bells' || m === 'label')) continue;
    for (const ri of step.items) {
      if (ri.kind !== 'grapheme' && ri.kind !== 'cluster') continue;
      const n = words.filter(w => thing(w) && pictured(w) && w.sItems.includes(ri.id)).length
        + nameItems.filter(ids => ids.includes(ri.id)).length;
      if (n < t.carriersPerItem) out.push(warn('COVER_ITEM', `${ri.id}: ${n} carriers among words and names, needs ${t.carriersPerItem}`));
    }
  }
  if (c.steps.R19?.loaded) {
    const plurals = words.filter(w => thing(w) && pictured(w) && w.plural);
    const s = plurals.filter(w => w.plural!.ending === 's').length;
    const es = plurals.filter(w => w.plural!.ending === 'es').length;
    if (s < t.pluralS) out.push(err('COVER_PLURALS', `R19: ${s} plurals in s, needs ${t.pluralS}`));
    if (es < t.pluralEs) out.push(err('COVER_PLURALS', `R19: ${es} plurals in es, needs ${t.pluralEs}`));
  }
  return out;
}

/* ---------------- Names and blocklist ---------------- */

function checkNames({ raw, input, t, table }: Ctx): Finding[] {
  const out: Finding[] = [];
  const list = buildBlocklist(input.blocklist, table);
  for (const w of list.unsplit) out.push(err('BLOCK_SPLIT', `${w}: blocklist entry does not split into usual GPCs`));
  const slugs = new Map<string, number>();
  for (const n of raw.names.names) slugs.set(slugName(n.name), (slugs.get(slugName(n.name)) ?? 0) + 1);
  const dupDone = new Set<string>();
  for (const n of raw.names.names) {
    const unknown = n.gpcs.filter(g => !table[g]);
    if (unknown.length) { out.push(err('NAME_GPC', `${n.name}: unknown GPC ${unknown.join(', ')}`)); continue; }
    let spelled: string;
    try { spelled = spell(n.gpcs, table); } catch (e) { spelled = `(${(e as Error).message})`; }
    if (spelled !== n.name.toLowerCase()) out.push(err('NAME_SPELL', `${n.name}: GPCs spell ${spelled}`));
    const slug = slugName(n.name);
    if ((slugs.get(slug) ?? 0) > 1 && !dupDone.has(slug)) { dupDone.add(slug); out.push(err('NAME_DUP', `${n.name}: slug ${slug} is used by more than one name`)); }
    if (!n.gpcs.some(g => table[g].vowel)) out.push(err('NAME_VOWEL', `${n.name}: no vowel GPC`));
    const hit = checkBlocked(phonemesOf(n.gpcs, table), list);
    if (hit) out.push(err('NAME_BLOCKED', `${n.name}: sounds like a blocked word (${hit.level}${hit.part ? ', part' : ''})`));
  }
  const count = raw.names.names.length;
  if (count < t.namesMin) out.push(err('NAME_COUNT', `${count} tier 1 names, needs ${t.namesMin}`));
  else if (count < t.namesTarget) out.push(warn('NAME_COUNT', `${count} tier 1 names, target ${t.namesTarget}`));
  const p1 = raw.names.names.filter(n => n.priority === 1).length;
  if (p1 < t.namesPriority1) out.push(err('NAME_PRIORITY', `${p1} names with priority 1, needs ${t.namesPriority1}`));
  if (t.requireV2Names) {
    for (const v of V2_NAMES) if (!slugs.has(v)) out.push(err('NAME_V2', `${v}: v2 name has no tier 1 entry`));
  }
  return out;
}

/* ---------------- Dutch ---------------- */

function dutchIn(text: string): string | null {
  const low = text.toLowerCase();
  if (low.includes('ij')) return 'ij';
  for (const tok of low.match(/[a-z]+/g) ?? []) if (DUTCH.has(tok)) return tok;
  return null;
}

function checkDutch({ raw, input }: Ctx): Finding[] {
  const out: Finding[] = [];
  const check = (where: string, text: string) => {
    const hit = dutchIn(text);
    if (hit) out.push(err('DUTCH_TEXT', `${where}: "${text}" contains ${hit}`));
  };
  for (const w of allWords(raw)) {
    check(`word ${w.w}`, w.w);
    if (w.plural) check(`plural of ${w.w}`, w.plural.w);
    if (w.irregular) check(`irregular of ${w.w}`, w.irregular.w);
  }
  for (const n of raw.names.names) check(`name ${n.name}`, n.name);
  for (const p of raw.phrases) for (const ph of p.phrases) check(`phrase ${ph.id}`, ph.text);
  for (const p of input.lines) for (const l of p.lines) check(`line ${l.id}`, l.text);
  return out;
}

/* ---------------- Lines ---------------- */

function checkLines({ input, c }: Ctx): Finding[] {
  const out: Finding[] = [];
  const where = new Map<string, string[]>();
  for (const p of input.lines) {
    for (const l of p.lines) {
      if (!LINE_ID_RE.test(l.id)) out.push(err('LINE_ID', `${p.pack}/${l.id}: not a kebab-case id`));
      where.set(l.id, [...(where.get(l.id) ?? []), p.pack]);
      if (NARRATOR_ONLY_PREFIXES.some(pre => l.id.startsWith(pre)) && l.speaker !== 'narrator') {
        out.push(err('LINE_SPEAKER', `${p.pack}/${l.id}: spoken by ${l.speaker}, must be narrator`));
      }
      if (/\d/.test(l.text)) out.push(err('LINE_DIGIT', `${p.pack}/${l.id}: text "${l.text}" has a digit`));
    }
  }
  for (const [id, packs] of where) if (packs.length > 1) out.push(err('LINE_DUP', `${id}: in ${packs.join(', ')}`));
  if (c) {
    for (const p of input.lines) {
      const ids = new Set(p.lines.map(l => l.id));
      const words = Object.values(c.words).filter(w => w.pack === p.pack);
      for (const w of words) {
        if (!pictured(w) || !(isLoaded(c, w.rStep) || isLoaded(c, w.sStep))) continue;
        if (!ids.has(w.clip)) out.push(err('LINE_MISSING_WORD', `${p.pack}: no line ${w.clip}`));
        if (w.pluralClip && !ids.has(w.pluralClip)) out.push(err('LINE_MISSING_WORD', `${p.pack}: no line ${w.pluralClip}`));
      }
      if (p.pack === 'names-t1') {
        for (const n of c.names) {
          for (const id of [nameId(n.name, '!'), nameId(n.name, '?')]) {
            if (!ids.has(id)) out.push(err('LINE_MISSING_NAME', `names-t1: no line ${id}`));
          }
        }
      }
    }
  }
  if (input.lines.length > 0) {
    const known = new Set([...where.keys(), ...(input.sourceLineIds ?? [])]);
    for (const id of new Set(input.codeIds)) {
      if (!known.has(id)) out.push(err('LINE_UNKNOWN_CODE_ID', `${id}: used in code, in no pack`));
    }
  }
  return out;
}

/* ---------------- Assets (strict mode) ---------------- */

function checkAssets({ input, c }: Ctx): Finding[] {
  if (!c || (input.manifests === null && input.pictures === null)) return [];
  const out: Finding[] = [];
  const mk = input.assets === 'warn' ? warn : err;
  const pics = input.pictures ? new Set(input.pictures) : null;
  for (const w of Object.values(c.words)) {
    if (!(isLoaded(c, w.rStep) || isLoaded(c, w.sStep))) continue;
    if (input.manifests) {
      const clips = new Set(input.manifests[w.pack] ?? []);
      if (!clips.has(w.clip)) out.push(mk('ASSET_CLIP', `${w.w}: no clip ${w.clip} in ${w.pack}`));
      if (w.pluralClip && !clips.has(w.pluralClip)) out.push(mk('ASSET_CLIP', `${w.w}: no clip ${w.pluralClip} in ${w.pack}`));
    }
    if (pics && w.pic !== null && !pics.has(w.pic)) out.push(mk('ASSET_PIC', `${w.w}: no picture ${w.pic}`));
  }
  return out;
}

/* ---------------- Budget ---------------- */

function checkBudget({ raw }: Ctx): Finding[] {
  const out: Finding[] = [];
  const b = raw.budget as Partial<Budget> | undefined;
  if (!b) return [err('BUDGET_KEYS', 'budget.json is missing')];
  for (const k of BUDGET_KEYS) if (b[k] === undefined) out.push(err('BUDGET_KEYS', `budget: key ${k} is missing`));
  if (b.share) {
    const sum = b.share.current + b.share.review + b.share.mixed;
    if (Math.abs(sum - 1) > 0.001) out.push(err('BUDGET_KEYS', `budget: share sums to ${sum}, not 1`));
  }
  const steps = new Set(allSteps(raw).map(s => s.id));
  if (b.profiles) {
    if (b.defaultProfile !== undefined && !b.profiles[b.defaultProfile]) out.push(err('BUDGET_KEYS', `budget: default profile ${b.defaultProfile} is not defined`));
    for (const [name, p] of Object.entries(b.profiles)) {
      const named = [p.r.lo, p.r.probe, p.r.floor, p.s.lo, p.s.probe, p.s.floor, p.m.lo, p.m.probe, p.m.floor, ...p.school];
      for (const s of named) if (s !== null && !steps.has(s)) out.push(err('BUDGET_KEYS', `budget: profile ${name} names unknown step ${s}`));
    }
  }
  return out;
}

/* ---------------- Entry ---------------- */

export function validate(input: ValidateInput, t: Partial<Thresholds> = {}): Finding[] {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...t };
  const raw = input.raw;
  let c: Content | null = null;
  const out: Finding[] = [];
  try {
    c = buildContent(raw);
  } catch (e) {
    out.push(err('BUILD', (e as Error).message));
  }
  const table: Record<string, RawGpc> = {};
  for (const g of raw.gpcs) table[g.id] ??= g;
  const ctx: Ctx = { input, raw, t: thresholds, c, table };
  // Checks that need the built Content skip that part when the build threw.
  for (const check of [checkGpcs, checkSteps, checkTwins, checkWords, checkTricky, checkCoverage, checkNames, checkDutch, checkLines, checkAssets, checkBudget]) {
    out.push(...check(ctx));
  }
  return out;
}

