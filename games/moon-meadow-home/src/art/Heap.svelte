<script lang="ts">
  // A heap (or jar) of copies of one picture (contracts C9 HeapProps, R12). Any count draws; none throws.
  import Picture from './Picture.svelte';
  import { layoutFor } from './heap.ts';

  let { id, count, size, seed = 1, tint = undefined, label = undefined, mode = 'heap' }:
    { id: string; count: number; size: number; seed?: number; tint?: string; label?: string; mode?: 'heap' | 'jar' } = $props();

  const places = $derived(layoutFor(count, seed, mode));
</script>

<div class="heap" role="img" aria-label={label ?? `${count} ${id}`} style="width:{size}px;height:{size}px">
  {#each places as p, i (i)}
    <div class="copy" style="left:{p.x * size}px;top:{p.y * size}px;z-index:{p.z};transform:translate(-50%,-50%) rotate({p.rot}deg)">
      <Picture {id} size={p.scale * size} {tint} label="" />
    </div>
  {/each}
</div>

<style>
  .heap { position: relative; pointer-events: none; }
  .copy { position: absolute; }
</style>
