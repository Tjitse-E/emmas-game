import unittest

import numpy as np
from PIL import Image, ImageDraw

from art import regions, rig
from art.imageops import unmatte_white

C = regions.CANON


def joined_unicorn():
    """A toy unicorn whose curly tail touches the mane through a thin pink strand along the back,
    as the curlier breeds come out of Codex."""
    im = Image.new('RGB', (500, 320), (255, 255, 255))
    d = ImageDraw.Draw(im)
    d.ellipse([10, 90, 130, 260], fill=C['mane'], outline=(200, 100, 140), width=4)    # tail
    d.ellipse([100, 100, 330, 250], fill=C['body'], outline=(150, 120, 180), width=5)   # body
    d.ellipse([280, 30, 400, 150], fill=C['body'], outline=(150, 120, 180), width=5)    # head
    d.rectangle([240, 40, 300, 200], fill=C['mane'], outline=(200, 100, 140), width=3)  # mane down the neck
    d.rectangle([110, 94, 250, 106], fill=C['mane'])                                   # thin strand on the back
    d.ellipse([330, 70, 348, 88], fill=(40, 20, 60))                                     # eye
    return unmatte_white(im)


class TailTest(unittest.TestCase):
    def test_a_tail_joined_to_the_mane_is_cut_off_at_the_narrowest_column(self):
        cls = regions.classify(joined_unicorn())
        tail, root, others = rig._tail(cls)
        ys, xs = np.nonzero(tail)
        self.assertLess(xs.max(), 200)              # the mane on the neck is not part of the tail
        self.assertGreater(tail[180, 60], 0)        # the tail itself is
        self.assertLess(root[0], 200)
        biggest = max(others, key=lambda c: len(c[0]))
        self.assertGreater(biggest[0].mean(), 220)  # the mane anchor falls on the neck, not on a speck

    def test_thin_rims_do_not_swish_with_the_tail(self):
        im = joined_unicorn()
        d = ImageDraw.Draw(im)
        d.rectangle([100, 230, 103, 300], fill=C['mane'] + (255,))  # a pink rim down the hind leg, touching the tail
        tail, _, _ = rig._tail(regions.classify(im))
        self.assertFalse(tail[290, 101])


if __name__ == '__main__':
    unittest.main()
