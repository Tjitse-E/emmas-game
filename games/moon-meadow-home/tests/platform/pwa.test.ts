import { describe, it, expect } from 'vitest';
import { platformStatus, recordPersist, requestPersist } from '../../src/platform/pwa.ts';

const nav = (storage: unknown): Navigator => ({ storage } as unknown as Navigator);

describe('requestPersist (core src/save/persist.ts, re-exported)', () => {
  it('is unavailable on plain http, where navigator.storage does not exist', async () => {
    expect(await requestPersist(nav(undefined))).toBe('unavailable');
  });
  it('reports granted and denied', async () => {
    expect(await requestPersist(nav({ persist: async () => true }))).toBe('granted');
    expect(await requestPersist(nav({ persist: async () => false }))).toBe('denied');
  });
  it('never throws', async () => {
    expect(await requestPersist(nav({ persist: async () => { throw new Error('no'); } }))).toBe('unavailable');
  });
});

describe('platformStatus', () => {
  it('starts unavailable and skipped, and is not a secure context in Node', () => {
    expect(platformStatus.sw).toBe('skipped');
    expect(platformStatus.secure).toBe(false);
  });
  it('keeps the persist result for the parent corner', async () => {
    expect(await recordPersist(nav({ persist: async () => true }))).toBe('granted');
    expect(platformStatus.persist).toBe('granted');
    expect(await recordPersist(nav(undefined))).toBe('unavailable');
    expect(platformStatus.persist).toBe('unavailable');
  });
});
