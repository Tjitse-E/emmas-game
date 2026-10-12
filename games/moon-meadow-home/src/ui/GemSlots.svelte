<script lang="ts" module>
  export type SlotView = { gem: string | null; gift: boolean; kind: 'vowel' | 'consonant' | 'any'; crown: boolean; hum: boolean; glow: boolean };
</script>

<script lang="ts">
  // A row of gem slots. Each slot is a drop target `slot-<i>` (or `<prefix>-<i>`) for platform's use:drag.
  // Editable rows (gold names) have a plus slot and a remove handle on each empty slot: tap it or drag it off the row.
  import Gem from './Gem.svelte';
  import { press, drag, dropTarget } from '../platform/input.ts';
  import { slotTargetId } from './geometry.ts';

  let { slots, editable = false, prefix = 'slot', slotEls = $bindable([]), onplus, onremove, onslottap }: {
    slots: SlotView[]; editable?: boolean; prefix?: string; slotEls?: HTMLElement[];
    onplus?: () => void; onremove?: (i: number) => void; onslottap?: (i: number) => void;
  } = $props();
</script>

<div class="slots">
  {#each slots as s, i (i)}
    <div class="cell">
      <button class="slot {s.kind}" class:hum={s.hum} class:glow={s.glow} class:full={s.gem !== null} data-touch
        aria-label="slot {i + 1}" bind:this={slotEls[i]}
        use:dropTarget={{ id: slotTargetId(i, prefix) }} use:press={() => onslottap?.(i)}>
        {#if s.gem}<Gem g={s.gem} gift={s.gift} crown={s.crown && i === 0} size={76} />{/if}
      </button>
      {#if editable && !s.gem && slots.length > 2}
        <button class="drop-off" data-touch aria-label="remove slot {i + 1}"
          use:drag={{ data: i, onTap: () => onremove?.(i), onDrop: (d) => { if (d.targetId === null) onremove?.(i); } }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12 H18" stroke="#8a6ad8" stroke-width="4" stroke-linecap="round" /></svg>
        </button>
      {/if}
    </div>
  {/each}
  {#if editable && slots.length < 8}
    <button class="slot plus" data-touch aria-label="add slot" use:press={() => onplus?.()}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" stroke="#8a6ad8" stroke-width="4" stroke-linecap="round" /></svg>
    </button>
  {/if}
</div>

<style>
  .slots { display: flex; gap: 14px; justify-content: center; align-items: center; touch-action: none; }
  .cell { position: relative; }
  .slot { width: 96px; height: 96px; border-radius: 24px; border: 4px dashed #b9a6d9; background: #fbf7ff;
    display: grid; place-items: center; position: relative; }
  .slot.full { border-style: solid; }
  .slot.vowel { border-color: #e0559c; background: #fff3f9; }
  .slot.consonant { border-color: #4f93d6; background: #f2f8ff; }
  .slot.plus { border-style: solid; border-color: #c9b8ff; }
  .slot.plus svg { width: 44px; height: 44px; }
  .slot.hum { animation: hum calc(250ms * var(--speed, 1)) linear 6; }
  .slot.glow { animation: pulse calc(900ms * var(--speed, 1)) ease-in-out infinite; }
  .drop-off { position: absolute; top: -26px; right: -26px; width: 64px; height: 64px; border-radius: 50%; background: #fff;
    border: 3px solid #b9a6d9; display: grid; place-items: center; z-index: 2; }
  .drop-off svg { width: 28px; height: 28px; pointer-events: none; }
  @keyframes hum { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
  @keyframes pulse { 50% { transform: scale(1.06); } }
</style>
