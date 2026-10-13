<script lang="ts">
  // Feeding at the mangers (docs/v3/next/plan.md 3.7, F5, N20, N21). Mounted by the goodnight stable during its
  // `manger` and `free` stages, as a layer over the stalls. First one checked moment: a hungry baby at its manger
  // (read the wish, give the food) or the hay rack (drag the hay that fills it up). Then free feeding: every baby
  // shows the tray food it wants; the right food makes it munch, another food gets a shake and floats back.
  // Layout and pointer-events follow 3.7: the root takes no pointer events; only the basket drawer, the hay-rack
  // panel, its pile tray, the food tray and the manger drop zones do. Want bubbles never take pointer events.
  import { onDestroy, onMount, untrack } from 'svelte';
  import { game } from '../../game.svelte.ts';
  import { audio } from '../../audio/index.ts';
  import { drag, dropTarget } from '../../platform/input.ts';
  import { sleep } from '../../platform/timing.ts';
  import { hasPicture } from '../../art/manifest.ts';
  import Heap from '../../art/Heap.svelte';
  import PrintWithDots from '../../ui/PrintWithDots.svelte';
  import { buildWish, soundedGraphemes, type WishTask } from '../../core/heartbeat/wish.ts';
  import { foodPool, mangerPlan, mangerWants, withoutLookAlikes } from '../../core/heartbeat/feed.ts';
  import { CARE_OF_TOOL, FOAL_LINE } from '../../core/heartbeat/meadow.ts';
  import type { Served } from '../../core/heartbeat/types.ts';
  import { bridge, liveDeps } from '../heartbeat/deps.ts';
  import { readLadder } from '../heartbeat/learn-bridge.ts';
  import { unitSoundKey } from '../heartbeat/wish.ctrl.ts';
  import { ghost } from '../heartbeat/guides.svelte.ts';
  import ArtImg from '../heartbeat/ArtImg.svelte';
  import { MangerCtrl, TOP_ROW_MAX_Y, WISH_BUBBLE_MIN_W, bubbleBox, chooseSpot } from './manger.ctrl.ts';
  import { RackCtrl } from './rack.ctrl.ts';
  import { feedFlags, feedState } from './flags.ts';
  import { pickTray, trayRng, trayWordMap } from './tray.ts';
  import FoodTray from './FoodTray.svelte';
  import HayRack from './HayRack.svelte';
  import HayChoices from './HayChoices.svelte';
  import Munch from './Munch.svelte';
  import type { MangerFeedProps, MangerSpot } from './types.ts';

  let { spots, onhook, onchecked }: MangerFeedProps = $props();
  const list: MangerSpot[] = untrack(() => [...spots]);

  /** The basket drawer (3.7): the bottom 260 px, or the top 260 px when the hungry baby stands in the bottom row. */
  const DRAWER_H = 260;
  const STAGE_H = 820;

  const wishDeps = liveDeps({ place: 'manger', strand: 'r' });
  const rackDeps = liveDeps({ place: 'manger', strand: 'm' });
  const rng = wishDeps.rng;

  // ---- tonight's checked moment (N20)
  // Only pictured things go in the basket (R13, R62), as in the wish scene.
  const words = new Map([...bridge.words()].map(([k, w]) => [k, w.basket && !hasPicture(w.picture) ? { ...w, basket: false } : w]));
  const sounded = soundedGraphemes(readLadder(bridge.content()), (s) => bridge.stepStatusOf(s));
  const spot = chooseSpot(list);
  const wishBaby = spot ? game.world.byId[spot.baby] ?? null : null;
  const foods = foodPool(words.values());
  const built: { task: WishTask | null } = { task: null };
  const makeFood = (s: Served): boolean => {
    const w = words.get(s.carrier);
    if (!wishBaby || !w?.food) return false;
    built.task = buildWish({
      served: s, baby: wishBaby.id, babyName: wishBaby.name, twinBaby: null, words, bathPond: false, sounded, rng,
      pool: withoutLookAlikes(foods, w.one ?? w.word, rng),
    });
    return built.task !== null && built.task.kind === 'basket';
  };
  /** Test builds: feed.word forces the wish word, served without a planner pick (nothing is logged). */
  const forcedServed = (w: string): Served => ({
    strand: 'r', step: words.get(w)?.one ? 'R19' : 'R05', id: w, carrier: w, items: [], scaffold: 1, probe: false, source: 'current',
  });
  const forced = feedFlags.word && wishBaby && spot ? forcedServed(feedFlags.word) : null;
  const wishServed = forced && makeFood(forced) ? forced : wishBaby && spot ? bridge.serve('manger', rng, makeFood) : null;
  const wishTask = wishServed ? built.task : null;
  const rackPick = list.length ? bridge.rack(rng) : null;
  const plan = list.length ? mangerPlan({ rng, forced: feedFlags.manger, wish: wishTask !== null, rack: rackPick !== null }) : 'none';

  const mctrl = plan === 'wish' && wishTask && spot ? new MangerCtrl(wishTask, spot, wishDeps, (w) => words.get(w), wishBaby?.name ?? null) : null;
  const rctrl = plan === 'rack' && rackPick ? new RackCtrl(rackPick.served, rackDeps) : null;
  const drawerTop = spot !== null && spot.y >= TOP_ROW_MAX_Y;

  let stage = $state<'wish' | 'rack' | 'free' | 'none'>(mctrl ? 'wish' : rctrl ? 'rack' : 'none');
  let tick = $state(0);
  let munchShown = false;
  if (mctrl) {
    mctrl.wish.onchange = () => {
      tick++;
      // The right food: the baby eats it at its manger while the word is said.
      if (mctrl.wish.fed && !munchShown && spot) { munchShown = true; showMunch(spot.order, mctrl.wish.task.word.picture); }
      checkDone();
    };
  }
  if (rctrl) rctrl.onchange = () => { tick++; checkDone(); };

  const wv = $derived.by(() => {
    void tick;
    return mctrl ? { units: mctrl.wish.units, glow: mctrl.wish.glow, done: mctrl.wish.done } : null;
  });
  const rv = $derived.by(() => { void tick; return rctrl ? rctrl.view() : null; });

  // ---- free feeding
  const trayWords = trayWordMap();
  let tray = $state<string[]>([]);
  let wants = $state<Record<number, string>>({});
  let refused = $state<number | null>(null);
  let munch = $state<{ order: number; picture: string; n: number } | null>(null);
  let ended = false;
  let destroyed = false;

  const spotOf = (order: number): MangerSpot | undefined => list.find((s) => s.order === order);
  const orderOf = (targetId: string | null): number | null => (targetId?.startsWith('manger-') ? Number(targetId.slice(7)) : null);

  function showMunch(order: number, picture: string): void {
    const m = { order, picture, n: (munch?.n ?? 0) + 1 };
    munch = m;
    void sleep(1200).then(() => { if (munch === m) munch = null; });
  }

  function checkDone(): void {
    if (ended) return;
    if ((mctrl && mctrl.done) || (rctrl && rctrl.finished)) void endChecked();
  }

  async function endChecked(): Promise<void> {
    if (ended) return;
    ended = true;
    onhook(null);
    await sleep(700);
    if (destroyed) return;
    await startFree();
  }

  /** Free feeding (N20): the tray in the top band (right of the replay button), a want bubble at every manger. */
  async function startFree(): Promise<void> {
    stage = 'free';
    tray = pickTray(trayWords, trayRng(4127));
    wants = tray.length ? mangerWants(list.map((s) => s.order), tray, rng) : {};
    feedState.manger = 'free';
    feedState.drop = null;
    feedState.tray = [...tray];
    syncWants();
    await audio.say('g-feed-free');
    if (!destroyed) onchecked();
  }

  function syncWants(): void {
    feedState.wants = Object.fromEntries(Object.entries(wants).map(([k, v]) => [String(k), v]));
  }

  async function feedFree(word: string, targetId: string): Promise<void> {
    const order = orderOf(targetId);
    const s = order === null ? undefined : spotOf(order);
    if (!s || order === null) return;
    const want = wants[order];
    if (want !== undefined && want !== word) {
      // A gentle shake of the bubble; the food floats back to the tray. Nothing is logged.
      refused = order;
      void sleep(700).then(() => { if (refused === order) refused = null; });
      return;
    }
    if (want !== undefined) {
      const { [order]: _eaten, ...rest } = wants;
      wants = rest;
      syncWants();
    }
    game.dispatch({ type: 'hb.care', baby: s.baby, station: CARE_OF_TOOL.food });
    showMunch(order, trayWords.get(word)?.picture ?? word);
    await audio.sfx('munch');
    await audio.say(FOAL_LINE.treat);
  }

  // ---- the ghost hand for the level 3 hint
  const elOf = (label: string): Element | null => document.querySelector(`[aria-label="${label}"]`);
  if (mctrl) {
    mctrl.wish.onghost = async (key) => {
      const from = elOf(mctrl.wish.itemLabel(key));
      const to = elOf(mctrl.dropLabel);
      if (from && to) await ghost.drag(from, to);
    };
  }
  if (rctrl) {
    rctrl.onghost = async (id) => {
      const from = document.querySelector(`[data-choice="${id}"]`);
      const to = elOf('hay rack');
      if (from && to) await ghost.drag(from, to);
    };
  }

  const playUnit = (g: string): void => { const k = unitSoundKey(g); if (k) void wishDeps.audio.listenSound(k); };
  const heapCount = (): number => {
    const k = wishServed?.pick?.carrier;
    return k && k.kind === 'plural' && k.count >= 3 ? Math.min(5, k.count) : 3;
  };
  /** The wish bubble sizes to its word (the plural ending must show) and stays clear of the replay and Home buttons. */
  let bubbleW = $state(WISH_BUBBLE_MIN_W);
  const bubbleAt = $derived(spot ? bubbleBox(spot, bubbleW, drawerTop) : { left: 0, top: 0, tail: WISH_BUBBLE_MIN_W / 2 });
  /** During the wish only mangers clear of the drawer take drops; in free feeding all of them. */
  const zoneOpen = (s: MangerSpot): boolean => {
    if (stage !== 'wish') return true;
    return drawerTop ? s.y - 50 > DRAWER_H : s.y + 50 < STAGE_H - DRAWER_H;
  };

  onMount(() => {
    if (list.length === 0) { feedState.manger = null; onhook(null); onchecked(); return; }
    void (async () => {
      if (mctrl) {
        feedState.manger = 'wish';
        feedState.drop = mctrl.dropLabel;
        onhook(mctrl.hook());
        await mctrl.begin();
      } else if (rctrl) {
        feedState.manger = 'rack';
        feedState.drop = 'hay rack';
        onhook(rctrl.hook());
        await rctrl.begin();
      } else {
        ended = true;
        onhook(null);
        await startFree();
      }
    })();
  });

  onDestroy(() => {
    destroyed = true;
    if (!ended) onhook(null);
    wishDeps.hints.end();
    rackDeps.hints.end();
    feedState.manger = null;
    feedState.drop = null;
    feedState.wants = {};
    feedState.tray = [];
  });
