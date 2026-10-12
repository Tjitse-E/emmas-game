<script lang="ts">
  // A printed word (or short text) with sound dots under its graphemes. Sliding a finger along it plays each
  // grapheme it passes once (onsound). A silent unit (a current-step grapheme read from print) plays nothing.
  // Heart parts (R36, the e of 'the') get a soft heart glow, no dot, and play nothing.
  // A split digraph's tail e has no dot of its own: the vowel's dot plays the long sound.
  // dotsMs null (scaffold 3) or dots false hides the dots; without onsound the print is a plain panel.
  import type { PrintUnit } from '../core/heartbeat/wish.ts';
  import { unitHearts, unitGpcIndex } from '../core/heartbeat/print.ts';

  let { units = undefined, text = undefined, dotsMs = 500, dots = true, heart = undefined, glow = false, label = 'wish', size = 64, onsound = undefined }: {
    units?: PrintUnit[]; text?: string; dotsMs?: 500 | 300 | null; dots?: boolean; heart?: number[];
    glow?: boolean; label?: string; size?: number; onsound?: (g: string) => void;
  } = $props();

  const list = $derived<PrintUnit[]>(units ?? (text !== undefined ? [{ g: text, text, silent: true }] : []));
  const hearts = $derived(unitHearts(list, heart));
  const tails = $derived.by(() => { const idx = unitGpcIndex(list); return idx.map((g, i) => idx.indexOf(g) !== i); });
  const showDots = $derived(dots && dotsMs !== null);
  const live = $derived(onsound !== undefined);

  let els: HTMLElement[] = $state([]);
  let held = -1;
  let lastPlayed = -1;

  function quiet(i: number): boolean {
    return tails[i] || hearts[i] || list[i].silent;
  }
  function play(i: number): void {
    if (i === lastPlayed) return;
    lastPlayed = i;
    if (quiet(i)) return;
    onsound?.(list[i].g);
  }
  function at(e: PointerEvent): void {
    for (let i = 0; i < els.length; i++) {
      const r = els[i]?.getBoundingClientRect();
      if (r && e.clientX >= r.left && e.clientX <= r.right) { play(i); return; }
    }
  }
  function down(e: PointerEvent): void {
    if (!live || held !== -1) return;
    e.preventDefault();
    held = e.pointerId;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* element gone */ }
    lastPlayed = -1;
    at(e);
  }
  function move(e: PointerEvent): void {
    if (e.pointerId === held) at(e);
  }
  function up(e: PointerEvent): void {
    if (e.pointerId === held) held = -1;
  }
</script>

{#snippet units_()}
  {#each list as u, i (i)}
    <span class="unit" class:heart={hearts[i]} class:tail={tails[i]} bind:this={els[i]}>
      {#if hearts[i] && !tails[i]}
        <svg class="hearticon" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21 C5 15 1 11 1 6.5 C1 3.4 3.4 1 6.4 1 C8.6 1 10.6 2.3 12 4.3 C13.4 2.3 15.4 1 17.6 1 C20.6 1 23 3.4 23 6.5 C23 11 19 15 12 21 Z" fill="#ff8fc7" stroke="#e0559c" stroke-width="1.6" stroke-linejoin="round" /></svg>
      {/if}
      <span class="txt">{u.text}</span>
      {#if showDots}<span class="dot" class:none={tails[i] || hearts[i]} class:silent={u.silent && !hearts[i] && !tails[i]}></span>{/if}
    </span>
  {/each}
{/snippet}

{#if live}
  <div class="print live" class:glow class:dots={showDots} style:--fs="{size}px" role="button" tabindex="-1" data-touch aria-label={label}
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    {@render units_()}
  </div>
{:else}
  <div class="print" class:glow class:dots={showDots} style:--fs="{size}px" role="img" aria-label={list.map((u) => u.text).join('')}>
    {@render units_()}
  </div>
{/if}

<style>
  .print { display: inline-flex; align-items: flex-end; padding: 18px 26px 16px; min-height: 96px; background: #fff; border-radius: 28px;
    border: 4px solid #c9b8ff; font: 700 var(--fs) / 1 'Andika', sans-serif; color: #3b2a4a; white-space: pre; }
  .print.live { touch-action: none; }
  .print.dots { padding-bottom: 12px; }
  .unit { position: relative; display: inline-flex; flex-direction: column; align-items: center; padding: 0 1px; }
  .txt { position: relative; display: block; }
  .heart .txt { color: #b0306f; text-shadow: 0 0 10px #ffc4e1, 0 0 18px #ffd6ea; }
  .heart::before { content: ''; position: absolute; left: -4px; right: -4px; top: 6%; bottom: 6%; border-radius: 40%;
    background: radial-gradient(ellipse at 50% 55%, #ffd6ea 0 45%, #ffd6ea00 75%); opacity: 0.85;
    animation: soft calc(2400ms * var(--speed, 1)) ease-in-out infinite; }
  .hearticon { position: absolute; top: calc(var(--fs) * -0.42); width: calc(var(--fs) * 0.36); height: auto; }
  .dot { width: 14px; height: 14px; border-radius: 50%; background: #8a6ad8; margin-top: 10px; }
  .dot.silent { opacity: 0.25; }
  .dot.none { visibility: hidden; }
  .glow .unit:last-child .txt { animation: pulse calc(900ms * var(--speed, 1)) ease-in-out infinite; }
  @keyframes pulse { 50% { transform: scale(1.12); } }
  @keyframes soft { 50% { opacity: 0.45; } }
</style>
