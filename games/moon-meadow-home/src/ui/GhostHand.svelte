<script lang="ts">
  import { onMount } from 'svelte';
  import { ghostState, ghost } from './ghost-hand.svelte.ts';
  import { onTouch } from '../platform/touch.ts';
  import { dur } from '../platform/timing.ts';

  onMount(() => onTouch(() => ghost.hide()));
</script>

<div class="ghost" class:on={ghostState.visible} class:pressed={ghostState.pressed} aria-hidden="true"
  style:translate="{ghostState.x}px {ghostState.y}px" style:transition-duration="{dur(ghostState.moveMs)}ms, 200ms">
  <svg viewBox="0 0 64 96" width="64" height="96">
    <g fill="#ffffff" stroke="#6b4a8a" stroke-width="3" stroke-linejoin="round">
      <rect x="10" y="4" width="13" height="50" rx="6.5" />
      <rect x="22" y="30" width="12" height="30" rx="6" />
      <rect x="33" y="33" width="12" height="28" rx="6" />
      <rect x="44" y="37" width="11" height="26" rx="5.5" />
      <path d="M8 46 Q8 40 14 40 L56 44 Q58 70 50 84 Q44 92 30 92 Q14 92 10 78 Z" />
    </g>
  </svg>
</div>

<style>
  .ghost { position: absolute; left: -16px; top: -4px; z-index: 900; pointer-events: none; opacity: 0;
    transition-property: translate, opacity; transition-timing-function: ease-in-out; }
  .ghost.on { opacity: .92; }
  .ghost svg { display: block; transform-origin: 16px 4px; transition: scale .12s; }
  .ghost.pressed svg { scale: .85; }
</style>
