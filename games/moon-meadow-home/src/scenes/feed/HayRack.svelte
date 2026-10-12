<script lang="ts">
  // The hay rack (docs/v3/next/plan.md F5, N21): slots in frames of ten (5 by 2), a second frame for wholes over 10,
  // the shown part already in as bundles. A dropped pile fills the next slots in a second colour, so crossing ten
  // shows as in the nest. A pile that is too big spills over the end; one that is too small leaves gaps.
  import { dropTarget } from '../../platform/input.ts';
  import type { EggTask } from '../../core/maths/eggs.ts';
  import { rackSlots } from '../../core/heartbeat/feed.ts';
  import HayBundle from './HayBundle.svelte';

  let { task, filled = null, mood = null, solved = false }: {
    task: EggTask; filled?: number | null; mood?: 'over' | 'short' | null; solved?: boolean;
  } = $props();

  const slots = $derived(rackSlots(task, filled));
  const frames = $derived(slots.frames);
  const spill = $derived(slots.spill);
</script>

<div class="rack" class:solved class:over={mood === 'over'} class:short={mood === 'short'} role="img" aria-label="hay rack"
  use:dropTarget={{ id: 'hay-rack' }}>
  <div class="frames">
    {#each frames as f, fi (fi)}
      <div class="frame" class:full={f.every((s) => s >= 0)}>
        {#each f as s, si (si)}
          <span class="slot" class:in={s === 0} class:added={s === 1}>{#if s >= 0}<HayBundle size={40} />{/if}</span>
        {/each}
      </div>
    {/each}
  </div>
  {#if spill > 0}
    <div class="spill" aria-hidden="true">{#each Array.from({ length: spill }) as _, i (i)}<HayBundle size={34} />{/each}</div>
  {/if}
</div>

<style>
  .rack { position: relative; width: 600px; min-height: 250px; padding: 34px 20px 26px; box-sizing: border-box; display: grid; place-items: center;
    background: linear-gradient(#8a5a2b, #6e4520); border-radius: 26px; border: 8px solid #5a3818; box-shadow: 0 8px 0 #3e2610, inset 0 0 0 4px #a8743c; }
  .rack::before { content: ''; position: absolute; left: 22px; right: 22px; top: 12px; height: 10px; border-radius: 5px; background: #c48a4a; }
  .frames { display: flex; gap: 20px; justify-content: center; }
  .frame { display: grid; grid-template-columns: repeat(5, 48px); grid-auto-rows: 46px; gap: 6px; padding: 8px; border-radius: 16px;
    background: #4a2e14; box-shadow: inset 0 3px 0 #2e1c0b; transition: box-shadow calc(300ms * var(--speed, 1)); }
  .frame.full { box-shadow: inset 0 3px 0 #2e1c0b, 0 0 0 4px #ffe08a, 0 0 22px #ffd45e; }
  .slot { display: grid; place-items: center; border-radius: 10px; background: #2e1c0b; }
  .slot.in { background: #ffe7a8; }
  .slot.added { background: #ffc6de; animation: drop-in calc(260ms * var(--speed, 1)) ease-out; }
  @keyframes drop-in { 0% { transform: translateY(-16px); opacity: 0; } 100% { transform: none; opacity: 1; } }
  .spill { position: absolute; right: -8px; bottom: -26px; display: flex; gap: 2px; transform: rotate(-6deg); }
  .over .frames { animation: wobble calc(500ms * var(--speed, 1)) 2; }
  .short .frame:last-child { box-shadow: inset 0 3px 0 #2e1c0b, 0 0 0 4px #bfe3ff; }
  .solved { box-shadow: 0 8px 0 #3e2610, inset 0 0 0 4px #a8743c, 0 0 40px #ffe08a; }
  @keyframes wobble { 25% { transform: rotate(-1.5deg); } 75% { transform: rotate(1.5deg); } }
</style>
