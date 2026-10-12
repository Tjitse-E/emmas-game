<script lang="ts">
  // The sign part of a Building Day (Task A13, R38, decision D19). First a small picture sign: she writes the
  // word the planner served for her current spelling step (a `label` moment). Then the building's own name sign:
  // slots whose grapheme step she passed or placed are hers (review or mixed), every other gem is a gift that
  // flies in by itself. A full row is checked at once: a wrong gem pops out and its slot hums.
  import { onDestroy, onMount, untrack } from 'svelte';
  import Picture from '../../../art/Picture.svelte';
  import { hasPicture } from '../../../art/manifest.ts';
  import GemSlots, { type SlotView } from '../../../ui/GemSlots.svelte';
  import GemTray from '../../../ui/GemTray.svelte';
  import { sleep } from '../../../platform/timing.ts';
  import { ghost } from '../../../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../../../ui/moonbeam.svelte.ts';
  import { svg } from '../../../ui/places-svg.ts';
  import { createMoment, type Moment } from '../../../ui/moment.ts';
  import { defaultDeps } from '../../../ui/moment-deps.ts';
  import { audio, wordId, type SpeakId } from '../../../audio/index.ts';
  import { game } from '../../../game.svelte.ts';
  import { spellingKnowledge } from '../../../core/learning/index.ts';
  import { partAsks, signFor, signResults, signTask, type SignTask } from '../../../core/places/building.ts';
  import { signSlotResults, signSteps, type SignContent } from '../../../core/places/building-day.ts';
  import { labelItems, labelOwn, planLabel, stemTray, type LabelTask } from '../../../core/places/labels.ts';
  import { learnerView, logPick, logResult, serveAsk, wordViews } from '../../../places/plan.ts';
  import { setPart } from './part-api.ts';

  // picture: the building's own picture, shown on the name sign.
  let { plot, picture = null, ondone }: { plot: string; picture?: string | null; ondone: () => void } = $props();

  const say = (ids: string[]) => audio.sayAll(ids as SpeakId[]);
  type Slot = { g: string; own: boolean };
  type Stage = { kind: 'picture'; task: LabelTask; slots: Slot[]; tray: string[]; prompt: string[]; picture: string; word: string }
    | { kind: 'name'; task: SignTask; slots: Slot[]; tray: string[]; prompt: string[]; picture: string | null; word: string };

  // ---- the two stages
  const know = untrack(() => spellingKnowledge(game.learner, game.content));
  const owned = new Set(know.own);
  const pool = know.own.map((id) => game.content.gpcs[id]?.text).filter((t): t is string => !!t && !t.includes('-'));

  function pictureStage(): Stage | null {
    const ask = partAsks('sign', learnerView(), game.visit)[0];
    const item = ask ? serveAsk(ask) : null;
    if (!item) return null;
    const w = wordViews().find((x) => x.id === item.carrier) ?? null;
    const cw = game.content.words[item.carrier];
    if (!w || !cw || !w.picture) return null;
    const own = labelOwn(w.graphemes, (k) => owned.has(cw.gpcs[k]), item.items);
    const task = planLabel({
      served: item, word: w, own, s06Passed: learnerView().passedOrPlaced('S06'),
      stemTray: stemTray(w.graphemes, own, pool, item.scaffold, game.rng), rng: game.rng,
    });
    // An S10 plural label belongs at the toy shelf: the small sign is always one thing.
    if (!task || task.s10 || !task.slots.some((s) => s.own)) return null;
    return { kind: 'picture', task, slots: task.slots, tray: task.tray.map((g) => g.g), prompt: task.prompt, picture: w.picture, word: w.word };
  }

  function nameStage(): Stage {
    const sign = signFor(plot);
    const t = signTask(sign, signSteps(sign, game.content as unknown as SignContent), learnerView());
    const slots = sign.graphemes.map((g, i) => ({ g, own: t.own[i] }));
    return {
      kind: 'name', task: t, slots, tray: t.checked ? stemTray(sign.graphemes, t.own, pool, 1, game.rng) : [],
      prompt: ['lb-lets-write', sign.clip, 'lb-listen', sign.clip], picture: untrack(() => picture), word: sign.word,
    };
  }

  const stages: Stage[] = untrack(() => [pictureStage(), nameStage()].filter((s): s is Stage => s !== null));
  let k = $state(0);
  const stage = $derived(stages[k]);
  let built = $state<(string | null)[]>([]);
  let hum = $state<number | null>(null);
  let risen = $state(false);
  let phase = $state<'play' | 'busy' | 'done'>('busy');
  let slotEls = $state<HTMLElement[]>([]);
  let wrongOnce = new Set<number>();
  let moment: Moment | null = null;

  const views = $derived<SlotView[]>(stage.slots.map((s, i) => ({
    gem: built[i] ?? null, gift: !s.own, kind: vowel(s.g) ? 'vowel' : 'consonant', crown: false, hum: hum === i, glow: false,
  })));

  function vowel(g: string): boolean {
    return Object.values(game.content.gpcs).some((x) => x.text === g && x.vowel);
  }
  function hear(g: string): void {
    const s = Object.values(game.content.gpcs).find((x) => x.text === g)?.sound ?? null;
    if (s) void audio.sound(s);
  }

  // ---- building the row
  function place(g: string, target: string | null): void {
    if (phase !== 'play' || !target) return;
    const m = /^slot-(\d+)$/.exec(target);
    if (!m) return;
    const i = Number(m[1]);
    if (!stage.slots[i]?.own) return;
    moment?.touch();
    built[i] = g;
    hear(g);
    if (stage.slots.every((s, j) => !s.own || built[j] !== null)) void check();
  }
  function clearSlot(i: number): void {
    if (phase !== 'play' || !stage.slots[i]?.own) return;
    built[i] = null;
  }

  async function check(): Promise<void> {
    if (phase !== 'play') return;
    const wrong = stage.slots.flatMap((s, i) => (s.own && built[i] !== s.g ? [i] : []));
    if (!wrong.length) return solved();
    phase = 'busy';
    moment?.miss();
    for (const i of wrong) wrongOnce.add(i);
    await sleep(500);
    void audio.sfx('pop');
    for (const i of wrong) built[i] = null;
    hum = wrong[0];
    await say(['lb-listen', stage.kind === 'name' ? signFor(plot).clip : wordId(stage.word)]);
    hum = null;
    phase = 'play';
  }

  async function solved(): Promise<void> {
    phase = 'busy';
    const s = stage;
    if (moment) {
      const { result, ms } = moment.answer();
      moment = null;
      if (s.kind === 'picture') {
        const checks = wrongOnce.size ? [{ ok: false, wrongSlots: [...wrongOnce], mistake: 'stem' as const }] : [];
        logResult(s.task.served, labelItems(s.task, checks, result), { result, ms, place: 'building-day' });
      } else {
        for (const r of signResults(s.task, signSlotResults(s.task.own, wrongOnce, result))) {
          logPick(r.pick, { result: r.outcome.result, ms, place: 'building-day', slots: r.outcome.slots });
        }
      }
    }
    await finishStage();
  }

  async function finishStage(): Promise<void> {
    const s = stage;
    void audio.sfx('sparkle');
    risen = true;
    await say([s.kind === 'name' ? signFor(plot).clip : wordId(s.word)]);
    await sleep(700);
    if (k + 1 < stages.length) { k++; await start(); return; }
    phase = 'done';
    ondone();
  }

  // ---- hints
  function firstOpen(): number | null {
    const i = stage.slots.findIndex((s, j) => s.own && built[j] !== s.g);
    return i >= 0 ? i : null;
  }
  async function focused(): Promise<void> {
    const i = firstOpen();
    if (i === null) return;
    if (slotEls[i]) moonbeam.show(slotEls[i]);
    hear(stage.slots[i].g);
  }
  async function ghostHint(): Promise<void> {
    const i = firstOpen();
    if (i === null) return;
    const from = document.querySelector(`[aria-label="gem ${CSS.escape(stage.slots[i].g)}"]`);
    if (from && slotEls[i]) await ghost.drag(from, slotEls[i]);
  }

  // ---- test hook
  function fill(gems: string[]): void {
    if (phase !== 'play') return;
    let j = 0;
    stage.slots.forEach((s, i) => { if (s.own) built[i] = gems[j++] ?? null; });
    if (stage.slots.every((s, i) => !s.own || built[i] !== null)) void check();
  }
  const rightGems = () => stage.slots.filter((s) => s.own).map((s) => s.g);
  function wrongGems(): string[] {
    const right = rightGems();
    const other = stage.tray.find((g) => g !== right[0]) ?? 'z';
    return [other, ...right.slice(1)];
  }

  async function start(): Promise<void> {
    const s = stage;
    wrongOnce = new Set();
    risen = false;
    hum = null;
    built = s.slots.map((x) => (x.own ? null : x.g));
    const anyOwn = s.slots.some((x) => x.own);
    if (!anyOwn) {
      // Nothing to check: every gem is a gift and flies in by itself, one every 400 ms, with its sound.
      built = s.slots.map(() => null);
      await say(s.prompt);
      for (let i = 0; i < s.slots.length; i++) {
        built[i] = s.slots[i].g;
        hear(s.slots[i].g);
        await sleep(400);
      }
      await finishStage();
      return;
    }
    phase = 'play';
    moment = createMoment({
      strand: 's', step: s.kind === 'picture' ? s.task.served.step : null, place: 'building-day', goal: s.prompt,
      target: () => { const i = firstOpen(); return i === null ? null : document.querySelector(`[aria-label="gem ${CSS.escape(s.slots[i].g)}"]`); },
      focused, ghost: ghostHint,
      hookAnswer: () => fill(rightGems()),
      hookWrong: () => fill(wrongGems()),
    }, defaultDeps());
    await moment.start();
  }

  let offPart: (() => void) | null = null;
  onMount(() => {
    offPart = setPart({
      part: 'sign',
      answer: () => (moment ? moment.hookAnswer() : undefined),
      wrong: (kind) => moment?.hookWrong(kind),
      target: () => moment?.target() ?? null,
      sign: (gems) => fill(gems),
    });
    void (async () => {
      await say(['bd-sign']);
      await start();
    })();
  });
  onDestroy(() => {
    moment?.dispose();
    offPart?.();
  });
