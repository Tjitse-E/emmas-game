<script lang="ts">
  // Test builds only (scene platform-demo): exercises press, drag, the ghost hand and the moonbeam.
  import { onMount } from 'svelte';
  import { press, drag, dropTarget } from './input.ts';
  import { registerState } from './hooks.ts';
  import { setBands } from './stage.svelte.ts';
  import { ghost } from '../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../ui/moonbeam.svelte.ts';

  let { params }: { params: Record<string, unknown> } = $props();
  let presses = $state(0);
  let dropped = $state('');

  onMount(() => {
    setBands('#26296b', '#2f6b4f');
    return registerState('demo', () => ({ presses, dropped, params }));
  });
</script>

<div class="demo">
  <button class="btn b1" aria-label="demo button" use:press={() => { presses += 1; }}>{presses}</button>
  <button class="btn b2" aria-label="demo ghost" use:press={() => { void ghost.tap('demo target', 3); }}>hand</button>
  <button class="btn b3" aria-label="demo beam" use:press={() => { moonbeam.show(['demo target', 'demo token']); }}>beam</button>
  <div class="token" role="button" tabindex="-1" aria-label="demo token"
    use:drag={{ data: 'token', onDrop: (i) => { dropped = i.targetId ?? 'none'; } }}></div>
  <div class="target" role="img" aria-label="demo target" use:dropTarget={{ id: 'demo target' }}></div>
</div>

<style>
  .demo { position: absolute; inset: 0; background: linear-gradient(#26296b, #2f6b4f); }
  .btn { position: absolute; top: 40px; width: 120px; height: 80px; border-radius: 20px; background: #fff6fb; font-size: 28px; }
  .b1 { left: 40px; }
  .b2 { left: 180px; }
  .b3 { left: 320px; }
  .token { position: absolute; left: 360px; top: 400px; width: 96px; height: 96px; border-radius: 50%; background: #ff5fae; touch-action: none; }
  .target { position: absolute; left: 800px; top: 380px; width: 160px; height: 140px; border-radius: 30px; border: 6px dashed #ffd25e; }
</style>
