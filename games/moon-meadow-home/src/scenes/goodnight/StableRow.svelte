<script lang="ts">
  // Inside the stable at night (docs/v3/next/plan.md N3, N19, N24): one row's ten stalls as a 5 by 2 ten-frame,
  // each with its door number, straw bed and manger. herd-in: every baby walks in from the stable door to its
  // stall, led babies first. manger and free: the babies stand awake at their mangers (lane feed's layer lies on
  // top; the babies are no targets). bed: the room darkens, every baby lies down in the straw. While the door pick
  // is open the whole stall is one target; after it each baby is a sleeping baby to tuck in with a blanket.
  import { untrack } from 'svelte';
  import { press } from '../../platform/input.ts';
  import { anim, dur } from '../../platform/timing.ts';
  import Unicorn from '../../art/Unicorn.svelte';
  import type { WorldBaby } from '../../types/contracts.ts';
  import type { Door } from '../../core/heartbeat/stables.ts';
  import ArtImg from '../heartbeat/ArtImg.svelte';
  import Backdrop from '../heartbeat/Backdrop.svelte';
  import { stallBox } from './geometry.ts';

  let { stage, doors, byId, order, doorOpen, closed, poked, tucked, camp, ontapstall, ontuck }: {
    stage: 'herd-in' | 'manger' | 'free' | 'bed';
    /** The row's ten doors. */
    doors: Door[];
    byId: Record<string, WorldBaby>;
    /** Baby ids in the order they walk in (led babies first). */
    order: string[];
    doorOpen: boolean;
    closed: number | null;
    poked: number | null;
    tucked: ReadonlySet<string>;
    /** Babies without a door: they sleep in their tents. */
    camp: WorldBaby[];
    ontapstall: (n: number) => void;
    ontuck: (baby: string) => void;
  } = $props();

  const bed = $derived(stage === 'bed');
  const rank = (id: string): number => { const k = order.indexOf(id); return k < 0 ? order.length : k; };

  /** herd-in: the baby walks from the stable door at the left edge to its stall (transform keyframes, 120 ms apart). */
  function walkIn(node: HTMLElement, p: { from: number; delay: number; on: boolean }) {
    if (!p.on) return;
    node.style.opacity = '0';
    void anim(node, [
      { transform: `translateX(${-p.from}px)`, opacity: 1 },
      { transform: `translateX(${-p.from * 0.5}px) translateY(-8px)`, opacity: 1, offset: 0.5 },
      { transform: 'translateX(0px)', opacity: 1 },
    ], { duration: 1100, delay: dur(p.delay), easing: 'ease-out', fill: 'backwards' }).then(() => { node.style.opacity = ''; });
  }
  // Only a row that mounts in herd-in walks in; a row that mounts later (a herd of 0 goes straight to bed) stands.
  const walking = untrack(() => stage) === 'herd-in';
</script>

