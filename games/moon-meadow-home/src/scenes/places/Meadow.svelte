<script lang="ts">
  // The meadow hub (Task A7, spec 2.4 and 2.5): places at the edges, heartbeat's meadow life in the middle
  // (nest, babies, care tools), who's-waiting bubbles, the crown, replay, the moon and the parent button.
  // On arrival a due opening speaks first, then a returning herd runs up and Lumi says hello, and the goal is
  // the egg in the nest: the moonbeam on the nest, the goal again when she is idle, then one ghost tap (R54).
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import Picture from '../../art/Picture.svelte';
  import { artUrl, background } from '../../art/manifest.ts';
  import MeadowLife from '../heartbeat/MeadowLife.svelte';
  import { heartbeat } from '../heartbeat/flow.svelte.ts';
  import Bubble from '../../ui/Bubble.svelte';
  import Crown from '../../ui/Crown.svelte';
  import ReplayButton from '../../ui/ReplayButton.svelte';
  import PinGate from '../../parent/PinGate.svelte';
  import { press } from '../../platform/input.ts';
  import { setBands } from '../../platform/stage.svelte.ts';
  import { registerSceneHook } from '../../platform/hooks.ts';
  import { loaderFor } from '../../platform/registry.ts';
  import { timing } from '../../platform/timing.ts';
  import { ghost } from '../../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../../ui/moonbeam.svelte.ts';
  import { findByLabel } from '../../ui/targets.ts';
  import { fallbackFor, svg } from '../../ui/places-svg.ts';
  import { audio, type SpeakId } from '../../audio/index.ts';
  import { game } from '../../game.svelte.ts';
  import { moonHintDue } from '../../core/heartbeat/flow.ts';
  import { arrivalPlan, bubbleSpot, LITE_KEY, LITE_WINDOW_MS, liteFromFrames, meadowEdges, type Edge } from '../../core/places/meadow.ts';
  import { bubbleCandidates, bubblePlace, pickBubbles, type BubbleCandidate } from '../../core/places/bubbles.ts';
  import { isAnnounced, openingDefs, openingDue } from '../../core/places/openings.ts';
  import { CURRENT_RELEASE } from '../../core/places/content.ts';
  import type { PlacesState } from '../../core/places/state.ts';
  import { canServeSlot, visitPlan } from '../../places/plan.ts';
  import { registerMeadow } from '../../places/hook.ts';
  import { enterPlace } from '../../places/nav.ts';
  import { noteTouch, once } from '../../places/session.ts';

  let {}: { params?: Record<string, unknown> } = $props();

  const say = (ids: readonly string[]) => audio.sayAll(ids as SpeakId[]);
  const bg = background('bg-meadow');
  // The places slice is folded in place, so these read game.version to follow every fold.
  const edges = $derived.by(() => {
    void game.version;
    return meadowEdges({ places: game.world.places as unknown as PlacesState, release: CURRENT_RELEASE });
  });
  const ready = $derived.by(() => { void game.version; return readyPlotsNow(); });

  // ---- v2 gifts stand in the meadow as decorations (R57)
  const GIFT_SPOTS: [number, number][] = [[352, 128], [426, 150], [500, 128], [948, 126], [1010, 150], [994, 744], [1080, 744], [30, 236]];
  const gifts = $derived.by(() => {
    void game.version;
    return ((game.state.cosmetics as { v2Gifts?: string[] }).v2Gifts ?? []).slice(-GIFT_SPOTS.length);
  });

  // ---- lite unicorns on a slow iPad (R63)
  function storedLite(): boolean | null {
    try {
      const v = localStorage.getItem(LITE_KEY);
      return v === '1' ? true : v === '0' ? false : null;
    } catch { return null; }
  }
  const stored = storedLite();
  let lite = $state(stored === true);
  let measuring = 0;
  function measureFrames(): void {
    if (stored !== null || typeof requestAnimationFrame !== 'function') return;
    const frames: number[] = [];
    let last = 0;
    let first = 0;
    const step = (t: number) => {
      if (!first) first = t;
      else frames.push(t - last);
      last = t;
      if (t - first < LITE_WINDOW_MS) { measuring = requestAnimationFrame(step); return; }
      measuring = 0;
      const slow = liteFromFrames(frames);
      if (frames.length >= 10) {
        try { localStorage.setItem(LITE_KEY, slow ? '1' : '0'); } catch { /* storage blocked */ }
      }
      if (slow) lite = true;
    };
    measuring = requestAnimationFrame(step);
  }

  // ---- bubbles
  /** Ready Building Days (Task A13 replaces this with the real selector). */
  function readyPlotsNow(): string[] {
    return [];
  }
  /** Open free-play places a play bubble may point at. */
  function freePlayNow(): string[] {
    return edges.filter((e) => e.state === 'open' && (e.id === 'bath-pond' || e.id === 'dressing' || e.id === 'salon')).map((e) => e.id);
  }
  function computeBubbles(): BubbleCandidate[] {
    try {
      const plan = visitPlan();
      const candidates = bubbleCandidates({
        herd: game.world.herd, canServe: canServeSlot, postWaiting: false, cousinWaiting: null, jewelPlot: null,
        readyPlots: readyPlotsNow(), freePlay: freePlayNow(), rng: game.rng,
      });
      return pickBubbles({
        candidates, practised: plan.practised, explained: isAnnounced(game.world, 'bubbles'),
        afterThirty: plan.moments >= 30, labelForced: plan.labelForced,
      });
    } catch (e) {
      console.warn('[meadow] no bubbles', e);
      return [];
    }
  }
  let bubbles = $state<BubbleCandidate[]>(untrack(() => computeBubbles()));
  const BUBBLE_PICTURE: Record<string, string> = {
    wish: 'item-wish-basket', asking: 'item-wish-basket', 'two-state': 'item-wish-basket', label: 'item-jar',
    post: 'envelope', cousin: 'bow', jewel: 'jewel-letter', hammer: 'hammer',
  };
  const bubblePicture = (b: BubbleCandidate): string =>
    BUBBLE_PICTURE[b.kind] ?? edges.find((e) => e.id === b.place)?.picture ?? 'bubble';
  const placed = $derived(bubbles.map((b, i) => ({ b, ...bubbleSpot(b.place, i) })));

  function tapBubble(b: BubbleCandidate): void {
    if (left) return;
    if ((b.kind === 'wish' || b.kind === 'asking' || b.kind === 'two-state') && b.baby) {
      heartbeat.noteOtherActivity();
      void heartbeat.startWish(b.baby);
      return;
    }
    const to = bubblePlace(b);
    void enterPlace(to.scene, to.params);
  }
  const EDGE_SVG: Partial<Record<Edge['id'], string>> = { 'toy-shelf': svg('shelf'), stables: svg('gate'), map: svg('map-scroll') };
  const edgeFallback = (e: Edge): string => EDGE_SVG[e.id] ?? fallbackFor(e.picture);
  function tapEdge(e: Edge): void {
    if (left) return;
    heartbeat.noteOtherActivity();
    void enterPlace(e.scene, e.params);
  }

  // ---- arrival, the egg goal and its hint ladder (R54)
  let left = false;
  let running = $state(false);
  let opening = $state<string | null>(null);
  let goalLines: string[] = ['g-egg-waiting'];
  let eggGoal = false;
  let ladder = 0;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const IDLE_MS = 10_000;

  const nest = () => findByLabel('nest');
  function hatchesThisVisit(): number {
    const list = game.state?.visits.list ?? [];
    const start = list.length ? list[list.length - 1].start : 0;
    return game.world.herd.filter((b) => b.source === 'nest' && b.hatchedAt >= start).length;
  }
  function ghostTarget(id: string | null): Element | null {
    if (!id) return null;
    if (id === 'bubble') return document.querySelector('[aria-label^="bubble "]');
    return findByLabel(id);
  }

  function clearIdle(): void {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  }
  function armIdle(): void {
    clearIdle();
    if (left || !eggGoal || ladder >= 2 || timing.speed === 0) return;
    idleTimer = setTimeout(() => void idleStep(), IDLE_MS);
  }
  /** Idle once: the goal again. Idle twice: the ghost hand taps the nest, and the ladder ends. */
  async function idleStep(): Promise<void> {
    if (left || !eggGoal || ladder >= 2) return;
    ladder += 1;
    const n = nest();
    if (n) moonbeam.show(n);
    if (ladder === 1) await say(goalLines.slice(-1));
    else if (n) await ghost.tap(n);
    armIdle();
  }
  function activity(): void {
    if (eggGoal && ladder < 2) armIdle();
  }

  async function arrive(): Promise<void> {
    const w = game.world;
    const first = once('meadow-arrival');
    let due: string | null = null;
    try { due = openingDue(game.state, w); } catch (e) { console.warn('[meadow] opening', e); }
    const plan = arrivalPlan({
      visitIndex: w.visitIndex, arrivedThisVisit: !first, openingDue: due,
      moonHint: moonHintDue({ visitIndex: w.visitIndex, hatchesThisVisit: hatchesThisVisit(), announced: w.announced }),
    });
    eggGoal = plan.eggGoal;
    goalLines = plan.lines.length ? plan.lines : ['g-egg-waiting'];
    running = plan.greet;
    // Speech starts before the first await, so the goal is said the moment the meadow is on screen.
    const all = [...plan.openingLines, ...plan.lines];
    const speech = all.length ? say(plan.openingLines.length ? plan.openingLines : plan.lines) : Promise.resolve();
    if (plan.opening) {
      opening = plan.opening;
      game.dispatch({ type: 'place/announce', opening: plan.opening });
      bubbles = computeBubbles();
      await tick();
      const def = openingDefs.find((d) => d.id === plan.opening);
      const t = ghostTarget(def?.ghost ?? null);
      if (t) { moonbeam.show(t); void ghost.tap(t); }
      await speech;
      if (left) return;
      ghost.hide();
      if (plan.lines.length) {
        const n = nest();
        if (n) moonbeam.show(n);
        await say(plan.lines);
      }
    } else {
      await tick();
      const n = eggGoal ? nest() : null;
      if (n) moonbeam.show(n);
      // R51: no clip for the goal, so she sees it at once.
      if (n && eggGoal && !audio.hasClip('g-egg-waiting')) { ladder = 1; void ghost.tap(n); }
      await speech;
    }
    if (left) return;
    running = false;
    armIdle();
  }

  function replayArrival(): void {
    if (opening) {
      const def = openingDefs.find((d) => d.id === opening);
      void say(def?.lines ?? []);
    } else void say(goalLines.slice(-1));
    activity();
  }

  /** The Home Book opens from the crown once it exists (Task B9); until then the crown only sparkles. */
  function crown(): void {
    if (left) return;
    if (loaderFor('home-book')) void enterPlace('home-book');
    else void audio.sfx('sparkle');
  }

  // ---- the moon: bedtime
  function moon(): void {
    if (left) return;
    void heartbeat.startGoodnight();
  }

  let unhook: (() => void) | null = null;
  onMount(() => {
    setBands('#bfe3ff', '#9bd27f');
    registerMeadow({
      bubbles: () => bubbles.map((b) => ({ kind: b.kind, place: b.place })),
      tapBubble: (kind: string) => { const b = bubbles.find((x) => x.kind === kind); if (b) tapBubble(b); },
      opening: () => opening,
      edges: () => edges.map((e) => `${e.id}:${e.state}`),
      lite: () => lite,
    });
    unhook = registerSceneHook('meadow', {
      // The meadow has no checked moment: its goal is a tap on the nest, which a flow makes for real (target).
      answer: () => undefined,
      wrong: () => undefined,
      idle: () => { if (eggGoal) void idleStep(); },
      target: () => (eggGoal ? 'nest' : null),
    });
    window.addEventListener('pointerdown', activity, true);
    measureFrames();
    void arrive();
  });
  onDestroy(() => {
    left = true;
    clearIdle();
    if (measuring && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(measuring);
    if (typeof window !== 'undefined') window.removeEventListener('pointerdown', activity, true);
    unhook?.();
    registerMeadow(null);
    moonbeam.clear();
    ghost.hide();
  });
</script>

<div class="meadow" aria-label="meadow" style:background-image={bg ? `url(${artUrl(bg.src)})` : undefined} class:fallback={!bg}>
  {#each gifts as g, i (i)}
    <span class="gift" style:left="{GIFT_SPOTS[i][0]}px" style:top="{GIFT_SPOTS[i][1]}px" aria-hidden="true">
      <Picture id={g} size={64} label="">
        <span class="svg64">{@html fallbackFor(`gift-${g}`)}</span>
      </Picture>
    </span>
  {/each}

  {#each edges as e (e.id)}
    <button class="edge" class:plot={e.state === 'plot'} aria-label={e.id} data-touch
      style:left="{e.x}px" style:top="{e.y}px" style:width="{e.w}px" style:height="{e.h}px"
      use:press={() => tapEdge(e)}>
      {#if e.state === 'plot'}
        <span class="sign">{@html svg('plot-sign')}</span>
        {#if ready.includes(String(e.params.plot))}<span class="hammer">{@html svg('hammer')}</span>{/if}
      {:else}
        <Picture id={e.picture} size={Math.min(e.w, e.h)} label="">
          <span class="svg-fit" style:width="{Math.min(e.w, e.h)}px" style:height="{Math.min(e.w, e.h)}px">{@html edgeFallback(e)}</span>
        </Picture>
      {/if}
    </button>
  {/each}

  <div class="life" class:running>
    <MeadowLife onbabytouch={noteTouch} {lite} />
  </div>

  {#each placed as p (p.b.key)}
    <Bubble kind={p.b.kind} x={p.x} y={p.y} picture={bubblePicture(p.b)}
      babyFace={p.b.baby ? game.world.byId[p.b.baby] ?? null : null} ontap={() => tapBubble(p.b)} />
  {/each}

  <Crown ontap={crown} />
  <ReplayButton onreplay={replayArrival} />
  <button class="moon" aria-label="moon" data-touch use:press={moon}>
    <Picture id="item-moon" size={80} label="">
      <span class="svg-fit" style:width="80px" style:height="80px">{@html svg('moon')}</span>
    </Picture>
  </button>
  <PinGate />
</div>

<style>
  .meadow { position: absolute; inset: 0; overflow: hidden; background-size: cover; background-position: center; }
  .meadow.fallback { background: linear-gradient(#bfe3ff 0 180px, #cfeec3 180px, #9bd27f); }
  .gift { position: absolute; width: 64px; height: 64px; pointer-events: none; }
  .svg64, .svg64 :global(svg) { display: block; width: 64px; height: 64px; }
  .svg-fit { display: block; }
  .svg-fit :global(svg) { display: block; width: 100%; height: 100%; }
  .edge { position: absolute; padding: 0; border: 0; background: none; display: grid; place-items: center; touch-action: none; }
  .edge.plot { border: 4px dashed #d9b98a; border-radius: 22px; background: #fff8e855; }
  .edge .sign, .edge .sign :global(svg) { display: block; width: 80px; height: 80px; pointer-events: none; }
  .edge .hammer { position: absolute; right: -10px; top: -14px; width: 56px; height: 56px; pointer-events: none;
    animation: knock calc(900ms * var(--speed, 1)) ease-in-out infinite; }
  .edge .hammer :global(svg) { width: 56px; height: 56px; }
  .edge:global(.press-down) { transform: scale(0.95); }
  .life { position: absolute; inset: 0; pointer-events: none; }
  /* MeadowLife turns pointer events on for all its children, which makes the full-stage moonflower layer swallow
     taps on the edges under it. The flowers are decoration only. */
  .life :global(.flowers) { pointer-events: none; }
  .life.running :global(.baby) { animation: run-up calc(1200ms * var(--speed, 1)) ease-out both; }
  .moon { position: absolute; left: 912px; top: 20px; width: 88px; height: 88px; z-index: 950; padding: 0; border: 0;
    background: none; display: grid; place-items: center; touch-action: none; }
  .moon:global(.press-down) { transform: scale(0.94); }
  @keyframes knock { 50% { transform: rotate(-18deg); } }
  /* The returning herd runs up from the back of the meadow to the front. */
  @keyframes run-up {
    from { transform: translate(-50%, calc(-50% - 160px)) scale(0.7); opacity: 0; }
    30% { opacity: 1; }
    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
</style>
