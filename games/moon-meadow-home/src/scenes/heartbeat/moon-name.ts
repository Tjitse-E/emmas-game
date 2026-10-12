// "The moon told me a new name!" (spec 2.8): an invented name whose clip arrived later is said for the first time.
import { nameKey } from '../../core/keys.ts';
import type { SceneDeps } from './deps.ts';

export function pendingMoonNames(
  herd: readonly { id: string; name: string | null; unknownName: boolean; clipHeard: boolean }[], hasName: (name: string) => boolean,
): string[] {
  return herd.filter((b) => b.name && b.unknownName && !b.clipHeard && hasName(b.name)).map((b) => b.id);
}

/** Lumi's line, the name, the baby's giggle; name.clipHeard records it (and gives the heart). */
export async function moonName(baby: { id: string; name: string | null }, d: SceneDeps): Promise<void> {
  if (!baby.name) return;
  await d.audio.say('lumi-moon-name');
  await d.audio.sayName(nameKey(baby.name), '!');
  d.dispatch({ type: 'naming.clip-heard', baby: baby.id });
  await d.audio.say('foal-yay');
}
