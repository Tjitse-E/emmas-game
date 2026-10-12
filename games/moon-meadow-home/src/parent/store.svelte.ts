// The parent corner bound to the store (Task A15, R56): the gate state, backup and restore, overrides and
// the test hooks of the eviction flow. Components and src/places/hook.ts call these; parent.ts stays pure.
import { game, wakeVisit } from '../game.svelte.ts';
import type { GameData } from '../save/game-data.ts';
import { readFileText, saveExportFile } from '../save/file.ts';
import { readV2Local } from '../save/v2-local.ts';
import { v2Deps } from '../game/v2-deps.ts';
import { report as buildReport, type Report } from '../core/report/criteria.ts';
import type { GameEvent } from '../core/events.ts';
import type { LearnOverridePayload } from '../types/contracts.ts';
import { checkPin, deviceList, fileEventIds, hatchedOutside, importMessage, pinOf } from './parent.ts';
import { audio } from '../audio/index.ts';

type Data = GameData<unknown>;

/** What the gate shows: nothing, the keypad, or the corner itself. One gate is on screen at a time. */
export const parentGate = $state<{ keypad: boolean; corner: boolean; entered: string; shake: number }>({ keypad: false, corner: false, entered: '', shake: 0 });

/** Ids of the events in the last restored file (hatchedSinceRestore). */
let restoredIds: ReadonlySet<string> = new Set();

export function data(): Data {
  const d = game.data as Data | null;
  if (!d) throw new Error('store not open');
  return d;
}

export const allEvents = (): readonly GameEvent[] => (game.data ? (data().allEvents() as readonly GameEvent[]) : []);
export const settings = (): Record<string, unknown> => ({ 'parent-pin': game.world?.settings.parentPin ?? '2468' });
export const currentPin = (): string => pinOf(settings());

export function openKeypad(): void {
  parentGate.entered = '';
  parentGate.keypad = true;
}

export function closeGate(): void {
  parentGate.keypad = false;
  parentGate.corner = false;
  parentGate.entered = '';
}

/** One key of the keypad. Four digits are checked: right opens the corner, wrong clears with a shake. */
export function pressKey(d: number): void {
  if (!parentGate.keypad) return;
  parentGate.entered += String(d);
  if (parentGate.entered.length < 4) return;
  const ok = checkPin(parentGate.entered, settings());
  parentGate.entered = '';
  if (ok) {
    parentGate.keypad = false;
    parentGate.corner = true;
    audio.stop();
  } else parentGate.shake += 1;
}

/** Enters the PIN as taps would. True when the corner is open afterwards. */
export function unlock(pin: string = currentPin()): boolean {
  if (!parentGate.keypad && !parentGate.corner) openKeypad();
  if (parentGate.corner) return true;
  parentGate.entered = '';
  for (const ch of pin) pressKey(Number(ch));
  return parentGate.corner;
}

export const report = (): Report => buildReport(allEvents(), game.now());
export const devices = () => deviceList(allEvents());

export function exportText(): string {
  return JSON.stringify(data().exportFile());
}

export async function exportSave(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const out = await saveExportFile(data().exportFile());
  if (out !== 'cancelled') await data().markExported();
  return out;
}

/** The restore path of Backup: import, refold, and when something came in, start over from the restored log. */
export async function restoreText(text: string): Promise<string> {
  await game.ready();
  const out = await data().importText(text, v2Deps);
  if (out.kind === 'v3') restoredIds = fileEventIds(text);
  game.markRefolded();
  const changed = (out.kind === 'v3' && out.added > 0) || (out.kind === 'v2' && out.status === 'imported');
  if (changed) {
    closeGate();
    await wakeVisit();   // chooseStart on the restored log; leaves the welcome (R56)
  }
  return importMessage(out);
}

export async function restoreFile(file: Blob): Promise<string> {
  return restoreText(await readFileText(file));
}

/** "Import v2 from this browser again". */
export async function reimportV2(): Promise<string> {
  const text = readV2Local();
  if (!text) return 'There is no v2 save in this browser.';
  return restoreText(text);
}

export const hatchedSinceRestore = (): number => hatchedOutside(allEvents(), restoredIds);

export function override(payload: LearnOverridePayload): void {
  game.dispatch({ type: 'game/override', payload });
}

export function setExcluded(device: string, on: boolean): void {
  if (device === data().device()) return;
  game.dispatch({ type: 'game/exclude', device, on });
  game.markRefolded();
}

export async function excludeLocalPlay(): Promise<string> {
  const old = await data().excludeLocalPlay();
  game.markRefolded();
  return old;
}

export async function resetDevice(): Promise<void> {
  await data().reset();
  location.reload();
}
