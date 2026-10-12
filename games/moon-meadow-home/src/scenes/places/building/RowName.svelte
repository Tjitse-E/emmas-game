<script lang="ts">
  // The last part of a row's Building Day (Task A13, decision D8): she names the new row with heartbeat's
  // naming (target kind 'row'). The row's sign then reads "<Name> Row".
  import { onDestroy, onMount } from 'svelte';
  import Naming from '../../Naming.svelte';
  import Picture from '../../../art/Picture.svelte';
  import { rowDef } from '../../../core/places/content.ts';
  import { audio } from '../../../audio/index.ts';
  import { game } from '../../../game.svelte.ts';
  import type { Named } from '../../heartbeat/naming.ctrl.ts';
  import { setPart } from './part-api.ts';

  let { row, ondone }: { row: number; ondone: (name: string) => void } = $props();

  let naming = $state(false);
  let finished = false;

  function named(n: Named): void {
    if (finished) return;
    finished = true;
    game.dispatch({ type: 'place/row-name', row, name: n.name });
    ondone(n.name);
  }

  let offPart: (() => void) | null = null;
  onMount(() => {
    offPart = setPart({ part: 'row-name', answer: () => {}, target: () => null });
    void (async () => {
      await audio.say('bd-row-name');
      naming = true;
    })();
  });
  onDestroy(() => offPart?.());
</script>

<div class="row-name-part" aria-label="row name part">
  {#if naming}
    <Naming target={{ kind: 'row', row }} onnamed={named} />
    <!-- The new row stands where the naming scene shows a baby, so she sees what she names. -->
    <span class="row-pic" aria-hidden="true"><Picture id={rowDef.picture} size={250} label="" /></span>
  {/if}
</div>

<style>
  .row-name-part { position: absolute; inset: 0; }
  .row-pic { position: absolute; left: 55px; top: 110px; z-index: 6; pointer-events: none; padding: 8px; border-radius: 24px; background: #cfe8ffcc; }
</style>
