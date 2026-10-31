// The signpost moment (2.4.0, docs/v4/2.4.md section 5.5; src/ui/sign.ts) on a fake page with a fake audio that keeps
// time: the cards wake when the goal ends, only a card tap answers (on pointerdown, so a palm resting on the screen
// never answers and never blocks a card), a wrong card steps the mount onto its road and lights the letters that
// differ, and the ladder runs at 20, 40 and 60 s. The cards' layout is in tests/ui.test.ts ('sign cards').
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MomentResult, SignItem, SignSpec } from '../src/contracts';

const fake = vi.hoisted(() => {
  // src/assets.ts reads the page's path when it loads.
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/dist/index.html' };
  const s = { log: [] as { t: number; what: string }[], sayMs: 2000, soundMs: 400, talking: 0, speech: [] as (() => void)[] };
  const now = () => Math.round(performance.now());
  const note = (what: string) => s.log.push({ t: now(), what });
  const cut = () => s.speech.splice(0).forEach((end) => end());
  const audio = {
    get speaking() {
      return s.talking > 0;
    },
    sayAll: (ids: string[]) => {
      cut();
      note(`say ${ids.join(' ')}`);
      if (!ids.length) return Promise.resolve();
      s.talking++;
      return new Promise<void>((r) => {
        let open = true;
        const end = () => {
          if (!open) return;
          open = false;
          s.talking--;
          r();
        };
        s.speech.push(end);
        setTimeout(end, s.sayMs);
      });
    },
    say: async (id: string) => void note(`say ${id}`),
    sound: (g: string) => {
      note(`sound ${g}`);
      return new Promise<void>((r) => setTimeout(r, s.soundMs));
    },
    sfx: async (name: string) => void note(`sfx ${name}`),
    stop: () => {
      note('stop');
      cut();
    },
  };
  return { s, audio };
});
vi.mock('../src/audio', () => ({ audio: fake.audio }));

const { runSign, hintSounds, IDLE_MS } = await import('../src/ui/sign');
const { setUnit } = await import('../src/ui/dom');
const { diffUnits } = await import('../src/ui/contrast');
const { printUnits } = await import('../src/ui/geometry');
const { DATA } = await import('../src/content/data');

// ------------------------------------------------------------------------------------------------ the fake page

type Fn = (e: PointerEvent) => void;
class FakeTarget {
  private readonly listeners: { type: string; fn: Fn; capture: boolean }[] = [];
  addEventListener(type: string, fn: Fn, capture: boolean | { capture?: boolean } = false): void {
    this.listeners.push({ type, fn, capture: typeof capture === 'boolean' ? capture : !!capture.capture });
  }
  removeEventListener(type: string, fn: Fn, capture: boolean | { capture?: boolean } = false): void {
    const c = typeof capture === 'boolean' ? capture : !!capture.capture;
    const i = this.listeners.findIndex((l) => l.type === type && l.fn === fn && l.capture === c);
    if (i >= 0) this.listeners.splice(i, 1);
  }
  fire(type: string, id = 1, x = 0, y = 0): void {
    const e = { type, pointerId: id, clientX: x, clientY: y, preventDefault() {}, stopPropagation() {} } as unknown as PointerEvent;
    for (const l of this.listeners.filter((l) => l.type === type)) l.fn(e);
  }
}
class FakeNode extends FakeTarget {
  parent: FakeNode | null = null;
  readonly children: FakeNode[] = [];
  readonly style: Record<string, string> & { setProperty(k: string, v: string): void } = Object.assign(Object.create(null), {
    setProperty(this: Record<string, string>, k: string, v: string) {
      this[k] = v;
    },
  });
  readonly dataset: Record<string, string> = {};
  textContent = '';
  innerHTML = '';
  src = '';
  alt = '';
  draggable = true;
  decoding = '';
  offsetWidth = 0;
  private cls = new Set<string>();
  private readonly attrs = new Map<string, string>();
  readonly classList = {
    add: (...c: string[]) => c.forEach((x) => this.cls.add(x)),
    remove: (...c: string[]) => c.forEach((x) => this.cls.delete(x)),
    contains: (c: string) => this.cls.has(c),
    toggle: (c: string, on?: boolean) => {
      const v = on ?? !this.cls.has(c);
      if (v) this.cls.add(c);
      else this.cls.delete(c);
      return v;
    },
  };
  get className(): string {
    return [...this.cls].join(' ');
  }
  set className(v: string) {
    this.cls = new Set(v.split(/\s+/).filter(Boolean));
  }
  setAttribute(k: string, v: string): void {
    this.attrs.set(k, v);
  }
  getAttribute(k: string): string | null {
    return this.attrs.get(k) ?? null;
  }
  appendChild(c: FakeNode): FakeNode {
    c.remove();
    c.parent = this;
    this.children.push(c);
    return c;
  }
  remove(): void {
    const p = this.parent;
    if (p) p.children.splice(p.children.indexOf(this), 1);
    this.parent = null;
  }
  querySelector(sel: string): FakeNode | null {
    return this.all().find((n) => n.classList.contains(sel.slice(1))) ?? null;
  }
  getBoundingClientRect() {
    let x = 0;
    let y = 0;
    for (let n: FakeNode | null = this; n; n = n.parent) {
      x += parseFloat(n.style.left ?? '') || 0;
      y += parseFloat(n.style.top ?? '') || 0;
    }
    const w = parseFloat(this.style.width ?? '') || 0;
    const h = parseFloat(this.style.height ?? '') || 0;
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y };
  }
  animate(_frames: Keyframe[], o: KeyframeAnimationOptions) {
    let done!: () => void;
    const a = { onfinish: null as null | (() => void), cancel() {}, finished: new Promise<void>((r) => (done = r)) };
    setTimeout(() => {
      a.onfinish?.();
      done();
    }, Number(o.duration ?? 0) + (o.delay ?? 0));
    return a;
  }
  getAnimations(): { cancel(): void }[] {
    return [];
  }
  captured = new Set<number>();
  setPointerCapture(id: number): void {
    this.captured.add(id);
  }
  releasePointerCapture(id: number): void {
    this.captured.delete(id);
  }
  all(): FakeNode[] {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
  byLabel(label: string): FakeNode {
    const n = this.all().find((c) => c.getAttribute('aria-label') === label);
    if (!n) throw new Error(`no ${label}`);
    return n;
  }
}

