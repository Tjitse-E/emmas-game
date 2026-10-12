// G/tests/content/real-content.test.ts
import { describe, it, expect } from 'vitest';
import { realErrors } from './real.ts';

describe('all real content, data only', () => {
  it('has no validator errors at release 1.0', () => {
    expect(realErrors([''], { release: '1.0' })).toEqual([]);
  });
});
