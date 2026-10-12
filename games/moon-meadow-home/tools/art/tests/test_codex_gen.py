# tools/art/tests/test_codex_gen.py
import json
import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from art import codex_gen

STUB = r'''#!/usr/bin/env python3
import os, re, sys
from pathlib import Path
from PIL import Image
args = sys.argv[1:]
assert args[:4] == ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write'], args
prompt = args[4]
refs = args[6:] if len(args) > 5 and args[5] == '-i' else []
for r in refs:
    assert Path(r).exists(), r
stem = re.search(r'Save it as (\S+)\.png', prompt).group(1)
d = Path(os.environ['STUB_DIR'])
marker = d / (stem + '.tried')
if os.environ.get('STUB_FAIL_FIRST') and not marker.exists():
    marker.write_text('x')
    sys.exit(1)
img = Image.new('RGB', (64, 64), (200, 100, 50))
if os.environ.get('STUB_ELSEWHERE'):
    p = d / 'generated_images' / 'sess' / (stem + '-ig.png')
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p)
    print(f'Saved image to {p}')
else:
    img.save(stem + '.png')
'''


class CodexGenTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.bin = self.d / 'codex-stub'
        self.bin.write_text(STUB)
        self.bin.chmod(self.bin.stat().st_mode | stat.S_IEXEC)
        self.ref = self.d / 'style-reference.png'
        Image.new('RGB', (8, 8)).save(self.ref)
        self.env = mock.patch.dict(os.environ, {'STUB_DIR': str(self.d)})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def job(self, i):
        return codex_gen.Job(f'j{i}', f'Draw. Save it as j{i}.png in the current working directory.', [self.ref],
                             self.d / 'out' / f'j{i}.png')

    def run_jobs(self, jobs, **kw):
        return codex_gen.run_jobs(jobs, codex_bin=str(self.bin), work_dir=self.d / 'work',
                                  ledger=self.d / 'ledger.jsonl', **kw)

    def test_command_puts_prompt_before_images(self):
        cmd = codex_gen.build_command(self.job(1), 'codex')
        self.assertEqual(cmd[:5], ['codex', 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write'])
        self.assertTrue(cmd[5].startswith('Draw.'))
        self.assertEqual(cmd[6:], ['-i', 'style-reference.png'])

    def test_runs_jobs_in_parallel_and_writes_outputs(self):
        res = self.run_jobs([self.job(i) for i in range(3)], parallel=2)
        self.assertTrue(all(r.ok for r in res))
        for i in range(3):
            self.assertEqual(Image.open(self.d / 'out' / f'j{i}.png').size, (64, 64))

    def test_retries_after_failure(self):
        with mock.patch.dict(os.environ, {'STUB_FAIL_FIRST': '1'}):
            (r,) = self.run_jobs([self.job(1)], retries=2)
        self.assertTrue(r.ok)
        self.assertEqual(r.attempts, 2)

    def test_picks_up_image_saved_elsewhere(self):
        with mock.patch.dict(os.environ, {'STUB_ELSEWHERE': '1'}):
            (r,) = self.run_jobs([self.job(2)])
        self.assertTrue(r.ok)
        self.assertTrue((self.d / 'out' / 'j2.png').exists())

    def test_skips_jobs_with_existing_output(self):
        out = self.d / 'out' / 'j3.png'
        out.parent.mkdir(parents=True)
        Image.new('RGB', (8, 8)).save(out)
        (r,) = self.run_jobs([self.job(3)])
        self.assertTrue(r.ok)
        self.assertEqual(r.attempts, 0)

    def test_writes_ledger(self):
        self.run_jobs([self.job(4)])
        rows = [json.loads(x) for x in (self.d / 'ledger.jsonl').read_text().splitlines()]
        self.assertEqual(rows[-1]['id'], 'j4')
        self.assertTrue(rows[-1]['ok'])

    def test_stdin_is_closed(self):
        # Without stdin closed, codex exec can hang on "Reading additional input from stdin".
        import subprocess
        real = subprocess.run
        seen = {}

        def spy(*a, **kw):
            seen.update(kw)
            return real(*a, **kw)
        with mock.patch.object(codex_gen.subprocess, 'run', spy):
            self.run_jobs([self.job(5)])
        self.assertIs(seen.get('stdin'), subprocess.DEVNULL)

    def test_extract_generated_path(self):
        p = codex_gen.extract_generated_path('done\nSaved image to /Users/x/.codex/generated_images/a/b.png\n')
        self.assertEqual(p, Path('/Users/x/.codex/generated_images/a/b.png'))
        self.assertIsNone(codex_gen.extract_generated_path('nothing here'))


if __name__ == '__main__':
    unittest.main()
