// Every fixed audio line the heartbeat scenes need (master R6, R7, R53).
// Number lines are audio's (tools/audio/number-lines.ts); heartbeat only builds their ids through keys.ts.
// Texts marked v2 are copied exactly from ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json, so the generator cache makes them free.
import type { LineFile } from '../../types/contracts.ts';
import { HEARTBEAT_NUMBER_IDS } from '../keys.ts';

export type LineDef = { id: string; speaker: 'narrator' | 'queen' | 'foal'; text: string };

/** Number clip ids (num-, ord-) used by the heartbeat. Audio generates them (contracts C12). */
export const lineId = HEARTBEAT_NUMBER_IDS;
/** Herd counts with a generated clip in Wave A (R7). */
export const TIER1_COUNT_MAX = 60;
/** Highest herd count that ever gets a clip (Wave C run 12, R37). A count above the generated range is skipped by the facade. */
export const COUNT_MAX = 100;

/** Ids that content/lines/common.json (audio) defines. The heartbeat uses them but never writes them. */
export const COMMON_LINE_IDS = [
  'foal-hello', 'foal-yay', 'foal-silly', 'foal-notme', 'foal-wee', 'foal-yum', 'foal-cuddle', 'foal-yawn',
  'fb-lovely', 'fb-letters', 'h-sounds', 'g-listen',
] as const;

