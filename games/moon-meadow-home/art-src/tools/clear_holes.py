"""Clears enclosed white background from a cut picture, such as the gap between a swing's ropes.

The cutter keeps white inside an outline on purpose (snow, eggs, sheep). Where the agent sees that a closed white
area is background, this makes every near-white region larger than --min (fraction of the picture) transparent.
Run it again after a new `cut` of the same batch, because `cut` writes the picture again.
  python3 art-src/tools/clear_holes.py public/art/items/station-swing.webp [--min 0.01]
"""
import argparse
import sys

import numpy as np
from PIL import Image


def label(mask: np.ndarray) -> tuple[np.ndarray, int]:
    lab = np.zeros(mask.shape, np.int32)
    n = 0
    h, w = mask.shape
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1
                stack = [(y, x)]
                lab[y, x] = n
                while stack:
                    cy, cx = stack.pop()
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n
                            stack.append((ny, nx))
    return lab, n


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument('path')
    p.add_argument('--min', type=float, default=0.01)
    a = p.parse_args(argv)
    im = Image.open(a.path).convert('RGBA')
    arr = np.asarray(im).copy()
    rgb = arr[..., :3].astype(int)
    white = (rgb.min(axis=2) > 236) & (arr[..., 3] > 0)
    lab, n = label(white)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    cleared = 0
    for k in range(1, n + 1):
        if sizes[k] >= a.min * white.size:
            region = lab == k
            # soften the rim: pixels next to the region that are almost white become half transparent
            arr[region, 3] = 0
            cleared += int(sizes[k])
    rim = (rgb.min(axis=2) > 220) & (arr[..., 3] > 0)
    near = np.zeros_like(rim)
    hole = arr[..., 3] == 0
    near[1:] |= hole[:-1]; near[:-1] |= hole[1:]; near[:, 1:] |= hole[:, :-1]; near[:, :-1] |= hole[:, 1:]
    arr[rim & near, 3] = (arr[rim & near, 3] // 3)
    Image.fromarray(arr, 'RGBA').save(a.path, 'WEBP', quality=88, method=6, exact=False)
    print(f'{a.path}: cleared {cleared} px in {sum(1 for k in range(1, n + 1) if sizes[k] >= a.min * white.size)} regions')
    return 0


if __name__ == '__main__':
    sys.exit(main())
