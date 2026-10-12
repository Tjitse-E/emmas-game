// Prints the success criteria report (spec 1.3) for a save export. Usage, from G: node tools/report.ts <save-export.json>
import { readFileSync } from 'node:fs';
import { report } from '../src/core/report/criteria.ts';
import type { GameEvent } from '../src/core/events.ts';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node tools/report.ts <save-export.json>');
  process.exit(2);
}
const data = JSON.parse(readFileSync(file, 'utf8')) as { format?: string; events?: GameEvent[] };
if (data.format !== 'moon-meadow-save' || !Array.isArray(data.events)) {
  console.error('Not a moon-meadow-save export.');
  process.exit(1);
}
console.log(JSON.stringify(report(data.events, Date.now()), null, 2));
