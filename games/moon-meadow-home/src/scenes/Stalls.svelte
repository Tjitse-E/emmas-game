<script lang="ts">
  // The stables (spec 2.7): rows of ten doors as two lines of five (a real ten-frame), plaques with names and
  // numbers, the Moonbeam Camp tents, page arrows. Modes: move-in (and a door visit), view, moon-name.
  import { onDestroy, onMount, untrack } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { press } from '../platform/input.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import Unicorn from '../art/Unicorn.svelte';
  import { hasDoor, pageCount, pageDoors, pageOf, stableLayout } from '../core/heartbeat/stables.ts';
  import { StallsCtrl } from './heartbeat/stalls.ctrl.ts';
  import { bridge, liveDeps } from './heartbeat/deps.ts';
  import { heartbeat, HOME_SCENE } from './heartbeat/flow.svelte.ts';
  import { moonName } from './heartbeat/moon-name.ts';
  import { goal, moonbeam } from './heartbeat/guides.svelte.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import Backdrop from './heartbeat/Backdrop.svelte';
  import NameTag from './naming/NameTag.svelte';

  let { params }: { params: Record<string, unknown> } = $props();
  const p = untrack(() => params) as { baby?: string; mode?: 'move-in' | 'view' | 'moon-name' };
  const mode = p.mode ?? 'view';
  const deps = liveDeps({ place: 'stalls', strand: 'm' });
  const world = game.world;
  const layout = stableLayout(world.herd, world.rowsBuilt);
  const byId = world.byId;
  const baby = p.baby ? byId[p.baby] : undefined;
  const occupied = new Set(layout.rows.flat().filter((d) => d.baby).map((d) => d.number));

  // A visit needs a door of her own, three babies with doors at least (Review focus 1) and learning's visit rule.
  const wantVisit = mode === 'move-in' && !!baby && hasDoor(baby.order, world.rowsBuilt) && occupied.size >= 3
    && bridge.shouldVisitDoor(world.herd.length);
  const visit = wantVisit && baby
    ? bridge.serve('door', deps.rng, (s) => { const n = Number(s.id.split(':')[2]); return occupied.has(n) && n !== baby.order; },
      { doors: { built: world.rowsBuilt * 10, own: baby.order } })
    : null;
  const ctrl = baby && mode === 'move-in'
    ? new StallsCtrl({ baby: { id: baby.id, order: baby.order, name: baby.hasClip ? (baby.listName ?? baby.name) : null }, layout, rowsBuilt: world.rowsBuilt, visit }, deps)
    : null;

  let page = $state(untrack(() => (baby ? pageOf(Math.min(baby.order, Math.max(1, world.rowsBuilt * 10))) : 1)));
  let visiting = $state(false);
  let tick = $state(0);
  if (ctrl) ctrl.onchange = () => { tick++; };
  const tapped = $derived.by(() => { void tick; return ctrl?.tapped ?? null; });
  const doors = $derived(pageDoors(layout, page));
  const pages = pageCount(layout);
  const doorEls: Record<number, HTMLElement> = {};
  let finished = false;

  async function home(): Promise<void> {
    if (finished) return;
    finished = true;
    goal.clear();
    moonbeam.clear();
    await game.go(HOME_SCENE);
  }

  onMount(() => {
    setBands('#cfe8ff', '#b98a5a');
    void (async () => {
      if (mode === 'moon-name' && baby) { await moonName(baby, deps); await sleep(600); await home(); return; }
      if (!ctrl || !baby) return;
      await ctrl.moveIn();
      await heartbeat.movedIn(baby.id, ctrl.target !== null);
      if (ctrl.target === null) return;
      page = pageOf(ctrl.target);
      visiting = true;
      goal.set(() => ctrl.beginVisit());
      await ctrl.beginVisit();
    })();
    return registerSceneHook('stalls', {
      answer: async () => (ctrl && ctrl.target !== null ? ctrl.tapDoor(ctrl.target) : 'no-visit'),
      wrong: async () => { const w = ctrl?.wrongDoor(); return ctrl && w ? ctrl.tapDoor(w) : 'no-visit'; },
      idle: () => { deps.hints.idle(); },
      target: () => (ctrl && ctrl.target !== null && visiting ? `door ${ctrl.target}` : null),
    });
  });
  $effect(() => {
    void tick;
    if (!ctrl?.done) return;
    void sleep(1200).then(() => heartbeat.visitDone());
  });
  onDestroy(() => { goal.clear(); deps.hints.end(); });
</script>

