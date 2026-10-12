"""Unit tests for the pure helpers and the budget rules of scripts/generate-audio.py. No network, no key.

Run from the repo root: python3 -m unittest discover -s scripts/tests -v
"""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts' / 'generate-audio.py'
_spec = importlib.util.spec_from_file_location('generate_audio', SCRIPT)
ga = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ga)


class NumbersAndText(unittest.TestCase):
    def test_number_words(self):
        self.assertEqual(ga.num_to_words(7), 'seven')
        self.assertEqual(ga.num_to_words(41), 'forty-one')
        self.assertEqual(ga.num_to_words(100), 'one hundred')
        self.assertEqual(ga.num_to_words(105), 'one hundred and five')

    def test_norm_text_turns_digits_into_words(self):
        self.assertEqual(ga.norm_text('Door 12, bedtime!'), 'door twelve bedtime')
        self.assertEqual(ga.norm_text('41 unicorns'), 'forty one unicorns')
        self.assertEqual(ga.norm_text('[giggles] Hello!'), 'hello')


class SttJudge(unittest.TestCase):
    def test_sound_alike_transcripts_pass(self):
        cases = [('Lin!', 'Lynn'), ('Fin!', 'Finn'), ('Liss!', 'Lis'), ('Ren!', 'Wren'), ('Mit!', 'Mitt'),
                 ('Mam!', "Ma'am"), ('A net.', 'Annette'), ('Two too many.', 'Too, too many'),
                 ('Play time! Drag it.', 'Playtime. Drag it'), ('Brr!', 'Brrr.'), ('Ponn.', 'Pon'),
                 ('Sea.', 'See.'), ('Forty-one unicorns!', '41 unicorns.')]
        for text, heard in cases:
            self.assertIn(ga.stt_judge(text, heard), ga.STT_PASS, (text, heard))

    def test_different_words_fail(self):
        for text, heard in [('Pan.', 'Pen.'), ('Pon!', 'Pawn'), ('Bed.', 'Bet.'), ('Ship.', 'Sheep.'), ('Hat.', 'Hats.')]:
            self.assertEqual(ga.stt_judge(text, heard), 'miss', (text, heard))

    def test_another_word_of_the_pack_fails_even_when_it_sounds_alike(self):
        self.assertEqual(ga.stt_judge('Full.', 'Fool.', others=['Fool.']), 'other-word')
        self.assertEqual(ga.stt_judge('Cap.', 'Cape.', others=['Cape.']), 'other-word')
        self.assertEqual(ga.stt_judge('Cap.', 'Cap.', others=['Cape.']), 'exact')

    def test_expect_list(self):
        self.assertEqual(ga.stt_judge('/tɒt/!', 'Tot', expect=['Tot']), 'expect')

    def test_judge_line_uses_other_words_only_for_words_and_phrases(self):
        lines = [{'id': 'word-full', 'text': 'Full.'}, {'id': 'word-fool', 'text': 'Fool.'},
                 {'id': 'name-lin', 'text': 'Lin!'}, {'id': 'name-lynn', 'text': 'Lynn!'}]
        self.assertEqual(ga.judge_line(lines[0], 'Fool', lines), 'other-word')
        self.assertIn(ga.judge_line(lines[2], 'Lynn', lines), ga.STT_PASS)


class Budget(unittest.TestCase):
    def test_budget_limit(self):
        self.assertEqual(ga.budget_limit(34007, 10007, 0, 24000), 24000)
        self.assertEqual(ga.budget_limit(12000, 10007, 5000, 24000), 1993)
        self.assertEqual(ga.budget_limit(9000, 10007, 0, 24000), 0)
        self.assertEqual(ga.budget_limit(30000, 10007, 23500, 24000), 500)

    def test_retry_seed(self):
        self.assertEqual(ga.retry_seed(11, 1), 1011)
        self.assertEqual(ga.retry_seed(11, 2), 2011)

    def test_read_ledger(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'ledger.jsonl'
            self.assertEqual(ga.read_ledger(p), 0)
            p.write_text('{"credits": 120}\n{"credits": 30}\n')
            self.assertEqual(ga.read_ledger(p), 150)
            p.write_text('{"credits": 120}\n{"credits": 0.34}\n{"credits": 0.34}\n')
            self.assertEqual(ga.read_ledger(p), 121)

    def test_apply_overrides(self):
        lines = [{'id': 'a', 'speaker': 'narrator', 'text': 'A.'}, {'id': 'b', 'speaker': 'narrator', 'text': 'B.', 'seed': 3}]
        out = ga.apply_overrides(lines, {'b': {'seed': 1003}})
        self.assertEqual(out[0], lines[0])
        self.assertEqual(out[1]['seed'], 1003)
        self.assertEqual(lines[1]['seed'], 3)

    def test_validate_refuses_phrase_and_ordinal_lines_by_another_voice(self):
        cast = ga.load_cast()
        errors, _ = ga.validate([{'id': 'phrase-a-hat', 'speaker': 'queen', 'text': 'A hat.'},
                                 {'id': 'ord-2', 'speaker': 'foal', 'text': 'The Second!'}], cast)
        self.assertEqual(len(errors), 2)


class DryRunBudget(unittest.TestCase):
    """The planner in main(): --cap with the ledger, and --strict-order. Dry runs call no API."""

    def run_dry(self, *extra):
        with tempfile.TemporaryDirectory() as d:
            tag = ''.join(chr(97 + int(c, 16)) for c in uuid.uuid4().hex[:6])  # unique letters: no cache hit, no digit
            lines = [{'id': 'g-a', 'speaker': 'narrator', 'text': f'Aaaa {tag}.'},             # 12 characters
                     {'id': 'g-b', 'speaker': 'narrator', 'text': f'Bbbbbbbbbbbbbbbbbbbb {tag}.'},  # 28
                     {'id': 'g-c', 'speaker': 'narrator', 'text': f'C {tag}.'}]               # 9
            (Path(d) / 'lines.json').write_text(json.dumps({'lines': lines}))
            ledger = Path(d) / 'ledger.jsonl'
            ledger.write_text('{"credits": 5}\n')
            r = subprocess.run([sys.executable, str(SCRIPT), str(Path(d) / 'lines.json'), '--dry-run',
                                '--ledger', str(ledger), '--cap', '27', *extra], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            return r.stdout

    def test_cap_skips_lines_that_do_not_fit(self):
        out = self.run_dry()
        self.assertIn(' g-a ', out)
        self.assertIn(' g-c ', out)
        self.assertIn('Not made this run (1): g-b', out)

    def test_strict_order_stops_at_the_first_line_that_does_not_fit(self):
        out = self.run_dry('--strict-order')
        self.assertIn(' g-a ', out)
        self.assertNotIn(' g-c ', out)
        self.assertIn('Not made this run (2): g-b, g-c', out)

    def test_stt_cost_is_kept_back_for_each_clip_that_will_be_checked(self):
        # 22 credits left under the cap: g-a costs 12 + 3, so g-c (9 + 3) no longer fits.
        out = self.run_dry('--stt', '--stt-cost', '3')
        self.assertIn(' g-a ', out)
        self.assertNotIn(' g-c ', out)
        self.assertIn('Not made this run (2): g-b, g-c', out)


if __name__ == '__main__':
    unittest.main()
