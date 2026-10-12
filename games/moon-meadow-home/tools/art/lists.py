import json
from dataclasses import dataclass, field
from pathlib import Path

from . import paths

KINDS = ('word', 'item', 'station', 'prop', 'outfit', 'pin', 'decor', 'ui', 'egg', 'building', 'bg')
SLOTS = ('head', 'neck', 'back', 'mane', 'flank')
TWIN_IDS = {'pan', 'pen', 'hat', 'hut', 'cap', 'cup', 'peg', 'pig', 'net', 'nut', 'bed', 'bud', 'boot', 'boat',
            'sheep', 'ship', 'pie', 'pea', 'cape', 'cub', 'cube', 'tap', 'tape', 'pin', 'pine', 'can', 'cane'}
PLURAL_IDS = {'hat', 'pin', 'cup', 'mug', 'ring', 'bell', 'duck', 'boat', 'shell', 'bow', 'bead', 'cape', 'cake',
              'kite', 'bike', 'chair', 'key', 'carrot', 'apple', 'pancake', 'plank', 'brick', 'castle', 'horse',
              'fox', 'box', 'dress', 'glass', 'brush', 'bush', 'peach', 'bench', 'branch', 'sash', 'mouse'}


@dataclass
class Entry:
    id: str
    kind: str
    wave: str
    pack: str
    size: int
    desc: str
    tint: str | None = None
    slot: str | None = None
    step: str | None = None
    priority: int = 2


def _lines(name: str, root: Path | None = None) -> list[str]:
    p = (root or paths.LISTS) / name
    if not p.exists():
        return []
    return [ln.strip() for ln in p.read_text().splitlines() if ln.strip() and not ln.startswith('#')]


def _step_no(step: str) -> int:
    return int(step[1:3])


def load_words(root: Path | None = None) -> list[Entry]:
    notes = dict(ln.split(': ', 1) for ln in _lines('notes.txt', root))
    tints = dict(ln.split() for ln in _lines('tint.txt', root))
    out: list[Entry] = []
    for ln in _lines('words.txt', root):
        step, ids = [s.strip() for s in ln.split('|')]
        for wid in ids.split():
            if not paths.is_word_id(wid):
                raise ValueError(f'bad word id {wid}')
            if wid not in notes:
                raise ValueError(f'no note for {wid}')
            n = _step_no(step)
            first = step == 'R19' or wid in PLURAL_IDS or wid in TWIN_IDS or wid in tints
            pr = 1 if first else (2 if 13 <= n <= 30 else 3)
            out.append(Entry(wid, 'word', 'A', 'words', 320, notes[wid], tints.get(wid), None, step, pr))
    order = {e.id: i for i, e in enumerate(out)}
    return sorted(out, key=lambda e: (e.priority, _step_no(e.step), order[e.id]))


def load_items(root: Path | None = None) -> list[Entry]:
    out = []
    for ln in _lines('items.txt', root):
        iid, kind, wave, pack, size, tint, slot, desc = [s.strip() for s in ln.split('|')]
        out.append(Entry(iid, kind, wave, pack, int(size), desc, None if tint == '-' else tint,
                         None if slot == '-' else slot))
    return out


def load_breeds(root: Path | None = None) -> list[dict]:
    out = []
    for ln in _lines('breeds.txt', root):
        bid, wave, horn, change = [s.strip() for s in ln.split('|')]
        out.append({'id': bid, 'wave': wave, 'horn': horn, 'change': change})
    return out


def load_backgrounds(root: Path | None = None) -> list[Entry]:
    out = []
    for ln in _lines('backgrounds.txt', root):
        bid, wave, pack, desc = [s.strip() for s in ln.split('|')]
        out.append(Entry(bid, 'bg', wave, pack, 1770, desc))
    return out


def load_requests(root: Path | None = None) -> list[Entry]:
    out = []
    for ln in _lines('requests.txt', root):
        wid, step, desc = [s.strip() for s in ln.split('|')]
        out.append(Entry(wid, 'word', 'B', 'words', 320, desc, None, None, step, 2))
    return out
