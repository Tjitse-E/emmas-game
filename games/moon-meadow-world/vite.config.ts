/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';

const here = import.meta.dirname;
const repo = resolve(here, '../..');
const v3Public = join(repo, 'games/moon-meadow-home/public');
const phonics = join(repo, 'shared/audio/phonics');

const TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml',
};

/**
 * The demo reuses v3's clips and pictures instead of copying them (spec 6.2). On a server they sit next to the demo
 * under games/moon-meadow-home/ (see src/assets.ts). In dev, /v3/ maps to v3's public folder and the shared letter sounds.
 */
function v3Assets(): Plugin {
  return {
    name: 'mmw-v3-assets',
    config: () => ({ resolve: { alias: { '@emma/audio-player': join(repo, 'shared/audio.js') } } }),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        if (!url.startsWith('/v3/')) return next();
        const rel = normalize(url.slice('/v3/'.length));
        if (rel.startsWith('..') || rel.split('/').some((s) => s.startsWith('.'))) return next();
        const file = rel.startsWith('audio/phonics/') ? join(phonics, rel.slice('audio/phonics/'.length)) : join(v3Public, rel);
        if (!existsSync(file) || !statSync(file).isFile()) return next();
        const ext = file.slice(file.lastIndexOf('.'));
        res.setHeader('Content-Type', TYPES[ext] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
  };
}

/** The release version (the newest entry in the repo's CHANGELOG.md), shown on the start screen. */
function version(): string {
  const m = /^## \[(\d+\.\d+\.\d+)\]/m.exec(readFileSync(join(repo, 'CHANGELOG.md'), 'utf8'));
  return m ? `v${m[1]}` : 'dev';
}

export default defineConfig({
  base: './',
  define: { __MMW_VERSION__: JSON.stringify(version()) },
  // Parallel lanes each run their own dev server; MMW_VITE_CACHE keeps their dependency caches apart.
  cacheDir: process.env.MMW_VITE_CACHE ?? 'node_modules/.vite',
  plugins: [v3Assets()],
  // Two pages: the game, and Emma's picture check of the phrase pictures (check.html, docs/v4/2.3.md section 18).
  build: {
    target: 'safari15', outDir: 'dist', assetsInlineLimit: 0,
    rolldownOptions: { input: { index: join(here, 'index.html'), check: join(here, 'check.html') } },
  },
  server: { fs: { allow: [repo] } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
