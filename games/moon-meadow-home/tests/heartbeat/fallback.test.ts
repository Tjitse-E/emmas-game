import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Fallback from '../../src/scenes/heartbeat/Fallback.svelte';

// The SVG drawn for an art id while its picture is missing (docs/v3/next/plan.md A3).
const kindOf = (id: string): string | null => {
  const body = render(Fallback as never, { props: { id, size: 100 } } as never).body;
  return /data-kind="([a-z-]+)"/.exec(body)?.[1] ?? null;
};

describe('Fallback', () => {
  it('draws the 1.0.1 stable and feeding pictures', () => {
    expect(kindOf('item-stall-bed')).toBe('stall-bed');
    expect(kindOf('item-straw-pile')).toBe('straw-pile');
    expect(kindOf('item-manger')).toBe('manger');
    expect(kindOf('item-hay-bundle')).toBe('hay-bundle');
    expect(kindOf('item-food-tray')).toBe('food-tray');
  });

  it('keeps the blanket and nest fallbacks for the other two new pictures', () => {
    expect(kindOf('item-sleep-blanket')).toBe('blanket');
    expect(kindOf('item-cup-nest')).toBe('nest');
  });

  it('keeps the existing cases', () => {
    expect(kindOf('item-stall-door')).toBe('door');
    expect(kindOf('station-hay-rack')).toBe('station');
    expect(kindOf('egg-moon')).toBe('egg');
    expect(kindOf('item-blanket-cover')).toBe('blanket');
    expect(kindOf('item-nest')).toBe('nest');
    expect(kindOf('item-lantern-lit')).toBe('lantern');
    expect(kindOf('item-something-else')).toBe('round');
  });

  it('draws every new picture inside the box at the asked size', () => {
    for (const id of ['item-stall-bed', 'item-straw-pile', 'item-manger', 'item-hay-bundle', 'item-food-tray']) {
      const body = render(Fallback as never, { props: { id, size: 88 } } as never).body;
      expect(body).toContain('width="88"');
      expect(body).toContain('viewBox="0 0 200 200"');
      expect(body).toContain('aria-hidden="true"');
    }
  });
});
