"""Placeholder unicorn art for the first meadow stress run (art Task A8).

Greyscale ellipses in 12 layers per unicorn (more layers than the sprite rig uses, so the stress test is a
worst case), a moonflower, a meadow gradient and a speckle tile. Every src starts with 'placeholder/', so
`artUrl` finds the files under public/art/placeholder/ like real art.
"""
import json
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import regions
from .derive import silhouette, speckle_pattern
from .imageops import save_webp

W, H = 400, 330
SCALES = {'sm': 0.75, 'lg': 1.0}
KEYS = (('moon', 'baby'), ('moon', 'foal'), ('pebble', 'baby'))
FLAT_COLOURS = {'body': (230, 220, 255), 'mane': (255, 127, 191), 'mane2': (63, 214, 154)}   # palette.ts DEFAULT_COLOURS
GOLD, GOLD_LINE = (226, 178, 80, 255), (170, 120, 40, 255)


def _canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def _shade(boxes: list[list[int]]) -> Image.Image:
    """Grey shade layer: light fill, darker outline, so multiply keeps a visible outline."""
    im, d = _canvas()
    for b in boxes:
        d.ellipse(b, fill=(150, 150, 150, 255))
    for b in boxes:
        d.ellipse([b[0] + 4, b[1] + 4, b[2] - 4, b[3] - 4], fill=(238, 238, 238, 255))
    return im


def _layers(stage: str) -> list[tuple[str, str, str, Image.Image]]:
    """(part, layer name, tint, full-frame image) in draw order."""
    lift = 0 if stage == 'baby' else -12      # a foal stands a little taller
    out = []
    out.append(('tail', 'tail-mane', 'mane', _shade([[20, 110, 110, 220]])))
    out.append(('tail', 'tail-mane2', 'mane2', _shade([[42, 132, 88, 198]])))
    for part, box in (('legBL', [110, 215 + lift, 150, 322]), ('legBR', [150, 222 + lift, 186, 322]),
                      ('legFL', [228, 215 + lift, 264, 322]), ('legFR', [264, 222 + lift, 300, 322])):
        out.append((part, 'body', 'body', _shade([box])))
    out.append(('body', 'body', 'body', _shade([[80, 118 + lift, 300, 262 + lift], [236, 36 + lift, 352, 152 + lift]])))
    out.append(('body', 'mane', 'mane', _shade([[198, 46 + lift, 272, 176 + lift]])))
    out.append(('body', 'mane2', 'mane2', _shade([[214, 70 + lift, 252, 140 + lift]])))
    fixed, d = _canvas()
    d.ellipse([294, 80 + lift, 312, 98 + lift], fill=(50, 30, 70, 255))
    d.ellipse([318, 104 + lift, 350, 132 + lift], fill=(255, 226, 214, 255), outline=(200, 140, 120, 255), width=3)
    for x0, x1 in ((112, 148), (152, 184), (230, 262), (266, 298)):
        d.rectangle([x0, 310, x1, 328], fill=GOLD, outline=GOLD_LINE, width=2)
    out.append(('body', 'fixed', 'none', fixed))
    lids, d = _canvas()
    d.ellipse([291, 77 + lift, 315, 101 + lift], fill=(238, 238, 238, 255))
    d.arc([291, 85 + lift, 315, 103 + lift], 20, 160, fill=(40, 40, 40, 255), width=3)
    out.append(('lids', 'lids', 'body', lids))
    horn, d = _canvas()
    d.polygon([(300, 50 + lift), (318, 2), (332, 50 + lift)], fill=GOLD, outline=GOLD_LINE)
    out.append(('horn', 'horn', 'none', horn))
    return out


PARTS = {  # id: (anim, hidden, pivot)
    'tail': ('tail', False, (98, 150)), 'legBL': ('leg', False, (130, 225)), 'legBR': ('leg', False, (168, 230)),
    'legFL': ('leg', False, (246, 225)), 'legFR': ('leg', False, (282, 230)), 'body': ('none', False, (200, 330)),
    'lids': ('blink', True, (303, 89)), 'horn': ('none', False, (316, 50)),
}


def _bbox(im: Image.Image) -> list[int]:
    b = im.getchannel('A').getbbox()
    return [b[0], b[1], b[2] - b[0], b[3] - b[1]]


