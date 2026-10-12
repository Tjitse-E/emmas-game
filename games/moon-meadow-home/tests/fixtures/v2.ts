// A synthetic v2 save in the shape ideas/opus-5-5-unicorn-egg-nest-v2/index.html writes (freshSave, record, babyForNaming).
import type { V2ImportDeps } from '../../src/core/save/v2.ts';

const NAMES = ['sam', 'tam', 'pip', 'ben', 'fen', 'tess', 'kit', 'sam', 'dan', 'liss', 'rob', 'pod', 'mip', null] as const;

export function makeV2Save(): Record<string, unknown> {
  const herd = NAMES.map((name, i) => ({
    id: i + 1,
    name,
    c: { body: '#ffe0ef', mane: ['#ff7fbf', '#9d7bff', '#4fc3ff'][i % 3], mane2: '#ffbf3f' },
    traits: { shiny: i === 2, speckled: i === 4, golden: i === 5 },
    hearts: i % 7,
    stickers: i === 0 ? ['pin', 'hat', 'pin'] : i === 3 ? ['pan'] : [],
    night: 1 + Math.floor(i / 4),
    playNight: 0,
  }));
  return {
    v: 2, night: 5, crown: true, herd, jar: 3, jarGoal: 10, gifts: ['hat', 'cup'], seen: { firstEgg: 1 },
    lv: { r: { step: 3, streak: 1 }, s: { step: 2, streak: 0 }, m: { step: 4, streak: 2 } },
    log: [
      { strand: 'r', result: 'miss', wish: 'hat', night: 1, t: 1 },
      { strand: 'r', result: 'first', wish: 'hat', night: 2, t: 2 },
      { strand: 's', result: 'helped', name: 'ken', night: 2, t: 3 },
      { strand: 'm', result: 'first', egg: 'plain', mode: 'two', step: 4, night: 3, t: 4 },
      { strand: 'own', result: 'logged', name: 'tamo', night: 3, t: 5 },
    ],
    nextId: 15,
    nameWishes: [{ name: 'tamo', night: 3, t: 5 }, { name: 'lunabel', night: 4, t: 6 }, { name: 'tamo', night: 4, t: 7 }],
  };
}

const DIGRAPHS = ['ck', 'ss', 'll', 'ff', 'sh', 'ch', 'th', 'ng', 'ee', 'ai', 'oa'];

/** Stand-in for the phonics workstream: longest-match digraphs, else single letters. */
export const testDeps: V2ImportDeps = {
  splitGraphemes(word) {
    const out: string[] = [];
    for (let i = 0; i < word.length;) {
      const two = word.slice(i, i + 2);
      if (DIGRAPHS.includes(two)) { out.push(two); i += 2; } else { out.push(word[i]); i += 1; }
    }
    return out;
  },
  graphemeItem: (strand, g) => `${strand}:g:${g}`,
  phonemes: gems => gems.join(' '),
};
