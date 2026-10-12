// Meadow stress test (art Task A10): stress.html?n=44&walk=4&heads=11&flowers=60&art=real|placeholder&duration=30&lite=1
import { mount } from 'svelte';
import { loadArtManifest } from '../art/manifest.ts';
import Stress from './Stress.svelte';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => {
  const v = Number(q.get(k) ?? d);
  return Number.isFinite(v) && v >= 0 ? v : d;
};
const art = q.get('art') === 'placeholder' ? 'placeholder' : 'real';

void (async () => {
  await loadArtManifest(import.meta.env.BASE_URL, art === 'placeholder' ? 'art/placeholder/manifest.json' : 'art/manifest.json');
  mount(Stress, {
    target: document.getElementById('app')!,
    props: { n: num('n', 44), walk: num('walk', 4), heads: num('heads', 11), flowers: num('flowers', 60), duration: num('duration', 30),
      art, lite: q.get('lite') === '1' },
  });
})();