<div class="stable" class:bed aria-label="stable">
  <Backdrop id="bg-stable-night" top="#4a3524" bottom="#2a1e16" />
  <div class="dark" aria-hidden="true"></div>
  {#each doors as d, i (d.number)}
    {@const box = stallBox(i)}
    {@const b = d.baby ? byId[d.baby] : undefined}
    <div class="stall" style:left="{box.x}px" style:top="{box.y}px">
      <span class="bedpic"><ArtImg id="item-stall-bed" size={210} /></span>
      <b class="plaque">{d.number}</b>
      <span class="manger"><ArtImg id="item-manger" size={112} /></span>
      {#if b}
        <!-- In bed the pen clips the baby at the stall floor, so it sinks into the straw instead of into the row below. -->
        <div class="pen">
          <div class="who" class:asleep={bed} class:poke={poked === d.number} style:--tilt="{bed ? 6 : 0}deg"
            use:walkIn={{ from: box.x + 260, delay: 120 * rank(b.id), on: walking }}>
            <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={170} seed={i} label=""
              pose={bed ? 'sleep' : 'idle'} />
          </div>
          {#if bed}
            <span class="straw"><ArtImg id="item-straw-pile" size={200} /></span>
            {#if tucked.has(b.id)}<span class="blanket"><ArtImg id="item-sleep-blanket" size={170} /></span>{/if}
          {/if}
        </div>
        {#if bed}<span class="zzz" aria-hidden="true">z</span>{/if}
        {#if closed === d.number}<span class="half-door"><ArtImg id="item-stall-door" size={200} /></span>{/if}
        {#if bed && doorOpen}
          <button class="hit stall-hit" data-touch aria-label="stall {d.number}" use:press={() => ontapstall(d.number)}></button>
        {:else if bed}
          <button class="hit baby-hit" data-touch aria-label="sleeping baby {d.number}" use:press={() => ontuck(b.id)}></button>
        {/if}
      {/if}
    </div>
  {/each}
  {#if camp.length}
    <div class="camp" aria-label="moonbeam camp">
      {#each camp.slice(0, 6) as b (b.id)}
        <span class="tent">
          <ArtImg id="item-camp-tent" size={96} />
          <span class="tent-head" class:asleep={bed}><Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={42} headOnly label="" /></span>
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* isolation keeps the stalls' z-index inside the stable, so lane feed's layer (mounted after it) lies on top. */
  .stable { position: absolute; inset: 0; overflow: hidden; isolation: isolate; }
  .dark { position: absolute; inset: 0; background: #0b0614; opacity: 0; pointer-events: none; transition: opacity calc(1200ms * var(--speed, 1)); z-index: 1; }
  .bed .dark { opacity: 0.42; }
  .stall { position: absolute; width: 210px; height: 320px; z-index: 2; }
  .bedpic { position: absolute; left: 0; bottom: 0; pointer-events: none; }
  .plaque { position: absolute; left: 50%; top: 4px; transform: translateX(-50%); min-width: 48px; text-align: center; z-index: 5;
    font: 700 28px 'Andika', sans-serif; color: #3b2a1a; background: #fff3d6; border: 3px solid #b98a5a; border-radius: 10px; }
  .manger { position: absolute; left: 0; top: 214px; pointer-events: none; z-index: 3; }
  .pen { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
  .bed .pen { overflow: hidden; border-radius: 0 0 14px 14px; }
  .who { position: absolute; left: 44px; bottom: 18px; width: 170px; height: 200px; display: flex; align-items: flex-end; justify-content: center;
    pointer-events: none; z-index: 2; transform-origin: 50% 100%; transition: transform calc(900ms * var(--speed, 1)) ease-in-out; }
  /* N24: lying down is a settle on the sleep pose, about 40 percent into the straw, head tilted down. */
  .who.asleep { transform: translateY(40%) rotate(var(--tilt)); filter: brightness(0.85); }
  .who.poke { animation: sr-poke calc(600ms * var(--speed, 1)) 2; }
  .straw { position: absolute; left: 20px; bottom: -30px; pointer-events: none; z-index: 4; }
  .blanket { position: absolute; left: 40px; bottom: 30px; pointer-events: none; z-index: 4; animation: sr-lay calc(500ms * var(--speed, 1)) ease-out; }
  .zzz { position: absolute; right: 18px; top: 60px; color: #c9b8ff; font: 700 30px 'Andika', sans-serif; z-index: 5; pointer-events: none;
    animation: sr-z calc(2400ms * var(--speed, 1)) ease-in-out infinite; }
  .half-door { position: absolute; left: 5px; bottom: -6px; pointer-events: none; z-index: 5; clip-path: inset(45% 0 0 0);
    animation: sr-door calc(600ms * var(--speed, 1)) ease-out; }
  .hit { position: absolute; background: none; border: 0; padding: 0; z-index: 6; border-radius: 18px; }
  .stall-hit { inset: 0; }
  .baby-hit { left: 40px; right: 10px; top: 110px; bottom: 10px; }
  .camp { position: absolute; left: 380px; top: 14px; width: 520px; height: 110px; display: flex; gap: 8px; justify-content: center; z-index: 2; }
  .tent { position: relative; }
  .tent-head { position: absolute; left: 28px; top: 46px; width: 42px; height: 42px; overflow: hidden; border-radius: 40%; pointer-events: none; }
  .tent-head.asleep { filter: brightness(0.8); }
  @keyframes sr-poke { 50% { translate: 0 -10px; } }
  @keyframes sr-lay { from { transform: translateY(-30px); opacity: 0; } }
  @keyframes sr-z { 0%, 100% { transform: translate(0, 0); opacity: 0.4; } 50% { transform: translate(6px, -14px); opacity: 1; } }
  @keyframes sr-door { from { transform: translateX(-120%); } }
</style>