const FIXED: LineDef[] = [
  // Nest (v2 unless noted)
  { id: 'g-egg', speaker: 'narrator', text: 'Make every cup warm, and the egg will hatch.' },
  { id: 'g-stone', speaker: 'narrator', text: 'Drag one stone to the nest.' },
  { id: 'g-two-stones', speaker: 'narrator', text: 'This egg needs two stones. Together they make every cup warm.' },
  { id: 'g-one-more', speaker: 'narrator', text: 'Now one more stone.' },
  { id: 'g-blanket', speaker: 'narrator', text: 'The blanket hides the cups.' },
  { id: 'g-stars', speaker: 'narrator', text: 'Look at the stars on the egg. Then drag the stone that matches.' }, // new
  { id: 'g-count-stars', speaker: 'narrator', text: 'Count the stars on the egg. Then drag the stone that matches.' }, // new
  { id: 'fb-warm', speaker: 'narrator', text: 'Every cup is warm!' },
  { id: 'fb-hot', speaker: 'narrator', text: 'Too hot!' },
  { id: 'fb-brr', speaker: 'narrator', text: 'Brr!' },
  { id: 'fb-too-many', speaker: 'narrator', text: 'Too many!' }, // new
  { id: 'fb-lovely', speaker: 'narrator', text: 'Lovely!' },
  { id: 'h-count', speaker: 'narrator', text: "Let's count the cold cups." },
  { id: 'h-peek', speaker: 'narrator', text: "Let's peek under the blanket." },
  { id: 'h-stars', speaker: 'narrator', text: "Let's count the stars." }, // new
  // Hatch (v2)
  { id: 'lumi-hatching', speaker: 'queen', text: "It's hatching!" },
  { id: 'lumi-baby', speaker: 'queen', text: 'A baby unicorn! Hello, little one.' },
  { id: 'lumi-sparkly', speaker: 'queen', text: 'Ooh, a sparkly one!' },
  // Naming (v2 unless noted)
  { id: 'g-bells', speaker: 'narrator', text: 'Your baby needs a name! Tap a bell to hear a name.' },
  { id: 'g-bell-drag', speaker: 'narrator', text: 'Drag the name you like to your baby.' },
  { id: 'g-spell', speaker: 'narrator', text: "Let's write the name on the tag. Listen." },
  { id: 'g-gems', speaker: 'narrator', text: 'Put the gems in the slots.' },
  { id: 'g-slide', speaker: 'narrator', text: 'Now slide the star, and listen.' },
  { id: 'fb-spelled', speaker: 'narrator', text: "You wrote your baby's name!" },
  { id: 'g-gold', speaker: 'narrator', text: 'Make any name you like!' },
  { id: 'fb-gold-yes', speaker: 'narrator', text: 'What a lovely name!' },
  { id: 'fb-tricky', speaker: 'narrator', text: "What a great name! It's a tricky one for me to say." },
  { id: 'fb-no-vowel', speaker: 'narrator', text: 'Every name needs a pink gem!' }, // new
  { id: 'fb-silly', speaker: 'narrator', text: "That's a silly name! Try other gems." }, // new
  { id: 'fb-that-says', speaker: 'narrator', text: 'That says.' }, // new, followed by her gem sounds
  { id: 'g-listen', speaker: 'narrator', text: 'Listen.' }, // common.json; followed by the name clip
  { id: 'g-garden', speaker: 'narrator', text: 'Tap a picture, and hear the names.' }, // new
  { id: 'g-first-sound', speaker: 'narrator', text: 'Tap a gem, and hear names that start with its sound.' }, // new
  { id: 'g-plus', speaker: 'narrator', text: 'Tap the plus to add a gem slot.' }, // new
  { id: 'g-sky-name', speaker: 'narrator', text: 'Ten stars make a sky unicorn! Give it a name.' }, // new
  { id: 'lumi-moon-name', speaker: 'queen', text: 'The moon told me a new name!' }, // new
  // Wish (v2 unless noted)
  { id: 'g-wish', speaker: 'narrator', text: 'Your baby has a wish!' }, // new text
  { id: 'h-sounds', speaker: 'narrator', text: 'Listen to the sounds.' },
  { id: 'fb-letters', speaker: 'narrator', text: 'Look at the letters again.' },
  { id: 'fb-more-than-one', speaker: 'narrator', text: 'More than one.' }, // new
  { id: 'fb-just-one', speaker: 'narrator', text: 'Just one.' }, // new
  // Stalls, goodnight and the moon (R54)
  { id: 'g-tent', speaker: 'narrator', text: 'A cosy tent for now! Your new stable row is coming.' }, // new
  { id: 'g-rollcall', speaker: 'narrator', text: "Bedtime! Look at the lantern, and tap that baby's door." }, // new
  { id: 'g-moon', speaker: 'narrator', text: "Tap the moon when it's bedtime." }, // v2, the visit-1 moon hint (Task 23)
  { id: 'lumi-night', speaker: 'queen', text: 'Night night, little one.' },
  { id: 'lumi-goodnight-emma', speaker: 'queen', text: 'Goodnight, Emma.' }, // new
  // Babies (v2, common.json)
  { id: 'foal-hello', speaker: 'foal', text: '[giggles] Hello!' },
  { id: 'foal-yay', speaker: 'foal', text: '[excited] Yay! Thank you!' },
  { id: 'foal-silly', speaker: 'foal', text: '[giggles] Silly!' },
  { id: 'foal-notme', speaker: 'foal', text: '[giggles] Not me!' },
  { id: 'foal-wee', speaker: 'foal', text: 'Wheee!' },
  { id: 'foal-yum', speaker: 'foal', text: 'Mmm! Yummy!' },
  { id: 'foal-cuddle', speaker: 'foal', text: '[happy sigh] Aww.' },
  { id: 'foal-yawn', speaker: 'foal', text: '[yawns] Sleepy.' },
];

/** Every fixed line the heartbeat code may speak, including the common ones. */
export function heartbeatLines(): LineDef[] {
  return FIXED.map((l) => ({ ...l }));
}

/** content/lines/heartbeat.json: the heartbeat's own lines in the audio line-file format. */
export function heartbeatLineFile(): LineFile & { lines: LineDef[] } {
  const common = new Set<string>(COMMON_LINE_IDS);
  return { scene: 'heartbeat', lines: heartbeatLines().filter((l) => !common.has(l.id)) };
}
