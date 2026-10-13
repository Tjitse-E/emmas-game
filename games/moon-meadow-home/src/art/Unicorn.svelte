<script lang="ts">
  // A unicorn with its colours, traits, pose, facing and outfit (contracts C9 UnicornProps, art Task A9).
  // A breed without art draws as the Moon breed; with no unicorn art at all it draws a simple SVG unicorn.
  // `lite` (R63) draws one flat picture per baby, tinted once on a canvas: no multiply blend, no mask layers.
  import './unicorn.css';
  import { artManifest, artUrl, findUnicornEntry, picture, type BreedId, type OutfitSlot, type Stage } from './manifest.ts';
  import { resolveColours, type Colours, type Traits } from './palette.ts';
  import { colourForTint, patternLayerStyle, plainLayerStyle, tintLayerStyle } from './tint.ts';
  import { anchorCss, animDelay, FALLBACK_MOUTH, headCrop, layoutUnicorn, mouthCss, MUNCH_SIZE, outfitPlacement } from './unicornParts.ts';
  import type { Snippet } from 'svelte';
  import { liteCached, liteKey, liteSprite } from './lite.ts';
  import type { UnicornPose } from '../types/contracts.ts';

  let { breed, stage, colours, traits = {}, height, pose = 'idle', facing = 'right', outfit = {}, headOnly = false, seed = 0,
    label = 'unicorn', lite = false, mouth = undefined }:
    { breed: BreedId; stage: Stage; colours: Partial<Colours> | null | undefined; traits?: Traits; height: number; pose?: UnicornPose;
      facing?: 'left' | 'right'; outfit?: Partial<Record<OutfitSlot, string>>; headOnly?: boolean; seed?: number; label?: string;
      lite?: boolean;
      /** Drawn at the mouth (food while munching), moving with the hop, breath and facing. Gets the food's side in px. */
      mouth?: Snippet<[number]> } = $props();

  const dpr = typeof devicePixelRatio === 'number' ? Math.min(Math.max(devicePixelRatio, 1), 2) : 2;
  const t = $derived(traits ?? {});
  const entry = $derived(findUnicornEntry(breed, stage));
  const c = $derived(resolveColours(colours, t));
  const speckle = $derived(t.speckled ? artManifest().patterns?.speckle : undefined);

  const crop = $derived(entry && headOnly ? headCrop(entry, height) : null);
  const drawH = $derived(crop ? crop.height : height);
  const lay = $derived(entry ? layoutUnicorn(entry, drawH, dpr) : null);
  const slots = $derived(entry ? (Object.entries(outfit ?? {}) as [OutfitSlot, string | undefined][])
    .filter((o): o is [OutfitSlot, string] => typeof o[1] === 'string')
    .map(([slot, id]) => ({ id, box: outfitPlacement(entry, picture(id), slot, drawH) }))
    .filter((o) => o.box) : []);
  const star = $derived(entry && t.founder ? outfitPlacement(entry, picture('pin-founder-star'), 'flank', drawH) : null);
  const flank = $derived(entry ? anchorCss(entry, 'flank', drawH) : { x: 0, y: 0 });
  const mouthAt = $derived(entry ? mouthCss(entry, drawH) : { x: (FALLBACK_MOUTH[0] * height) / 330, y: (FALLBACK_MOUTH[1] * height) / 330 });

  // Lite: undefined while the tinted picture is being made, null when it cannot be made (then the flat file).
  const key = $derived(entry && lay && lite ? liteKey(entry, lay.rendition, c, speckle) : '');
  let made = $state<{ key: string; url: string | null } | null>(null);
  const liteUrl = $derived(!key ? undefined : made?.key === key ? made.url : liteCached(key));
  $effect(() => {
    if (!key || !entry || !lay || liteCached(key) !== undefined) return;
    let alive = true;
    const k = key;
    liteSprite(entry, lay.rendition, c, speckle).then((url) => { if (alive) made = { key: k, url }; });
    return () => { alive = false; };
  });
  const liteSrc = $derived(liteUrl ? liteUrl : liteUrl === null && entry?.flat ? artUrl(entry.flat) : null);
  const drawLite = $derived(lite && !!entry && (liteUrl !== null || !!entry.flat));

  // Fallback without unicorn art: a simple drawn unicorn in the baby's colours (frame 400 x 330).
  const fbW = $derived(headOnly ? height : (height * 400) / 330);
</script>

