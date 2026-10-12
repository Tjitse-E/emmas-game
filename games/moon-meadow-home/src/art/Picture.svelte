<script lang="ts">
  // One picture from the art manifest, tinted when the picture is tintable (contracts C9 PictureProps).
  // A missing picture keeps a square of `size`, or draws `children` when the caller gives a fallback.
  import type { Snippet } from 'svelte';
  import { artUrl, picture } from './manifest.ts';
  import { tintLayerStyle } from './tint.ts';

  let { id, size, tint = undefined, label = undefined, silhouette = false, children = undefined }:
    { id: string; size: number; tint?: string; label?: string; silhouette?: boolean; children?: Snippet } = $props();

  const e = $derived(picture(id));
  const k = $derived(e ? size / Math.max(e.w, e.h) : 0);
  const w = $derived(e ? Math.round(e.w * k) : size);
  const h = $derived(e ? Math.round(e.h * k) : size);
  const src = $derived(e ? artUrl(silhouette && e.sil ? e.sil : e.src) : '');
  const name = $derived(label ?? id);
</script>

{#if e && e.tint && !silhouette}
  <div class="pic" role="img" aria-label={name || undefined} aria-hidden={name ? undefined : 'true'}
    style="width:{w}px;height:{h}px;{tintLayerStyle(src, tint ?? e.tint.default)}"></div>
{:else if e}
  <img class="pic" {src} alt={name} width={w} height={h} draggable="false" />
{:else if children}
  {@render children()}
{:else}
  <div class="pic" role={name ? 'img' : undefined} aria-label={name || undefined} aria-hidden={name ? undefined : 'true'}
    style="width:{size}px;height:{size}px"></div>
{/if}

<style>
  .pic { display: block; pointer-events: none; user-select: none; -webkit-user-select: none; -webkit-user-drag: none; }
</style>
