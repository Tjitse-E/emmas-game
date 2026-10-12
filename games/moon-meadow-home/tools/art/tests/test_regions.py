import unittest

import numpy as np
from PIL import Image, ImageDraw

from art import regions
from art.imageops import unmatte_white

C = regions.CANON
GOLD = (226, 178, 80)


def toy_unicorn():
    im = Image.new('RGB', (400, 300), (255, 255, 255))
    d = ImageDraw.Draw(im)
    d.ellipse([20, 120, 120, 220], fill=C['mane'], outline=(200, 100, 140), width=4)   # tail
    d.ellipse([100, 100, 300, 240], fill=C['body'], outline=(150, 120, 180), width=5)  # body
    d.ellipse([230, 40, 330, 140], fill=C['body'], outline=(150, 120, 180), width=5)   # head
    d.rectangle([200, 60, 240, 130], fill=C['mane'], outline=(200, 100, 140), width=3)  # mane
    d.rectangle([205, 70, 235, 90], fill=C['mane2'])                                    # streak
    d.polygon([(285, 45), (300, 2), (312, 45)], fill=GOLD, outline=(170, 120, 40))      # horn
    d.ellipse([150, 136, 186, 152], fill=(253, 230, 240))                               # near-white sheen
    d.ellipse([314, 98, 336, 128], fill=(255, 234, 229), outline=(200, 140, 120), width=2)  # cream muzzle
    d.ellipse([280, 80, 296, 96], fill=(40, 20, 60))                                     # eye
    d.ellipse([300, 105, 312, 113], fill=(240, 170, 190))                                # cheek
    for x in (130, 170, 230, 260):
        d.rectangle([x, 232, x + 16, 262], fill=GOLD, outline=(170, 120, 40))           # hooves
    return unmatte_white(im)


class RegionsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rgba = toy_unicorn()
        cls.cls = regions.classify(cls.rgba)

    def at(self, x, y):
        return int(self.cls[y, x])

    def test_classes(self):
        self.assertEqual(self.at(180, 170), regions.BODY)
        self.assertEqual(self.at(220, 115), regions.MANE)
        self.assertEqual(self.at(220, 80), regions.MANE2)
        self.assertEqual(self.at(298, 30), regions.FIXED)   # horn
        self.assertEqual(self.at(288, 88), regions.FIXED)   # eye
        self.assertEqual(self.at(306, 109), regions.FIXED)  # cheek, a small pink blob
        self.assertEqual(self.at(60, 170), regions.MANE)    # tail
        self.assertEqual(self.at(0, 0), regions.BG)
        self.assertEqual(self.at(170, 145), regions.BODY)   # a near-white highlight takes the coat it sits on
        self.assertEqual(self.at(326, 112), regions.FIXED)  # a cream muzzle keeps its colour

    @staticmethod
    def blushed(eye: bool) -> np.ndarray:
        im = Image.new('RGB', (600, 300), (255, 255, 255))
        d = ImageDraw.Draw(im)
        d.rectangle([300, 20, 590, 280], fill=C['mane'], outline=(200, 100, 140), width=4)  # the mane
        d.ellipse([10, 10, 290, 290], fill=C['body'], outline=(150, 120, 180), width=5)    # the coat
        if eye:
            d.ellipse([160, 60, 200, 100], fill=(40, 20, 60))                              # eye
        d.ellipse([134, 112, 226, 168], fill=(252, 238, 244))                              # near-white halo
        d.ellipse([140, 110, 220, 160], fill=(240, 170, 190))                              # pink blob
        return regions.classify(unmatte_white(im))

    def test_blushed_cheek_with_a_soft_halo_is_fixed(self):
        # Newer breeds blush with a soft near-white halo around the cheek, so more than half of the ring around
        # the pink blob is unclassified sheen. Next to an eye the blob is a cheek and keeps its colour.
        c = self.blushed(eye=True)
        self.assertEqual(int(c[135, 180]), regions.FIXED)
        self.assertEqual(int(c[150, 450]), regions.MANE)

    def test_haloed_blob_away_from_the_eyes_stays_mane(self):
        # A braid end or a curl on the chest also sits in the coat with sheen around it: it stays mane.
        self.assertEqual(int(self.blushed(eye=False)[135, 180]), regions.MANE)

    def test_outlines_follow_their_fill(self):
        self.assertEqual(self.at(102, 170), regions.BODY)
        self.assertEqual(self.at(22, 170), regions.MANE)

    def test_shares(self):
        s = regions.class_shares(self.cls)
        self.assertGreater(s['body'], 0.4)
        self.assertGreater(s['mane'], 0.1)
        self.assertAlmostEqual(sum(s.values()), 1.0, places=5)

    def test_shade_is_light_inside_and_dark_on_the_outline(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        body = np.asarray(layers['body'])
        self.assertGreater(body[170, 180, 0], 235)
        self.assertLess(body[170, 102, 0], 200)
        self.assertEqual(body[30, 298, 3], 0)                    # horn is not in the body layer
        self.assertEqual(np.asarray(layers['fixed'])[30, 298, 3], 255)

    def test_recolour_round_trip(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        back = np.asarray(regions.recolour(layers, C)).astype(int)
        orig = np.asarray(self.rgba).astype(int)
        m = self.cls == regions.BODY
        self.assertLess(np.abs(back[m][:, :3] - orig[m][:, :3]).mean(), 12)

    def test_recolour_changes_mane(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        blue = regions.recolour(layers, {**C, 'mane': (79, 195, 255)})
        r, g, b, a = blue.getpixel((220, 115))
        self.assertGreater(b, r)

    def test_horn_variant(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        silver = regions.horn_variant(layers['fixed'], self.cls, 'silver')
        r, g, b, _ = silver.getpixel((298, 30))
        self.assertLess(max(r, g, b) - min(r, g, b), 30)
        hoof = silver.getpixel((138, 250))
        self.assertEqual(hoof, layers['fixed'].getpixel((138, 250)))  # hooves keep their gold


if __name__ == '__main__':
    unittest.main()
