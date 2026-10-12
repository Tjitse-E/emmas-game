import json
from pathlib import Path

from . import paths


def load(batch: str, root: Path = paths.REVIEW) -> dict[str, str]:
    p = root / f'{batch}.json'
    return json.loads(p.read_text()) if p.exists() else {}


def init(batch: str, ids: list[str], root: Path = paths.REVIEW) -> Path:
    cur = load(batch, root)
    for i in ids:
        cur.setdefault(i, 'pending')
    root.mkdir(parents=True, exist_ok=True)
    p = root / f'{batch}.json'
    p.write_text(json.dumps(cur, indent=1) + '\n')
    return p


def redo_ids(batch: str, root: Path = paths.REVIEW) -> list[str]:
    return [i for i, v in load(batch, root).items() if v == 'redo']


def apply_swaps(meta: dict, verdicts: dict[str, str]) -> dict:
    pics = meta.get('pictures', {})
    orig = {k: dict(v) for k, v in pics.items()}
    for i, v in verdicts.items():
        if v.startswith('swap:') and i in pics:
            other = v.split(':', 1)[1]
            pics[i]['src'] = orig[other]['src']
    return meta