</script>

<div class="feed" aria-label="mangers">
  {#each list as s (s.order)}
    {#if zoneOpen(s)}
      <span class="zone" class:wishing={stage === 'wish' && spot?.order === s.order && !wv?.done} aria-label="manger {s.order}"
        style:left="{s.x - 60}px" style:top="{s.y - 50}px" use:dropTarget={{ id: `manger-${s.order}` }}></span>
    {/if}
  {/each}

  {#if stage === 'free'}
    {#each list as s (s.order)}
      {@const want = wants[s.order]}
      {#if want}
        <span class="want" class:shake={refused === s.order} aria-hidden="true" style:left="{s.x + 18}px" style:top="{s.y - 176}px">
          <ArtImg id={trayWords.get(want)?.picture || want} size={58} />
          <PrintWithDots text={want} dots={false} size={22} label="" />
        </span>
      {/if}
    {/each}
  {/if}

  {#if munch}
    {@const m = munch}
    {@const s = spotOf(m.order)}
    {#if s}{#key m.n}<Munch picture={m.picture} size={70} left={s.x - 35} top={s.y - 80} />{/key}{/if}
  {/if}

  {#if stage === 'wish' && mctrl && wv && spot}
    <div class="bubble" bind:offsetWidth={bubbleW} style:left="{bubbleAt.left}px" style:top="{bubbleAt.top}px" style:--tail="{bubbleAt.tail}px">
      <PrintWithDots units={wv.units} dotsMs={mctrl.wish.task.dotsMs} glow={wv.glow} label="wish" onsound={playUnit} />
    </div>
    <div class="drawer" class:top={drawerTop}>
      {#each mctrl.wish.task.basket as it (it.key)}
        <button class="item" data-touch aria-label={mctrl.wish.itemLabel(it.key)}
          use:drag={{ data: it.key, disabled: wv.done, onTap: () => void audio.sfx('pop'),
            onDrop: (d) => { const o = orderOf(d.targetId); if (o !== null) void mctrl.give(it.key, o); } }}>
          {#if it.heap}<Heap id={it.picture} count={heapCount()} size={130} seed={it.word.length} label="" />{:else}<ArtImg id={it.picture} size={118} />{/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if stage === 'rack' && rctrl && rv}
    <div class="rack-panel"><HayRack task={rctrl.task} filled={rv.filled} mood={rv.mood} solved={rv.solved} /></div>
    <div class="piles">
      <HayChoices choices={rctrl.choices} scaffold={rctrl.task.scaffold} disabled={rv.solved}
        hidden={rv.solved ? rctrl.answerId() : null} onplace={(id) => void rctrl.place(id)} />
    </div>
  {/if}

  {#if stage === 'free' && tray.length}
    <div class="tray"><FoodTray foods={tray} words={trayWords} size={88} onfeed={(w, t) => void feedFree(w, t)} /></div>
  {/if}
</div>

<style>
  .feed { position: absolute; inset: 0; pointer-events: none; touch-action: none; }
  .zone { position: absolute; width: 120px; height: 100px; border-radius: 30px; pointer-events: auto; }
  .zone.wishing { box-shadow: 0 0 0 5px #ffe08a, 0 0 28px 8px #ffd45e; animation: glow calc(1400ms * var(--speed, 1)) ease-in-out infinite; }
  @keyframes glow { 50% { box-shadow: 0 0 0 5px #ffe08a99, 0 0 16px 4px #ffd45e88; } }
  .bubble { position: absolute; width: max-content; min-width: 284px; display: flex; justify-content: center; pointer-events: auto; }
  .bubble::after { content: ''; position: absolute; left: var(--tail, 50%); bottom: -16px; margin-left: -14px; border: 14px solid transparent; border-top-color: #c9b8ff; border-bottom: 0; }
  .drawer { position: absolute; left: 0; right: 0; bottom: 0; height: 260px; display: flex; gap: 16px; align-items: center; justify-content: center;
    pointer-events: auto; background: linear-gradient(#a8743ccc, #6e4520ee); border-top: 6px solid #5a3818; }
  .drawer.top { top: 0; bottom: auto; border-top: 0; border-bottom: 6px solid #5a3818; }
  .item { display: grid; place-items: center; width: 156px; height: 156px; background: #fffaf0; border: 4px solid #e8b878; border-radius: 30px; touch-action: none; padding: 0; }
  .rack-panel { position: absolute; left: 290px; top: 160px; pointer-events: auto; }
  .piles { position: absolute; left: 190px; right: 190px; top: 590px; padding: 14px 0; border-radius: 30px; pointer-events: auto;
    background: #6e4520dd; border: 5px solid #5a3818; }
  .tray { position: absolute; left: 224px; top: 8px; pointer-events: auto; }
  .want { position: absolute; display: flex; flex-direction: column; align-items: center; padding: 6px 8px 4px; background: #fffaf0; border: 4px solid #c9b8ff;
    border-radius: 24px; pointer-events: none; z-index: 2; }
  .want :global(.print) { padding: 0 2px; min-height: 0; border: 0; background: none; border-radius: 0; }
  .want::after { content: ''; position: absolute; left: 18px; bottom: -14px; border: 12px solid transparent; border-top-color: #c9b8ff; border-bottom: 0; }
  .want.shake { animation: shake calc(500ms * var(--speed, 1)) ease-in-out; }
  @keyframes shake { 20% { transform: translateX(-8px) rotate(-4deg); } 40% { transform: translateX(8px) rotate(4deg); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
</style>
