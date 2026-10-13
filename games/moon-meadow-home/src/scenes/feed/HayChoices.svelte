<script lang="ts">
  // The hay to choose from (docs/v3/next/plan.md F5, N21). Scaffold 1: a pile of N small bundles laid out like a
  // little ten-frame (5 a row); scaffold 2: the same pile with its numeral; scaffold 3: a hay cart with its numeral.
  // A pile is dragged to the hay rack. Review 2026-10-13: bundles are 60 stage px (at least 56) so she can count them by
  // touching each one; three piles (scaffold 1) lie in rows of five, four piles (scaffold 2) in rows of three, so
  // every scaffold fits the pile tray (x 40 to 1140).
  import { drag } from '../../platform/input.ts';
  import type { StoneSpec } from '../../core/maths/stones.ts';
  import HayBundle from './HayBundle.svelte';

  let { choices, scaffold, disabled = false, hidden = null, onplace }: {
    choices: StoneSpec[]; scaffold: 1 | 2 | 3; disabled?: boolean; hidden?: string | null; onplace: (id: string) => void;
  } = $props();
  /** Bundle size in stage px and bundles per row. */
  const BUNDLE = 60;
  const cols = $derived(choices.length <= 3 ? 5 : 3);
</script>

<div class="choices" class:carts={scaffold === 3} style:--b="{BUNDLE}px" style:--cols={cols}>
  {#each choices as c (c.id)}
    <button class="pile" class:gone={hidden === c.id} data-touch aria-label="hay {c.value}" data-choice={c.id}
      use:drag={{ data: c.id, disabled, onDrop: (d) => { if (d.targetId === 'hay-rack') onplace(c.id); } }}>
      {#if scaffold === 3}
        <svg class="cart" viewBox="0 0 120 90" aria-hidden="true">
          <path d="M18 34 Q30 6 60 10 Q92 6 104 34 Z" fill="#f2c45a" stroke="#b9852a" stroke-width="3" />
          <path d="M34 30 L40 14 M54 30 L56 11 M72 30 L74 12 M90 30 L86 16" stroke="#d9a53a" stroke-width="2.5" />
          <rect x="10" y="32" width="100" height="30" rx="8" fill="#c98a4b" stroke="#7a4a1f" stroke-width="3" />
          <circle cx="32" cy="70" r="13" fill="#8a5a2b" stroke="#5a3818" stroke-width="3" /><circle cx="32" cy="70" r="4" fill="#e9b77c" />
          <circle cx="88" cy="70" r="13" fill="#8a5a2b" stroke="#5a3818" stroke-width="3" /><circle cx="88" cy="70" r="4" fill="#e9b77c" />
        </svg>
      {:else}
        <span class="heap" aria-hidden="true">
          {#each Array.from({ length: c.value }) as _, i (i)}<HayBundle size={BUNDLE} />{/each}
        </span>
      {/if}
      {#if scaffold >= 2}<span class="num" aria-hidden="true">{c.value}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .choices { display: flex; gap: 16px; justify-content: center; align-items: flex-end; }
  .pile { min-width: 150px; min-height: 124px; box-sizing: border-box; padding: 10px 8px 8px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
    gap: 4px; background: #fff7e3; border: 4px solid #d9a53a; border-radius: 26px; touch-action: none; }
  .pile.gone { visibility: hidden; }
  .carts .pile { width: 176px; }
  .heap { display: grid; grid-template-columns: repeat(var(--cols), var(--b)); gap: 3px; justify-content: center; direction: ltr; }
  .cart { width: 120px; height: 90px; }
  .num { font: 700 34px / 1 'Andika', sans-serif; color: #5a3818; }
</style>