</script>

<div class="sign-part" aria-label="sign part">
  <div class="board" class:risen class:small={stage.kind === 'picture'} aria-label={stage.kind === 'picture' ? 'picture sign' : 'name sign'}>
    <span class="post" aria-hidden="true">{@html svg('plot-sign')}</span>
    {#if stage.kind === 'picture'}<span class="pic"><Picture id={stage.picture} size={150} label={stage.word} /></span>
    {:else if stage.picture && hasPicture(stage.picture) && !risen}<span class="pic"><Picture id={stage.picture} size={150} label="" /></span>{/if}
    {#if risen}<span class="word" class:low={stage.kind === 'picture'}>{stage.slots.map((x) => x.g).join('')}</span>{/if}
  </div>
  <div class="row"><GemSlots slots={views} bind:slotEls onslottap={clearSlot} /></div>
  {#if stage.tray.length}
    <div class="tray"><GemTray gems={stage.tray} ondrop={place} ontap={(g) => { moment?.touch(); hear(g); }} disabled={phase !== 'play'} /></div>
  {/if}
</div>

<style>
  .sign-part { position: absolute; inset: 0; }
  .board { position: absolute; left: 390px; top: 30px; width: 400px; height: 300px; display: grid; place-items: center;
    transition: transform calc(500ms * var(--speed, 1)) ease-out; }
  .board.small { left: 440px; width: 300px; height: 240px; }
  .board.risen { transform: translateY(-14px) scale(1.06); }
  .post { position: absolute; inset: 0; }
  .post :global(svg) { width: 100%; height: 100%; }
  .pic { position: relative; top: -40px; }
  .word { position: absolute; left: 0; right: 0; top: 70px; text-align: center; font: 700 64px/1 'Andika', sans-serif; color: #5a3a1a;
    animation: pop calc(400ms * var(--speed, 1)) ease-out; }
  .word.low { top: 150px; font-size: 44px; }
  @keyframes pop { from { transform: scale(.5); opacity: 0; } to { transform: none; opacity: 1; } }
  .row { position: absolute; left: 0; right: 0; top: 360px; display: flex; justify-content: center; }
  .tray { position: absolute; left: 0; right: 0; bottom: 50px; }
</style>
