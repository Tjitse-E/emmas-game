<script lang="ts">
  // Goodnight (spec 2.7, 3.7; docs/v3/next/plan.md section 8): the lantern walk at dusk (read the name on the
  // lantern, lead that baby along the glowing path to the stable gate), the rest of the herd trots in, the babies
  // eat at their mangers (lane feed's MangerFeed), she taps the moon when it is bedtime, the babies lie down, the
  // door pick and tucking in, the window opens the sky with the herd count and a sky unicorn to name, then Lumi
  // says goodnight and the visit ends on the rest scene (R45).
  import { onDestroy, onMount } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { audio } from '../audio/index.ts';
  import { clock } from '../platform/clock.ts';
  import { press } from '../platform/input.ts';
  import { registerHook, registerSceneHook } from '../platform/hooks.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import { findByLabel } from '../ui/targets.ts';
  import { stableLayout } from '../core/heartbeat/stables.ts';
  import { rollCallCount } from '../core/heartbeat/rollcall.ts';
  import { duskBabies, mangerDue, pickWalk, stableRowOf, walkRow } from '../core/heartbeat/walk.ts';
  import { skyState } from '../core/heartbeat/sky.ts';
  import { GoodnightCtrl, type GoodnightStage } from './heartbeat/goodnight.ctrl.ts';
  import { servedFromPick } from './heartbeat/learn-bridge.ts';
  import { bridge, liveDeps } from './heartbeat/deps.ts';
  import { ghost, goal, moonbeam } from './heartbeat/guides.svelte.ts';
  import type { Named } from './heartbeat/naming.ctrl.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import MangerFeed from './feed/MangerFeed.svelte';
  import type { MangerSpot, StageHook } from './feed/types.ts';
  import DuskMeadow from './goodnight/DuskMeadow.svelte';
  import StableRow from './goodnight/StableRow.svelte';
  import SkyStage from './goodnight/SkyStage.svelte';
  import { mangerOf } from './goodnight/geometry.ts';
  import { nightFlags } from './goodnight/flags.ts';

  let { params: _params }: { params: Record<string, unknown> } = $props();
  const deps = liveDeps({ place: 'goodnight', strand: 'name' });
  const w = game.world;
  const byId = w.byId;
  const layout = stableLayout(w.herd, w.rowsBuilt);
  const names = new Map(w.herd.map((b) => [b.id, b.name]));
  // Learning applies spec 3.7: names she can decode or has read before, with a clip, due first.
  const review = new Set(bridge.nameReviewIds(w.herd.map((b) => ({ id: b.id, name: b.name, gems: b.gems, listName: b.listName })), 6, deps.rng));
  const isDue = (id: string) => review.has(id);
  const row = walkRow({ layout, names, eligible: isDue, isDue });
  const count = rollCallCount({ visitIndex: w.visitIndex, checkedThisVisit: bridge.checkedCount(), due: review.size });
  const picks = row !== null ? pickWalk({ layout, row, names, count, eligible: isDue, isDue, rng: deps.rng }) : [];
  const dusk = duskBabies(layout, row, w.herd);
  const shownRow = stableRowOf(layout, row, w.herd);
  const rowDoors = layout.rows[shownRow - 1] ?? [];
  const stalls = rowDoors.filter((d) => d.baby).map((d) => ({ baby: d.baby!, door: d.number }));
  const rowSet = new Set(stalls.map((s) => s.door));
  // The door pick of the bed stage: a door of the row on screen, three babies there at least (spec 3.7).
  const doorServed = stalls.length >= 3
    ? bridge.serve('rollcall-door', deps.rng, (s) => rowSet.has(Number(s.id.split(':')[2])), { doors: { built: w.rowsBuilt * 10, own: null } })
    : null;
  const doorNo = doorServed ? Number(doorServed.id.split(':')[2]) : null;
  const doorPick = doorNo !== null ? stalls.find((s) => s.door === doorNo) ?? null : null;
  const visits = game.state?.visits.list ?? [];
  const visitStart = visits.length ? visits[visits.length - 1].start : clock.now();
  const due = mangerDue({ checked: bridge.checkedCount(), visitMs: Math.max(0, clock.now() - visitStart), forcedLong: nightFlags.long });
  const ctrl = new GoodnightCtrl({
    herdCount: w.herd.length, skyNames: w.skyNames,
    walk: dusk.length ? {
      picks, heads: new Set(dusk), dusk, doorOf: (b) => byId[b]?.order ?? 0,
      nameServed: (baby, name) => servedFromPick(bridge.namePick({ id: baby, name }), new Map()) ?? null,
    } : null,
    stable: { doorPick: doorPick ? { baby: doorPick.baby, number: doorPick.door } : null, doorServed: doorPick ? doorServed : null, babies: stalls },
    mangers: due && stalls.length > 0, long: !due,
  }, deps);

  let tick = $state(0);
  ctrl.onchange = () => { tick++; };
  const v = $derived.by(() => {
    void tick;
    const wk = ctrl.walk;
    return {
      stage: ctrl.stage, inside: ctrl.inside, windowShown: ctrl.windowShown, count: ctrl.showCount,
      pick: wk?.pick ?? null, heads: new Set(wk?.heads ?? []), led: [...(wk?.led ?? [])], nudged: wk?.nudged ?? null, refused: wk?.refused ?? null,
      doorOpen: ctrl.stable.doorOpen, closed: ctrl.stable.closed, poked: ctrl.stable.poked, tucked: new Set(ctrl.stable.tucked),
    };
  });
  const duskList = dusk.map((id) => byId[id]).filter((b) => !!b);
  const camp = layout.camp.map((id) => byId[id]).filter((b) => !!b);
  /** Walked babies first, then by door: top row before bottom row (plan 3.7). */
  const spots = $derived.by((): MangerSpot[] => {
    const led = v.led;
    const all = rowDoors.map((d, i) => ({ d, i })).filter((x) => x.d.baby);
    const rank = (b: string) => { const k = led.indexOf(b); return k < 0 ? Infinity : k; };
    return all.sort((a, b) => rank(a.d.baby!) - rank(b.d.baby!) || a.d.number - b.d.number)
      .map(({ d, i }) => ({ baby: d.baby!, order: d.number, ...mangerOf(i) }));
  });
  const order = $derived([...v.led, ...stalls.map((s) => s.baby).filter((b) => !v.led.includes(b))]);
  const sky = skyState(w.herd.length, w.skyNames);
  let feedHook: StageHook | null = null;
  let naming = $state<number | null>(null);
  let talking = $state(false);
  let ended = false;

  const stableStage = $derived<'herd-in' | 'manger' | 'free' | 'bed' | null>(
    v.stage === 'herd-in' ? (v.inside ? 'herd-in' : null) : v.stage === 'manger' || v.stage === 'free' || v.stage === 'bed' ? v.stage : null,
  );
  const outside = $derived(v.stage === 'walk' || (v.stage === 'herd-in' && !v.inside));

  async function end(): Promise<void> {
    if (ended) return;
    ended = true;
    await ctrl.bye();
    await sleep(800);
    game.endVisit('goodnight');
  }

  let skyStarted = false;
  async function afterBed(): Promise<void> {
    if (skyStarted) return;
    skyStarted = true;
    await sleep(400);
    const next = await ctrl.sky();
    if (next !== null) { naming = next; return; }
    await end();
  }
  $effect(() => { if (v.stage === 'sky') void afterBed(); });

  async function skyNamed(n: Named): Promise<void> {
    if (naming === null) return;
    ctrl.skyNamed(naming, n);
    naming = null;
    await end();
  }

  const BANDS: Record<string, [string, string]> = {
    walk: ['#e9a27a', '#3b4a3e'], 'herd-in': ['#3a2a1e', '#2a1e16'], manger: ['#3a2a1e', '#2a1e16'], free: ['#3a2a1e', '#2a1e16'],
    bed: ['#20160f', '#140e0a'], sky: ['#1d1b4f', '#2c4a3e'], 'sky-name': ['#1d1b4f', '#2c4a3e'], bye: ['#1d1b4f', '#2c4a3e'],
  };
  $effect(() => {
    const k = v.stage === 'herd-in' && !v.inside ? 'walk' : v.stage;
    const [top, bottom] = BANDS[k] ?? BANDS.sky;
    setBands(top, bottom);
  });

  const doorOf = (b: string) => byId[b]?.order ?? 0;
  /** What the replay button says again in each stage. */
  async function replay(): Promise<void> {
    switch (ctrl.stage) {
      case 'walk': await audio.say(ctrl.walk?.free ? 'g-lead-free' : 'g-lantern-walk'); break;
      case 'free': await audio.say('g-moon'); break;
      case 'bed': if (ctrl.stable.doorPick && ctrl.stable.doorOpen) await audio.say(`num-door-bed-${ctrl.stable.doorPick.number}`); else if (ctrl.windowShown) await audio.say('g-window'); break;
      default: break;
    }
  }

  function hookTarget(): string | null {
    switch (ctrl.stage) {
      case 'walk': return ctrl.walk?.target() ?? null;
      case 'manger': return feedHook?.target() ?? null;
      case 'free': return 'moon';
      case 'bed': { const n = ctrl.stable.answerStall(); return n !== null ? `stall ${n}` : ctrl.windowShown ? 'window' : null; }
      default: return null;
    }
  }

  onMount(() => {
    const stopTalk = audio.onTalk((id) => { talking = !!id && id.startsWith('lumi-'); });
    goal.set(replay);
    if (ctrl.walk) {
      ctrl.walk.onghost = async (b) => {
        const from = findByLabel(`walk baby ${doorOf(b)}`);
        const to = findByLabel('stable gate');
        if (from && to) await ghost.drag(from, to, 1);
      };
    }
    ctrl.onghost = async (label) => { const el = findByLabel(label); if (el) await ghost.tap(el, 1); };
    ctrl.onbeam = (label) => { const el = findByLabel(label); if (el) moonbeam.show(el); };
    void ctrl.start();
    const offs = [
      registerSceneHook('goodnight', {
        answer: async () => {
          switch (ctrl.stage) {
            case 'walk': { const b = ctrl.walk?.rightBaby(); return b ? ctrl.walk!.lead(b) : 'wait'; }
            case 'manger': return feedHook ? feedHook.answer() : 'wait';
            case 'free': return ctrl.moon();
            case 'bed': { const n = ctrl.stable.answerStall(); return n !== null ? ctrl.stable.tapStall(n) : ctrl.window(); }
            case 'herd-in': return 'wait';
            default: return ctrl.stage;
          }
        },
        wrong: async (kind?: string) => {
          switch (ctrl.stage) {
            case 'walk': { const b = ctrl.walk?.wrongBaby(); return b ? ctrl.walk!.lead(b) : 'none'; }
            case 'manger': return feedHook ? feedHook.wrong(kind) : 'none';
            case 'bed': { const n = ctrl.stable.wrongStall(); return n !== null ? ctrl.stable.tapStall(n) : 'none'; }
            default: return 'none';
          }
        },
        idle: () => { if (ctrl.stage === 'manger' && feedHook) feedHook.idle(); else deps.hints.idle(); },
        target: () => hookTarget(),
      }),
      registerHook('goodnight.stage', (): GoodnightStage | 'sky-name' => (naming !== null ? 'sky-name' : ctrl.stage)),
    ];
    // Kept after the scene closes (the next goodnight replaces it), so a flow reads the stage list on the rest scene.
    registerHook('goodnight.walk', () => ({
      row, picks: picks.map((p) => p.door), led: ctrl.walk?.led.length ?? 0, free: ctrl.walk?.free ?? true, doorPick: doorPick?.door ?? null,
      stages: [...ctrl.stages],
    }));
    return () => { for (const off of offs) off(); stopTalk(); };
  });
  onDestroy(() => { goal.clear(); moonbeam.clear(); deps.hints.end(); });
