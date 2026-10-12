from pathlib import Path

import numpy as np
from PIL import Image

from .imageops import label_components

FAINT = 24   # alpha at or below this is resize ringing, not part of the object


def max_bytes_for(kind: str, size: int) -> int:
    if kind == 'bg':
        return 450_000
    return int(size * size * 0.45)


def check_picture(im: Image.Image, *, source_long_side: int, grey: bool = False) -> list[str]:
    a = np.asarray(im.convert('RGBA')).astype(int)
    alpha = a[..., 3]
    issues: list[str] = []
    if (alpha == 0).sum() < 0.02 * alpha.size:
        return ['no-alpha']
    edge = np.concatenate([alpha[:2].ravel(), alpha[-2:].ravel(), alpha[:, :2].ravel(), alpha[:, -2:].ravel()])
    if (edge > FAINT).any():
        issues.append('touches-edge')
    if source_long_side < 200:
        issues.append('low-res')
    solid = alpha > FAINT
    ys, xs = np.nonzero(solid)
    if len(xs) == 0:
        return ['sparse']
    bbox_area = (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1)
    labels, _ = label_components(solid)
    sizes = np.bincount(labels.ravel())[1:]
    n = int((sizes >= max(4, 0.002 * solid.sum())).sum())   # resizing leaves 1 or 2 px specks; they do not count
    if solid.sum() / bbox_area < 0.12 or n > 12:
        issues.append('sparse')
    semi = (alpha > 0) & (alpha < 255)
    if semi.sum() > 20 and (a[semi][:, :3].min(axis=1) > 235).mean() > 0.3:
        issues.append('halo')
    opaque = a[alpha > 200][:, :3]
    chroma = (opaque.max(axis=1) - opaque.min(axis=1)).mean() if len(opaque) else 0
    if not grey and chroma < 12:
        issues.append('no-colour')
    if grey and chroma > 25:
        issues.append('not-grey')
    return issues


def check_file(path: Path, max_bytes: int) -> list[str]:
    return ['heavy'] if path.stat().st_size > max_bytes else []
