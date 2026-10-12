<script lang="ts">
  // Goodnight (spec 2.7): the sky with one star per baby and a sky unicorn for every ten, roll call at the
  // doors, the herd count printed while Elizabeth reads it, naming a new sky unicorn, then Lumi says goodnight
  // and the visit ends on the rest scene (R45).
  import { onDestroy, onMount } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { audio } from '../audio/index.ts';
  import { press } from '../platform/input.ts';
  import { registerHook, registerSceneHook } from '../platform/hooks.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import Unicorn from '../art/Unicorn.svelte';
  import Lumi from '../art/Lumi.svelte';
  import PrintWithDots from '../ui/PrintWithDots.svelte';
  import { pageDoors, stableLayout } from '../core/heartbeat/stables.ts';
  import { pickRollCall, rollCallCount } from '../core/heartbeat/rollcall.ts';
  import { skyState } from '../core/heartbeat/sky.ts';
  import { GoodnightCtrl } from './heartbeat/goodnight.ctrl.ts';
  import { servedFromPick } from './heartbeat/learn-bridge.ts';
  import { bridge, liveDeps } from './heartbeat/deps.ts';
  import { goal } from './heartbeat/guides.svelte.ts';
  import type { Named } from './heartbeat/naming.ctrl.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import Backdrop from './heartbeat/Backdrop.svelte';
  import NameTag from './naming/NameTag.svelte';
  import Naming from './Naming.svelte';

  let { params: _params }: { params: Record<string, unknown> } = $props();
  const deps = liveDeps({ place: 'goodnight', strand: 'name' });
  const w = game.world;
  const byId = w.byId;
  const layout = stableLayout(w.herd, w.rowsBuilt);
  const occupied = new Set(layout.rows.flat().filter((d) => d.baby).map((d) => d.number));
  // Learning applies spec 3.7: names she can decode or has read before, with a clip, due first.
  const review = new Set(bridge.nameReviewIds(w.herd.map((b) => ({ id: b.id, name: b.name, gems: b.gems, listName: b.listName })), 6, deps.rng));
  const doorServed = occupied.size >= 3
    ? bridge.serve('rollcall-door', deps.rng, (s) => occupied.has(Number(s.id.split(':')[2])), { doors: { built: w.rowsBuilt * 10, own: null } })
    : null;
  const doorNo = doorServed ? Number(doorServed.id.split(':')[2]) : null;
  const count = rollCallCount({ visitIndex: w.visitIndex, checkedThisVisit: bridge.checkedCount(), due: review.size });
  const { page, picks } = pickRollCall({
    layout, names: new Map(w.herd.map((b) => [b.id, b.name])), count, door: doorNo, rng: deps.rng,
    isDue: (id) => review.has(id), eligible: (id) => review.has(id),
  });
  const ctrl = new GoodnightCtrl({
    layout, page, picks, doorServed: picks[0]?.kind === 'door' ? doorServed : null, herdCount: w.herd.length, skyNames: w.skyNames,
    nameServed: (baby, name) => servedFromPick(bridge.namePick({ id: baby, name }), new Map()) ?? null,
  }, deps);

  let tick = $state(0);
  ctrl.onchange = () => { tick++; };
  const v = $derived.by(() => { void tick; return { stage: ctrl.stage, pick: ctrl.pick, heads: new Set(ctrl.heads), poked: ctrl.poked, count: ctrl.showCount }; });
  const sky = skyState(w.herd.length, w.skyNames);
  const doors = pageDoors(layout, page);
  let naming = $state<number | null>(null);
  let talking = $state(false);
  let ended = false;

  async function end(): Promise<void> {
    if (ended) return;
    ended = true;
    await ctrl.bye();
    await sleep(800);
    game.endVisit('goodnight');
  }

  let afterStarted = false;
  async function afterRollCall(): Promise<void> {
    if (afterStarted) return;
    afterStarted = true;
    await sleep(400);
    const next = await ctrl.sky();
    if (next !== null) { naming = next; return; }
    await end();
  }
  $effect(() => { if (v.stage === 'sky') void afterRollCall(); });

  async function skyNamed(n: Named): Promise<void> {
    if (naming === null) return;
    ctrl.skyNamed(naming, n);
    naming = null;
    await end();
  }

  onMount(() => {
    setBands('#1d1b4f', '#2c4a3e');
    const stopTalk = audio.onTalk((id) => { talking = !!id && id.startsWith('lumi-'); });
    goal.set(() => ctrl.beginPick());
    if (ctrl.stage === 'rollcall') void ctrl.beginPick();
    const offs = [
      registerSceneHook('goodnight', {
        answer: async () => { const d = ctrl.answerDoor(); return d !== null ? ctrl.tapDoor(d) : ctrl.stage; },
        wrong: async () => { const d = ctrl.wrongDoor(); return d !== null ? ctrl.tapDoor(d) : 'none'; },
        idle: () => { deps.hints.idle(); },
        target: () => { const d = ctrl.answerDoor(); return d !== null ? `door ${d}` : null; },
      }),
      registerHook('goodnight.stage', () => (naming !== null ? 'sky-name' : ctrl.stage)),
    ];
    return () => { for (const off of offs) off(); stopTalk(); };
  });
  onDestroy(() => { goal.clear(); deps.hints.end(); });
