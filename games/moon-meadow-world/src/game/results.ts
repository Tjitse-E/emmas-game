// The results log: one line per checked moment (first try, miss or helped), for Tjitse in the console and for the
// flows through the test hook. Each line also goes to the server log as a request to diag.txt (that file does not
// exist; Emma's home server logs every request), so a play on her iPad leaves its results on the Mac: for wishes the
// level, basket size, word, what she tried and why it was in the basket, a print touch and a quick pick; for maths the
// band, the stones, the answer's place, the decoys and a quick pick (docs/v4/2.2.md 7.2); 2.3.0 adds an egg sum's
// grade and heart, a pattern gap's line, and one kind=play line per play (docs/v4/2.3.md section 17).
import type { MomentResult } from '../contracts';

export type Strand = 'm' | 's' | 'r';

export interface ResultLine {
  part: string;
  strand: Strand;
  outcome: MomentResult['outcome'];
  misses: number;
  ms: number;
  detail: Record<string, unknown>;
}

/** A diag.txt request stays under this many characters of query. */
export const DIAG_MAX = 400;

type Field = string | number | boolean | null | undefined;

/**
 * A query string of at most `max` characters. Fields are added in order; a field that does not fit is cut short
 * (long lists) or left out, so the first fields always arrive.
 */
export function diagQuery(fields: Record<string, Field>, max = DIAG_MAX): string {
  let out = '';
  for (const [k, raw] of Object.entries(fields)) {
    if (raw === undefined || raw === null || raw === '') continue;
    const v = typeof raw === 'boolean' ? (raw ? '1' : '0') : String(raw);
    const pair = (val: string) => `${out ? '&' : ''}${encodeURIComponent(k)}=${encodeURIComponent(val)}`;
    let p = pair(v);
    if (out.length + p.length > max) {
      // Cut a long value at a comma, so a list loses its last entries rather than half a word.
      let cut = v;
      while (cut.includes(',') && out.length + pair(cut).length > max) cut = cut.slice(0, cut.lastIndexOf(','));
      p = pair(cut);
      if (out.length + p.length > max) continue;
    }
    out += p;
  }
  return out;
}

const list = (v: unknown): string => (Array.isArray(v) ? v.join(',') : '');

/** "sail:twin,shell:onset": what she tried, with why it was there. */
function triedWith(tried: unknown, why: unknown): string {
  if (!Array.isArray(tried)) return '';
  const kinds = (why && typeof why === 'object' ? why : {}) as Record<string, string>;
  return tried.map((t) => (kinds[String(t)] ? `${t}:${kinds[String(t)]}` : String(t))).join(',');
}

/** The diag fields of a result line. */
export function resultFields(line: ResultLine): Record<string, Field> {
  const d = line.detail;
  const base: Record<string, Field> = { kind: 'result', part: line.part, s: line.strand, o: line.outcome, ms: Math.round(line.ms), mi: line.misses };
  if (line.strand === 'r') {
    return {
      ...base, lv: d.level as Field, n: d.size as Field, w: d.word as Field, pt: d.printTouched as Field, q: d.quick as Field,
      tried: triedWith(d.tried, d.decoys),
    };
  }
  if (line.strand === 'm' && Array.isArray(d.stones)) {
    const decoys = (d.decoys ?? {}) as Record<string, string>;
    return {
      ...base, band: d.band as Field, k: d.kind as Field, gr: d.grade as Field, rd: d.round as Field, need: d.need as Field,
      have: d.have as Field, a: d.answer as Field, st: list(d.stones), pl: d.place as Field, q: d.quick as Field,
      tried: triedWith(d.tried, decoys), dc: Object.entries(decoys).map(([s, why]) => `${s}:${why}`).join(','),
    };
  }
  // A bead tree gap (patterns lane): the pattern kind and level, which gap, the tray, what she tried and why.
  if (line.strand === 'm' && d.kind === 'pattern') {
    return {
      ...base, k: 'pattern', pk: d.pattern as Field, lv: d.level as Field, gap: d.gap as Field, tray: list(d.tray), q: d.quick as Field,
      tried: triedWith(d.tried, d.decoys),
    };
  }
  return { ...base, door: d.door as Field, name: d.name as Field, tried: list(d.tried) };
}

/** Send a line to the server log. It never throws and never waits. */
export function sendDiag(query: string): void {
  try {
    if (typeof fetch !== 'function' || typeof location === 'undefined') return;
    void fetch(`diag.txt?${query}`, { cache: 'no-store', keepalive: true }).catch(() => undefined);
  } catch {
    /* reporting must never break the game */
  }
}

export class Results {
  readonly lines: ResultLine[] = [];

  add(part: string, strand: Strand, r: MomentResult, detail: Record<string, unknown> = {}): void {
    const line: ResultLine = { part, strand, outcome: r.outcome, misses: r.misses, ms: r.ms, detail };
    this.lines.push(line);
    console.info('[mmw result]', JSON.stringify(line));
    sendDiag(diagQuery(resultFields(line)));
  }

  clear(): void {
    this.lines.length = 0;
  }
}
