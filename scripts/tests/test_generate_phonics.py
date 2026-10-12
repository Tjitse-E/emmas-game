"""The phonics table: new Phase 5 sounds and aliases. No network."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location('generate_phonics', ROOT / 'scripts' / 'generate-phonics.py')
gp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gp)

ALIASES = {'ai': ['ay', 'a-e'], 'ee': ['ea', 'e-e', 'ey'], 'igh': ['ie', 'i-e'], 'oa': ['oe', 'o-e'], 'oo': ['ue'],
           'ur': ['ir'], 'ow': ['ou'], 'oi': ['oy'], 'or': ['aw', 'au'], 'w': ['wh'], 'f': ['ff', 'ph'],
           'yoo': ['u-e', 'ew']}


class PhonicsTable(unittest.TestCase):
    def test_new_sounds_exist_with_takes_and_expectations(self):
        for g in ('oo-short', 'yoo', 'iz'):
            spec = gp.SOUNDS[g]
            self.assertEqual(spec['kind'], 'vowel')
            self.assertGreaterEqual(len(spec['takes']), 2)
            self.assertTrue(spec['expect'])

    def test_phase5_aliases(self):
        for main, aliases in ALIASES.items():
            for a in aliases:
                self.assertIn(a, gp.SOUNDS[main].get('aliases', []), (main, a))

    def test_every_key_is_unique_and_file_safe(self):
        keys = list(gp.SOUNDS) + [a for s in gp.SOUNDS.values() for a in s.get('aliases', [])]
        self.assertEqual(len(keys), len(set(keys)))
        for k in keys:
            self.assertRegex(k, r'^[a-z]+(-[a-z]+)?$')

    def test_alias_entries_cover_every_main_sound_already_made(self):
        sounds = {'ai': {'id': 'snd-ai', 'file': 'snd-ai.mp3', 'sustain': False, 'kind': 'vowel'}}
        out = gp.alias_entries(sounds)
        self.assertEqual(set(out), {'ay', 'a-e'})
        self.assertEqual(out['ay'], {'id': 'snd-ay', 'file': 'snd-ai.mp3', 'sustain': False, 'kind': 'vowel',
                                     'same_as': 'ai'})


if __name__ == '__main__':
    unittest.main()
