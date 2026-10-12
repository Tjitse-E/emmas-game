// Places' scene map (contracts C7): scene id to component. The platform registry finds it with its eager
// `src/*/scenes.ts` glob. Tasks A7, A10, A11, A13 and later add their entries here. The parent corner
// (`parent`) is registered lazily by the registry from src/parent/ParentCorner.svelte.
import type { Component } from 'svelte';
import './hook.ts';
import ToyShelf from '../scenes/places/ToyShelf.svelte';
import BathPond from '../scenes/places/BathPond.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const placeScenes: Record<string, Component<any>> = {
  'toy-shelf': ToyShelf,
  'bath-pond': BathPond,
};
