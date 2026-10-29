// The demo's own lines: its sentences and the number patterns, with no side effects, so the tests can ask whether a
// clip that is not generated yet has a line. tools/build-lines.ts writes the ones the content uses to lines.json.
// Line rules: shared/README.md "Adding lines" and VOICES.md (Elizabeth for goals, hints, numbers and words; the
// queen for Lumi's story lines only).

export interface Line { id: string; speaker: 'narrator' | 'queen'; text: string; note?: string; expect?: string[]; seed?: number }

/** The demo's own sentences, in the order of the level. */
export const SENTENCES: Line[] = [
  { id: 'g4-walk', speaker: 'narrator', text: 'Tap the grass to walk.', note: 'Welcome: the ghost hand taps the grass.' },
  { id: 'g4-snow-egg', speaker: 'narrator', text: 'A snow egg! It hatches when it is just right.', note: 'First snow egg, before its goal.' },
  { id: 'g4-snow', speaker: 'narrator', text: 'Drag the snow stone that cools the extra cups.', note: 'Snow egg goal, after the numbers.' },
  { id: 'fb4-just-right', speaker: 'narrator', text: 'Just right!', note: 'Snow egg solved.' },
  { id: 'h4-count-extra', speaker: 'narrator', text: "Let's count the extra cups.", note: 'Snow egg hint, then the counting.' },
  { id: 'g4-give', speaker: 'narrator', text: 'Read the wish. Then give it to your baby.', note: 'Bath wish.' },
  { id: 'g4-pond', speaker: 'narrator', text: "Let's go to the pond!" },
  { id: 'g4-follow', speaker: 'narrator', text: 'Tap a unicorn, and it will follow you.' },
  { id: 'g4-slide-drag', speaker: 'narrator', text: 'Drag a unicorn to the top of the slide.' },
  { id: 'g4-slide-tap', speaker: 'narrator', text: 'Tap the slide, and slide down too!' },
  { id: 'g4-basket', speaker: 'narrator', text: 'Tap the basket, and feed your unicorns.', note: 'Free play.' },
  { id: 'g4-way-nest', speaker: 'narrator', text: 'The nest is this way.', note: 'After 20 s without progress.' },
  { id: 'g4-way-pond', speaker: 'narrator', text: 'The pond is this way.' },
  { id: 'g4-way-slide', speaker: 'narrator', text: 'The slide is this way.' },
  { id: 'g4-way-wildegg', speaker: 'narrator', text: 'The egg is this way.' },
  { id: 'g4-way-stable', speaker: 'narrator', text: 'The stable is this way.' },
  { id: 'g4-to-stable', speaker: 'narrator', text: 'Walk to the stable with your babies.', note: 'Bedtime.' },
  { id: 'h4-doors', speaker: 'narrator', text: 'Look at the numbers on the doors.', note: 'Door hint, while the row glows.' },
  { id: 'lumi4-another-egg', speaker: 'queen', text: 'Oh! Another egg!', note: 'The wild egg lands on the pond shore.' },
  { id: 'lumi4-ribbons', speaker: 'queen', text: 'You did so well today, Emma! Here are new ribbons for your hair.', note: 'Goodnight reward.' },
  // 2.2.0 (docs/v4/2.2.md section 6). The take-away facts come from the num-take pattern below.
  { id: 'g4-ready', speaker: 'narrator', text: "Let's get you ready, Princess Emma!", note: 'Customiser, every play.' },
  { id: 'g4-look-tap', speaker: 'narrator', text: 'Tap a picture to change your look.', note: 'Customiser, first visit, after g4-ready.' },
  { id: 'g4-ready-play', speaker: 'narrator', text: 'When you are ready, tap play.', note: 'Customiser, once after 25 s without a touch.' },
  { id: 'g4-dress-up', speaker: 'narrator', text: 'Your baby wants to dress up like you!', note: 'Dress-up wish.' },
  // Speech-to-text may only hear "Hart", so Tjitse listens to it once.
  { id: 'word-heart', speaker: 'narrator', text: 'Heart.', expect: ['Hart.'], note: 'Customiser: the hearts hair thing.' },
  { id: 'lumi4-picnic-done', speaker: 'queen', text: 'What a lovely picnic! A rose for your hair.', note: 'Picnic side quest reward.' },
  // 2.3.0 (docs/v4/2.3.md section 21). The phrases come from the phrase pattern and the new egg sums from the
  // number patterns below.
  { id: 'g4-nearly', speaker: 'narrator', text: 'Nearly ready!', note: 'Wardrobe, 15 s before the music box ends.' },
  { id: 'g4-hearts', speaker: 'narrator', text: 'Fill all three hearts, and the egg will hatch.', note: "Before an egg's first sum." },
  { id: 'g4-heart', speaker: 'narrator', text: 'A happy heart!', note: "After an egg's first and second sum." },
  { id: 'g4-gift', speaker: 'narrator', text: 'Pick one present!', note: 'The gift picker after a quest.' },
  { id: 'lumi4-corner', speaker: 'queen', text: 'Your babies want to dress up first!', note: 'Dressing Corner, before the two phrase reads.' },
  { id: 'lumi4-sticker', speaker: 'queen', text: 'You found them all! A sticker for your trunk.', note: 'A gift set is full.' },
  { id: 'lumi4-soon', speaker: 'queen', text: 'Soon you can ride here!', note: 'A tap on the saddle sign at the moon mist.' },
  { id: 'g4-beads', speaker: 'narrator', text: 'A necklace for your baby! Finish the pattern.', note: 'Bead tree, once a play.' },
  { id: 'g4-pattern', speaker: 'narrator', text: 'Finish the pattern.', note: 'Bead tree goal, on idle and replay.' },
  { id: 'fb4-pattern', speaker: 'narrator', text: 'Look at the pattern again.', note: 'Bead tree, after a wrong bead.' },
  { id: 'h4-pattern', speaker: 'narrator', text: "Let's look at the pattern.", note: 'Bead tree hint, then the repeat lights up.' },
  { id: 'fb4-necklace', speaker: 'narrator', text: 'What a pretty necklace!', note: 'Bead tree, after the third bead.' },
  // The colour words: the wardrobe says them when a colour is picked, and the phrase wish prints six of them. Rainbow
  // is v3's word-rainbow.
  { id: 'word-pink', speaker: 'narrator', text: 'Pink.', note: 'Colour word.' },
  { id: 'word-red', speaker: 'narrator', text: 'Red.', note: 'Colour word.' },
  { id: 'word-orange', speaker: 'narrator', text: 'Orange.', note: 'Colour word.' },
  { id: 'word-gold', speaker: 'narrator', text: 'Gold.', note: 'Colour word.' },
  { id: 'word-green', speaker: 'narrator', text: 'Green.', note: 'Colour word.' },
  { id: 'word-blue', speaker: 'narrator', text: 'Blue.', note: 'Colour word.' },
  { id: 'word-lilac', speaker: 'narrator', text: 'Lilac.', note: 'Colour word.' },
  { id: 'word-purple', speaker: 'narrator', text: 'Purple.', note: 'Colour word.' },
  { id: 'word-white', speaker: 'narrator', text: 'White.', note: 'Colour word.' },
  { id: 'word-silver', speaker: 'narrator', text: 'Silver.', note: 'Colour word.' },
  { id: 'word-brown', speaker: 'narrator', text: 'Brown.', note: 'Colour word.' },
];

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

