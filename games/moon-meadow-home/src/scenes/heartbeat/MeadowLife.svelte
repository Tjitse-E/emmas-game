<script lang="ts">
  // The heartbeat's living layer in places' meadow (spec 2.5, 2.7): moonflowers, the nest with its waiting egg,
  // up to 12 babies, and care free play (drag the brush, a food from the tray or the heart onto a baby; tap a baby
  // for a trick). The tray (docs/v3/next/plan.md F4) holds three food words: a tap says the word, a drop feeds a baby.
  // Free play is never checked; care gives a heart at most once per baby per visit (the store decides).
  import { game } from '../../game.svelte.ts';
  import { audio } from '../../audio/index.ts';
  import { drag, dropTarget, press } from '../../platform/input.ts';
  import { sleep } from '../../platform/timing.ts';
  import Unicorn from '../../art/Unicorn.svelte';
  import Egg from '../../art/Egg.svelte';
  import { CARE_OF_TOOL, FOAL_LINE, meadowBabies, type CareTool, type FreeCare } from '../../core/heartbeat/meadow.ts';
  import { breedForStep } from '../../core/eggs/breed.ts';
  import { SCENE_ART_IDS } from '../../types/contracts.ts';
  import { heartbeat } from './flow.svelte.ts';
  import { bridge } from './deps.ts';
  import ArtImg from './ArtImg.svelte';
  import Moonflowers from './Moonflowers.svelte';
  import { hasPicture } from '../../art/manifest.ts';
  import { testSeed } from '../../platform/hooks.ts';
  import { makeRng } from '../../core/rng.ts';
  import { trayFoods } from '../../core/heartbeat/feed.ts';
  import { feedState } from '../feed/flags.ts';
  import FoodTray from '../feed/FoodTray.svelte';
  import Munch from '../feed/Munch.svelte';

  let { onbabytouch = undefined, ribbonMode = false, ribbons = {}, ontieribbon = undefined, lite = false }: {
    onbabytouch?: (id: string) => void; ribbonMode?: boolean; ribbons?: Record<string, boolean>; ontieribbon?: (id: string) => void; lite?: boolean;
  } = $props();

  /** Stage spots for up to 12 babies, kept clear of the nest (centre bottom) and the top bar. */
  const SPOTS: [number, number][] = [
    [250, 470], [820, 470], [990, 520], [400, 600], [700, 610], [140, 600],
    [300, 300], [520, 290], [760, 300], [960, 330], [1060, 660], [130, 380],
  ];
  const TOOLS: Exclude<CareTool, 'food'>[] = ['brush', 'heart'];
  const TOOL_ART: Record<Exclude<CareTool, 'food'>, string> = { brush: SCENE_ART_IDS.careBrush, heart: SCENE_ART_IDS.careHeart };
  // The tray: three foods she can read when there are, new on each meadow arrival (N23). Only pictured foods with a clip.
  const trayWords = new Map([...bridge.words()].filter(([, w]) => w.food && hasPicture(w.picture) && audio.hasClip(w.clip)));
  const readable = (step: string): boolean => {
    const st = bridge.stepStatusOf(step);
    return st === 'passed' || st === 'placed' || step === bridge.currentStepOf('r');
  };
  const seed = testSeed();
  const tray = trayFoods(trayWords.values(), (w) => readable(w.step), seed !== null ? makeRng(seed + 4111) : game.rng);
  feedState.tray = [...tray];
  let munch = $state<{ baby: string; picture: string; n: number } | null>(null);
  const babies = $derived(meadowBabies(game.world.herd));
  const eggBreed = $derived.by(() => { void game.version; return breedForStep(bridge.content(), bridge.currentStepOf('m')); });
  let trick = $state<string | null>(null);
  let happy = $state<string | null>(null);

  async function tapBaby(id: string): Promise<void> {
    if (ribbonMode) { ontieribbon?.(id); return; }
    onbabytouch?.(id);
    if (await heartbeat.tapBaby(id)) return;   // the moon's new name takes over
    care(id, 'trick');
    trick = id;
    await sleep(900);
    if (trick === id) trick = null;
  }

  function care(id: string, kind: FreeCare): void {
    heartbeat.noteOtherActivity();
    game.dispatch({ type: 'hb.care', baby: id, station: kind });
    void audio.say(FOAL_LINE[kind]);
    happy = id;
    void sleep(1200).then(() => { if (happy === id) happy = null; });
  }

  /** A tray food dropped on a baby: it munches (sfx, three bites), says "Yum!", and the care is a treat. */
  async function feed(word: string, target: string): Promise<void> {
    if (!target.startsWith('meadow-baby-')) return;
    const id = target.slice('meadow-baby-'.length);
    heartbeat.noteOtherActivity();
    game.dispatch({ type: 'hb.care', baby: id, station: CARE_OF_TOOL.food });
    const m = { baby: id, picture: trayWords.get(word)?.picture ?? word, n: (munch?.n ?? 0) + 1 };
    munch = m;
    happy = id;
    void sleep(1200).then(() => { if (munch === m) munch = null; if (happy === id) happy = null; });
    await audio.sfx('munch');
    await audio.say(FOAL_LINE.treat);
  }

  function dropTool(tool: CareTool, target: string | null): void {
    if (!target?.startsWith('meadow-baby-')) return;
    care(target.slice('meadow-baby-'.length), CARE_OF_TOOL[tool]);
  }
