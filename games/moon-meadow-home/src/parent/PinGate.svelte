<script lang="ts">
  // The parent button (decision D18, R56): hold it for 3 seconds, then a keypad of number words in a shuffled
  // order. The right PIN opens the parent corner over the current scene, so Welcome and Moving Day wait under it
  // (master Task I-2 holds the first egg while `onopen` was called and `onclose` was not).
  import { onDestroy } from 'svelte';
  import { press } from '../platform/input.ts';
  import { game } from '../game.svelte.ts';
  import { HOLD_MS, keypadOrder, NUMBER_WORDS } from './parent.ts';
  import { closeGate, openKeypad, parentGate, pressKey } from './store.svelte.ts';
  import ParentCorner from './ParentCorner.svelte';

  let { onopen, onclose }: { onopen?: () => void; onclose?: () => void } = $props();

  let holding = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let order = $state<number[]>([]);
  let mine = false;

  const open = $derived(parentGate.keypad || parentGate.corner);
  $effect(() => { if (parentGate.keypad) order = keypadOrder(game.rng); });
  $effect(() => {
    if (open && !mine) { mine = true; onopen?.(); }
    else if (!open && mine) { mine = false; onclose?.(); }
  });

  function cancel(): void {
    holding = false;
    if (timer) clearTimeout(timer);
    timer = null;
  }
  function down(e: PointerEvent): void {
    e.preventDefault();
    cancel();
    holding = true;
    timer = setTimeout(() => {
      holding = false;
      timer = null;
      openKeypad();
    }, HOLD_MS);
  }

  onDestroy(() => {
    cancel();
    if (mine) { mine = false; closeGate(); onclose?.(); }
  });
</script>

<button class="gate" aria-label="parent" data-touch
  onpointerdown={down} onpointerup={cancel} onpointerleave={cancel} onpointercancel={cancel}>
  <span class="dot" aria-hidden="true">
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="#ffffff" fill-opacity=".55" stroke="#8a6ad8" stroke-opacity=".6" stroke-width="3" />
      <circle class="fill" class:on={holding} cx="24" cy="24" r="17" fill="#8a6ad8" fill-opacity=".55" />
      <path d="M17 26 a7 7 0 0 1 14 0 v6 h-14 z M20 26 v-4 a4 4 0 0 1 8 0 v4" fill="none" stroke="#5b3fa8" stroke-width="2.5" stroke-linejoin="round" />
    </svg>
  </span>
</button>

{#if parentGate.keypad}
  <div class="keypad-back" role="dialog" aria-label="parent keypad">
    {#key parentGate.shake}
    <div class="keypad" class:shake={parentGate.shake > 0}>
      <div class="dots" aria-label="entered {parentGate.entered.length}">
        {#each [0, 1, 2, 3] as i (i)}<span class="pin" class:full={i < parentGate.entered.length}></span>{/each}
      </div>
      <div class="keys">
        {#each order as d (d)}
          <button class="key" aria-label="key {NUMBER_WORDS[d]}" use:press={() => pressKey(d)}>{NUMBER_WORDS[d]}</button>
        {/each}
      </div>
      <button class="cancel" aria-label="cancel" use:press={() => closeGate()}>cancel</button>
    </div>
    {/key}
  </div>
{/if}

{#if parentGate.corner}
  <ParentCorner onclose={() => closeGate()} />
{/if}

<style>
  .gate { position: absolute; right: 108px; top: 24px; width: 64px; height: 64px; z-index: 950; display: grid; place-items: center; }
  .dot { width: 48px; height: 48px; display: block; pointer-events: none; }
  .dot svg { width: 48px; height: 48px; display: block; }
  .fill { transform: scale(0); transform-origin: 24px 24px; transition: transform 0ms linear; }
  .fill.on { transform: scale(1); transition: transform 3000ms linear; }
  .keypad-back { position: absolute; inset: 0; z-index: 990; background: rgba(32, 20, 60, .55); display: grid; place-items: center; }
  .keypad { background: #fffaf2; border-radius: 28px; padding: 24px 28px; width: 560px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .keypad.shake { animation: shake 400ms ease-in-out; }
  .dots { display: flex; gap: 16px; height: 24px; }
  .pin { width: 22px; height: 22px; border-radius: 50%; border: 3px solid #8a6ad8; }
  .pin.full { background: #8a6ad8; }
  .keys { display: grid; grid-template-columns: repeat(5, 92px); gap: 12px; }
  .key { height: 72px; border-radius: 18px; background: #efe7ff; border: 3px solid #b9a6d9; font-size: 20px; font-weight: 700; color: #3a2a5c; }
  .cancel { height: 64px; padding: 0 28px; border-radius: 18px; background: #fff; border: 3px solid #d8cfe8; font-size: 20px; color: #5b4a7a; }
  @keyframes shake { 20% { transform: translateX(-12px); } 40% { transform: translateX(12px); } 60% { transform: translateX(-8px); } 80% { transform: translateX(8px); } }
</style>
