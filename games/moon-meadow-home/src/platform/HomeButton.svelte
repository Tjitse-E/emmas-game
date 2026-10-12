<script lang="ts">
  // Round home button back to the picture menu. VITE_MENU_URL overrides the target; an empty value hides it.
  import { press } from './input.ts';
  import { audio } from '../audio/index.ts';

  const menu: string = import.meta.env.VITE_MENU_URL ?? '../../index.html';
  function goHome(): void {
    audio.stop();
    window.location.href = menu;
  }
</script>

{#if menu}
  <button class="home" aria-label="Home" use:press={goHome}>
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6 L44 23 L38 23 L38 42 L10 42 L10 23 L4 23 Z" fill="#ff8fc7" stroke="#c2468a" stroke-width="3" stroke-linejoin="round" />
      <rect x="19" y="28" width="10" height="14" rx="3" fill="#fff6dd" stroke="#c2468a" stroke-width="2.5" />
      <circle cx="24" cy="19" r="3.2" fill="#ffd25e" />
    </svg>
  </button>
{/if}

<style>
  .home { position: absolute; right: 16px; top: 16px; width: 80px; height: 80px; z-index: 960; border-radius: 50%; background: #fff; border: 5px solid #ffd25e; box-shadow: 0 5px 0 #d9a23a, 0 8px 16px rgba(0, 0, 0, .18); display: flex; align-items: center; justify-content: center; }
  .home svg { width: 46px; height: 46px; pointer-events: none; }
</style>
