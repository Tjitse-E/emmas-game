<script lang="ts">
  import { onMount } from 'svelte';
  import { audio } from '../audio/index.ts';
  import { bootState } from './boot.svelte.ts';

  // Elizabeth asks once, and only after Play (audio is locked before that).
  onMount(() => { if (bootState.started && audio.hasClip('platform-turn')) void audio.say('platform-turn'); });
</script>

<div class="turn" role="img" aria-label="Turn the iPad">
  <svg viewBox="0 0 200 200" width="320" height="320" aria-hidden="true">
    <rect x="62" y="30" width="76" height="110" rx="10" fill="#fff6fb" stroke="#ffd25e" stroke-width="6" opacity=".4" />
    <g class="tilt">
      <rect x="45" y="62" width="110" height="76" rx="10" fill="#fff6fb" stroke="#ffd25e" stroke-width="6" />
      <circle cx="146" cy="100" r="4" fill="#ffd25e" />
    </g>
    <path d="M150 40 A60 60 0 0 1 172 96" fill="none" stroke="#ff8fc7" stroke-width="8" stroke-linecap="round" />
    <path d="M160 92 L173 104 L182 88" fill="none" stroke="#ff8fc7" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</div>

<style>
  .turn { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; background: #1a1d52; }
  .tilt { transform-origin: 100px 100px; animation: tilt 2.4s ease-in-out infinite; }
  @keyframes tilt { 0%, 30% { transform: rotate(-90deg); } 60%, 100% { transform: rotate(0deg); } }
</style>
