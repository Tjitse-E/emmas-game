<script lang="ts" module>
  // The `building` test hook (Task A13, contracts C10): registered when the scene map loads this module.
  import { setPlaceHook } from '../../places/hook.ts';
  import { enterPlace, toMeadow } from '../../places/nav.ts';
  import { sceneHook } from '../../platform/hooks.ts';
  import { activeMoment } from '../../ui/moment.ts';
  import { game as store } from '../../game.svelte.ts';
  import { activePart, type WallView } from './building/part-api.ts';

  type DayView = { plot: string; part: string | null; done: string[]; built: boolean };
  let view: DayView | null = null;
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const naming = (part: string | null) => (part === 'circle' || part === 'row-name' ? sceneHook('naming') : null);

  /** The scene hook's answer: the active moment, the naming inside the circle or row name, or the free part. */
  function answerNow(): unknown {
    const n = naming(view?.part ?? null);
    if (n) return n.answer();
    const m = activeMoment();
    if (m) return m.hookAnswer();
    return activePart()?.answer();
  }

  setPlaceHook('building', {
    start: (plot: string) => enterPlace('building-day', { plot }),
    state: (): (Omit<DayView, 'built'> & { wall: WallView | null }) | null =>
      view ? { plot: view.plot, part: view.part, done: [...view.done], wall: activePart()?.wall?.() ?? null } : null,
    drop: (n: number) => activePart()?.drop?.(n),
    trim: (colour: string) => activePart()?.trim?.(colour),
    sign: (gems: string[]) => activePart()?.sign?.(gems),
    cut: () => activePart()?.cut?.(),
    /** Answers every remaining part, then goes back to the meadow. Resolves when the scene has left. */
    async auto(): Promise<void> {
      for (let i = 0; i < 600 && store.scene === 'building-day'; i++) {
        if (view?.built && view.part === null) { await toMeadow(); break; }
        try { await answerNow(); } catch { /* a part between moments */ }
        await wait(120);
      }
      for (let i = 0; i < 100 && store.scene === 'building-day'; i++) await wait(50);
    },
  });
</script>

<script lang="ts">
  // A Building Day (Task A13, spec 2.4): the builders arrive and the parts of the plot run one after the other,
  // each its own goal. Finished parts are logged as she finishes them, so leaving halfway keeps them and a
  // new visit carries on with the next part (Review Focus 3). The last part builds the plot.
  import { onDestroy, onMount, untrack } from 'svelte';
  import Lumi from '../../art/Lumi.svelte';
  import Picture from '../../art/Picture.svelte';
  import Unicorn from '../../art/Unicorn.svelte';
  import MeadowArrow from '../../ui/MeadowArrow.svelte';
  import ReplayButton from '../../ui/ReplayButton.svelte';
  import { setBands } from '../../platform/stage.svelte.ts';
  import { registerSceneHook } from '../../platform/hooks.ts';
  import { sleep } from '../../platform/timing.ts';
  import { svg } from '../../ui/places-svg.ts';
  import { audio, type SpeakId } from '../../audio/index.ts';
  import { artUrl, background, hasPicture } from '../../art/manifest.ts';
  import { game } from '../../game.svelte.ts';
  import { nextPart, partsDone, partsFor, rowOfPlot, type PartId } from '../../core/places/building.ts';
  import { afterPart } from '../../core/places/building-day.ts';
  import { plotDefs, rowDef } from '../../core/places/content.ts';
  import type { PlacesState } from '../../core/places/state.ts';
  import { once } from '../../places/session.ts';
  import Walls from './building/Walls.svelte';
  import Trim from './building/Trim.svelte';
  import Sign from './building/Sign.svelte';
  import Ribbon from './building/Ribbon.svelte';
  import Circle from './building/Circle.svelte';
  import RowName from './building/RowName.svelte';

  let { params = {} }: { params?: Record<string, unknown> } = $props();

  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);
  const places = () => game.world.places as unknown as PlacesState;
  const plot = untrack(() => String(params.plot ?? game.params.plot ?? ''));
  const row = rowOfPlot(plot);
  const def = plotDefs.find((p) => p.id === plot) ?? null;
  const known = row !== null || def !== null;
  const picture = row !== null ? rowDef.picture : def?.picture ?? null;
  const bg = background('bg-building-yard');

  const logged = new Set<string>(untrack(() => (known ? partsDone(places(), plot) : [])));
  let built = $state(untrack(() => Boolean(places().buildings[plot]?.done)));
  let part = $state<PartId | null>(null);
  let finale = $state(false);
  let talking = $state(false);
  let showArrow = $state(false);

  function sync(): void {
    view = { plot, part, done: [...logged], built };
  }

  /** Logs a finished part once (and the building when it was the last). */
  function logPart(p: PartId): void {
    if (logged.has(p)) return;
    const out = afterPart(plot, p, [...logged]);
    logged.add(p);
    for (const a of out.actions) game.dispatch(a);
    if (out.built) built = true;
    sync();
  }

  async function advance(p: PartId): Promise<void> {
    logPart(p);
    part = null;
    sync();
    await sleep(300);
    const next = nextPart(plot, [...logged]);
    if (next !== null) { part = next; sync(); return; }
    await celebrate();
  }

  async function celebrate(): Promise<void> {
    finale = true;
    void audio.sfx('fanfare');
    talking = true;
    await say([row === null ? def?.lumi ?? 'lumi-row-open' : rowDef.lumi]);
    talking = false;
    showArrow = true;
    sync();
  }

  let unhook: (() => void) | null = null;
  onMount(() => {
    setBands('#cfe8ff', '#b8d98a');
    unhook = registerSceneHook('building-day', {
      answer: () => answerNow(),
      wrong: (kind?: string) => {
        const n = naming(part);
        if (n) return n.wrong();
        const m = activeMoment();
        return m ? m.hookWrong(kind) : activePart()?.wrong?.(kind);
      },
      idle: () => activeMoment()?.hookIdle(),
      target: () => {
        const n = naming(part);
        if (n && typeof n.target === 'function') return n.target();
        return activeMoment()?.target() ?? activePart()?.target?.() ?? (showArrow ? 'meadow' : null);
      },
    });
    sync();
    void (async () => {
      await audio.preloadScene('places');
      if (!known) { showArrow = true; return; }
      if (built) { finale = true; showArrow = true; sync(); return; }
      if (once(`builders:${plot}`)) { talking = true; await say(['lumi-builders']); talking = false; }
      part = nextPart(plot, [...logged]);
      sync();
      if (part === null) await celebrate();
    })();
  });
  onDestroy(() => {
    unhook?.();
    view = null;
  });
