<script lang="ts">
  // The herd circle of a Building Day (Task A13, spec 2.4). Up to twelve babies stand in a ring around a
  // building egg; it hatches a baby of the building's breed (a row hatches her current egg breed) and she names it.
  import { onDestroy, onMount, untrack } from 'svelte';
  import Unicorn from '../../../art/Unicorn.svelte';
  import HatchAndName from '../../heartbeat/HatchAndName.svelte';
  import { audio } from '../../../audio/index.ts';
  import { game } from '../../../game.svelte.ts';
  import { currentEggBreed } from '../../../core/eggs/index.ts';
  import { herdView } from '../../../places/nav.ts';
  import { setPart } from './part-api.ts';

  // onhatched runs once the baby is out of the egg, so leaving during the naming never hatches a second baby.
  let { plot, breed = null, onhatched, ondone }:
    { plot: string; breed?: string | null; onhatched: () => void; ondone: () => void } = $props();

  const ring = untrack(() => herdView().slice(-12));
  const kind = untrack(() => breed ?? currentEggBreed(game.state, game.learner, game.content));
  let hatching = $state(false);
  let finished = false;
  let hatched = false;
  const before = untrack(() => new Set(game.world.herd.map((b) => b.id)));

  $effect(() => {
    if (hatched || !game.world.herd.some((b) => !before.has(b.id))) return;
    hatched = true;
    untrack(() => onhatched());
  });

  const spot = (i: number, n: number) => {
    const a = Math.PI * (0.05 + 0.9 * (n === 1 ? 0.5 : i / (n - 1)));
    return { x: 590 - Math.cos(a) * 470 - 60, y: 520 - Math.sin(a) * 160 };
  };

  function named(): void {
    if (finished) return;
    finished = true;
    ondone();
  }

  let offPart: (() => void) | null = null;
  onMount(() => {
    offPart = setPart({ part: 'circle', answer: () => {}, target: () => null });
    void (async () => {
      await audio.say('bd-circle');
      hatching = true;
    })();
  });
  onDestroy(() => offPart?.());
</script>

<div class="circle-part" aria-label="herd circle part">
  {#each ring as b, i (b.id)}
    {@const p = spot(i, ring.length)}
    <span class="ring-baby" style:left="{p.x}px" style:top="{p.y}px" style:animation-delay="{i * 70}ms">
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={110} pose="idle" facing={p.x < 530 ? 'right' : 'left'} label="" lite={ring.length > 8} />
    </span>
  {/each}
  {#if hatching}
    <HatchAndName breed={kind} source="building" {plot} ondone={named} />
  {/if}
</div>

<style>
  .circle-part { position: absolute; inset: 0; }
  .ring-baby { position: absolute; animation: hop calc(900ms * var(--speed, 1)) ease-in-out infinite; }
  @keyframes hop { 50% { transform: translateY(-10px); } }
</style>
