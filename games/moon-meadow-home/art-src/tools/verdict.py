"""Sets review verdicts after an agent looked at the contact sheets.

  python3 art-src/tools/verdict.py <batch> [--sheet <sheet id>]... [id=verdict]...
--sheet marks every pending id on that sheet `ok`; id=verdict pairs (ok, redo, svg, swap:<id>) win over it.
"""
import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]


def main(argv: list[str]) -> int:
    batch, rest = argv[0], argv[1:]
    rp = SRC / 'review' / f'{batch}.json'
    verdicts = json.loads(rp.read_text()) if rp.exists() else {}
    plan = json.loads((SRC / 'lists' / 'sheets' / f'{batch}.json').read_text())
    sheets = {s['id']: s['ids'] for s in plan['sheets']}
    i = 0
    while i < len(rest):
        if rest[i] == '--sheet':
            for pid in sheets[rest[i + 1]]:
                if verdicts.get(pid, 'pending') == 'pending':
                    verdicts[pid] = 'ok'
            i += 2
            continue
        pid, v = rest[i].split('=', 1)
        if pid not in plan['entries']:
            raise SystemExit(f'{pid} is not in {batch}')
        verdicts[pid] = v
        i += 1
    rp.write_text(json.dumps(verdicts, indent=1) + '\n')
    counts: dict[str, int] = {}
    for v in verdicts.values():
        counts[v.split(':')[0]] = counts.get(v.split(':')[0], 0) + 1
    print(batch, counts)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
