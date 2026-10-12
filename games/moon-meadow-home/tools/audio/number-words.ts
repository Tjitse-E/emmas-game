const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth',
  'nineteenth', 'twentieth'];

/** British English number words for 0 to 999: 41 is "forty-one", 105 is "one hundred and five". */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new RangeError(`numberWord: ${n} is outside 0 to 999`);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 === 0 ? '' : '-' + ONES[n % 10]);
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest === 0 ? '' : ' and ' + numberWord(rest)}`;
}

/** Ordinal words 1 to 20: 2 is "second". */
export function ordinalWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new RangeError(`ordinalWord: ${n} is outside 1 to 20`);
  return ORDINALS[n];
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
