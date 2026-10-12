# tools/art/tests/test_contact.py
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from art import contact


class ContactTest(unittest.TestCase):
    def test_png_grid_size(self):
        with tempfile.TemporaryDirectory() as d:
            items = []
            for i in range(7):
                p = Path(d) / f'p{i}.png'
                Image.new('RGBA', (100, 60), (200, 50, 50, 255)).save(p)
                items.append((f'id{i}', p))
            out = contact.contact_png(items, Path(d) / 'c.png', cols=3, cell=200)
            self.assertEqual(Image.open(out).size, (600, 3 * 230))

    def test_html_lists_every_picture_at_real_size(self):
        with tempfile.TemporaryDirectory() as d:
            m = {'pictures': {'hat': {'src': 'words/hat.webp', 'w': 320, 'h': 320, 'kind': 'word'}},
                 'backgrounds': {}, 'unicorns': {}}
            out = contact.contact_html(m, Path(d) / 'index.html')
            html = out.read_text()
            self.assertIn('hat', html)
            # The page is opened from a lane or Emma's server, which serves public/art at <game>/art/ (R15).
            self.assertIn('src="../../art/words/hat.webp"', html)
            self.assertNotIn('public/art', html)
            self.assertIn('width="160"', html)


if __name__ == '__main__':
    unittest.main()
