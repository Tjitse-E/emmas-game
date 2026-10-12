import { describe, it, expect } from 'vitest';
import pkg from '../../package.json' with { type: 'json' };

describe('package', () => {
  it('pins every dependency exactly', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    for (const [name, version] of Object.entries(all)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+/);
    }
  });
});
