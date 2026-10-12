// One Node server for the home network: the repo as static files, the v3 build under its base path,
// and (from release 1.3) the save API. Run from the repo root: node games/moon-meadow-home/server/serve.ts
// Env (contracts C11): PORT, HOST, MOON_DIST (build folder inside the game folder, default dist), MOON_BASE, MOON_CSP.
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { serveStatic } from './static.ts';

export type ApiHandler = (req: http.IncomingMessage, res: http.ServerResponse, subpath: string) => Promise<void>;
export type ServerOptions = {
  root: string;
  base: string;
  gameDir: string;
  csp: boolean;
  api?: ApiHandler;
  /** The game source folder. Paths under the base that start with art-src/ or flows/ and are missing from the build come from here. */
  gameSrc?: string;
  /** One line per request: ISO time, method, path, status, User-Agent. Leave out for no request log. */
  log?: (line: string) => void;
};

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
export const GAME_SRC = path.resolve(import.meta.dirname, '..');
export const GAME_DIR = path.resolve(GAME_SRC, process.env.MOON_DIST ?? 'dist');
export const DEFAULT_BASE = '/games/moon-meadow-home/';
/** Read-only fallbacks from the game folder, so the art contact page and flow pages load from a lane server. */
export const GAME_SRC_PATHS = ['art-src/', 'flows/'] as const;

export function requestLine(t: Date, method: string, url: string, status: number, userAgent: string | undefined): string {
  return `${t.toISOString()} ${method} ${url} ${status} ${JSON.stringify(userAgent ?? '-')}`;
}

export function createServer(o: ServerOptions): http.Server {
  const apiPrefix = o.base + 'api/';
  const mount = { prefix: o.base, dir: o.gameDir, csp: o.csp, fallback: o.gameSrc, fallbackPaths: GAME_SRC_PATHS };
  return http.createServer((req, res) => {
    if (o.log) {
      const log = o.log;
      res.on('finish', () => log(requestLine(new Date(), req.method ?? '-', req.url ?? '-', res.statusCode, req.headers['user-agent'])));
    }
    let pathname: string;
    try { pathname = new URL(req.url ?? '/', 'http://local').pathname; } catch { res.writeHead(400).end(); return; }
    if (pathname.startsWith(apiPrefix)) {
      if (!o.api) { res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"no save API on this server"}'); return; }
      o.api(req, res, pathname.slice(apiPrefix.length)).catch(err => {
        console.error('[api]', err);
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"server error"}');
      });
      return;
    }
    serveStatic(req, res, pathname, { root: o.root, mounts: [mount] });
  });
}

/** The first IPv4 address on the home network, or null. */
export function lanAddress(nets: ReturnType<typeof os.networkInterfaces> = os.networkInterfaces()): string | null {
  for (const list of Object.values(nets)) {
    for (const n of list ?? []) if (n.family === 'IPv4' && !n.internal) return n.address;
  }
  return null;
}

/** The Bonjour name of this Mac, as the iPad reaches it: '<name>.local'. */
export function localName(hostname: string = os.hostname()): string {
  return hostname.endsWith('.local') ? hostname : `${hostname}.local`;
}

/** The start line: both addresses the iPad can use (the .local name and the LAN address). */
export function startLine(o: { port: number; base: string; dist: string; hostname?: string; lan?: string | null }): string {
  const lan = o.lan === undefined ? lanAddress() : o.lan;
  const byName = `http://${localName(o.hostname)}:${o.port}${o.base}`;
  const byIp = lan ? `http://${lan}:${o.port}${o.base}` : '(no LAN address)';
  return `Moon Meadow on ${byName} and ${byIp} serving ${o.dist}`;
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8765);
  const host = process.env.HOST ?? '0.0.0.0';
  const base = process.env.MOON_BASE ?? DEFAULT_BASE;
  const server = createServer({
    root: REPO_ROOT, base, gameDir: GAME_DIR, gameSrc: GAME_SRC, csp: process.env.MOON_CSP !== 'off',
    log: line => console.log(line),
  });
  server.listen(port, host, () => {
    console.log(startLine({ port, base, dist: GAME_DIR }) + (host === '0.0.0.0' ? '' : ` (listening on ${host} only)`));
  });
}
