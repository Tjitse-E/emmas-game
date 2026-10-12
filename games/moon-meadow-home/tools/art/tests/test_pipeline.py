# tools/art/tests/test_pipeline.py
import contextlib
import io
import json
import shutil
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image, ImageDraw

from art import paths, pipeline

# A Codex stand-in: draws the asked grid of separate discs (grey when asked), or a landscape for a background.
STUB = r'''#!/usr/bin/env python3
import re, sys
from PIL import Image, ImageDraw
prompt = sys.argv[5]
stem = re.search(r'Save it as (\S+)\.png', prompt).group(1)
if 'landscape' in prompt:
    im = Image.new('RGB', (1536, 1024), (150, 200, 120))
    im.save(stem + '.png')
    sys.exit(0)
cols, rows = map(int, re.search(r'grid of (\d+) columns and (\d+) rows', prompt).groups())
n = len(re.findall(r'^\d+\. ', prompt, re.M))
cell = 300
im = Image.new('RGB', (cols * cell, rows * cell), (252, 252, 250))
d = ImageDraw.Draw(im)
grey = 'light grey only' in prompt
for i in range(n):
    cx, cy = (i % cols) * cell + cell // 2, (i // cols) * cell + cell // 2
    fill = (205, 205, 205) if grey else (60 + 40 * i, 120, 220 - 30 * i)
    out = (120, 120, 120) if grey else (30, 40, 90)
    d.ellipse([cx - 110, cy - 110, cx + 110, cy + 110], fill=fill, outline=out, width=6)
im.save(stem + '.png')
'''

ITEMS = '''# Wave A
item-a | item | A | core | 320 | - | - | a thing
item-b | item | A | core | 320 | - | - | another thing
item-c | item | A | meadow | 320 | - | - | a third thing
outfit-d | outfit | A | core | 320 | - | head | a hat
item-e | item | A | core | 320 | #ff6fa8 | - | a tinted thing
ui-f | ui | A | core | 192 | - | - | svg: a drawn button
item-g | item | B | post | 320 | - | - | a wave B thing
'''

SVG = ('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">'
       '<circle cx="50" cy="50" r="40" fill="#8fd18f" stroke="#3f7f3f" stroke-width="4"/></svg>')


