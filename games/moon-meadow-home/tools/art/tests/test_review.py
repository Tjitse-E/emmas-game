# tools/art/tests/test_review.py
import json
import tempfile
import unittest
from pathlib import Path

from art import review


class ReviewTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_init_keeps_existing_verdicts(self):
        review.init('b', ['hat', 'cup'], self.root)
        (self.root / 'b.json').write_text(json.dumps({'hat': 'ok', 'cup': 'pending'}))
        review.init('b', ['hat', 'cup', 'bow'], self.root)
        self.assertEqual(review.load('b', self.root), {'hat': 'ok', 'cup': 'pending', 'bow': 'pending'})

    def test_redo_ids(self):
        (self.root / 'b.json').write_text(json.dumps({'hat': 'ok', 'cup': 'redo', 'bow': 'svg', 'pin': 'redo'}))
        self.assertEqual(review.redo_ids('b', self.root), ['cup', 'pin'])

    def test_swap_verdict_moves_picture(self):
        meta = {'pictures': {'hat': {'src': 'words/hat.webp'}, 'cup': {'src': 'words/cup.webp'}}}
        out = review.apply_swaps(meta, {'hat': 'swap:cup', 'cup': 'swap:hat'})
        self.assertEqual(out['pictures']['hat']['src'], 'words/cup.webp')
        self.assertEqual(out['pictures']['cup']['src'], 'words/hat.webp')


if __name__ == '__main__':
    unittest.main()
