// Scene history without Svelte. src/platform/router.svelte.ts wraps it with mounting and reactivity.

export type SceneEntry<Id extends string = string> = { id: Id; params: Record<string, unknown> };
export type RouteListener<Id extends string> = (from: SceneEntry<Id> | null, to: SceneEntry<Id>) => void;

export class RouterCore<Id extends string> {
  #stack: SceneEntry<Id>[] = [];
  #listeners = new Set<RouteListener<Id>>();
  #max: number;

  constructor(maxHistory = 20) {
    this.#max = Math.max(1, maxHistory);
  }

  get current(): SceneEntry<Id> | null { return this.#stack[this.#stack.length - 1] ?? null; }
  get depth(): number { return this.#stack.length; }

  go(id: Id, params: Record<string, unknown> = {}): void {
    const from = this.current;
    this.#stack.push({ id, params });
    if (this.#stack.length > this.#max) this.#stack.splice(0, this.#stack.length - this.#max);
    this.#emit(from);
  }

  replace(id: Id, params: Record<string, unknown> = {}): void {
    const from = this.current;
    if (this.#stack.length) this.#stack[this.#stack.length - 1] = { id, params };
    else this.#stack.push({ id, params });
    this.#emit(from);
  }

  reset(id: Id, params: Record<string, unknown> = {}): void {
    const from = this.current;
    this.#stack = [{ id, params }];
    this.#emit(from);
  }

  back(): boolean {
    if (this.#stack.length < 2) return false;
    const from = this.current;
    this.#stack.pop();
    this.#emit(from);
    return true;
  }

  onChange(fn: RouteListener<Id>): () => void {
    this.#listeners.add(fn);
    return () => { this.#listeners.delete(fn); };
  }

  /** A listener that throws is reported and skipped: the scene change itself always happens. */
  #emit(from: SceneEntry<Id> | null): void {
    const to = this.current;
    if (!to) return;
    for (const fn of [...this.#listeners]) {
      try {
        fn(from, to);
      } catch (e) {
        console.error('[router] a scene change listener failed', e);
      }
    }
  }
}
