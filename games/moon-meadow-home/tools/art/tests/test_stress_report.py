import json
import tempfile
import unittest
from pathlib import Path

from art import stress_report

OUT = 'Result:\n"{\\"frames\\":1800,\\"fps\\":59.8,\\"p50\\":16.7,\\"p95\\":18.2,\\"dropPct\\":1.1,\\"decodedMB\\":64.2,\\"unicorns\\":44,\\"elements\\":610,\\"viewport\\":\\"1180x820\\",\\"art\\":\\"real\\",\\"ok\\":true}"\n'


class StressReportTest(unittest.TestCase):
    def test_parses_playwright_eval_output(self):
        r = stress_report.parse(OUT)
        self.assertEqual(r['viewport'], '1180x820')
        self.assertTrue(r['ok'])

    def test_decision_needs_every_run_to_pass(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'stress-results.json'
            runs = [stress_report.parse(OUT), {**stress_report.parse(OUT), 'viewport': '1024x768', 'ok': False}]
            stress_report.record(p, runs)
            data = json.loads(p.read_text())
            self.assertEqual(data['decision'], 'pixi')
            stress_report.record(p, [stress_report.parse(OUT)])
            self.assertEqual(json.loads(p.read_text())['decision'], 'dom')
            self.assertEqual(len(json.loads(p.read_text())['runs']), 3)


if __name__ == '__main__':
    unittest.main()