class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        game = Path(self.tmp.name) / 'game'
        src = game / 'art-src'
        names = {'GAME': game, 'SRC': src, 'LISTS': src / 'lists', 'RAW': src / 'raw', 'SOURCES': src / 'sources',
                 'META': src / 'meta', 'REVIEW': src / 'review', 'SVG': src / 'svg', 'WORK': src / 'work',
                 'JOBS': src / 'jobs', 'CONTACT': src / 'contact', 'PUBLIC_ART': game / 'public/art'}
        self.patches = [mock.patch.object(paths, k, v) for k, v in names.items()]
        for p in self.patches:
            p.start()
        paths.LISTS.mkdir(parents=True)
        (paths.LISTS / 'items.txt').write_text(ITEMS)
        (paths.LISTS / 'calibration.json').write_text(json.dumps({'cols': 2, 'rows': 2}))
        self.stub = Path(self.tmp.name) / 'codex-stub'
        self.stub.write_text(STUB)
        self.stub.chmod(self.stub.stat().st_mode | stat.S_IEXEC)

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def run_cmd(self, *argv):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = pipeline.main(list(argv))
        return code, buf.getvalue()

    def verdicts(self, batch):
        return json.loads((paths.REVIEW / f'{batch}.json').read_text())

    def set_verdicts(self, batch, **v):
        cur = self.verdicts(batch)
        cur.update({k.replace('_', '-'): x for k, x in v.items()})
        (paths.REVIEW / f'{batch}.json').write_text(json.dumps(cur))

    def test_status_with_nothing(self):
        self.assertEqual(self.run_cmd('status'), (0, '0 batches\n'))

    def test_plan_sheets_filters_and_marks_svg(self):
        code, out = self.run_cmd('plan-sheets', '--batch', 'it', '--source', 'items', '--wave', 'A')
        self.assertEqual(code, 0)
        plan = json.loads((paths.LISTS / 'sheets/it.json').read_text())
        self.assertEqual([s['ids'] for s in plan['sheets']],
                         [['item-a', 'item-b', 'item-c', 'outfit-d'], ['item-e']])
        self.assertEqual([s['grey'] for s in plan['sheets']], [False, True])
        self.assertEqual(self.verdicts('it'), {'ui-f': 'svg'})
        self.assertIn('2 sheets, 5 pictures, 1 svg', out)

    def test_whole_run_from_plan_to_manifest(self):
        self.run_cmd('plan-sheets', '--batch', 'it', '--source', 'items', '--wave', 'A')
        code, out = self.run_cmd('gen', '--batch', 'it', '--codex-bin', str(self.stub))
        self.assertEqual(code, 0, out)
        self.assertTrue((paths.SOURCES / 'it-01.webp').exists())

        code, out = self.run_cmd('cut', '--batch', 'it')
        self.assertEqual(code, 0, out)
        meta = json.loads((paths.META / 'it.json').read_text())['pictures']
        self.assertEqual(set(meta), {'item-a', 'item-b', 'item-c', 'outfit-d', 'item-e'})
        self.assertEqual(meta['item-e']['tint'], {'default': '#ff6fa8'})
        self.assertEqual(meta['outfit-d']['slot'], 'head')
        self.assertEqual(meta['outfit-d']['src'], 'outfits/outfit-d.webp')
        self.assertEqual(len(meta['outfit-d']['attach']), 2)
        self.assertEqual(meta['item-a']['source'], 'codex')
        self.assertTrue((paths.PUBLIC_ART / 'items/item-a.webp').exists())
        self.assertTrue((paths.WORK / 'contact/it-01.png').exists())
        self.assertEqual(self.verdicts('it')['item-a'], 'pending')

        # Nothing reviewed yet: nothing reaches the manifest.
        self.run_cmd('manifest')
        m = json.loads((paths.PUBLIC_ART / 'manifest.json').read_text())
        self.assertEqual(m['pictures'], {})

        self.set_verdicts('it', item_a='ok', item_b='swap:item-c', item_c='swap:item-b', outfit_d='ok',
                          item_e='redo')
        code, out = self.run_cmd('redo', '--batch', 'it')
        self.assertIn('planned again as it-r1', out)
        redo_plan = json.loads((paths.LISTS / 'sheets/it-r1.json').read_text())
        self.assertEqual(redo_plan['sheets'][0]['ids'], ['item-e'])
        self.assertTrue(redo_plan['sheets'][0]['grey'])

        paths.SVG.mkdir(parents=True)
        (paths.SVG / 'ui-f.svg').write_text(SVG)
        if shutil.which('magick'):
            code, out = self.run_cmd('svg', '--batch', 'it')
            self.assertEqual(code, 0, out)

        code, out = self.run_cmd('manifest')
        self.assertEqual(code, 0, out)
        m = json.loads((paths.PUBLIC_ART / 'manifest.json').read_text())
        self.assertEqual(m['pictures']['item-b']['src'], 'items/item-c.webp')
        self.assertEqual(m['pictures']['item-c']['src'], 'items/item-b.webp')
        self.assertNotIn('item-e', m['pictures'])
        if shutil.which('magick'):
            self.assertEqual(m['pictures']['ui-f']['source'], 'svg')
            self.assertEqual((m['pictures']['ui-f']['w'], m['pictures']['ui-f']['h']), (192, 192))
        missing = json.loads((paths.SRC / 'missing.json').read_text())
        self.assertIn('item-e', missing)
        self.assertIn('item-g', missing)

        code, out = self.run_cmd('status')
        self.assertIn('it: planned 5, generated 5, cut 5, ok 4, redo 1', out)
        self.assertTrue(out.endswith('2 batches\n'))

    def test_gen_reuses_committed_sources(self):
        self.run_cmd('plan-sheets', '--batch', 'it', '--source', 'items', '--ids', 'item-a')
        self.run_cmd('gen', '--batch', 'it', '--codex-bin', str(self.stub))
        shutil.rmtree(paths.RAW)
        code, out = self.run_cmd('gen', '--batch', 'it', '--codex-bin', '/bin/false')
        self.assertEqual(code, 0, out)
        self.assertIn('it-01: ok (0 tries', out)

    def test_second_redo_round_goes_to_svg(self):
        self.run_cmd('plan-sheets', '--batch', 'it', '--source', 'items', '--ids', 'item-a')
        (paths.LISTS / 'sheets/it-r2.json').write_text((paths.LISTS / 'sheets/it.json').read_text())
        paths.REVIEW.mkdir(parents=True, exist_ok=True)
        (paths.REVIEW / 'it-r2.json').write_text(json.dumps({'item-a': 'redo'}))
        code, out = self.run_cmd('redo', '--batch', 'it-r2')
        self.assertEqual(self.verdicts('it')['item-a'], 'svg')

    def test_already_ok_ids_are_not_planned_again(self):
        paths.REVIEW.mkdir(parents=True)
        (paths.REVIEW / 'old.json').write_text(json.dumps({'item-a': 'ok'}))
        self.run_cmd('plan-sheets', '--batch', 'it', '--source', 'items', '--kinds', 'item', '--packs', 'core')
        plan = json.loads((paths.LISTS / 'sheets/it.json').read_text())
        self.assertEqual([s['ids'] for s in plan['sheets']], [['item-b'], ['item-e']])

    def test_custom_list_in_request_format(self):
        (paths.LISTS / 'words-top.txt').write_text('# top-up\nteapot | R18 | a teapot\nitem-x | item | a box\n')
        entries = pipeline.load_list('words-top')
        self.assertEqual([(e.id, e.kind, e.step) for e in entries], [('teapot', 'word', 'R18'), ('item-x', 'item', None)])

    def test_plan_sheets_from_a_named_list(self):
        (paths.LISTS / 'words-top.txt').write_text(
            '# learning top-up, plurals first\nhorses | R19 | a toy horse\nteapot | R18 | a teapot\n'
            'acorn | S10 | an acorn\n')
        paths.REVIEW.mkdir(parents=True)
        (paths.REVIEW / 'words-a.json').write_text(json.dumps({'teapot': 'ok'}))
        code, out = self.run_cmd('plan-sheets', '--batch', 'words-b', '--source', 'words-top')
        self.assertEqual(code, 0, out)
        plan = json.loads((paths.LISTS / 'sheets/words-b.json').read_text())
        self.assertEqual(plan['source'], 'words-top')
        self.assertEqual([s['ids'] for s in plan['sheets']], [['horses', 'acorn']])
        self.assertEqual(plan['sheets'][0]['descs'], ['a toy horse', 'an acorn'])
        self.assertEqual(plan['entries']['horses']['kind'], 'word')
        self.assertEqual(plan['entries']['horses']['step'], 'R19')
        self.assertIn('1 sheets, 2 pictures, 0 svg, 1 already ok', out)

    def test_plan_sheets_names_a_missing_or_broken_list(self):
        with self.assertRaises(SystemExit) as e:
            self.run_cmd('plan-sheets', '--batch', 'b', '--source', 'nothing-here')
        self.assertIn('no list', str(e.exception))
        (paths.LISTS / 'broken.txt').write_text('teapot a teapot\n')
        with self.assertRaises(SystemExit) as e:
            self.run_cmd('plan-sheets', '--batch', 'b', '--source', 'broken')
        self.assertIn('broken.txt line 1', str(e.exception))

    def lumi_pictures(self, open_mouth=True, drift=False):
        """A queen in a moon on white, and the same picture with an open mouth (or a moved one when drift)."""
        paths.RAW.mkdir(parents=True, exist_ok=True)
        closed = Image.new('RGB', (1024, 1024), (255, 255, 255))
        d = ImageDraw.Draw(closed)
        d.ellipse([212, 112, 812, 912], fill=(250, 236, 170), outline=(200, 160, 60), width=8)
        d.ellipse([362, 262, 662, 662], fill=(246, 240, 252), outline=(170, 150, 200), width=6)
        d.arc([462, 520, 562, 580], 20, 160, fill=(120, 60, 80), width=6)
        closed.save(paths.RAW / 'lumi.png')
        if not open_mouth:
            return
        opened = closed.copy()
        if drift:
            opened = Image.new('RGB', (1024, 1024), (255, 255, 255))
            ImageDraw.Draw(opened).ellipse([100, 300, 900, 1000], fill=(200, 230, 250), outline=(60, 90, 160), width=8)
        else:
            ImageDraw.Draw(opened).ellipse([487, 545, 537, 580], fill=(138, 58, 85))
        opened.save(paths.RAW / 'lumi-mouth.png')

    def test_lumi_face_and_mouth_reach_the_manifest_after_review(self):
        self.lumi_pictures()
        code, out = self.run_cmd('lumi')
        self.assertEqual(code, 0, out)
        lumi = json.loads((paths.META / 'lumi.json').read_text())['lumi']
        self.assertEqual((lumi['face'], lumi['mouth']), ('lumi/lumi.webp', 'lumi/lumi-mouth.webp'))
        self.assertEqual(max(lumi['w'], lumi['h']), 600)
        with Image.open(paths.PUBLIC_ART / lumi['face']) as face:
            self.assertEqual(face.size, (lumi['w'], lumi['h']))
            self.assertEqual(face.getpixel((0, 0))[3], 0)  # cut out of the white background
        x, y, w, h = lumi['mouthBox']
        with Image.open(paths.PUBLIC_ART / lumi['mouth']) as mouth:
            self.assertEqual(mouth.size, (w, h))
        self.assertTrue(0.35 * lumi['w'] < x + w / 2 < 0.65 * lumi['w'])
        self.assertTrue(0.5 * lumi['h'] < y + h / 2 < 0.75 * lumi['h'])
        self.assertLess(w, lumi['w'] * 0.25)
        self.assertTrue((paths.SOURCES / 'lumi.webp').exists())
        self.assertTrue((paths.SOURCES / 'lumi-mouth.webp').exists())
        self.assertTrue((paths.WORK / 'contact/lumi.png').exists())
        self.assertEqual(self.verdicts('lumi'), {'lumi': 'pending'})

        self.run_cmd('manifest')
        self.assertIsNone(json.loads((paths.PUBLIC_ART / 'manifest.json').read_text())['lumi'])
        self.set_verdicts('lumi', lumi='ok')
        code, out = self.run_cmd('manifest')
        self.assertEqual(code, 0, out)
        self.assertEqual(json.loads((paths.PUBLIC_ART / 'manifest.json').read_text())['lumi'], lumi)

    def test_lumi_draws_the_mouth_when_the_open_picture_drifted(self):
        self.lumi_pictures(drift=True)
        code, out = self.run_cmd('lumi')
        self.assertEqual(code, 1)
        self.assertIn('"lumi": {"mouth": [x, y]}', out)
        (paths.LISTS / 'anchor-overrides.json').write_text(json.dumps({'lumi': {'mouth': [300, 400]}}))
        code, out = self.run_cmd('lumi')
        self.assertEqual(code, 0, out)
        self.assertIn('drawn mouth', out)
        lumi = json.loads((paths.META / 'lumi.json').read_text())['lumi']
        x, y, w, h = lumi['mouthBox']
        self.assertAlmostEqual(x + w / 2, 300, delta=2)
        self.assertAlmostEqual(y + h / 2, 400, delta=2)
        self.assertAlmostEqual(w, 0.09 * lumi['w'] + 4, delta=3)
        with Image.open(paths.PUBLIC_ART / lumi['mouth']) as mouth:
            px = mouth.convert('RGBA').getpixel((w // 2, h // 2))
        self.assertEqual(px, (0x8a, 0x3a, 0x55, 255))

    def test_lumi_without_an_open_picture_uses_the_mouth_point(self):
        self.lumi_pictures(open_mouth=False)
        (paths.LISTS / 'anchor-overrides.json').write_text(json.dumps({'lumi': {'mouth': [300, 360]}}))
        code, out = self.run_cmd('lumi')
        self.assertEqual(code, 0, out)
        self.assertIn('drawn mouth', out)

    def test_lumi_needs_a_picture(self):
        code, out = self.run_cmd('lumi')
        self.assertEqual(code, 1)
        self.assertIn('no Lumi picture', out)

    def test_backgrounds_use_early_picture_without_codex(self):
        (paths.LISTS / 'backgrounds.txt').write_text('bg-meadow | A | meadow | a meadow\nbg-salon | C | salon | x\n')
        Image.new('RGB', (1672, 941), (140, 200, 110)).save(paths.SRC / 'bg-meadow.png')
        code, out = self.run_cmd('backgrounds', '--batch', 'bg-a', '--wave', 'A', '--use-early',
                                 '--codex-bin', '/bin/false')
        self.assertEqual(code, 0, out)
        meta = json.loads((paths.META / 'bg-a.json').read_text())['backgrounds']['bg-meadow']
        self.assertEqual((meta['w'], meta['h'], meta['dominant']), (1770, 1230, '#8cc86e'))
        with Image.open(paths.PUBLIC_ART / 'bg/bg-meadow.webp') as im:
            self.assertEqual(im.size, (1770, 1230))
        self.assertEqual(self.verdicts('bg-a'), {'bg-meadow': 'pending'})

    def test_sprite_derive_and_manifest(self):
        from art.tests.test_regions import toy_unicorn
        raw = paths.RAW / 'moon-baby.png'
        raw.parent.mkdir(parents=True)
        flat = Image.new('RGB', toy_unicorn().size, (255, 255, 255))
        flat.paste(toy_unicorn(), mask=toy_unicorn().getchannel('A'))
        flat.save(raw)
        (paths.LISTS / 'breeds.txt').write_text('moon | A | gold | none\n')
        code, out = self.run_cmd('sprite', '--breed', 'moon', '--stage', 'baby', '--source', str(raw))
        self.assertEqual(code, 0, out)
        meta = json.loads((paths.META / 'unicorn-moon-baby.json').read_text())['unicorns']['moon.baby']
        self.assertEqual(meta['flat'], 'unicorns/moon-baby-flat.webp')
        self.assertTrue((paths.SOURCES / 'moon-baby.webp').exists())
        self.assertTrue((paths.WORK / 'contact/unicorn-moon-baby-anchors.png').exists())
        self.assertEqual(self.verdicts('unicorn-moon-baby'), {'moon.baby': 'pending'})

        code, out = self.run_cmd('derive')
        self.assertEqual(code, 0, out)
        self.assertTrue((paths.PUBLIC_ART / 'ui/sky-unicorn.webp').exists())

        self.set_verdicts('unicorn-moon-baby', **{'moon.baby': 'ok'})
        code, out = self.run_cmd('manifest')
        self.assertEqual(code, 0, out)
        m = json.loads((paths.PUBLIC_ART / 'manifest.json').read_text())
        self.assertIn('moon.baby', m['unicorns'])
        self.assertEqual(m['patterns'], {'speckle': 'ui/speckle.webp'})
        self.assertEqual(m['pictures']['ui-sky-unicorn']['source'], 'derived')

    def test_sprite_refuses_drifted_colours(self):
        raw = paths.RAW / 'pebble-baby.png'
        raw.parent.mkdir(parents=True)
        im = Image.new('RGB', (300, 300), (255, 255, 255))
        ImageDraw.Draw(im).ellipse([40, 40, 260, 260], fill=(240, 200, 90), outline=(150, 100, 30), width=4)
        im.save(raw)
        code, out = self.run_cmd('sprite', '--breed', 'pebble', '--stage', 'baby')
        self.assertEqual(code, 1)
        self.assertIn('colours drifted, regenerate', out)

    def _manifest_with(self, **pictures):
        (paths.PUBLIC_ART / 'items').mkdir(parents=True, exist_ok=True)
        entries = {}
        for pid, fill in pictures.items():
            im = Image.new('RGBA', (200, 200), (0, 0, 0, 0))
            ImageDraw.Draw(im).ellipse([30, 30, 170, 170], fill=fill, outline=(90, 90, 90, 255), width=6)
            im.save(paths.PUBLIC_ART / f'items/{pid}.webp', lossless=True)
            entries[pid] = {'src': f'items/{pid}.webp', 'w': 200, 'h': 200, 'kind': 'item', 'pack': 'core', 'source': 'codex'}
        (paths.PUBLIC_ART / 'manifest.json').write_text(json.dumps({'v': 1, 'pictures': entries, 'backgrounds': {}}))

    def test_check_all_passes_reviewed_grey_objects(self):
        # A spoon, a stone or a tap is grey. It passed review, so check-all names it and still passes.
        self._manifest_with(**{'item-spoon': (150, 150, 152, 255), 'item-cup': (230, 120, 160, 255)})
        code, out = self.run_cmd('check-all')
        self.assertEqual(code, 0, out)
        self.assertIn('item-spoon: no-colour (note only)', out)
        self.assertIn('2 pictures checked, 0 with issues', out)

    def test_check_all_fails_on_a_real_issue(self):
        self._manifest_with(**{'item-cup': (230, 120, 160, 255)})
        im = Image.new('RGBA', (200, 200), (230, 120, 160, 255))   # no transparent background left
        im.save(paths.PUBLIC_ART / 'items/item-cup.webp', lossless=True)
        code, out = self.run_cmd('check-all')
        self.assertEqual(code, 1, out)
        self.assertIn('item-cup: no-alpha', out)

    def test_placeholder(self):
        code, out = self.run_cmd('placeholder')
        self.assertEqual(code, 0, out)
        m = json.loads((paths.PUBLIC_ART / 'placeholder/manifest.json').read_text())
        self.assertEqual(sorted(m['unicorns']), ['moon.baby', 'moon.foal', 'pebble.baby'])


if __name__ == '__main__':
    unittest.main()
