<script lang="ts">
  // The trim part of a Building Day (Task A13, R38). With a served pattern (M08) the trim shows the beads so
  // far and one empty spot; she drags the bead that comes next. A wrong bead makes the braid spring loose and
  // the spot glows until she swaps it. Without a pattern she taps colours onto five trim spots (free, not logged).
  import { onDestroy, onMount, untrack } from 'svelte';
  import { drag, dropTarget, press } from '../../../platform/input.ts';
  import { sleep } from '../../../platform/timing.ts';
  import { ghost } from '../../../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../../../ui/moonbeam.svelte.ts';
  import { svg } from '../../../ui/places-svg.ts';
  import { createMoment, type Moment } from '../../../ui/moment.ts';
  import { defaultDeps } from '../../../ui/moment-deps.ts';
  import { audio, type SpeakId } from '../../../audio/index.ts';
  import { game } from '../../../game.svelte.ts';
  import { BEAD_COLOURS, partAsks, type TrimTask } from '../../../core/places/building.ts';
  import { BEAD_HEX, trimMoments } from '../../../core/places/building-day.ts';
  import { learnerView, logResult, serveAsk } from '../../../places/plan.ts';
  import { setPart } from './part-api.ts';

  let { plot: _plot, ondone }: { plot: string; ondone: () => void } = $props();

  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);
  const tasks: TrimTask[] = untrack(() => trimMoments(partAsks('trim', learnerView(), game.visit).map((a) => serveAsk(a)), game.rng));
  const FREE_SPOTS = 5;

  let k = $state(0);
  const task = $derived(tasks[k]);
  let placed = $state<string | null>(null);
  let loose = $state(false);
  let glow = $state(false);
  let free = $state<string[]>([]);
  let phase = $state<'play' | 'busy' | 'done'>('play');
  let gapEl = $state<HTMLElement | null>(null);
  let moment: Moment | null = null;

  const bead = (colour: string) => `background-color:${BEAD_HEX[colour] ?? '#ffffff'}`;
  const beadEl = (colour: string) => document.querySelector(`[aria-label="bead ${colour}"]`);

  async function choose(colour: string): Promise<void> {
    const t = task;
    if (!t.checked || phase !== 'play') return;
    if (colour === t.answer) {
      phase = 'busy';
      placed = colour;
      glow = false;
      void audio.sfx('sparkle');
      if (moment) {
        const { result, ms } = moment.answer();
        moment = null;
        logResult(t.served, [{ id: t.served.carrier, r: result }], { result, ms, place: 'building-day' });
      }
      await say(['foal-yay']);
      await sleep(500);
      return next();
    }
    phase = 'busy';
    moment?.miss();
    placed = colour;
    loose = true;
    void audio.sfx('pop');
    await sleep(800);
    loose = false;
    placed = null;
    glow = true;
    phase = 'play';
  }

  async function paint(colour: string): Promise<void> {
    if (task.checked || phase !== 'play' || free.length >= FREE_SPOTS) return;
    moment?.touch();
    free = [...free, colour];
    void audio.sfx('pop');
    if (free.length < FREE_SPOTS) return;
    phase = 'busy';
    moment?.dispose();
    moment = null;
    void audio.sfx('sparkle');
    await say(['foal-pretty']);
    await sleep(400);
    return next();
  }

  async function next(): Promise<void> {
    if (k + 1 < tasks.length) { k++; await start(); return; }
    phase = 'done';
    ondone();
  }

  function answerColour(): string {
    const t = task;
    return t.checked ? t.answer : BEAD_COLOURS[free.length % BEAD_COLOURS.length];
  }

  async function start(): Promise<void> {
    const t = task;
    placed = null; loose = false; glow = false; free = [];
    phase = 'play';
    if (t.checked) {
      moment = createMoment({
        strand: 'm', step: t.served.step, place: 'building-day', goal: ['bd-trim'],
        target: () => beadEl(t.answer),
        focused: () => { if (gapEl) moonbeam.show(gapEl); },
        ghost: async () => { const from = beadEl(t.answer); if (from && gapEl) await ghost.drag(from, gapEl); },
        hookAnswer: () => void choose(t.answer),
        hookWrong: () => void choose(t.options.find((c) => c !== t.answer) ?? 'pink'),
      }, defaultDeps());
    } else {
      moment = createMoment({
        place: 'building-day', goal: ['bd-trim-free'],
        target: () => beadEl(answerColour()),
        hookAnswer: () => { for (let i = free.length; i < FREE_SPOTS; i++) void paint(BEAD_COLOURS[i % BEAD_COLOURS.length]); },
      }, defaultDeps());
    }
    await moment.start();
  }

  let offPart: (() => void) | null = null;
  onMount(() => {
    offPart = setPart({
      part: 'trim',
      answer: () => moment?.hookAnswer(),
      wrong: (kind) => moment?.hookWrong(kind),
      target: () => `bead ${answerColour()}`,
      trim: (colour) => void (task.checked ? choose(colour) : paint(colour)),
    });
    void start();
  });
  onDestroy(() => {
    moment?.dispose();
    offPart?.();
  });