def _unicorn(breed: str, stage: str, out_dir: Path) -> dict:
    layers = _layers(stage)
    renditions = {}
    for rname, k in SCALES.items():
        parts: dict[str, dict] = {}
        for part, name, tint, img in layers:
            box = _bbox(img)
            x, y, w, h = box
            fname = f'{breed}.{stage}.{rname}.{part}-{name}.webp'
            crop = img.crop((x, y, x + w, y + h)).resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
            save_webp(crop, out_dir / fname, quality=90)
            anim, hidden, pivot = PARTS[part]
            p = parts.setdefault(part, {'id': part, 'box': box, 'pivot': list(pivot), 'anim': anim, 'layers': []})
            if hidden:
                p['hidden'] = True
            p['layers'].append({'src': f'placeholder/{fname}', 'tint': tint, 'box': box})
        for p in parts.values():
            xs = [l['box'][0] for l in p['layers']] + [l['box'][0] + l['box'][2] for l in p['layers']]
            ys = [l['box'][1] for l in p['layers']] + [l['box'][1] + l['box'][3] for l in p['layers']]
            p['box'] = [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]
        renditions[rname] = {'scale': k, 'parts': list(parts.values())}
    union = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for part, _, _, img in layers:
        if not PARTS[part][1]:
            union.alpha_composite(img)
    sm = SCALES['sm']
    small = (round(W * sm), round(H * sm))
    save_webp(silhouette(union).resize(small, Image.LANCZOS), out_dir / f'{breed}.{stage}.sil.webp', quality=85)
    flat = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for part, _, tint, img in layers:
        if PARTS[part][1]:
            continue
        flat.alpha_composite(img if tint == 'none' else regions.tint_layer(img, FLAT_COLOURS[tint]))
    save_webp(flat.resize(small, Image.LANCZOS), out_dir / f'{breed}-{stage}-flat.webp', quality=88)
    return {'breed': breed, 'stage': stage, 'mode': 'sprite', 'w': W, 'h': H,
            'anchors': {'head': [296, 44], 'hornBase': [316, 50], 'eye': [303, 89], 'neck': [262, 138], 'back': [190, 118],
                        'mane': [234, 110], 'flank': [190, 190], 'tailRoot': [98, 150], 'feet': [205, 328]},
            'headBox': [218, 0, 182, 182], 'renditions': renditions, 'sil': f'placeholder/{breed}.{stage}.sil.webp',
            'flat': f'placeholder/{breed}-{stage}-flat.webp', 'source': 'placeholder'}


def _moonflower(path: Path) -> None:
    im = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(6):
        a = i * np.pi / 3
        cx, cy = 48 + 24 * np.cos(a), 48 + 24 * np.sin(a)
        d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=(120, 170, 240, 255), outline=(70, 110, 190, 255), width=2)
    d.ellipse([34, 34, 62, 62], fill=(250, 226, 120, 255))
    save_webp(im, path, quality=88)


def _meadow(path: Path) -> None:
    w, h = 1770, 1230
    y = np.linspace(0, 1, h)[:, None]
    sky = np.array([200, 228, 250], np.float32)
    grass = np.array([150, 205, 130], np.float32)
    t = np.clip((y - 0.25) / 0.2, 0, 1)
    rgb = (sky * (1 - t) + grass * t)[:, None, :].repeat(w, 1).reshape(h, w, 3)
    save_webp(Image.fromarray(rgb.astype(np.uint8), 'RGB'), path, quality=82)


def build(out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    unicorns = {f'{b}.{s}': _unicorn(b, s, out_dir) for b, s in KEYS}
    _moonflower(out_dir / 'decor-moonflower.webp')
    _meadow(out_dir / 'bg-meadow.webp')
    speckle_pattern(out_dir / 'speckle.webp')
    m = {'v': 1, 'built': time.strftime('%Y-%m-%dT%H:%M:%S'), 'rigMode': 'sprite',
         'pictures': {'decor-moonflower': {'src': 'placeholder/decor-moonflower.webp', 'w': 96, 'h': 96, 'kind': 'decor',
                                           'pack': 'meadow', 'source': 'svg'}},
         'backgrounds': {'bg-meadow': {'src': 'placeholder/bg-meadow.webp', 'w': 1770, 'h': 1230, 'pack': 'meadow',
                                       'dominant': '#96cd82', 'source': 'svg'}},
         'unicorns': unicorns, 'lumi': None, 'patterns': {'speckle': 'placeholder/speckle.webp'}}
    (out_dir / 'manifest.json').write_text(json.dumps(m, indent=1) + '\n')
    return m
