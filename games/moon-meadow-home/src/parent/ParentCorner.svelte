<script lang="ts">
  // The parent corner (Task A15): for Tjitse, in plain English. It is drawn over the whole window (outside the
  // scaled stage), so it reads at full size in portrait and landscape and scrolls. Opened by PinGate as an
  // overlay (`onclose`), or as the `parent` scene through the router (contracts SCENE_IDS).
  import { onMount } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { router } from '../platform/router.svelte.ts';
  import { data } from './store.svelte.ts';
  import { exportReminder } from './parent.ts';
  import Report from './Report.svelte';
  import Learning from './Learning.svelte';
  import Names from './Names.svelte';
  import Overrides from './Overrides.svelte';
  import Backup from './Backup.svelte';

  // `params` is the router's scene prop; the corner reads none.
  let { onclose }: { params?: Record<string, unknown>; onclose?: () => void } = $props();

  let warnings = $state<string[]>([]);

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  async function close(): Promise<void> {
    if (onclose) { onclose(); return; }
    if (!(await router.back())) await router.reset('meadow');
  }

  async function check(): Promise<void> {
    await game.ready();
    const out: string[] = [];
    const st = data().status();
    if (st.writeError || st.backend === 'memory') out.push('Storage is not saving. Export now.');
    const secure = typeof window !== 'undefined' && window.isSecureContext;
    const standalone = (navigator as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
    if (!secure) out.push('This copy runs over the home network without offline storage protection. Export often.');
    else if (!standalone) out.push('Add to Home Screen, or the herd can be lost.');
    const b = await data().backupState();
    if (exportReminder(b.lastExport, b.lastSync, game.now())) out.push('No backup in the last seven days. Export now.');
    if (st.quarantined > 0) out.push(`${st.quarantined} events were set aside (see Backup).`);
    warnings = out;
  }

  onMount(() => { void check(); });
</script>

<div class="corner" use:portal role="dialog" aria-label="parent corner">
  <header>
    <h1>Parent corner</h1>
    <button class="close" aria-label="close parent corner" onclick={close}>Close</button>
  </header>
  {#if warnings.length}
    <section class="warnings" aria-label="warnings">
      {#each warnings as w (w)}<p>{w}</p>{/each}
    </section>
  {/if}
  <Report />
  <Learning />
  <Names />
  <Overrides />
  <Backup onchange={check} />
</div>

<style>
  .corner {
    position: fixed; inset: 0; z-index: 5000; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y;
    background: #fbf8f3; color: #2a1b3d; font-family: 'Andika', system-ui, sans-serif; font-size: 18px; line-height: 1.4;
    padding: 16px 20px 80px; -webkit-user-select: text; user-select: text;
  }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: 980px; margin: 0 auto 8px; }
  h1 { font-size: 26px; margin: 0; }
  .close { min-height: 56px; min-width: 120px; padding: 0 20px; border-radius: 14px; background: #fff; border: 2px solid #b9a6d9; font-size: 18px; font-weight: 700; touch-action: manipulation; }
  .warnings { max-width: 980px; margin: 0 auto 12px; background: #fff4d6; border: 2px solid #e6c36a; border-radius: 12px; padding: 4px 14px; }
  .warnings p { margin: 8px 0; }
  .corner :global(section.part) { max-width: 980px; margin: 0 auto 18px; background: #fff; border: 1px solid #e3dcef; border-radius: 14px; padding: 12px 16px; }
  .corner :global(h2) { font-size: 21px; margin: 4px 0 10px; }
  .corner :global(h3) { font-size: 18px; margin: 12px 0 6px; }
  .corner :global(button) { touch-action: manipulation; }
  .corner :global(.btn) { min-height: 48px; padding: 0 16px; border-radius: 12px; background: #efe7ff; border: 2px solid #b9a6d9; font-size: 17px; margin: 4px 6px 4px 0; }
  .corner :global(.btn.warn) { background: #ffe9e4; border-color: #e3a090; }
  .corner :global(table) { width: 100%; border-collapse: collapse; font-size: 16px; }
  .corner :global(th), .corner :global(td) { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee6f5; vertical-align: top; }
  .corner :global(.muted) { color: #6c5f80; font-size: 16px; }
</style>
