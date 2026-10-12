<script lang="ts">
  // The nest (spec 2.6): an egg on the nest, cups to warm, and answer stones to drag onto the nest.
  import { onDestroy, onMount, untrack } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { dropTarget, press } from '../platform/input.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import Egg from '../art/Egg.svelte';
  import StoneTray from '../ui/StoneTray.svelte';
  import { BREED_OF } from '../core/heartbeat/hatch.ts';
  import { stoneFace } from '../core/maths/stones.ts';
  import type { Served } from '../core/heartbeat/types.ts';
  import { NestCtrl, freeEgg } from './heartbeat/nest.ctrl.ts';
  import { bridge, liveDeps } from './heartbeat/deps.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { ghost, goal, moonbeam } from './heartbeat/guides.svelte.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import Backdrop from './heartbeat/Backdrop.svelte';

  let { params }: { params: Record<string, unknown> } = $props();
  const p = untrack(() => params) as { served?: Served; golden?: boolean; speckled?: boolean };

  const here = heartbeat.atNest();
  const deps = liveDeps({ place: 'nest', strand: 'm' });
  const offer = p.served ? null : bridge.serveEgg(deps.rng);
  const served = p.served ?? offer?.served ?? freeEgg(offer?.kind ?? 'moon');
  const ctrl = new NestCtrl(served, deps, {
    golden: !!p.golden, speckled: !!p.speckled, firstEver: game.world.flowers === 0, free: !p.served && !offer?.served,
  });
  const t = ctrl.task;
  const breed = BREED_OF[t.kind];
  const skin = p.golden ? 'golden' : p.speckled ? 'speckled' : null;

  let tick = $state(0);
  ctrl.onchange = () => { tick++; };
  const view = $derived.by(() => { void tick; return ctrl.view(); });
  const free = $derived.by(() => { void tick; return ctrl.stones.filter((s) => !view.placed.includes(s.id)); });
  const placed = $derived.by(() => { void tick; return ctrl.stones.filter((s) => view.placed.includes(s.id)); });
  let flash = $state(t.mode === 'stars-flash');
  let leaving = false;
  let nestEl: HTMLElement | undefined = $state();
  let trayEl: HTMLElement | undefined = $state();

  const stoneEl = (id: string): Element | null => {
    const s = ctrl.stones.find((x) => x.id === id);
    return s && trayEl ? trayEl.querySelector(`[aria-label="stone ${s.value}"]`) : null;
  };

  function showStars(): void {
    if (t.mode !== 'stars-flash') return;
    flash = true;
    void sleep(2000).then(() => { flash = false; });
  }

  async function drop(stoneId: string): Promise<void> {
    const r = await ctrl.place(stoneId);
    if (r === 'solved') await hatch();
  }

  async function hatch(): Promise<void> {
    if (leaving || !ctrl.babyId) return;
    leaving = true;
    moonbeam.clear();
    goal.clear();
    await deps.pause(700);
    await game.go('hatch', { baby: ctrl.babyId, kind: t.kind, skin });
  }

  ctrl.onghost = async (ids) => {
    const from = ids[0] ? stoneEl(ids[0]) : null;
    if (from && nestEl) await ghost.drag(from, nestEl);
  };

  function wrongMove(kind?: string): string[] {
    if (t.stonesNeeded === 2 && view.placed.length === 0) return ctrl.wrongPair() ?? [];
    const low = kind === 'count-low' ? free.find((s) => s.value < t.target) : undefined;
    const high = kind === 'count-high' ? free.find((s) => s.value > t.target) : undefined;
    const id = low?.id ?? high?.id ?? ctrl.wrongId();
    return id ? [id] : [];
  }

  onMount(() => {
    setBands('#cfe8ff', '#8fc79a');
    if (!here) return;
    goal.set(() => ctrl.repeatGoal());
    showStars();
    void (async () => {
      await ctrl.begin();
      if (ctrl.opts.firstEver && !view.solved) {
        // The very first egg: the ghost hand shows how a stone is dragged, with a stone that is not the answer.
        const w = wrongMove()[0];
        const el = w ? stoneEl(w) : null;
        if (el && nestEl) await ghost.drag(el, nestEl);
      }
    })();
    return registerSceneHook('nest', {
      answer: async () => { for (const id of ctrl.answerIds()) await drop(id); return 'ok'; },
      wrong: async (kind?: string) => { let r = 'none'; for (const id of wrongMove(kind)) r = await ctrl.place(id); return r; },
      idle: () => { deps.hints.idle(); },
      target: () => { const id = ctrl.answerIds()[0]; const s = ctrl.stones.find((x) => x.id === id); return s ? `stone ${s.value}` : null; },
    });
  });
  onDestroy(() => { goal.clear(); deps.hints.end(); });
