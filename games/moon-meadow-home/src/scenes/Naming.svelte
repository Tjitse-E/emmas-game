<script lang="ts">
  // Naming (spec 2.8): name bells to ring and drag to the baby, the name garden, first sounds and the gold bell.
  // As a scene it reads { target, then } from its params; places, goodnight and the herd circle mount it with
  // { target, onnamed } instead.
  import { onDestroy, onMount, untrack } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { drag, dropTarget, press } from '../platform/input.ts';
  import { registerHook, registerSceneHook } from '../platform/hooks.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import Unicorn from '../art/Unicorn.svelte';
  import GemSlots, { type SlotView } from '../ui/GemSlots.svelte';
  import GemTray from '../ui/GemTray.svelte';
  import Gem from '../ui/Gem.svelte';
  import SoundSlider from '../ui/SoundSlider.svelte';
  import { slotIndexOf } from '../ui/geometry.ts';
  import { makeSpellCtx } from '../core/naming/gifts.ts';
  import { GARDEN_GROUPS, firstSounds, type GardenGroup } from '../core/naming/bells.ts';
  import { firstSoundGem, gemSoundKey, isVowelGem } from '../core/naming/sounds.ts';
  import type { NameTarget, Served } from '../core/heartbeat/types.ts';
  import { NamingCtrl, type Named } from './heartbeat/naming.ctrl.ts';
  import { spellLadder } from './heartbeat/learn-bridge.ts';
  import { bridge, liveDeps, namingData } from './heartbeat/deps.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { ghost, goal } from './heartbeat/guides.svelte.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import Backdrop from './heartbeat/Backdrop.svelte';
  import NameTag from './naming/NameTag.svelte';

  type Then = 'heartbeat' | string | (() => void);
  let { params = {}, target = undefined, onnamed = undefined }:
    { params?: Record<string, unknown>; target?: NameTarget; onnamed?: (n: Named) => void } = $props();
  const p = untrack(() => params) as { target?: NameTarget; then?: Then };
  const tgt: NameTarget = untrack(() => target) ?? p.target ?? { kind: 'sky', index: 0 };
  const asScene = untrack(() => target) === undefined;

  const deps = liveDeps({ place: 'naming', strand: 's' });
  const c = bridge.content();
  const served: Served = bridge.serve('naming', deps.rng)
    ?? { strand: 's', step: bridge.currentStepOf('s'), id: '', carrier: '', items: [], scaffold: 1, probe: false, source: 'current' };
  const ctx = makeSpellCtx(spellLadder(c), (s) => bridge.stepStatusOf(s), served.step);
  const { bank, index, blocklist } = namingData();
  const herd = game.world.herd.map((b) => ({ id: b.id, name: b.name, gems: b.gems }));
  const ctrl = new NamingCtrl({
    target: tgt, served, ctx, bank, index, blocklist, herd, spellingBehind: bridge.spellingBehind(),
    hasItem: (id) => Object.hasOwn(c.items, id),
    capitalSlot: bridge.stepStatusOf('S11') === 'current' ? 'current' : 'review',
  }, deps);

  let tick = $state(0);
  ctrl.onchange = () => { tick++; };
  const v = $derived.by(() => {
    void tick;
    return { mode: ctrl.mode, bells: [...ctrl.bells], slots: ctrl.slots.map((s) => ({ ...s })), tray: [...ctrl.tray], gold: [...ctrl.gold], named: ctrl.named };
  });
  const baby = $derived(tgt.kind === 'baby' ? game.world.byId[tgt.baby] : undefined);
  let slotEls: HTMLElement[] = $state([]);
  let showMore = $state(false);
  let showSounds = $state(false);
  const sounds = firstSounds(bank, (k) => deps.audio.hasName(k)).slice(0, 18);
  const firstGold = !game.world.herd.some((b) => b.name !== null);
  let plusShown = false;
  let finished = false;

  const spellViews = $derived(v.slots.map((s): SlotView => ({
    gem: s.gem, gift: !s.slot.own, kind: isVowelGem(s.slot.g) ? 'vowel' : 'consonant', crown: true, hum: s.hum, glow: false,
  })));
  const goldViews = $derived(v.gold.map((g): SlotView => ({ gem: g, gift: false, kind: 'any', crown: true, hum: false, glow: false })));
  const goldSize = ctrl.goldGems.length > 30 ? 56 : ctrl.goldGems.length > 15 ? 64 : 72;
  const BELL_TINT = ['#ffd0e8', '#d7ecff', '#e6dcff'];
  const GARDEN_PIC: Record<GardenGroup, string> = { flowers: 'decor-moonflower', gems: 'ui-gem', sky: 'ui-star', sweets: 'item-treat' };

  const playGem = (g: string): void => { const k = gemSoundKey(g); if (k) void deps.audio.listenSound(k); };

  $effect(() => {
    if (v.mode !== 'done' || !v.named || finished) return;
    finished = true;
    const n = v.named;
    void sleep(1200).then(() => done(n));
  });

  function done(n: Named): void {
    onnamed?.(n);
    if (p.then === 'heartbeat') void heartbeat.named();
    else if (typeof p.then === 'function') p.then();
    else if (typeof p.then === 'string' && asScene) void game.go(p.then);
  }

  async function openGold(): Promise<void> {
    ctrl.openGold();
    await deps.audio.say('g-gold');
    await showPlus();
  }

  async function showPlus(): Promise<void> {
    // The ghost hand shows the plus slot once, the first time she makes a name of her own.
    if (!firstGold || plusShown || ctrl.mode !== 'gold') return;
    plusShown = true;
    await sleep(300);
    const plus = document.querySelector('[aria-label="add slot"]');
    if (plus) { await ghost.tap(plus, 1); await deps.audio.say('g-plus'); }
  }

  ctrl.onghost = async (moves) => {
    const m = moves[0];
    const from = m ? document.querySelector(`[aria-label="gem ${m.gem}"]`) : null;
    const to = m ? slotEls[m.slot] : null;
    if (from && to) await ghost.drag(from, to);
  };

  /** Test hook: fill every own slot with a gem that is not its answer, then slide. */
  async function wrongMove(): Promise<string> {
    if (ctrl.mode === 'pick' && ctrl.bells[0]) await ctrl.choose(ctrl.bells[0].key);
    if (ctrl.mode !== 'spell') return ctrl.mode;
    for (const s of ctrl.slots) {
      if (!s.slot.own) continue;
      const g = ctrl.tray.find((x) => x.toLowerCase() !== s.slot.g.toLowerCase()) ?? 'z';
      ctrl.dropGem(s.slot.index, g);
    }
    return ctrl.slide();
  }
  async function answerMove(): Promise<string> {
    if (ctrl.mode === 'gold') { ctrl.openGold(['T', 'a', 'm']); return ctrl.goldSlide(); }
    if (ctrl.mode === 'pick' && ctrl.bells[0]) await ctrl.choose(ctrl.bells[0].key);
    if (ctrl.mode === 'done') return 'right';
    for (const m of ctrl.answerMoves()) ctrl.dropGem(m.slot, m.gem);
    return ctrl.slide();
  }

  onMount(() => {
    if (asScene) setBands('#cfe8ff', '#8fc79a');
    goal.set(() => deps.audio.say(ctrl.mode === 'gold' ? 'g-gold' : ctrl.mode === 'spell' ? 'g-spell' : 'g-bells'));
    void ctrl.begin().then(() => showPlus());
    const offs = [
      registerSceneHook('naming', {
        answer: answerMove, wrong: wrongMove, idle: () => { deps.hints.idle(); },
        target: () => (ctrl.mode === 'pick' && ctrl.bells[0] ? `bell ${ctrl.bells[0].name}` : null),
        mode: () => ctrl.mode,
      }),
      registerHook('naming.gold', async (gems: string[]) => { ctrl.openGold(gems); return ctrl.goldSlide(); }),
      registerHook('naming.addSlot', () => ctrl.addSlot()),
      registerHook('naming.removeSlot', (i: number) => ctrl.removeSlot(i)),
      registerHook('naming.mode', () => ctrl.mode),
      registerHook('naming.named', () => ctrl.named),
      registerHook('naming.bells', () => ctrl.bells.map((b) => b.name)),
    ];
    return () => { for (const off of offs) off(); };
  });
  onDestroy(() => { goal.clear(); deps.hints.end(); });
