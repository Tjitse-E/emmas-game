<script lang="ts">
  import { tick, type Component } from 'svelte';
  import { route, router } from './router.svelte.ts';
  import { loaderFor, type SceneProps } from './registry.ts';
  import MissingScene from './MissingScene.svelte';

  let shown = $state<{ key: number; id: string; params: Record<string, unknown>; comp: Component<SceneProps> | null } | null>(null);

  $effect(() => {
    const cur = route.current;
    const key = route.navKey;
    if (!cur) { shown = null; return; }
    const load = loaderFor(cur.id);
    const done = (comp: Component<SceneProps> | null): void => {
      if (route.navKey !== key) return;
      shown = { key, id: cur.id, params: cur.params, comp };
      void tick().then(() => router.mounted(key));
    };
    if (!load) { done(null); return; }
    load().then((m) => done(m.default), (err: unknown) => { console.error('[router] cannot load', cur.id, err); done(null); });
  });
</script>

{#if shown}
  {#key shown.key}
    {#if shown.comp}
      {@const Scene = shown.comp}
      <Scene params={shown.params} />
    {:else}
      <MissingScene id={shown.id} />
    {/if}
  {/key}
{/if}
