import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '../..');

// A fresh realm stands in for Safari 15.0 to 15.3: its own Object, Array and String,
// with the three features removed before the polyfill file runs.
function oldSafariRealm(): vm.Context {
  const ctx = vm.createContext({});
  vm.runInContext(
    'delete Object.hasOwn; delete Array.prototype.at; delete String.prototype.at; delete globalThis.structuredClone;',
    ctx,
  );
  return ctx;
}

function runPolyfills(ctx: vm.Context): void {
  const ts = readFileSync(resolve(root, 'src/polyfills.ts'), 'utf8');
  const js = stripTypeScriptTypes(ts).replace(/^\s*export\s*\{\s*\};?\s*$/m, '');
  vm.runInContext(js, ctx);
}

describe('polyfills', () => {
  it('the fresh realm really lacks the three features', () => {
    const ctx = oldSafariRealm();
    expect(vm.runInContext('typeof Object.hasOwn', ctx)).toBe('undefined');
    expect(vm.runInContext('typeof [].at', ctx)).toBe('undefined');
    expect(vm.runInContext("typeof ''.at", ctx)).toBe('undefined');
    expect(vm.runInContext('typeof structuredClone', ctx)).toBe('undefined');
  });

  it('adds Object.hasOwn', () => {
    const ctx = oldSafariRealm();
    runPolyfills(ctx);
    expect(vm.runInContext("Object.hasOwn({ a: 1 }, 'a')", ctx)).toBe(true);
    expect(vm.runInContext("Object.hasOwn({ a: 1 }, 'toString')", ctx)).toBe(false);
    expect(vm.runInContext("Object.hasOwn(Object.create(null, { b: { value: 2 } }), 'b')", ctx)).toBe(true);
    expect(vm.runInContext("Object.keys(Object).includes('hasOwn')", ctx)).toBe(false);
  });

  it('adds Array.prototype.at and String.prototype.at', () => {
    const ctx = oldSafariRealm();
    runPolyfills(ctx);
    expect(vm.runInContext('[1, 2, 3].at(0)', ctx)).toBe(1);
    expect(vm.runInContext('[1, 2, 3].at(-1)', ctx)).toBe(3);
    expect(vm.runInContext('[1, 2, 3].at(3)', ctx)).toBeUndefined();
    expect(vm.runInContext('[1, 2, 3].at(-4)', ctx)).toBeUndefined();
    expect(vm.runInContext('[1, 2, 3].at(1.7)', ctx)).toBe(2);
    expect(vm.runInContext('[1, 2, 3].at(NaN)', ctx)).toBe(1);
    expect(vm.runInContext("'moon'.at(-1)", ctx)).toBe('n');
    expect(vm.runInContext("'moon'.at(0)", ctx)).toBe('m');
    expect(vm.runInContext("'moon'.at(9)", ctx)).toBeUndefined();
    // Not enumerable, so for...in over arrays stays clean.
    expect(vm.runInContext('var k = []; for (var i in [7]) k.push(i); k.join()', ctx)).toBe('0');
  });

  it('adds structuredClone as a deep copy', () => {
    const ctx = oldSafariRealm();
    runPolyfills(ctx);
    const out = vm.runInContext(
      'var a = { herd: [{ name: "Star", eggs: [1, 2] }] }; var b = structuredClone(a); b.herd[0].eggs.push(3); JSON.stringify([a, b])',
      ctx,
    );
    expect(JSON.parse(out)).toEqual([{ herd: [{ name: 'Star', eggs: [1, 2] }] }, { herd: [{ name: 'Star', eggs: [1, 2, 3] }] }]);
  });

  it('leaves native features alone when they exist', async () => {
    const hasOwn = Object.hasOwn;
    const at = Array.prototype.at;
    const sat = String.prototype.at;
    const clone = globalThis.structuredClone;
    await import('../../src/polyfills.ts');
    expect(Object.hasOwn).toBe(hasOwn);
    expect(Array.prototype.at).toBe(at);
    expect(String.prototype.at).toBe(sat);
    expect(globalThis.structuredClone).toBe(clone);
  });
});

describe('feature-check.js', () => {
  type Win = Record<string, unknown>;
  function load(win: Win) {
    const src = readFileSync(resolve(root, 'public/feature-check.js'), 'utf8');
    const listeners: Record<string, (() => void)[]> = {};
    const timers: (() => void)[] = [];
    const appended: Record<string, unknown>[] = [];
    const document = {
      addEventListener: (type: string, fn: () => void) => { (listeners[type] ??= []).push(fn); },
      createElement: (tag: string) => {
        const el: Record<string, unknown> = { tag, style: {}, attrs: {} };
        el.setAttribute = (k: string, v: string) => { (el.attrs as Record<string, string>)[k] = v; };
        return el;
      },
      body: { appendChild: (el: Record<string, unknown>) => { appended.push(el); } },
    };
    const window: Win = { ...win };
    const ctx = vm.createContext({
      window,
      document,
      Promise,
      CSS: window.CSS,
      setTimeout: (fn: () => void, ms: number) => { expect(ms).toBe(10000); timers.push(fn); },
    });
    vm.runInContext(src, ctx);
    return { listeners, timers, appended, window };
  }
  const goodCss = { supports: (q: string) => q === 'aspect-ratio: 1' };

  it('a capable browser that boots shows nothing', () => {
    const r = load({ indexedDB: {}, CSS: goodCss });
    expect(r.timers).toHaveLength(1);
    r.window.__mmhBooted = true;
    r.timers[0]();
    expect(r.appended).toHaveLength(0);
  });

  it('a capable browser that has not booted after 10 seconds gets the link to v2', () => {
    const r = load({ indexedDB: {}, CSS: goodCss });
    r.timers[0]();
    expect(r.appended).toHaveLength(1);
    expect(r.appended[0].tag).toBe('a');
    expect(r.appended[0].href).toBe('../../ideas/opus-5-5-unicorn-egg-nest-v2/');
  });

  it('an old browser without aspect-ratio gets the link to v2 once the page is ready', () => {
    const r = load({ indexedDB: {}, CSS: { supports: () => false } });
    expect(r.timers).toHaveLength(0);
    expect(r.appended).toHaveLength(0);
    r.listeners.DOMContentLoaded[0]();
    expect(r.appended).toHaveLength(1);
  });

  it('a browser without indexedDB gets the link to v2', () => {
    const r = load({ CSS: goodCss });
    r.listeners.DOMContentLoaded[0]();
    expect(r.appended).toHaveLength(1);
  });

  it('has no words on screen, only a picture', () => {
    const r = load({ indexedDB: {}, CSS: goodCss });
    r.timers[0]();
    const html = String(r.appended[0].innerHTML);
    expect(html.replace(/<[^>]*>/g, '').trim()).toBe('');
    expect(html).toContain('<svg');
  });
});
