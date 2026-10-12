<script lang="ts">
  // One small bundle of hay (item-hay-bundle), or a drawn bundle with a red string while the picture is missing.
  import { hasPicture } from '../../art/manifest.ts';
  import ArtImg from '../heartbeat/ArtImg.svelte';

  let { size = 40 }: { size?: number } = $props();
  const pic = hasPicture('item-hay-bundle');
</script>

<span class="bundle" style:width="{size}px" style:height="{size}px" aria-hidden="true">
  {#if pic}
    <ArtImg id="item-hay-bundle" {size} />
  {:else}
    <svg viewBox="0 0 40 40" width={size} height={size}>
      <path d="M6 30 L12 9 L28 9 L34 30 Z" fill="#f2c45a" stroke="#b9852a" stroke-width="2" stroke-linejoin="round" />
      <path d="M13 12 L10 28 M18 11 L17 29 M22 11 L23 29 M27 12 L30 28" stroke="#d9a53a" stroke-width="1.6" />
      <rect x="9" y="17" width="22" height="4" rx="2" fill="#e0483e" />
    </svg>
  {/if}
</span>

<style>
  .bundle { display: inline-grid; place-items: center; }
</style>
