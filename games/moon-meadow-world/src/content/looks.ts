// How the herd and the newborns look. Colours are v3's body and mane palettes (games/moon-meadow-home/src/art/
// palette.ts), so every unicorn looks like a v3 baby: a pastel coat and saturated curly manes. Each breed keeps to
// its own corner of the palette, so the four breeds read apart at a glance and the herd looks lovely together.
import type { Breed, Stage, UnicornLook } from '../contracts.ts';
import { type Rand, pick } from './rand.ts';

const BODY = {
  pink: '#ffe0ef', lavender: '#e6dcff', sky: '#d6f1ff', lemon: '#fff3c4',
  mint: '#dcffe8', peach: '#ffe2cf', white: '#ffffff', orchid: '#f5d9ff',
} as const;
const MANE = {
  pink: '#ff7fbf', purple: '#9d7bff', blue: '#4fc3ff', gold: '#ffbf3f',
  green: '#3fd69a', coral: '#ff8f6b', violet: '#c46bff', raspberry: '#ff5f8f',
} as const;

/** Each breed's coats and manes for a newborn. A white coat is the snow breed's, so a warm-egg baby always has colour. */
const BREED_PALETTE: Record<Breed, { body: string[]; mane: string[] }> = {
  moon: { body: [BODY.lavender, BODY.sky], mane: [MANE.purple, MANE.blue, MANE.violet, MANE.pink, MANE.gold] },
  nestling: { body: [BODY.lemon, BODY.mint, BODY.peach], mane: [MANE.gold, MANE.green, MANE.coral, MANE.pink] },
  berry: { body: [BODY.pink, BODY.orchid, BODY.peach], mane: [MANE.raspberry, MANE.violet, MANE.pink, MANE.purple] },
  snow: { body: [BODY.white, BODY.sky, BODY.mint], mane: [MANE.blue, MANE.purple, MANE.green, MANE.violet] },
};

const look = (stage: Stage, breed: Breed, body: string, mane: string, mane2: string): UnicornLook =>
  ({ stage, breed, body, mane, mane2 });

/**
 * The starting herd in door order (door 1 first): 8 babies and 4 foals, three of each breed, no two alike.
 * The names are checked against v3's name clips by tools/build-content.ts.
 */
export const HERD_LOOKS: readonly { name: string; look: UnicornLook }[] = [
  { name: 'Luna', look: look('foal', 'moon', BODY.lavender, MANE.purple, MANE.blue) },
  { name: 'Rosie', look: look('baby', 'berry', BODY.pink, MANE.pink, MANE.violet) },
  { name: 'Daisy', look: look('baby', 'nestling', BODY.lemon, MANE.gold, MANE.coral) },
  { name: 'Ivy', look: look('baby', 'snow', BODY.sky, MANE.green, MANE.blue) },
  { name: 'Ruby', look: look('foal', 'berry', BODY.orchid, MANE.raspberry, MANE.pink) },
  { name: 'Poppy', look: look('baby', 'nestling', BODY.peach, MANE.coral, MANE.gold) },
  { name: 'Willow', look: look('foal', 'nestling', BODY.mint, MANE.green, MANE.gold) },
  { name: 'Bonnie', look: look('baby', 'berry', BODY.peach, MANE.violet, MANE.pink) },
  { name: 'Lily', look: look('baby', 'snow', BODY.white, MANE.purple, MANE.blue) },
  { name: 'Mia', look: look('baby', 'moon', BODY.lavender, MANE.pink, MANE.purple) },
  { name: 'Isla', look: look('foal', 'snow', BODY.mint, MANE.blue, MANE.violet) },
  { name: 'Evie', look: look('baby', 'moon', BODY.white, MANE.violet, MANE.gold) },
];

const lookKey = (l: Pick<UnicornLook, 'body' | 'mane' | 'mane2'>): string => `${l.body}/${l.mane}/${l.mane2}`;
const HERD_KEYS = new Set(HERD_LOOKS.map((h) => lookKey(h.look)));

/** The breeds a warm egg brings (v3: the moon egg, the small nest and the berry egg). The snow egg brings snow. */
export const WARM_BREEDS: readonly Breed[] = ['nestling', 'berry', 'moon'];

/** A newborn's look: a baby of the egg's breed, in colours no unicorn of the herd has. `avoid` keeps two newborns apart. */
export function babyLook(kind: 'warm' | 'snow', rand: Rand, avoid: UnicornLook[] = []): UnicornLook {
  const breed: Breed = kind === 'snow' ? 'snow' : pick(rand, WARM_BREEDS);
  const p = BREED_PALETTE[breed];
  const taken = new Set([...HERD_KEYS, ...avoid.map(lookKey)]);
  const options: UnicornLook[] = [];
  for (const body of p.body) {
    for (const mane of p.mane) {
      for (const mane2 of p.mane) {
        if (mane2 === mane) continue;
        const l = look('baby', breed, body, mane, mane2);
        if (!taken.has(lookKey(l))) options.push(l);
      }
    }
  }
  return pick(rand, options);
}
