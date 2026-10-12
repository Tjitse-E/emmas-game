<script lang="ts">
  // The big Play button. Its pointerdown unlocks audio inside the touch (iPad Safari needs the gesture),
  // its press starts the game. Until boot is ready a soft moon shows instead of the button.
  import { press } from './input.ts';
  import { bootState, startGame } from './boot.svelte.ts';
  import { audio } from '../audio/index.ts';
</script>

<div class="gate">
  {#if bootState.ready}
    <button class="play" aria-label="Play" onpointerdown={() => { void audio.unlock(); }} use:press={() => { void startGame(); }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d="M30 18L84 50L30 82Z" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round" />
      </svg>
    </button>
  {:else}
    <svg class="moon" viewBox="0 0 100 100" width="180" height="180" role="img" aria-label="loading">
      <circle cx="50" cy="50" r="34" fill="#fffef2" />
      <circle cx="64" cy="42" r="30" fill="#2f2a7a" />
    </svg>
  {/if}
</div>

<style>
  .gate { position: absolute; inset: 0; z-index: 950; display: grid; place-items: center; background: radial-gradient(ellipse at 50% 30%, #5a3f9e, #26296b 60%, #11163d); }
  .play { width: 220px; height: 220px; border-radius: 50%; background: #ff5fae; box-shadow: 0 12px 0 #b4458a, 0 20px 40px rgba(0, 0, 0, .35); display: grid; place-items: center; animation: pulse 1.6s ease-in-out infinite; }
  .play svg { width: 120px; height: 120px; pointer-events: none; }
  .moon { animation: breathe 2.4s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: scale(1.06); } }
  @keyframes breathe { 50% { opacity: .6; } }
</style>
