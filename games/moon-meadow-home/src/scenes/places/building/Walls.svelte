<script lang="ts">
  // The walls part of a Building Day (Task A13, decision D7, R38). The wall needs `total` planks and `up` are
  // already up; she drags the stone with the missing planks onto the wall. A short wall leaves a glowing gap,
  // a tall one wobbles its top planks into the wheelbarrow. Served walls are checked moments (current, then
  // review); without a served fact it is one free wall of ten that is not logged.
  import { onDestroy, onMount, untrack } from 'svelte';
  import StoneTray from '../../../ui/StoneTray.svelte';
  import { dropTarget } from '../../../platform/input.ts';
  import { sleep } from '../../../platform/timing.ts';
  import { ghost } from '../../../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../../../ui/moonbeam.svelte.ts';
  import { createMoment, type Moment } from '../../../ui/moment.ts';
  import { defaultDeps } from '../../../ui/moment-deps.ts';
  import { audio, numId, type SpeakId } from '../../../audio/index.ts';
  import { game } from '../../../game.svelte.ts';
  import { partAsks, wallLines, wallMistakeLines, wallOutcome, wallStones, type WallTask } from '../../../core/places/building.ts';
  import { plankRows, wallMoments } from '../../../core/places/building-day.ts';
  import { learnerView, logResult, serveAsk } from '../../../places/plan.ts';
  import { once } from '../../../places/session.ts';
  import { setPart } from './part-api.ts';

  let { plot, short = false, ondone }: { plot: string; short?: boolean; ondone: () => void } = $props();

  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);
  const tasks: WallTask[] = untrack(() => wallMoments(partAsks('walls', learnerView(), game.visit).map((a) => serveAsk(a)), game.rng));

  let k = $state(0);
  const task = $derived(tasks[k]);
  let stones = $state<number[]>([]);
  let shown = $state(0);          // planks on the wall
  let over = $state(0);           // planks above the wall that wobble off
  let phase = $state<'idle' | 'play' | 'busy' | 'up' | 'done'>('idle');
  let wallEl = $state<HTMLElement | null>(null);
  let moment: Moment | null = null;
  let missedBy1 = false;

  const rows = $derived(plankRows(task.total));
  // Spot index per row, filled bottom row first.
  const rowStarts = $derived(rows.map((_, r) => rows.slice(0, r).reduce((a, b) => a + b, 0)));

  function stoneEl(v: number): Element | null {
    return document.querySelector(`[aria-label="stone ${v}"]`);
  }

  async function drop(value: number): Promise<void> {
    if (phase !== 'play') return;
    const t = task;
    const o = wallOutcome(t, value);
    phase = 'busy';
    if (o.kind === 'done') {
      shown = t.total;
      void audio.sfx('whoosh');
      await sleep(350);
      void audio.sfx('sparkle');
      if (moment && t.served) {
        const { result, ms } = moment.answer();
        moment = null;
        logResult(t.served, [{ id: t.served.carrier, r: result }], { result, ms, place: 'building-day', error: missedBy1 ? 'off-by-one' : null });
      } else {
        moment?.dispose();
        moment = null;
      }
      phase = 'up';
      await say(['bd-wall-up']);
      await sleep(500);
      if (k + 1 < tasks.length) { k++; void start(); return; }
      phase = 'done';
      ondone();
      return;
    }
    const kind: 'gap' | 'wobble' = o.kind;
    moment?.miss();
    if (o.diff === 1) missedBy1 = true;
    void audio.sfx('whoosh');
    if (kind === 'gap') {
      shown = t.up + value;
      await sleep(300);
      await say(wallMistakeLines({ kind, diff: o.diff }));
      await sleep(1500);
    } else {
      shown = t.total;
      over = o.diff;
      await sleep(1100);
      void audio.sfx('pop');
      await say(['foal-silly']);
      await say(wallMistakeLines({ kind, diff: o.diff }));
      await sleep(700);
    }
    shown = t.up;
    over = 0;
    phase = 'play';
  }

  async function focused(): Promise<void> {
    const empty = [...document.querySelectorAll('.wall .spot.empty')];
    if (empty.length) moonbeam.show(empty);
    else if (wallEl) moonbeam.show(wallEl);
    for (let i = 1; i <= task.answer; i++) await say([numId('n', i)]);
  }
  async function ghostHint(): Promise<void> {
    const from = stoneEl(task.answer);
    if (from && wallEl) await ghost.drag(from, wallEl);
  }
  function wrongValue(kind?: string): number {
    const low = stones.filter((v) => v < task.answer).sort((a, b) => b - a)[0];
    const high = stones.filter((v) => v > task.answer).sort((a, b) => a - b)[0];
    if (kind === 'count-high') return high ?? low ?? task.answer + 1;
    return low ?? high ?? task.answer + 1;
  }

  async function start(): Promise<void> {
    const t = task;
    missedBy1 = false;
    shown = t.up;
    over = 0;
    stones = wallStones(t, game.rng);
    phase = 'play';
    moment = createMoment({
      strand: t.served ? 'm' : undefined, step: t.served?.step ?? null, place: 'building-day',
      goal: wallLines(t),
      target: () => stoneEl(t.answer), focused, ghost: ghostHint,
      hookAnswer: () => void drop(t.answer), hookWrong: (kind) => void drop(wrongValue(kind)),
    }, defaultDeps());
    await moment.start();
  }

  let offPart: (() => void) | null = null;
  onMount(() => {
    offPart = setPart({
      part: 'walls',
      answer: () => (moment ? moment.hookAnswer() : void drop(task.answer)),
      wrong: (kind) => (moment ? moment.hookWrong(kind) : void drop(wrongValue(kind))),
      target: () => `stone ${task.answer}`,
      wall: () => ({ total: task.total, up: task.up, answer: task.answer }),
      drop: (n) => void drop(n),
    });
    void (async () => {
      if (once(`walls-intro:${plot}`)) await say([short ? 'bd-short' : 'bd-walls']);
      await start();
    })();
  });
  onDestroy(() => {
    moment?.dispose();
    offPart?.();
  });
