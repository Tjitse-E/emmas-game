<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Picture from '../art/Picture.svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import { mulberry32 } from '../art/heap.ts';
  import { artManifest, artUrl, background, type BreedId, type Stage } from '../art/manifest.ts';
  import { randomColours } from '../art/palette.ts';
  import { decodedBytes, summarise, verdict, type StressResult } from './frameStats.ts';

  type Props = { n: number; walk: number; heads: number; flowers: number; duration: number; art: string; lite?: boolean };
  const props: Props = $props();
  // The scene is built once from the URL; later prop changes do not rebuild it.
  const { n, walk, heads, flowers, duration, art, lite = false } = untrack(() => ({ ...props }));

  // With no unicorn art at all every baby is the drawn fallback unicorn, which the test then measures.
  const found = Object.keys(artManifest().unicorns).map((k) => k.split('.') as [BreedId, Stage]);
  const keys: [BreedId, Stage][] = found.length ? found : [['moon', 'baby']];
  const rng = mulberry32(99);
  const babies = Array.from({ length: n }, (_, i) => {
    const [breed, stage] = keys[i % keys.length];
    return { i, breed, stage, colours: randomColours(mulberry32(i + 1)),
      traits: { speckled: i % 3 === 0, shiny: i % 8 === 0, founder: i % 5 === 0 } };
  });
  const idleCount = Math.max(0, n - walk - heads - 1);
  const idle = babies.slice(0, idleCount).map((b, k) => ({ ...b, x: 40 + (k % 6) * 185 + rng() * 30, y: 250 + Math.floor(k / 6) * 100 + rng() * 20 }));
  const walkers = babies.slice(idleCount, idleCount + walk).map((b, k) => ({ ...b, y: 280 + k * 110, delay: -k * 3 }));
  const dragged = babies[idleCount + walk];
  const doorHeads = babies.slice(idleCount + walk + 1);
  const spots = Array.from({ length: flowers }, () => ({ x: rng() * 1130, y: 300 + rng() * 480 }));
  const bg = background('bg-meadow');
  const scale = Math.min(innerWidth / 1180, innerHeight / 820);

  let hud = $state('warming up');
  let ok = $state<boolean | null>(null);
  let dragEl: HTMLDivElement | undefined = $state();

  async function finish(deltas: number[]) {
    const urls = new Set<string>();
    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      if (el instanceof HTMLImageElement) urls.add(el.currentSrc || el.src);
      for (const m of getComputedStyle(el).backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)) urls.add(m[1]);
    }
    const sizes = await Promise.all([...urls].map((url) => new Promise<{ url: string; w: number; h: number }>((res) => {
      const im = new Image();
      im.onload = () => res({ url, w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => res({ url, w: 0, h: 0 });
      im.src = url;
    })));
    const decodedMB = decodedBytes(sizes) / 1048576;
    const s = summarise(deltas);
    ok = verdict(s, decodedMB);
    const result: StressResult = { ...s, decodedMB: Number(decodedMB.toFixed(1)), unicorns: n,
      elements: document.querySelectorAll('*').length, viewport: `${innerWidth}x${innerHeight}`, art: lite ? `${art}-lite` : art, ok };
    (window as unknown as { __stress: StressResult }).__stress = result;
    console.log('[stress] ' + JSON.stringify(result));
    hud = `${ok ? 'PASS' : 'FAIL'} · p95 ${s.p95.toFixed(1)} ms · drop ${s.dropPct.toFixed(1)}% · ${decodedMB.toFixed(0)} MB · ${n} unicorns`;
  }

  onMount(() => {
    const deltas: number[] = [];
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      if (dragEl) dragEl.style.transform = `translate(${590 + 380 * Math.sin(t / 1.3)}px, ${420 + 120 * Math.sin(t / 0.9)}px)`;
      if (t > 3) deltas.push(now - last);
      last = now;
      if (deltas.length > 0 && deltas.length % 30 === 0) {
        const s = summarise(deltas);
        hud = `${summarise(deltas.slice(-60)).fps.toFixed(0)} fps · p95 ${s.p95.toFixed(1)} ms · drop ${s.dropPct.toFixed(1)}%`;
      }
      if (t < duration + 3) raf = requestAnimationFrame(tick);
      else void finish(deltas);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="stage" style="transform:scale({scale})">
  {#if bg}<img class="bg" src={artUrl(bg.src)} alt="" width="1180" height="820" />{/if}
  {#each spots as f, i (i)}<div class="abs" style="left:{f.x}px;top:{f.y}px"><Picture id="decor-moonflower" size={48} /></div>{/each}
  {#each doorHeads as b, k (b.i)}
    <div class="door" style="left:{620 + (k % 6) * 92}px;top:{20 + Math.floor(k / 6) * 100}px">
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={84} pose="still" headOnly seed={b.i} {lite} />
    </div>
  {/each}
  {#each idle as b (b.i)}
    <div class="abs" style="left:{b.x}px;top:{b.y}px">
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={150} seed={b.i} facing={b.i % 2 ? 'left' : 'right'} {lite} />
    </div>
  {/each}
  {#each walkers as b (b.i)}
    <div class="walker" style="top:{b.y}px;animation-delay:{b.delay}s">
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={150} pose="walk" seed={b.i} {lite} />
    </div>
  {/each}
  {#if dragged}
    <div class="abs drag" bind:this={dragEl}>
      <Unicorn breed={dragged.breed} stage={dragged.stage} colours={dragged.colours} traits={dragged.traits} height={150} pose="drag" seed={dragged.i} {lite} />
    </div>
  {/if}
  {#each [0, 1, 2] as k (k)}<div class="bubble" style="left:{180 + k * 320}px;animation-delay:{-k * 0.4}s"></div>{/each}
  <div class="hud" class:pass={ok === true} class:fail={ok === false}>{hud}</div>
</div>

<style>
  .stage { position: absolute; left: 0; top: 0; width: 1180px; height: 820px; transform-origin: 0 0; overflow: hidden; }
  .bg { position: absolute; inset: 0; }
  .abs, .door { position: absolute; }
  .drag { left: 0; top: 0; will-change: transform; }
  .walker { position: absolute; left: 0; animation: stress-walk 12s linear infinite alternate; will-change: transform; }
  .bubble { position: absolute; top: 90px; width: 120px; height: 120px; border-radius: 50%; background: #fff; animation: stress-pulse 1.4s ease-in-out infinite; }
  .hud { position: absolute; left: 12px; top: 12px; padding: 8px 12px; font: 14px/1.3 ui-monospace, monospace; color: #fff; background: rgba(30, 24, 48, 0.8); border-radius: 8px; }
  .hud.pass { background: #1f7a3a; }
  .hud.fail { background: #a3242f; }
  @keyframes stress-walk { from { transform: translateX(0); } to { transform: translateX(900px); } }
  @keyframes stress-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
</style>
