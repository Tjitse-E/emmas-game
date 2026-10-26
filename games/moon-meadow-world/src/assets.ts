// Where the demo finds v3's clips and pictures (spec 6.2: referenced, not copied).
// On a server the demo sits at .../games/moon-meadow-world/dist/ and v3's build at .../games/moon-meadow-home/,
// on Emma's server, on a test server (serve.ts with MOON_DIST) and online. In `vite dev`, /v3/ maps to v3's
// public folder and the shared letter sounds (vite.config.ts).

function computeV3Base(): string {
  const path = location.pathname;
  const at = path.indexOf('/moon-meadow-world/');
  return at >= 0 ? path.slice(0, at) + '/moon-meadow-home/' : '/v3/';
}

/** Absolute path of v3's build, ending in a slash. */
export const V3 = computeV3Base();

/** A v3 picture, such as v3Art('words/plum.webp') or v3Art('ui/ui-ghost-hand.webp'). */
export function v3Art(rel: string): string {
  return V3 + 'art/' + rel;
}

/** The picture of a word from v3's word art. */
export function wordPic(word: string): string {
  return v3Art('words/' + word + '.webp');
}