</script>

<section class="night" aria-label="goodnight scene">
  <Backdrop id="bg-sky" top="#1d1b4f" bottom="#2d3a6e" />
  <HbGuides />
  <span class="lumi"><Lumi size={150} {talking} /></span>
  <div class="sky" aria-label="sky">
    {#each Array(sky.unicorns) as _, i (i)}
      <span class="sky-unicorn"><ArtImg id="sky-unicorn" size={96} />{#if w.skyNames[i]}<em>{w.skyNames[i]}</em>{/if}</span>
    {/each}
    {#each Array(sky.stars) as _, i (i)}<span class="star" style:animation-delay="{i * 0.2}s">✦</span>{/each}
  </div>
  {#if v.stage === 'rollcall' && v.pick}
    <div class="lantern" aria-label="lantern">
      <ArtImg id="item-lantern-lit" size={110} />
      {#if v.pick.kind === 'name'}
        <NameTag name={v.pick.name} ordinal={byId[v.pick.baby]?.ordinal ?? 1} size={40} />
      {/if}
    </div>
  {/if}
  {#if v.count}
    <div class="count" aria-label="count"><PrintWithDots text={ctrl.countText} dots={false} label="count" size={56} /></div>
  {/if}
  <div class="doors">
    {#each [0, 1] as k (k)}
      {@const row = doors.slice(k * 10, k * 10 + 10)}
      {#if row.length}
        <div class="frame">
          {#each row as d (d.number)}
            {@const b = d.baby ? byId[d.baby] : undefined}
            <button class="door" data-touch aria-label="door {d.number}" use:press={() => void ctrl.tapDoor(d.number)}>
              <span class="door-pic"><ArtImg id="item-stall-door" size={70} /></span>
              {#if b && v.heads.has(b.id)}
                <span class="head" class:poke={v.poked === d.number}><Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={52} headOnly label="" /></span>
              {:else if b}
                <span class="zzz" aria-hidden="true">z</span>
              {/if}
              <b>{d.number}</b>
            </button>
          {/each}
        </div>
      {/if}
    {/each}
  </div>
  {#if naming !== null}
    <div class="sky-naming"><Naming target={{ kind: 'sky', index: naming }} onnamed={(n) => void skyNamed(n)} /></div>
  {/if}
</section>

<style>
  .night { position: absolute; inset: 0; overflow: hidden; background: #1d1b4a; }
  .lumi { position: absolute; left: 990px; top: 120px; }
  .sky { position: absolute; left: 240px; right: 220px; top: 24px; height: 200px; display: flex; flex-wrap: wrap; gap: 14px; align-content: flex-start; }
  .sky-unicorn { display: flex; flex-direction: column; align-items: center; color: #fff6c8; font: 700 22px 'Andika', sans-serif; }
  .sky-unicorn em { font-style: normal; }
  .star { color: #fff6c8; font-size: 34px; animation: tw calc(2000ms * var(--speed, 1)) infinite; }
  .lantern { position: absolute; left: 380px; top: 240px; display: flex; align-items: center; gap: 16px; }
  .count { position: absolute; left: 0; right: 0; top: 250px; display: flex; justify-content: center; }
  .doors { position: absolute; left: 40px; right: 40px; bottom: 24px; display: flex; gap: 40px; justify-content: center; }
  .frame { display: grid; grid-template-columns: repeat(5, 92px); gap: 6px 8px; }
  .door { position: relative; width: 92px; height: 176px; background: none; border: 0; padding: 0; color: #fff6c8; font: 700 26px 'Andika', sans-serif;
    display: flex; flex-direction: column; align-items: center; }
  .door-pic { display: block; height: 118px; }
  .head { position: absolute; top: 22px; left: 50%; width: 52px; height: 52px; overflow: hidden; border-radius: 40%; transform: translateX(-50%); pointer-events: none; }
  .head.poke { animation: poke calc(600ms * var(--speed, 1)) 2; }
  .zzz { position: absolute; top: 20px; right: 12px; color: #c9b8ff; font: 700 26px 'Andika', sans-serif; }
  .sky-naming { position: absolute; inset: 0; }
  @keyframes tw { 50% { opacity: 0.4; } }
  @keyframes poke { 50% { transform: translateX(-50%) translateY(-12px); } }
</style>
