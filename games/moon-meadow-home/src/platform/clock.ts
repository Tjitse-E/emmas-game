// The game clock. Core and the store take every time from clock.now(), so the test hook can move time.
// The test hook stores the offset in sessionStorage so a set time survives a reload (platform A10).

let offsetMs = 0;

export const clock = {
  now(): number { return Date.now() + offsetMs; },
  setNow(ms: number | null): void { offsetMs = ms === null ? 0 : ms - Date.now(); },
  advance(ms: number): void { offsetMs += ms; },
  offset(): number { return offsetMs; },
  setOffset(ms: number): void { offsetMs = Number.isFinite(ms) ? ms : 0; },
  /** Minutes east of UTC, as stored on visit.start. */
  tzOffsetMinutes(at?: number): number { return -new Date(at ?? clock.now()).getTimezoneOffset(); },
};
