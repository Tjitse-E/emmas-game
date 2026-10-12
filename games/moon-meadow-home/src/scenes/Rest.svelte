<script lang="ts">
  // The end of every visit (goodnight, idle, a long hide; R45): a night meadow with one big moon.
  // A tap on the moon starts the next visit. No spoken goal on purpose: it is bedtime (autoplay lists rest in SILENT_OK).
  import { onMount } from 'svelte';
  import Picture from '../art/Picture.svelte';
  import { press } from '../platform/input.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { wakeVisit } from '../game.svelte.ts';

  let { params: _params }: { params: Record<string, unknown> } = $props();
  let busy = $state(false);

  const STARS: [number, number, number][] = [
    [120, 90, 5], [260, 160, 3], [380, 70, 4], [820, 110, 5], [960, 60, 3], [1060, 170, 4], [700, 60, 3], [180, 260, 3], [1010, 300, 3],
  ];

  async function wake(): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      await wakeVisit();
    } catch (e) {
      console.error('[rest] the next visit did not start', e);
      busy = false;
    }
  }

  onMount(() => {
    setBands('#1d1b4f', '#2c4a3e');
    return registerSceneHook('rest', { answer: () => wake(), wrong: () => {}, idle: () => {}, target: () => 'moon' });
  });
</script>

<div class="rest" aria-label="night meadow">
  {#each STARS as [x, y, r], i (i)}
    <span class="star" style="left:{x}px;top:{y}px;width:{r * 2}px;height:{r * 2}px;animation-delay:{(i % 4) * 0.6}s"></span>
  {/each}
  <div class="hill back"></div>
  <div class="hill front"></div>
  <button class="moon" class:busy aria-label="moon" use:press={() => void wake()}>
    <Picture id="item-moon" size={260} label="">
      <svg viewBox="0 0 100 100" width="260" height="260" aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="#fff6c8" />
        <circle cx="66" cy="40" r="36" fill="#1d1b4f" />
        <circle cx="34" cy="46" r="3" fill="#6b5a2e" />
        <path d="M27 60 q8 7 16 0" stroke="#6b5a2e" stroke-width="3" fill="none" stroke-linecap="round" />
      </svg>
    </Picture>
  </button>
</div>

<style>
  .rest { position: absolute; inset: 0; overflow: hidden; background: linear-gradient(#1d1b4f, #2d3a6e 62%, #2c4a3e); }
  .star { position: absolute; border-radius: 50%; background: #fff6c8; opacity: 0.8; animation: twinkle 3.2s ease-in-out infinite; }
  .hill { position: absolute; border-radius: 50%; }
  .hill.back { left: -120px; right: 380px; top: 610px; height: 420px; background: #2f5546; }
  .hill.front { left: 420px; right: -160px; top: 650px; height: 400px; background: #2c4a3e; }
  .moon {
    position: absolute; left: 460px; top: 200px; width: 260px; height: 260px; padding: 0; border: 0; border-radius: 50%;
    background: none; filter: drop-shadow(0 0 22px rgba(255, 246, 200, 0.55));
    display: grid; place-items: center; cursor: pointer; touch-action: manipulation;
    animation: glow 2.4s ease-in-out infinite;
  }
  .moon.busy { animation: none; transform: scale(1.1); transition: transform 0.4s; }
  @keyframes glow { 50% { transform: scale(1.06); } }
  @keyframes twinkle { 50% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) { .moon, .star { animation: none; } }
</style>
