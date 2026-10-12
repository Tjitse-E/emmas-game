import json
import time
from pathlib import Path

from . import review


class ManifestError(Exception):
    pass


SECTIONS = ('pictures', 'backgrounds', 'unicorns')


def _files_of(entry: dict) -> list[str]:
    out = [entry['src']] if 'src' in entry else []
    if 'sil' in entry:
        out.append(entry['sil'])
    for r in entry.get('renditions', {}).values():
        for part in r['parts']:
            out += [layer['src'] for layer in part['layers']]
    return out


def build(meta_dir: Path, review_dir: Path, public_art: Path, rig_mode: str, strict: bool = False):
    data = {'v': 1, 'built': time.strftime('%Y-%m-%dT%H:%M:%S'), 'rigMode': rig_mode,
            'pictures': {}, 'backgrounds': {}, 'unicorns': {}, 'lumi': None, 'patterns': None}
    missing: list[str] = []
    for mf in sorted(meta_dir.glob('*.json')):
        batch = mf.stem
        meta = json.loads(mf.read_text())
        verdicts = review.load(batch, review_dir)
        meta = review.apply_swaps(meta, verdicts)
        for section in SECTIONS:
            for key, entry in meta.get(section, {}).items():
                needs_review = entry.get('source', 'codex') == 'codex'
                if needs_review and not (verdicts.get(key) == 'ok' or verdicts.get(key, '').startswith('swap:')):
                    missing.append(key)
                    continue
                for f in _files_of(entry):
                    if not (public_art / f).exists():
                        raise ManifestError(f'{batch}: {key}: file {f} does not exist')
                prev = data[section].get(key)
                if prev is not None and prev != entry:
                    raise ManifestError(f'{key} differs between batches')
                data[section][key] = entry
        for single in ('lumi', 'patterns'):
            if meta.get(single):
                data[single] = meta[single]
    for section in SECTIONS:
        data[section] = dict(sorted(data[section].items()))
    # An id redone in a later batch (B-r1) is in; only ids that no batch has ready count as left out.
    left_out = sorted(set(missing) - {k for section in SECTIONS for k in data[section]})
    if strict and left_out:
        raise ManifestError('left out: ' + ', '.join(left_out))
    return data, left_out


def write(public_art: Path, data: dict) -> Path:
    p = public_art / 'manifest.json'
    p.write_text(json.dumps(data, indent=1, sort_keys=False) + '\n')
    return p
