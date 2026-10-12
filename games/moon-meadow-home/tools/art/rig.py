from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import regions
from .derive import silhouette
from .imageops import dilate, label_components, save_webp, trim

LG_H, SM_H = 720, 300
FLAT_COLOURS = {'body': (230, 220, 255), 'mane': (255, 127, 191), 'mane2': (63, 214, 154)}   # palette.ts DEFAULT_COLOURS


class DriftError(Exception):
    pass


def _frame(rgba: Image.Image) -> Image.Image:
    t, _ = trim(rgba)
    pad = round(0.02 * max(t.size))
    f = Image.new('RGBA', (t.width + 2 * pad, t.height + 2 * pad), (0, 0, 0, 0))
    f.alpha_composite(t, (pad, pad))
    return f


def _comps(mask: np.ndarray, min_area: int = 1):
    lab, n = label_components(mask)
    out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(xs) >= min_area:
            out.append((xs, ys))
    return out


def _eyes(a: np.ndarray):
    v = a[..., :3].max(-1) / 255.0
    comps = sorted(_comps((a[..., 3] > 0) & (v < 0.35), 40), key=lambda c: -len(c[0]))
    if not comps:
        return []
    keep = [comps[0]]
    if len(comps) > 1 and len(comps[1][0]) >= 0.15 * len(comps[0][0]):
        keep.append(comps[1])
    return keep


def _gold(a: np.ndarray) -> np.ndarray:
    h, s, _ = regions._hsv(a[..., :3].astype(np.float32))
    return (a[..., 3] > 0) & (h >= 25) & (h <= 60) & (s >= 0.25)


def _tail(classes: np.ndarray):
    """Returns (tail mask or None, tail root or None, the other mane components).

    The tail is the leftmost mane component. Curly breeds can touch the mane with a strand along the back;
    then the component is cut at its narrowest column between the rump and the body centre. Thin rims
    (a pink edge down a hind leg) stay in the body part, so only the tail itself swishes."""
    comps = _comps((classes == regions.MANE) | (classes == regions.MANE2), 50)
    by, bx = np.nonzero(classes == regions.BODY)
    cx, cy = bx.mean(), by.mean()
    if not comps:
        return None, None, []
    c = min(comps, key=lambda c: c[0].mean())
    if c[0].mean() >= cx:
        return None, None, comps
    whole = np.zeros(classes.shape, bool)
    whole[c[1], c[0]] = True
    m = whole.copy()
    if c[0].max() > cx:
        x0, x1 = int(bx.min()), int(cx)
        if x1 > x0:
            m[:, x0 + int(np.argmin(m[:, x0:x1].sum(0))):] = False
    m &= dilate(~dilate(~m, 2), 2)
    lab, n = label_components(m)
    if n == 0:
        return None, None, comps
    areas = np.bincount(lab.ravel(), minlength=n + 1)
    areas[0] = 0
    m = lab == int(np.argmax(areas))
    ys, xs = np.nonzero(m)
    i = int(np.argmin((xs - cx) ** 2 + (ys - cy) ** 2))
    others = [x for x in comps if x is not c]
    rest = whole & ~m
    if rest.sum() >= 50:
        ry, rx = np.nonzero(rest)
        others.append((rx, ry))
    return m, (int(xs[i]), int(ys[i])), others


def find_anchors(classes: np.ndarray, rgba: Image.Image) -> dict[str, tuple[int, int]]:
    a = np.asarray(rgba.convert('RGBA'))
    H, W = classes.shape
    eyes = _eyes(a)
    eye = (int(eyes[0][0].mean()), int(eyes[0][1].mean())) if eyes else (int(W * 0.75), int(H * 0.3))
    golds = _comps(_gold(a), 20)
    top = min(golds, key=lambda c: c[1].min()) if golds else None
    horn = (int(top[0].mean()), int(top[1].max())) if top else (eye[0], int(H * 0.1))
    bottom = int(np.nonzero(a[..., 3] > 0)[0].max())
    low = [c for c in golds if c[1].mean() > 0.85 * H]
    feet = (int(np.mean([c[0].mean() for c in low])) if low else W // 2, bottom)
    by, bx = np.nonzero(classes == regions.BODY)
    flank = (int(bx.mean()), int(by.mean()))
    col = by[bx == flank[0]]
    back = (flank[0], int(col.min()) if len(col) else flank[1])
    _, root, others = _tail(classes)
    tail_root = root or (int(bx.min()), flank[1])
    big = max(others, key=lambda c: len(c[0])) if others else None
    mane = (int(big[0].mean()), int(big[1].mean())) if big is not None else horn
    neck = (round(eye[0] + 0.4 * (flank[0] - eye[0])), round(eye[1] + 0.4 * (flank[1] - eye[1])))
    head = (round(horn[0] - 0.06 * W), horn[1])
    return {'head': head, 'hornBase': horn, 'eye': eye, 'neck': neck, 'back': back, 'mane': mane,
            'flank': flank, 'tailRoot': tail_root, 'feet': feet}


def _lids(a: np.ndarray, body_shade: Image.Image) -> Image.Image | None:
    eyes = _eyes(a)
    if not eyes:
        return None
    H, W = a.shape[:2]
    shade = np.asarray(body_shade)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for xs, ys in eyes:
        cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        rx, ry = (xs.max() - xs.min()) / 2 * 1.15 + 1, (ys.max() - ys.min()) / 2 * 1.15 + 1
        y0, y1 = max(0, int(cy - ry - 6)), min(H, int(cy + ry + 7))
        x0, x1 = max(0, int(cx - rx - 6)), min(W, int(cx + rx + 7))
        patch = shade[y0:y1, x0:x1]
        vals = patch[patch[..., 3] > 0][:, 0]
        g = int(np.median(vals)) if len(vals) else 220
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(g, g, g, 255))
        d.arc([cx - rx, cy - ry * 0.4, cx + rx, cy + ry * 1.1], 20, 160, fill=(40, 40, 40, 255),
              width=max(2, int(ry * 0.25)))
    return img


