// Emma's picture check on her own iPad (docs/v4/2.3.md section 18). check.html shows the 30 tinted phrase pictures as
// the game tints them; Tjitse taps a tick or a cross after Emma names each one. The verdicts stay on this device under
// their own key, never in the game's save (mmw.save2), and the game reads them when it decides which phrase pairs a
// play may use, so her check needs no rebuild. tools/phrase-check.json stays the record that travels with the code.
// The game's rule (?phrases=, PhraseRule): by default every ok pair of the file plays, Claude's checks too, and a cross
// on this device turns a pair off at once. ?phrases=emma is the 2.3.0 rule: only pairs the file has as "by": "emma" or
// this device holds a tick for, still minus the crosses. ?phrases=all (flows and dev) takes every ok pair and ignores
// the device. Every storage call is wrapped: a private tab, blocked storage or a test without a window reads as no
// verdicts.

export type DeviceVerdict = 'tick' | 'cross';
export type DeviceChecks = Readonly<Record<string, DeviceVerdict>>;

/**
 * Which ok pairs a play may use (?phrases=): 'default' every ok pair minus this device's crosses, 'emma' only Emma's
 * (the file's "by": "emma" and this device's ticks) minus the crosses, 'all' every ok pair whatever the device holds.
 */
export type PhraseRule = 'default' | 'emma' | 'all';

/** ?phrases=emma or ?phrases=all; anything else (or nothing) is the default rule. */
export function parsePhraseRule(v: string | null | undefined): PhraseRule {
  return v === 'emma' || v === 'all' ? v : 'default';
}

/** The device's own key for the verdicts (the game's save is mmw.save2). */
export const DEVICE_CHECK_KEY = 'mmw.phrasecheck1';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

/** The page's localStorage, or null where there is none or it cannot be reached. */
function storage(): Store | null {
  try {
    return (globalThis as { localStorage?: Store }).localStorage ?? null;
  } catch {
    return null;
  }
}

/** Only "colour thing" keys with a tick or a cross; anything else in the stored value is left out. */
function clean(v: unknown): Record<string, DeviceVerdict> {
  const out: Record<string, DeviceVerdict> = {};
  const pairs = v && typeof v === 'object' ? (v as { pairs?: unknown }).pairs : null;
  if (!pairs || typeof pairs !== 'object') return out;
  for (const [k, x] of Object.entries(pairs as Record<string, unknown>)) {
    if (/^[a-z]+ [a-z]+$/.test(k) && (x === 'tick' || x === 'cross')) out[k] = x;
  }
  return out;
}

/** The verdicts this device holds ({} when there are none or storage cannot be read). */
export function readDeviceChecks(store: Store | null = storage()): Record<string, DeviceVerdict> {
  try {
    const raw = store?.getItem(DEVICE_CHECK_KEY);
    return raw ? clean(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Store the verdicts on this device. False when storage cannot be written (the page then says so). */
export function writeDeviceChecks(checks: DeviceChecks, store: Store | null = storage()): boolean {
  try {
    if (!store) return false;
    store.setItem(DEVICE_CHECK_KEY, JSON.stringify({ v: 1, pairs: clean({ pairs: checks }) }));
    return true;
  } catch {
    return false;
  }
}

/**
 * The phrase pairs a play may use, from the ok pairs of tools/phrase-check.json (`pairs`: who checked each one) and
 * this device's verdicts. 'all': every ok pair. 'default': every ok pair without a cross on this device. 'emma': a
 * pair is in when the file says "by": "emma" or the device holds a tick, and out when the device holds a cross. A
 * verdict for a pair the file does not have as ok (dropped, or no entry) changes nothing.
 */
export function checkedPairs(pairs: Readonly<Record<string, string>>, device: DeviceChecks, rule: PhraseRule = 'default'): Set<string> {
  const emma = (k: string) => pairs[k] === 'emma' || device[k] === 'tick';
  return new Set(Object.keys(pairs).filter((k) => rule === 'all' || (device[k] !== 'cross' && (rule === 'default' || emma(k)))));
}

/** A tap on a verdict button: sets that verdict, or clears it when the pair already has it. */
export function toggled(checks: DeviceChecks, key: string, v: DeviceVerdict): Record<string, DeviceVerdict> {
  const out = { ...checks };
  if (out[key] === v) delete out[key];
  else out[key] = v;
  return out;
}

/**
 * The page's order of the pairs: the n-th card has colour n mod 6 and thing n mod 5, so every pair comes once and two
 * cards side by side never share a colour or a thing (she names each colour and thing afresh). The first colour
 * leads, so the page starts with gold.
 */
export function checkOrder(colours: readonly string[], things: readonly string[]): [string, string][] {
  return Array.from({ length: colours.length * things.length }, (_, i): [string, string] => [colours[i % colours.length], things[i % things.length]]);
}
