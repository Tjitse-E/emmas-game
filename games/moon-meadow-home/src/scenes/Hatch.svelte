<script lang="ts">
  // The hatch (spec 2.6): the egg wobbles, cracks and bursts; the baby hops out, a moonflower pops up.
  import { onMount, untrack } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { audio } from '../audio/index.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import Egg from '../art/Egg.svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import Lumi from '../art/Lumi.svelte';
  import { BREED_OF } from '../core/heartbeat/hatch.ts';
  import type { EggKind } from '../core/maths/eggs.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import Backdrop from './heartbeat/Backdrop.svelte';

  let { params }: { params: Record<string, unknown> } = $props();
  const p = untrack(() => params) as { baby: string; kind?: EggKind; skin?: 'golden' | 'speckled' | null };
  const baby = $derived(game.world.byId[p.baby]);
  const breed = BREED_OF[p.kind ?? 'moon'];
  let phase = $state<'wobble' | 'crack' | 'burst' | 'hello'>('wobble');
  let talking = $state(false);
  let done = false;

  async function next(): Promise<void> {
    if (done) return;
    done = true;
    await heartbeat.hatched(p.baby);
  }

  onMount(() => {
    setBands('#cfe8ff', '#8fc79a');
    const stopTalk = audio.onTalk((id) => { talking = !!id && id.startsWith('lumi-'); });
    void (async () => {
      await audio.say('lumi-hatching');
      await sleep(700);
      phase = 'crack';
      void audio.sfx('hatch');
      await sleep(900);
      phase = 'burst';
      await audio.sfx('fanfare');
      phase = 'hello';
      await audio.say('lumi-baby');
      if (baby?.traits.shiny) { void audio.sfx('sparkle'); await audio.say('lumi-sparkly'); }
      await audio.say('foal-hello');
      await sleep(500);
      await next();
    })();
    const off = registerSceneHook('hatch', { answer: () => next(), wrong: () => {}, idle: () => {}, target: () => null });
    return () => { off(); stopTalk(); };
  });
</script>

<section class="hatch" aria-label="hatch scene">
  <Backdrop id="bg-nest" top="#cfe8ff" bottom="#bfe8c4" />
  <span class="lumi"><Lumi size={170} {talking} /></span>
  <span class="nest"><ArtImg id="item-nest" size={460} /></span>
  {#if phase !== 'hello'}
    <span class="egg {phase}"><Egg kind={breed} skin={p.skin ?? null} size={300} cracks={phase === 'wobble' ? 1 : 3} wobble label="egg" /></span>
  {:else if baby}
    <span class="baby" class:shiny={baby.traits.shiny}>
      <Unicorn breed={baby.breed} stage={baby.stage} colours={baby.colours} traits={baby.traits} height={300} pose="hop" label="new baby" />
    </span>
    <span class="flower"><ArtImg id="decor-moonflower" size={110} /></span>
  {/if}
</section>

<style>
  .hatch { position: absolute; inset: 0; overflow: hidden; }
  .lumi { position: absolute; left: 930px; top: 40px; }
  .nest { position: absolute; left: 360px; top: 360px; }
  .egg { position: absolute; left: 440px; top: 170px; }
  .egg.crack { animation: wob calc(250ms * var(--speed, 1)) infinite; }
  .egg.burst { animation: pop calc(400ms * var(--speed, 1)) forwards; }
  .baby { position: absolute; left: 400px; top: 160px; animation: rise calc(600ms * var(--speed, 1)) ease-out; }
  .shiny::after { content: ''; position: absolute; inset: -30px; border-radius: 50%; background: radial-gradient(#fff8, #fff0 70%);
    animation: tw calc(1200ms * var(--speed, 1)) infinite; pointer-events: none; }
  .flower { position: absolute; left: 820px; top: 600px; animation: rise calc(800ms * var(--speed, 1)) ease-out; }
  @keyframes wob { 50% { transform: rotate(5deg); } }
  @keyframes pop { to { transform: scale(1.4); opacity: 0; } }
  @keyframes rise { from { transform: translateY(40px) scale(0.6); opacity: 0; } }
  @keyframes tw { 50% { opacity: 0.4; } }
</style>
