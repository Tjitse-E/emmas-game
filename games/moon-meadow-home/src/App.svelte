<script lang="ts">
  import Stage from './platform/Stage.svelte';
  import Router from './platform/Router.svelte';
  import PlayGate from './platform/PlayGate.svelte';
  import HomeButton from './platform/HomeButton.svelte';
  import { route } from './platform/router.svelte.ts';
  import { bootState } from './platform/boot.svelte.ts';
  import { PORTRAIT_OK } from './platform/scene-ids.ts';

  const allowPortrait = $derived(route.current !== null && PORTRAIT_OK.has(route.current.id));
</script>

<Stage {allowPortrait}>
  <Router />
  <HomeButton />
  {#if !bootState.started}
    <PlayGate />
  {/if}
</Stage>
