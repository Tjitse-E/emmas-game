import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from art import rig
from art.tests.test_regions import toy_unicorn


class RigTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name) / 'unicorns'
        cls.entry = rig.build_sprite(toy_unicorn(), 'moon', 'baby', 'gold', cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_entry_shape(self):
        e = self.entry
        self.assertEqual((e['breed'], e['stage'], e['mode']), ('moon', 'baby', 'sprite'))
        self.assertEqual(json.loads(json.dumps(e)), e)
        lg = e['renditions']['lg']
        self.assertEqual([p['id'] for p in lg['parts']], ['tail', 'body', 'lids'])
        self.assertEqual([l['tint'] for l in lg['parts'][1]['layers']], ['body', 'mane', 'mane2', 'none'])
        self.assertTrue(lg['parts'][2]['hidden'])
        self.assertEqual(lg['parts'][2]['anim'], 'blink')

    def test_never_upscales_and_sm_is_smaller(self):
        r = self.entry['renditions']
        self.assertLessEqual(r['sm']['scale'], r['lg']['scale'])
        self.assertLessEqual(r['lg']['scale'], 1)

    def test_files_exist_and_match_boxes(self):
        for name in ('sm', 'lg'):
            r = self.entry['renditions'][name]
            for part in r['parts']:
                for layer in part['layers']:
                    p = self.out.parent / layer['src']
                    self.assertTrue(p.exists(), p)
                    w, h = Image.open(p).size
                    self.assertAlmostEqual(w, layer['box'][2] * r['scale'], delta=2)
                    self.assertAlmostEqual(h, layer['box'][3] * r['scale'], delta=2)
        self.assertTrue((self.out.parent / self.entry['sil']).exists())

    def test_flat_sprite_for_lite_mode(self):
        flat = Image.open(self.out.parent / self.entry['flat'])
        sil = Image.open(self.out.parent / self.entry['sil'])
        self.assertEqual(flat.size, sil.size)
        self.assertEqual(self.entry['flat'], 'unicorns/moon-baby-flat.webp')

    def test_layers_sit_inside_their_part(self):
        for part in self.entry['renditions']['lg']['parts']:
            px, py, pw, ph = part['box']
            for layer in part['layers']:
                x, y, w, h = layer['box']
                self.assertGreaterEqual(x, px)
                self.assertGreaterEqual(y, py)
                self.assertLessEqual(x + w, px + pw)
                self.assertLessEqual(y + h, py + ph)

    def test_anchors(self):
        a = self.entry['anchors']
        self.assertLess(a['tailRoot'][0], a['flank'][0])
        self.assertLess(a['hornBase'][1], a['eye'][1])
        self.assertGreater(a['feet'][1], a['flank'][1])
        self.assertAlmostEqual(a['feet'][1], self.entry['h'], delta=12)
        tail = self.entry['renditions']['lg']['parts'][0]
        self.assertEqual(tuple(tail['pivot']), tuple(a['tailRoot']))

    def test_overrides_win(self):
        with tempfile.TemporaryDirectory() as d:
            e = rig.build_sprite(toy_unicorn(), 'moon', 'baby', 'gold', Path(d) / 'unicorns',
                                 overrides={'moon.baby': {'neck': [10, 20]}})
            self.assertEqual(e['anchors']['neck'], [10, 20])


if __name__ == '__main__':
    unittest.main()
