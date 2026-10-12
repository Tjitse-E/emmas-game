<script lang="ts">
  // A building egg hatches in places' herd circle and the baby is named (spec 2.4, 2.6). The hatch is not a
  // checked moment: no learning result, never shiny. Naming is the heartbeat's own scene, mounted inline.
  import { onMount, untrack } from 'svelte';
  import { game } from '../../game.svelte.ts';
  import { audio } from '../../audio/index.ts';
  import { sleep } from '../../platform/timing.ts';
  import Egg from '../../art/Egg.svelte';
  import Unicorn from '../../art/Unicorn.svelte';
  import { rollBuildingHatch } from '../../core/heartbeat/hatch.ts';
  import type { BreedId } from '../../core/heartbeat/types.ts';
  import { liveDeps } from './deps.ts';
  import Naming from '../Naming.svelte';

  // source and plot are accepted for places' call site; the hatch is always a building hatch.
  let { breed, source: _source = 'building', plot: _plot = '', ondone }:
    { breed: BreedId | string; source?: 'building'; plot?: string; ondone: (babyId: string) => void } = $props();
  const deps = liveDeps({ place: 'building', strand: 's' });
  const babyId = deps.uuid();
  const kind = untrack(() => breed) as BreedId;
  let phase = $state<'hatch' | 'hello' | 'name'>('hatch');
  const baby = $derived(game.world.byId[babyId]);

  onMount(() => {
    void (async () => {
      await audio.say('lumi-hatching');
      await sleep(700);
      const roll = rollBuildingHatch(kind, deps.rng);
      game.dispatch({ type: 'hb.hatched', baby: babyId, egg: 'building', kind: 'building', breed: roll.breed, colours: roll.colours, traits: roll.traits, source: 'building' });
      void audio.sfx('hatch');
      await audio.sfx('fanfare');
      phase = 'hello';
      await audio.say('lumi-baby');
      await audio.say('foal-hello');
      await sleep(400);
      phase = 'name';
    })();
  });
</script>

{#if phase === 'name'}
  <Naming target={{ kind: 'baby', baby: babyId }} onnamed={() => ondone(babyId)} />
{:else}
  <div class="circle" aria-label="herd circle">
    {#if phase === 'hatch'}
      <span class="egg"><Egg kind={kind} size={240} wobble cracks={2} label="egg" /></span>
    {:else if baby}
      <span class="baby"><Unicorn breed={baby.breed} stage={baby.stage} colours={baby.colours} traits={baby.traits} height={260} pose="hop" label="new baby" /></span>
    {/if}
  </div>
{/if}

<style>
  .circle { position: absolute; inset: 0; display: grid; place-items: center; z-index: 5; pointer-events: none; }
  .baby { animation: rise calc(600ms * var(--speed, 1)) ease-out; }
  @keyframes rise { from { transform: translateY(40px) scale(0.6); opacity: 0; } }
</style>
