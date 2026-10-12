<script lang="ts">
  // The food tray (docs/v3/next/plan.md F4, N23): three pictured food words on a wooden tray. A tap says the word
  // (Elizabeth); a drag drops the food on a baby (the parent judges and feeds). Free play, never checked.
  // The first touch of the tray in a visit also says "Tap a food to hear its name. Then give it to a baby."
  import { audio } from '../../audio/index.ts';
  import { game } from '../../game.svelte.ts';
  import { drag } from '../../platform/input.ts';
  import { wordId } from '../../core/keys.ts';
  import type { WordEntry } from '../../core/heartbeat/types.ts';
  import PrintWithDots from '../../ui/PrintWithDots.svelte';
  import ArtImg from '../heartbeat/ArtImg.svelte';
  import { hasPicture } from '../../art/manifest.ts';

  let { foods, words, onfeed, size = 92, disabled = false, onstart = undefined }: {
    foods: string[]; words: Map<string, WordEntry>; onfeed: (word: string, targetId: string) => void; size?: number;
    disabled?: boolean; onstart?: (word: string) => void;
  } = $props();

  let returning = $state<string | null>(null);
  /** The printed word fits its button: long words ('marshmallow') print smaller. */
  const wordSize = (w: string): number => Math.min(Math.round(size * 0.24), Math.floor((size - 10) / (w.length * 0.56)));

  const say = (id: string): Promise<void> => (audio as unknown as { say(id: string): Promise<void> }).say(id);
  const sayTrayOnce = (): void => {
    const v = game.visit ?? 'none';
    if (trayToldIn.has(v)) return;
    trayToldIn.add(v);
    void say('g-tray');
  };
  async function tap(word: string): Promise<void> {
    const first = !trayToldIn.has(game.visit ?? 'none');
    await say(words.get(word)?.clip ?? wordId(word));
    if (first) sayTrayOnce();
  }
  function dropped(word: string, target: string | null): void {
    sayTrayOnce();
    if (target) onfeed(word, target);
    // A food that lands nowhere has already glided back; one that was refused floats back in.
    returning = word;
    setTimeout(() => { if (returning === word) returning = null; }, 500);
  }
</script>

<script lang="ts" module>
  /** Visits in which the tray's goal line was said (once per visit). */
  const trayToldIn = new Set<string>();
</script>

<div class="tray" class:drawn={!hasPicture('item-food-tray')} aria-label="food tray" style:--s="{size}px">
  <!-- The tray picture, stretched under the foods; without it a wooden rim and a checked cloth are drawn in CSS. -->
  {#if hasPicture('item-food-tray')}<span class="back" aria-hidden="true"><ArtImg id="item-food-tray" size={Math.round(size * 3.6)} /></span>{/if}
  {#each foods as f (f)}
    {@const w = words.get(f)}
    <button class="food" class:back-in={returning === f} data-touch aria-label="tray food {f}"
      use:drag={{ data: f, disabled, onTap: () => void tap(f), onStart: () => onstart?.(f), onDrop: (d) => dropped(f, d.targetId) }}>
      <ArtImg id={w?.picture || f} size={Math.round(size * 0.66)} />
      <PrintWithDots text={f} dots={false} size={wordSize(f)} label="" />
    </button>
  {/each}
</div>

<style>
  .tray { position: relative; display: flex; gap: 6px; padding: 10px 18px; align-items: center; justify-content: center; touch-action: none; }
  .tray.drawn { border-radius: 999px; border: 7px solid #c98a4b; box-shadow: inset 0 0 0 3px #e9b77c, 0 4px 0 #9c6532;
    background: repeating-linear-gradient(0deg, #fff3 0 12px, #0000 12px 24px), repeating-linear-gradient(90deg, #ffb3c7 0 12px, #fff1f4 12px 24px); }
  .back { position: absolute; inset: -10px -6px; display: grid; place-items: center; overflow: hidden; pointer-events: none; opacity: 0.95; }
  .back :global(img), .back :global(svg) { width: 100%; height: 100%; object-fit: fill; }
  .food { position: relative; width: var(--s); height: calc(var(--s) * 1.08); display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 0; padding: 0; background: #fffaf0ee; border: 3px solid #e8b878; border-radius: 22px; touch-action: none; }
  .food :global(.print) { padding: 0 4px; min-height: 0; border: 0; background: none; border-radius: 0; }
  .food.back-in { animation: back-in calc(450ms * var(--speed, 1)) ease-out; }
  @keyframes back-in { 0% { transform: translateY(-14px) scale(0.9); opacity: 0.6; } 100% { transform: none; opacity: 1; } }
</style>
