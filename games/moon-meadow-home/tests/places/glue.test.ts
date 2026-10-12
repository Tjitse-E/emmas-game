import { describe, expect, it } from 'vitest';
import { hookExtensions } from '../../src/platform/hooks.ts';
import { placeScenes } from '../../src/places/scenes.ts';
import { placesHook } from '../../src/places/hook.ts';

describe('places glue', () => {
  it('has a scene map for the registry and registers its test API as window.__game.places', () => {
    expect(Object.keys(placeScenes)).toContain('toy-shelf');
    expect(hookExtensions().get('places')).toBe(placesHook());
  });
});
