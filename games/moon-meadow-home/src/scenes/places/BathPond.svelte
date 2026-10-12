<script lang="ts">
  // The Bath Pond (Task A11, spec 2.5): babies splash in the water (one bath per baby per visit is a care act),
  // and at R19 a bath wish asks for one thing or many. A wrong give gets a funny reaction and drifts back.
  import { onDestroy, onMount, untrack } from 'svelte';
  import Heap from '../../art/Heap.svelte';
  import Picture from '../../art/Picture.svelte';
  import Unicorn from '../../art/Unicorn.svelte';
  import PrintWithDots from '../../ui/PrintWithDots.svelte';
  import MeadowArrow from '../../ui/MeadowArrow.svelte';
  import ReplayButton from '../../ui/ReplayButton.svelte';
  import { drag, dropTarget, press } from '../../platform/input.ts';
  import { setBands } from '../../platform/stage.svelte.ts';
  import { sleep } from '../../platform/timing.ts';
  import { registerSceneHook } from '../../platform/hooks.ts';
  import { ghost } from '../../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../../ui/moonbeam.svelte.ts';
  import { createMoment, type Moment } from '../../ui/moment.ts';
  import { defaultDeps } from '../../ui/moment-deps.ts';
  import { audio, type SpeakId } from '../../audio/index.ts';
  import { artUrl, background } from '../../art/manifest.ts';
  import { game } from '../../game.svelte.ts';
  import { bathers, planBathWish } from '../../core/places/pond.ts';
  import { afterLines, oneOrManyMistake, type OneOrManyMistake, type OneOrManyOption } from '../../core/places/plurals.ts';
  import { logResult, serve, wordViews } from '../../places/plan.ts';
  import { setPlaceHook } from '../../places/hook.ts';
  import { noteTouch, once, recentTouches } from '../../places/session.ts';
  import type { WorldBaby } from '../../types/contracts.ts';

  // The router's `params`: the pond reads none.
  let {}: { params?: Record<string, unknown> } = $props();

  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);
  const bg = background('bg-bath-pond');
  const served = serve('r', 'bath-pond', 'pond-word');
  const task = planBathWish(served, wordViews(), game.rng);

  const bank = untrack(() => bathers(game.world.herd, recentTouches()));
  const wisher: WorldBaby | null = task ? bank[0] ?? null : null;
  let inWater = $state<string[]>([]);
  let phase = $state<'free' | 'wish' | 'right' | 'done'>(task ? 'wish' : 'free');
  let reaction = $state<OneOrManyMistake | null>(null);
  let given = $state<string | null>(null);
  let glow = $state(false);
  let splashed = $state(false);
  let moment: Moment | null = null;
  let wishEl = $state<HTMLElement | null>(null);

  const onBank = $derived(bank.filter((b) => b.id !== wisher?.id && !inWater.includes(b.id)));
  const units = $derived.by(() => {
    if (!task) return [];
    const gs = task.plural ? task.target.plural!.graphemes : task.target.graphemes;
    return gs.map((g, i) => ({ g, text: g, silent: task.silentEnding && task.plural && i === gs.length - 1 }));
  });
  const showArrow = $derived(phase === 'done' || (phase === 'free' && splashed));

  function soundOf(g: string): string | null {
    if (g === 'es') return 'iz';
    return Object.values(game.content.gpcs).find((x) => x.text === g)?.sound ?? null;
  }
  function hear(g: string): void {
    const s = soundOf(g);
    if (s) void audio.sound(s);
  }

  // ---- splash play
  async function splash(id?: string): Promise<void> {
    const b = id ? bank.find((x) => x.id === id) : onBank[0];
    if (!b || b.id === wisher?.id || inWater.includes(b.id)) return;
    noteTouch(b.id);
    inWater = [...inWater, b.id];
    void audio.sfx('splash');
    if (once(`bath:${b.id}`)) game.dispatch({ type: 'place/care', baby: b.id, station: 'bath' });
    await say(['foal-splash']);
    splashed = true;
  }
  function outOfWater(id: string): void {
    inWater = inWater.filter((x) => x !== id);
  }

  // ---- the bath wish
  async function give(optionId: string): Promise<void> {
    if (!task || !moment || phase !== 'wish') return;
    const o = task.options.find((x) => x.id === optionId);
    if (!o) return;
    const mistake = oneOrManyMistake(task, o);
    if (mistake === null) return right(o);
    moment.miss();
    reaction = mistake;
    given = o.id;
    void say(['foal-silly']);
    await sleep(1100);
    reaction = null;
    given = null;
    glow = true;
    await sleep(900);
    glow = false;
  }

  async function right(o: OneOrManyOption): Promise<void> {
    if (!task || !moment || !served) return;
    const { result, ms } = moment.answer();
    moment = null;
    phase = 'right';
    given = o.id;
    logResult(served, task.items.map((id) => ({ id, r: result })), { result, ms, place: 'bath-pond' }, wisher?.id ?? null);
    void audio.sfx('sparkle');
    await say(afterLines(task));
    await say(['foal-yay']);
    phase = 'done';
    if (once('pond-play')) void playIntro();
  }

  function answerEl(): Element | null {
    if (!task) return null;
    const o = task.options.find((x) => x.id === task.answer);
    return o ? document.querySelector(`[aria-label="${CSS.escape(floatLabel(o))}"]`) : null;
  }
  const floatLabel = (o: OneOrManyOption) => `float ${o.word} ${o.many ? 'many' : 'one'}`;

  async function focused(): Promise<void> {
    if (!task) return;
    if (wishEl) moonbeam.show(wishEl);
    glow = true;
    for (const u of units) { if (!u.silent) hear(u.g); await sleep(500); }
    glow = false;
  }
  async function ghostHint(): Promise<void> {
    const from = answerEl();
    if (from && wishEl) await ghost.drag(from, wishEl);
  }

  function hookWrong(kind = 'other'): void {
    if (!task) return;
    const t = task.target.id;
    const pickId =
      kind === 'one-for-many' && task.plural ? `${t}:1`
      : kind === 'many-for-one' && !task.plural ? `${t}:n`
      : task.options.find((o) => o.word !== task.target.word)?.id ?? (task.plural ? `${t}:1` : `${t}:n`);
    void give(pickId);
  }

  async function playIntro(): Promise<void> {
    const first = document.querySelector('[aria-label^="bank "]');
    const water = document.querySelector('[aria-label="water"]');
    await say(['pd-play']);
    if (first && water) await ghost.drag(first, water);
  }

  const pondHook = {
    wish: () => (task ? { shown: task.shown, options: task.options.map((o) => ({ id: o.id, many: o.many, word: o.word })), answer: task.answer } : null),
    give: (id: string) => give(id),
    splash: (id?: string) => splash(id),
    inWater: () => [...inWater],
  };

  let unhook: (() => void) | null = null;
  onMount(() => {
    setBands('#bfe3f7', '#8cc66f');
    setPlaceHook('pond', pondHook);
    unhook = registerSceneHook('bath-pond', {
      answer: () => (moment ? moment.hookAnswer() : void splash()),
      wrong: (kind?: string) => moment?.hookWrong(kind),
      idle: () => moment?.hookIdle(),
      target: () => moment?.target() ?? (phase === 'free' ? 'water' : null),
    });
    void (async () => {
      await audio.preloadScene('places');
      if (once('pond-welcome')) await say(['pd-welcome']);
      if (task) {
        moment = createMoment({
          strand: 'r', step: 'R19', place: 'bath-pond', goal: ['pd-wish-goal'],
          target: () => answerEl(), focused, ghost: ghostHint,
          hookAnswer: () => void give(task.answer), hookWrong,
        }, defaultDeps());
        await moment.start();
      } else if (once('pond-play')) await playIntro();
    })();
  });
  onDestroy(() => {
    moment?.dispose();
    unhook?.();
    setPlaceHook('pond', null);
  });
