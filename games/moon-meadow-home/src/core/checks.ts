// A tiny validator kit with no dependencies, so the Node save server can use it too.
// A check returns null when the value is fine, or a short reason.
export type Check = (x: unknown) => string | null;

export function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export const str = (max: number): Check => x =>
  typeof x === 'string' && x.length <= max ? null : `text up to ${max}`;

export const text = (max: number): Check => x =>
  typeof x === 'string' && x.length > 0 && x.length <= max ? null : `non-empty text up to ${max}`;

/** Ids and keys: letters, digits and : . _ + - , not starting with a symbol, up to 64 characters. */
export const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9:._+-]{0,63}$/;
export const key: Check = x => (typeof x === 'string' && KEY_RE.test(x) ? null : 'key');

/**
 * A grapheme gem: lowercase letters, with a hyphen for split digraphs (a-e). A dot is allowed too, so a
 * learning GPC id such as 'ow.oa' never sends an event to quarantine.
 */
export const GEM_RE = /^[a-z][a-z.-]{0,5}$/;
export const gem: Check = x => (typeof x === 'string' && GEM_RE.test(x) ? null : 'gem');

export const num: Check = x => (typeof x === 'number' && Number.isFinite(x) ? null : 'number');

export const int = (min: number, max: number): Check => x =>
  Number.isInteger(x) && (x as number) >= min && (x as number) <= max ? null : `whole number ${min} to ${max}`;

export const bool: Check = x => (typeof x === 'boolean' ? null : 'true or false');

export const oneOf = (...values: readonly (string | number)[]): Check => x =>
  values.includes(x as string | number) ? null : `one of ${values.join(', ')}`;

export const nullable = (c: Check): Check => x => (x === null ? null : c(x));

export const arr = (c: Check, max: number): Check => x => {
  if (!Array.isArray(x) || x.length > max) return `list up to ${max}`;
  for (let i = 0; i < x.length; i++) {
    const err = c(x[i]);
    if (err) return `[${i}] ${err}`;
  }
  return null;
};

/** An object with exactly these fields. Extra fields are refused, so logs stay clean. */
export const obj = (shape: Record<string, Check>): Check => x => {
  if (!isPlainObject(x)) return 'object';
  for (const k of Object.keys(x)) if (!Object.hasOwn(shape, k)) return `unexpected field ${k}`;
  for (const k of Object.keys(shape)) {
    const err = shape[k](x[k]);
    if (err) return `${k}: ${err}`;
  }
  return null;
};

/** An object whose keys pass KEY_RE and whose values pass `c`. */
export const record = (c: Check, maxKeys: number): Check => x => {
  if (!isPlainObject(x)) return 'object';
  const keys = Object.keys(x);
  if (keys.length > maxKeys) return `up to ${maxKeys} fields`;
  for (const k of keys) {
    if (!KEY_RE.test(k)) return `bad field name ${k}`;
    const err = c(x[k]);
    if (err) return `${k}: ${err}`;
  }
  return null;
};

export const scalar: Check = x =>
  x === null || typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)) || (typeof x === 'string' && x.length <= 500)
    ? null
    : 'text, number, true, false or null';
