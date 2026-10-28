// The music box tune of the wardrobe (docs/v4/2.3.md section 20): an original eight-bar melody in C major, 3/4 at
// 92 beats a minute, with a soft bass note on the first beat of every bar. It is laid out backwards from its end: the
// last note, the tonic, sounds at ms - BELL_DECAY_S, so it has rung out exactly at `ms`. Before it, the last four
// bars slow down to 70% of the tempo (by the note times, so the pitch stays). Before those, the eight bars loop at
// full tempo back to the start of the box. The tune begins on the first bar line after the box opens, with its bass
// note, so it never starts in the middle of a bar; the rest before it is shorter than one bar.
// Pure data and arithmetic: sound.ts plays the plan with a bell voice.

export const TUNE_BPM = 92;
/** Every note rings for this long (a triangle and a sine an octave up, decaying to silence). */
export const BELL_DECAY_S = 1.2;
/** The tempo the last four bars slow down to, as a share of the full tempo. */
export const SLOW_TO = 0.7;
export const BEATS_PER_BAR = 3;
export const BARS = 8;
/** The longest box the tune and its timer take; a longer one is cut to this. */
export const MAX_BOX_MS = 10 * 60_000;

/** A box length the timer and the plan can use: 0 for NaN or a value of 0 or less, at most MAX_BOX_MS. */
export function boxMs(ms: number): number {
  return Number.isNaN(ms) || ms <= 0 ? 0 : Math.min(ms, MAX_BOX_MS);
}

/** One bar of the melody: [beat in the bar, MIDI note]. A note lasts until the next one. */
type Bar = ReadonlyArray<readonly [number, number]>;

/** E5 G5 C6 | B5 - A5 | G5 F5 E5 | D5 - - | E5 G5 C6 | D6 - C6 | A5 G5 D5 | C5 - - */
const MELODY: readonly Bar[] = [
  [[0, 76], [1, 79], [2, 84]],
  [[0, 83], [2, 81]],
  [[0, 79], [1, 77], [2, 76]],
  [[0, 74]],
  [[0, 76], [1, 79], [2, 84]],
  [[0, 86], [2, 84]],
  [[0, 81], [1, 79], [2, 74]],
  [[0, 72]],
];
/** The bass on the first beat of each bar: C4 G3 A3 G3 | C4 F3 G3 C4 (I V vi V | I IV V I). */
const BASS: readonly number[] = [60, 55, 57, 55, 60, 53, 55, 60];

/** The melody's beat (0 to 23) of its last note: the first beat of bar 8. */
const LAST_BEAT = (BARS - 1) * BEATS_PER_BAR;
/** The slow ending starts at bar 5, so it holds the last four bars. */
const SLOW_FROM = 4 * BEATS_PER_BAR;

export interface TuneNote {
  /** Seconds from the start of the box. */
  t: number;
  midi: number;
  /** Peak level of the note, 1 for the melody. */
  level: number;
  bass: boolean;
}

/** The notes that start on one beat of the melody (0 to 23). */
function notesOn(beat: number): Array<{ midi: number; level: number; bass: boolean }> {
  const bar = Math.floor(beat / BEATS_PER_BAR);
  const inBar = beat % BEATS_PER_BAR;
  const out = MELODY[bar].filter(([b]) => b === inBar).map(([, midi]) => ({ midi, level: 1, bass: false }));
  if (inBar === 0) out.push({ midi: BASS[bar], level: 0.55, bass: true });
  return out;
}

/** Seconds from the start of the slow ending to each of its beats, up to the last note. */
function slowOnsets(beat: number): number[] {
  const steps = LAST_BEAT - SLOW_FROM;
  const out = [0];
  for (let j = 0; j < steps; j++) {
    // The tempo falls in even steps from the full tempo to SLOW_TO on the gap that leads to the last note.
    const tempo = 1 - (1 - SLOW_TO) * (j / (steps - 1));
    out.push(out[j] + beat / tempo);
  }
  return out;
}

/**
 * The whole tune for a box of `ms` milliseconds, sorted by time. It starts on a bar line and its last note is the
 * tonic, ringing out at `ms`. A box of no length (NaN, 0 or less) has no tune.
 */
export function tunePlan(ms: number): TuneNote[] {
  const length = boxMs(ms);
  if (length <= 0) return [];
  const beat = 60 / TUNE_BPM;
  const last = Math.max(0, length / 1000 - BELL_DECAY_S);
  const slow = slowOnsets(beat);
  const slowStart = last - slow[slow.length - 1];
  const beats: Array<{ t: number; beat: number }> = [];
  slow.forEach((o, j) => beats.push({ t: slowStart + o, beat: SLOW_FROM + j }));
  // Before the slow ending the melody runs backwards from bar 4 at the full tempo, wrapping round, to the start.
  for (let m = 1; slowStart - m * beat >= 0; m++) {
    const n = BARS * BEATS_PER_BAR;
    beats.push({ t: slowStart - m * beat, beat: (((SLOW_FROM - m) % n) + n) % n });
  }
  // The first bar line inside the box. The last note always is one (the first beat of bar 8), so there is one.
  const inBox = beats.filter((b) => b.t >= 0);
  const first = Math.min(...inBox.filter((b) => b.beat % BEATS_PER_BAR === 0).map((b) => b.t));
  const notes: TuneNote[] = [];
  for (const b of inBox) {
    if (b.t < first) continue;
    for (const n of notesOn(b.beat)) notes.push({ t: b.t, ...n });
  }
  return notes.sort((a, b) => a.t - b.t || a.midi - b.midi);
}

/** The frequency of a MIDI note. */
export function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