function word(n: number): string {
  if (!ONES[n]) throw new Error(`no number word for ${n}`);
  return ONES[n];
}
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/** The number lines, one pattern per id family. */
export function numberLine(id: string): Line | null {
  let m = /^num-add-(\d+)-(\d+)$/.exec(id);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return { id, speaker: 'narrator', text: `${cap(word(a))} and ${word(b)} make ${word(a + b)}!`, note: 'Warm egg solved.' };
  }
  m = /^num-take-(\d+)-(\d+)$/.exec(id);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return { id, speaker: 'narrator', text: `${cap(word(a))} take away ${word(b)} is ${word(a - b)}!`, note: 'Snow egg solved.' };
  }
  // v3's "This egg needs seven warm cups." for the smaller snow eggs: num-egg-4 and num-egg-5 (2.3.0) and num-egg-3
  // (the sums within 10).
  m = /^num-egg-(\d+)$/.exec(id);
  if (m) return { id, speaker: 'narrator', text: `This egg needs ${word(Number(m[1]))} warm cups.`, note: 'Egg goal.' };
  m = /^num-toowarm-(\d+)$/.exec(id);
  if (m) return { id, speaker: 'narrator', text: `But ${word(Number(m[1]))} cups are warm!`, note: 'Snow egg goal.' };
  m = /^num-still-warm-(\d+)$/.exec(id);
  if (m) {
    const n = Number(m[1]);
    const text = n === 1 ? 'One cup is still too warm.' : `${cap(word(n))} cups are still too warm.`;
    return { id, speaker: 'narrator', text, note: 'Snow stone too small.' };
  }
  m = /^num-that-(\d+)$/.exec(id);
  if (m) {
    const w = word(Number(m[1]));
    return { id, speaker: 'narrator', text: `That is ${w}.`, expect: [`That's ${w}.`], note: 'After a wrong door.' };
  }
  return null;
}

/** The phrase wish's lines (2.3.0): "The green sock." for phrase-green-sock. */
export function phraseLine(id: string): Line | null {
  const m = /^phrase-([a-z]+)-([a-z]+)$/.exec(id);
  if (!m) return null;
  return { id, speaker: 'narrator', text: `The ${m[1]} ${m[2]}.`, note: 'Phrase wish, read back after she acts.' };
}

const byId = new Map(SENTENCES.map((l) => [l.id, l]));

/** The line for a clip id: one of the sentences, a number pattern or a phrase. Null when the demo has no line for it. */
export function lineFor(id: string): Line | null {
  return byId.get(id) ?? numberLine(id) ?? phraseLine(id);
}