</script>

<section class="nest-scene" aria-label="nest scene">
  <Backdrop id="bg-nest" top="#cfe8ff" bottom="#bfe8c4" />
  <HbGuides />
  <div class="drop" aria-label="nest" bind:this={nestEl} use:dropTarget={{ id: 'nest' }}>
    <span class="nest-pic"><ArtImg id="item-nest" size={400} /></span>
  </div>
  <button class="egg" class:hot={view.mood === 'hot'} class:cold={view.mood === 'cold'} class:solved={view.solved} data-touch aria-label="egg"
    use:press={() => { ctrl.touch(); showStars(); }}>
    <Egg kind={breed} {skin} size={240} wobble={view.solved} cracks={view.solved ? 2 : 0} label="" />
    {#if t.mode === 'stars' || (t.mode === 'stars-flash' && flash)}
      <span class="stars" aria-hidden="true">{#each Array(t.shown) as _, i (i)}<i>★</i>{/each}</span>
    {/if}
  </button>
  {#if view.mood === 'hot'}<span class="steam" aria-hidden="true"></span>{/if}
  {#if view.mood === 'cold'}<span class="frost" aria-hidden="true"></span>{/if}
  {#if t.cups > 0}
    <div class="cups" class:blanket={t.mode === 'blanket'} style:--n={Math.min(t.cups, 10)} aria-hidden="true">
      {#each Array(t.cups) as _, i (i)}<span class="cup" class:warm={i < view.warmNow}></span>{/each}
      {#if t.mode === 'blanket' && !view.solved}<span class="cover"><ArtImg id="item-blanket-cover" size={440} /></span>{/if}
    </div>
  {/if}
  {#if placed.length}
    <div class="placed" aria-hidden="true">
      {#each placed as s (s.id)}<span class="small-stone">{s.value}</span>{/each}
    </div>
  {/if}
  <div class="tray" bind:this={trayEl}>
    <StoneTray stones={free} scaffold={t.scaffold} targets={['nest']} disabled={view.solved}
      ondrop={(value) => { const id = ctrl.stoneOf(value); if (id) void drop(id); }}
      ontap={() => ctrl.touch()} size={stoneFace(t) === 'dots' ? 116 : 108} />
  </div>
</section>

<style>
  .nest-scene { position: absolute; inset: 0; touch-action: none; overflow: hidden; }
  .drop { position: absolute; left: 120px; top: 70px; width: 540px; height: 560px; }
  .nest-pic { position: absolute; left: 70px; top: 160px; }
  .egg { position: absolute; left: 270px; top: 80px; width: 240px; height: 240px; padding: 0; border: 0; background: none; touch-action: none; }
  .egg.hot { animation: shake calc(400ms * var(--speed, 1)) 2; }
  .egg.cold { animation: shiver calc(150ms * var(--speed, 1)) 6; }
  .stars { position: absolute; inset: 70px 50px 50px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; align-content: center;
    font-size: 34px; color: #ffcf3a; text-shadow: 0 0 4px #fff; pointer-events: none; }
  .stars i { font-style: normal; }
  .cups { position: absolute; left: 110px; top: 632px; width: 560px; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
  .cup { width: 84px; height: 58px; border-radius: 10px 10px 40px 40px; background: #d6e4f2; border: 4px solid #8aa4c4; }
  .cup.warm { background: #ffc061; border-color: #c9772a; }
  .cover { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none; }
  .steam, .frost { position: absolute; left: 260px; top: 60px; width: 260px; height: 140px; pointer-events: none; border-radius: 70px;
    animation: fade calc(1600ms * var(--speed, 1)) forwards; }
  .steam { background: radial-gradient(#ffffffcc, #ffffff00 70%); }
  .frost { background: radial-gradient(#dff4ffee, #dff4ff00 70%); }
  .placed { position: absolute; left: 560px; top: 330px; display: flex; gap: 8px; }
  .small-stone { width: 64px; height: 64px; border-radius: 46%; background: #ffc061; border: 4px solid #b9772a; display: grid; place-items: center;
    font: 700 30px 'Andika', sans-serif; color: #3b2a1a; }
  .tray { position: absolute; left: 700px; top: 150px; width: 440px; height: 560px; display: flex; align-items: center; justify-content: center; }
  @keyframes shake { 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
  @keyframes shiver { 50% { transform: translateX(4px); } }
  @keyframes fade { to { opacity: 0; transform: translateY(-40px); } }
</style>
