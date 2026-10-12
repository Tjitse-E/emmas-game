// G/tools/validate-content.ts
// npm run check:content -- [--data-only] [--release 1.1] [--only CODE_,CODE_] [--assets=warn]
// Prints one line per finding and a count line. Exits with code 1 when any error is printed.
import { readValidateInput } from './lib/read-content.ts';
import { validate, type Finding } from './lib/validate.ts';
import type { Release } from '../src/core/content/types.ts';

function argValue(args: string[], name: string): string | undefined {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const args = process.argv.slice(2);
const dataOnly = args.includes('--data-only');
const release = argValue(args, '--release') as Release | undefined;
const only = (argValue(args, '--only') ?? '').split(',').map(s => s.trim()).filter(Boolean);
const assets = argValue(args, '--assets') === 'warn' ? 'warn' : 'error';

let findings: Finding[];
try {
  findings = validate(readValidateInput({ dataOnly, release, assets }));
} catch (e) {
  findings = [{ level: 'error', code: 'BUILD', msg: `could not read content: ${(e as Error).message}` }];
}
if (only.length) findings = findings.filter(f => only.some(p => f.code.startsWith(p)));

for (const f of findings) console.log(`${f.level === 'error' ? 'ERROR' : 'WARN'} ${f.code} ${f.msg}`);
const errors = findings.filter(f => f.level === 'error').length;
const warnings = findings.length - errors;
console.log(`${errors} errors, ${warnings} warnings`);
if (errors > 0) process.exitCode = 1;
