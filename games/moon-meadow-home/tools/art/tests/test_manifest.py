# tools/art/tests/test_manifest.py
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from art import manifest


def pic(src, kind='word', pack='words'):
    return {'src': src, 'w': 320, 'h': 320, 'kind': kind, 'pack': pack, 'source': 'codex'}


class ManifestTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        self.meta, self.rev, self.pub = d / 'meta', d / 'review', d / 'public'
        for p in (self.meta, self.rev, self.pub / 'words'):
            p.mkdir(parents=True)
        for n in ('hat', 'cup'):
            Image.new('RGBA', (320, 320)).save(self.pub / 'words' / f'{n}.webp')
        (self.meta / 'w.json').write_text(json.dumps({'pictures': {'hat': pic('words/hat.webp'),
                                                                   'cup': pic('words/cup.webp')}}))

    def tearDown(self):
        self.tmp.cleanup()

    def test_unreviewed_pictures_are_left_out(self):
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'pending'}))
        data, missing = manifest.build(self.meta, self.rev, self.pub, 'sprite')
        self.assertEqual(list(data['pictures']), ['hat'])
        self.assertEqual(missing, ['cup'])
        self.assertEqual(data['v'], 1)
        self.assertEqual(data['rigMode'], 'sprite')

    def test_strict_mode_raises_on_left_out(self):
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'redo'}))
        with self.assertRaises(manifest.ManifestError):
            manifest.build(self.meta, self.rev, self.pub, 'sprite', strict=True)

    def test_missing_file_is_an_error(self):
        (self.pub / 'words' / 'cup.webp').unlink()
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        with self.assertRaises(manifest.ManifestError):
            manifest.build(self.meta, self.rev, self.pub, 'sprite')

    def test_derived_and_svg_need_no_review(self):
        Image.new('RGBA', (8, 8)).save(self.pub / 'words' / 'bow.webp')
        e = pic('words/bow.webp')
        e['source'] = 'svg'
        (self.meta / 's.json').write_text(json.dumps({'pictures': {'bow': e}}))
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        data, _ = manifest.build(self.meta, self.rev, self.pub, 'sprite')
        self.assertIn('bow', data['pictures'])

    def test_conflicting_duplicate_is_an_error(self):
        (self.meta / 'x.json').write_text(json.dumps({'pictures': {'hat': pic('words/cup.webp')}}))
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        (self.rev / 'x.json').write_text(json.dumps({'hat': 'ok'}))
        with self.assertRaises(manifest.ManifestError):
            manifest.build(self.meta, self.rev, self.pub, 'sprite')

    def test_write_sorts_keys(self):
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        data, _ = manifest.build(self.meta, self.rev, self.pub, 'sprite')
        p = manifest.write(self.pub, data)
        self.assertEqual(list(json.loads(p.read_text())['pictures']), ['cup', 'hat'])


if __name__ == '__main__':
    unittest.main()
