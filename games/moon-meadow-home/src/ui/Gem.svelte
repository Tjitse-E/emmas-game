<script lang="ts">
  // One letter gem: pink for vowels, blue for consonants, half and half for y. A gift gem twinkles gold.
  import { isVowelGem } from '../core/naming/sounds.ts';

  let { g, gift = false, crown = false, glow = false, size = 72 }:
    { g: string; gift?: boolean; crown?: boolean; glow?: boolean; size?: number } = $props();

  const kind = $derived(g.toLowerCase() === 'y' ? 'both' : isVowelGem(g) ? 'vowel' : 'consonant');
  // A split digraph a-e prints as a_e; an ending -es as _es.
  const text = $derived(g.includes('-') ? g.replace('-', '_') : g);
  const long = $derived(text.length > 2);
</script>

<span class="gem {kind}" class:gift class:glow class:long style:--size="{size}px" aria-hidden="true">
  {#if crown}
    <svg class="crown" viewBox="0 0 40 24"><path d="M2 22 L6 6 L14 14 L20 2 L26 14 L34 6 L38 22 Z" fill="#ffd25e" stroke="#c98a14" stroke-width="2" stroke-linejoin="round" /></svg>
  {/if}
  <span class="t">{text}</span>
</span>

<style>
  .gem { position: relative; display: inline-grid; place-items: center; width: var(--size); height: var(--size);
    border-radius: 22%; font: 700 calc(var(--size) * 0.5) / 1 'Andika', sans-serif; color: #3b2a4a; pointer-events: none; }
  .gem.long { font-size: calc(var(--size) * 0.36); }
  .vowel { background: radial-gradient(circle at 30% 22%, #ffffffb0, #ffffff00 45%), #ffc4e1; border: 4px solid #e0559c; }
  .consonant { background: radial-gradient(circle at 30% 22%, #ffffffb0, #ffffff00 45%), #c8e4ff; border: 4px solid #4f93d6; }
  .both { background: radial-gradient(circle at 30% 22%, #ffffffb0, #ffffff00 45%), linear-gradient(135deg, #ffc4e1 50%, #c8e4ff 50%); border: 4px solid #8a6ad8; }
  .gift { box-shadow: 0 0 0 4px #ffe68a; }
  .gift::after { content: ''; position: absolute; inset: -8px; border-radius: 26%; border: 3px dashed #ffd25e;
    animation: tw calc(1600ms * var(--speed, 1)) ease-in-out infinite; }
  .glow { animation: pulse calc(900ms * var(--speed, 1)) ease-in-out infinite; }
  .crown { position: absolute; top: calc(var(--size) * -0.34); width: 60%; }
  .t { position: relative; }
  @keyframes tw { 50% { opacity: 0.3; } }
  @keyframes pulse { 50% { transform: scale(1.08); } }
</style>
