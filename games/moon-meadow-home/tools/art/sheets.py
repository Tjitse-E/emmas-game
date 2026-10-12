from dataclasses import dataclass

import numpy as np
from PIL import Image

from .imageops import label_components, unmatte_white
from .lists import Entry


@dataclass
class SheetSpec:
    id: str
    cols: int
    rows: int
    ids: list[str]
    descs: list[str]
    grey: bool


@dataclass
class Cut:
    id: str
    image: Image.Image | None
    box: tuple[int, int, int, int] | None
    source_long_side: int
    issues: list[str]


def plan_sheets(batch: str, entries: list[Entry], cols: int, rows: int) -> list[SheetSpec]:
    n = cols * rows
    out: list[SheetSpec] = []
    for grey in (False, True):
        # Entries described 'svg: ...' are drawn by hand as SVG and never go on a Codex sheet.
        group = [e for e in entries if bool(e.tint) == grey and not e.desc.startswith('svg:')]
        for i in range(0, len(group), n):
            chunk = group[i:i + n]
            out.append(SheetSpec('', cols, rows, [e.id for e in chunk], [e.desc for e in chunk], grey))
    for k, s in enumerate(out, 1):
        s.id = f'{batch}-{k:02d}'
    return out


def cut_sheet(im: Image.Image, spec: SheetSpec, min_area_frac: float = 0.002) -> list[Cut]:
    rgba = unmatte_white(im)
    arr = np.asarray(rgba)
    mask = arr[..., 3] > 0
    labels, n = label_components(mask)
    H, W = mask.shape
    cw, ch = W / spec.cols, H / spec.rows
    areas = np.bincount(labels.ravel(), minlength=n + 1)
    keep = [k for k in range(1, n + 1) if areas[k] >= min_area_frac * W * H]
    cells: dict[int, list[int]] = {}
    for k in keep:
        ys, xs = np.nonzero(labels == k)
        col = min(int(xs.mean() // cw), spec.cols - 1)
        row = min(int(ys.mean() // ch), spec.rows - 1)
        cells.setdefault(row * spec.cols + col, []).append(k)
    cuts = []
    for idx, cid in enumerate(spec.ids):
        comps = cells.get(idx, [])
        if not comps:
            cuts.append(Cut(cid, None, None, 0, ['missing']))
            continue
        m = np.isin(labels, comps)
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        piece = arr[y0:y1, x0:x1].copy()
        piece[..., 3] = np.where(m[y0:y1, x0:x1], piece[..., 3], 0)
        issues = []
        if (x1 - x0) > 1.15 * cw or (y1 - y0) > 1.15 * ch:
            issues.append('overlaps-cell')
        cuts.append(Cut(cid, Image.fromarray(piece, 'RGBA'), (int(x0), int(y0), int(x1 - x0), int(y1 - y0)),
                        int(max(x1 - x0, y1 - y0)), issues))
    return cuts
