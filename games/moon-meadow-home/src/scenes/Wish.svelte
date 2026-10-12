<script lang="ts">
  // The wish (spec 2.5): the baby wishes for a printed word. Basket items are dragged to the baby; in a station
  // wish the baby is dragged to a care station. A miss makes the baby do something funny and the print glows.
  import { onDestroy, onMount, untrack } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { drag, dropTarget } from '../platform/input.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import Unicorn from '../art/Unicorn.svelte';
  import Heap from '../art/Heap.svelte';
  import { hasPicture } from '../art/manifest.ts';
  import PrintWithDots from '../ui/PrintWithDots.svelte';
  import { STATIONS, buildWish, printUnits, soundedGraphemes, type WishTask } from '../core/heartbeat/wish.ts';
  import type { Served, StationId } from '../core/heartbeat/types.ts';
  import { SCENE_ART_IDS } from '../types/contracts.ts';
  import { WishCtrl, unitSoundKey } from './heartbeat/wish.ctrl.ts';
  import { readLadder } from './heartbeat/learn-bridge.ts';
  import { bridge, liveDeps } from './heartbeat/deps.ts';
  import { heartbeat, HOME_SCENE } from './heartbeat/flow.svelte.ts';
  import { ghost, goal } from './heartbeat/guides.svelte.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import Backdrop from './heartbeat/Backdrop.svelte';
  import { createHintRunner } from './heartbeat/hint-runner.ts';
  import { foodPool, hungryDue, withoutLookAlikes } from '../core/heartbeat/feed.ts';
  import { feedFlags, feedMemory, feedState } from './feed/flags.ts';
  import Munch from './feed/Munch.svelte';

  let { params }: { params: Record<string, unknown> } = $props();
  const p = untrack(() => params) as { baby: string; then?: string };
  const deps = liveDeps({ place: 'wish', strand: 'r' });
  // Only pictured things go in the basket: a word whose picture is missing is never offered (R13, R62).
  const words = new Map([...bridge.words()].map(([k, w]) => [k, w.basket && !hasPicture(w.picture) ? { ...w, basket: false } : w]));
  const herd = game.world.herd;
  const baby = game.world.byId[p.baby];
  const others = herd.filter((b) => b.id !== p.baby && b.name !== null);
  const twinBaby = others.length ? others[Math.floor(deps.rng() * others.length)].id : null;
  const sounded = soundedGraphemes(readLadder(bridge.content()), (s) => bridge.stepStatusOf(s));
  const built: { task: WishTask | null } = { task: null };
  const make = (s: Served): boolean => {
    built.task = baby ? buildWish({ served: s, baby: baby.id, babyName: baby.name, twinBaby, words, bathPond: game.world.bathPond, sounded, rng: deps.rng }) : null;
    return built.task !== null;
  };
  // A hungry wish (docs/v3/next/plan.md F3, N11): a unicorn food word, and a basket of unicorn foods without look-alikes.
  const foods = foodPool(words.values());
  const makeFood = (s: Served): boolean => {
    const w = words.get(s.carrier);
    if (!baby || !w?.food) return false;
    const pool = withoutLookAlikes(foods, w.one ?? w.word, deps.rng);
    built.task = buildWish({ served: s, baby: baby.id, babyName: baby.name, twinBaby: null, words, bathPond: game.world.bathPond, sounded, rng: deps.rng, pool });
    return built.task !== null && built.task.kind === 'basket';
  };
  const firstWish = p.then === 'heartbeat';
  const wantHungry = !!baby && firstWish && hungryDue({ rng: deps.rng, forced: feedFlags.hungry, lastWasHungry: feedMemory.lastWasHungry });
  const fed = wantHungry ? bridge.serve('feed', deps.rng, makeFood, { firstWish: true }) : null;
  const hungry = fed !== null && built.task !== null;
  // Review focus 5: a wish that cannot fill its basket is never shown; the planner's accept filter refuses it.
  const served: Served | null = hungry ? fed : baby ? bridge.serve('wish', deps.rng, make, { firstWish }) : null;
  if (firstWish) feedMemory.lastWasHungry = hungry;
  // A hungry wish's idle hints are logged at the feeding place.
  if (hungry) deps.hints = createHintRunner({ place: 'feed', strand: 'r' });
  const ctrl: WishCtrl | null = served && built.task
    ? new WishCtrl(built.task, deps, (w) => words.get(w), hungry ? { intro: 'hungry', place: 'feed', name: baby?.name ?? null } : {})
    : null;
  feedState.wish = ctrl ? (hungry ? 'hungry' : 'plain') : null;

  let tick = $state(0);
  if (ctrl) ctrl.onchange = () => { tick++; };
  const v = $derived.by(() => {
    void tick;
    return ctrl ? { part: ctrl.part, funny: ctrl.lastFunny, glow: ctrl.glow, done: ctrl.done, fed: ctrl.fed, units: ctrl.units, display: ctrl.display, babyId: ctrl.current.baby } : null;
  });
  const who = $derived(v ? game.world.byId[v.babyId] ?? baby : baby);
  const stations = STATIONS.filter((s) => s !== 'bath' || game.world.bathPond);
  const STATION_ART: Record<StationId, string> = {
    hay: SCENE_ART_IDS.stationHay, brush: SCENE_ART_IDS.stationBrush, hat: SCENE_ART_IDS.stationHat,
    nap: SCENE_ART_IDS.stationNap, swing: SCENE_ART_IDS.stationSwing, bath: SCENE_ART_IDS.stationBath,
  };
  const heapCount = (): number => {
    const k = served?.pick?.carrier;
    return k && k.kind === 'plural' && k.count >= 3 ? Math.min(5, k.count) : 3;
  };
  let funnyClass = $state('');
  let babyEl: HTMLElement | undefined = $state();
  let printEl: HTMLElement | undefined = $state();
  let basketEl: HTMLElement | undefined = $state();
  let leaving = false;

  $effect(() => {
    const f = v?.funny;
    if (!f) return;
    funnyClass = `funny-${f}`;
    void sleep(1600).then(() => { funnyClass = ''; });
  });
  $effect(() => { if (v?.done) void finish(); });

  async function finish(): Promise<void> {
    if (leaving) return;
    leaving = true;
    goal.clear();
    await sleep(900);
    if (p.then === 'heartbeat') await heartbeat.wishDone();
    else await game.go(p.then ?? HOME_SCENE);
  }

  const elOf = (label: string): Element | null => document.querySelector(`[aria-label="${label}"]`);
  if (ctrl) {
    ctrl.onghost = async (key) => {
      if (ctrl.task.kind === 'station') { const to = elOf(`station ${key}`); if (babyEl && to) await ghost.drag(babyEl, to); return; }
      const from = elOf(ctrl.itemLabel(key));
      if (from && babyEl) await ghost.drag(from, babyEl);
    };
  }

  const playUnit = (g: string): void => { const k = unitSoundKey(g); if (k) void deps.audio.listenSound(k); };

  onMount(() => {
    setBands('#cfe8ff', '#8fc79a');
    if (!ctrl) { void finish(); return; }   // nothing servable: skip the wish quietly
    goal.set(() => deps.audio.say(hungry ? 'g-hungry' : 'g-wish'));
    void (async () => {
      await ctrl.begin();
      // The very first wish: the ghost hand slides along the print, to show that the letters sing.
      if (herd.length <= 1 && printEl) {
        const units = printEl.querySelectorAll('.unit');
        const a = units[0];
        const b = units[units.length - 1];
        if (a && b) await ghost.drag(a, b);
      }
    })();
    return registerSceneHook('wish', {
      answer: async () => {
        let r = 'none';
        for (let i = 0; i < 2 && !ctrl.done; i++) { const k = ctrl.answerKey(); if (!k) break; r = await ctrl.act(k); }
        return r;
      },
      wrong: async (kind?: string) => { const k = ctrl.wrongKey(kind); return k ? ctrl.act(k) : 'none'; },
      idle: () => { deps.hints.idle(); },
      target: () => ctrl.answerLabel(),
    });
  });
  onDestroy(() => { goal.clear(); deps.hints.end(); });
