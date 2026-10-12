<script lang="ts">
  // The ribbon part of a Building Day (Task A13). A ribbon hangs across the doorway. She swipes through it,
  // drags the scissors onto it or taps it: it is cut, confetti flies and the builders cheer. Free play, never checked.
  import { onDestroy, onMount } from 'svelte';
  import Picture from '../../../art/Picture.svelte';
  import { hasPicture } from '../../../art/manifest.ts';
  import { drag, dropTarget, press } from '../../../platform/input.ts';
  import { clientToStage } from '../../../platform/stage.svelte.ts';
  import { sleep } from '../../../platform/timing.ts';
  import { ghost } from '../../../ui/ghost-hand.svelte.ts';
  import { svg } from '../../../ui/places-svg.ts';
  import { createMoment, type Moment } from '../../../ui/moment.ts';
  import { defaultDeps } from '../../../ui/moment-deps.ts';
  import { audio, type SpeakId } from '../../../audio/index.ts';
  import { isCut } from '../../../core/places/building-day.ts';
  import { once } from '../../../places/session.ts';
  import { setPart } from './part-api.ts';

  let { plot: _plot, picture = null, ondone }: { plot: string; picture?: string | null; ondone: () => void } = $props();

  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);
  const CONFETTI = ['#ff9cc8', '#ffd75e', '#8cc8ff', '#8fdc9a', '#b89cff'];
  let cut = $state(false);
  let ribbonEl = $state<HTMLElement | null>(null);
  let scissorsEl = $state<HTMLElement | null>(null);
  let moment: Moment | null = null;
  let swipe: { id: number; x: number; y: number } | null = null;

  async function snip(): Promise<void> {
    if (cut) return;
    cut = true;
    moment?.dispose();
    moment = null;
    void audio.sfx('fanfare');
    await say(['foal-yay']);
    await sleep(1200);
    ondone();
  }

  // A swipe across the ribbon: the pointer travels more than 120 px while it is down.
  function down(e: PointerEvent): void {
    const p = clientToStage(e.clientX, e.clientY);
    swipe = { id: e.pointerId, x: p.x, y: p.y };
  }
  function move(e: PointerEvent): void {
    if (!swipe || swipe.id !== e.pointerId) return;
    const p = clientToStage(e.clientX, e.clientY);
    if (isCut(swipe.x, swipe.y, p.x, p.y)) { swipe = null; void snip(); }
  }
  function up(): void { swipe = null; }

  let offPart: (() => void) | null = null;
  onMount(() => {
    offPart = setPart({ part: 'ribbon', answer: () => void snip(), target: () => 'ribbon', cut: () => void snip() });
    void (async () => {
      moment = createMoment({
        place: 'building-day', goal: ['bd-ribbon'], target: () => ribbonEl,
        ghost: async () => { if (scissorsEl && ribbonEl) await ghost.drag(scissorsEl, ribbonEl); },
        hookAnswer: () => void snip(),
      }, defaultDeps());
      const first = once('ribbon:demo');
      await moment.start();
      if (first && !cut && scissorsEl && ribbonEl) await ghost.drag(scissorsEl, ribbonEl);
    })();
  });
  onDestroy(() => {
    moment?.dispose();
    offPart?.();
  });
</script>

<div class="ribbon-part" aria-label="ribbon part">
  <div class="door" aria-hidden="true">
    {#if picture && hasPicture(picture)}<Picture id={picture} size={400} label="" />{:else}{@html svg('place')}{/if}
  </div>
  <div class="ribbon" class:cut role="button" tabindex="-1" aria-label="ribbon" bind:this={ribbonEl} use:dropTarget={{ id: 'ribbon' }}
    use:press={() => void snip()} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <span class="half left"></span><span class="half right"></span>
    <span class="bow" aria-hidden="true">{@html svg('ribbon')}</span>
  </div>
  {#if !cut}
    <button class="scissors" aria-label="scissors" bind:this={scissorsEl}
      use:drag={{ data: 'scissors', onDrop: (d) => { if (d.targetId === 'ribbon') void snip(); }, onTap: () => moment?.touch() }}>
      {@html svg('scissors')}
    </button>
  {:else}
    <div class="confetti" aria-hidden="true">
      {#each Array.from({ length: 30 }) as _, i (i)}
        <i style:left="{80 + ((i * 37) % 1020)}px" style:background={CONFETTI[i % CONFETTI.length]} style:animation-delay="{(i % 10) * 60}ms"></i>
      {/each}
    </div>
  {/if}
</div>

<style>
  .ribbon-part { position: absolute; inset: 0; }
  .door { position: absolute; left: 390px; top: 60px; width: 400px; height: 400px; display: grid; place-items: center; }
  .door :global(svg) { width: 100%; height: 100%; }
  .ribbon { position: absolute; left: 300px; top: 330px; width: 580px; height: 120px; touch-action: none; }
  .half { position: absolute; top: 46px; height: 28px; width: 50%; background: #ff7fb0; border: 3px solid #c04a7e; transition: transform calc(600ms * var(--speed, 1)) ease-in, opacity calc(600ms * var(--speed, 1)); }
  .half.left { left: 0; border-radius: 8px 0 0 8px; transform-origin: left center; }
  .half.right { right: 0; border-radius: 0 8px 8px 0; transform-origin: right center; }
  .cut .half.left { transform: rotate(60deg) scaleX(.4); opacity: .8; }
  .cut .half.right { transform: rotate(-60deg) scaleX(.4); opacity: .8; }
  .bow { position: absolute; left: 240px; top: 10px; width: 100px; height: 100px; transition: transform calc(500ms * var(--speed, 1)), opacity calc(500ms * var(--speed, 1)); }
  .cut .bow { transform: translateY(200px); opacity: 0; }
  .bow :global(svg), .scissors :global(svg) { width: 100%; height: 100%; }
  .scissors { position: absolute; left: 120px; top: 560px; width: 120px; height: 120px; padding: 12px; border-radius: 50%; background: #ffffffaa; touch-action: none;
    animation: bob calc(1600ms * var(--speed, 1)) ease-in-out infinite; }
  .confetti { position: absolute; inset: 0; pointer-events: none; }
  .confetti i { position: absolute; top: -20px; width: 16px; height: 22px; border-radius: 4px; animation: fall calc(1600ms * var(--speed, 1)) ease-in forwards; }
  @keyframes bob { 50% { transform: translateY(-8px); } }
  @keyframes fall { to { transform: translateY(820px) rotate(540deg); opacity: .6; } }
</style>
