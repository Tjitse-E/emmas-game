// Parent settings (latest wins per key) and diagnostics for the parent corner.
import type { Scalar } from '../events.ts';
import type { Slice } from '../fold/engine.ts';

export type SettingsState = Record<string, Scalar>;
export type DiagState = { audioMissing: string[] };

export const settingsSlice: Slice<'settings', SettingsState> = {
  name: 'settings',
  version: '1',
  init: () => ({}),
  apply(s, e) {
    if (e.type === 'settings.set') s[e.key] = e.value;
    return s;
  },
};

export const diagSlice: Slice<'diag', DiagState> = {
  name: 'diag',
  version: '1',
  init: () => ({ audioMissing: [] }),
  apply(s, e) {
    if (e.type === 'audio.missing' && !s.audioMissing.includes(e.clip)) s.audioMissing.push(e.clip);
    return s;
  },
};

export function setting<T extends Scalar>(s: SettingsState, key: string, fallback: T): T {
  return (Object.hasOwn(s, key) ? s[key] : fallback) as T;
}
