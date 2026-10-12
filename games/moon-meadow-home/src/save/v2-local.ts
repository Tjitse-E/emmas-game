// Reads Emma's v2 save straight from localStorage. Works because v3 is served from the same origin as v2.
import { V2_SAVE_KEY } from '../core/save/v2.ts';

export function readV2Local(storage?: Pick<Storage, 'getItem'> | null): string | null {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    const text = s?.getItem(V2_SAVE_KEY) ?? null;
    return text && text.trim() ? text : null;
  } catch {
    return null;
  }
}
