# tools/art/tests/test_imageops.py
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from art import imageops, paths


def disc_on_white(size=200, r=60, fill=(200, 120, 220), outline=(120, 60, 140), bg=(255, 255, 255)):
    im = Image.new('RGB', (size, size), bg)
    d = ImageDraw.Draw(im)
    c = size // 2
    d.ellipse([c - r, c - r, c + r, c + r], fill=fill, outline=outline, width=4)
    return im


class PathsTest(unittest.TestCase):
    def test_ids(self):
        self.assertTrue(paths.is_valid_id('toy-castle'))
        self.assertFalse(paths.is_valid_id('Toy castle'))
        self.assertFalse(paths.is_valid_id('hat--x'))
        self.assertTrue(paths.is_word_id('hat'))
        self.assertFalse(paths.is_word_id('item-nest'))
        self.assertTrue(paths.STYLE_REF.exists())


class UnmatteTest(unittest.TestCase):
    def test_background_becomes_transparent_and_object_opaque(self):
        a = np.asarray(imageops.unmatte_white(disc_on_white()))[..., 3]
        self.assertEqual(a[0, 0], 0)
        self.assertEqual(a[5, 195], 0)
        self.assertEqual(a[100, 100], 255)

    def test_off_white_background_is_removed(self):
        im = Image.new('RGB', (100, 100), (250, 249, 246))
        ImageDraw.Draw(im).rectangle([30, 30, 70, 70], fill=(90, 160, 200), outline=(40, 90, 130), width=3)
        a = np.asarray(imageops.unmatte_white(im))[..., 3]
        self.assertEqual(a[2, 2], 0)
        self.assertEqual(a[50, 50], 255)

    def test_white_inside_outline_is_kept(self):
        a = np.asarray(imageops.unmatte_white(disc_on_white(fill=(255, 255, 255))))[..., 3]
        self.assertEqual(a[100, 100], 255)

    def test_gap_in_outline_does_not_eat_object(self):
        im = disc_on_white(fill=(255, 255, 255))
        ImageDraw.Draw(im).rectangle([98, 36, 99, 46], fill=(255, 255, 255))  # 2 px gap in the top of the outline
        a = np.asarray(imageops.unmatte_white(im))[..., 3]
        self.assertEqual(a[100, 100], 255)
        self.assertEqual(a[120, 80], 255)

    def test_edge_pixels_are_decontaminated(self):
        im = disc_on_white().resize((100, 100), Image.LANCZOS)
        arr = np.asarray(imageops.unmatte_white(im)).astype(int)
        edge = (arr[..., 3] > 0) & (arr[..., 3] < 255)
        self.assertTrue(edge.any())
        self.assertLess(arr[edge][:, :3].min(axis=1).mean(), 235)


class ComponentsTest(unittest.TestCase):
    def test_labels_separate_blobs(self):
        m = np.zeros((50, 50), bool)
        m[5:10, 5:10] = True
        m[8, 8:12] = True
        m[30:40, 30:45] = True
        labels, n = imageops.label_components(m)
        self.assertEqual(n, 2)
        self.assertEqual(labels[5, 5], labels[8, 11])
        self.assertNotEqual(labels[5, 5], labels[35, 35])
        self.assertEqual(labels[0, 0], 0)

    def test_diagonal_pixels_connect(self):
        m = np.zeros((5, 5), bool)
        m[0, 0] = m[1, 1] = m[2, 2] = True
        self.assertEqual(imageops.label_components(m)[1], 1)

    def test_large_mask_is_fast_enough(self):
        m = np.random.default_rng(1).random((1200, 1300)) > 0.5
        import time
        t = time.time()
        imageops.label_components(m)
        self.assertLess(time.time() - t, 20)


class FitTest(unittest.TestCase):
    def test_trim_to_alpha_bbox(self):
        im = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
        im.paste((255, 0, 0, 255), (20, 30, 60, 50))
        t, box = imageops.trim(im)
        self.assertEqual(box, (20, 30, 40, 20))
        self.assertEqual(t.size, (40, 20))

    def test_fit_square_centres_and_pads(self):
        im = Image.new('RGBA', (100, 50), (10, 20, 30, 255))
        out = imageops.fit_square(im, 320, pad=0.1)
        self.assertEqual(out.size, (320, 320))
        ys, xs = np.nonzero(np.asarray(out)[..., 3])
        self.assertEqual(xs.min(), 32)
        self.assertEqual(xs.max(), 287)
        self.assertAlmostEqual((ys.min() + ys.max()) / 2, 159.5, delta=1)

    def test_fit_long_keeps_aspect(self):
        im = Image.new('RGBA', (400, 100), (10, 20, 30, 255))
        out = imageops.fit_long(im, 800, pad=0.04)
        self.assertEqual(out.size, (800, 248))  # margin 32 px, object 736 x 184

    def test_save_webp_keeps_alpha(self):
        im = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        im.paste((255, 0, 0, 255), (16, 16, 48, 48))
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'x.webp'
            n = imageops.save_webp(im, p)
            self.assertGreater(n, 0)
            back = Image.open(p)
            self.assertEqual(back.mode, 'RGBA')
            self.assertEqual(back.getpixel((0, 0))[3], 0)


if __name__ == '__main__':
    unittest.main()
