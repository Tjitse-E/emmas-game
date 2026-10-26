// The results log: one line per checked moment (first try, miss or helped), for Tjitse in the console and for the
// flows through the test hook.
import type { MomentResult } from '../contracts';

export type Strand = 'm' | 's' | 'r';

export interface ResultLine {
  part: string;
  strand: Strand;
  outcome: MomentResult['outcome'];
  misses: number;
  ms: number;
  detail: Record<string, unknown>;
}

export class Results {
  readonly lines: ResultLine[] = [];

  add(part: string, strand: Strand, r: MomentResult, detail: Record<string, unknown> = {}): void {
    const line: ResultLine = { part, strand, outcome: r.outcome, misses: r.misses, ms: r.ms, detail };
    this.lines.push(line);
    console.info('[mmw result]', JSON.stringify(line));
  }

  clear(): void {
    this.lines.length = 0;
  }
}
