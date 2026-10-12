# tools/art/tests/test_prompts.py
import unittest

from art import prompts


class PromptsTest(unittest.TestCase):
    def test_sheet_prompt_lists_objects_in_reading_order(self):
        p = prompts.sheet_prompt(['a red apple', 'a carrot', 'a toy fox'], 2, 2, 'words-a-01')
        self.assertIn('2 columns and 2 rows', p)
        self.assertLess(p.index('1. a red apple'), p.index('2. a carrot'))
        self.assertIn('3. a toy fox', p)
        self.assertIn('plain white background', p)
        self.assertIn('No text', p)
        self.assertIn('plush toys', p)
        self.assertTrue(p.rstrip().endswith('Save it as words-a-01.png in the current working directory.'))
        self.assertNotIn('light grey only', p)

    def test_grey_sheet_asks_for_grey(self):
        p = prompts.sheet_prompt(['a bow'], 1, 1, 'tint-01', grey=True)
        self.assertIn('light grey only', p)

    def test_breed_prompt_keeps_colours_and_pose(self):
        p = prompts.breed_prompt('a short fluffy mane', 'nestling-baby')
        for s in ('same style, pose, size, camera angle', 'lilac body', 'pink mane', 'mint green streaks',
                  'gold horn and hooves', 'a short fluffy mane', 'Save it as nestling-baby.png'):
            self.assertIn(s, p)

    def test_background_prompt_has_no_characters(self):
        p = prompts.background_prompt('a meadow', 'bg-meadow')
        self.assertIn('No characters, no unicorns, no people', p)
        self.assertIn('landscape', p)


if __name__ == '__main__':
    unittest.main()
