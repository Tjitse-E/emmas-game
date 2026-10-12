<script lang="ts">
  import { beamState } from './moonbeam.svelte.ts';
  import { beamPolygon } from '../platform/geometry.ts';
</script>

{#if beamState.rect}
  {@const r = beamState.rect}
  <div class="beam" aria-hidden="true" style:clip-path={beamPolygon(r)}></div>
  <div class="pool" aria-hidden="true" style:left="{r.x}px" style:top="{r.y + r.h - 30}px" style:width="{r.w}px"></div>
{/if}

<style>
  .beam { position: absolute; inset: 0; z-index: 800; pointer-events: none;
    background: linear-gradient(rgba(255, 250, 214, 0), rgba(255, 250, 214, .42)); animation: glow 2.4s ease-in-out infinite; }
  .pool { position: absolute; height: 60px; z-index: 800; pointer-events: none; border-radius: 50%;
    background: radial-gradient(closest-side, rgba(255, 250, 214, .55), rgba(255, 250, 214, 0)); animation: glow 2.4s ease-in-out infinite; }
  @keyframes glow { 50% { opacity: .6; } }
</style>
