<script lang="ts">
  // Emma's crown (Task A4): 88 x 88 at stage (24, 24). A small dot shows a jewel waiting (Task B2), and one
  // coloured ribbon hangs from it per title (Task C5). Tapping it opens what the scene gives `ontap`.
  import Picture from '../art/Picture.svelte';
  import { press } from '../platform/input.ts';
  import { svg } from './places-svg.ts';

  let { jewels = 0, ribbons = [], ontap = () => {} }: { jewels?: number; ribbons?: string[]; ontap?: () => void } = $props();
</script>

<button class="crown" aria-label="crown" use:press={ontap}>
  <Picture id="item-crown-emma" size={64} label="">
    <span class="fallback">{@html svg('crown')}</span>
  </Picture>
  {#each ribbons.slice(0, 6) as colour, i (i)}
    <span class="ribbon" style:left="{14 + i * 10}px" style:background={colour}></span>
  {/each}
  {#if jewels > 0}<span class="dot" aria-hidden="true"></span>{/if}
</button>

<style>
  .crown { position: absolute; left: 24px; top: 24px; width: 88px; height: 88px; z-index: 950; padding: 0; border: 0;
    background: none; display: flex; align-items: center; justify-content: center; touch-action: none; }
  .fallback, .fallback :global(svg) { display: block; width: 64px; height: 64px; }
  .ribbon { position: absolute; top: 70px; width: 8px; height: 18px; border-radius: 0 0 4px 4px; pointer-events: none; }
  .dot { position: absolute; right: 8px; top: 8px; width: 18px; height: 18px; border-radius: 50%; background: #ff6fae;
    border: 3px solid #fff; pointer-events: none; }
  .crown:global(.press-down) { transform: scale(0.94); }
</style>