</script>

<div class="pond-scene" aria-label="bath pond" style:background-image={bg ? `url(${artUrl(bg.src)})` : undefined} class:fallback={!bg}>
  <div class="water" aria-label="water" use:dropTarget={{ id: 'water' }}></div>

  {#each inWater as id (id)}
    {@const b = game.world.byId[id]}
    {#if b}
      <button class="swimmer" style:left="{200 + inWater.indexOf(id) * 150}px" aria-label="swimming {b.name ?? 'baby'}" use:press={() => outOfWater(id)}>
        <span class="bob"><Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={120} pose="happy" label="" /></span>
        <span class="soap s1" aria-hidden="true"></span><span class="soap s2" aria-hidden="true"></span><span class="soap s3" aria-hidden="true"></span>
      </button>
    {/if}
  {/each}

  <div class="bank">
    {#each onBank as b (b.id)}
      <button class="bather" aria-label="bank {b.name ?? 'baby'}"
        use:drag={{ data: b.id, onDrop: (d) => { if (d.targetId === 'water') void splash(b.id); }, onTap: () => { noteTouch(b.id); void audio.sfx('pop'); } }}>
        <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={130} pose="idle" label="" />
      </button>
    {/each}
  </div>

  <button class="slide" aria-label="slide" use:press={() => void splash()}>
    <Picture id="slide" size={170} label="" />
  </button>

  {#if task && wisher && phase !== 'free'}
    <div class="wisher" class:one-for-many={reaction === 'one-for-many'} class:many-for-one={reaction === 'many-for-one'} class:other={reaction === 'other'}
      aria-label="wish baby" bind:this={wishEl} use:dropTarget={{ id: 'wish-baby' }}>
      <div class="speech"><PrintWithDots {units} dotsMs={task.dots} dots={task.dots !== null} {glow} label="bath wish" size={52} onsound={hear} /></div>
      <Unicorn breed={wisher.breed} stage={wisher.stage} colours={wisher.colours} traits={wisher.traits} height={170} pose={phase === 'wish' ? 'idle' : 'happy'} label={wisher.name ?? 'baby'} />
      {#if given}
        {@const o = task.options.find((x) => x.id === given)}
        {#if o}<div class="on-head">{#if o.many}<Heap id={o.picture} count={o.count} size={110} seed={o.count} label="" />{:else}<Picture id={o.picture} size={80} label="" />{/if}</div>{/if}
      {/if}
    </div>
    {#if phase === 'wish'}
      <div class="floats">
        {#each task.options as o (o.id)}
          {#if o.id !== given}
            <button class="float" aria-label={floatLabel(o)}
              use:drag={{ data: o.id, onDrop: (d) => { if (d.targetId === 'wish-baby') void give(o.id); }, onTap: () => void audio.sfx('pop') }}>
              {#if o.many}<Heap id={o.picture} count={o.count} size={110} seed={o.count + o.word.length} label="" />{:else}<Picture id={o.picture} size={84} label="" />{/if}
            </button>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}

  {#if showArrow}<MeadowArrow />{/if}
  <ReplayButton onreplay={() => void say(['pd-play'])} />
</div>

<style>
  .pond-scene { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .pond-scene.fallback { background: radial-gradient(ellipse 520px 170px at 590px 430px, #8fd3f4 0 98%, transparent 100%), linear-gradient(#bfe3f7 0 30%, #8cc66f 30%); }
  .water { position: absolute; left: 80px; top: 280px; width: 1020px; height: 310px; border-radius: 50%; }
  .swimmer { position: absolute; top: 330px; width: 140px; height: 140px; z-index: 5; }
  .bob { display: block; animation: bob calc(1600ms * var(--speed, 1)) ease-in-out infinite; }
  .soap { position: absolute; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #ffffffcc; background: #ffffff55; opacity: 0;
    animation: rise calc(2200ms * var(--speed, 1)) ease-out infinite; }
  .s1 { left: 20px; top: 20px; } .s2 { left: 70px; top: 10px; animation-delay: .6s; } .s3 { left: 110px; top: 30px; animation-delay: 1.2s; }
  .bank { position: absolute; left: 300px; right: 40px; bottom: 16px; height: 170px; display: flex; gap: 14px; align-items: flex-end; }
  .bather { width: 130px; height: 150px; display: grid; place-items: end center; }
  .slide { position: absolute; right: 10px; top: 170px; width: 170px; height: 170px; }
  .wisher { position: absolute; left: 30px; top: 470px; width: 240px; height: 320px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; z-index: 6; }
  .speech { position: absolute; left: 10px; top: 0; z-index: 2; }
  .on-head { position: absolute; left: 70px; top: 120px; }
  .one-for-many .on-head { animation: look calc(500ms * var(--speed, 1)) ease-in-out 2; }
  .many-for-one .on-head { animation: topple calc(1000ms * var(--speed, 1)) ease-in forwards; }
  .other { animation: puzzled calc(300ms * var(--speed, 1)) ease-in-out 3; }
  .floats { position: absolute; left: 290px; top: 330px; width: 760px; display: flex; flex-wrap: wrap; gap: 16px 22px; justify-content: center; z-index: 4; }
  .float { width: 120px; height: 120px; display: grid; place-items: center; border-radius: 50%; background: #ffffff55; animation: drift calc(2600ms * var(--speed, 1)) ease-in-out infinite; }
  @keyframes bob { 50% { transform: translateY(10px); } }
  @keyframes rise { 0% { transform: translateY(0) scale(.6); opacity: .9; } 100% { transform: translateY(-110px) scale(1.2); opacity: 0; } }
  @keyframes drift { 50% { transform: translateY(-8px) rotate(2deg); } }
  @keyframes look { 25% { transform: translateX(-30px); } 75% { transform: translateX(30px); } }
  @keyframes topple { 60% { transform: rotate(-10deg); } 100% { transform: translate(60px, 120px) rotate(60deg); opacity: 0; } }
  @keyframes puzzled { 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
</style>
