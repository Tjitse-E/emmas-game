// Static files for the home network: the repo (v2 demos, shared audio) and the v3 build under its base path.
// Never serves dotfiles (.env, .git, .data) or node_modules.
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * A folder served under a path prefix. `fallback` is a second folder, read only for paths that start with one of
 * `fallbackPaths` and are missing from `dir` (the art contact page and the flow pages load from the game folder).
 */
export type Mount = { prefix: string; dir: string; csp: boolean; fallback?: string; fallbackPaths?: readonly string[] };
export type StaticOptions = { root: string; mounts: Mount[] };
export type Resolved =
  | { kind: 'file'; file: string; mount: Mount | null }
  | { kind: 'redirect'; location: string }
  | { kind: 'missing' };

export const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "media-src 'self' blob:", "connect-src 'self'", "font-src 'self'", "worker-src 'self'", "manifest-src 'self'",
  "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
].join('; ');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const MISSING: Resolved = { kind: 'missing' };

function inside(base: string, target: string): boolean {
  return target === base || target.startsWith(base + path.sep);
}

function locate(base: string, rest: string): { base: string; target: string; st: fs.Stats } | null {
  const target = path.resolve(base, rest);
  if (!inside(base, target)) return null;
  try { return { base, target, st: fs.statSync(target) }; } catch { return null; }
}

export function resolvePath(pathname: string, o: StaticOptions): Resolved {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return MISSING; }
  if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.includes('\\')) return MISSING;
  if (decoded.split('/').some(s => s.startsWith('.') || s === 'node_modules')) return MISSING;
  const mount = [...o.mounts].sort((a, b) => b.prefix.length - a.prefix.length).find(m => (decoded + '/').startsWith(m.prefix)) ?? null;
  if (mount && decoded + '/' === mount.prefix) return { kind: 'redirect', location: mount.prefix };
  const rest = mount ? decoded.slice(mount.prefix.length) : decoded.slice(1);
  const primary = path.resolve(mount ? mount.dir : o.root);
  const useFallback = !!mount?.fallback && (mount.fallbackPaths ?? []).some(p => rest.startsWith(p));
  const found = locate(primary, rest) ?? (useFallback ? locate(path.resolve(mount!.fallback!), rest) : null);
  if (!found) return MISSING;
  const base = found.base;
  let target = found.target;
  let st = found.st;
  if (st.isDirectory()) {
    if (!decoded.endsWith('/')) return { kind: 'redirect', location: pathname + '/' };
    target = path.join(target, 'index.html');
    try { st = fs.statSync(target); } catch { return MISSING; }
  }
  if (!st.isFile()) return MISSING;
  try {
    if (!inside(fs.realpathSync(base), fs.realpathSync(target))) return MISSING;
  } catch { return MISSING; }
  return { kind: 'file', file: target, mount };
}

export function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string, o: StaticOptions): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const r = resolvePath(pathname, o);
  if (r.kind === 'redirect') { res.writeHead(301, { Location: r.location }).end(); return; }
  if (r.kind === 'missing') { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found'); return; }
  const st = fs.statSync(r.file);
  const ext = path.extname(r.file).toLowerCase();
  const headers: Record<string, string> = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Last-Modified': st.mtime.toUTCString(),
    'Cache-Control': r.mount && pathname.startsWith(r.mount.prefix + 'assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  if (r.mount?.csp && ext === '.html') headers['Content-Security-Policy'] = CSP;
  const since = req.headers['if-modified-since'];
  if (since && Math.floor(st.mtimeMs / 1000) <= Math.floor(Date.parse(since) / 1000)) {
    res.writeHead(304, headers).end();
    return;
  }
  headers['Content-Length'] = String(st.size);
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(r.file).pipe(res);
}