</script>

<div class="walls" aria-label="walls part">
  <div class="wall" aria-label="wall" bind:this={wallEl} use:dropTarget={{ id: 'wall' }}>
    {#if over > 0}
      <div class="row over">
        {#each Array.from({ length: over }) as _, i (i)}
          <span class="plank wobble" style:animation-delay="{i * 80}ms"></span>
        {/each}
      </div>
    {/if}
    {#each [...rows].map((n, r) => ({ n, r })).reverse() as row (row.r)}
      <div class="row">
        {#each Array.from({ length: row.n }) as _, i (i)}
          {@const idx = rowStarts[row.r] + i}
          <span class="spot" class:empty={idx >= shown} class:glow={phase === 'busy' && idx >= shown}>
            {#if idx < shown}<span class="plank" class:new={idx >= task.up}></span>{/if}
          </span>
        {/each}
      </div>
    {/each}
  </div>
  <div class="tray">
    <StoneTray values={stones} scaffold={task.served?.scaffold ?? 2} targets={['wall']} disabled={phase !== 'play'}
      ondrop={(v) => void drop(v)} ontap={() => moment?.touch()} />
  </div>
</div>

<style>
  .walls { position: absolute; inset: 0; }
  .wall { position: absolute; left: 270px; top: 120px; width: 640px; min-height: 290px; padding: 24px 40px 18px; display: flex; flex-direction: column;
    justify-content: flex-end; align-items: center; gap: 8px; border-bottom: 14px solid #8a5a2b; border-radius: 6px; }
  .wall::before, .wall::after { content: ''; position: absolute; bottom: -14px; width: 26px; height: 330px; border-radius: 8px 8px 0 0;
    background: linear-gradient(90deg, #b07a43, #8a5a2b); }
  .wall::before { left: 0; }
  .wall::after { right: 0; }
  .row { display: flex; gap: 8px; }
  .row.over { position: absolute; top: -40px; }
  .spot { width: 104px; height: 56px; border-radius: 10px; display: grid; place-items: center; }
  .spot.empty { border: 4px dashed #a8743c99; background: #fff8e866; }
  .spot.glow { animation: glow calc(700ms * var(--speed, 1)) ease-in-out infinite; background: #fff6b0; border-color: #ffd75e; }
  .plank { display: block; width: 104px; height: 56px; border-radius: 9px; border: 3px solid #a8743c;
    background: repeating-linear-gradient(0deg, #00000000 0 14px, #a8743c33 14px 16px), linear-gradient(#f6d3a4, #e2ad6e); }
  .plank.new { animation: fly calc(450ms * var(--speed, 1)) ease-out; }
  .plank.wobble { animation: wobble calc(1800ms * var(--speed, 1)) ease-in forwards; }
  .tray { position: absolute; left: 0; right: 0; bottom: 40px; }
  @keyframes fly { from { transform: translateY(260px) scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes glow { 50% { transform: scale(1.05); opacity: .7; } }
  @keyframes wobble { 0% { transform: rotate(0); } 15% { transform: rotate(-9deg); } 30% { transform: rotate(9deg); } 45% { transform: rotate(-9deg); }
    60% { transform: rotate(0); opacity: 1; } 100% { transform: translate(560px, 280px) rotate(70deg); opacity: 0; } }
</style>
