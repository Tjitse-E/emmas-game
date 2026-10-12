// Typed access to the place content. The release comes from learning's content/release.json, the only
// release file (R27). Later tasks add one export per content/places/*.json file they create.
import releaseJson from '../../../content/release.json' with { type: 'json' };

export const CURRENT_RELEASE: string = releaseJson.release;

/** Releases are '1.0', '1.1', '1.2', '1.3' and 'later'. 'later' is never released. */
export function released(release: string, current: string = CURRENT_RELEASE): boolean {
  const r = Number(release), c = Number(current);
  return Number.isFinite(r) && Number.isFinite(c) && r <= c;
}
