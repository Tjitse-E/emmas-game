// Upgrades events written with an older schema version. Snapshots are never migrated, they are refolded.
import { checkBase, SCHEMA_VERSION, validateEvent } from './events.ts';
import type { Validation } from './events.ts';
import { isPlainObject } from './checks.ts';

export type Migration = (e: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] turns a version n event into a version n + 1 event. Each entry needs its own unit test. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export function upgradeWith(x: unknown, migrations: Readonly<Record<number, Migration>>, target: number): unknown {
  if (!isPlainObject(x) || checkBase(x) !== null) return x;
  let e: Record<string, unknown> = x;
  while ((e.v as number) < target) {
    const step = migrations[e.v as number];
    if (!step) return e;
    e = { ...step(e), v: (e.v as number) + 1 };
  }
  return e;
}

export function upgradeEvent(x: unknown): unknown {
  return upgradeWith(x, MIGRATIONS, SCHEMA_VERSION);
}

/** Upgrade, then validate. The one entry point for events that come from storage, a file or the network. */
export function checkEvent(x: unknown): Validation {
  return validateEvent(upgradeEvent(x));
}
