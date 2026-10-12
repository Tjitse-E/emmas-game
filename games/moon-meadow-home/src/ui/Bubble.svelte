<script lang="ts">
  // A who's-waiting bubble (Task A4, spec 2.9): a round picture that floats slowly. Never text.
  // `picture` is an art id; without art it draws the places fallback shape. `babyFace` shows who is waiting.
  import Picture from '../art/Picture.svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import { press } from '../platform/input.ts';
  import { fallbackFor, svg } from './places-svg.ts';
  import type { BubbleKind } from '../core/places/bubbles.ts';
  import type { BabyView } from '../core/places/types.ts';

  let { kind, x, y, picture, babyFace = null, ontap }:
    { kind: BubbleKind; x: number; y: number; picture: string; babyFace?: BabyView | null; ontap: () => void } = $props();

  const delay = $derived(-((x * 7 + y * 3) % 3000));
</script>

<button class="bubble" aria-label="bubble {kind}" style:left="{x - 60}px" style:top="{y - 60}px" use:press={ontap}>
  <span class="float" style:animation-delay="{delay}ms">
    <span class="glass">{@html svg('bubble')}</span>
    <span class="pic">
      <Picture id={picture} size={72} label="">
        <span class="fallback">{@html fallbackFor(picture)}</span>
      </Picture>
    </span>
    {#if babyFace}
      <span class="face">
        <Unicorn breed={babyFace.breed} stage={babyFace.stage} colours={babyFace.colours} traits={babyFace.traits} height={44} headOnly label="" />
      </span>
    {/if}
  </span>
</button>

<style>
  .bubble { position: absolute; width: 120px; height: 120px; padding: 0; border: 0; background: none; touch-action: none; }
  .float { position: absolute; inset: 0; animation: float calc(3000ms * var(--speed, 1)) ease-in-out infinite alternate; }
  .glass, .glass :global(svg) { position: absolute; inset: 0; width: 120px; height: 120px; pointer-events: none; }
  .pic { position: absolute; left: 24px; top: 24px; width: 72px; height: 72px; pointer-events: none; }
  .fallback, .fallback :global(svg) { display: block; width: 72px; height: 72px; }
  .face { position: absolute; right: -6px; bottom: -6px; pointer-events: none; }
  .bubble:global(.press-down) .float { opacity: 0.8; }
  @keyframes float { from { transform: translateY(-6px); } to { transform: translateY(6px); } }
</style>
