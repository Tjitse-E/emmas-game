// Heartbeat test hooks (test and dev builds only, loaded by flow.svelte.ts). Each scene registers its own
// answer, wrong, idle and target through registerSceneHook; these start the heartbeat and goodnight directly.
import { registerHook } from '../../platform/hooks.ts';
import type { HbState } from '../../core/heartbeat/flow.ts';

type Runtime = { readonly state: HbState; start(): Promise<void>; startGoodnight(): Promise<void>; startWish(babyId: string): Promise<void> };

let installed = false;
export function installHeartbeatHooks(hb: Runtime): void {
  if (installed) return;
  installed = true;
  registerHook('hb.start', async () => { await hb.start(); return hb.state.stage; });
  registerHook('hb.goodnight', async () => { await hb.startGoodnight(); return 'goodnight'; });
  registerHook('hb.wish', async (babyId: string) => { await hb.startWish(babyId); return 'wish'; });
  registerHook('hb.state', () => ({ ...hb.state }));
}
