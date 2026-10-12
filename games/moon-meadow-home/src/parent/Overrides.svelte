<script lang="ts">
  // Step overrides through learning's override shapes (R18): make a step current, mark it placed, switch a
  // school step, and switch the start profile (fresh or year1, R56). Every change asks for a second tap.
  import { game } from '../game.svelte.ts';
  import { isSchool, setCurrentOverride, stepStatus } from '../core/learning/index.ts';
  import type { Learner } from '../core/learning/index.ts';
  import type { Content } from '../core/content/types.ts';
  import type { LearnOverridePayload, Strand } from '../types/contracts.ts';
  import { overrideRows, placedToggle, profileOverride, PROFILES, type ProfileId } from './parent.ts';
  import { override } from './store.svelte.ts';

  const learner = (): Learner => game.learner as unknown as Learner;
  const content = (): Content => game.content as unknown as Content;
  const NAMES: Record<Strand, string> = { r: 'Reading', s: 'Spelling', m: 'Maths' };

  const rows = $derived.by(() => {
    void game.version;
    const l = learner();
    const c = content();
    const steps = (['r', 's', 'm'] as Strand[]).flatMap((strand) => c.loaded[strand].map((id) => ({ id, strand, school: isSchool(l, c, id) })));
    const current = Object.fromEntries((['r', 's', 'm'] as Strand[]).map((s) => [s, c.loaded[s].find((id) => stepStatus(l, c, id) === 'current') ?? null])) as Record<Strand, string | null>;
    return overrideRows(steps, (id) => stepStatus(l, c, id), current);
  });
  const profile = $derived.by(() => { void game.version; return learner().profile; });

  let pending = $state<string | null>(null);
  let done = $state<string | null>(null);

  function ask(key: string, run: () => LearnOverridePayload, what: string): void {
    if (pending !== key) { pending = key; done = null; return; }
    pending = null;
    override(run());
    done = what;
  }
</script>

<section class="part" aria-label="overrides">
  <h2>Overrides</h2>
  <p class="muted">Each change needs a second tap on the same button.</p>
  <h3>Start profile: {profile}</h3>
  {#each PROFILES as p (p)}
    <button class="btn" aria-label="profile {p}" disabled={profile === p}
      onclick={() => ask(`profile:${p}`, () => profileOverride(p as ProfileId), `Profile set to ${p}.`)}>
      {pending === `profile:${p}` ? `Tap again: use ${p}` : `Use ${p}`}
    </button>
  {/each}
  {#if done}<p role="status">{done}</p>{/if}
  {#each rows as r (r.strand)}
    <h3>{NAMES[r.strand]}: current {r.current ?? 'none'}</h3>
    <table>
      <tbody>
        {#each r.steps as s (s.id)}
          <tr class:cur={s.current}>
            <td>{s.id}{#if s.school} <span class="tag">school</span>{/if}</td>
            <td class="muted">{s.status}</td>
            <td>
              {#if !s.current}
                <button class="btn" aria-label="make {s.id} current"
                  onclick={() => ask(`cur:${s.id}`, () => setCurrentOverride(learner(), content(), r.strand, s.id) as unknown as LearnOverridePayload, `${s.id} is current.`)}>
                  {pending === `cur:${s.id}` ? 'Tap again' : 'Make current'}
                </button>
              {/if}
              {#if s.status !== 'passed' && !s.current}
                <button class="btn" aria-label="{s.status === 'placed' ? 'unmark' : 'mark'} {s.id} placed"
                  onclick={() => ask(`pl:${s.id}`, () => placedToggle(r.strand, s.id, s.status), `${s.id} ${s.status === 'placed' ? 'unmarked' : 'marked placed'}.`)}>
                  {pending === `pl:${s.id}` ? 'Tap again' : s.status === 'placed' ? 'Unmark placed' : 'Mark placed'}
                </button>
              {/if}
              <button class="btn" aria-label="school {s.id} {s.school ? 'off' : 'on'}"
                onclick={() => ask(`sc:${s.id}`, () => ({ op: 'school', strand: r.strand, step: s.id, on: !s.school }), `${s.id} school ${s.school ? 'off' : 'on'}.`)}>
                {pending === `sc:${s.id}` ? 'Tap again' : s.school ? 'School off' : 'School on'}
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}
</section>

<style>
  tr.cur td { background: #f3edff; }
  .tag { font-size: 13px; background: #e4f3e6; border-radius: 6px; padding: 1px 6px; }
</style>
