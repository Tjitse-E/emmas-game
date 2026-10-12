// Places' scene map (contracts C7): scene id to component. The platform registry finds it with its eager
// `src/*/scenes.ts` glob. Tasks A7, A10, A11, A13, A15 and later add their entries here.
import type { Component } from 'svelte';
import './hook.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const placeScenes: Record<string, Component<any>> = {};
