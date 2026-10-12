// Ids that work in insecure contexts: crypto.randomUUID needs https, crypto.getRandomValues does not.
import { sha1Bytes, toHex, utf8 } from './hash.ts';

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';
export const DEVICE_ID_RE = /^[a-z2-7]{8}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function newDeviceId(): string {
  let id = '';
  for (const b of randomBytes(8)) id += BASE32[b & 31];
  return id;
}

function formatUuid(b: Uint8Array): string {
  const h = toHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function uuid4(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return formatUuid(b);
}

export function uuid5(name: string, namespace: string): string {
  if (!UUID_RE.test(namespace)) throw new Error(`bad namespace uuid: ${namespace}`);
  const ns = new Uint8Array(namespace.replace(/-/g, '').match(/../g)!.map(x => parseInt(x, 16)));
  const nameBytes = utf8(name);
  const all = new Uint8Array(16 + nameBytes.length);
  all.set(ns);
  all.set(nameBytes, 16);
  const b = sha1Bytes(all).slice(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  return formatUuid(b);
}
