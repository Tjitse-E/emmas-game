<script lang="ts">
  // A row of answer stones to drag (platform's use:drag) onto one of `targets` (ids registered with use:dropTarget).
  // Heartbeat passes `stones` from planStones; places passes plain `values` and a maths scaffold for the faces.
  // A drop anywhere else glides the stone back and calls nothing. aria-label is `stone <value>`.
  import Stone from './Stone.svelte';
  import { drag } from '../platform/input.ts';
  import type { StoneFace, StoneSpec } from '../core/maths/stones.ts';

  let { values = [], stones = undefined, scaffold = 1, targets, ondrop, ontap, disabled = false, size = 108 }: {
    values?: number[]; stones?: StoneSpec[]; scaffold?: 1 | 2 | 3; targets: string[];
    ondrop: (value: number, target: string) => void; ontap?: (value: number) => void; disabled?: boolean; size?: number;
  } = $props();

  const face = $derived<StoneFace>(scaffold === 1 ? 'dots' : scaffold === 2 ? 'dots-numeral' : 'numeral');
  const list = $derived<StoneSpec[]>(stones ?? values.map((value, i) => ({ id: `stone-${i + 1}`, value, face, layout: value <= 6 ? 'dice' : 'scatter', tint: i % 7 })));
</script>

<div class="stones">
  {#each list as s (s.id)}
    <button class="cell" class:badge={s.face === 'dots-numeral'} style:--size="{size}px" data-touch aria-label="stone {s.value}"
      use:drag={{ data: s.value, disabled, onTap: () => ontap?.(s.value), onDrop: (d) => { if (d.targetId !== null && targets.includes(d.targetId)) ondrop(s.value, d.targetId); } }}>
      <Stone spec={s} {size} />
    </button>
  {/each}
</div>

<style>
  .stones { display: flex; flex-wrap: wrap; gap: 18px; justify-content: center; align-items: center; touch-action: none; }
  .cell { display: inline-block; touch-action: none; min-width: 64px; min-height: 64px; }
  .cell.badge { padding-bottom: calc(var(--size) * 0.24); }
</style>