</script>

<section class="naming" class:embedded={!asScene} aria-label="naming scene">
  <Backdrop id={tgt.kind === 'sky' ? 'bg-sky' : 'bg-meadow'} top={tgt.kind === 'sky' ? '#1d1b4a' : '#cfe8ff'} bottom={tgt.kind === 'sky' ? '#2d3a6e' : '#bfe8c4'} />
  <HbGuides />
  <div class="baby" aria-label="baby" use:dropTarget={{ id: 'baby' }}>
    {#if baby}
      <Unicorn breed={baby.breed} stage={baby.stage} colours={baby.colours} traits={baby.traits} height={190} pose="still" label="" />
    {:else}
      <ArtImg id="sky-unicorn" size={190} />
    {/if}
    {#if v.named}<span class="tag-on"><NameTag name={v.named.name} ordinal={v.named.ordinal} sparkle={v.named.clipKey === null} /></span>{/if}
  </div>

  {#if v.mode === 'pick'}
    <div class="bells">
      {#each v.bells as b, i (b.key)}
        <button class="bell" data-touch aria-label="bell {b.name}"
          use:drag={{ data: b.key, onTap: () => void ctrl.ring(b.key), onDrop: (d) => { if (d.targetId === 'baby') void ctrl.choose(b.key); } }}>
          <ArtImg id="item-name-bell" size={130} tint={BELL_TINT[i % 3]} />
        </button>
      {/each}
      <button class="tree" data-touch aria-label="name tree" use:press={() => ctrl.shake()}><ArtImg id="item-name-tree" size={150} /></button>
    </div>
    <div class="garden">
      {#each GARDEN_GROUPS as g (g)}
        <button class="pic" data-touch aria-label="garden {g}" use:press={() => { ctrl.garden(g); void deps.audio.say('g-garden'); }}>
          <ArtImg id={GARDEN_PIC[g]} size={72} />
        </button>
      {/each}
      <button class="pic" data-touch aria-label="first sounds"
        use:press={() => { showSounds = !showSounds; if (showSounds) void deps.audio.say('g-first-sound'); }}><Gem g="a" size={60} /></button>
      {#if ctrl.goldFront || showMore}
        <button class="gold" data-touch aria-label="gold bell" use:press={() => void openGold()}><ArtImg id="item-gold-bell" size={110} /></button>
      {:else}
        <button class="pic" data-touch aria-label="more" use:press={() => { showMore = true; }}><ArtImg id="ui-sparkle" size={64} /></button>
      {/if}
    </div>
    {#if showSounds}
      <div class="sounds">
        {#each sounds as ph (ph)}
          {@const g = firstSoundGem(ph)}
          {#if g}
            <button class="sound" data-touch aria-label="first sound {g}" use:press={() => { playGem(g); ctrl.firstSound(ph); showSounds = false; }}><Gem {g} size={64} /></button>
          {/if}
        {/each}
      </div>
    {/if}
  {:else if v.mode === 'spell'}
    <button class="gold small" data-touch aria-label="gold bell" use:press={() => void ctrl.switchToGold()}><ArtImg id="item-gold-bell" size={84} /></button>
    <div class="slots-row"><GemSlots slots={spellViews} bind:slotEls onslottap={(i) => ctrl.clearSlot(i)} /></div>
    <div class="slider"><SoundSlider count={v.slots.length} onpass={(i) => { const s = v.slots[i]; if (s) playGem(s.gem ?? s.slot.g); }} ondone={() => void ctrl.slide()} /></div>
    <div class="tray"><GemTray gems={v.tray} ondrop={(g, t) => { const i = slotIndexOf(t); if (i !== null) ctrl.dropGem(i, g); }} ontap={playGem} /></div>
  {:else if v.mode === 'gold'}
    <div class="slots-row"><GemSlots slots={goldViews} editable bind:slotEls onplus={() => ctrl.addSlot()} onremove={(i) => ctrl.removeSlot(i)} onslottap={(i) => ctrl.goldClear(i)} /></div>
    <div class="slider"><SoundSlider count={v.gold.length} onpass={(i) => { const g = v.gold[i]; if (g) playGem(g); }} ondone={() => void ctrl.goldSlide()} /></div>
    <div class="tray gold-tray"><GemTray gems={ctrl.goldGems} size={goldSize} ondrop={(g, t) => { const i = slotIndexOf(t); if (i !== null) ctrl.goldDrop(i, g); }} ontap={playGem} /></div>
  {/if}
</section>

<style>
  .naming { position: absolute; inset: 0; touch-action: none; overflow: hidden; }
  .naming.embedded { z-index: 5; }
  .baby { position: absolute; left: 40px; top: 96px; width: 280px; height: 200px; display: flex; justify-content: center; align-items: flex-end; }
  .tag-on { position: absolute; left: 0; top: 196px; animation: clip calc(500ms * var(--speed, 1)) ease-out; }
  .bells { position: absolute; left: 380px; top: 110px; display: flex; gap: 28px; align-items: flex-end; }
  .bell, .tree, .gold { touch-action: none; background: none; border: 0; padding: 0; min-width: 96px; min-height: 96px; }
  .garden { position: absolute; left: 380px; top: 330px; display: flex; gap: 18px; align-items: center; }
  .pic { width: 96px; height: 96px; border-radius: 28px; background: #fff; border: 4px solid #c9b8ff; display: grid; place-items: center; padding: 0; }
  .sounds { position: absolute; left: 380px; top: 460px; width: 760px; display: flex; flex-wrap: wrap; gap: 10px; }
  .sound { background: none; border: 0; padding: 4px; min-width: 72px; min-height: 72px; }
  .gold.small { position: absolute; left: 1000px; top: 150px; }
  .slots-row { position: absolute; left: 20px; right: 20px; top: 320px; display: flex; justify-content: center; }
  .slider { position: absolute; left: 20px; right: 20px; top: 432px; display: flex; justify-content: center; }
  .tray { position: absolute; left: 30px; right: 30px; top: 528px; }
  .gold-tray { top: 522px; }
  @keyframes clip { from { transform: translateY(-40px) scale(0.7); opacity: 0; } }
</style>
