// The naming and the wish on a fake page with a fake audio that keeps time (2.3.2, docs/v4/2.3.md section 25). The
// naming: after the star slide the name, and "Listen again" after a wrong build, wait until the star's last letter
// sound has ended (at most LETTER_WAIT_MS), so neither plays over it. The wish: "Read the wish. Then give it to your
// baby." comes 20 s after the basket can be touched (25 s for the Corner's phrase), a touch on an item starts the
// wait again, and the rest of the ladder keeps its times.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NameChoice, NamingSpec, WishSpec } from '../src/contracts';

/**
 * The audio as a log with times (performance.now(), faked). A letter sound lasts `soundMs` (Infinity: it never ends by
 * itself), and ends early when the next letter sound starts or on stop(), as in shared/audio.js. A sayAll lasts
 * `sayMs` and stops the speech before it, but not a letter sound (shared/audio.js stopSpeech).
 */
const fake = vi.hoisted(() => {
  // src/assets.ts reads the page's path when it loads.
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/dist/index.html' };
  const s = {
    log: [] as { t: number; what: string }[],
    soundMs: 1000,
    sayMs: 2500,
    talking: 0,
    letters: [] as (() => void)[],
    speech: [] as (() => void)[],
  };
  const now = () => Math.round(performance.now());
  const note = (what: string) => s.log.push({ t: now(), what });
  const cutLetters = () => s.letters.splice(0).forEach((end) => end());
  const cutSpeech = () => s.speech.splice(0).forEach((end) => end());
  const audio = {
    get speaking() {
      return s.talking > 0;
    },
    sound: (g: string) => {
      cutLetters();
      note(`sound ${g}`);
      return new Promise<void>((r) => {
        let open = true;
        const end = () => {
          if (!open) return;
          open = false;
          note(`end ${g}`);
          r();
        };
        s.letters.push(end);
        if (Number.isFinite(s.soundMs)) setTimeout(end, s.soundMs);
      });
    },
    sayAll: (ids: string[]) => {
      cutSpeech();
      note(`say ${ids.join(' ')}`);
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
    sfx: async (name: string) => void note(`sfx ${name}`),
    stop: () => {
      note('stop');
      cutLetters();
      cutSpeech();
    },
  };
  return { s, audio };
});
vi.mock('../src/audio', () => ({ audio: fake.audio }));

const { runNaming, LETTER_WAIT_MS } = await import('../src/ui/naming');
const { runWish } = await import('../src/ui/wish');
const { setUnit } = await import('../src/ui/dom');
const { releaseDrags } = await import('../src/ui/drag');
const { idleDelay } = await import('../src/ui/ladder');
const { wishSpec } = await import('../src/content/wishes');
const { phraseSpec } = await import('../src/content/phrases');
const { seeded } = await import('../src/content/rand');

// ------------------------------------------------------------------------------------------------ the fake page

type Fn = (e: PointerEvent) => void;

class FakeTarget {
  private readonly listeners: { type: string; fn: Fn }[] = [];
  addEventListener(type: string, fn: Fn): void {
    this.listeners.push({ type, fn });
  }
  removeEventListener(type: string, fn: Fn): void {
    const i = this.listeners.findIndex((l) => l.type === type && l.fn === fn);
    if (i >= 0) this.listeners.splice(i, 1);
  }
  fire(type: string, o: { id?: number; x?: number; y?: number } = {}): void {
    const e = { type, pointerId: o.id ?? 1, clientX: o.x ?? 0, clientY: o.y ?? 0, preventDefault() {}, stopPropagation() {} } as unknown as PointerEvent;
    for (const l of this.listeners.filter((l) => l.type === type)) l.fn(e);
  }
}

/** A page element: a tree with classes, attributes and a style; its box is its own left and top plus its parents'. */
class FakeNode extends FakeTarget {
  parent: FakeNode | null = null;
  readonly children: FakeNode[] = [];
  readonly style: Record<string, string> & { setProperty(k: string, v: string): void } = Object.assign(Object.create(null), {
    setProperty(this: Record<string, string>, k: string, v: string) {
      this[k] = v;
    },
  });
  readonly dataset: Record<string, string> = {};
  innerHTML = '';
  textContent = '';
  src = '';
  alt = '';
  draggable = true;
  decoding = '';
  offsetWidth = 0;
  offsetHeight = 0;
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
  removeAttribute(k: string): void {
    this.attrs.delete(k);
  }
  appendChild(c: FakeNode): FakeNode {
    c.remove();
    c.parent = this;
    this.children.push(c);
    return c;
  }
  append(...items: (FakeNode | string)[]): void {
    for (const i of items) if (typeof i !== 'string') this.appendChild(i);
  }
  remove(): void {
    const p = this.parent;
    if (p) p.children.splice(p.children.indexOf(this), 1);
    this.parent = null;
  }
  replaceWith(n: FakeNode): void {
    const p = this.parent;
    if (!p) return;
    n.remove();
    p.children.splice(p.children.indexOf(this), 1, n);
    n.parent = p;
    this.parent = null;
  }
  cloneNode(): FakeNode {
    const c = new FakeNode();
    c.className = this.className;
    return c;
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
  /** Web Animations: it finishes after its delay and duration. */
  animate(_frames: Keyframe[], o: KeyframeAnimationOptions) {
    let done!: () => void;
    const a = { onfinish: null as null | (() => void), oncancel: null as null | (() => void), cancel() {}, finished: new Promise<void>((r) => (done = r)) };
    setTimeout(() => {
      a.onfinish?.();
      done();
    }, Number(o.duration ?? 0) + (o.delay ?? 0));
    return a;
  }
  getAnimations(): { cancel(): void }[] {
    return [];
  }
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  all(): FakeNode[] {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
  byLabel(label: string): FakeNode {
    const n = this.all().find((c) => c.getAttribute('aria-label') === label);
    if (!n) throw new Error(`no ${label}`);
    return n;
  }
  place(x: number, y: number, w: number, h: number): void {
    Object.assign(this.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  }
}

let win: FakeTarget;
let page: FakeNode;
const ANCHOR = { x: 500, y: 300, visible: true };
const run = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const ghost = { visible: false, tap: async () => {}, drag: async () => {}, hide() {} };
const ctx = () => {
  const moments = page.appendChild(new FakeNode());
  const drag = page.appendChild(new FakeNode());
  // Every first-time demonstration has been seen: no ghost hand moves on its own.
  const seen = new Set(['bell-tap-demo', 'bell-drag-demo', 'gem-demo', 'slider-demo']);
  return { moments, drag, ghost, seen, screen: () => ({ w: 1080, h: 810 }), clear: () => null } as never;
};
const hooks = { anchor: () => ANCHOR, react() {}, log() {}, chosen() {} };
/** A finger drags `n` to `to` and lifts there (the window hears the release). */
const dragTo = async (n: FakeNode, to: { x: number; y: number }) => {
  const b = n.getBoundingClientRect();
  n.fire('pointerdown', { x: b.left + b.width / 2, y: b.top + b.height / 2 });
  n.fire('pointermove', to);
  win.fire('pointerup', to);
  await run(500);
};
const said = (what: string) => fake.s.log.filter((l) => l.what === what).map((l) => l.t);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  win = new FakeTarget();
  vi.stubGlobal('window', win);
  vi.stubGlobal('addEventListener', win.addEventListener.bind(win));
  vi.stubGlobal('removeEventListener', win.removeEventListener.bind(win));
  vi.stubGlobal('document', { createElement: () => new FakeNode() });
  vi.stubGlobal('requestAnimationFrame', (fn: (t: number) => void) => setTimeout(() => fn(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  setUnit(1);
  releaseDrags();
  page = new FakeNode();
  Object.assign(fake.s, { log: [], soundMs: 1000, sayMs: 2500, talking: 0, letters: [], speech: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ------------------------------------------------------------------------------------------------ the naming

describe('the naming after the star slide (2.3.2)', () => {
  const mim: NameChoice = { name: 'Mim', gpcs: ['m', 'i', 'm'], clip: 'name-mim', distractors: ['N', 'e', 'n'] };
  const spec: NamingSpec = {
    bells: [mim, { ...mim, name: 'Cass', clip: 'name-cass' }, { ...mim, name: 'Pip', clip: 'name-pip' }],
    clips: { bells: ['g-bells'], drag: ['g-bell-drag'], spell: ['g-spell'], gems: ['g-gems'], slide: ['g-slide'], done: ['fb-spelled'], again: ['fb-listen'] },
  };

  /**
   * Choose Mim's bell, fill the three slots (the last with `last`), then slide the star along, 150 ms a slot, and let
   * go at the end. Returns when the finger lifts.
   */
  async function buildAndSlide(last: string): Promise<number> {
    void runNaming(ctx(), spec, hooks, () => {});
    await run(3000);
    await dragTo(page.byLabel('bell Mim'), { x: ANCHOR.x, y: ANCHOR.y + 60 });
    await run(3000);
    // The slots sit 100 px apart on the panel, the star's track under them.
    const slots = [1, 2, 3].map((k) => page.byLabel(`slot ${k}`));
    slots.forEach((s, k) => s.place(100 * k, 0, 60, 60));
    const tray = page.all().find((n) => n.classList.contains('gem-tray'))!;
    const gem = (g: string) => tray.all().find((n) => n.dataset.g === g && n.classList.contains('gem') && !n.classList.contains('lifted'))!;
    for (const [k, g] of ['M', 'i', last].entries()) await dragTo(gem(g), { x: 100 * k + 30, y: 30 });
    await run(3000);
    const track = page.all().find((n) => n.classList.contains('slider'))!;
    track.place(0, 100, 400, 60);
    const star = page.byLabel('star');
    star.place(0, 0, 60, 60);
    star.fire('pointerdown', { x: 30, y: 130 });
    for (const x of [130, 230, 400]) {
      await run(150);
      star.fire('pointermove', { x, y: 130 });
    }
    win.fire('pointerup', { x: 400, y: 130 });
    return Math.round(performance.now());
  }

  it('says the name only once the star\'s last letter sound has ended, with the sparkle between', async () => {
    const up = await buildAndSlide('m');
    await run(5000);
    const [lastSound] = said('sound m').slice(-1);
    const [ended] = said('end m').slice(-1);
    const [name] = said('say name-mim fb-spelled');
    expect(lastSound).toBeLessThan(up);
    expect(ended).toBe(lastSound + 1000);
    expect(name, 'the name after the last letter sound').toBeGreaterThanOrEqual(ended);
    expect(name - ended, 'and right after it').toBeLessThanOrEqual(50);
    // The sparkle plays once the sound is over (it is skipped under a letter sound), then the name.
    const sparkle = said('sfx sparkle')[0];
    expect(sparkle).toBeGreaterThanOrEqual(ended);
    expect(sparkle).toBeLessThanOrEqual(name);
  });

  it('says "Listen again" after a wrong build only once the last letter sound has ended', async () => {
    await buildAndSlide('n');
    await run(5000);
    const [ended] = said('end n').slice(-1);
    const [listen] = said('say fb-listen');
    expect(listen).toBeGreaterThanOrEqual(ended);
    expect(listen - ended).toBeLessThanOrEqual(50);
  });

  it('waits at most LETTER_WAIT_MS for a letter sound that never ends', async () => {
    fake.s.soundMs = Infinity;
    const up = await buildAndSlide('m');
    await run(5000);
    const [name] = said('say name-mim fb-spelled');
    expect(name - up).toBeGreaterThanOrEqual(LETTER_WAIT_MS - 50);
    expect(name - up).toBeLessThanOrEqual(LETTER_WAIT_MS + 50);
  });
});

// ------------------------------------------------------------------------------------------------ the wish

describe('the wish reminder (2.3.2)', () => {
  /**
   * Open a wish now (its basket can be touched at once). `repeats` gives the times of the goal's repeat since then,
   * `close` ends the moment, as a reset does.
   */
  const open = (spec: WishSpec) => {
    const t0 = Math.round(performance.now());
    let handle: { close(): void } | null = null;
    void runWish(ctx(), spec, hooks, (h) => void (h && (handle = h)));
    return {
      t0,
      repeats: () => said(`say ${spec.clips.goal.join(' ')}`).filter((t) => t > t0 + 100).map((t) => t - t0),
      close: () => {
        handle?.close();
        fake.s.log.length = 0;
      },
    };
  };
  const word = (level: 1 | 2) => wishSpec('bath', seeded(3), [], { level });
  const phrase = () => phraseSpec(seeded(3), { level: 2, rule: 'all' });

  it('reminds her of a word wish 20 s after the basket can be touched, with 4 items and with 5', async () => {
    for (const level of [1, 2] as const) {
      const spec = word(level);
      expect(spec.basket).toHaveLength(level === 1 ? 4 : 5);
      const w = open(spec);
      await run(19_900);
      expect(w.repeats(), `${spec.basket.length} items`).toEqual([]);
      await run(200);
      expect(w.repeats(), `${spec.basket.length} items`).toEqual([20_000]);
      w.close();
    }
  });

  it('reminds her of the Corner\'s two-word phrase 25 s after the basket can be touched', async () => {
    const spec = phrase();
    expect(spec.kind).toBe('phrase');
    const w = open(spec);
    await run(24_900);
    expect(w.repeats()).toEqual([]);
    await run(200);
    expect(w.repeats()).toEqual([25_000]);
  });

  it('starts the wait again at a touch on a basket item', async () => {
    const spec = word(2);
    const w = open(spec);
    await run(15_000);
    const item = page.byLabel(`item ${spec.basket[0].word}`);
    item.fire('pointerdown', { x: 0, y: 0 });
    win.fire('pointerup', { x: 0, y: 0 });
    await run(19_900);
    expect(w.repeats()).toEqual([]);
    await run(200);
    expect(w.repeats()).toEqual([35_000]);
  });

  it('keeps the rest of the ladder: the focused hint 10 s (4 items) or 14 s (5) after the reminder', async () => {
    for (const level of [1, 2] as const) {
      const spec = word(level);
      const w = open(spec);
      await run(20_100);
      expect(w.repeats()).toEqual([20_000]);
      // The reminder is said (2.5 s here), then the quiet time of the ladder runs.
      const after = 20_000 + fake.s.sayMs + idleDelay('reading', spec.basket.length);
      await run(after - 20_100 - 100);
      expect(said('say h-sounds').filter((t) => t > w.t0)).toEqual([]);
      await run(200);
      expect(said('say h-sounds').filter((t) => t > w.t0).map((t) => t - w.t0)).toEqual([after]);
      w.close();
    }
  });
});
