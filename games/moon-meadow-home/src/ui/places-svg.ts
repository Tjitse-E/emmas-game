// Code-drawn shapes for the places (Task A4): the fallback for every place picture that has no art yet, and
// the drawn-by-code objects (Salon bows, clips and stars in a colour and a size, decision D16). Each shape is a
// self-contained SVG string in a 0 to 100 viewBox: a pastel base, a lighter top-left highlight, a warm darker
// outline, round joins. No filters, no scripts, no text except the `label` on jars, jewels, arches and flags.

export const SVG_NAMES = [
  'jar', 'jar-label', 'shelf', 'bubble', 'jewel-letter', 'jewel-number', 'stone', 'plot-sign', 'hammer', 'arch', 'flag',
  'sash', 'envelope', 'note-card', 'mist', 'ribbon', 'bow', 'clip', 'star', 'crown', 'cape', 'garland', 'pin-pot', 'parcel',
  'plank', 'wheelbarrow', 'scissors', 'map-scroll', 'moon', 'gate', 'parent', 'decor', 'pin', 'gift', 'basket', 'bag', 'place',
] as const;
export type SvgName = (typeof SVG_NAMES)[number];
export type SvgOpts = { colour?: string; size?: 'tiny' | 'big'; label?: string };

const DEFAULT: Record<SvgName, string> = {
  jar: '#e8f4ff', 'jar-label': '#fff8e8', shelf: '#f3c99a', bubble: '#ffffff', 'jewel-letter': '#f7b6d2', 'jewel-number': '#b6dcf7',
  stone: '#fff1c9', 'plot-sign': '#f6d7a8', hammer: '#f3c99a', arch: '#ffd6e8', flag: '#ffe08a', sash: '#c9b6f7', envelope: '#fff8e8',
  'note-card': '#fffdf4', mist: '#eef0ff', ribbon: '#ff9cc8', bow: '#ff9cc8', clip: '#b6f0c8', star: '#ffe08a', crown: '#ffd75e',
  cape: '#c9b6f7', garland: '#b6f0c8', 'pin-pot': '#f7c6a8', parcel: '#f6d7a8', plank: '#f3c99a', wheelbarrow: '#b6dcf7',
  scissors: '#d6dcef', 'map-scroll': '#fff1c9', moon: '#fff2a8', gate: '#f3c99a', parent: '#e6e0f5', decor: '#ffd6e8',
  pin: '#ffe08a', gift: '#ffb6c8', basket: '#f3c99a', bag: '#c9e6b6', place: '#ffe0c2',
};
/** Outlines of the light glass and paper shapes, from the style notes. */
const OUTLINE: Partial<Record<SvgName, string>> = { jar: '#9cc3e6', 'jar-label': '#d9b98a', bubble: '#c9d8ff', mist: '#c9cbe6' };

const PASTELS = ['#ffd6e8', '#c9b6f7', '#b6dcf7', '#b6f0c8', '#fff1a8', '#ffcfa8', '#f7b6d2', '#d6f0ff'];

