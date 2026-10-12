// What the platform knows about storage and the home-screen app. The parent corner reads platformStatus
// for its "Add to Home Screen" warning. requestPersist itself is core's (src/save/persist.ts).
import { requestPersist, type PersistState } from '../save/persist.ts';

export { requestPersist };
export type PersistResult = PersistState;

export const platformStatus: { persist: PersistResult; sw: 'skipped' | 'registered' | 'failed'; secure: boolean } = {
  persist: 'unavailable',
  sw: 'skipped',
  secure: typeof window !== 'undefined' ? window.isSecureContext : false,
};

/** Asks for persistent storage (startGame does this once) and keeps the answer in platformStatus. Never throws. */
export async function recordPersist(nav: Navigator | undefined = globalThis.navigator): Promise<PersistResult> {
  const r = await requestPersist(nav);
  platformStatus.persist = r;
  return r;
}
