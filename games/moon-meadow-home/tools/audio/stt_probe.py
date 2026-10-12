#!/usr/bin/env python3
"""Measure what one speech-to-text check costs and write it to budget.json as sttPerCheck (audio run 0).

Usage, from the repo root and outside the sandbox (the generator reads the key file itself):
    python3 games/moon-meadow-home/tools/audio/stt_probe.py [--calls 6] [--dry-run]

The ElevenLabs usage counter lags a few minutes. The probe waits until the counter is still, transcribes
--calls clips of the v2 game (typical clip lengths, nothing is regenerated), waits until the counter is still
again and divides the change by the number of calls. The spend goes into the build ledger, so the cap sees it.
"""
import argparse
import datetime
import importlib.util
import json
import math
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BUDGET = HERE / 'budget.json'
LEDGER = HERE / 'ledger.jsonl'
V2_AUDIO = ROOT / 'ideas' / 'opus-5-5-unicorn-egg-nest-v2' / 'audio'

_spec = importlib.util.spec_from_file_location('generate_audio', ROOT / 'scripts' / 'generate-audio.py')
ga = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ga)


def is_still(reads, n=2):
    """True when the last n counter reads are equal (the usage counter has caught up)."""
    return len(reads) >= n and len(set(reads[-n:])) == 1


def per_check(delta, calls):
    """Credits one check costs, rounded up to a hundredth so the budget never undercounts. Zero when nothing was
    charged. A check of a short clip costs a fraction of a credit, so a whole credit per check would overcount the
    ledger by thousands over the build."""
    if calls <= 0 or delta <= 0:
        return 0
    return math.ceil(round(delta * 100 / calls, 6)) / 100


def probe_clips(manifest, calls):
    """Narrator clips of the v2 game spread over short and long lines: every k-th clip by duration."""
    clips = sorted((c for c in manifest['clips'].values() if c.get('speaker') == 'narrator' and c.get('duration_ms')),
                   key=lambda c: (c['duration_ms'], c['file']))
    if not clips:
        return []
    step = max(1, len(clips) // calls)
    return clips[step // 2::step][:calls]


def update_budget(budget, cost, record):
    out = dict(budget)
    out['sttPerCheck'] = cost
    out['sttProbe'] = record
    return out


def used_count():
    _, sub = ga.credits_left()
    return int(sub.get('character_count', 0))


def wait_still(label, interval, limit, must_change_from=None):
    """Read the counter every interval seconds until two reads match (and, when asked, differ from a start)."""
    reads, t0 = [used_count()], time.time()
    print(f'{label}: counter {reads[-1]}', flush=True)
    while time.time() - t0 < limit:
        time.sleep(interval)
        reads.append(used_count())
        print(f'{label}: counter {reads[-1]}', flush=True)
        changed = must_change_from is None or reads[-1] != must_change_from
        if changed and is_still(reads):
            return reads[-1], True
    return reads[-1], False


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--calls', type=int, default=6)
    ap.add_argument('--interval', type=int, default=30, help='seconds between counter reads')
    ap.add_argument('--limit', type=int, default=480, help='most seconds to wait for the counter')
    ap.add_argument('--dry-run', action='store_true', help='list the clips, call nothing')
    args = ap.parse_args()

    clips = probe_clips(json.loads((V2_AUDIO / 'manifest.json').read_text()), args.calls)
    seconds = sum(c['duration_ms'] for c in clips) / 1000
    for c in clips:
        print(f'  {c["file"]:<28} {c["duration_ms"]:>5} ms  {c["text"]}')
    print(f'{len(clips)} clips, {seconds:.1f} s of audio')
    if args.dry_run:
        return

    start, _ = wait_still('before', args.interval, args.limit)
    heard = [ga.transcribe(V2_AUDIO / c['file']) for c in clips]
    for c, h in zip(clips, heard):
        print(f'  heard {h!r} for {c["text"]!r} ({ga.stt_judge(c["text"], h)})')
    end, still = wait_still('after', args.interval, args.limit, must_change_from=start)
    delta = end - start
    cost = per_check(delta, len(clips))
    record = {'measured': datetime.datetime.now().isoformat(timespec='seconds'), 'calls': len(clips),
              'audioSeconds': round(seconds, 1), 'counterChange': delta, 'counterSettled': still,
              'note': 'Credits per check, rounded up to a hundredth. Every later run reserves this per clip it checks (gen.sh --stt-cost).'}
    BUDGET.write_text(json.dumps(update_budget(json.loads(BUDGET.read_text()), cost, record), indent=1) + '\n')
    with open(LEDGER, 'a') as f:
        f.write(json.dumps({'t': record['measured'], 'lines': 'stt-probe', 'made': 0, 'chars': 0, 'credits': delta,
                            'credits_before': None, 'stt_calls': len(clips), 'stt_credits': delta}) + '\n')
    print(f'Counter change {delta} over {len(clips)} checks: sttPerCheck {cost}'
          + ('' if still else ' (the counter did not settle in time; rerun later to confirm)'))


if __name__ == '__main__':
    main()
