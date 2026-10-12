<script lang="ts">
  // Per strand: current step and level, placing, ceiling, secure, side, school and reopened steps, and this
  // week's Dutch-sound slips per pair (learning's learnerReport, R56).
  import { game } from '../game.svelte.ts';
  import { learnerReport } from '../core/learning/index.ts';
  import { learningRows } from './parent.ts';

  const rows = $derived.by(() => {
    void game.version;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return learningRows(learnerReport(game.learner as any, game.content as any, game.now()));
  });
</script>

<section class="part" aria-label="learning">
  <h2>Learning</h2>
  {#each rows as r (r.strand)}
    <h3>{r.title}</h3>
    <ul>
      {#each r.lines as line (line)}<li>{line}</li>{/each}
    </ul>
  {/each}
</section>

<style>
  ul { margin: 0 0 6px; padding-left: 22px; }
  li { margin: 2px 0; }
</style>