let win: FakeTarget;
let page: FakeNode;
const run = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const said = (what: string) => fake.s.log.filter((l) => l.what === what).map((l) => l.t);
const saidAny = (prefix: string) => fake.s.log.filter((l) => l.what.startsWith(prefix));

const item = (w: string): SignItem => DATA.signWords.find((x) => x.word === w)!;
const spec = (words: [string, string, string], target: string, n: 1 | 2 = 1): SignSpec => ({
  sign: n,
  level: 1,
  cards: words.map(item) as [SignItem, SignItem, SignItem],
  target: item(target),
  clips: { intro: n === 1 ? ['g4-signs'] : [], goal: [`g4-go-bella-${target}`], right: [`word-${target}`, 'fb-yes'], hint: ['h-sounds'], again: ['fb-letters'] },
});

/** `roadMs`: how long the mount's steps take (the mount lane's wrong road is about 3.5 s: out, the shake, back). */
function open(s: SignSpec, roadMs = 1500) {
  const roads: [number, boolean][] = [];
  const logs: [string, Record<string, unknown> | undefined][] = [];
  const ghost = { taps: 0, tap: async (at: () => { x: number; y: number }) => { ghost.taps++; ghost.at = at(); }, drag: async () => {}, glide: async () => {}, hide() {}, at: null as null | { x: number; y: number } };
  const moments = page.appendChild(new FakeNode());
  const ctx = { moments, drag: page.appendChild(new FakeNode()), ghost, seen: new Set<string>(), screen: () => ({ w: 1080, h: 810 }), clear: () => null };
  const anchors = [{ x: 370, y: 365, visible: true }, { x: 540, y: 250, visible: true }, { x: 710, y: 365, visible: true }];
  let handle: { snapshot(): { phase: string; cards?: string[]; answer: string | null; level: number; targets: { name: string }[] }; replay(): void } | null = null;
  let result: MomentResult | null = null;
  const done = runSign(ctx as never, s, {
    anchor: () => anchors[1],
    react() {},
    log: (e, d) => void logs.push([e, d]),
    cardAt: (i) => anchors[i],
    road: async (i, right) => {
      roads.push([i, right]);
      await new Promise((r) => setTimeout(r, roadMs));
    },
  }, (m) => {
    handle = m as never;
  }).then((r) => (result = r));
  /** A finger on card `word`: the window hears the pointerdown first (capture phase), then the card. */
  const tap = (word: string, id = 2) => {
    const c = page.byLabel(`sign ${word}`);
    const b = c.getBoundingClientRect();
    win.fire('pointerdown', id, b.left + 5, b.top + 5);
    c.fire('pointerdown', id, b.left + 5, b.top + 5);
  };
  return { roads, logs, ghost, tap, done, snap: () => handle!.snapshot(), replay: () => handle!.replay(), result: () => result, card: (w: string) => page.byLabel(`sign ${w}`) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  win = new FakeTarget();
  vi.stubGlobal('window', win);
  vi.stubGlobal('addEventListener', win.addEventListener.bind(win));
  vi.stubGlobal('removeEventListener', win.removeEventListener.bind(win));
  vi.stubGlobal('document', { createElement: () => new FakeNode() });
  vi.stubGlobal('requestAnimationFrame', (fn: (t: number) => void) => setTimeout(() => fn(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  setUnit(1080 / 1180);
  page = new FakeNode();
  Object.assign(fake.s, { log: [], sayMs: 2000, soundMs: 400, talking: 0, speech: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the sign words\' sounds and letters', () => {
  it('marks the letters of a wrong card that differ from the target', () => {
    expect(diffUnits(printUnits('pool', ['p', 'oo', 'l']), printUnits('pond', ['p', 'o', 'n', 'd'])).a).toEqual([1, 2]);
  });

  it('ends pines\' letter sounds in /z/', () => {
    expect(hintSounds(DATA.signWords.find((w) => w.word === 'pines')!)).toEqual(['p', 'i-e', 'n', 'z']);
    expect(hintSounds(DATA.signWords.find((w) => w.word === 'pond')!)).toEqual(['p', 'o', 'n', 'd']);
  });
});

describe('the signpost moment', () => {
  it('says the intro and the goal, then wakes the cards; a tap before that does nothing', async () => {
    const m = open(spec(['sand', 'barn', 'pond'], 'pond'));
    await run(100);
    expect(saidAny('say')[0].what).toBe('say g4-signs g4-go-bella-pond');
    expect(m.snap().phase).toBe('busy');
    m.tap('pond');
    await run(100);
    expect(m.roads).toEqual([]);
    await run(2000);
    expect(m.snap().phase).toBe('open');
    expect(m.snap().cards).toEqual(['sand', 'barn', 'pond']);
    expect(m.snap().answer).toBe('sign pond');
    expect(m.snap().targets.map((t) => t.name)).toEqual(['sign sand', 'sign barn', 'sign pond']);
  });

  it('a held palm never answers and never blocks a card', async () => {   // Review Focus 2
    const m = open(spec(['sand', 'barn', 'pond'], 'pond'));
    await run(2200);
    // The palm: pointer 1 goes down on the canvas (the window hears it) and is never released.
    win.fire('pointerdown', 1, 1060, 700);
    await run(500);
    expect(m.roads).toEqual([]);
    m.tap('pond', 2);
    m.tap('pond', 3);
    win.fire('pointerup', 1);
    expect(m.roads).toEqual([]);   // the word and "Yes!" first, then the mount
    await run(10_000);
    expect(m.roads).toEqual([[2, true]]);
    expect(said('say word-pond fb-yes')).toHaveLength(1);
    expect(m.result()).toMatchObject({ outcome: 'first', misses: 0 });
  });

  it('a wrong card steps the mount onto its road while Elizabeth says its word, lights what differs, then "Look at the letters again."', async () => {
    const m = open(spec(['sand', 'pool', 'barn'], 'sand'));
    await run(2200);
    m.tap('pool');
    expect(m.roads).toEqual([[1, false]]);
    expect(m.logs).toContainEqual(['tried', { what: 'pool' }]);
    await run(100);
    expect(saidAny('say').at(-1)!.what).toBe('say word-pool');
    await run(2500);
    // pool against sand: every letter differs.
    const lit = m.card('pool').all().filter((n) => n.classList.contains('diff')).map((n) => n.textContent);
    expect(lit).toEqual(['p', 'oo', 'l']);
    await run(3000);
    expect(said('say fb-letters')).toHaveLength(1);
    // No letter sound of the target until the next idle.
    expect(saidAny('sound')).toEqual([]);
    expect(m.snap().phase).toBe('open');
    m.tap('sand');
    await run(8000);
    expect(m.result()).toMatchObject({ outcome: 'miss', misses: 1 });
  });

  it('says "Look at the letters again." while the mount steps back, and keeps the letters lit until the cards wake', async () => {
    const m = open(spec(['sand', 'pool', 'barn'], 'sand'), 3500);
    await run(2200);
    const tapped = Math.round(performance.now());
    m.tap('pool');
    // The word (2 s), 350 ms, then the line: before the mount is back at 3.5 s.
    await run(2400);
    expect(said('say fb-letters')).toHaveLength(1);
    expect(said('say fb-letters')[0] - tapped).toBeLessThan(3500);
    await run(1500);
    // The line has ended (4.35 s) and the mount is back (3.5 s): the cards wake with the letters still lit.
    const lit = () => m.card('pool').all().filter((n) => n.classList.contains('diff')).length;
    expect(m.snap().phase).toBe('busy');
    expect(lit()).toBe(3);
    await run(600);
    expect(m.snap().phase).toBe('open');
    expect(lit()).toBe(0);
  });

  it('ignores a Lumi tap before the cards wake, while a card plays out and once answered', async () => {
    const m = open(spec(['sand', 'pool', 'barn'], 'sand', 2));
    await run(500);
    m.replay();
    await run(1700);
    expect(said('say g4-go-bella-sand')).toHaveLength(1);
    m.tap('pool');
    await run(500);
    m.replay();
    expect(fake.s.log.some((l) => l.what === 'stop')).toBe(false);
    await run(5000);
    expect(m.snap().phase).toBe('open');
    m.tap('sand');
    await run(500);
    m.replay();
    await run(8000);
    expect(said('say g4-go-bella-sand')).toHaveLength(1);
    expect(said('say word-sand fb-yes')).toHaveLength(1);
    expect(fake.s.log.some((l) => l.what === 'stop')).toBe(false);
    expect(m.result()).toMatchObject({ outcome: 'miss', misses: 1 });
  });

  it('lights only the letters that differ: pool against pond', async () => {
    const m = open({ ...spec(['pond', 'pool', 'barn'], 'pond', 2), level: 2 });
    await run(2200);
    m.tap('pool');
    await run(2600);
    expect(m.card('pool').all().filter((n) => n.classList.contains('diff')).map((n) => n.textContent)).toEqual(['oo', 'l']);
    expect(m.card('pond').all().some((n) => n.classList.contains('diff'))).toBe(false);
    expect(m.card('barn').all().some((n) => n.classList.contains('diff'))).toBe(false);
  });

  it('runs the ladder: the goal at 20 s, "Listen to the sounds." and the letter sounds at 40 s, the ghost taps the right card at 60 s', async () => {
    const m = open(spec(['ship', 'bench', 'pines'], 'pines'));
    await run(2000);   // the goal ends
    const woke = Math.round(performance.now());
    await run(IDLE_MS + 100);
    expect(said('say g4-go-bella-pines').at(-1)! - woke).toBeGreaterThanOrEqual(IDLE_MS);
    await run(2000 + IDLE_MS);
    expect(said('say h-sounds')).toHaveLength(1);
    await run(2000 + 4 * 1000);
    expect(saidAny('sound').map((l) => l.what)).toEqual(['sound p', 'sound i-e', 'sound n', 'sound z']);
    expect(m.ghost.taps).toBe(0);
    await run(IDLE_MS + 1000);
    expect(m.ghost.taps).toBe(1);
    await run(8000);
    expect(m.roads).toEqual([[2, true]]);
    expect(m.result()).toMatchObject({ outcome: 'helped' });
  });

  it('brings the ghost after two misses, and the right card then answers helped', async () => {
    const m = open(spec(['stump', 'barn', 'pool'], 'barn'));
    await run(2200);
    m.tap('stump');
    await run(6000);
    m.tap('pool');
    await run(12_000);
    expect(m.ghost.taps).toBe(1);
    expect(m.roads).toEqual([[0, false], [2, false], [1, true]]);
    expect(m.result()).toMatchObject({ outcome: 'helped', misses: 2 });
  });

  it('says the goal again on a Lumi tap, and stops a running hint for a card tap that still answers', async () => {
    const m = open(spec(['swing', 'beach', 'pond'], 'beach', 2));
    await run(2200);
    m.replay();
    await run(100);
    expect(said('say g4-go-bella-beach')).toHaveLength(2);
    await run(2000 + 2 * IDLE_MS + 100);
    expect(said('say h-sounds')).toHaveLength(1);
    const before = fake.s.log.length;
    m.tap('beach');
    const after = fake.s.log.slice(before).map((l) => l.what);
    expect(after.indexOf('stop')).toBeGreaterThanOrEqual(0);
    await run(8000);
    expect(said('say word-beach fb-yes')).toHaveLength(1);
    expect(saidAny('sound')).toEqual([]);
    expect(m.result()).toMatchObject({ outcome: 'helped', misses: 0 });
  });
});
