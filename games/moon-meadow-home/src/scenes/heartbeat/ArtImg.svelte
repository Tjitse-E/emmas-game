<script lang="ts">
  // One art id from the manifest (art's Picture), or its SVG fallback while the picture is missing (R49).
  import Picture from '../../art/Picture.svelte';
  import Fallback from './Fallback.svelte';

  let { id, size = 120, tint = undefined }: { id: string; size?: number; tint?: string } = $props();
</script>

<Picture {id} {size} {tint} label="">
  <Fallback {id} {size} tint={tint ?? ''} />
</Picture>
