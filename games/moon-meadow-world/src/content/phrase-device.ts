// Emma's picture check on her own iPad (docs/v4/2.3.md section 18, Claude's call). check.html shows the 30 tinted
// phrase pictures as the game tints them; Tjitse taps a tick or a cross after Emma names each one. The verdicts stay
// on this device under their own key, never in the game's save (mmw.save2), and the game reads them when it decides
// which phrase pairs Emma has checked, so her check needs no rebuild. tools/phrase-check.json stays the record that
// travels with the code: a pair is checked when the file says "by": "emma" or this device holds a tick for it, and a
// cross on this device turns it off. ?phrases=all (flows and dev) takes every ok pair of the file and ignores the
// device. Every storage call is wrapped: a private tab, blocked storage or a test without a window reads as no
// verdicts.

export type DeviceVerdict = 'tick' | 'cross';
export type DeviceChecks = Readonly<Record<string, DeviceVerdict>>;

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
 * this device's verdicts. With `all` every ok pair. Otherwise a pair is in when the file says "by": "emma" or the
 * device holds a tick, and out when the device holds a cross. A verdict for a pair the file does not have as ok
 * (dropped, or no entry) changes nothing.
 */
export function checkedPairs(pairs: Readonly<Record<string, string>>, device: DeviceChecks, all = false): Set<string> {
  return new Set(Object.keys(pairs).filter((k) => all || ((pairs[k] === 'emma' || device[k] === 'tick') && device[k] !== 'cross')));
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
