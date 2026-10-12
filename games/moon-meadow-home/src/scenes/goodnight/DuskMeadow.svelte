<script lang="ts">
  // The dusk meadow of the lantern walk (docs/v3/next/plan.md N3, N15 to N17): the meadow under a dusk tint, the
  // babies of one stable row without name tags, the lantern with the name to read, the glowing path and the stable
  // gate. She drags the named baby along the path to the gate; a led baby walks the path into the gate. After the
  // last lead the others trot in along the path by themselves.
  import { drag, dropTarget } from '../../platform/input.ts';
  import { anim, dur } from '../../platform/timing.ts';
  import Unicorn from '../../art/Unicorn.svelte';
  import type { WorldBaby } from '../../types/contracts.ts';
  import type { WalkPick } from '../../core/heartbeat/walk.ts';
  import ArtImg from '../heartbeat/ArtImg.svelte';
  import Backdrop from '../heartbeat/Backdrop.svelte';
  import NameTag from '../naming/NameTag.svelte';
  import GlowPath from './GlowPath.svelte';
  import { DUSK_SPOTS, GATE, LANTERN, walkOffsets } from './geometry.ts';

  let { babies, pick, heads, nudged, refused, trotting, doorOf, ordinalOf, onlead, onmiss, ontap }: {
    babies: WorldBaby[];
    /** The lantern's name now, or null (a free walk, or the walk is over). */
    pick: WalkPick | null;
    /** Babies still on the meadow. */
    heads: ReadonlySet<string>;
    nudged: string | null;
    refused: string | null;
    /** herd-in: the babies left on the meadow trot in along the path. */
    trotting: boolean;
    doorOf: (baby: string) => number;
    ordinalOf: (baby: string) => number;
    onlead: (baby: string) => void;
    onmiss: (baby: string) => void;
    ontap: (baby: string) => void;
  } = $props();

  const els: Record<string, HTMLElement> = {};
  let gone = $state<Set<string>>(new Set());
  let walking = $state<Set<string>>(new Set());
  let dragging = $state<string | null>(null);
  const started = new Set<string>();

  function spotOf(i: number) { return DUSK_SPOTS[i % DUSK_SPOTS.length]; }

  /** Walks a baby along the glowing path into the gate (8 points, transform keyframes), then hides it. */
  async function walkIn(id: string, i: number, delay = 0): Promise<void> {
    if (started.has(id)) return;
    started.add(id);
    const el = els[id];
    walking = new Set([...walking, id]);
    if (el) {
      const offs = walkOffsets(spotOf(i));
      const frames: Keyframe[] = offs.map((o, k) => ({
        transform: `translate(-50%, -50%) translate(${o.x}px, ${o.y}px) scale(${k === offs.length - 1 ? 0.6 : 1})`,
        opacity: k === offs.length - 1 ? 0 : 1,
      }));
      await anim(el, frames, { duration: 1200, delay: dur(delay), easing: 'linear', fill: 'forwards' });
    }
    gone = new Set([...gone, id]);
  }

  $effect(() => {
    babies.forEach((b, i) => { if (!heads.has(b.id)) void walkIn(b.id, i); });
  });
  $effect(() => {
    if (!trotting) return;
    let k = 0;
    babies.forEach((b, i) => { if (heads.has(b.id)) void walkIn(b.id, i, 150 * k++); });
  });

  function dropped(id: string, target: string | null): void {
    dragging = null;
    if (target === 'stable-gate') onlead(id);
    else onmiss(id);
  }
</script>

<div class="dusk" aria-label="dusk meadow">
  <Backdrop id="bg-meadow" top="#f3b48a" bottom="#5d6b4a" />
  <div class="tint" aria-hidden="true"></div>
  <GlowPath bright={dragging !== null} />
  <div class="gate" aria-label="stable gate" style:left="{GATE.x - 130}px" style:top="{GATE.y - 130}px" use:dropTarget={{ id: 'stable-gate' }}>
    <ArtImg id="building-stable-gate" size={260} />
  </div>
  <div class="lantern" aria-label="lantern" style:left="{LANTERN.x - 55}px" style:top="{LANTERN.y - 60}px">
    <svg class="post" viewBox="0 0 40 220" width="40" height="220" aria-hidden="true">
      <rect x="15" y="0" width="10" height="220" rx="4" fill="#6b4a2a" /><rect x="4" y="0" width="32" height="8" rx="3" fill="#8a6238" />
    </svg>
    <span class="lamp"><ArtImg id="item-lantern-lit" size={110} /></span>
    {#if pick}
      <span class="tag"><NameTag name={pick.name} ordinal={ordinalOf(pick.baby)} size={44} /></span>
    {/if}
  </div>
  {#each babies as b, i (b.id)}
    {#if !gone.has(b.id)}
      {@const s = spotOf(i)}
      <button class="baby" class:nudge={nudged === b.id} class:refused={refused === b.id} data-touch aria-label="walk baby {doorOf(b.id)}"
        style:left="{s.x}px" style:top="{s.y}px" bind:this={els[b.id]}
        use:drag={{ data: b.id, disabled: !heads.has(b.id) || walking.has(b.id), onStart: () => { dragging = b.id; },
          onTap: () => ontap(b.id), onDrop: (d) => dropped(b.id, d.targetId) }}>
        <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={130} seed={i} label=""
          pose={walking.has(b.id) || dragging === b.id ? 'walk' : 'idle'} facing={s.x < GATE.x ? 'right' : 'left'} />
      </button>
    {/if}
  {/each}
</div>

<style>
  .dusk { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
  /* Plan N26: a dusk tint over bg-meadow. A plain see-through gradient: WebKit drew the multiply blend too faintly. */
  .tint { position: absolute; inset: 0; background: linear-gradient(rgba(255, 130, 80, 0.35), rgba(50, 36, 105, 0.58)); pointer-events: none; }
  .gate { position: absolute; width: 260px; height: 260px; }
  .lantern { position: absolute; width: 110px; height: 340px; }
  .post { position: absolute; left: 35px; top: 96px; }
  .lamp { position: absolute; left: 0; top: 0; filter: drop-shadow(0 0 18px #ffd86b); }
  .tag { position: absolute; left: 120px; top: 26px; white-space: nowrap; background: #fff8e6; border: 4px solid #e8b04a; border-radius: 18px;
    padding: 4px 14px; box-shadow: 0 0 24px #ffd86b99; }
  .baby { position: absolute; width: 150px; height: 150px; background: none; border: 0; padding: 0; transform: translate(-50%, -50%);
    display: flex; align-items: flex-end; justify-content: center; touch-action: none; }
  .baby.nudge { animation: dm-nudge calc(400ms * var(--speed, 1)) ease-out forwards; }
  .baby.refused { animation: dm-shake calc(500ms * var(--speed, 1)) ease-in-out; }
  @keyframes dm-nudge { 50% { transform: translate(-46%, -58%) rotate(-6deg); } 100% { transform: translate(-40%, -50%); } }
  @keyframes dm-shake { 25% { transform: translate(-56%, -50%); } 75% { transform: translate(-44%, -50%); } }
</style>
