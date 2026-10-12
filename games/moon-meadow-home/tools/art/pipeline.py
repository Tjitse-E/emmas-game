"""The art pipeline command line.

Run from the game folder: PYTHONPATH=tools python3 -m art.pipeline <command> [options]
`gen` and `backgrounds` call Codex and run outside the Claude Code sandbox. Every cut picture is looked at by an
agent before its verdict in art-src/review/<batch>.json becomes "ok"; only then does `manifest` take it.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import asdict
from pathlib import Path

import numpy as np
from PIL import Image

from . import checks, codex_gen, contact, imageops, lists, manifest, paths, prompts, review, sheets, vision
from .lists import Entry

SQUARE_KINDS = ('word', 'pin', 'ui')
FOLDERS = {'word': 'words', 'pin': 'pins', 'outfit': 'outfits', 'ui': 'ui', 'bg': 'bg'}
ATTACH = {'head': (0.5, 0.92), 'neck': (0.5, 0.5), 'back': (0.5, 0.35), 'mane': (0.5, 0.5), 'flank': (0.5, 0.5)}
BG_SIZE = (1770, 1230)
# Early style-exploration backgrounds in art-src/ whose file name differs from the list id.
EARLY_BG = {'bg-post-box': 'bg-post-box-corner.png', 'bg-building-yard': 'bg-building-day-yard.png'}
USAGE_LIMIT_WORDS = ('usage limit', 'rate limit', 'quota')


# ---------------------------------------------------------------- helpers

def sheets_dir() -> Path:
    return paths.LISTS / 'sheets'


def cuts_dir() -> Path:
    return paths.WORK / 'cuts'


def contact_dir() -> Path:
    return paths.WORK / 'contact'


def _read_json(p: Path, default):
    return json.loads(p.read_text()) if p.exists() else default


def _write_json(p: Path, data) -> Path:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=1) + '\n')
    return p


def calibration() -> dict:
    cal = _read_json(paths.LISTS / 'calibration.json', None)
    if cal is None:
        print('note: no calibration.json, using a 3 by 3 grid')
        return {'cols': 3, 'rows': 3}
    return cal


def load_list(source: str) -> list[Entry]:
    """`words`, `items`, `requests`, or the name of any other list in art-src/lists/ written as
    `id | step-or-kind | description` (for example words-top for learning's picture top-up)."""
    if source == 'words':
        return lists.load_words()
    if source == 'items':
        return lists.load_items()
    if source == 'requests':
        return lists.load_requests()
    p = paths.LISTS / f'{source}.txt'
    if not p.exists():
        raise SystemExit(f'no list {p}')
    out = []
    for ln in p.read_text().splitlines():
        ln = ln.strip()
        if not ln or ln.startswith('#'):
            continue
        iid, step, desc = [s.strip() for s in ln.split('|', 2)]
        if not paths.is_valid_id(iid):
            raise SystemExit(f'bad id {iid} in {p.name}')
        word = paths.is_word_id(iid)
        kind = 'word' if word else iid.split('-', 1)[0]
        if kind not in lists.KINDS:
            kind = 'item'
        out.append(Entry(iid, kind, 'A', 'words' if word else 'core', 320, desc, None, None,
                         step if word else None, 1))
    return out


def all_verdicts() -> dict[str, str]:
    """Best verdict per id over every review file: ok or swap wins over anything else."""
    best: dict[str, str] = {}
    for f in sorted(paths.REVIEW.glob('*.json')) if paths.REVIEW.exists() else []:
        for i, v in json.loads(f.read_text()).items():
            if not is_done(best.get(i)) and (is_done(v) or i not in best):
                best[i] = v
    return best


def is_done(v: str | None) -> bool:
    return v is not None and (v == 'ok' or v.startswith('swap:'))


def load_batch(batch: str) -> dict:
    p = sheets_dir() / f'{batch}.json'
    if not p.exists():
        raise SystemExit(f'no planned batch {batch} (run plan-sheets first)')
    return json.loads(p.read_text())


def batch_specs(data: dict) -> list[sheets.SheetSpec]:
    return [sheets.SheetSpec(s['id'], s['cols'], s['rows'], s['ids'], s['descs'], s['grey']) for s in data['sheets']]


def batch_entries(data: dict) -> dict[str, Entry]:
    return {k: Entry(**v) for k, v in data['entries'].items()}


def save_batch(batch: str, source: str, specs: list[sheets.SheetSpec], entries: list[Entry]) -> Path:
    return _write_json(sheets_dir() / f'{batch}.json', {
        'batch': batch, 'source': source,
        'sheets': [{'id': s.id, 'cols': s.cols, 'rows': s.rows, 'ids': s.ids, 'descs': s.descs, 'grey': s.grey}
                   for s in specs],
        'entries': {e.id: asdict(e) for e in entries},
    })


def base_batch(batch: str) -> tuple[str, int]:
    """'words-a-r2' -> ('words-a', 2); 'words-a' -> ('words-a', 0)."""
    head, sep, tail = batch.rpartition('-r')
    if sep and tail.isdigit():
        return head, int(tail)
    return batch, 0


def raw_sheet(sheet_id: str) -> Path | None:
    """The generated PNG; restored from the committed lossless source when art-src/raw/ was cleaned."""
    raw = paths.RAW / f'{sheet_id}.png'
    if raw.exists():
        return raw
    src = paths.SOURCES / f'{sheet_id}.webp'
    if src.exists():
        raw.parent.mkdir(parents=True, exist_ok=True)
        Image.open(src).save(raw)
        return raw
    return None


def fit(im: Image.Image, e: Entry) -> Image.Image:
    if e.kind in SQUARE_KINDS:
        return imageops.fit_square(im, e.size, pad=0.1)
    return imageops.fit_long(im, e.size, pad=0.04)


def picture_entry(e: Entry, out: Image.Image, src: str, source: str) -> dict:
    entry = {'src': src, 'w': out.width, 'h': out.height, 'kind': e.kind, 'pack': e.pack, 'source': source}
    if e.tint:
        entry['tint'] = {'default': e.tint}
    if e.kind == 'outfit' and e.slot:
        fx, fy = ATTACH[e.slot]
        entry['slot'] = e.slot
        entry['attach'] = [round(fx * out.width), round(fy * out.height)]
    return entry


def folder_for(kind: str) -> str:
    return FOLDERS.get(kind, 'items')


def codex_bin(args) -> str:
    return getattr(args, 'codex_bin', None) or os.environ.get('CODEX_BIN') or 'codex'


def report_failures(results: list[codex_gen.JobResult]) -> int:
    failed = [r for r in results if not r.ok]
    for r in failed:
        print(f'{r.id}: failed after {r.attempts} tries: {r.error}')
        if any(w in r.error.lower() for w in USAGE_LIMIT_WORDS):
            print(f'{r.id}: Codex usage limit reached. Wait (at most 60 minutes), then run the same command again.')
    return len(failed)


# ---------------------------------------------------------------- commands

def cmd_plan_sheets(args) -> int:
    entries = load_list(args.source)
    if args.wave:
        entries = [e for e in entries if e.wave == args.wave]
    if args.kinds:
        kinds = set(args.kinds.split(','))
        entries = [e for e in entries if e.kind in kinds]
    if args.packs:
        packs = set(args.packs.split(','))
        entries = [e for e in entries if e.pack in packs]
    if args.ids:
        wanted = args.ids.split(',')
        entries = [e for e in entries if e.id in wanted]
    done = all_verdicts()
    svg_only = [e for e in entries if e.desc.startswith('svg:')]
    todo = [e for e in entries if not e.desc.startswith('svg:') and not is_done(done.get(e.id))]
    cal = calibration()
    specs = sheets.plan_sheets(args.batch, todo, cal['cols'], cal['rows'])
    save_batch(args.batch, args.source, specs, todo + svg_only)
    if svg_only:
        review.init(args.batch, [], paths.REVIEW)
        verdicts = review.load(args.batch, paths.REVIEW)
        for e in svg_only:
            if not is_done(verdicts.get(e.id)):
                verdicts[e.id] = 'svg'
        _write_json(paths.REVIEW / f'{args.batch}.json', verdicts)
    for s in specs:
        print(f'{s.id}: {len(s.ids)} pictures{" (grey)" if s.grey else ""}: {" ".join(s.ids)}')
    for e in svg_only:
        print(f'{e.id}: svg')
    print(f'{len(specs)} sheets, {len(todo)} pictures, {len(svg_only)} svg, '
          f'{len(entries) - len(todo) - len(svg_only)} already ok')
    return 0


def cmd_gen(args) -> int:
    data = load_batch(args.batch)
    specs = batch_specs(data)
    if args.only:
        only = set(args.only.split(','))
        specs = [s for s in specs if s.id in only]
    jobs = []
    for s in specs:
        raw_sheet(s.id)  # restores a committed source, so a done sheet is never generated again
        jobs.append(codex_gen.Job(s.id, prompts.sheet_prompt(s.descs, s.cols, s.rows, s.id, grey=s.grey),
                                  [paths.STYLE_REF], paths.RAW / f'{s.id}.png'))
    results = codex_gen.run_jobs(jobs, parallel=args.parallel, codex_bin=codex_bin(args),
                                 work_dir=paths.WORK / 'codex', ledger=paths.JOBS / f'{args.batch}.jsonl')
    for r in results:
        if r.ok:
            src = paths.SOURCES / f'{r.id}.webp'
            if not src.exists():
                imageops.save_webp(Image.open(r.out), src, lossless=True)
            print(f'{r.id}: ok ({r.attempts} tries, {r.seconds:.0f} s)')
    failed = report_failures(results)
    print(f'{len(results) - failed} sheets generated, {failed} failed')
    return 1 if failed else 0


def cmd_cut(args) -> int:
    data = load_batch(args.batch)
    entries = batch_entries(data)
    meta_path = paths.META / f'{args.batch}.json'
    meta = _read_json(meta_path, {})
    meta.setdefault('pictures', {})
    issues_all: dict[str, list[str]] = {}
    use_vision = vision.available()
    if not use_vision:
        print('note: Apple Vision is not available (run outside the sandbox to check for text)')
    cut_ids: list[str] = []
    missing_ids: list[str] = []
    for spec in batch_specs(data):
        raw = raw_sheet(spec.id)
        if raw is None:
            print(f'{spec.id}: not generated')
            continue
        shown: list[tuple[str, Path]] = []
        for c in sheets.cut_sheet(Image.open(raw), spec):
            e = entries[c.id]
            if c.image is None:
                issues_all[c.id] = c.issues
                missing_ids.append(c.id)
                print(f'{c.id}: missing')
                continue
            out = fit(c.image, e)
            rel = f'{folder_for(e.kind)}/{c.id}.webp'
            dest = paths.PUBLIC_ART / rel
            imageops.save_webp(out, dest)
            issues = list(c.issues)
            issues += checks.check_picture(out, source_long_side=c.source_long_side, grey=spec.grey)
            issues += checks.check_file(dest, checks.max_bytes_for(e.kind, e.size))
            if use_vision and vision.detect_text(dest):
                issues.append('text')
            issues_all[c.id] = issues
            meta['pictures'][c.id] = picture_entry(e, out, rel, 'codex')
            cut_ids.append(c.id)
            shown.append((c.id, dest))
            print(f'{c.id}: {rel}{" " + ",".join(issues) if issues else ""}')
        if shown:
            sheet_png = contact.contact_png(shown, contact_dir() / f'{spec.id}.png')
            print(f'{spec.id}: contact sheet {sheet_png}')
    _write_json(meta_path, meta)
    _write_json(cuts_dir() / f'{args.batch}.json', issues_all)
    review.init(args.batch, cut_ids, paths.REVIEW)
    if missing_ids:
        verdicts = review.load(args.batch, paths.REVIEW)
        for i in missing_ids:
            if not is_done(verdicts.get(i)):
                verdicts[i] = 'redo'
        _write_json(paths.REVIEW / f'{args.batch}.json', verdicts)
    flagged = sum(1 for v in issues_all.values() if v)
    print(f'{len(cut_ids)} pictures cut, {len(missing_ids)} missing, {flagged} with issues')
    return 0


def cmd_review(args) -> int:
    data = load_batch(args.batch)
    for s in data['sheets']:
        p = contact_dir() / f'{s["id"]}.png'
        if p.exists():
            print(f'{s["id"]}: {p}')
    issues = _read_json(cuts_dir() / f'{args.batch}.json', {})
    pending = [i for i, v in review.load(args.batch, paths.REVIEW).items() if v == 'pending']
    for i in pending:
        print(f'{i}: pending{" (" + ",".join(issues[i]) + ")" if issues.get(i) else ""}')
    print(f'{len(pending)} pending')
    return 0


def cmd_redo(args) -> int:
    data = load_batch(args.batch)
    entries = batch_entries(data)
    base, round_no = base_batch(args.batch)
    issues = _read_json(cuts_dir() / f'{args.batch}.json', {})
    verdicts = review.load(args.batch, paths.REVIEW)
    ids = [i for i, v in verdicts.items() if v == 'redo']
    ids += [i for i, v in issues.items() if 'missing' in v and i not in ids and not is_done(verdicts.get(i))]
    ids = [i for i in ids if i in entries]
    if not ids:
        print('0 pictures to redo')
        return 0
    if round_no >= 2:
        base_verdicts = review.load(base, paths.REVIEW)
        for i in ids:
            base_verdicts[i] = 'svg'
            print(f'{i}: svg (failed twice)')
        _write_json(paths.REVIEW / f'{base}.json', base_verdicts)
        print(f'{len(ids)} pictures go to svg in {base}')
        return 0
    nxt = f'{base}-r{round_no + 1}'
    todo = [entries[i] for i in ids]
    cal = calibration()
    specs = sheets.plan_sheets(nxt, todo, cal['cols'], cal['rows'])
    save_batch(nxt, data.get('source', ''), specs, todo)
    for s in specs:
        print(f'{s.id}: {len(s.ids)} pictures: {" ".join(s.ids)}')
    print(f'{len(ids)} pictures planned again as {nxt}')
    return 0


def render_svg(svg: Path, png: Path) -> bool:
    png.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(['magick', '-background', 'none', '-density', '384', str(svg), str(png)], capture_output=True)
    return r.returncode == 0 and png.exists()


def cmd_svg(args) -> int:
    base, _ = base_batch(args.batch)
    data = load_batch(base)
    entries = batch_entries(data)
    for f in sorted(sheets_dir().glob(f'{base}-r*.json')):
        entries.update(batch_entries(json.loads(f.read_text())))
    verdicts = review.load(args.batch, paths.REVIEW)
    meta_path = paths.META / f'{args.batch}-svg.json'
    meta = _read_json(meta_path, {})
    meta.setdefault('pictures', {})
    done = undrawn = 0
    for i, v in verdicts.items():
        if v != 'svg' or i not in entries:
            continue
        src = paths.SVG / f'{i}.svg'
        if not src.exists():
            print(f'{i}: no svg drawn yet ({src.relative_to(paths.GAME)})')
            undrawn += 1
            continue
        png = paths.WORK / 'svg' / f'{i}.png'
        if not render_svg(src, png):
            print(f'{i}: magick could not render {src.name}')
            undrawn += 1
            continue
        e = entries[i]
        im = Image.open(png).convert('RGBA')
        if im.getchannel('A').getbbox() is None:
            print(f'{i}: the svg is empty')
            undrawn += 1
            continue
        out = fit(im, e)
        rel = f'{folder_for(e.kind)}/{i}.webp'
        imageops.save_webp(out, paths.PUBLIC_ART / rel)
        meta['pictures'][i] = picture_entry(e, out, rel, 'svg')
        done += 1
        print(f'{i}: {rel}')
    _write_json(meta_path, meta)
    print(f'{done} svg pictures, {undrawn} not drawn')
    return 1 if undrawn else 0


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = size
    k = max(w / im.width, h / im.height)
    r = im.resize((max(w, round(im.width * k)), max(h, round(im.height * k))), Image.LANCZOS)
    x, y = (r.width - w) // 2, (r.height - h) // 2
    return r.crop((x, y, x + w, y + h))


def dominant(im: Image.Image) -> str:
    a = np.asarray(im.convert('RGB'))[-10:].reshape(-1, 3)
    m = np.median(a, axis=0).astype(int)
    return '#%02x%02x%02x' % tuple(int(v) for v in m)


def cmd_backgrounds(args) -> int:
    bgs = lists.load_backgrounds()
    if args.wave:
        bgs = [b for b in bgs if b.wave == args.wave]
    if args.ids:
        wanted = args.ids.split(',')
        bgs = [b for b in bgs if b.id in wanted]
    done = all_verdicts()
    bgs = [b for b in bgs if not is_done(done.get(b.id))]
    jobs = []
    for b in bgs:
        raw = paths.RAW / f'{b.id}.png'
        early = paths.SRC / EARLY_BG.get(b.id, f'{b.id}.png')
        if args.use_early and not raw.exists() and early.exists():
            raw.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(early, raw)
            print(f'{b.id}: using the early picture {early.name}')
        raw_sheet(b.id)
        jobs.append(codex_gen.Job(b.id, prompts.background_prompt(b.desc, b.id), [paths.STYLE_REF], raw))
    results = codex_gen.run_jobs(jobs, parallel=args.parallel, codex_bin=codex_bin(args),
                                 work_dir=paths.WORK / 'codex', ledger=paths.JOBS / f'{args.batch}.jsonl')
    by_id = {b.id: b for b in bgs}
    meta_path = paths.META / f'{args.batch}.json'
    meta = _read_json(meta_path, {})
    meta.setdefault('backgrounds', {})
    shown: list[tuple[str, Path]] = []
    for r in results:
        if not r.ok:
            continue
        b = by_id[r.id]
        im = Image.open(r.out).convert('RGB')
        src = paths.SOURCES / f'{b.id}.webp'
        if not src.exists():
            imageops.save_webp(im, src, lossless=True)
        out = cover(im, BG_SIZE)
        rel = f'bg/{b.id}.webp'
        dest = paths.PUBLIC_ART / rel
        imageops.save_webp(out, dest, quality=82)
        meta['backgrounds'][b.id] = {'src': rel, 'w': BG_SIZE[0], 'h': BG_SIZE[1], 'pack': b.pack,
                                     'dominant': dominant(out), 'source': 'codex'}
        heavy = checks.check_file(dest, checks.max_bytes_for('bg', BG_SIZE[0]))
        shown.append((b.id, dest))
        print(f'{b.id}: {rel}{" heavy" if heavy else ""}')
    _write_json(meta_path, meta)
    if shown:
        print(f'contact sheet {contact.contact_png(shown, contact_dir() / f"{args.batch}.png", cols=3, cell=400)}')
    review.init(args.batch, [i for i, _ in shown], paths.REVIEW)
    failed = report_failures(results)
    print(f'{len(shown)} backgrounds, {failed} failed')
    return 1 if failed else 0


def rig_mode() -> str:
    return _read_json(paths.LISTS / 'rig-mode.json', {}).get('mode', 'sprite')


def list_ids() -> list[str]:
    ids = [w.id for w in lists.load_words()] + [i.id for i in lists.load_items()]
    return ids + [b.id for b in lists.load_backgrounds()]


def cmd_manifest(args) -> int:
    try:
        data, left_out = manifest.build(paths.META, paths.REVIEW, paths.PUBLIC_ART, rig_mode(), strict=args.strict)
    except manifest.ManifestError as e:
        print(f'manifest error: {e}')
        return 1
    paths.PUBLIC_ART.mkdir(parents=True, exist_ok=True)
    p = manifest.write(paths.PUBLIC_ART, data)
    have = set(data['pictures']) | set(data['backgrounds'])
    missing = [i for i in list_ids() if i not in have]
    _write_json(paths.SRC / 'missing.json', missing)
    for i in left_out:
        print(f'{i}: left out (no ok verdict)')
    print(f'{p.relative_to(paths.GAME)}: {len(data["pictures"])} pictures, {len(data["backgrounds"])} backgrounds, '
          f'{len(data["unicorns"])} unicorns, {len(left_out)} left out, {len(missing)} list ids missing')
    return 0


def cmd_check_all(args) -> int:
    m = _read_json(paths.PUBLIC_ART / 'manifest.json', None)
    if m is None:
        print('no manifest')
        return 1
    bad = 0
    for key, e in m['pictures'].items():
        f = paths.PUBLIC_ART / e['src']
        if not f.exists():
            print(f'{key}: file {e["src"]} is gone')
            bad += 1
            continue
        issues = checks.check_picture(Image.open(f), source_long_side=10_000, grey='tint' in e)
        issues += checks.check_file(f, checks.max_bytes_for(e['kind'], max(e['w'], e['h'])))
        if issues:
            print(f'{key}: {",".join(issues)}{"" if e.get("source") == "codex" else " (" + e["source"] + ", note only)"}')
            bad += e.get('source') == 'codex'
    for key, e in m['backgrounds'].items():
        f = paths.PUBLIC_ART / e['src']
        issues = checks.check_file(f, checks.max_bytes_for('bg', e['w'])) if f.exists() else ['gone']
        if issues:
            print(f'{key}: {",".join(issues)}')
            bad += 1
    words_missing = [w.id for w in lists.load_words() if w.id not in m['pictures']]
    for w in words_missing:
        print(f'{w}: word has no picture')
    print(f'{len(m["pictures"])} pictures checked, {bad} with issues, {len(words_missing)} words missing')
    return 1 if bad or words_missing else 0


def cmd_contact_html(args) -> int:
    m = _read_json(paths.PUBLIC_ART / 'manifest.json', {'pictures': {}, 'backgrounds': {}, 'unicorns': {}})
    out = contact.contact_html(m, paths.CONTACT / 'index.html')
    print(f'{out.relative_to(paths.GAME)}: {len(m["pictures"]) + len(m["backgrounds"])} pictures')
    return 0


def cmd_status(args) -> int:
    files = sorted(sheets_dir().glob('*.json')) if sheets_dir().exists() else []
    for f in files:
        data = json.loads(f.read_text())
        batch = data['batch']
        planned = sum(len(s['ids']) for s in data['sheets'])
        generated = sum(len(s['ids']) for s in data['sheets']
                        if (paths.RAW / f'{s["id"]}.png').exists() or (paths.SOURCES / f'{s["id"]}.webp').exists())
        cut = len(_read_json(paths.META / f'{batch}.json', {}).get('pictures', {}))
        v = list(review.load(batch, paths.REVIEW).values())
        count = {k: sum(1 for x in v if x == k or (k == 'ok' and x.startswith('swap:')))
                 for k in ('ok', 'redo', 'svg', 'pending')}
        print(f'{batch}: planned {planned}, generated {generated}, cut {cut}, ok {count["ok"]}, '
              f'redo {count["redo"]}, svg {count["svg"]}, pending {count["pending"]}')
    print(f'{len(files)} batches')
    return 0


def cmd_later(task: str):
    def run(args) -> int:
        print(f'{args.command} is added in {task}')
        return 2
    return run


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog='art.pipeline', description='Moon Meadow Home art pipeline')
    sub = p.add_subparsers(dest='command', required=True)

    def add(name, fn, *opts):
        s = sub.add_parser(name)
        for o in opts:
            o(s)
        s.set_defaults(fn=fn)
        return s

    batch = lambda s: s.add_argument('--batch', required=True)  # noqa: E731
    par = lambda s: s.add_argument('--parallel', type=int, default=4)  # noqa: E731
    cbin = lambda s: s.add_argument('--codex-bin', default=None)  # noqa: E731
    wave = lambda s: s.add_argument('--wave', choices=('A', 'B', 'C'))  # noqa: E731
    ids = lambda s: s.add_argument('--ids', help='comma separated ids')  # noqa: E731

    s = add('plan-sheets', cmd_plan_sheets, batch, wave, ids)
    s.add_argument('--source', required=True, help='words, items, requests or another list name')
    s.add_argument('--kinds')
    s.add_argument('--packs')
    s = add('gen', cmd_gen, batch, par, cbin)
    s.add_argument('--only', help='comma separated sheet ids')
    add('cut', cmd_cut, batch)
    add('review', cmd_review, batch)
    add('redo', cmd_redo, batch)
    add('svg', cmd_svg, batch)
    s = add('backgrounds', cmd_backgrounds, batch, wave, ids, par, cbin)
    s.add_argument('--use-early', action='store_true',
                   help='start from the early style pictures in art-src/ instead of a new Codex run')
    s = add('sprite', cmd_later('Task A8'))
    s.add_argument('--breed')
    s.add_argument('--stage')
    s.add_argument('--source')
    add('derive', cmd_later('Task A8'))
    s = add('manifest', cmd_manifest)
    s.add_argument('--strict', action='store_true')
    add('check-all', cmd_check_all)
    add('contact-html', cmd_contact_html)
    add('status', cmd_status)
    return p


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    return args.fn(args)


if __name__ == '__main__':
    sys.exit(main())
