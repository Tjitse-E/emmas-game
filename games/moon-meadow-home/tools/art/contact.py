import html
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def contact_png(items: list[tuple[str, Path]], out: Path, cols: int = 6, cell: int = 220) -> Path:
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 30)), (40, 36, 52))
    font = ImageFont.load_default(size=18)
    d = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(items):
        x, y = (i % cols) * cell, (i // cols) * (cell + 30)
        bg = Image.new('RGB', (cell - 10, cell - 10), (255, 255, 255))
        for cy in range(0, cell - 10, 20):                       # checkerboard shows halos and holes
            for cx in range((cy // 20) % 2 * 20, cell - 10, 40):
                bg.paste((222, 222, 230), (cx, cy, cx + 20, cy + 20))
        im = Image.open(path).convert('RGBA')
        im.thumbnail((cell - 20, cell - 20))
        bg.paste(im, ((cell - 10 - im.width) // 2, (cell - 10 - im.height) // 2), im)
        sheet.paste(bg, (x + 5, y + 5))
        d.text((x + 8, y + cell - 2), label, fill=(255, 255, 255), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def contact_html(manifest: dict, out: Path) -> Path:
    rows = []
    for key, e in manifest.get('pictures', {}).items():
        w = e['w'] // 2
        rows.append(f'<figure><img src="../../public/art/{e["src"]}" width="{w}" alt="">'
                    f'<figcaption>{html.escape(key)}</figcaption></figure>')
    for key, e in manifest.get('backgrounds', {}).items():
        rows.append(f'<figure class="bg"><img src="../../public/art/{e["src"]}" width="1180" alt="">'
                    f'<figcaption>{html.escape(key)}</figcaption></figure>')
    for key, u in manifest.get('unicorns', {}).items():
        if not isinstance(u, dict) or 'sil' not in u or 'w' not in u:
            continue
        rows.append(f'<figure><img src="../../public/art/{u["sil"]}" width="{u["w"] // 4}" alt="">'
                    f'<figcaption>{html.escape(key)}</figcaption></figure>')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
                   '<title>Art contact sheet</title><style>body{background:#f4f1ea;font:14px sans-serif;margin:16px}'
                   'figure{display:inline-block;margin:8px;text-align:center;vertical-align:top}'
                   'figure img{background:repeating-conic-gradient(#e4e4ec 0 25%,#fff 0 50%) 0 0/20px 20px}'
                   '</style>' + '\n'.join(rows) + '\n')
    return out
