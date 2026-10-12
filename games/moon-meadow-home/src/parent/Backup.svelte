<script lang="ts">
  // Backup (spec 4.7): export, import (restore), import v2 from this browser again, devices and exclusion,
  // the quarantine list, leaving out this iPad's play and reset. Restores refold and start over (R56).
  import { onMount } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { dateText, deviceList, quarantineSummary, type QuarantineRow } from './parent.ts';
  import { allEvents, data, excludeLocalPlay, exportSave, reimportV2, resetDevice, restoreFile, setExcluded } from './store.svelte.ts';

  let { onchange }: { onchange?: () => void } = $props();

  let msg = $state<string | null>(null);
  let busy = $state(false);
  let pending = $state<string | null>(null);
  let quarantine = $state<QuarantineRow[]>([]);
  let resetHold: ReturnType<typeof setTimeout> | null = null;
  let resetHolding = $state(false);

  const me = $derived.by(() => { void game.version; return game.data ? data().device() : ''; });
  const devices = $derived.by(() => { void game.version; return deviceList(allEvents()); });
  const q = $derived(quarantineSummary(quarantine));

  async function loadQuarantine(): Promise<void> {
    await game.ready();
    quarantine = await data().quarantine();
  }
  onMount(() => { void loadQuarantine(); });

  async function run(f: () => Promise<string>): Promise<void> {
    if (busy) return;
    busy = true;
    try { msg = await f(); } catch (e) { msg = `Something went wrong: ${(e as Error).message}`; }
    busy = false;
    void loadQuarantine();
    onchange?.();
  }

  const doExport = () => run(async () => {
    const out = await exportSave();
    return out === 'cancelled' ? 'Export cancelled.' : out === 'shared' ? 'Save shared.' : 'Save downloaded.';
  });

  function onFile(e: Event): void {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void run(() => restoreFile(file));
  }

  function confirmThen(key: string, f: () => void): void {
    if (pending !== key) { pending = key; return; }
    pending = null;
    f();
  }

  function holdReset(on: boolean): void {
    if (resetHold) clearTimeout(resetHold);
    resetHold = null;
    resetHolding = on;
    if (on) resetHold = setTimeout(() => { resetHolding = false; void resetDevice(); }, 3000);
  }
</script>

<section class="part" aria-label="backup">
  <h2>Backup</h2>
  <button class="btn" aria-label="export" disabled={busy} onclick={doExport}>Export the save</button>
  <label class="btn file">
    Import a save
    <input type="file" accept=".json,application/json" aria-label="import" onchange={onFile} />
  </label>
  <button class="btn" aria-label="import v2 again" disabled={busy} onclick={() => run(reimportV2)}>Import v2 from this browser again</button>
  {#if msg}<p role="status">{msg}</p>{/if}

  <h3>Devices</h3>
  <table>
    <thead><tr><th>Device</th><th>Events</th><th>Visits</th><th>From</th><th>To</th><th></th></tr></thead>
    <tbody>
      {#each devices as d (d.dev)}
        <tr>
          <td>{d.dev}{d.dev === me ? ' (this iPad)' : ''}{d.excluded ? ' (left out)' : ''}</td>
          <td>{d.events}</td><td>{d.visits}</td><td class="muted">{dateText(d.first)}</td><td class="muted">{dateText(d.last)}</td>
          <td>
            {#if d.dev !== me}
              <button class="btn" aria-label="{d.excluded ? 'include' : 'exclude'} {d.dev}"
                onclick={() => confirmThen(`ex:${d.dev}`, () => setExcluded(d.dev, !d.excluded))}>
                {pending === `ex:${d.dev}` ? 'Tap again' : d.excluded ? 'Include' : 'Exclude'}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <button class="btn warn" aria-label="leave out this ipad's play"
    onclick={() => confirmThen('local', () => void run(async () => `Play from ${await excludeLocalPlay()} is left out.`))}>
    {pending === 'local' ? 'Tap again to leave it out' : "Leave out this iPad's play so far"}
  </button>

  <h3>Set aside ({q.count})</h3>
  {#if q.count}
    <p class="muted">{q.types.map((t) => `${t.type}: ${t.count}`).join(', ')}</p>
    <table><tbody>{#each q.rows as r (r.id)}<tr><td>{r.type}</td><td class="muted">{r.reason}</td></tr>{/each}</tbody></table>
  {:else}<p class="muted">No events were set aside.</p>{/if}

  <h3>Reset</h3>
  <button class="btn warn hold" class:holding={resetHolding} aria-label="reset this ipad"
    onpointerdown={() => holdReset(true)} onpointerup={() => holdReset(false)} onpointerleave={() => holdReset(false)} onpointercancel={() => holdReset(false)}>
    {resetHolding ? 'Keep holding...' : 'Hold 3 seconds to reset this iPad'}
  </button>
  <p class="muted">Reset clears everything stored on this iPad. Export first.</p>
</section>

<style>
  .file { display: inline-flex; align-items: center; position: relative; overflow: hidden; }
  .file input { position: absolute; inset: 0; opacity: 0; font-size: 40px; }
  .hold.holding { background: #f6c9bd; }
</style>
