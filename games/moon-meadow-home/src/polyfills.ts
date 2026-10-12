// src/polyfills.ts. Safari 15.0 to 15.3 lack these, and Vite lowers syntax only (R50). main.ts imports this first.
if (!Object.hasOwn) {
  Object.defineProperty(Object, 'hasOwn', { value: (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k), configurable: true, writable: true });
}
for (const proto of [Array.prototype, String.prototype] as { at?: unknown }[]) {
  if (!proto.at) {
    Object.defineProperty(proto, 'at', {
      value(this: ArrayLike<unknown>, n: number) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this[n]; },
      configurable: true, writable: true,
    });
  }
}
if (typeof globalThis.structuredClone !== 'function') {
  (globalThis as { structuredClone?: unknown }).structuredClone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
}
export {};
