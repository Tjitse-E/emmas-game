// Contracts section 12 verbatim (docs/v3/plan/contracts.ts, R40). The one owner of item ids, name keys and clip ids.
import type { GpcId, ItemId, NameMark } from '../types/contracts.ts';

/**
 * Item ids (learning): strand prefix, kind, value. Every id matches KEY_RE (core checks.ts).
 *   reading and spelling graphemes 'r:g:ai', 's:g:a-e'; endings 'r:end:s', 'r:end:es', 'r:end:none', 's:end:es';
 *   pairs 'r:pair:a-e-u'; clusters 'r:cl:-st'; tricky words 'r:t:push', 's:t:said'; marks 's:mark:q';
 *   maths 'm:pair:3-7', 'm:miss:10-7', 'm:num:14'; names 'name:<nameKey>' (keyed by name, not by baby).
 * Places and heartbeat keep their own short names inside their logic ('-es', 'ai', 'mark-?') and map
 * to these ids only in their adapters (places src/places/serve.ts, heartbeat src/scenes/heartbeat/learn-bridge.ts).
 */
export const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9:._+-]{0,63}$/;
export function graphemeItem(strand: 'r' | 's', gpc: GpcId): ItemId {
  return `${strand}:g:${gpc}`;
}
/** Name key: lowercase ASCII letters only ('Zoë' is 'zoe', 'Lily-Rose' is 'lilyrose'). Used for name items and name clip ids. */
export function slugName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}
export const nameKey = slugName;
export function nameItemId(name: string): ItemId {
  return `name:${nameKey(name)}`;
}

/** Kebab slug for words and other clip ids (audio src/audio/ids.ts). */
export function slug(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function wordId(word: string): string {
  return `word-${slug(word)}`;
}
/** "Pip!" is name-pip, "Pip?" is name-pip-q. */
export function nameId(name: string, mark: NameMark): string {
  return mark === '!' ? `name-${slugName(name)}` : `name-${slugName(name)}-q`;
}
/** A phrase clip is named after the phrase id in content/phrases/*.json. */
export function phraseId(phraseIdInContent: string): string {
  return `phrase-${phraseIdInContent}`;
}
export type NumKind = 'n' | 'movein' | 'visit' | 'door-bed' | 'herd' | 'sky' | 'over' | 'cold' | 'warm' | 'nest'
  | 'up' | 'more' | 'count' | 'tap-door' | 'need' | 'sash-has';
export function numId(kind: NumKind, n: number): string {
  return kind === 'n' ? `num-${n}` : `num-${kind}-${n}`;
}
export function bondId(a: number, b: number): string {
  return `num-bond-${a}-${b}`;
}
export function ordId(n: number): string {
  return `ord-${n}`;
}
/** Heartbeat's line ids map onto the audio number lines. */
export const HEARTBEAT_NUMBER_IDS = {
  num: (n: number) => numId('n', n), over: (n: number) => numId('over', n), cold: (n: number) => numId('cold', n),
  more: (n: number) => numId('more', n), warm: (n: number) => numId('warm', n), bond: bondId,
  baby: (n: number) => numId('movein', n), visit: (n: number) => numId('visit', n), thatIs: (n: number) => numId('n', n),
  doorBed: (n: number) => numId('door-bed', n), unicorns: (n: number) => numId('herd', n), sky: (n: number) => numId('sky', n),
  ordinal: ordId,
} as const;
/** Ids that only Elizabeth (narrator) may speak. Build tool and generator refuse other speakers. */
export const NARRATOR_ONLY_PREFIXES = ['word-', 'name-', 'num-', 'sound-', 'phrase-', 'ord-', 'model-'] as const;
