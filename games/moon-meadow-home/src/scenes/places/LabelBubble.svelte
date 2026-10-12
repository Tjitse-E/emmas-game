<script lang="ts">
  // The label act at the toy shelf (Task A10, spec item 10, decisions D10, D11, D19). A baby brings a found
  // thing (or a heap, or at level 3 a closed bag). She builds the label with gems and slides the star to check.
  // A right label puts a new jar on the shelf. Mistakes get a funny readback; nothing is ever taken away.
  import { onDestroy, onMount, untrack } from 'svelte';
  import Heap from '../../art/Heap.svelte';
  import Picture from '../../art/Picture.svelte';
  import Unicorn from '../../art/Unicorn.svelte';
  import GemSlots, { type SlotView } from '../../ui/GemSlots.svelte';
  import GemTray from '../../ui/GemTray.svelte';
  import Gem from '../../ui/Gem.svelte';
  import SoundSlider from '../../ui/SoundSlider.svelte';
  import { dropTarget } from '../../platform/input.ts';
  import { sleep } from '../../platform/timing.ts';
  import { registerSceneHook } from '../../platform/hooks.ts';
  import { ghost } from '../../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../../ui/moonbeam.svelte.ts';
  import { svg } from '../../ui/places-svg.ts';
  import { createMoment, type Moment } from '../../ui/moment.ts';
  import { defaultDeps } from '../../ui/moment-deps.ts';
  import { audio, numId, type SpeakId } from '../../audio/index.ts';
  import { game } from '../../game.svelte.ts';
  import { spellingKnowledge } from '../../core/learning/index.ts';
  import { checkLabel, labelAfterLines, labelItems, labelModel, labelOwn, planLabel, stemTray, type LabelCheck, type LabelMistake, type LabelTask } from '../../core/places/labels.ts';
  import { newJarId } from '../../core/places/jars.ts';
  import type { PlacesState } from '../../core/places/state.ts';
  import type { Result } from '../../core/places/types.ts';
  import { learnerView, logResult, serve, wordViews } from '../../places/plan.ts';
  import { setPlaceHook } from '../../places/hook.ts';
  import { once } from '../../places/session.ts';

  let { baby = null, ondone }: { baby?: string | null; ondone: () => void } = $props();

  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);
  const places = () => game.state.places as unknown as PlacesState;

  // ---- the task
  function plan(): LabelTask | null {
    const item = serve('s', 'toy-shelf', 'label');
    if (!item) return null;
    const w = wordViews().find((x) => x.id === item.carrier) ?? null;
    const cw = game.content.words[item.carrier];
    if (!w || !cw) return null;
    const know = spellingKnowledge(game.learner, game.content);
    const owned = new Set(know.own);
    const own = labelOwn(w.graphemes, (k) => owned.has(cw.gpcs[k]), item.items);
    const pool = know.own.map((id) => game.content.gpcs[id]?.text).filter((t): t is string => !!t && !t.includes('-'));
    return planLabel({
      served: item, word: w, own, s06Passed: learnerView().passedOrPlaced('S06'),
      stemTray: stemTray(w.graphemes, own, pool, item.scaffold, game.rng), rng: game.rng,
    });
  }

  const task = plan();
  const finder = untrack(() => (baby ? game.world.byId[baby] ?? null : game.world.herd.at(-1) ?? null));

  let built = $state<(string | null)[]>(task ? task.slots.map((s) => (s.own ? null : s.g)) : []);
  let ending = $state<string | null>(null);
  let checks: LabelCheck[] = [];
  let phase = $state<'arrive' | 'act' | 'jar' | 'right' | 'done'>('arrive');
  let reaction = $state<LabelMistake | null>(null);
  let wrong = $state<number[]>([]);
  let hum = $state<number | null>(null);
  let last = $state<{ result: Result; items: { item: string; result: Result }[] } | null>(null);
  let slotEls = $state<HTMLElement[]>([]);
  let dockEl = $state<HTMLElement | null>(null);
  let moment: Moment | null = null;

  const stemGems = $derived(task ? task.tray.filter((g) => !g.ending).map((g) => g.g) : []);
  const endGems = $derived(task ? task.tray.filter((g) => g.ending).map((g) => g.g) : []);
  const stemFull = $derived(!!task && task.slots.every((s, k) => !s.own || built[k] !== null));
  const showCount = $derived(!!task && (!task.jarAfterStem || phase === 'jar' || phase === 'right' || phase === 'done'));
  const slots = $derived<SlotView[]>(task ? task.slots.map((s, k) => ({
    gem: built[k], gift: !s.own, kind: vowel(s.g) ? 'vowel' : 'consonant', crown: false, hum: hum === k, glow: wrong.includes(k),
  })) : []);

  function vowel(g: string): boolean {
    return Object.values(game.content.gpcs).some((x) => x.text === g && x.vowel);
  }
  function soundOf(g: string): string | null {
    if (g === 'es') return 'iz';
    return Object.values(game.content.gpcs).find((x) => x.text === g)?.sound ?? null;
  }
  function hear(g: string): void {
    const s = soundOf(g);
    if (s) void audio.sound(s);
  }

  // ---- building
  function place(g: string, target: string | null, isEnding: boolean): void {
    if (!task || phase === 'right' || phase === 'done' || !target) return;
    moment?.touch();
    if (isEnding && target === 'dock' && task.endingDock) { ending = g; wrong = wrong.filter((k) => k !== task.slots.length); return; }
    const m = /^slot-(\d+)$/.exec(target);
    if (isEnding || !m) return;
    const k = Number(m[1]);
    if (!task.slots[k]?.own) return;
    built[k] = g;
    wrong = wrong.filter((x) => x !== k);
    if (task.jarAfterStem && phase === 'act' && stemFull) void tipBag();
  }
  function clearSlot(k: number): void {
    if (!task?.slots[k]?.own || phase === 'right' || phase === 'done') return;
    built[k] = null;
  }

  async function tipBag(): Promise<void> {
    if (!task) return;
    phase = 'jar';
    for (let i = 0; i < task.count; i++) { void audio.sfx('pop'); await sleep(180); }
    await say(['pl-look-in-jar']);
  }

  // ---- checking
  async function slide(): Promise<void> {
    if (!task || !moment || phase === 'right' || phase === 'done') return;
    if (!stemFull) return;   // a half-built label is not checked: the slider only plays it
    const check = checkLabel(task, built, task.endingDock ? ending : null);
    if (check.ok) return right();
    checks.push(check);
    moment.miss();
    wrong = check.wrongSlots;
    reaction = check.mistake;
    if (check.mistake === 'hop-out') await say(['lb-label-says-one']);
    else if (check.mistake === 'hiss' || check.mistake === 'dresss') { void audio.sfx('whoosh'); if (check.mistake === 'dresss') void audio.sfx('whoosh'); }
    else if (check.mistake === 'iz') { void audio.sfx('chime'); void audio.sfx('chime'); }
    else if (check.mistake === 'buzz') void audio.sfx('magic');
    await sleep(900);
    reaction = null;
    // The wrong gem pops out; its slot or the dock hums.
    for (const k of check.wrongSlots) {
      if (k === task.slots.length) ending = null;
      else built[k] = null;
    }
    hum = check.wrongSlots[0] ?? null;
    await say(labelModel(task));
    hum = null;
  }

  async function right(): Promise<void> {
    if (!task || !moment) return;
    const { result, ms } = moment.answer();
    moment = null;
    phase = 'right';
    wrong = [];
    const items = labelItems(task, checks, result);
    logResult(task.served, items, { result, ms, place: 'toy-shelf' }, finder?.id ?? null);
    last = { result, items: items.map((i) => ({ item: i.id, result: i.r })) };
    const gems = [...built.filter((g): g is string => g !== null), ...(task.plural && ending ? [ending] : [])];
    game.dispatch({
      type: 'place/jar', jar: newJarId(places(), game.visit ?? 'none'), word: task.target, gems, count: task.count,
      plural: task.plural, picture: task.word.picture, baby: finder?.id ?? null,
    });
    void audio.sfx('sparkle');
    await say(labelAfterLines(task));
    await say(['lb-on-the-jar']);
    phase = 'done';
    ondone();
  }

  // ---- hints
  function firstOpen(): number | null {
    if (!task) return null;
    const k = task.slots.findIndex((s, i) => s.own && (built[i] === null || wrong.includes(i)));
    if (k >= 0) return k;
    return task.endingDock && task.plural && ending !== task.wordEnding ? task.slots.length : null;
  }
  function targetEl(): HTMLElement | null {
    const k = firstOpen();
    if (k === null) return null;
    return k === task!.slots.length ? dockEl : slotEls[k] ?? null;
  }
  async function focused(): Promise<void> {
    if (!task) return;
    const el = targetEl();
    if (el) moonbeam.show(el);
    if (task.jarAfterStem && phase === 'jar' && (firstOpen() ?? -1) === task.slots.length) {
      for (let i = 1; i <= task.count; i++) await say([numId('n', i)]);
      return;
    }
    const k = firstOpen();
    if (k !== null && k < task.slots.length) hear(task.slots[k].g);
    else if (k === task.slots.length && task.wordEnding) hear(task.wordEnding);
  }
  async function ghostHint(): Promise<void> {
    if (!task) return;
    const k = firstOpen();
    if (k === null) return;
    const want = k === task.slots.length ? task.wordEnding : task.slots[k].g;
    const from = want ? document.querySelector(`[aria-label="gem ${CSS.escape(want)}"]`) : null;
    const to = targetEl();
    if (from && to) await ghost.drag(from, to);
  }

  // ---- test hook (label act and the scene hook)
  function build(gems: string[], end: string | null): void {
    if (!task) return;
    let i = 0;
    task.slots.forEach((s, k) => { if (s.own) built[k] = gems[i++] ?? null; });
    ending = end;
    if (task.jarAfterStem && phase === 'act' && stemFull) phase = 'jar';
  }
  const rightStem = () => task!.slots.filter((s) => s.own).map((s) => s.g);
  function hookAnswer(): void {
    if (!task) return;
    build(rightStem(), task.plural ? task.wordEnding : null);
    void slide();
  }
  function hookWrong(kind = 'ending'): void {
    if (!task) return;
    const stem = rightStem();
    if (kind === 'stem' && stem.length) {
      const other = stemGems.find((g) => g !== stem[0]) ?? 'z';
      build([other, ...stem.slice(1)], task.plural ? task.wordEnding : null);
    } else if (kind === 'bare') build(stem, null);
    else if (kind === 'one-ending' || kind === 'jar-of-one') build(stem, task.wordEnding ?? 's');
    else {
      const want = task.plural ? task.wordEnding : null;
      build(stem, want === 'es' ? 's' : want === 's' ? 'es' : 's');
    }
    void slide();
  }

  const labelHook = {
    task: () => (task ? { step: task.served.step, s10: task.s10, target: task.target, level: task.level, count: task.count, plural: task.plural, own: task.slots.map((s) => s.own), tray: task.tray.map((g) => g.g) } : null),
    build: (gems: string[], end: string | null) => build(gems, end),
    slide: () => slide(),
    last: () => last,
  };

  let unhook: (() => void) | null = null;
  onMount(() => {
    if (!task) { ondone(); return; }
    setPlaceHook('label', labelHook);
    unhook = registerSceneHook(game.scene || 'toy-shelf', {
      answer: () => moment?.hookAnswer(), wrong: (kind?: string) => moment?.hookWrong(kind), idle: () => moment?.hookIdle(),
      target: () => moment?.target() ?? null,
    });
    (async () => {
      await sleep(600);
      if (once('label-found')) await say(['lb-found']);
      phase = 'act';
      moment = createMoment({
        strand: 's', step: task.served.step, place: 'toy-shelf', goal: task.prompt,
        target: () => targetEl(), focused, ghost: ghostHint, hookAnswer, hookWrong,
      }, defaultDeps());
      await moment.start();
    })();
  });
  onDestroy(() => {
    moment?.dispose();
    unhook?.();
    setPlaceHook('label', null);
  });
