/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PluginOption } from 'vite';

// R60: sharedAudio (the @emma/audio-player alias and the phonics files) comes from tools/vite-shared-audio.ts,
// which the audio lane writes in batch A2 (AU-A8). It loads only when the file exists, so lanes branched before
// that merge still run Vite and Vitest.
const sharedAudioFile = resolve(import.meta.dirname, 'tools/vite-shared-audio.ts');
const sharedAudioPlugins: PluginOption[] = existsSync(sharedAudioFile)
  ? [(await import(pathToFileURL(sharedAudioFile).href)).sharedAudio(resolve(import.meta.dirname, '../..'))]
  : [];

const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [svelte(), ...sharedAudioPlugins],
  define: {
    __BUILD_ID__: JSON.stringify(`${sha}-${Date.now()}`),
    __TEST_BUILD__: JSON.stringify(mode === 'test'),
  },
  build: {
    target: 'safari15',
    outDir: mode === 'test' ? 'dist-test' : 'dist',
    rollupOptions: { input: { index: resolve(import.meta.dirname, 'index.html'), stress: resolve(import.meta.dirname, 'stress.html') } },
  },
  server: {
    fs: { allow: ['..', '../..'] },
    proxy: { '/api': 'http://127.0.0.1:8766' },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 20000 },
}));
