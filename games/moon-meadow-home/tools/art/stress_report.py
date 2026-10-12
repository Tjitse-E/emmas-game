import json
import re
import sys
import time
from pathlib import Path

from . import paths

_JSON = re.compile(r'\{\\?"frames\\?".*?\}', re.S)


def parse(text: str) -> dict:
    m = _JSON.search(text)
    if not m:
        raise ValueError('no stress result in output')
    return json.loads(m.group(0).replace('\\"', '"'))


def record(path: Path, runs: list[dict]) -> dict:
    data = json.loads(path.read_text()) if path.exists() else {'runs': []}
    stamp = time.strftime('%Y-%m-%dT%H:%M:%S')
    data['runs'] += [{**r, 'at': stamp} for r in runs]
    ok = all(r['ok'] for r in runs)
    data['decision'] = 'dom' if ok else 'pixi'
    data['why'] = (f'latest run of {len(runs)} sizes ' + ('passed' if ok else 'failed: ' +
                   ', '.join(r['viewport'] for r in runs if not r['ok'])))
    path.write_text(json.dumps(data, indent=1) + '\n')
    return data


if __name__ == '__main__':
    runs = [parse(Path(p).read_text()) for p in sys.argv[1:]]
    d = record(paths.SRC / 'stress-results.json', runs)
    print(d['decision'], '-', d['why'])
