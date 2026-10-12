import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, lanAddress, localName, requestLine, startLine } from '../../server/serve.ts';
import { CSP } from '../../server/static.ts';

let dir: string;
let base: string;
let close: () => void;
const lines: string[] = [];

function write(rel: string, body: string) {
  const f = path.join(dir, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moon-static-'));
  write('index.html', 'menu');
  write('.env', 'FAKE_KEY=secret');
  write('.git/config', 'git');
  write('.data/moon-meadow/families/emma/events.jsonl', '{}');
  write('ideas/v2/index.html', 'v2 game');
  write('shared/audio/phonics/snd-s.mp3', 'mp3');
  write('games/moon-meadow-home/src/core/events.ts', 'source');
  write('games/moon-meadow-home/dist/index.html', 'v3 game');
  write('games/moon-meadow-home/dist/assets/index-abc123.js', 'js');
  write('games/moon-meadow-home/node_modules/x/index.js', 'dep');
  write('games/moon-meadow-home/art-src/review/index.html', 'contact sheet');
  write('games/moon-meadow-home/flows/audio-check.html', 'audio check');
  write('games/moon-meadow-home/flows/.secret', 'hidden');
  write('games/moon-meadow-home/dist/flows/own.html', 'built flow page');
  const server = createServer({
    root: dir, base: '/games/moon-meadow-home/', gameDir: path.join(dir, 'games/moon-meadow-home/dist'),
    gameSrc: path.join(dir, 'games/moon-meadow-home'), csp: true, log: line => lines.push(line),
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(() => close());

const get = (p: string, init?: RequestInit) => fetch(base + p, { redirect: 'manual', ...init });

describe('static server', () => {
  it('serves the repo and the v3 build under its base path', async () => {
    expect(await (await get('/')).text()).toBe('menu');
    expect(await (await get('/ideas/v2/')).text()).toBe('v2 game');
    const v3 = await get('/games/moon-meadow-home/');
    expect(await v3.text()).toBe('v3 game');
    expect(v3.headers.get('content-security-policy')).toBe(CSP);
    expect(v3.headers.get('cache-control')).toBe('no-cache');
    const asset = await get('/games/moon-meadow-home/assets/index-abc123.js');
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(asset.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect((await get('/shared/audio/phonics/snd-s.mp3')).headers.get('content-type')).toBe('audio/mpeg');
  });

  it('never serves dotfiles, source behind the mount, node_modules or paths outside the root', async () => {
    for (const p of ['/.env', '/%2Eenv', '/.git/config', '/.data/moon-meadow/families/emma/events.jsonl',
      '/games/moon-meadow-home/src/core/events.ts', '/games/moon-meadow-home/node_modules/x/index.js',
      '/ideas/../.env', '/%2e%2e/etc/passwd', '/ideas/%00', '/games/moon-meadow-home/..%2f.env', '/bad%zz']) {
      const r = await get(p);
      expect(r.status, p).toBe(404);
      expect(await r.text()).not.toContain('secret');
    }
  });

  it('redirects folders to a trailing slash, answers 304 and refuses writes', async () => {
    expect((await get('/games/moon-meadow-home')).headers.get('location')).toBe('/games/moon-meadow-home/');
    expect((await get('/ideas/v2')).headers.get('location')).toBe('/ideas/v2/');
    const first = await get('/');
    const again = await get('/', { headers: { 'If-Modified-Since': first.headers.get('last-modified')! } });
    expect(again.status).toBe(304);
    expect((await get('/', { method: 'POST' })).status).toBe(405);
  });

  it('serves art-src and flows pages from the game folder when the build has none, and nothing else from source', async () => {
    expect(await (await get('/games/moon-meadow-home/art-src/review/')).text()).toBe('contact sheet');
    expect(await (await get('/games/moon-meadow-home/flows/audio-check.html')).text()).toBe('audio check');
    expect(await (await get('/games/moon-meadow-home/flows/own.html')).text()).toBe('built flow page');
    expect((await get('/games/moon-meadow-home/flows/.secret')).status).toBe(404);
    expect((await get('/games/moon-meadow-home/src/core/events.ts')).status).toBe(404);
    expect((await get('/games/moon-meadow-home/flows/../src/core/events.ts')).status).toBe(404);
    expect((await get('/games/moon-meadow-home/art-src/%2e%2e/src/core/events.ts')).status).toBe(404);
  });

  it('logs each request with time, method, path, status and User-Agent', async () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 15_8 like Mac OS X) Safari/604.1';
    await (await get('/ideas/v2/?x=1', { headers: { 'User-Agent': ua } })).text();
    await new Promise(r => setTimeout(r, 20));
    const line = lines.find(l => l.includes('/ideas/v2/?x=1'));
    expect(line).toMatch(/^\d{4}-\d\d-\d\dT\S+Z GET \/ideas\/v2\/\?x=1 200 /);
    expect(line).toContain(JSON.stringify(ua));
    expect(requestLine(new Date(0), 'GET', '/', 404, undefined)).toBe('1970-01-01T00:00:00.000Z GET / 404 "-"');
  });

  it('prints both addresses the iPad can use', () => {
    expect(localName('tjitse-mac')).toBe('tjitse-mac.local');
    expect(localName('tjitse-mac.local')).toBe('tjitse-mac.local');
    expect(startLine({ port: 8765, base: '/games/moon-meadow-home/', dist: '/x/dist-emma', hostname: 'mac', lan: '192.168.1.20' }))
      .toBe('Moon Meadow on http://mac.local:8765/games/moon-meadow-home/ and http://192.168.1.20:8765/games/moon-meadow-home/ serving /x/dist-emma');
    expect(lanAddress({
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true, netmask: '', mac: '', cidr: null }],
      en0: [
        { address: 'fe80::1', family: 'IPv6', internal: false, netmask: '', mac: '', cidr: null, scopeid: 0 },
        { address: '192.168.1.20', family: 'IPv4', internal: false, netmask: '', mac: '', cidr: null },
      ],
    })).toBe('192.168.1.20');
    expect(lanAddress({})).toBeNull();
  });

  it('serves the build folder named by MOON_DIST', async () => {
    vi.stubEnv('MOON_DIST', 'dist-test-core');
    vi.resetModules();
    const mod = await import('../../server/serve.ts');
    expect(mod.GAME_DIR).toBe(path.join(mod.GAME_SRC, 'dist-test-core'));
    vi.unstubAllEnvs();
  });

  it('answers 404 on the API path when no save API is mounted', async () => {
    expect((await get('/games/moon-meadow-home/api/health')).status).toBe(404);
  });
});
