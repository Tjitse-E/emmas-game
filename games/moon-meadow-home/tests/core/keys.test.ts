import { describe, expect, it } from 'vitest';
import { nameId, nameItemId, slugName } from '../../src/core/keys.ts';

describe('one name key for items and clips', () => {
  it('drops accents and hyphens the same way for both', () => {
    expect(slugName('Zoë')).toBe('zoe');
    expect(nameItemId('Zoë')).toBe('name:zoe');
    expect(nameId('Zoë', '!')).toBe('name-zoe');
    expect(nameItemId('Lily-Rose')).toBe('name:lilyrose');
    expect(nameId('Lily-Rose', '?')).toBe('name-lilyrose-q');
  });
});
