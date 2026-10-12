<script lang="ts">
  // The glowing path of the lantern walk (plan N3, N17): from under the lantern to the stable gate, a soft yellow
  // glow with drifting firefly dots. It pulses brighter while a baby is dragged. Never a touch target.
  import { PATH, pathD } from './geometry.ts';

  let { bright = false }: { bright?: boolean } = $props();
  const d = pathD();
  const flies = PATH.slice(0, 7).map((p, i) => ({ x: p.x + (i % 2 ? 14 : -10), y: p.y - 26 - (i % 3) * 8, delay: i * 0.37 }));
</script>

<svg class="path" class:bright viewBox="0 0 1180 820" width="1180" height="820" aria-hidden="true">
  <defs>
    <filter id="gp-glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10" /></filter>
  </defs>
  <path class="halo" {d} fill="none" stroke="#ffe27a" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" filter="url(#gp-glow)" />
  <path {d} fill="none" stroke="#f6d48a" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
  <path {d} fill="none" stroke="#fff4c4" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 22" opacity="0.9" />
  {#each flies as f, i (i)}
    <circle class="fly" cx={f.x} cy={f.y} r="5" fill="#fffbd0" style:animation-delay="{f.delay}s" />
  {/each}
</svg>

<style>
  .path { position: absolute; left: 0; top: 0; pointer-events: none; }
  .halo { opacity: 0.55; transition: opacity calc(300ms * var(--speed, 1)); }
  .bright .halo { opacity: 0.95; animation: gp-pulse calc(800ms * var(--speed, 1)) ease-in-out infinite; }
  .fly { animation: gp-fly calc(2600ms * var(--speed, 1)) ease-in-out infinite; }
  @keyframes gp-pulse { 50% { opacity: 0.6; } }
  @keyframes gp-fly { 0%, 100% { transform: translate(0, 0); opacity: 0.3; } 50% { transform: translate(8px, -12px); opacity: 1; } }
</style>