{#if entry && lay}
  <div class="uni-wrap" role="img" aria-label={label}
    style="width:{crop ? crop.size : lay.width}px;height:{crop ? crop.size : lay.height}px;{crop ? 'overflow:hidden;position:relative' : ''}">
    <div class="uni pose-{pose}" class:left={facing === 'left'} class:lite={drawLite}
      style="width:{lay.width}px;height:{lay.height}px;{crop ? `position:absolute;left:${crop.left}px;top:${crop.top}px` : ''}">
      <div class="flip"><div class="bob"><div class="breath" style="animation-delay:{animDelay(seed, 'breath')}s">
        {#if drawLite}
          {#if liteSrc}
            <img class="flat" src={liteSrc} alt="" width={lay.width} height={lay.height} draggable="false" />
          {/if}
        {:else}
          {#each lay.parts as p (p.id)}
            <div class="part anim-{p.anim}" class:hidden={p.hidden}
              style="left:{p.left}px;top:{p.top}px;width:{p.width}px;height:{p.height}px;transform-origin:{p.originX}px {p.originY}px;animation-delay:{animDelay(seed, p.anim)}s">
              {#each p.layers as l (l.src)}
                {@const url = artUrl(l.src)}
                <div class="layer" style="left:{l.left}px;top:{l.top}px;width:{l.width}px;height:{l.height}px;{l.tint === 'none' ? plainLayerStyle(url) : tintLayerStyle(url, colourForTint(l.tint, c)!)}"></div>
                {#if speckle && l.tint === 'body' && p.id === 'body'}
                  <div class="layer" style="left:{l.left}px;top:{l.top}px;width:{l.width}px;height:{l.height}px;{patternLayerStyle(url, artUrl(speckle), 0.55)}"></div>
                {/if}
              {/each}
            </div>
          {/each}
        {/if}
        {#each slots as o (o.id)}
          {@const pic = picture(o.id)!}
          <div class="outfit" style="left:{o.box!.left}px;top:{o.box!.top}px;width:{o.box!.width}px;height:{o.box!.height}px;{pic.tint ? tintLayerStyle(artUrl(pic.src), pic.tint.default) : plainLayerStyle(artUrl(pic.src))}"></div>
        {/each}
        {#if star}
          <div class="outfit" style="left:{star.left}px;top:{star.top}px;width:{star.width}px;height:{star.height}px;{plainLayerStyle(artUrl(picture('pin-founder-star')!.src))}"></div>
        {/if}
        {#if t.shiny && picture('ui-sparkle')}
          {#each [0, 1, 2] as i (i)}
            <img class="sparkle" alt="" src={artUrl(picture('ui-sparkle')!.src)}
              style="left:{flank.x + (i - 1) * lay.width * 0.22}px;top:{flank.y - lay.height * (0.35 + 0.12 * i)}px;animation-delay:{-i * 0.5}s" />
          {/each}
        {/if}
        {#if mouth}<div class="mouth-at" style="left:{mouthAt.x}px;top:{mouthAt.y}px">{@render mouth(MUNCH_SIZE * drawH)}</div>{/if}
      </div></div></div>
    </div>
  </div>
{:else}
  <div class="uni-wrap" role="img" aria-label={label} style="width:{fbW}px;height:{height}px">
    <div class="uni pose-{pose}" class:left={facing === 'left'} style="width:{fbW}px;height:{height}px">
      <div class="flip"><div class="bob"><div class="breath" style="animation-delay:{animDelay(seed, 'breath')}s">
        <svg class="fallback" viewBox={headOnly ? '218 0 182 182' : '0 0 400 330'} width={fbW} height={height} aria-hidden="true">
          <g stroke-width="5" stroke-linejoin="round">
            <ellipse cx="65" cy="165" rx="45" ry="55" fill={c.mane} stroke="#8a5a7a" />
            {#each [[130, 268], [168, 272], [246, 268], [282, 272]] as [x, y] (x)}
              <rect x={x - 18} y={y - 50} width="36" height="96" rx="16" fill={c.body} stroke="#7a6a9a" />
              <rect x={x - 18} y={y + 30} width="36" height="18" rx="6" fill="#e2b250" stroke="#aa7828" />
            {/each}
            <ellipse cx="190" cy="190" rx="110" ry="72" fill={c.body} stroke="#7a6a9a" />
            <ellipse cx="294" cy="94" rx="58" ry="58" fill={c.body} stroke="#7a6a9a" />
            <ellipse cx="236" cy="110" rx="38" ry="66" fill={c.mane} stroke="#8a5a7a" />
            <ellipse cx="234" cy="104" rx="14" ry="34" fill={c.mane2} stroke="none" />
            <polygon points="300,46 318,4 332,46" fill="#e2b250" stroke="#aa7828" />
            <ellipse cx="334" cy="116" rx="18" ry="14" fill="#ffe2d6" stroke="#c88c78" />
            <circle cx="304" cy="88" r="9" fill="#3a2650" stroke="none" />
          </g>
        </svg>
        {#if mouth && !headOnly}<div class="mouth-at" style="left:{mouthAt.x}px;top:{mouthAt.y}px">{@render mouth(MUNCH_SIZE * height)}</div>{/if}
      </div></div></div>
    </div>
  </div>
{/if}
