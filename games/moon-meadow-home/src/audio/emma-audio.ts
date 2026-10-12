/** Types for window.EmmaAudio from shared/audio.js (a classic script, see shared/README.md). */
import type { ClipManifest } from './clip-index.ts';
import type { HoldHandle, SfxName } from '../types/contracts.ts';

export type { HoldHandle, SfxName };

export interface EmmaAudioApi {
  init(o?: { base?: string; phonics?: string }): EmmaAudioApi;
  unlock(): Promise<void>;
  preload(ids: readonly string[]): Promise<string[]>;
  preloadSounds(codes?: readonly string[]): Promise<string[]>;
  say(id: string, o?: { queue?: boolean }): Promise<void>;
  sayAll(ids: readonly string[]): Promise<void>;
  sound(code: string, o?: { overlap?: boolean }): Promise<void>;
  hold(code: string): HoldHandle;
  sfx(name: SfxName): Promise<void>;
  stop(): void;
  mute(on?: boolean): boolean;
  playUrl(url: string): Promise<void>;
  has(id: string): Promise<boolean>;
  phonicsIndex(): Promise<{ sounds: Record<string, { id: string; file: string; sustain?: boolean; same_as?: string }> }>;
  /** v3: add or replace a clip folder with its own manifest.json. Packs are searched in the order added. */
  addPack(name: string, base: string, o?: { fresh?: boolean }): Promise<ClipManifest | null>;
  /** v3: drop decoded clips. */
  forget(ids: readonly string[]): void;
  /** v3: called once per new missing id. Returns an unsubscribe. */
  onMissing(fn: (id: string) => void): () => void;
  /** v3: record a missing clip without playing it (the body of warnMissing). */
  reportMissing(id: string): void;
  readonly missing: string[];
  readonly speaking: boolean;
  readonly muted: boolean;
  readonly context: AudioContext | null;
}
