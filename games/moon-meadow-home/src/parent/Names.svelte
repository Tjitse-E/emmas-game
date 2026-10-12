<script lang="ts">
  // Names she built: invented ones (no clip yet), list names and blocked builds (spec 2.2).
  import { game } from '../game.svelte.ts';
  import { dateText, nameLog, type NameRow } from './parent.ts';
  import { allEvents } from './store.svelte.ts';

  const log = $derived.by(() => { void game.version; return nameLog(allEvents()); });
  let copied = $state<string | null>(null);

  async function copyUnknown(): Promise<void> {
    const text = log.unknown.map((r) => r.name).join('\n');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(text);
      copied = 'Copied.';
    } catch {
      copied = text || '(none)';
    }
  }
</script>

{#snippet rows(title: string, list: NameRow[])}
  <h3>{title} ({list.length})</h3>
  {#if list.length}
    <table>
      <tbody>
        {#each list as r (r.name)}<tr><td>{r.name}</td><td>{r.count} times</td><td class="muted">{dateText(r.first)} to {dateText(r.last)}</td></tr>{/each}
      </tbody>
    </table>
  {:else}<p class="muted">None yet.</p>{/if}
{/snippet}

<section class="part" aria-label="names">
  <h2>Names</h2>
  {@render rows('Names she invented (no clip yet)', log.unknown)}
  <button class="btn" aria-label="copy unknown names" onclick={copyUnknown}>Copy unknown names</button>
  {#if copied}<pre class="copy" data-allow-select>{copied}</pre>{/if}
  {@render rows('Names from the list', log.list)}
  {@render rows('Blocked builds', log.blocked)}
  <p class="muted">Strong words among the blocked builds: {log.strong.length}. Builds with no vowel: {log.noVowel}.</p>
</section>

<style>
  .copy { white-space: pre-wrap; background: #f6f2fb; padding: 8px; border-radius: 8px; font-size: 16px; }
</style>
