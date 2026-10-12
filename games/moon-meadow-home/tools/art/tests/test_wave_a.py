# The Wave A art check (art Task A14b): every Wave A picture, background, unicorn and Lumi is in the manifest.
import json
import re
import unittest

from art import lists, paths

MANIFEST = paths.PUBLIC_ART / 'manifest.json'
CONTRACTS = paths.GAME / 'src/types/contracts.ts'
WAVE_A_BREEDS = ('moon', 'nestling', 'pebble', 'cosy', 'bubble')


def scene_art_ids() -> list[str]:
    """The picture ids other streams name in SCENE_ART_IDS (contracts C9)."""
    src = CONTRACTS.read_text()
    block = src[src.index('export const SCENE_ART_IDS'):]
    return re.findall(r"'([a-z0-9-]+)'", block[:block.index('} as const')])


def webp_paths(node) -> list[str]:
    """Every .webp path inside a manifest entry, however deep."""
    if isinstance(node, str):
        return [node] if node.endswith('.webp') else []
    if isinstance(node, dict):
        node = list(node.values())
    if isinstance(node, list):
        return [p for v in node for p in webp_paths(v)]
    return []


@unittest.skipUnless(MANIFEST.exists(), 'no manifest yet')
class WaveATest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = json.loads(MANIFEST.read_text())

    def test_every_wave_a_picture(self):
        missing = [e.id for e in lists.load_words() + lists.load_items() if e.wave == 'A' and e.id not in self.m['pictures']]
        self.assertEqual(missing, [])

    def test_wave_a_backgrounds(self):
        want = {b.id for b in lists.load_backgrounds() if b.wave == 'A'}
        self.assertTrue(want <= set(self.m['backgrounds']), sorted(want - set(self.m['backgrounds'])))
        for b in want:
            self.assertEqual((self.m['backgrounds'][b]['w'], self.m['backgrounds'][b]['h']), (1770, 1230), b)

    def test_wave_a_unicorns_and_lumi(self):
        for b in WAVE_A_BREEDS:
            for s in ('baby', 'foal'):
                self.assertIn(f'{b}.{s}', self.m['unicorns'])
        self.assertIsNotNone(self.m['lumi'])
        self.assertIsNotNone(self.m['patterns'])

    def test_wave_a_scene_pictures(self):
        waves = {e.id: e.wave for e in lists.load_items() + lists.load_backgrounds()}
        named = [i for i in scene_art_ids() if waves.get(i) == 'A']
        self.assertGreater(len(named), 20)
        have = set(self.m['pictures']) | set(self.m['backgrounds'])
        self.assertEqual([i for i in named if i not in have], [])

    def test_wave_a_eggs(self):
        want = [f'egg-{b}' for b in WAVE_A_BREEDS] + ['egg-golden', 'egg-speckled', 'egg-shell-top', 'egg-shell-bottom']
        self.assertEqual([i for i in want if i not in self.m['pictures']], [])

    def test_files_exist(self):
        for e in self.m['pictures'].values():
            self.assertTrue((paths.PUBLIC_ART / e['src']).exists(), e['src'])

    def test_unicorn_lumi_and_background_files_exist(self):
        files = webp_paths([self.m['backgrounds'], self.m['unicorns'], self.m['lumi'], self.m['patterns']])
        self.assertGreater(len(files), 10)
        self.assertEqual([f for f in files if not (paths.PUBLIC_ART / f).exists()], [])


if __name__ == '__main__':
    unittest.main()
