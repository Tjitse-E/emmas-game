import numpy as np
from PIL import Image

from .imageops import dilate, label_components

BG, BODY, MANE, MANE2, FIXED = 0, 1, 2, 3, 4
NAMES = {BODY: 'body', MANE: 'mane', MANE2: 'mane2', FIXED: 'fixed'}
CANON = {'body': (217, 198, 240), 'mane': (244, 163, 193), 'mane2': (143, 211, 191)}
FILL_ROUNDS = 80   # wide sheen patches need more than the 12 rounds outlines need
KNOWN_RING = 0.5       # classified share of the ring a pink or green blob needs before it counts as enclosed
KNOWN_RING_FACE = 0.25  # the same next to an eye: a blushed cheek has a soft sheen halo around it
HORN = {'bronze': (196, 132, 82), 'silver': (205, 208, 216), 'pearl': (242, 236, 228)}


def _hsv(rgb: np.ndarray):
    r, g, b = [rgb[..., i] / 255.0 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    v, d = mx, mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(v)
    nz = d > 1e-6
    rc = np.where(nz, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(nz, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(nz, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2 + rc - bc, 4 + gc - rc))
    h = np.where(nz, (h / 6.0) % 1.0, 0) * 360
    return h, s, v


def classify(rgba: Image.Image) -> np.ndarray:
    a = np.asarray(rgba.convert('RGBA'))
    fg = a[..., 3] > 0
    h, s, v = _hsv(a[..., :3].astype(np.float32))
    cls = np.zeros(fg.shape, np.uint8)
    body = fg & (h >= 245) & (h <= 315) & (s >= 0.04) & (s <= 0.5) & (v >= 0.62)
    mane = fg & ((h >= 315) | (h <= 6)) & (s >= 0.15) & (v >= 0.62)
    mane2 = fg & (h >= 135) & (h <= 195) & (s >= 0.18) & (v >= 0.55)
    cls[body], cls[mane], cls[mane2] = BODY, MANE, MANE2
    # Near-white highlights (coat sheen, fluffy fetlocks, mane gloss: pinkish, or nearly no colour at all) belong
    # to whatever they sit on, so they stay unclassified and take the nearest class below. Cream and peach
    # (the muzzle) are more saturated and stay fixed.
    sheen = fg & (cls == 0) & (v >= 0.85) & (((h >= 60) & (s < 0.18)) | (s < 0.06))
    rest = fg & (cls == 0) & (v >= 0.62) & ~sheen
    # Thin light runs (anti-aliasing along an outline) follow their neighbours; only solid areas are fixed.
    rest &= dilate(~dilate(~rest, 2), 2)
    cls[rest] = FIXED
    dark = fg & (v < 0.35)
    lab, n = label_components(dark)
    areas = np.bincount(lab.ravel(), minlength=n + 1)
    eyes = np.isin(lab, [k for k in range(1, n + 1) if areas[k] >= 40])
    cls[dilate(eyes, 2) & fg] = FIXED
    _enclosed_to_fixed(cls, fg, eyes=eyes)
    # Other small mane specks (gloss flecks inside a highlight) are not a part of their own: they take the
    # class around them, like the highlight they sit in.
    for c in (MANE, MANE2):
        total = (cls == MANE).sum() + (cls == MANE2).sum()
        lab, n = label_components(cls == c)
        areas = np.bincount(lab.ravel(), minlength=n + 1)
        small = [k for k in range(1, n + 1) if areas[k] < 0.015 * total]
        cls[np.isin(lab, small)] = 0
    unknown = fg & (cls == 0)
    for _ in range(FILL_ROUNDS):
        if not unknown.any():
            break
        for c in (BODY, MANE, MANE2, FIXED):
            grow = dilate(cls == c, 1) & unknown
            cls[grow] = c
            unknown &= ~grow
    cls[unknown] = FIXED
    return cls


def _enclosed_to_fixed(cls: np.ndarray, fg: np.ndarray, share: float = 0.75, max_part: float = 0.08,
                       eyes: np.ndarray | None = None) -> None:
    """Pink or green blobs that sit inside the coat (blushed cheeks, inner ears) are fixed colour, not mane.
    Unclassified sheen around a blob does not count, but KNOWN_RING of the ring must be classified
    (KNOWN_RING_FACE for a blob within 4 percent of the picture height of an eye, the blushed cheek);
    only blobs below max_part of all mane pixels qualify."""
    H, W = cls.shape
    total = int(((cls == MANE) | (cls == MANE2)).sum())
    ey, ex = np.nonzero(eyes) if eyes is not None else (np.zeros(0, int), np.zeros(0, int))
    m = round(0.04 * H)
    for c in (MANE, MANE2):
        lab, n = label_components(cls == c)
        areas = np.bincount(lab.ravel(), minlength=n + 1)
        for k in range(1, n + 1):
            if areas[k] >= max_part * total:
                continue
            ys, xs = np.nonzero(lab == k)
            y0, y1, x0, x1 = max(0, ys.min() - 3), min(H, ys.max() + 4), max(0, xs.min() - 3), min(W, xs.max() + 4)
            comp = lab[y0:y1, x0:x1] == k
            ring = dilate(comp, 2) & ~comp
            known = ring & ~(fg[y0:y1, x0:x1] & (cls[y0:y1, x0:x1] == 0))
            around = cls[y0:y1, x0:x1][known]
            face = bool(((ey >= y0 - m) & (ey < y1 + m) & (ex >= x0 - m) & (ex < x1 + m)).any())
            need = KNOWN_RING_FACE if face else KNOWN_RING
            if len(around) >= need * ring.sum() and np.isin(around, (BODY, FIXED)).mean() >= share:
                cls[y0:y1, x0:x1][comp] = FIXED


def class_shares(classes: np.ndarray) -> dict[str, float]:
    total = max(1, int((classes > 0).sum()))
    return {name: float((classes == k).sum()) / total for k, name in NAMES.items()}


def extract_layers(rgba: Image.Image, classes: np.ndarray) -> dict[str, Image.Image]:
    a = np.asarray(rgba.convert('RGBA')).astype(np.float32)
    lum = a[..., :3].mean(-1)
    out = {}
    for k in (BODY, MANE, MANE2):
        m = classes == k
        ref = np.percentile(lum[m], 95) if m.any() else 255.0
        shade = np.clip(lum / max(ref, 1.0), 0, 1) * 255
        layer = np.zeros(a.shape, np.uint8)
        layer[..., 0] = layer[..., 1] = layer[..., 2] = shade.astype(np.uint8)
        layer[..., 3] = np.where(m, a[..., 3], 0).astype(np.uint8)
        out[NAMES[k]] = Image.fromarray(layer, 'RGBA')
    fixed = a.copy()
    fixed[..., 3] = np.where(classes == FIXED, a[..., 3], 0)
    out['fixed'] = Image.fromarray(fixed.astype(np.uint8), 'RGBA')
    return out


def tint_layer(shade: Image.Image, colour: tuple[int, int, int]) -> Image.Image:
    """One grey shade layer multiplied by a colour, alpha kept (the browser's multiply plus mask)."""
    s = np.asarray(shade.convert('RGBA')).astype(np.float32)
    rgb = s[..., :3] / 255.0 * np.array(colour, np.float32)
    return Image.fromarray(np.dstack([rgb, s[..., 3]]).astype(np.uint8), 'RGBA')


def recolour(layers: dict[str, Image.Image], colours: dict[str, tuple[int, int, int]]) -> Image.Image:
    base = layers['fixed']
    out = Image.new('RGBA', base.size, (0, 0, 0, 0))
    for name in ('body', 'mane', 'mane2'):
        out.alpha_composite(tint_layer(layers[name], colours[name]))
    out.alpha_composite(base)
    return out


def horn_variant(fixed: Image.Image, classes: np.ndarray, horn: str) -> Image.Image:
    if horn == 'gold':
        return fixed
    a = np.asarray(fixed).astype(np.float32)
    h, s, v = _hsv(a[..., :3])
    gold = (a[..., 3] > 0) & (h >= 25) & (h <= 60) & (s >= 0.25)
    lab, n = label_components(gold)
    if n == 0:
        return fixed
    tops = {k: np.nonzero(lab == k)[0].min() for k in range(1, n + 1)}
    horn_mask = lab == min(tops, key=tops.get)
    lum = a[..., :3].mean(-1)
    ref = np.percentile(lum[horn_mask], 95)
    target = np.array(HORN[horn], np.float32)
    shade = np.clip(lum / max(ref, 1.0), 0, 1)[..., None]
    a[..., :3] = np.where(horn_mask[..., None], shade * target, a[..., :3])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