<section class="stalls" aria-label="stables scene">
  <Backdrop id="bg-stable-yard" top="#cfe8ff" bottom="#e9d2a8" />
  <HbGuides />
  <div class="rows">
    {#each [0, 1] as k (k)}
      {@const row = doors.slice(k * 10, k * 10 + 10)}
      {#if row.length}
        <div class="row">
          <div class="sign">{world.rowNames[row[0].row - 1] ?? `Row ${row[0].row}`}</div>
          <div class="frame">
            {#each row as d (d.number)}
              {@const who = d.baby ? byId[d.baby] : undefined}
              <button class="door" class:glow={baby?.order === d.number && !visiting} class:sleepy={tapped?.number === d.number && tapped.who === 'sleepy'}
                data-touch aria-label="door {d.number}" bind:this={doorEls[d.number]} use:press={() => void ctrl?.tapDoor(d.number)}>
                <span class="door-pic"><ArtImg id="item-stall-door" size={92} /></span>
                {#if who}
                  <span class="head"><Unicorn breed={who.breed} stage={who.stage} colours={who.colours} traits={who.traits} height={64} headOnly label="" /></span>
                {/if}
                <span class="plaque">
                  <b>{d.number}</b>
                  {#if who?.name && !visiting}<NameTag name={who.name} ordinal={who.ordinal} sparkle={!who.hasClip} size={20} />{/if}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
  {#if pages > 1}
    <button class="arrow left" data-touch aria-label="previous row" disabled={page === 1} use:press={() => { page = Math.max(1, page - 1); }}>‹</button>
    <button class="arrow right" data-touch aria-label="next row" disabled={page === pages} use:press={() => { page = Math.min(pages, page + 1); }}>›</button>
  {/if}
  {#if layout.camp.length}
    <div class="camp" aria-label="moonbeam camp">
      {#each layout.camp.slice(0, 9) as id (id)}
        {@const b = byId[id]}
        {#if b}
          <span class="tent" class:new={b.id === baby?.id}>
            <ArtImg id="item-camp-tent" size={104} />
            <span class="tent-head"><Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={46} headOnly label="" /></span>
          </span>
        {/if}
      {/each}
    </div>
  {/if}
  {#if mode === 'view'}
    <button class="back" data-touch aria-label="meadow" use:press={() => void home()}>
      <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 10 L16 24 L30 38" fill="none" stroke="#6b4a8a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
  {/if}
</section>

<style>
  .stalls { position: absolute; inset: 0; overflow: hidden; }
  .rows { position: absolute; left: 40px; right: 40px; top: 110px; display: flex; gap: 30px; justify-content: center; }
  .row { display: flex; flex-direction: column; align-items: center; }
  .sign { font: 700 28px 'Andika', sans-serif; color: #5a3a1a; background: #fff3d6; border: 4px solid #b98a5a; border-radius: 14px; padding: 2px 18px; margin-bottom: 10px; }
  .frame { display: grid; grid-template-columns: repeat(5, 98px); gap: 8px 6px; }
  .door { position: relative; width: 98px; height: 206px; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
  .door-pic { display: block; height: 130px; }
  .door.glow { animation: pulse calc(900ms * var(--speed, 1)) ease-in-out infinite; }
  .head { position: absolute; top: 30px; left: 50%; width: 64px; height: 64px; overflow: hidden; border-radius: 40%; transform: translateX(-50%); pointer-events: none; }
  .sleepy .head { animation: nod calc(600ms * var(--speed, 1)) 2; }
  .plaque { display: flex; flex-direction: column; align-items: center; gap: 2px; font: 700 26px 'Andika', sans-serif; color: #3b2a1a; }
  .plaque b { background: #fff3d6; border: 3px solid #b98a5a; border-radius: 10px; min-width: 44px; text-align: center; }
  .arrow { position: absolute; top: 600px; width: 96px; height: 96px; border-radius: 50%; background: #fff; border: 4px solid #c9b8ff; font: 700 56px/1 'Andika', sans-serif; color: #6b4a8a; }
  .arrow:disabled { opacity: 0.35; }
  .arrow.left { left: 24px; } .arrow.right { right: 24px; }
  .camp { position: absolute; left: 140px; right: 140px; bottom: 16px; display: flex; gap: 10px; justify-content: center; }
  .tent { position: relative; }
  .tent.new { animation: pulse calc(900ms * var(--speed, 1)) ease-in-out 4; }
  .tent-head { position: absolute; left: 30px; top: 50px; width: 46px; height: 46px; overflow: hidden; border-radius: 40%; pointer-events: none; }
  .back { position: absolute; left: 24px; bottom: 24px; width: 96px; height: 96px; border-radius: 50%; background: #fff; border: 4px solid #c9b8ff; display: grid; place-items: center; }
  .back svg { width: 48px; height: 48px; }
  @keyframes pulse { 50% { transform: scale(1.05); } }
  @keyframes nod { 50% { transform: translateX(-50%) translateY(6px); } }
</style>