</script>

<div class="life">
  <Moonflowers count={game.world.flowers} />
  <button class="nest" data-touch aria-label="nest" use:press={() => void heartbeat.start()}>
    <ArtImg id={SCENE_ART_IDS.nest} size={200} />
    <span class="egg"><Egg kind={eggBreed} size={110} wobble label="" /></span>
  </button>
  {#each babies as b, i (b.id)}
    <button class="baby" class:trick={trick === b.id} data-touch aria-label="baby {b.name ?? 'new'}" data-baby={b.id}
      style:left="{SPOTS[i][0]}px" style:top="{SPOTS[i][1]}px"
      use:dropTarget={{ id: `meadow-baby-${b.id}` }} use:press={() => void tapBaby(b.id)}>
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={130}
        pose={happy === b.id ? 'happy' : trick === b.id ? 'hop' : 'idle'} seed={i} {lite} label="" />
      {#if ribbons[b.id]}<span class="ribbon" aria-hidden="true"></span>{/if}
      {#if munch?.baby === b.id}{#key munch.n}<Munch picture={munch.picture} size={50} left={98} top={22} />{/key}{/if}
    </button>
  {/each}
  {#if babies.length}
    <div class="tools">
      {#each TOOLS as t (t)}
        <button class="tool" data-touch aria-label="tool {t}" use:drag={{ data: t, onDrop: (d) => dropTool(t, d.targetId) }}>
          <ArtImg id={TOOL_ART[t]} size={76} />
        </button>
      {/each}
    </div>
    {#if tray.length}
      <div class="food-tray"><FoodTray foods={tray} words={trayWords} onfeed={(w, t) => void feed(w, t)} /></div>
    {/if}
  {/if}
</div>

<style>
  .life { position: absolute; inset: 0; touch-action: none; pointer-events: none; }
  .life > :global(*) { pointer-events: auto; }
  .nest { position: absolute; left: 490px; top: 600px; width: 200px; height: 170px; background: none; border: 0; padding: 0; }
  .nest .egg { position: absolute; left: 45px; top: -18px; }
  .baby { position: absolute; width: 150px; height: 150px; background: none; border: 0; padding: 0; transform: translate(-50%, -50%);
    display: flex; align-items: flex-end; justify-content: center; }
  .baby.trick { animation: hop calc(450ms * var(--speed, 1)) 2; }
  .ribbon { position: absolute; right: 18px; top: 26px; width: 28px; height: 28px; border-radius: 50%; background: #ff7fbf; border: 3px solid #e0559c; }
  .tools { position: absolute; left: 24px; bottom: 24px; display: flex; gap: 14px; }
  /* The tray sits in the free sky between the top-left buttons and the moon (it was the treat tool, bottom left). */
  .food-tray { position: absolute; left: 400px; top: 10px; }
  .tool { width: 96px; height: 96px; display: grid; place-items: center; background: #fff; border: 4px solid #c9b8ff; border-radius: 28px; touch-action: none; padding: 0; }
  @keyframes hop { 50% { transform: translate(-50%, -62%) rotate(-8deg); } }
</style>