</script>

<div class="trim-part" aria-label="trim part">
  <div class="house" aria-hidden="true">{@html svg('place')}</div>
  {#if task.checked}
    <div class="trim" class:loose aria-label="trim">
      {#each task.shown as c, i (i)}<span class="bead" style={bead(c)}></span>{/each}
      <span class="gap" class:glow aria-label="trim gap" bind:this={gapEl} use:dropTarget={{ id: 'trim-gap' }}>
        {#if placed}<span class="bead in" style={bead(placed)}></span>{/if}
      </span>
    </div>
    <div class="options">
      {#each task.options as c (c)}
        <button class="option" aria-label="bead {c}" disabled={placed === c}
          use:drag={{ data: c, disabled: phase !== 'play', onDrop: (d) => { if (d.targetId === 'trim-gap') void choose(c); }, onTap: () => { moment?.touch(); void audio.sfx('pop'); } }}>
          <span class="bead" style={bead(c)}></span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="trim" aria-label="trim">
      {#each Array.from({ length: FREE_SPOTS }) as _, i (i)}
        <span class="gap" class:full={free[i] !== undefined}>{#if free[i]}<span class="bead in" style={bead(free[i])}></span>{/if}</span>
      {/each}
    </div>
    <div class="options">
      {#each BEAD_COLOURS as c (c)}
        <button class="option" aria-label="bead {c}" use:press={() => void paint(c)}><span class="bead" style={bead(c)}></span></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .trim-part { position: absolute; inset: 0; }
  .house { position: absolute; left: 440px; top: 60px; width: 300px; height: 300px; opacity: .9; }
  .house :global(svg) { width: 100%; height: 100%; }
  .trim { position: absolute; left: 0; right: 0; top: 360px; display: flex; justify-content: center; gap: 10px; padding: 12px 0;
    background: linear-gradient(transparent 45%, #c99a5a 45% 55%, transparent 55%); }
  .trim.loose { animation: loose calc(260ms * var(--speed, 1)) ease-in-out 3; }
  .bead { display: block; width: 70px; height: 70px; border-radius: 50%; border: 4px solid #00000033;
    background-image: radial-gradient(circle at 32% 28%, #ffffffcc 0 14%, #ffffff00 40%); }
  .option .bead { width: 92px; height: 92px; }
  .bead.in { animation: pop calc(300ms * var(--speed, 1)) ease-out; }
  .gap { width: 84px; height: 84px; border-radius: 50%; border: 4px dashed #c99a5a; background: #fff8e8; display: grid; place-items: center; }
  .gap.full { border-style: solid; }
  .gap.glow { animation: glow calc(800ms * var(--speed, 1)) ease-in-out infinite; }
  .options { position: absolute; left: 0; right: 0; bottom: 60px; display: flex; justify-content: center; gap: 40px; }
  .option { width: 116px; height: 116px; border-radius: 50%; background: #ffffff88; display: grid; place-items: center; touch-action: none; }
  .option:disabled { opacity: .3; }
  @keyframes loose { 25% { transform: translateY(-14px) rotate(-2deg); } 75% { transform: translateY(8px) rotate(2deg); } }
  @keyframes pop { from { transform: scale(.4); } to { transform: none; } }
  @keyframes glow { 50% { transform: scale(1.08); } }
</style>