/** A pastel from a hash of an id, so a missing decoration, pin, gift or place keeps its own colour. */
export function colourFor(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return PASTELS[(h >>> 0) % PASTELS.length];
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
/** Mixes a #rrggbb colour towards black (f < 0) or white (f > 0). */
export function shade(hex: string, f: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => clamp(f < 0 ? c * (1 + f) : c + (255 - c) * f));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

type Paint = { base: string; line: string; light: string };
const text = (label: string | undefined, y: number, size: number, fill = '#5a3d2b') =>
  label ? `<text x="50" y="${y}" text-anchor="middle" font-family="Andika, sans-serif" font-weight="700" font-size="${size}" fill="${fill}" stroke="none">${escapeText(label)}</text>` : '';

/** The body of each shape, drawn with the paint and an optional label. */
const BODY: Record<SvgName, (p: Paint, label?: string) => string> = {
  jar: (p) => `<path d="M30 18h40v8c8 4 12 12 12 22v32c0 8-6 12-14 12H32c-8 0-14-4-14-12V48c0-10 4-18 12-22z" fill="${p.base}"/><rect x="28" y="10" width="44" height="10" rx="4" fill="${p.light}"/><path d="M28 40c2-6 6-8 10-9" fill="none" stroke="#fff" stroke-width="5"/>`,
  'jar-label': (p, l) => `<rect x="8" y="28" width="84" height="44" rx="10" fill="${p.base}"/><rect x="14" y="33" width="30" height="8" rx="4" fill="${p.light}"/>${text(l, 59, 22)}`,
  shelf: (p) => `<rect x="6" y="30" width="88" height="14" rx="5" fill="${p.base}"/><rect x="6" y="70" width="88" height="14" rx="5" fill="${p.base}"/><rect x="10" y="30" width="8" height="58" rx="3" fill="${p.light}"/><rect x="82" y="30" width="8" height="58" rx="3" fill="${p.light}"/>`,
  bubble: (p) => `<circle cx="50" cy="50" r="42" fill="${p.base}" fill-opacity="0.85"/><path d="M26 36a28 28 0 0 1 18-14" fill="none" stroke="${p.light}" stroke-width="6"/>`,
  'jewel-letter': (p, l) => `<path d="M30 14h40l18 22-38 52L12 36z" fill="${p.base}"/><path d="M30 14h40l-8 22H38z" fill="${p.light}"/>${text(l, 64, 26)}`,
  'jewel-number': (p, l) => `<path d="M30 14h40l18 22-38 52L12 36z" fill="${p.base}"/><path d="M30 14h40l-8 22H38z" fill="${p.light}"/>${text(l, 64, 26)}`,
  stone: (p) => `<path d="M14 66c-4-18 10-36 30-38 22-2 40 10 42 28 2 14-10 24-34 24-22 0-34-4-38-14z" fill="${p.base}"/><ellipse cx="38" cy="44" rx="12" ry="6" fill="${p.light}"/>`,
  'plot-sign': (p) => `<rect x="46" y="44" width="8" height="48" rx="3" fill="${shade(p.base, -0.15)}"/><rect x="14" y="14" width="72" height="38" rx="8" fill="${p.base}"/><rect x="20" y="20" width="24" height="7" rx="3" fill="${p.light}"/>`,
  hammer: (p) => `<rect x="44" y="34" width="12" height="58" rx="5" fill="${p.base}"/><rect x="18" y="12" width="64" height="26" rx="8" fill="#d6dcef"/><rect x="22" y="16" width="20" height="7" rx="3" fill="#fff"/>`,
  arch: (p, l) => `<path d="M12 92V48a38 38 0 0 1 76 0v44H70V50a20 20 0 0 0-40 0v42z" fill="${p.base}"/><path d="M16 46a34 34 0 0 1 20-28" fill="none" stroke="${p.light}" stroke-width="5"/>${text(l, 40, 22)}`,
  flag: (p, l) => `<rect x="14" y="8" width="6" height="86" rx="3" fill="#d9b98a"/><path d="M20 12h66l-14 22 14 22H20z" fill="${p.base}"/><rect x="24" y="16" width="22" height="6" rx="3" fill="${p.light}"/>${text(l, 42, 22)}`,
  sash: (p) => `<path d="M18 8l22 0 44 80-22 0z" fill="${p.base}"/><path d="M24 12h10l8 14H32z" fill="${p.light}"/>`,
  envelope: (p) => `<rect x="8" y="22" width="84" height="58" rx="8" fill="${p.base}"/><path d="M10 26l40 30 40-30" fill="none" stroke="${p.line}" stroke-width="3"/><circle cx="50" cy="56" r="7" fill="#ff9cc8"/>`,
  'note-card': (p) => `<rect x="12" y="10" width="76" height="80" rx="8" fill="${p.base}"/><path d="M22 34h56M22 50h56M22 66h36" stroke="${shade(p.base, -0.2)}" stroke-width="4"/>`,
  mist: (p) => `<path d="M10 64c0-12 10-20 22-18 4-12 18-18 30-12 10-4 26 2 28 16 8 2 10 16 0 20H18c-6 0-8-2-8-6z" fill="${p.base}" fill-opacity="0.9"/>`,
  ribbon: (p) => `<path d="M50 40L20 18v44zM50 40l30-22v44z" fill="${p.base}"/><path d="M42 46l-10 46 10-8 8 8zM58 46l10 46-10-8-8 8z" fill="${p.base}"/><circle cx="50" cy="40" r="9" fill="${p.light}"/>`,
  bow: (p) => `<path d="M50 50L14 26v48zM50 50l36-24v48z" fill="${p.base}"/><path d="M18 32l12 8" stroke="${p.light}" stroke-width="5"/><circle cx="50" cy="50" r="10" fill="${p.light}"/>`,
  clip: (p) => `<rect x="12" y="38" width="76" height="24" rx="12" fill="${p.base}"/><rect x="18" y="42" width="30" height="7" rx="3" fill="${p.light}"/><circle cx="76" cy="50" r="5" fill="${shade(p.base, -0.2)}"/>`,
  star: (p) => `<path d="M50 8l11 26 28 2-21 18 7 28-25-15-25 15 7-28-21-18 28-2z" fill="${p.base}"/><path d="M50 18l6 16" stroke="${p.light}" stroke-width="5"/>`,
  crown: (p) => `<path d="M10 78V30l20 20 20-30 20 30 20-20v48z" fill="${p.base}"/><rect x="10" y="70" width="80" height="12" rx="4" fill="${shade(p.base, -0.1)}"/><circle cx="50" cy="56" r="6" fill="#ff9cc8"/>`,
  cape: (p) => `<path d="M30 12h40l20 78H10z" fill="${p.base}"/><path d="M34 16h12l-6 30z" fill="${p.light}"/><circle cx="50" cy="14" r="6" fill="#ffd75e"/>`,
  garland: (p) => `<path d="M8 30c20 30 64 30 84 0" fill="none" stroke="#7fbf7f" stroke-width="5"/>${[20, 35, 50, 65, 80].map((x, i) => `<circle cx="${x}" cy="${[42, 52, 55, 52, 42][i]}" r="8" fill="${p.base}"/>`).join('')}`,
  'pin-pot': (p) => `<path d="M20 40h60l-6 46H26z" fill="${p.base}"/><rect x="16" y="32" width="68" height="12" rx="5" fill="${p.light}"/><path d="M40 30l-4-16M50 30V12M60 30l4-16" stroke="#ffd75e" stroke-width="5"/>`,
  parcel: (p) => `<rect x="12" y="26" width="76" height="62" rx="6" fill="${p.base}"/><path d="M50 26v62M12 50h76" stroke="#ff9cc8" stroke-width="6"/><rect x="16" y="30" width="22" height="7" rx="3" fill="${p.light}"/>`,
  plank: (p) => `<rect x="6" y="38" width="88" height="24" rx="5" fill="${p.base}"/><path d="M14 46h30M54 54h30" stroke="${shade(p.base, -0.2)}" stroke-width="3"/>`,
  wheelbarrow: (p) => `<path d="M14 36h56l-8 30H24z" fill="${p.base}"/><circle cx="34" cy="78" r="10" fill="#d6dcef"/><path d="M70 40l20 -8M24 66l-6 18" stroke="${p.line}" stroke-width="5"/>`,
  scissors: (p) => `<circle cx="28" cy="70" r="12" fill="none" stroke="#ff9cc8" stroke-width="7"/><circle cx="72" cy="70" r="12" fill="none" stroke="#ff9cc8" stroke-width="7"/><path d="M36 60L66 12M64 60L34 12" stroke="${p.base}" stroke-width="9"/>`,
  'map-scroll': (p) => `<rect x="14" y="18" width="72" height="64" rx="6" fill="${p.base}"/><rect x="8" y="12" width="12" height="76" rx="6" fill="${shade(p.base, -0.1)}"/><rect x="80" y="12" width="12" height="76" rx="6" fill="${shade(p.base, -0.1)}"/><path d="M30 64c10-20 30-6 40-26" fill="none" stroke="#ff9cc8" stroke-width="4" stroke-dasharray="6 5"/>`,
  moon: (p) => `<path d="M62 10a40 40 0 1 0 28 62A32 32 0 1 1 62 10z" fill="${p.base}"/><circle cx="34" cy="40" r="5" fill="${p.light}"/>`,
  gate: (p) => `<rect x="10" y="20" width="10" height="72" rx="4" fill="${p.base}"/><rect x="80" y="20" width="10" height="72" rx="4" fill="${p.base}"/><path d="M20 34h60M20 60h60M34 30v58M50 30v58M66 30v58" stroke="${p.base}" stroke-width="7"/><circle cx="15" cy="18" r="6" fill="${p.light}"/><circle cx="85" cy="18" r="6" fill="${p.light}"/>`,
  parent: (p) => `<circle cx="50" cy="50" r="40" fill="${p.base}"/><circle cx="50" cy="38" r="12" fill="${p.light}"/><path d="M28 74c4-14 40-14 44 0" fill="${p.light}"/>`,
  decor: (p) => `<path d="M50 92V54" stroke="#7fbf7f" stroke-width="6"/><circle cx="50" cy="38" r="22" fill="${p.base}"/><circle cx="42" cy="30" r="7" fill="${p.light}"/><path d="M30 92h40" stroke="${p.line}" stroke-width="6"/>`,
  pin: (p) => `<circle cx="50" cy="50" r="34" fill="${p.base}"/><path d="M50 26l7 15 16 1-12 10 4 16-15-9-15 9 4-16-12-10 16-1z" fill="${p.light}"/>`,
  gift: (p) => `<rect x="14" y="40" width="72" height="50" rx="6" fill="${p.base}"/><rect x="10" y="28" width="80" height="16" rx="5" fill="${shade(p.base, 0.3)}"/><path d="M50 28v62" stroke="#ffd75e" stroke-width="8"/><path d="M50 28c-8-14-24-14-20 0M50 28c8-14 24-14 20 0" fill="none" stroke="#ffd75e" stroke-width="5"/>`,
  basket: (p) => `<path d="M12 44h76l-8 44H20z" fill="${p.base}"/><path d="M26 44c0-26 48-26 48 0" fill="none" stroke="${p.line}" stroke-width="6"/><path d="M18 58h64M22 72h56" stroke="${shade(p.base, -0.15)}" stroke-width="4"/>`,
  bag: (p) => `<path d="M18 36h64l6 54H12z" fill="${p.base}"/><path d="M34 36c0-20 32-20 32 0" fill="none" stroke="${p.line}" stroke-width="6"/><rect x="22" y="42" width="20" height="7" rx="3" fill="${p.light}"/>`,
  place: (p) => `<path d="M50 10L90 46H78v44H22V46H10z" fill="${p.base}"/><rect x="42" y="62" width="16" height="28" rx="4" fill="${shade(p.base, -0.2)}"/><rect x="26" y="52" width="12" height="12" rx="2" fill="#fff8e8"/><rect x="62" y="52" width="12" height="12" rx="2" fill="#fff8e8"/>`,
};

/** The SVG of one shape. `colour` replaces the base colour; `size` 'tiny' draws it at 0.6 around the centre. */
export function svg(name: SvgName, opts: SvgOpts = {}): string {
  const base = opts.colour && /^#[0-9a-f]{6}$/i.test(opts.colour) ? opts.colour : DEFAULT[name];
  const line = opts.colour ? shade(base, -0.35) : OUTLINE[name] ?? shade(base, -0.35);
  const paint: Paint = { base, line, light: shade(base, 0.55) };
  const scale = opts.size === 'tiny' ? ' transform="translate(20 20) scale(0.6)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">`
    + `<g stroke="${line}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"${scale}>${BODY[name](paint, opts.label)}</g></svg>`;
}

/** The fallback shape of a missing picture id, by its kind prefix (decor-, pin-, gift-, place- and the rest). */
export function fallbackFor(id: string): string {
  const kind: SvgName = id.startsWith('decor-') || id.startsWith('reward-') ? 'decor'
    : id.startsWith('pin-') ? 'pin'
      : id.startsWith('gift-') ? 'gift'
        : id.startsWith('place-') || id.startsWith('building-') ? 'place'
          : (SVG_NAMES as readonly string[]).includes(id) ? (id as SvgName) : 'decor';
  return svg(kind, { colour: colourFor(id) });
}
