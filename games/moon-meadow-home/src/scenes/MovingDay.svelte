<script lang="ts">
  // Moving Day (spec 2.9 session 1, R55): Emma's v2 babies cross a moonbeam bridge one by one while Elizabeth
  // says each name. The first three walk into stalls 1, 2 and 3 with "One, two, three". She taps door four and
  // the fourth baby trots in (not checked). The rest walk in by themselves. Then the pins line and the heartbeat,
  // which names the unnamed v2 babies one per heartbeat. Moving Day records itself at its end, so it plays once.
  import { onMount, tick } from 'svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import Lumi from '../art/Lumi.svelte';
  import PinGate from '../parent/PinGate.svelte';
  import { audio, numId } from '../audio/index.ts';
  import { press } from '../platform/input.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep, timing } from '../platform/timing.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { createMoment, type Moment } from '../ui/moment.ts';
  import { defaultDeps } from '../ui/moment-deps.ts';
  import { game } from '../game.svelte.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import type { WorldBaby } from '../types/contracts.ts';

  let { params: _params }: { params: Record<string, unknown> } = $props();

  const MAX_ON_STAGE = 12;                      // an older iPad draws at most 12 walking sprites at once
  const WALK_MS = 2600;                         // left edge to the stable
  const DOOR_X = [700, 810, 920, 1030];         // stable doors 1 to 4 (left edge, stage units)
  const movers: WorldBaby[] = game.world.herd.filter((b) => b.source === 'v2');

  type Walker = { b: WorldBaby; key: number; to: number };
  let onStage = $state<Walker[]>([]);
  let inDoor = $state<(WorldBaby | null)[]>([null, null, null, null]);
  let waiting = $state<WorldBaby | null>(null);   // the fourth baby, at door 4 until Emma taps it
  let housed = $state(0);                          // shown as a number on the stable, never read aloud
  let waitingDoor = $state(false);
  let done = $state(false);
  let talking = $state(false);
  let alive = true;
  let keys = 0;
  let moment: Moment | null = null;
  let doorTapped: () => void = () => {};

  const walkMs = () => Math.round(WALK_MS * (timing.speed || 0.02));

  /** One baby walks from the left edge to the stable (door k, or the stable middle) and is gone after it. */
  function walk(b: WorldBaby, to: number): Promise<void> {
    const w: Walker = { b, key: keys++, to };
    onStage = [...onStage, w].slice(-MAX_ON_STAGE);
    return new Promise((r) => setTimeout(() => { onStage = onStage.filter((x) => x.key !== w.key); r(); }, walkMs()));
  }

  async function sayName(b: WorldBaby): Promise<void> {
    if (!b.name) return;
    const played = await audio.sayName(b.listName ?? b.name, '!');
    if (!played) await audio.speak('fb-lovely');   // heartbeat's kind line for a name without a clip
  }

  async function doorFour(b: WorldBaby): Promise<void> {
    waiting = b;
    waitingDoor = true;
    await tick();                                  // the door exists before the moment looks for it
    const tapped = new Promise<void>((r) => (doorTapped = r));
    moment = createMoment({
      place: 'moving-day',
      goal: [numId('tap-door', 4)],
      target: () => document.querySelector<HTMLElement>('[aria-label="door 4"]'),
      hookAnswer: () => doorTapped(),
    }, defaultDeps());
    void moment.start();                           // the goal, then the idle repeat and the ghost hand (places A3)
    await tapped;
    moment.answer();
    moment = null;
    waitingDoor = false;
    waiting = null;
    inDoor[3] = b;
    housed++;
  }

  async function run(): Promise<void> {
    await audio.preloadScene('moving-day');
    if (!alive) return;
    await audio.speak('lumi-moving', 'g-here-they-come');
    let last: Promise<void> = Promise.resolve();
    for (let i = 0; i < movers.length && alive; i++) {
      const b = movers[i];
      if (i < 3) {
        await walk(b, DOOR_X[i]);
        inDoor[i] = b;
        housed++;
        await sayName(b);
        await audio.speak(numId('n', i + 1));
      } else if (i === 3) {
        await walk(b, DOOR_X[3] - 40);
        await sayName(b);
        await doorFour(b);
      } else {
        // The rest walk in by themselves, a few on the bridge at once.
        last = walk(b, 860).then(() => { housed++; });
        await sayName(b);
        await sleep(350);
      }
    }
    await last;
    if (!alive) return;
    if (movers.some((b) => b.sash.length > 0 || b.stickers.length > 0)) await audio.speak('g-pins-came');
    if (!alive) return;
    game.dispatch({ type: 'game/announce', opening: 'moving-day' });
    done = true;
    await sleep(600);
    if (alive && game.scene === 'moving-day') await heartbeat.start();
  }

  onMount(() => {
    setBands('#2d2a6e', '#8fca7a');
    const off = audio.onTalk((id) => (talking = !!id && id.startsWith('lumi-')));
    const unhook = registerSceneHook('moving-day', {
      answer: () => { if (waitingDoor) doorTapped(); },
      wrong: () => {},
      idle: () => moment?.hookIdle(),
      target: () => (waitingDoor ? 'door 4' : null),
    });
    run().catch((e) => console.error('[moving-day] did not run', e));
    return () => { alive = false; moment?.dispose(); off(); unhook(); audio.release('moving-day'); };
  });
