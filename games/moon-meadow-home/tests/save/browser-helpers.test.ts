import { describe, expect, it, vi } from 'vitest';
import { claimTab } from '../../src/save/tab-guard.ts';
import { requestPersist } from '../../src/save/persist.ts';
import { readV2Local } from '../../src/save/v2-local.ts';
import { saveExportFile } from '../../src/save/file.ts';
import { buildExport } from '../../src/core/save/export.ts';

const tick = () => new Promise(r => setTimeout(r, 30));

describe('tab guard', () => {
  it('tells the older tab it lost when a newer tab claims', async () => {
    const lostA = vi.fn();
    const lostB = vi.fn();
    const a = claimTab(lostA, 'test-tabs');
    await tick();
    const b = claimTab(lostB, 'test-tabs');
    await tick();
    expect(lostA).toHaveBeenCalledTimes(1);
    expect(lostB).not.toHaveBeenCalled();
    a.close();
    b.close();
  });
});

describe('persist', () => {
  it('is unavailable without navigator.storage.persist, as on plain http', async () => {
    expect(await requestPersist({})).toBe('unavailable');
    expect(await requestPersist(undefined)).toBe('unavailable');
    expect(await requestPersist({ storage: { persist: async () => true } })).toBe('granted');
    expect(await requestPersist({ storage: { persist: async () => false } })).toBe('denied');
    expect(await requestPersist({ storage: { persist: async () => { throw new Error('x'); } } })).toBe('unavailable');
  });
});

describe('v2 local read', () => {
  it('reads the v2 key, and returns null for empty, missing or throwing storage', () => {
    expect(readV2Local({ getItem: k => (k === 'emma-unicorn-egg-nest-v2' ? '{"v":2}' : null) })).toBe('{"v":2}');
    expect(readV2Local({ getItem: () => '  ' })).toBeNull();
    expect(readV2Local(null)).toBeNull();
    expect(readV2Local({ getItem: () => { throw new Error('SecurityError'); } })).toBeNull();
  });
});

describe('save file download', () => {
  it('downloads when the share sheet is missing', async () => {
    const click = vi.fn();
    const el = { href: '', download: '', click, remove: vi.fn() };
    const doc = { createElement: () => el, body: { appendChild: vi.fn() } } as unknown as Document;
    const r = await saveExportFile(buildExport([], Date.UTC(2026, 11, 3)), {}, doc);
    expect(r).toBe('downloaded');
    expect(el.download).toBe('moon-meadow-2026-12-03.json');
    expect(click).toHaveBeenCalled();
  });

  it('shares when the share sheet takes files, and reports a cancel', async () => {
    const share = vi.fn(async () => {});
    expect(await saveExportFile(buildExport([], 0), { canShare: () => true, share })).toBe('shared');
    const cancel = vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); });
    expect(await saveExportFile(buildExport([], 0), { canShare: () => true, share: cancel })).toBe('cancelled');
  });
});
