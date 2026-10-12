import unittest

import numpy as np
from PIL import Image, ImageDraw

from art import peel


class PeelTest(unittest.TestCase):
    def test_paste_back_changes_only_the_masked_area(self):
        orig = Image.new('RGBA', (100, 100), (200, 180, 240, 255))
        ImageDraw.Draw(orig).rectangle([40, 40, 60, 60], fill=(240, 160, 190, 255))  # the part to peel
        edited = Image.new('RGBA', (100, 100), (190, 175, 235, 255))                  # drifted everywhere
        mask = np.zeros((100, 100), bool)
        mask[40:61, 40:61] = True
        out = np.asarray(peel.paste_back(orig, edited, mask, grow=2))
        self.assertEqual(tuple(out[5, 5]), (200, 180, 240, 255))
        self.assertEqual(tuple(out[50, 50]), (190, 175, 235, 255))

    def test_seam_error_is_small_when_the_fill_matches(self):
        orig = Image.new('RGBA', (100, 100), (200, 180, 240, 255))
        mask = np.zeros((100, 100), bool)
        mask[40:61, 40:61] = True
        same = peel.paste_back(orig, orig, mask)
        self.assertLess(peel.seam_error(orig, same, mask), 1)
        wrong = peel.paste_back(orig, Image.new('RGBA', (100, 100), (20, 20, 20, 255)), mask)
        self.assertGreater(peel.seam_error(orig, wrong, mask), 100)


if __name__ == '__main__':
    unittest.main()