</script>

<div class="moving" aria-label="moving day">
  <PinGate />
  {#each [[90, 60, 4], [240, 140, 3], [420, 50, 5], [600, 120, 3], [760, 40, 4], [880, 170, 3]] as [x, y, r], i (i)}
    <span class="star" style="left:{x}px;top:{y}px;width:{r * 2}px;height:{r * 2}px;animation-delay:{(i % 3) * 0.7}s" aria-hidden="true"></span>
  {/each}
  <div class="lumi"><Lumi size={190} {talking} label="Queen Lumi" /></div>
  <div class="bridge" aria-hidden="true"></div>
  <div class="ground" aria-hidden="true"></div>

  <div class="stable" aria-hidden="true">
    <div class="roof"></div>
    <div class="count" aria-label={`${housed} moved in`} role="img">{housed}</div>
  </div>
  {#each DOOR_X as x, k (k)}
    {#if k === 3 && waitingDoor}
      <button class="door open" style:left="{x}px" aria-label="door 4" use:press={() => doorTapped()}>
        <span class="num">4</span>
      </button>
    {:else}
      <div class="door" style:left="{x}px" aria-hidden="true">
        <span class="num">{k + 1}</span>
        {#if inDoor[k]}
          {@const b = inDoor[k] as WorldBaby}
          <span class="peek"><Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={70} headOnly label={b.name ?? 'baby'} /></span>
        {/if}
      </div>
    {/if}
  {/each}

  {#each onStage as w (w.key)}
    <div class="mover" style="--to:{w.to}px;--walk:{walkMs()}ms">
      <Unicorn breed={w.b.breed} stage={w.b.stage} colours={w.b.colours} traits={w.b.traits} height={110} pose="walk" label={w.b.name ?? 'baby'} />
    </div>
  {/each}
  {#if waiting}
    <div class="waiting" style:left="{DOOR_X[3] - 40}px">
      <Unicorn breed={waiting.breed} stage={waiting.stage} colours={waiting.colours} traits={waiting.traits} height={110} pose="idle" label={waiting.name ?? 'baby'} />
    </div>
  {/if}
  {#if done}<p class="sr" aria-live="polite">moved in</p>{/if}
</div>

<style>
  .moving { position: absolute; inset: 0; overflow: hidden; background: linear-gradient(#2d2a6e, #6b5fb5 55%, #8fca7a 56%); }
  .star { position: absolute; border-radius: 50%; background: #fff6c8; opacity: 0.8; animation: twinkle 3s ease-in-out infinite; }
  .lumi { position: absolute; left: 40px; top: 30px; }
  .bridge {
    position: absolute; left: -20px; width: 760px; top: 560px; height: 36px; border-radius: 18px; opacity: 0.85;
    background: linear-gradient(90deg, rgba(255, 247, 194, 0.2), #fff7c2 30%, #ffe08a);
    box-shadow: 0 0 30px rgba(255, 240, 170, 0.8);
  }
  .ground { position: absolute; left: 640px; right: 0; top: 600px; bottom: 0; background: #86c46f; border-radius: 40px 0 0 0; }
  .stable { position: absolute; left: 670px; width: 490px; top: 360px; height: 260px; background: #f3d9b1; border-radius: 10px; box-shadow: inset 0 -10px 0 #e0bf8f; }
  .roof { position: absolute; left: -20px; right: -20px; top: -70px; height: 80px; background: #c2585a; clip-path: polygon(6% 0, 94% 0, 100% 100%, 0 100%); }
  .count {
    position: absolute; right: 18px; top: 12px; min-width: 72px; height: 64px; padding: 0 12px; border-radius: 32px;
    background: #fffaf0; color: #5b3fa8; font: 700 44px Andika, sans-serif; display: grid; place-items: center;
  }
  .door {
    position: absolute; top: 450px; width: 96px; height: 150px; border-radius: 48px 48px 6px 6px; padding: 0; border: 0;
    background: #a8724a; box-shadow: inset 0 0 0 6px #8a5a36; display: grid; place-items: start center;
  }
  .door .num { margin-top: 10px; font: 700 34px Andika, sans-serif; color: #fff4d8; }
  .door .peek { position: absolute; left: 12px; top: 54px; }
  .door.open { background: #ffe08a; box-shadow: inset 0 0 0 6px #e8b94a, 0 0 30px #fff3b0; cursor: pointer; touch-action: manipulation; animation: glow 1.6s ease-in-out infinite; }
  .door.open .num { color: #8a5a36; }
  .mover { position: absolute; left: 0; top: 470px; pointer-events: none; animation: walk var(--walk) linear forwards; }
  .waiting { position: absolute; top: 575px; pointer-events: none; z-index: 2; }
  .sr { position: absolute; left: -9999px; }
  @keyframes walk { from { transform: translateX(-140px); } 88% { transform: translateX(var(--to)); opacity: 1; } to { transform: translateX(var(--to)); opacity: 0; } }
  @keyframes glow { 50% { transform: scale(1.05); } }
  @keyframes twinkle { 50% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) { .star, .door.open { animation: none; } }
</style>
