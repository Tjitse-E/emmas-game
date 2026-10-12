"""The speech-to-text cost probe (games/moon-meadow-home/tools/audio/stt_probe.py). No network."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location('stt_probe', ROOT / 'games' / 'moon-meadow-home' / 'tools' / 'audio' / 'stt_probe.py')
sp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sp)


class SttProbe(unittest.TestCase):
    def test_is_still(self):
        self.assertFalse(sp.is_still([5]))
        self.assertFalse(sp.is_still([5, 6]))
        self.assertTrue(sp.is_still([5, 6, 6]))

    def test_per_check_rounds_up_and_never_goes_negative(self):
        self.assertEqual(sp.per_check(2, 6), 0.34)
        self.assertEqual(sp.per_check(12, 6), 2)
        self.assertEqual(sp.per_check(10, 6), 1.67)
        self.assertEqual(sp.per_check(0, 6), 0)
        self.assertEqual(sp.per_check(-3, 6), 0)
        self.assertEqual(sp.per_check(4, 0), 0)

    def test_probe_clips_spread_over_lengths(self):
        manifest = {'clips': {str(i): {'file': f'c{i}.mp3', 'speaker': 'narrator', 'duration_ms': 100 * i, 'text': 'x'}
                              for i in range(1, 13)}}
        manifest['clips']['q'] = {'file': 'q.mp3', 'speaker': 'queen', 'duration_ms': 50, 'text': 'q'}
        picked = sp.probe_clips(manifest, 6)
        self.assertEqual([c['file'] for c in picked], ['c2.mp3', 'c4.mp3', 'c6.mp3', 'c8.mp3', 'c10.mp3', 'c12.mp3'])

    def test_update_budget_keeps_the_other_keys(self):
        out = sp.update_budget({'cap': 24000, 'floor': 10007}, 3, {'calls': 6})
        self.assertEqual(out, {'cap': 24000, 'floor': 10007, 'sttPerCheck': 3, 'sttProbe': {'calls': 6}})


if __name__ == '__main__':
    unittest.main()
