<script lang="ts">
  // A new player's start (spec 2.9): Queen Lumi says hello, gives Emma her crown, then the first egg.
  // Restore comes before a fresh start (spec 4.7, R56): the parent button is here, and the first egg waits
  // while the parent corner is open. After a restore, places calls wakeVisit(), which leaves the welcome.
  import { onMount } from 'svelte';
  import Lumi from '../art/Lumi.svelte';
  import Picture from '../art/Picture.svelte';
  import PinGate from '../parent/PinGate.svelte';
  import { audio } from '../audio/index.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { sleep } from '../platform/timing.ts';
  import { svg } from '../ui/places-svg.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { game } from '../game.svelte.ts';

  let { params: _params }: { params: Record<string, unknown> } = $props();
  let talking = $state(false);
  let crown = $state(false);
  let parentOpen = $state(false);
  let alive = true;

  /** The first egg waits while the parent corner is open, so a restore can come before visit 1 is played. */
  const parentClosed = () => new Promise<void>((r) => {
    const t = setInterval(() => { if (!parentOpen || !alive) { clearInterval(t); r(); } }, 200);
  });

  async function run(): Promise<void> {
    await audio.preloadScene('start');
    if (!alive) return;
    await audio.speak('lumi-hello', 'lumi-meadow-yours');
    if (!alive) return;
    crown = true;
    await sleep(400);
    await audio.speak('lumi-crown');
    await sleep(1200);                               // she sees her crown before the first egg comes
    if (parentOpen) await parentClosed();
    if (!alive || game.scene !== 'welcome') return;   // a restore moved her on
    game.dispatch({ type: 'game/announce', opening: 'welcome' });
    await heartbeat.start();
  }

  onMount(() => {
    setBands('#cfe8ff', '#8fca7a');
    const off = audio.onTalk((id) => (talking = !!id && id.startsWith('lumi-')));
    // Nothing to tap here: the welcome runs by itself, so the hook has no target.
    const unhook = registerSceneHook('welcome', { answer: () => {}, wrong: () => {}, idle: () => {}, target: () => null });
    run().catch((e) => console.error('[welcome] the start did not run', e));
    return () => { alive = false; off(); unhook(); audio.release('start'); };
  });
</script>

<div class="welcome" aria-label="welcome">
  <PinGate onopen={() => (parentOpen = true)} onclose={() => (parentOpen = false)} />
  <div class="sun" aria-hidden="true"></div>
  <div class="hill back" aria-hidden="true"></div>
  <div class="hill front" aria-hidden="true"></div>
  {#each [[140, 690], [260, 740], [930, 700], [1040, 750], [820, 770]] as [x, y], i (i)}
    <span class="flower" style="left:{x}px;top:{y}px;animation-delay:{i * 0.4}s" aria-hidden="true"></span>
  {/each}
  <div class="lumi"><Lumi size={340} {talking} label="Queen Lumi" /></div>
  {#if crown}
    <div class="crown">
      <Picture id="item-crown-emma" size={160} label="crown">
        <span class="fallback" role="img" aria-label="crown">{@html svg('crown')}</span>
      </Picture>
    </div>
  {/if}
</div>

<style>
  .welcome { position: absolute; inset: 0; overflow: hidden; background: linear-gradient(#cfe8ff, #e9f5ff 55%, #8fca7a 56%); }
  .sun { position: absolute; left: 90px; top: 70px; width: 120px; height: 120px; border-radius: 50%; background: #fff3b0; box-shadow: 0 0 60px #fff3b0; }
  .hill { position: absolute; border-radius: 50%; }
  .hill.back { left: -160px; right: 420px; top: 470px; height: 420px; background: #a6d68e; }
  .hill.front { left: 380px; right: -200px; top: 500px; height: 420px; background: #96cf7e; }
  .flower { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #ffb3d1; box-shadow: 0 0 0 5px #fff6fa; animation: sway 3s ease-in-out infinite; }
  .lumi { position: absolute; left: 420px; top: 70px; }
  .crown { position: absolute; left: 510px; top: 560px; width: 160px; height: 160px; display: grid; place-items: center; animation: drop 700ms ease-out; filter: drop-shadow(0 6px 10px rgba(120, 90, 20, 0.35)); }
  .fallback { display: block; width: 140px; height: 140px; }
  .fallback :global(svg) { width: 100%; height: 100%; }
  @keyframes drop { from { transform: translateY(-260px); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes sway { 50% { transform: translateY(-4px); } }
  @media (prefers-reduced-motion: reduce) { .crown, .flower { animation: none; } }
</style>
