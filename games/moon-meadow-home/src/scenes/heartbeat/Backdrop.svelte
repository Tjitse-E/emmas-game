<script lang="ts">
  // A scene background from the art manifest, or a soft gradient while it is missing.
  import { artUrl, background } from '../../art/manifest.ts';

  let { id, top = '#cfe8ff', bottom = '#bfe8c4' }: { id: string; top?: string; bottom?: string } = $props();
  const bg = $derived(background(id));
</script>

<div class="backdrop" aria-hidden="true" style:background="linear-gradient({top}, {bottom})">
  {#if bg}<img src={artUrl(bg.src)} alt="" draggable="false" />{/if}
</div>

<style>
  .backdrop { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
