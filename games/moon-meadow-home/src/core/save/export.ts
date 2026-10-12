// The save file: export format and the parser that also recognises a v2 save from move.html.
import { isPlainObject } from '../checks.ts';
import type { GameEvent } from '../events.ts';
import { sortEvents } from '../merge.ts';
import { isV2Save } from './v2.ts';
import type { V2Save } from './v2.ts';

export const EXPORT_FORMAT = 'moon-meadow-save';
export type ExportFile = { format: typeof EXPORT_FORMAT; v: 1; exportedAt: number; events: GameEvent[] };
export type ParsedSave =
  | { kind: 'v3'; events: unknown[]; exportedAt: number }
  | { kind: 'v2'; save: V2Save }
  | { kind: 'invalid'; reason: string };

export function buildExport(events: readonly GameEvent[], now: number): ExportFile {
  return { format: EXPORT_FORMAT, v: 1, exportedAt: now, events: sortEvents(events) };
}

export function exportFileName(now: number): string {
  return `moon-meadow-${new Date(now).toISOString().slice(0, 10)}.json`;
}

export function parseSaveFile(text: string): ParsedSave {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { kind: 'invalid', reason: 'This file is not a save file.' };
  }
  if (isPlainObject(data) && data.format === EXPORT_FORMAT) {
    if (data.v !== 1 || !Array.isArray(data.events)) return { kind: 'invalid', reason: 'This save file is from a newer version of the game.' };
    return { kind: 'v3', events: data.events, exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : 0 };
  }
  if (isV2Save(data)) return { kind: 'v2', save: data };
  return { kind: 'invalid', reason: 'This file is not a Moon Meadow or Unicorn Egg Nest save.' };
}
