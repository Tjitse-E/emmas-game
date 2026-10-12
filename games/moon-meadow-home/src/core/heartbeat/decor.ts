// Stall-door free play (R57): each door has a paint pot, a flower box and a lantern. A tap cycles that
// decoration. Never checked, never logged as learning; each change is a decor.placed event (area 'stalls').
export type DoorDecorKind = 'paint' | 'flowers' | 'lantern';
export const DOOR_DECOR_KINDS: readonly DoorDecorKind[] = ['paint', 'flowers', 'lantern'];
/** Variants in tap order. The first is the plain door. */
export const DOOR_DECOR: Record<DoorDecorKind, readonly string[]> = {
  paint: ['paint-none', 'paint-pink', 'paint-blue', 'paint-yellow', 'paint-green', 'paint-lilac'],
  flowers: ['flowers-none', 'flowers-pink', 'flowers-blue', 'flowers-yellow'],
  lantern: ['lantern-none', 'lantern-lit'],
};
export const PAINT_COLOUR: Record<string, string> = {
  'paint-pink': '#ffb3d6', 'paint-blue': '#a9d8ff', 'paint-yellow': '#ffe38a', 'paint-green': '#b6f0c8', 'paint-lilac': '#d9c4ff',
};
export const FLOWER_COLOUR: Record<string, string> = { 'flowers-pink': '#ff8fc7', 'flowers-blue': '#7fbfff', 'flowers-yellow': '#ffd25e' };

/** The decor key of one decoration of one door ('stall-3-paint'): the latest decor.placed with it wins. */
export function doorDecorKey(door: number, kind: DoorDecorKind): string {
  return `stall-${door}-${kind}`;
}

/** The variant after `current` (wrapping round to the plain door). */
export function nextDecor(kind: DoorDecorKind, current: string | null | undefined): string {
  const list = DOOR_DECOR[kind];
  const i = current ? list.indexOf(current) : 0;
  return list[(Math.max(0, i) + 1) % list.length];
}

/** The current variant of each kind for one door, from the cosmetics fold's decor records. */
export function doorDecor(decor: Readonly<Record<string, { item: string } | undefined>>, door: number): Record<DoorDecorKind, string> {
  const out = {} as Record<DoorDecorKind, string>;
  for (const k of DOOR_DECOR_KINDS) {
    const item = decor[doorDecorKey(door, k)]?.item;
    out[k] = item && DOOR_DECOR[k].includes(item) ? item : DOOR_DECOR[k][0];
  }
  return out;
}
