// The seam between the goodnight stable (lane night) and the mangers (lane feed). docs/v3/next/plan.md section 3.7.
/** One manger on screen: the stall's baby, its door number, and the manger centre in stage pixels (1180 x 820). */
export type MangerSpot = { baby: string; order: number; x: number; y: number };
/** The checked moment's test hook, forwarded by the goodnight scene hook while it is open. */
export type StageHook = {
  answer(): Promise<unknown>;
  wrong(kind?: string): Promise<unknown>;
  idle(): void;
  /** aria-label of the thing to drag (an item, a pile of hay), or null. */
  target(): string | null;
  /** aria-label of where it goes ('manger 7', 'hay rack'), or null. */
  drop(): string | null;
};
export type MangerFeedProps = {
  /** Mangers on screen, walked babies first, top row before bottom row. Empty: nothing to feed. */
  spots: MangerSpot[];
  /** The checked moment's hook while it runs, null when there is none (free feeding). */
  onhook: (h: StageHook | null) => void;
  /** Called once when the checked moment is over or there was none. The tray stays for free feeding. */
  onchecked: () => void;
};
