import { describe, it, expect } from 'vitest';
import { RouterCore } from '../../src/platform/router-core.ts';
import { sceneIdFromPath, PORTRAIT_OK, KNOWN_SCENES } from '../../src/platform/scene-ids.ts';
import { SCENE_IDS } from '../../src/types/contracts.ts';

describe('RouterCore', () => {
  it('starts empty and goes forward', () => {
    const r = new RouterCore<string>();
    expect(r.current).toBeNull();
    r.go('meadow');
    r.go('nest', { egg: 1 });
    expect(r.current).toEqual({ id: 'nest', params: { egg: 1 } });
    expect(r.depth).toBe(2);
  });
  it('goes back and stops at the first scene', () => {
    const r = new RouterCore<string>();
    r.go('meadow');
    r.go('nest');
    expect(r.back()).toBe(true);
    expect(r.current?.id).toBe('meadow');
    expect(r.back()).toBe(false);
    expect(r.current?.id).toBe('meadow');
  });
  it('replace swaps the scene without history, reset clears history', () => {
    const r = new RouterCore<string>();
    r.go('meadow');
    r.go('nest');
    r.replace('hatch');
    expect(r.depth).toBe(2);
    expect(r.current?.id).toBe('hatch');
    r.reset('goodnight');
    expect(r.depth).toBe(1);
  });
  it('replace on an empty router starts it', () => {
    const r = new RouterCore<string>();
    r.replace('rest');
    expect(r.current?.id).toBe('rest');
    expect(r.depth).toBe(1);
  });
  it('keeps at most maxHistory entries', () => {
    const r = new RouterCore<string>(3);
    for (const id of ['a', 'b', 'c', 'd']) r.go(id);
    expect(r.depth).toBe(3);
    r.back();
    r.back();
    expect(r.current?.id).toBe('b');
    expect(r.back()).toBe(false);
  });
  it('tells listeners where it came from and went to', () => {
    const r = new RouterCore<string>();
    const seen: string[] = [];
    const off = r.onChange((f, t) => seen.push(`${f?.id ?? '-'}>${t.id}`));
    r.go('meadow');
    r.go('nest');
    r.back();
    off();
    r.go('salon');
    expect(seen).toEqual(['->meadow', 'meadow>nest', 'nest>meadow']);
  });
  it('a listener that throws does not stop the others or the navigation', () => {
    const r = new RouterCore<string>();
    const seen: string[] = [];
    r.onChange(() => { throw new Error('boom'); });
    r.onChange((_f, t) => seen.push(t.id));
    expect(() => r.go('meadow')).not.toThrow();
    expect(seen).toEqual(['meadow']);
    expect(r.current?.id).toBe('meadow');
  });
});

describe('scene ids', () => {
  it('turns file names into kebab-case ids', () => {
    expect(sceneIdFromPath('../scenes/BuildingDay.svelte')).toBe('building-day');
    expect(sceneIdFromPath('../scenes/Nest.svelte')).toBe('nest');
    expect(sceneIdFromPath('../scenes/Rest.svelte')).toBe('rest');
    expect(sceneIdFromPath('./PlatformDemo.svelte')).toBe('platform-demo');
    expect(sceneIdFromPath('../parent/ParentCorner.svelte')).toBe('parent');
  });
  it('allows portrait only in the parent corner', () => {
    expect(PORTRAIT_OK.has('parent')).toBe(true);
    expect(PORTRAIT_OK.has('meadow')).toBe(false);
  });
  it('knows exactly the scene ids of the contract', () => {
    expect(KNOWN_SCENES).toEqual([...SCENE_IDS]);
    expect(KNOWN_SCENES).toContain('rest');
    expect(KNOWN_SCENES).toContain('platform-demo');
  });
});
