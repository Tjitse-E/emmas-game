// Stamps drafts into events: device id, sequence and hybrid clock.
import { SCHEMA_VERSION } from './events.ts';
import type { GameEvent, GameEventDraft } from './events.ts';
import { formatHlc, HLC_ZERO, maxHlc, parseHlc, tick } from './hlc.ts';
import { newDeviceId } from './ids.ts';

export type DeviceMeta = { dev: string; nextSeq: number; hlc: string };

export function newDeviceMeta(hlc: string = formatHlc(HLC_ZERO)): DeviceMeta {
  return { dev: newDeviceId(), nextSeq: 1, hlc };
}

export function stamp(meta: DeviceMeta, drafts: readonly GameEventDraft[], now: number): { events: GameEvent[]; meta: DeviceMeta } {
  let h = parseHlc(meta.hlc) ?? HLC_ZERO;
  let seq = meta.nextSeq;
  const events: GameEvent[] = [];
  for (const d of drafts) {
    h = tick(h, now);
    events.push({ ...d, id: `${meta.dev}:${seq}`, hlc: formatHlc(h), t: now, dev: meta.dev, v: SCHEMA_VERSION } as GameEvent);
    seq++;
  }
  return { events, meta: { dev: meta.dev, nextSeq: seq, hlc: formatHlc(h) } };
}

/** Raises the device clock to the highest clock seen, so the next local event sorts after all of them. */
export function observe(meta: DeviceMeta, events: readonly { hlc: string }[]): DeviceMeta {
  const current = parseHlc(meta.hlc) ?? HLC_ZERO;
  const best = maxHlc(current, events.map(e => e.hlc));
  return best === current ? meta : { ...meta, hlc: formatHlc(best) };
}
