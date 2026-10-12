<script lang="ts">
  // Queen Lumi in the moon with a talking mouth (contracts C9 LumiProps). Set `talking` while a Lumi clip plays.
  // Before her art exists she is drawn as a smiling moon with a little crown, with the same talking mouth.
  import { artManifest, artUrl } from './manifest.ts';

  let { size, talking = false, label = 'Queen Lumi' }: { size: number; talking?: boolean; label?: string } = $props();
  const l = $derived(artManifest().lumi);
  const k = $derived(l ? size / Math.max(l.w, l.h) : 0);
</script>

{#if l}
  <div class="lumi" role="img" aria-label={label} style="width:{l.w * k}px;height:{l.h * k}px">
    <img src={artUrl(l.face)} alt="" width={l.w * k} height={l.h * k} draggable="false" />
    <img class="mouth" class:talking src={artUrl(l.mouth)} alt="" draggable="false"
      style="left:{l.mouthBox[0] * k}px;top:{l.mouthBox[1] * k}px;width:{l.mouthBox[2] * k}px;height:{l.mouthBox[3] * k}px" />
  </div>
{:else}
  <div class="lumi" role="img" aria-label={label} style="width:{size}px;height:{size}px">
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <circle cx="100" cy="108" r="78" fill="#fff4c2" stroke="#e0b54a" stroke-width="5" />
      <circle cx="74" cy="92" r="11" fill="#f2dc8a" opacity="0.7" />
      <circle cx="132" cy="140" r="8" fill="#f2dc8a" opacity="0.7" />
      <polygon points="66,40 78,14 92,34 100,8 108,34 122,14 134,40" fill="#f7c948" stroke="#c9952a" stroke-width="4" stroke-linejoin="round" />
      <path d="M70 102 Q80 94 90 102" fill="none" stroke="#6a4a3a" stroke-width="5" stroke-linecap="round" />
      <path d="M110 102 Q120 94 130 102" fill="none" stroke="#6a4a3a" stroke-width="5" stroke-linecap="round" />
      <circle cx="68" cy="122" r="9" fill="#ffb3c1" opacity="0.6" />
      <circle cx="132" cy="122" r="9" fill="#ffb3c1" opacity="0.6" />
      <path class="smile" d="M84 128 Q100 142 116 128" fill="none" stroke="#6a4a3a" stroke-width="5" stroke-linecap="round" />
      <ellipse class="mouth" class:talking cx="100" cy="134" rx="11" ry="9" fill="#a8485a" />
    </svg>
  </div>
{/if}

<style>
  .lumi { position: relative; pointer-events: none; }
  .lumi img { position: absolute; left: 0; top: 0; }
  .lumi svg { display: block; }
  .mouth { opacity: 0; }
  .mouth.talking { animation: lumi-talk 0.28s steps(1, end) infinite; }
  @keyframes lumi-talk { 0% { opacity: 1; } 50% { opacity: 0; } }
</style>
