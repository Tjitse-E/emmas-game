<script lang="ts">
  // Stub until lane feed lands (docs/v3/next/plan.md 3.7): no checked moment and no tray.
  import { onMount } from 'svelte';
  import type { MangerFeedProps } from './types.ts';
  let { spots: _spots, onhook, onchecked }: MangerFeedProps = $props();
  onMount(() => { onhook(null); onchecked(); });
</script>
