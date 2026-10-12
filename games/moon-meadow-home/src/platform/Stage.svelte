<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { stage, refit } from './stage.svelte.ts';
  import TurnPicture from './TurnPicture.svelte';

  let { children, allowPortrait = false }: { children: Snippet; allowPortrait?: boolean } = $props();
  let el: HTMLDivElement | undefined = $state();

  onMount(() => {
    stage.el = el ?? null;
    refit();
    const later = (): void => { setTimeout(refit, 200); };
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', later);
    window.visualViewport?.addEventListener('resize', refit);
    return () => {
      window.removeEventListener('resize', refit);
      window.removeEventListener('orientationchange', later);
      window.visualViewport?.removeEventListener('resize', refit);
    };
  });

  $effect(() => {
    document.body.style.setProperty('--band-top', stage.bandTop);
    document.body.style.setProperty('--band-bottom', stage.bandBottom);
  });
</script>

<div id="stage" bind:this={el} style:transform="translate({stage.fit.x}px, {stage.fit.y}px) scale({stage.fit.scale})">
  {@render children()}
</div>
{#if stage.fit.portrait && !allowPortrait}
  <TurnPicture />
{/if}
