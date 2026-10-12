// G/tests/content/static.test.ts
import { describe, it, expect } from 'vitest';
import { CONTENT_HASH, blocklist, content } from '../../src/core/content/static.ts';
import { readRawContent } from '../../tools/lib/read-content.ts';
import { canonicalJson, sha256Hex } from '../../src/core/hash.ts';

describe('app content loader', () => {
  it('builds the same content the Node reader builds', () => {
    expect(content.order.r).toHaveLength(55);
    expect(Object.keys(content.words).length).toBeGreaterThanOrEqual(450);
    expect(content.names.length).toBeGreaterThanOrEqual(1000);
    expect(blocklist.unsplit).toEqual([]);
  });

  it('hashes the canonical raw content (CONTENT_HASH)', () => {
    expect(CONTENT_HASH).toMatch(/^[0-9a-f]{64}$/);
    expect(CONTENT_HASH).toBe(sha256Hex(canonicalJson(readRawContent())));
  });
});
