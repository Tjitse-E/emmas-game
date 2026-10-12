<script lang="ts">
  // The star slider under a gem row: sliding the star past slot i calls onpass(i); reaching the end calls ondone.
  // Positions are stage pixels (platform's clientToStage), so it works at every scale.
  import { clientToStage } from '../platform/stage.svelte.ts';
  import { sliderIndex } from './geometry.ts';

  let { count, onpass, ondone, width = 110 }: { count: number; onpass: (i: number) => void; ondone: () => void; width?: number } = $props();

  let x = $state(0);
  let held = -1;
  let last = $state(-1);
  let startX = 0;
  const STAR = 80;
  const centres = $derived(Array.from({ length: count }, (_, i) => (i + 0.5) * width));
  const stageX = (e: PointerEvent): number => clientToStage(e.clientX, e.clientY).x;

  function down(e: PointerEvent): void {
    if (held !== -1) return;
    e.preventDefault();
    held = e.pointerId;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* element gone */ }
    startX = stageX(e) - x;
    last = -1;
    pass();
  }
  function pass(): void {
    const centre = x + STAR / 2;
    const i = sliderIndex(centre, centres);
    if (i >= 0 && i !== last && Math.abs(centres[i] - centre) < width / 2) { last = i; onpass(i); }
  }
  function move(e: PointerEvent): void {
    if (e.pointerId !== held) return;
    x = Math.max(0, Math.min(count * width - STAR, stageX(e) - startX));
    pass();
  }
  function up(e: PointerEvent): void {
    if (e.pointerId !== held) return;
    held = -1;
    const end = x >= count * width - STAR - width / 2;
    x = 0;
    if (end) ondone();
  }
</script>

<div class="track" style:width="{count * width}px">
  {#each centres as c, i (i)}<span class="tick" style:left="{c}px"></span>{/each}
  <span class="star" role="slider" tabindex="-1" aria-valuemin={0} aria-valuemax={count} aria-valuenow={Math.max(0, last + 1)} data-touch aria-label="star" style:transform="translateX({x}px)"
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 L62 38 L96 38 L68 58 L78 92 L50 72 L22 92 L32 58 L4 38 L38 38 Z" fill="#ffd25e" stroke="#e0a520" stroke-width="5" stroke-linejoin="round" /></svg>
  </span>
</div>

<style>
  .track { position: relative; height: 72px; border-radius: 36px; background: #efe6ff; border: 4px solid #d6c6ff; margin: 0 auto; touch-action: none; }
  .tick { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #c9b8ff; }
  .star { position: absolute; left: 0; top: -8px; width: 80px; height: 80px; touch-action: none; display: block; }
  .star svg { width: 100%; height: 100%; pointer-events: none; }
</style>
