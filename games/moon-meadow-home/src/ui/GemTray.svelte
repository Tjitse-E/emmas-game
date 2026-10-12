<script lang="ts">
  // The gem tray. A gem is dragged with platform's use:drag onto a drop target (a GemSlots slot) or tapped to hear it.
  // Gems stay in the tray when used, so a gold name may use a letter twice. The tray wraps into rows of up to 12.
  import Gem from './Gem.svelte';
  import { drag } from '../platform/input.ts';

  let { gems, ondrop, ontap, disabled = false, size = 76 }: {
    gems: string[]; ondrop: (gem: string, target: string | null) => void; ontap: (gem: string) => void;
    disabled?: boolean; size?: number;
  } = $props();
</script>

<div class="tray">
  {#each gems as g, i (g + ':' + i)}
    <button class="cell" data-touch aria-label="gem {g}"
      use:drag={{ data: g, disabled, onDrop: (d) => ondrop(g, d.targetId), onTap: () => ontap(g) }}>
      <Gem {g} {size} />
    </button>
  {/each}
</div>

<style>
  .tray { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-width: 1120px; margin: 0 auto; touch-action: none; }
  .cell { display: inline-block; touch-action: none; min-width: 64px; min-height: 64px; }
</style>
