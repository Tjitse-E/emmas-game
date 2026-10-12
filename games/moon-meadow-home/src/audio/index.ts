/**
 * The app's audio (contracts C8). Scenes import from here only, never window.EmmaAudio.
 * main.ts awaits audio.init({ base: <Vite BASE_URL> + 'audio/' }) before Play; Play's pointerdown calls
 * audio.unlock(). See docs/v3/plan/audio.md for the line recipes.
 */
import { createAudio, type Audio } from './facade.ts';
import { loadPlayer } from './player.ts';
import { PACK_SPECS } from './packs.ts';
import { SCENE_CLIPS, type ClipId, type SceneId } from './clip-ids.generated.ts';
import type { DynamicClipId } from '../types/contracts.ts';

/** A static clip id from content/lines (the generated union) or a dynamic one built from content (R52). */
export type SpeakId = ClipId | DynamicClipId;
export type SpokenId = SpeakId;
export const audio: Audio<SpeakId, SceneId> = createAudio<SpeakId, SceneId>(loadPlayer, PACK_SPECS, SCENE_CLIPS);

export { bondId, isDynamic, nameId, numId, ordId, parcelId, phraseId, slug, slugName, wordId } from './ids.ts';
export type { DynamicId, NameMark, NumKind } from './ids.ts';
export type { DynamicClipId } from '../types/contracts.ts';
export type { Audio, Checked } from './facade.ts';
export type { ClipId, SceneId } from './clip-ids.generated.ts';
export { SCENES, SCENE_CLIPS } from './clip-ids.generated.ts';
export { PACKS } from './packs.ts';
