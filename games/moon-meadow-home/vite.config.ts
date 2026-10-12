/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [svelte()],   // the integrator adds sharedAudio(resolve(import.meta.dirname, '../..')) here at the A2 start (R60)
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
