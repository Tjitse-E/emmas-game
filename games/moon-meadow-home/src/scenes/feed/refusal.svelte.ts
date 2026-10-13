// A refused food in free feeding (review 2026-10-13): the stable's baby at this door gives a small head shake while
// it says again what it wants. MangerFeed sets it; the goodnight StableRow draws the shake. `n` restarts the shake.
export const refusal = $state<{ door: number | null; n: number }>({ door: null, n: 0 });
