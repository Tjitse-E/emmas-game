// G/tests/content/real.ts
import { readValidateInput } from '../../tools/lib/read-content.ts';
import { validate, type Finding, type Thresholds } from '../../tools/lib/validate.ts';
import type { Release } from '../../src/core/content/types.ts';

export function realErrors(prefixes: string[], opts: { dataOnly?: boolean; release?: Release; thresholds?: Partial<Thresholds> } = {}): Finding[] {
  const input = readValidateInput({ dataOnly: opts.dataOnly ?? true, release: opts.release });
  return validate(input, opts.thresholds).filter(f => f.level === 'error' && prefixes.some(p => f.code.startsWith(p)));
}
