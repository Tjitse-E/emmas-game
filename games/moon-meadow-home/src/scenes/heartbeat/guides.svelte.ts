// Ghost hand, moonbeam and replay for the heartbeat scenes. The ghost hand and the moonbeam are platform's,
// mounted once in App.svelte (R10); the replay button (places') is mounted by each scene through HbGuides.
import { ghost } from '../../ui/ghost-hand.svelte.ts';
import { moonbeam } from '../../ui/moonbeam.svelte.ts';

export { ghost, moonbeam };

let repeatFn: (() => Promise<void>) | null = null;
/** The scene's goal for the replay button when no moment is running. */
export const goal = {
  set(fn: () => Promise<void>): void { repeatFn = fn; },
  clear(): void { repeatFn = null; },
  async replay(): Promise<void> { if (repeatFn) await repeatFn(); },
};
