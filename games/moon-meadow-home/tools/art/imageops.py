from pathlib import Path

import numpy as np
from PIL import Image


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(r):
        p = np.pad(out, 1)
        grown = out.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                grown |= p[1 + dy:1 + dy + out.shape[0], 1 + dx:1 + dx + out.shape[1]]
        out = grown
    return out


def label_components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """8-connected labelling over row runs. Pure Python over runs, numpy per row."""
    h, w = mask.shape
    parent = [0]

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    rows: list[list[tuple[int, int, int]]] = []
    prev: list[tuple[int, int, int]] = []
    for y in range(h):
        d = np.diff(np.concatenate(([0], mask[y].astype(np.int8), [0])))
        starts = np.flatnonzero(d == 1).tolist()
        ends = np.flatnonzero(d == -1).tolist()
        cur = []
        j = 0
        for s, e in zip(starts, ends):
            # runs are sorted, so skip previous runs that end before this one starts (8-connected overlap:
            # ps <= e and pe >= s, with pe and e exclusive ends)
            while j < len(prev) and prev[j][1] < s:
                j += 1
            lab = 0
            k = j
            while k < len(prev) and prev[k][0] <= e:
                root = find(prev[k][2])
                if lab == 0:
                    lab = root
                elif root != lab:
                    lo, hi = min(root, lab), max(root, lab)
                    parent[hi] = lo
                    lab = lo
                k += 1
            if lab == 0:
                lab = len(parent)
                parent.append(lab)
            cur.append((s, e, lab))
        rows.append(cur)
        prev = cur
    remap: dict[int, int] = {}
    labels = np.zeros((h, w), np.int32)
    for y, cur in enumerate(rows):
        for s, e, lab in cur:
            root = find(lab)
            if root not in remap:
                remap[root] = len(remap) + 1
            labels[y, s:e] = remap[root]
    return labels, len(remap)


def _local_max(v: np.ndarray, r: int) -> np.ndarray:
    out = v.copy()
    p = np.pad(v, r, mode='edge')
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out = np.maximum(out, p[r + dy:r + dy + v.shape[0], r + dx:r + dx + v.shape[1]])
    return out


def unmatte_white(im: Image.Image, tol: float = 18.0) -> Image.Image:
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    near = dist <= tol
    solid = dilate(~near, 1)                      # closes gaps of up to 2 px in an outline
    labels, _ = label_components(~solid)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bgmask = np.isin(labels, edge[edge > 0])
    bgmask = dilate(bgmask, 1) & near             # give back the pixel the closing took
    alpha = np.where(bgmask, 0.0, 1.0)
    band = dilate(bgmask, 2) & ~bgmask
    ref = np.maximum(_local_max(dist, 3), 60.0)
    alpha[band] = np.clip(dist[band] / ref[band], 0.0, 1.0)
    a3 = alpha[..., None]
    fg = np.where(a3 > 0.02, (rgb - (1 - a3) * bg) / np.maximum(a3, 0.02), 0)
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def trim(im: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    x0, y0, x1, y1 = im.getchannel('A').getbbox()
    return im.crop((x0, y0, x1, y1)), (x0, y0, x1 - x0, y1 - y0)


def _place(im: Image.Image, w: int, h: int, inner_w: int, inner_h: int) -> Image.Image:
    t, _ = trim(im)
    k = min(inner_w / t.width, inner_h / t.height)
    t = t.resize((max(1, round(t.width * k)), max(1, round(t.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(t, ((w - t.width) // 2, (h - t.height) // 2))
    return out


def fit_square(im: Image.Image, size: int, pad: float = 0.1) -> Image.Image:
    inner = round(size * (1 - 2 * pad))
    return _place(im, size, size, inner, inner)


def fit_long(im: Image.Image, long_side: int, pad: float = 0.04) -> Image.Image:
    t, _ = trim(im)
    m = round(long_side * pad)
    k = (long_side - 2 * m) / max(t.width, t.height)
    ow, oh = round(t.width * k), round(t.height * k)
    return _place(im, ow + 2 * m, oh + 2 * m, ow, oh)


def save_webp(im: Image.Image, path: Path, quality: int = 88, lossless: bool = False) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=quality, lossless=lossless, method=6, exact=False)
    return path.stat().st_size
