"""Cuts chosen pictures of a sheet again with a smaller minimum part size, and with enclosed white cleared.

`pipeline cut` drops every part smaller than 0.2 percent of the sheet, so the rain drops under a cloud are lost,
and it keeps white inside an outline, so the inside of a hoop stays white. This cuts only the given ids, writes the
WebP and the meta entry the same way `cut` does, and leaves the verdicts alone. Run it again after a new `cut`.
  PYTHONPATH=tools python3 art-src/tools/recut.py --batch words-a --ids rain [--min-frac 0.0002] [--clear-white]
"""
import argparse
import subprocess
import sys
from pathlib import Path

from PIL import Image

from art import imageops, paths, pipeline, sheets


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--batch', required=True)
    p.add_argument('--ids', required=True)
    p.add_argument('--min-frac', type=float, default=0.0002)
    p.add_argument('--clear-white', action='store_true')
    a = p.parse_args(argv)
    data = pipeline.load_batch(a.batch)
    entries = pipeline.batch_entries(data)
    wanted = set(a.ids.split(','))
    meta_path = paths.META / f'{a.batch}.json'
    meta = pipeline._read_json(meta_path, {})
    meta.setdefault('pictures', {})
    done = 0
    for spec in pipeline.batch_specs(data):
        if not wanted & set(spec.ids):
            continue
        raw = pipeline.raw_sheet(spec.id)
        for c in sheets.cut_sheet(Image.open(raw), spec, min_area_frac=a.min_frac):
            if c.id not in wanted or c.image is None:
                continue
            e = entries[c.id]
            out = pipeline.fit(c.image, e)
            rel = f'{pipeline.folder_for(e.kind)}/{c.id}.webp'
            dest = paths.PUBLIC_ART / rel
            imageops.save_webp(out, dest)
            if a.clear_white:
                subprocess.run([sys.executable, str(Path(__file__).with_name('clear_holes.py')), str(dest)], check=True)
                out = Image.open(dest)
            meta['pictures'][c.id] = pipeline.picture_entry(e, out, rel, 'codex')
            done += 1
            print(f'{c.id}: {rel}')
    pipeline._write_json(meta_path, meta)
    print(f'{done} pictures cut again')
    return 0


if __name__ == '__main__':
    sys.exit(main())
