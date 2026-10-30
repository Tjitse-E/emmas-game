// The record of a play (2.4.0, docs/v4/2.4.md sections 5.8 and 7; playOf moved out of level.ts): the kind=play line's
// numbers, and after each place the save and a kind=hub line. The babies lane fills afterPlace and the new play line
// fields (docs/v4/2.4-plan.md Task 11); step 0's afterPlace writes only `afternoon`, so the maths quest's rotation works
// for the hub lane.
import type { Game } from './game';
import { type HubPlace, QUEST_IDS, type QuestId } from './options';
import type { PlayLine } from './results';

/** The version the build says on its start screen, without the v (dev builds say dev). */
export const VERSION = (typeof __MMW_VERSION__ === 'string' ? __MMW_VERSION__ : 'dev').replace(/^v/, '');

/** This play for its kind=play line: the clocks, the gate, the quests, the gifts and the levels. */
export function playOf(g: Game): PlayLine {
  const s = g.save.data;
  const q = g.quests;
  return {
    v: VERSION,
    plays: s.plays,
    playMs: performance.now() - g.clock.startedAt,
    checkedMs: g.clock.checkedMs,
    mirrorMs: g.clock.dressMs.mirror,
    cornerDressMs: g.clock.dressMs.corner,
    cornerMs: q.cornerMs,
    // 2.4.0: hub time with no place running (the hub lane's play clock counts it).
    freeMs: g.hub.idleMs,
    gate: q.gate,
    quests: [...q.done],
    gifts: q.gifts,
    reading: g.options.readingLevel ?? s.reading.level,
    phrases: s.phrases.level,
    band: g.maths.band,
    patterns: g.options.patternLevel ?? s.patterns.level,
  };
}

/**
 * A place has ended (the hub calls it with its count this play, its start on the play clock and its checked time).
 * Step 0 writes this play's afternoon: its maths quest and the gift quests done so far in the hub.
 */
export function afterPlace(g: Game, _p: HubPlace, _o: { n: number; fromMs: number; checkedMs: number }): void {
  const done = [...new Set(g.hub.done.filter((p): p is QuestId => QUEST_IDS.includes(p as QuestId)))];
  g.save.write((s) => void (s.afternoon = { maths: g.quests.maths, done }));
}
