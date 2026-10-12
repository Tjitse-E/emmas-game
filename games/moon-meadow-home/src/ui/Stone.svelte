<script lang="ts">
  // An answer stone: dice dots up to six, a loose scatter above (never a ten-frame), a numeral, or both.
  import type { StoneSpec } from '../core/maths/stones.ts';
  import { dicePoints, dotSize, scatterPoints } from './geometry.ts';

  let { spec, size = 108 }: { spec: Pick<StoneSpec, 'value' | 'face' | 'layout' | 'tint'>; size?: number } = $props();

  const TINTS = ['#ffb340', '#ff8f6b', '#ff7fb0', '#ffd24a', '#ff9f45', '#f78bd0', '#ffc061'];
  const OUTLINES = ['#b9772a', '#c0573a', '#c04a7e', '#b8901c', '#bd6a1f', '#b4519a', '#bf8a2a'];
  const dots = $derived(spec.face === 'numeral' ? [] : spec.layout === 'dice' && spec.value <= 6 ? dicePoints(spec.value) : scatterPoints(spec.value, spec.value));
  const dot = $derived(dotSize(spec.value));
</script>

<span class="stone" aria-hidden="true" style:--size="{size}px" style:--tint={TINTS[spec.tint % TINTS.length]}
  style:--line={OUTLINES[spec.tint % OUTLINES.length]} style:--dot="{dot}%">
  {#each dots as d, i (i)}<i style:left="{d.x}%" style:top="{d.y}%"></i>{/each}
  {#if spec.face !== 'dots'}<b class:small={spec.face === 'dots-numeral'}>{spec.value}</b>{/if}
</span>

<style>
  .stone { position: relative; display: block; width: var(--size); height: var(--size); border-radius: 46% 54% 50% 50%;
    background: radial-gradient(circle at 30% 22%, #ffffff8c, #ffffff00 42%), var(--tint); border: 4px solid var(--line); pointer-events: none; }
  i { position: absolute; width: var(--dot); height: var(--dot); transform: translate(-50%, -50%); border-radius: 50%; background: #5a3a1a; }
  b { position: absolute; inset: 0; display: grid; place-items: center; font: 700 calc(var(--size) * 0.5) / 1 'Andika', sans-serif; color: #3b2a1a; }
  /* The numeral badge hangs below the stone, so it never hides a dot. */
  b.small { inset: auto; left: 50%; top: 86%; transform: translateX(-50%); min-width: 44%; height: 36%; font-size: calc(var(--size) * 0.26);
    background: #fff; border: 3px solid var(--line); border-radius: 40%; padding: 0 6px; }
</style>
