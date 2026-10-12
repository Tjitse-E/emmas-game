import re
from pathlib import Path

GAME = Path(__file__).resolve().parents[2]
REPO = GAME.parents[1]
STYLE_REF = REPO / 'docs/v3/art/style-reference.png'
SRC = GAME / 'art-src'
LISTS = SRC / 'lists'
RAW = SRC / 'raw'
SOURCES = SRC / 'sources'
META = SRC / 'meta'
REVIEW = SRC / 'review'
SVG = SRC / 'svg'
WORK = SRC / 'work'
JOBS = SRC / 'jobs'
CONTACT = SRC / 'contact'
PUBLIC_ART = GAME / 'public/art'

ID_RE = re.compile(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
PREFIXES = ('item-', 'station-', 'prop-', 'outfit-', 'pin-', 'decor-', 'ui-', 'egg-', 'building-', 'bg-', 'lumi-')


def is_valid_id(s: str) -> bool:
    return bool(ID_RE.match(s))


def is_word_id(s: str) -> bool:
    return is_valid_id(s) and not s.startswith(PREFIXES)
