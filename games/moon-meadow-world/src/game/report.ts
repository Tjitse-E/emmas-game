// The record of a play (2.4.0, docs/v4/2.4.md sections 5.8 and 7; playOf moved out of level.ts): the kind=play line's
// numbers, and after each place the save and a kind=hub line. After each place the save gets `last` (the copy this
// play read at its start, with this play's words and totals so far added, newest last, cut to 16) and `afternoon`
// (this play's maths quest and the gift quests done so far), so a play left before goodnight still counts, while the
// play itself keeps reading its start copies (g.start). The sign level is written by the ride after each trip.
import type { Game } from './game';
import { type HubPlace, QUEST_IDS, type QuestId } from './options';
import { type PlayLine, type Strand, diagQuery, hubFields, sendDiag } from './results';
import { LAST_MAX, type Save } from './save';

/** The version the build says on its start screen, without the v (dev builds say dev). */
export const VERSION = (typeof __MMW_VERSION__ === 'string' ? __MMW_VERSION__ : 'dev').replace(/^v/, '');

/** Each place's letter on the play line's sq and the hub line's p: e nest egg, s shore egg, w wish, ... */
export const PLACE_LETTER: Record<HubPlace, string> = {
  egg: 'e', shore: 's', wish: 'w', picnic: 'p', beads: 'b', rack: 'k', ride: 'r', pond: 'o', corner: 'c',
};

const isQuest = (p: string): p is QuestId => QUEST_IDS.includes(p as QuestId);
/** Play-clock minutes to one decimal, as the play line's min. */
const minutes = (ms: number): number => Math.round(ms / 6000) / 10;

/**
 * `last` after a place or at goodnight: the start copy's words and totals with this play's added, newest last, cut to
 * the last 16 of each (save.ts LAST_MAX). A word read again keeps only its newest place. Sign targets are never in
 * this play's words: they are their own pool.
 */
export function mergeLast(start: Save['last'], today: { words: readonly string[]; totals: readonly number[] }): Save['last'] {
  const all = [...start.words, ...today.words];
  const words = all.filter((w, i) => all.lastIndexOf(w) === i);
  return { words: words.slice(-LAST_MAX), totals: [...start.totals, ...today.totals].slice(-LAST_MAX) };
}

/** This play's words and totals so far (the wish, picnic and phrase targets, and every sum's total). */
export function todayOf(g: Game): { words: string[]; totals: number[] } {
  return { words: [...g.today.words], totals: [...g.maths.used.totals] };
}

/**
 * A place has ended: the hub calls it with the place's count this play (`n`), its start on the play clock (`fromMs`)
 * and its own checked time (`checkedMs`). It sends the kind=hub line (the place's letter, its count, the play-clock
 * minutes now, its seconds and its checked seconds) and writes `last` from the start copy and `afternoon` with the gift
 * quests done so far.
 */
export function afterPlace(g: Game, p: HubPlace, o: { n: number; fromMs: number; checkedMs: number }): void {
  const h = g.hub;
  const line = {
    v: VERSION, pn: g.results.pn, p: PLACE_LETTER[p], n: o.n, min: minutes(h.playMs), t: Math.max(0, Math.round((h.playMs - o.fromMs) / 1000)),
    ck: Math.round(o.checkedMs / 1000),
  };
  console.info('[mmw hub]', JSON.stringify(line));
  sendDiag(diagQuery(hubFields(line)));
  const done = [...new Set([...h.done, p].filter(isQuest))];
  const last = mergeLast(g.start.last, todayOf(g));
  g.save.write((s) => {
    s.last = last;
    s.afternoon = { maths: g.quests.maths, done };
  });
}

/** This play for its kind=play line: the clocks, the gate, the quests, the gifts, the levels and the mix (2.4 5.8). */
export function playOf(g: Game): PlayLine {
  const s = g.save.data;
  const q = g.quests;
  const h = g.hub;
  const lines = g.results.lines;
  const count = (st: Strand) => lines.filter((l) => l.strand === st).length;
  const firsts = (st: Strand) => lines.filter((l) => l.strand === st && l.outcome === 'first').length;
  return {
    v: VERSION,
    plays: s.plays,
    playMs: performance.now() - g.clock.startedAt,
    checkedMs: g.clock.checkedMs,
    mirrorMs: g.clock.dressMs.mirror,
    cornerDressMs: g.clock.dressMs.corner,
    cornerMs: q.cornerMs,
    // 2.4.0: hub time with no place running (the hub lane's play clock counts it).
    freeMs: h.idleMs,
    gate: q.gate,
    quests: [...q.done],
    gifts: q.gifts,
    reading: g.options.readingLevel ?? s.reading.level,
    phrases: s.phrases.level,
    band: g.maths.band,
    patterns: g.options.patternLevel ?? s.patterns.level,
    nr: count('r'),
    ns: count('s'),
    nm: count('m'),
    r1: firsts('r'),
    s1: firsts('s'),
    m1: firsts('m'),
    sq: h.done.map((p) => PLACE_LETTER[p]).join(','),
    pondVisits: h.done.filter((p) => p === 'pond').length,
    pondMs: h.pondMs,
    rideMs: g.clock.rideMs,
    bedtimeMin: h.bedtimeAt === null ? null : h.bedtimeAt / 60_000,
    babies: g.babies.length,
    signs: g.options.signLevel ?? s.signs.level,
  };
}
