/**
 * Vite plugin for the shared audio player and letter sounds.
 * - '@emma/audio-player' resolves to <repo>/shared/audio.js, which the app imports for its side effect (window.EmmaAudio).
 * - <base>audio/phonics/ serves shared/audio/phonics/ in dev, and the build emits the same files (not takes/).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

export function phonicsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f === 'index.json' || /^snd-[a-z0-9-]+\.mp3$/.test(f)).sort();
}

export function sharedAudio(repoRoot: string): Plugin {
  const shared = resolve(repoRoot, 'shared');
  const phonics = join(shared, 'audio', 'phonics');
  return {
    name: 'emma-shared-audio',
    config(config) {
      const root = resolve(config.root ?? process.cwd());
      return {
        resolve: { alias: { '@emma/audio-player': join(shared, 'audio.js') } },
        server: { fs: { allow: [root, shared] } },
      };
    },
    configureServer(server) {
      // Vite base is './', so the dev page may sit under any path: serve any URL that ends in audio/phonics/<file>.
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const at = url.lastIndexOf('/audio/phonics/');
        if (at < 0) return next();
        const file = url.slice(at + '/audio/phonics/'.length);
        if (!phonicsFiles(phonics).includes(file)) return next();
        res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : 'audio/mpeg');
        res.end(readFileSync(join(phonics, file)));
      });
    },
    generateBundle() {
      for (const f of phonicsFiles(phonics)) {
        this.emitFile({ type: 'asset', fileName: `audio/phonics/${f}`, source: readFileSync(join(phonics, f)) });
      }
    },
  };
}
