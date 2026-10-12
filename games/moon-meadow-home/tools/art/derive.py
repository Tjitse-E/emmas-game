from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .imageops import save_webp


def silhouette(im: Image.Image, colour=(108, 90, 142)) -> Image.Image:
    a = np.asarray(im.convert('RGBA'))[..., 3]
    out = np.zeros((*a.shape, 4), np.uint8)
    out[..., :3] = colour
    out[..., 3] = a
    return Image.fromarray(out, 'RGBA')


def speckle_pattern(out: Path) -> Path:
    rng = np.random.default_rng(3)
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for _ in range(26):
        x, y, r = rng.integers(0, 128), rng.integers(0, 128), rng.integers(3, 7)
        for dx in (-128, 0, 128):          # wrap so the tile repeats without seams
            for dy in (-128, 0, 128):
                d.ellipse([x + dx - r, y + dy - r, x + dx + r, y + dy + r], fill=(150, 110, 80, 200))
    save_webp(im, out, quality=90)
    return out


def sky_unicorn(sil: Image.Image, out: Path) -> Path:
    a = sil.getchannel('A')
    glow = a.filter(ImageFilter.GaussianBlur(8))
    core = Image.new('RGBA', sil.size, (207, 227, 255, 0))
    core.putalpha(Image.eval(a, lambda v: v * 0.55))
    halo = Image.new('RGBA', sil.size, (160, 200, 255, 0))
    halo.putalpha(glow)
    halo.alpha_composite(core)
    save_webp(halo, out, quality=88)
    return out


def lumi_mouth(closed: Image.Image, open_: Image.Image):
    a = np.asarray(closed.convert('RGBA')).astype(int)
    b = np.asarray(open_.convert('RGBA').resize(closed.size)).astype(int)
    diff = np.abs(a[..., :3] - b[..., :3]).sum(-1) > 60
    if diff.mean() > 0.05:
        return None
    ys, xs = np.nonzero(diff)
    if len(xs) == 0:
        return None
    pad = 8
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(a.shape[1], xs.max() + pad + 1), min(a.shape[0], ys.max() + pad + 1)
    box = (int(x0), int(y0), int(x1 - x0), int(y1 - y0))
    return open_.convert('RGBA').resize(closed.size).crop((x0, y0, x1, y1)), box