</script>

{#if task}
  <div class="label-act" aria-label="label act">
    <div class="finder">
      {#if finder}
        <Unicorn breed={finder.breed} stage={finder.stage} colours={finder.colours} traits={finder.traits} height={190} pose={phase === 'right' || phase === 'done' ? 'happy' : 'idle'} label={finder.name ?? 'baby'} />
      {/if}
    </div>
    <div class="thing" class:hiss={reaction === 'hiss'} class:iz={reaction === 'iz'} class:dresss={reaction === 'dresss'} class:buzz={reaction === 'buzz'} class:hop={reaction === 'hop-out'} class:rattle={reaction === 'rattle'}>
      {#if !showCount}
        <div class="bag" aria-label="closed bag">{@html svg('bag')}</div>
      {:else}
        <div class="jar" aria-label="jar of {task.count}">
          <div class="jar-glass">{@html svg('jar')}</div>
          <div class="jar-things">
            {#if task.count > 1}<Heap id={task.word.picture} count={task.count} size={150} mode="jar" seed={task.count} label="{task.count} {task.word.word}" />
            {:else}<Picture id={task.word.picture} size={120} label={task.word.word} />{/if}
          </div>
          {#if phase === 'right' || phase === 'done'}<div class="new-label">{@html svg('jar-label', { label: task.target })}</div>{/if}
        </div>
      {/if}
      {#if reaction === 'hiss' || reaction === 'dresss'}<span class="steam" aria-hidden="true"></span>{/if}
    </div>

    <div class="label-row">
      <GemSlots {slots} bind:slotEls onslottap={clearSlot} />
      {#if task.endingDock}
        <div class="dock" class:glow={wrong.includes(task.slots.length)} class:hum={hum === task.slots.length} aria-label="ending dock"
          bind:this={dockEl} use:dropTarget={{ id: 'dock' }}>
          {#if ending}<Gem g={ending} size={76} />{:else}<span class="moon-slot" aria-hidden="true"></span>{/if}
        </div>
      {/if}
    </div>
    <div class="slider">
      <SoundSlider count={task.slots.length + (task.endingDock ? 1 : 0)} width={110}
        onpass={(i) => { const g = i < task.slots.length ? built[i] : ending; if (g) hear(g); }}
        ondone={() => void slide()} />
    </div>
    <div class="trays">
      {#if stemGems.length}<div class="tray stem"><GemTray gems={stemGems} ondrop={(g, t) => place(g, t, false)} ontap={hear} disabled={phase === 'right' || phase === 'done'} /></div>{/if}
      {#if endGems.length}<div class="tray endings"><GemTray gems={endGems} ondrop={(g, t) => place(g, t, true)} ontap={hear} disabled={phase === 'right' || phase === 'done'} /></div>{/if}
    </div>
  </div>
{/if}

<style>
  .label-act { position: absolute; inset: 0; background: rgba(255, 248, 236, .94); z-index: 40; }
  .finder { position: absolute; left: 150px; top: 120px; animation: walk-in calc(600ms * var(--speed, 1)) ease-out; }
  .thing { position: absolute; left: 480px; top: 90px; width: 220px; height: 250px; display: grid; place-items: center; }
  .bag, .jar-glass { width: 200px; height: 200px; }
  .bag :global(svg), .jar-glass :global(svg) { width: 100%; height: 100%; }
  .jar { position: relative; width: 200px; height: 220px; }
  .jar-glass { position: absolute; inset: 0; opacity: .9; }
  .jar-things { position: absolute; left: 25px; top: 55px; width: 150px; height: 150px; display: grid; place-items: center; }
  .new-label { position: absolute; left: 40px; top: 120px; width: 120px; height: 120px; animation: fly calc(500ms * var(--speed, 1)) ease-out; }
  .new-label :global(svg) { width: 100%; height: 100%; }
  .label-row { position: absolute; left: 0; right: 0; top: 380px; display: flex; justify-content: center; align-items: center; gap: 22px; }
  .dock { width: 96px; height: 96px; border-radius: 50% 18px 18px 50%; border: 4px dashed #d9a23a; background: #fff6d8; display: grid; place-items: center; }
  .dock.glow { animation: pulse calc(900ms * var(--speed, 1)) ease-in-out infinite; }
  .dock.hum { animation: hum calc(250ms * var(--speed, 1)) linear 6; }
  .moon-slot { width: 36px; height: 36px; border-radius: 50%; box-shadow: inset 10px -4px 0 0 #f0c75a; }
  .slider { position: absolute; left: 0; right: 0; top: 500px; display: flex; justify-content: center; }
  .trays { position: absolute; left: 0; right: 0; bottom: 30px; display: flex; justify-content: center; gap: 48px; }
  .tray.endings { padding: 8px 14px; border-radius: 26px; background: #fff3cf; }
  .hiss { animation: shake calc(120ms * var(--speed, 1)) linear 6; }
  .iz { animation: wobble calc(300ms * var(--speed, 1)) ease-in-out 3; }
  .dresss { animation: flap calc(200ms * var(--speed, 1)) ease-in-out 5; }
  .buzz { animation: shake calc(80ms * var(--speed, 1)) linear 10; }
  .hop .jar-things { animation: hop calc(450ms * var(--speed, 1)) ease-out 2; }
  .rattle { animation: shake calc(100ms * var(--speed, 1)) linear 8; }
  .steam { position: absolute; left: 90px; top: 0; width: 40px; height: 40px; border-radius: 50%; background: #ffffff; animation: puff calc(800ms * var(--speed, 1)) ease-out; opacity: 0; }
  @keyframes walk-in { from { transform: translateX(-300px); } to { transform: none; } }
  @keyframes fly { from { transform: translateY(200px) scale(.5); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes shake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  @keyframes wobble { 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
  @keyframes flap { 50% { transform: scaleX(1.06); } }
  @keyframes hop { 50% { transform: translateY(-60px); } }
  @keyframes puff { from { transform: translateY(0) scale(.5); opacity: .9; } to { transform: translateY(-80px) scale(1.6); opacity: 0; } }
  @keyframes pulse { 50% { transform: scale(1.06); } }
  @keyframes hum { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
</style>
