import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from art import derive, placeholder


class DeriveTest(unittest.TestCase):
    def test_silhouette_keeps_alpha_and_flattens_colour(self):
        im = Image.new('RGBA', (50, 50), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse([10, 10, 40, 40], fill=(250, 100, 100, 255))
        s = np.asarray(derive.silhouette(im))
        self.assertEqual(tuple(s[25, 25]), (108, 90, 142, 255))
        self.assertEqual(s[0, 0, 3], 0)

    def test_speckle_tile(self):
        with tempfile.TemporaryDirectory() as d:
            p = derive.speckle_pattern(Path(d) / 'speckle.webp')
            im = Image.open(p)
            self.assertEqual(im.size, (128, 128))
            a = np.asarray(im.convert('RGBA'))[..., 3]
            self.assertTrue(0.05 < (a > 0).mean() < 0.3)

    def test_lumi_mouth_overlay_only_covers_the_change(self):
        closed = Image.new('RGBA', (200, 200), (240, 230, 250, 255))
        open_ = closed.copy()
        ImageDraw.Draw(open_).ellipse([90, 140, 110, 155], fill=(120, 40, 60, 255))
        overlay, box = derive.lumi_mouth(closed, open_)
        x, y, w, h = box
        self.assertTrue(80 <= x <= 92 and 130 <= y <= 142 and w <= 40 and h <= 35)
        self.assertEqual(overlay.size, (w, h))

    def test_lumi_mouth_refuses_drifted_pictures(self):
        closed = Image.new('RGBA', (200, 200), (240, 230, 250, 255))
        ImageDraw.Draw(closed).rectangle([20, 20, 180, 60], fill=(30, 30, 30, 255))
        moved = Image.new('RGBA', (200, 200), (240, 230, 250, 255))
        ImageDraw.Draw(moved).rectangle([20, 100, 180, 140], fill=(30, 30, 30, 255))
        self.assertIsNone(derive.lumi_mouth(closed, moved))


class PlaceholderTest(unittest.TestCase):
    def test_placeholder_manifest_has_twelve_layers(self):
        with tempfile.TemporaryDirectory() as d:
            m = placeholder.build(Path(d))
            u = m['unicorns']['moon.baby']
            self.assertEqual(u['source'], 'placeholder')
            n = sum(len(p['layers']) for p in u['renditions']['sm']['parts'])
            self.assertEqual(n, 12)
            for p in u['renditions']['sm']['parts']:
                for l in p['layers']:
                    self.assertTrue((Path(d) / l['src'].removeprefix('placeholder/')).exists())


if __name__ == '__main__':
    unittest.main()
