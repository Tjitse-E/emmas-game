// G/tests/content/real-names.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { V2_NAMES } from '../../tools/lib/validate.ts';
import { realErrors } from './real.ts';

describe('tier 1 names', () => {
  const c = readContent('1.0');

  it('has about 1,000 names with at least 300 at priority 1', () => {
    expect(c.names.length).toBeGreaterThanOrEqual(1000);
    expect(c.names.filter(n => n.priority === 1).length).toBeGreaterThanOrEqual(300);
  });

  it('includes every v2 name', () => {
    const slugs = new Set(c.names.map(n => n.slug));
    for (const n of V2_NAMES) expect(slugs.has(n), n).toBe(true);
  });

  it('includes the cousins Dot, Fen and Bex at priority 1 (validation round 2)', () => {
    for (const slug of ['dot', 'fen', 'bex']) expect(c.names.find(n => n.slug === slug)?.priority, slug).toBe(1);
    expect(c.names.find(n => n.slug === 'dot')?.source).toBe('fantasy');
    expect(c.names.find(n => n.slug === 'bex')?.source).toBe('fantasy');
  });

  it('groups Charlotte under sh', () => {
    expect(c.names.find(n => n.slug === 'charlotte')?.first).toBe('sh');
  });

  it('has no trademarked or family names', () => {
    const slugs = new Set(c.names.map(n => n.slug));
    for (const n of ['elsa', 'moana', 'ariel', 'peppa', 'emma', 'fanny', 'dick', 'willy', 'randy']) expect(slugs.has(n), n).toBe(false);
  });

  it('passes the validator for names, Dutch and spelling coverage', () => {
    expect(realErrors(['NAME_', 'DUTCH_', 'GPC_ID', 'GPC_PHONEME', 'COVER_STEP'])).toEqual([]);
  });
});
