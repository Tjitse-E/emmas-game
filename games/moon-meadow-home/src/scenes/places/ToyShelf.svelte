<script lang="ts">
  // The toy shelf (Task A10): free play with the jars she labelled and the golden mice jar. A tap on a label reads
  // it; a tap on a jar lifts one thing out to play with, a tap on the thing puts it back (no event). With
  // `params.label` a label act runs over the shelf; after it (or with nothing to serve) the meadow arrow shows.
  import { onDestroy, onMount, untrack } from 'svelte';
  import Heap from '../../art/Heap.svelte';
  import Picture from '../../art/Picture.svelte';
  import MeadowArrow from '../../ui/MeadowArrow.svelte';
  import ReplayButton from '../../ui/ReplayButton.svelte';
  import LabelBubble from './LabelBubble.svelte';
  import { drag, press } from '../../platform/input.ts';
  import { setBands } from '../../platform/stage.svelte.ts';
  import { svg } from '../../ui/places-svg.ts';
  import { audio, type SpeakId } from '../../audio/index.ts';
  import { game } from '../../game.svelte.ts';
  import { shelfJars, shelfPages, type ShelfJar } from '../../core/places/jars.ts';
  import type { PlacesState } from '../../core/places/state.ts';
  import { once } from '../../places/session.ts';
  import { setPlaceHook } from '../../places/hook.ts';

  let { params = {} }: { params?: Record<string, unknown> } = $props();

  // A scene's params are fixed for its life (the router remounts on a new entry).
  const wantsLabel = untrack(() => params.label === true);
  const finder = untrack(() => (typeof params.baby === 'string' ? params.baby : null));
  let labelOn = $state(wantsLabel);
  let page = $state(0);
  type Lifted = { key: number; jar: string; picture: string; x: number; y: number };
  let lifted = $state<Lifted[]>([]);
  let nextKey = 0;

  const jars = $derived.by(() => { void game.version; return shelfJars(game.state.places as unknown as PlacesState); });
  const pages = $derived(shelfPages(jars));
  const shown = $derived(pages[Math.min(page, pages.length - 1)] ?? []);
  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);

  function liftOut(j: ShelfJar): void {
    if (lifted.length >= 8) return;
    void audio.sfx('pop');
    lifted = [...lifted, { key: nextKey++, jar: j.jar, picture: j.picture, x: 200 + (lifted.length % 6) * 140, y: 640 }];
  }
  function putBack(key: number): void {
    lifted = lifted.filter((l) => l.key !== key);
  }
  function moveTo(key: number, p: { x: number; y: number } | null): void {
    if (!p) return;
    lifted = lifted.map((l) => (l.key === key ? { ...l, x: Math.max(60, Math.min(1120, p.x)), y: Math.max(560, Math.min(780, p.y)) } : l));
  }

  onMount(() => {
    setBands('#f6e3c8', '#d9b88f');
    setPlaceHook('shelf', { jars: () => jars.map((j) => ({ word: j.word, count: j.count, golden: j.golden })), pages: () => pages.length });
    void (async () => {
      await audio.preloadScene('places');
      if (!labelOn && once('shelf-intro')) await say(['lb-shelf']);
    })();
  });
  onDestroy(() => setPlaceHook('shelf', null));
</script>

<div class="shelf-scene" aria-label="toy shelf">
  <div class="plank top" aria-hidden="true"></div>
  <div class="plank low" aria-hidden="true"></div>
  <div class="side left" aria-hidden="true"></div>
  <div class="side right" aria-hidden="true"></div>
  <div class="jars">
    {#each shown as j (j.jar)}
      <div class="slot">
        <button class="jar" aria-label="jar {j.word}" use:press={() => liftOut(j)}>
          <span class="glass" aria-hidden="true">{@html svg('jar', j.golden ? { colour: '#fff1c2' } : {})}</span>
          <span class="inside">
            {#if j.count > 1}<Heap id={j.picture} count={j.count} size={96} mode="jar" seed={j.count + j.word.length} label="" />
            {:else}<Picture id={j.picture} size={78} label="" />{/if}
          </span>
        </button>
        <button class="label" class:gold={j.golden} aria-label="label {j.word}" use:press={() => void say([j.clip])}>
          {@html svg('jar-label', { label: j.word, colour: j.golden ? '#ffd75e' : undefined })}
        </button>
      </div>
    {/each}
  </div>
  {#if pages.length > 1}
    {#if page > 0}<button class="page back" aria-label="shelf back" use:press={() => (page -= 1)}>{@html svg('plank')}</button>{/if}
    {#if page < pages.length - 1}<button class="page next" aria-label="shelf next" use:press={() => (page += 1)}>{@html svg('plank')}</button>{/if}
  {/if}

  {#each lifted as l (l.key)}
    <button class="thing" style:left="{l.x - 50}px" style:top="{l.y - 50}px" aria-label="thing {l.picture}"
      use:drag={{ data: l.key, onTap: () => putBack(l.key), onDrop: (d) => moveTo(l.key, d.point) }}>
      <Picture id={l.picture} size={100} label="" />
    </button>
  {/each}

  {#if labelOn}
    <LabelBubble baby={finder} ondone={() => (labelOn = false)} />
  {:else}
    <MeadowArrow />
  {/if}
  <ReplayButton onreplay={() => void say(['lb-shelf'])} />
</div>

<style>
  .shelf-scene { position: absolute; inset: 0; background: linear-gradient(#f6e3c8, #ead0aa 70%, #d9b88f); }
  .plank { position: absolute; left: 120px; width: 940px; height: 22px; border-radius: 8px; background: #c98f5a; box-shadow: 0 6px 0 #a8703f; }
  .plank.top { top: 214px; }
  .plank.low { top: 454px; }
  .side { position: absolute; top: 40px; width: 22px; height: 450px; border-radius: 8px; background: #b97f4b; }
  .side.left { left: 110px; }
  .side.right { left: 1048px; }
  .jars { position: absolute; left: 150px; top: 70px; width: 880px; display: grid; grid-template-columns: repeat(4, 200px); grid-auto-rows: 240px; gap: 0 26px; }
  .slot { position: relative; width: 200px; height: 240px; }
  .jar { position: absolute; left: 30px; top: 0; width: 140px; height: 150px; }
  .glass { position: absolute; inset: 0; pointer-events: none; }
  .glass :global(svg) { width: 100%; height: 100%; }
  .inside { position: absolute; left: 22px; top: 26px; width: 96px; height: 96px; display: grid; place-items: center; pointer-events: none; }
  .label { position: absolute; left: 42px; top: 108px; width: 116px; height: 80px; }
  .label :global(svg) { width: 100%; height: 100%; pointer-events: none; }
  .page { position: absolute; top: 300px; width: 96px; height: 96px; border-radius: 50%; background: #fff6e0; border: 4px solid #d9a23a; }
  .page :global(svg) { width: 60px; height: 60px; pointer-events: none; }
  .page.back { left: 30px; transform: scaleX(-1); }
  .page.next { right: 30px; }
  .thing { position: absolute; width: 100px; height: 100px; z-index: 20; }
</style>