</script>

<div class="yard" aria-label="building {plot}" style:background-image={bg ? `url(${artUrl(bg.src)})` : undefined} class:fallback={!bg}>
  <span class="builder left" aria-hidden="true">
    <Unicorn breed="pebble" stage="foal" colours={{ body: '#f6e7c8', mane: '#e0a040', mane2: '#c97a2a' }} height={170} pose={finale ? 'happy' : 'idle'} label="" />
    <span class="hat"><svg viewBox="0 0 100 60"><path d="M15 46a35 35 0 0 1 70 0z" fill="#ffd75e" stroke="#b8901c" stroke-width="4"/><rect x="5" y="44" width="90" height="10" rx="5" fill="#ffc83a" stroke="#b8901c" stroke-width="4"/></svg></span>
  </span>
  <span class="builder right" aria-hidden="true">
    <Unicorn breed="snow" stage="foal" facing="left" colours={{ body: '#e8f0ff', mane: '#7fa8e0', mane2: '#5a7fc0' }} height={170} pose={finale ? 'happy' : 'idle'} label="" />
    <span class="hat"><svg viewBox="0 0 100 60"><path d="M15 46a35 35 0 0 1 70 0z" fill="#ffd75e" stroke="#b8901c" stroke-width="4"/><rect x="5" y="44" width="90" height="10" rx="5" fill="#ffc83a" stroke="#b8901c" stroke-width="4"/></svg></span>
  </span>

  {#if part === 'walls'}<Walls {plot} short={partsFor(plot).length === 2} ondone={() => void advance('walls')} />
  {:else if part === 'trim'}<Trim {plot} ondone={() => void advance('trim')} />
  {:else if part === 'sign'}<Sign {plot} {picture} ondone={() => void advance('sign')} />
  {:else if part === 'ribbon'}<Ribbon {plot} {picture} ondone={() => void advance('ribbon')} />
  {:else if part === 'circle'}<Circle {plot} breed={def?.breed ?? null} onhatched={() => logPart('circle')} ondone={() => void advance('circle')} />
  {:else if part === 'row-name'}<RowName row={row ?? 0} ondone={() => void advance('row-name')} />
  {/if}

  {#if finale}
    <div class="built" aria-label="built {plot}">
      {#if picture && hasPicture(picture)}<Picture id={picture} size={420} label="" />{:else}<span class="house">{@html svg('place')}</span>{/if}
      {#if row !== null && game.world.rowNames[row - 1]}<span class="row-sign">{game.world.rowNames[row - 1]} Row</span>{/if}
    </div>
  {/if}
  {#if talking}<span class="lumi"><Lumi size={150} talking /></span>{/if}
  {#if showArrow}<MeadowArrow />{/if}
  {#if part !== 'circle' && part !== 'row-name'}<ReplayButton onreplay={() => void activeMoment()?.replay()} />{/if}
</div>

<style>
  .yard { position: absolute; inset: 0; background-size: cover; background-position: center; overflow: hidden; }
  .yard.fallback { background: linear-gradient(#cfe8ff 0 42%, #b8d98a 42%); }
  .builder { position: absolute; bottom: 150px; width: 170px; z-index: 1; }
  .builder.left { left: 10px; }
  .builder.right { right: 10px; }
  .hat { position: absolute; top: -6px; left: 92px; width: 66px; height: 40px; }
  .builder.right .hat { left: 12px; }
  .hat :global(svg) { width: 100%; height: 100%; }
  .built { position: absolute; left: 0; right: 0; top: 120px; display: grid; place-items: center; animation: rise calc(700ms * var(--speed, 1)) ease-out; }
  .house { display: block; width: 380px; height: 380px; }
  .house :global(svg) { width: 100%; height: 100%; }
  .row-sign { margin-top: 12px; padding: 10px 26px; border-radius: 16px; background: #fff3d6; border: 4px solid #c99a5a; font: 700 44px/1.1 'Andika', sans-serif; color: #5a3a1a; }
  .lumi { position: absolute; right: 190px; top: 20px; z-index: 50; animation: rise calc(400ms * var(--speed, 1)) ease-out; }
  @keyframes rise { from { transform: translateY(60px) scale(.8); opacity: 0; } to { transform: none; opacity: 1; } }
</style>
