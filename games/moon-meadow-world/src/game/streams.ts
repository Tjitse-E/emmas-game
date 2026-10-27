// Each moment's own random stream (docs/v4/2.2.md 4.2): g.randFor('egg1'), 'wish1', 'picnic', ... Customiser and
// quest choices then never shift a sum or a word, and ?at=egg2&seed=5 gives the same egg as a full play with seed 5.
import { type Rand, stream } from '../content/rand';

export interface Streams {
  /** The stream of a label. Asking again in the same play continues the same stream. */
  for(label: string): Rand;
  /** Forget every stream (a jump starts the play again from a part). */
  reset(): void;
}

export function createStreams(seed: number): Streams {
  const open = new Map<string, Rand>();
  return {
    for(label) {
      let r = open.get(label);
      if (!r) {
        r = stream(seed, label);
        open.set(label, r);
      }
      return r;
    },
    reset() {
      open.clear();
    },
  };
}
