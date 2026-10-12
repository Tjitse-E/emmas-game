# tools/art/tests/test_checks.py
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from art import checks, imageops, vision


def good(fill=(240, 140, 160, 255)):
    im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse([40, 40, 280, 280], fill=fill, outline=(170, 80, 100, 255), width=5)
    return im


class ChecksTest(unittest.TestCase):
    def test_good_picture_has_no_issues(self):
        self.assertEqual(checks.check_picture(good(), source_long_side=250), [])

    def test_opaque_picture(self):
        self.assertIn('no-alpha', checks.check_picture(Image.new('RGBA', (320, 320), (255, 255, 255, 255)),
                                                       source_long_side=250))

    def test_cut_off_object(self):
        im = good()
        ImageDraw.Draw(im).rectangle([0, 100, 20, 200], fill=(240, 140, 160, 255))
        self.assertIn('touches-edge', checks.check_picture(im, source_long_side=250))

    def test_low_source_resolution(self):
        self.assertIn('low-res', checks.check_picture(good(), source_long_side=150))

    def test_sparse_specks(self):
        im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for x in range(40, 280, 40):
            d.ellipse([x, x, x + 6, x + 6], fill=(200, 40, 40, 255))
        self.assertIn('sparse', checks.check_picture(im, source_long_side=250))

    def test_white_halo(self):
        im = good()
        ImageDraw.Draw(im).ellipse([36, 36, 284, 284], outline=(253, 253, 253, 128), width=4)
        self.assertIn('halo', checks.check_picture(im, source_long_side=250))

    def test_grey_rules(self):
        grey = good(fill=(210, 210, 210, 255))
        self.assertIn('no-colour', checks.check_picture(grey, source_long_side=250))
        self.assertEqual(checks.check_picture(grey, source_long_side=250, grey=True), [])
        self.assertIn('not-grey', checks.check_picture(good(), source_long_side=250, grey=True))

    def test_heavy_file(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'x.webp'
            imageops.save_webp(good(), p)
            self.assertEqual(checks.check_file(p, 10_000_000), [])
            self.assertEqual(checks.check_file(p, 10), ['heavy'])

    def test_max_bytes(self):
        self.assertEqual(checks.max_bytes_for('word', 320), 46_080)
        self.assertEqual(checks.max_bytes_for('bg', 1770), 450_000)


@unittest.skipUnless(vision.available(), 'Apple Vision helper not built')
class VisionTest(unittest.TestCase):
    def test_finds_text(self):
        from PIL import ImageFont
        im = Image.new('RGB', (600, 200), 'white')
        ImageDraw.Draw(im).text((40, 40), 'HAT', fill='black', font=ImageFont.load_default(size=110))
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 't.png'
            im.save(p)
            self.assertIn('HAT', ' '.join(vision.detect_text(p)).upper())
            p2 = Path(d) / 'g.png'
            good().save(p2)
            self.assertEqual(vision.detect_text(p2), [])


if __name__ == '__main__':
    unittest.main()
