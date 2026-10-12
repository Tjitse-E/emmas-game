// The part on screen during a Building Day, for the scene hook and the `building` test hook (Task A13).
// Each part sets itself here on mount and clears itself on destroy.
export type WallView = { total: number; up: number; answer: number };

export type PartApi = {
  part: string;
  /** Makes the right move of the moment on screen (or finishes a free part). */
  answer(): void;
  /** A wrong move of a given kind ('count-low', 'count-high', ...). */
  wrong?(kind?: string): void;
  /** aria-label of the right answer, or of what to touch next. */
  target?(): string | null;
  wall?(): WallView | null;
  drop?(n: number): void;
  trim?(colour: string): void;
  sign?(gems: string[]): void;
  cut?(): void;
};

let current: PartApi | null = null;

export function setPart(api: PartApi | null): () => void {
  current = api;
  return () => { if (current === api) current = null; };
}

export const activePart = (): PartApi | null => current;
