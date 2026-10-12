import type { EmmaAudioApi } from './emma-audio.ts';
import { silentPlayer, type PlayerLike } from './facade.ts';

/**
 * Loads the one shared player (shared/audio.js, aliased as @emma/audio-player by tools/vite-shared-audio.ts) and
 * returns window.EmmaAudio. Where there is no window (Node tests that import a scene's logic) it returns a player
 * that plays nothing, so importing src/audio/index.ts never fails.
 */
export async function loadPlayer(): Promise<PlayerLike> {
  if (typeof window === 'undefined') return silentPlayer();
  const w = window as unknown as { EmmaAudio?: EmmaAudioApi };
  if (!w.EmmaAudio) await import('@emma/audio-player');
  return w.EmmaAudio ?? silentPlayer();
}
