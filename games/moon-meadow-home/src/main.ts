import './polyfills.ts';   // first: Safari 15.0 to 15.3 lack Object.hasOwn, Array.prototype.at and structuredClone (R50)
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { installGuards } from './platform/guards.ts';
import { installTouchSource } from './platform/touch.ts';
import { boot } from './platform/boot.svelte.ts';
import { audio } from './audio/index.ts';
import { loadArtManifest } from './art/manifest.ts';

// The game store (src/game.svelte.ts, integration Task I-1) registers its start handler and hooks on import.
// An eager glob, so the app builds before the store exists. The integrator switches it to a static import (R60).
import.meta.glob('./game.svelte.ts', { eager: true });

declare global {
  interface Window { __mmhBooted?: boolean }
}

const testBuild = import.meta.env.MODE !== 'production';

installGuards(document);
installTouchSource(document);

// Test builds take ?art=<file> so a flow can boot without the art manifest (integration no-art-manifest flow).
const artFile = testBuild ? new URLSearchParams(location.search).get('art') ?? undefined : undefined;
void boot([audio.init({ base: import.meta.env.BASE_URL + 'audio/' }), loadArtManifest(undefined, artFile)]);

const app = mount(App, { target: document.getElementById('app')! });
window.__mmhBooted = true;   // public/feature-check.js shows the v2 link when this is missing after 10 seconds

if (testBuild) {
  // Production drops this branch and the test hook with it. A glob, so the shell builds without the hook file.
  const hook = import.meta.glob<{ installTestHook(): void }>('./test-hook.ts');
  for (const load of Object.values(hook)) void load().then((m) => m.installTestHook());
}

export default app;
