<script lang="ts">
  // One moonflower per hatch (spec 2.7); above 60 they join the patches as denser clumps. The meadow places it.
  import { moonflowerLayout } from '../../core/heartbeat/moonflowers.ts';
  import ArtImg from './ArtImg.svelte';

  let { count, seed = 42 }: { count: number; seed?: number } = $props();
  const patches = $derived(moonflowerLayout(count, seed));
  const HUES = ['#f5d9ff', '#ffe0ef', '#d6f1ff', '#fff3c4', '#dcffe8', '#ffe2cf'];
</script>

<div class="flowers" aria-hidden="true">
  {#each patches as p, i (i)}
    <span class="patch" style:left="{p.x}px" style:top="{p.y}px">
      {#each Array(p.density) as _, k (k)}
        <span class="f" style:transform="translate({k * 16 - 16}px, {k % 2 ? -10 : 0}px)"><ArtImg id="decor-moonflower" size={44} tint={HUES[p.hue]} /></span>
      {/each}
    </span>
  {/each}
</div>

<style>
  .flowers { position: absolute; inset: 0; pointer-events: none; }
  .patch { position: absolute; transform: translate(-50%, -50%); }
  .f { position: absolute; }
</style>
