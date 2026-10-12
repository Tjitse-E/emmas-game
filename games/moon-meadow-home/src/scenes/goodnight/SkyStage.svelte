<script lang="ts">
  // The goodnight sky (spec 2.7), moved out of Goodnight.svelte unchanged: one star per baby and a sky unicorn for
  // every ten, the herd count printed while Elizabeth reads it, and naming a new sky unicorn.
  import Lumi from '../../art/Lumi.svelte';
  import PrintWithDots from '../../ui/PrintWithDots.svelte';
  import type { SkyState } from '../../core/heartbeat/sky.ts';
  import type { Named } from '../heartbeat/naming.ctrl.ts';
  import ArtImg from '../heartbeat/ArtImg.svelte';
  import Backdrop from '../heartbeat/Backdrop.svelte';
  import Naming from '../Naming.svelte';

  let { sky, skyNames, showCount, countText, naming, talking, onnamed }: {
    sky: SkyState; skyNames: (string | null)[]; showCount: boolean; countText: string; naming: number | null; talking: boolean;
    onnamed: (n: Named) => void;
  } = $props();
</script>

<div class="sky-stage" aria-label="night sky">
  <Backdrop id="bg-sky" top="#1d1b4f" bottom="#2d3a6e" />
  <span class="lumi"><Lumi size={150} {talking} /></span>
  <div class="sky" aria-label="sky">
    {#each Array(sky.unicorns) as _, i (i)}
      <span class="sky-unicorn"><ArtImg id="sky-unicorn" size={96} />{#if skyNames[i]}<em>{skyNames[i]}</em>{/if}</span>
    {/each}
    {#each Array(sky.stars) as _, i (i)}<span class="star" style:animation-delay="{i * 0.2}s">✦</span>{/each}
  </div>
  {#if showCount}
    <div class="count" aria-label="count"><PrintWithDots text={countText} dots={false} label="count" size={56} /></div>
  {/if}
  {#if naming !== null}
    <div class="sky-naming"><Naming target={{ kind: 'sky', index: naming }} {onnamed} /></div>
  {/if}
</div>

<style>
  .sky-stage { position: absolute; inset: 0; overflow: hidden; background: #1d1b4a; }
  .lumi { position: absolute; left: 990px; top: 120px; }
  .sky { position: absolute; left: 240px; right: 220px; top: 24px; height: 200px; display: flex; flex-wrap: wrap; gap: 14px; align-content: flex-start; }
  .sky-unicorn { display: flex; flex-direction: column; align-items: center; color: #fff6c8; font: 700 22px 'Andika', sans-serif; }
  .sky-unicorn em { font-style: normal; }
  .star { color: #fff6c8; font-size: 34px; animation: tw calc(2000ms * var(--speed, 1)) infinite; }
  .count { position: absolute; left: 0; right: 0; top: 250px; display: flex; justify-content: center; }
  .sky-naming { position: absolute; inset: 0; }
  @keyframes tw { 50% { opacity: 0.4; } }
</style>
