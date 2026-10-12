<script lang="ts">
  // Eating (docs/v3/next/plan.md N24): the food picture at the baby's mouth, gone in three bites. No new art.
  // The parent places it with left and top (stage px, the top-left corner of the food).
  import ArtImg from '../heartbeat/ArtImg.svelte';

  let { picture, size = 72, left = 0, top = 0 }: { picture: string; size?: number; left?: number; top?: number } = $props();
</script>

<span class="munch" aria-hidden="true" style:left="{left}px" style:top="{top}px" style:width="{size}px" style:height="{size}px">
  <ArtImg id={picture} {size} />
</span>

<style>
  .munch { position: absolute; pointer-events: none; z-index: 5; display: grid; place-items: center;
    animation: bites calc(1200ms * var(--speed, 1)) linear forwards; }
  /* Three bites from the mouth side, a small chew between them, then the last crumb goes. */
  @keyframes bites {
    0% { clip-path: inset(0 0 0 0); transform: rotate(0deg); }
    24% { clip-path: inset(0 0 0 0); transform: rotate(-4deg); }
    25% { clip-path: inset(0 0 0 30% round 40%); transform: rotate(3deg); }
    49% { clip-path: inset(0 0 0 30% round 40%); transform: rotate(-3deg); }
    50% { clip-path: inset(0 0 0 58% round 40%); transform: rotate(3deg); }
    74% { clip-path: inset(0 0 0 58% round 40%); transform: rotate(-3deg); }
    75% { clip-path: inset(0 0 0 82% round 40%); opacity: 1; }
    100% { clip-path: inset(0 0 0 100%); opacity: 0; }
  }
</style>
