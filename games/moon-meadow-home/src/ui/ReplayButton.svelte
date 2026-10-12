<script lang="ts">
  // Replay (Task A4): says the goal of the moment on screen again without changing its result.
  // Without a moment it calls the scene's own replay. 80 x 80 at stage (128, 24), next to the crown.
  import { press } from '../platform/input.ts';
  import { activeMoment } from './moment.ts';

  let { onreplay = () => {} }: { onreplay?: () => void } = $props();

  function replay(): void {
    const m = activeMoment();
    if (m) void m.replay();
    else onreplay();
  }
</script>

<button class="replay" aria-label="replay" use:press={replay}>
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M10 18h8l10-8v28l-10-8h-8z" fill="#b6dcf7" stroke="#4f7fa8" stroke-width="3" stroke-linejoin="round" />
    <path d="M33 17c3 4 3 10 0 14M37 13c5 6 5 16 0 22" fill="none" stroke="#4f7fa8" stroke-width="3" stroke-linecap="round" />
  </svg>
</button>

<style>
  .replay { position: absolute; left: 128px; top: 24px; width: 80px; height: 80px; z-index: 950; border-radius: 50%;
    background: #fff; border: 5px solid #b6dcf7; box-shadow: 0 5px 0 #7fa9cc; display: flex; align-items: center;
    justify-content: center; touch-action: none; padding: 0; }
  .replay svg { width: 48px; height: 48px; pointer-events: none; }
  .replay:global(.press-down) { transform: scale(0.94); }
</style>
