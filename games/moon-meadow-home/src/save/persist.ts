// Persistent storage. Only exists in secure contexts, so on the Mac's plain http it is 'unavailable'.
export type PersistState = 'granted' | 'denied' | 'unavailable';

export async function requestPersist(nav: { storage?: { persist?: () => Promise<boolean> } } | undefined = globalThis.navigator): Promise<PersistState> {
  try {
    if (!nav?.storage?.persist) return 'unavailable';
    return (await nav.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