</script>

{#if ctrl && v && who}
  <section class="wish" aria-label="wish scene">
    <Backdrop id="bg-meadow" top="#cfe8ff" bottom="#bfe8c4" />
    <HbGuides />
    <div class="bubble" bind:this={printEl}>
      {#key v.part}
        {#each v.display as w (w)}
          {@const e = words.get(w)}
          {#if e}<PrintWithDots units={printUnits(e.gr, () => false)} heart={e.heart} dotsMs={ctrl.task.dotsMs} label="word {w}" onsound={playUnit} />{/if}
        {/each}
        <PrintWithDots units={v.units} dotsMs={ctrl.task.dotsMs} glow={v.glow} label="wish" onsound={playUnit} />
      {/key}
    </div>
    <div class="baby {funnyClass}" class:hungry={hungry && !v.fed} bind:this={babyEl} data-touch aria-label="wishing baby" use:dropTarget={{ id: 'baby' }}
      use:drag={{ data: 'baby', disabled: ctrl.task.kind !== 'station' || v.done,
        onDrop: (d) => { if (d.targetId?.startsWith('station-')) void ctrl.toStation(d.targetId.slice(8) as StationId); } }}>
      <Unicorn breed={who.breed} stage={who.stage} colours={who.colours} traits={who.traits} height={250} pose={v.done || v.fed ? 'happy' : 'idle'} label="" />
      {#if v.fed}<Munch picture={ctrl.task.word.picture} size={84} left={228} top={82} />{/if}
    </div>
    {#if ctrl.task.kind !== 'station'}
      <div class="basket basket-{ctrl.task.basket.length}" bind:this={basketEl}>
        {#each ctrl.task.basket as it (it.key)}
          <button class="item" data-touch aria-label={ctrl.itemLabel(it.key)}
            use:drag={{ data: it.key, disabled: v.done, onTap: () => void deps.audio.sfx('pop'), onDrop: (d) => { if (d.targetId === 'baby') void ctrl.give(it.key); } }}>
            {#if it.heap}<Heap id={it.picture} count={heapCount()} size={150} seed={it.word.length} label="" />{:else}<ArtImg id={it.picture} size={130} />{/if}
          </button>
        {/each}
      </div>
    {/if}
    <div class="stations">
      {#each stations as s (s)}
        <span class="station" data-touch aria-label="station {s}" use:dropTarget={{ id: `station-${s}` }}><ArtImg id={STATION_ART[s]} size={124} /></span>
      {/each}
    </div>
  </section>
{/if}

<style>
  .wish { position: absolute; inset: 0; touch-action: none; overflow: hidden; }
  .bubble { position: absolute; left: 60px; top: 110px; display: flex; gap: 18px; align-items: flex-end; flex-wrap: wrap; max-width: 520px; }
  .baby { position: absolute; left: 90px; top: 280px; width: 320px; height: 280px; display: flex; align-items: flex-end; justify-content: center; touch-action: none; }
  .basket { position: absolute; left: 540px; top: 110px; width: 600px; display: grid; grid-template-columns: repeat(3, 176px); gap: 18px; justify-content: center; }
  .basket-4 { grid-template-columns: repeat(2, 176px); }
  .item { display: grid; place-items: center; width: 176px; height: 176px; background: #fffaf0; border: 4px solid #e8b878; border-radius: 32px; touch-action: none; padding: 0; }
  .stations { position: absolute; left: 40px; right: 40px; bottom: 18px; display: flex; justify-content: space-around; }
  .station { width: 140px; height: 140px; display: grid; place-items: center; }
  /* A hungry baby's soft tummy wobble (no text, no timer). */
  .baby.hungry { animation: tummy calc(1800ms * var(--speed, 1)) ease-in-out infinite; transform-origin: 50% 100%; }
  @keyframes tummy { 0%, 60%, 100% { transform: none; } 70% { transform: scaleX(1.03) rotate(-2deg); } 80% { transform: scaleX(1.03) rotate(2deg); } 90% { transform: scaleX(1.02) rotate(-1deg); } }
  .funny-one-for-many { animation: pat calc(400ms * var(--speed, 1)) 4; }
  .funny-heap-for-one { animation: topple calc(1200ms * var(--speed, 1)) ease-in-out; }
  .funny-wrong-thing { animation: tilt calc(500ms * var(--speed, 1)) 2; }
  .funny-wrong-station { animation: swing calc(800ms * var(--speed, 1)) 2; }
  @keyframes pat { 50% { transform: translateY(-10px) rotate(-6deg); } }
  @keyframes topple { 60% { transform: rotate(-14deg); } }
  @keyframes tilt { 50% { transform: rotate(10deg); } }
  @keyframes swing { 50% { transform: translateX(30px) rotate(8deg); } }
</style>
