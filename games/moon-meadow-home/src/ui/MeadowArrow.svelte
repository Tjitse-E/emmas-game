<script lang="ts">
  // The glowing arrow home after a place's visible end (spec 2.5). One tap goes back to the meadow.
  import { press } from '../platform/input.ts';
  import { toMeadow } from '../places/nav.ts';

  let { onhome }: { onhome?: () => void } = $props();
</script>

<button class="arrow" aria-label="meadow" use:press={() => (onhome ? onhome() : void toMeadow())}>
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="#fff8d6" stroke="#ffd25e" stroke-width="6" />
    <path d="M58 26 L30 50 L58 74 M32 50 H76" fill="none" stroke="#7fbf7f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</button>

<style>
  .arrow { position: absolute; left: 24px; bottom: 24px; width: 112px; height: 112px; z-index: 900; border-radius: 50%;
    animation: glow calc(1400ms * var(--speed, 1)) ease-in-out infinite; }
  .arrow svg { width: 112px; height: 112px; pointer-events: none; }
  @keyframes glow { 50% { transform: scale(1.08); } }
</style>