</script>

<section class="night" aria-label="goodnight scene" onpointerdown={() => ctrl.touch()}>
  {#if outside}
    <DuskMeadow babies={duskList} pick={v.pick} heads={v.heads} nudged={v.nudged} refused={v.refused}
      trotting={v.stage === 'herd-in'} {doorOf} ordinalOf={(b) => byId[b]?.ordinal ?? 1}
      onlead={(b) => void ctrl.walk?.lead(b)} onmiss={(b) => void ctrl.walk?.missedDrop(b)} ontap={(b) => void ctrl.walk?.tapBaby(b)} />
  {:else if stableStage}
    <StableRow stage={stableStage} doors={rowDoors} {byId} {order} doorOpen={v.doorOpen} closed={v.closed} poked={v.poked} tucked={v.tucked}
      {camp} ontapstall={(n) => void ctrl.stable.tapStall(n)} ontuck={(b) => void ctrl.stable.tuck(b)} />
    {#if v.stage === 'manger' || v.stage === 'free'}
      <!-- Lane feed's layer: above the stalls, below the moon button (plan 3.7). Unmounted when bed starts. -->
      <MangerFeed {spots} onhook={(h) => { feedHook = h; }} onchecked={() => void ctrl.mangerDone()} />
    {/if}
    <!-- The moon and the window sit left of the platform's Home button (top right, 80 px). -->
    {#if v.stage === 'free'}
      <button class="moon" data-touch aria-label="moon" use:press={() => void ctrl.moon()}><ArtImg id="item-moon" size={96} /></button>
    {/if}
    {#if v.stage === 'bed' && v.windowShown}
      <button class="window" data-touch aria-label="window" use:press={() => void ctrl.window()}>
        <svg viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
          <rect x="4" y="4" width="112" height="88" rx="10" fill="#1d1b4f" stroke="#8a6238" stroke-width="8" />
          <path d="M60 4 V92 M4 48 H116" stroke="#8a6238" stroke-width="6" />
          <circle cx="88" cy="26" r="11" fill="#fff6c8" />
        </svg>
        <span class="twinkle" style:left="22px" style:top="20px">✦</span>
        <span class="twinkle" style:left="38px" style:top="60px" style:animation-delay="0.6s">✦</span>
        <span class="twinkle" style:left="80px" style:top="64px" style:animation-delay="1.1s">✦</span>
      </button>
    {/if}
  {:else}
    <SkyStage {sky} skyNames={w.skyNames} showCount={v.count} countText={ctrl.countText} {naming} {talking} onnamed={(n) => void skyNamed(n)} />
  {/if}
  <HbGuides />
</section>

<style>
  .night { position: absolute; inset: 0; overflow: hidden; background: #1d1b4a; }
  .moon { position: absolute; left: 940px; top: 16px; width: 104px; height: 104px; background: radial-gradient(#fff6c855, transparent 70%);
    border: 0; padding: 0; display: grid; place-items: center; z-index: 8; animation: gn-glow calc(1800ms * var(--speed, 1)) ease-in-out infinite; }
  .window { position: absolute; left: 930px; top: 16px; width: 120px; height: 96px; background: none; border: 0; padding: 0; z-index: 8; }
  .window svg { display: block; }
  .twinkle { position: absolute; color: #fff6c8; font-size: 16px; pointer-events: none; animation: gn-tw calc(1600ms * var(--speed, 1)) infinite; }
  @keyframes gn-glow { 50% { transform: scale(1.06); } }
  @keyframes gn-tw { 50% { opacity: 0.3; } }
</style>