def _box(img: Image.Image):
    b = img.getchannel('A').getbbox()
    return None if b is None else (b[0], b[1], b[2] - b[0], b[3] - b[1])


def _scaled(p, k):
    return [round(v * k) for v in p]


def build_sprite(rgba: Image.Image, breed: str, stage: str, horn: str, out_dir: Path,
                 overrides: dict | None = None) -> dict:
    frame = _frame(rgba)
    cls = regions.classify(frame)
    sh = regions.class_shares(cls)
    if sh['body'] < 0.3 or sh['mane'] + sh['mane2'] < 0.15:
        raise DriftError(f'{breed}.{stage}: colour shares {sh}')
    layers = regions.extract_layers(frame, cls)
    layers['fixed'] = regions.horn_variant(layers['fixed'], cls, horn)
    a = np.asarray(frame)
    H, W = cls.shape
    tail_mask, root, _ = _tail(cls)
    body_layers, tail_layers = [], []
    for name, tint in (('body', 'body'), ('mane', 'mane'), ('mane2', 'mane2'), ('fixed', 'none')):
        arr = np.asarray(layers[name]).copy()
        if tail_mask is not None and name in ('mane', 'mane2'):
            t = arr.copy()
            t[..., 3] = np.where(tail_mask, arr[..., 3], 0)
            arr[..., 3] = np.where(tail_mask, 0, arr[..., 3])
            if t[..., 3].any():
                tail_layers.append((f'tail-{name}', Image.fromarray(t, 'RGBA'), name))
        if arr[..., 3].any():
            body_layers.append((name, Image.fromarray(arr, 'RGBA'), tint))
    lids = _lids(a, layers['body'])
    anchors = find_anchors(cls, frame)
    lg = min(1.0, LG_H / H)
    w, h = round(W * lg), round(H * lg)
    sm = min(1.0, SM_H / h)
    plan = []
    if tail_layers:
        plan.append(('tail', 'tail', False, anchors['tailRoot'], tail_layers))
    plan.append(('body', 'none', False, anchors['feet'], body_layers))
    if lids is not None:
        plan.append(('lids', 'blink', True, anchors['eye'], [('lids', lids, 'body')]))
    out_dir.mkdir(parents=True, exist_ok=True)
    renditions = {}
    for rname, k in (('sm', sm), ('lg', 1.0)):
        parts = []
        for pid, anim, hidden, pivot, lays in plan:
            out_layers = []
            for name, img, tint in lays:
                x, y, bw, bh = _box(img)
                box = _scaled((x, y, bw, bh), lg)
                size = (max(1, round(box[2] * k)), max(1, round(box[3] * k)))
                fname = f'{breed}.{stage}.{rname}.{name}.webp'
                save_webp(img.crop((x, y, x + bw, y + bh)).resize(size, Image.LANCZOS), out_dir / fname, quality=90)
                out_layers.append({'src': f'unicorns/{fname}', 'tint': tint, 'box': box})
            xs = [l['box'][0] for l in out_layers] + [l['box'][0] + l['box'][2] for l in out_layers]
            ys = [l['box'][1] for l in out_layers] + [l['box'][1] + l['box'][3] for l in out_layers]
            part = {'id': pid, 'box': [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)],
                    'pivot': _scaled(pivot, lg), 'anim': anim, 'layers': out_layers}
            if hidden:
                part['hidden'] = True
            parts.append(part)
        renditions[rname] = {'scale': round(k, 4), 'parts': parts}
    union = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    union.putalpha(frame.getchannel('A'))
    sil = silhouette(union).resize((max(1, round(w * sm)), max(1, round(h * sm))), Image.LANCZOS)
    save_webp(sil, out_dir / f'{breed}.{stage}.sil.webp', quality=85)
    # Lite mode (R63): the whole unicorn pre-tinted in the default colours, one picture, at the sm size.
    flat = regions.recolour(layers, FLAT_COLOURS).resize(sil.size, Image.LANCZOS)
    save_webp(flat, out_dir / f'{breed}-{stage}-flat.webp', quality=88)
    anch = {k2: _scaled(v, lg) for k2, v in anchors.items()}
    for k2, v in ((overrides or {}).get(f'{breed}.{stage}', {})).items():
        anch[k2] = list(v)
    side = round(0.55 * h)
    hx = min(max(0, round(anch['eye'][0] - 0.04 * w - side / 2)), max(0, w - side))
    hy = min(max(0, round(anch['eye'][1] - side / 2)), max(0, h - side))
    return {'breed': breed, 'stage': stage, 'mode': 'sprite', 'w': w, 'h': h, 'anchors': anch,
            'headBox': [hx, hy, side, side], 'renditions': renditions,
            'sil': f'unicorns/{breed}.{stage}.sil.webp', 'flat': f'unicorns/{breed}-{stage}-flat.webp', 'source': 'codex'}
