<script lang="ts">
  // An egg with its skin, cracks and wobble (contracts C9 EggProps). `kind` is a breed; callers pass
  // BREED_OF[eggKind]. Without the picture it draws a plain egg in the breed's colour.
  import Picture from './Picture.svelte';
  import type { BreedId } from './manifest.ts';

  let { kind, skin = null, cracks = 0, wobble = false, size, label = 'egg' }:
    { kind: BreedId; skin?: 'golden' | 'speckled' | null; cracks?: 0 | 1 | 2 | 3; wobble?: boolean; size: number; label?: string } = $props();
  const id = $derived(skin ? `egg-${skin}` : `egg-${kind}`);

  const SHELL: Record<BreedId, string> = {
    moon: '#e6dcff', nestling: '#fff1d6', pebble: '#dfe3ea', cosy: '#ffe2cf', berry: '#ffd6e6',
    snow: '#f4f8ff', bubble: '#d6f1ff', post: '#f1e2c8', sparkle: '#fff3c4',
  };
  const fill = $derived(skin === 'golden' ? '#f7d77c' : (SHELL[kind] ?? SHELL.moon));
</script>

<div class="egg" class:wobble role="img" aria-label={label} style="width:{size}px;height:{size}px">
  <Picture {id} {size} label="">
    <svg class="shell" viewBox="0 0 190 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true" width={size} height={size}>
      <path d="M95 10 C150 10 180 110 180 150 C180 205 142 232 95 232 C48 232 10 205 10 150 C10 110 40 10 95 10 Z"
        fill={fill} stroke="#9a7aa8" stroke-width="5" />
      <ellipse cx="62" cy="70" rx="14" ry="26" fill="#ffffff" opacity="0.55" />
      {#if skin === 'speckled'}
        {#each [[70, 120], [120, 90], [130, 160], [80, 185], [105, 135], [52, 150]] as [x, y] (x * 1000 + y)}
          <circle cx={x} cy={y} r="8" fill="#b88a6a" opacity="0.7" />
        {/each}
      {/if}
    </svg>
  </Picture>
  <svg viewBox="0 0 190 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <g fill="none" stroke="#7a4c78" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
      {#if cracks >= 1}<path d="M70 52 L86 70 L76 84 L94 98" />{/if}
      {#if cracks >= 2}<path d="M150 96 L134 106 L142 120 L124 128" />{/if}
      {#if cracks >= 3}<path d="M20 120 L40 112 L46 128 L66 118 L80 126" />{/if}
    </g>
  </svg>
</div>

<style>
  .egg { position: relative; display: flex; align-items: center; justify-content: center; }
  .egg > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .shell { display: block; }
  .wobble { animation: egg-wobble 1.2s ease-in-out infinite; transform-origin: 50% 90%; }
  @keyframes egg-wobble { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-6deg); } 40% { transform: rotate(5deg); } 60% { transform: rotate(-3deg); } 80% { transform: rotate(2deg); } }
</style>
