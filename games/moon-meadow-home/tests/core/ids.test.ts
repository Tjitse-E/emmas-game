import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_ID_RE, newDeviceId, UUID_RE, uuid4, uuid5 } from '../../src/core/ids.ts';

describe('ids', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uuid5 matches the RFC example', () => {
    expect(uuid5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });

  it('uuid4 has version 4 and is unique', () => {
    const ids = new Set(Array.from({ length: 1000 }, uuid4));
    expect(ids.size).toBe(1000);
    for (const id of ids) {
      expect(id).toMatch(UUID_RE);
      expect(id[14]).toBe('4');
    }
  });

  it('works where crypto.randomUUID is missing, as on plain http', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error('insecure context'); });
    expect(uuid4()).toMatch(UUID_RE);
    expect(newDeviceId()).toMatch(DEVICE_ID_RE);
  });

  it('device ids are 8 base32 characters', () => {
    for (let i = 0; i < 100; i++) expect(newDeviceId()).toMatch(DEVICE_ID_RE);
  });
});
