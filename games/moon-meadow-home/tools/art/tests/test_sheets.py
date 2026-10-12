# tools/art/tests/test_sheets.py
import unittest

import numpy as np
from PIL import Image, ImageDraw

from art import lists, sheets


def make_sheet(cols=4, rows=4, cell=150, skip=(), split=(), jitter=0):
    im = Image.new('RGB', (cols * cell, rows * cell), (252, 252, 250))
    d = ImageDraw.Draw(im)
    for i in range(cols * rows):
        if i in skip:
            continue
        cx = (i % cols) * cell + cell // 2 + (jitter if i % 2 else -jitter)
        cy = (i // cols) * cell + cell // 2
        col = (40 + 10 * i, 120, 200 - 8 * i)
        if i in split:
            d.ellipse([cx - 50, cy - 20, cx - 10, cy + 20], fill=col, outline=(20, 20, 60), width=3)
            d.ellipse([cx + 10, cy - 20, cx + 50, cy + 20], fill=col, outline=(20, 20, 60), width=3)
        else:
            d.ellipse([cx - 45, cy - 45, cx + 45, cy + 45], fill=col, outline=(20, 20, 60), width=3)
    d.point([(3, 3)], fill=(0, 0, 0))  # a speck that must be ignored
    return im


class CutSheetTest(unittest.TestCase):
    def spec(self, n=16):
        return sheets.SheetSpec('t-01', 4, 4, [f'w{i}' for i in range(n)], [''] * n, False)

    def test_cuts_in_reading_order_with_colours(self):
        cuts = sheets.cut_sheet(make_sheet(jitter=20), self.spec())
        self.assertEqual([c.id for c in cuts], [f'w{i}' for i in range(16)])
        for i in (0, 3, 15):
            a = np.asarray(cuts[i].image)
            px = a[a.shape[0] // 2, a.shape[1] // 2]
            self.assertEqual(tuple(int(v) for v in px[:3]), (40 + 10 * i, 120, 200 - 8 * i))
            self.assertEqual(cuts[i].issues, [])
            self.assertGreaterEqual(cuts[i].source_long_side, 90)

    def test_missing_cell_is_reported(self):
        cuts = sheets.cut_sheet(make_sheet(skip={5}), self.spec())
        self.assertEqual(cuts[5].issues, ['missing'])
        self.assertIsNone(cuts[5].image)

    def test_parts_in_one_cell_are_one_object(self):
        cuts = sheets.cut_sheet(make_sheet(split={9}), self.spec())
        self.assertEqual(cuts[9].issues, [])
        self.assertGreaterEqual(cuts[9].image.width, 100)

    def test_spare_cells_are_ignored(self):
        cuts = sheets.cut_sheet(make_sheet(), self.spec(14))
        self.assertEqual(len(cuts), 14)


class PlanSheetsTest(unittest.TestCase):
    def test_grey_entries_get_their_own_sheets(self):
        words = lists.load_words()
        plan = sheets.plan_sheets('words-a', words, 4, 4)
        self.assertEqual(sum(len(s.ids) for s in plan), len(words))
        for s in plan:
            self.assertLessEqual(len(s.ids), 16)
            self.assertEqual(len(set(w.tint is not None for w in words if w.id in s.ids)), 1)
            self.assertEqual(s.grey, all(w.tint for w in words if w.id in s.ids))
        self.assertEqual(plan[0].id, 'words-a-01')


if __name__ == '__main__':
    unittest.main()
