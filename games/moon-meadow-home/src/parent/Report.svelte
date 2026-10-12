<script lang="ts">
  // The success criteria of spec 1.3, one row each, plus the share of openings that came from jewels (R56).
  import { game } from '../game.svelte.ts';
  import { reportRows } from './parent.ts';
  import { report } from './store.svelte.ts';

  const rows = $derived.by(() => { void game.version; return reportRows(report()); });
</script>

<section class="part" aria-label="report">
  <h2>Report</h2>
  <table>
    <thead><tr><th></th><th>Measure</th><th>Now</th><th>Target</th></tr></thead>
    <tbody>
      {#each rows as r (r.id)}
        <tr>
          <td><span class="mark" class:ok={r.ok === true} class:bad={r.ok === false} aria-label={r.ok === null ? 'not judged yet' : r.ok ? 'on target' : 'off target'}></span> {r.id}</td>
          <td>{r.measure}</td>
          <td>{r.value}</td>
          <td class="muted">{r.target}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  td:first-child { white-space: nowrap; }
  .mark { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #cfc6dc; }
  .mark.ok { background: #3f9d58; }
  .mark.bad { background: #c9563c; }
</style>
