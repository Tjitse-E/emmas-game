#!/usr/bin/env python3
"""Make Moon Meadow World's ElevenLabs sound effects and background loops (docs/v4/2.3.md section 20).

Usage, outside the sandbox, from anywhere in the repo (sfx.sh passes its arguments on):
    sh games/moon-meadow-world/tools/audio/sfx.sh --dry-run [--left N]   the plan and its credits; calls nothing
    sh games/moon-meadow-world/tools/audio/sfx.sh --probe                the 2 s probe and the real rate
    sh games/moon-meadow-world/tools/audio/sfx.sh [--only a,b] [--core]  make what has no file yet
    sh games/moon-meadow-world/tools/audio/sfx.sh --retake a,b           make these again
    sh games/moon-meadow-world/tools/audio/sfx.sh --approve a,b          Tjitse has listened; calls nothing

- The list and the prompts are tools/audio/sfx.json. Its `later` list is never made.
- An effect or loop is made when public/audio/sfx/<id>.mp3 does not exist, or with --retake. The API has no seed,
  so a made file is kept, and a retake keeps the old file in .cache/sfx/old/.
- Planned credits = seconds x sfxPerSecond (budget.json, never below 40). The run refuses when the ledger plus the
  plan passes the cap, or when the account would fall under the floor.
- One attempt per call: POST /v1/sound-generation goes through the speech script's http() with tries=1, because a
  retried POST can be charged without being booked. Every attempt is booked in the ledger before its call, also one
  that fails, and a failed effect stops the run. The run has one ledger line, rewritten after each attempt.
- --probe makes only the probe effect (sfx.json `probe`, bedtime-bell, 2 s). It reads the account counter before,
  then every 30 s for up to 10 minutes until the counter moves, and writes sfxProbe and sfxPerSecond into
  budget.json. It never writes a rate below 40; a counter that has not moved gives no rate.
- The key: load_key, http, credits_left and read_ledger come from scripts/generate-audio.py (imported with
  importlib, so that script does not change), and the key is read only inside this process. Never printed.

Standard library plus ffmpeg and ffprobe.
"""
import argparse
import datetime
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from types import SimpleNamespace

sys.dont_write_bytecode = True

HERE = Path(__file__).resolve().parent
GAME = HERE.parent.parent
ROOT = GAME.parent.parent
SPEECH = ROOT / 'scripts' / 'generate-audio.py'
API_PATH = '/v1/sound-generation'
MIN_RATE = 40.0           # credits a second; ElevenLabs' price when duration_seconds is set, and the floor of any rate
PROBE_POLL_S = 30
PROBE_WAIT_S = 600        # the account counter lags a few minutes
SHRINK_RATE = 50.0        # above this the pack shrinks to the core effects and the day loop (section 21)
SHRINK_CALL = 200.0
SAMPLE_RATE = 44100
HEAD = f'aformat=sample_fmts=fltp:sample_rates={SAMPLE_RATE}:channel_layouts=mono'
TAIL_TRIM = ('areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05:detection=peak,'
             'areverse')


def speech_module():
    """scripts/generate-audio.py as a module. Importing it reads no key: http() calls load_key() when it runs."""
    spec = importlib.util.spec_from_file_location('generate_audio', SPEECH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def default_api():
    s = speech_module()
    return SimpleNamespace(load_key=s.load_key, http=s.http, credits_left=s.credits_left, read_ledger=s.read_ledger,
                           min_floor=s.MIN_CREDITS)


def default_paths():
    return SimpleNamespace(sfx=HERE / 'sfx.json', budget=HERE / 'budget.json', ledger=HERE / 'ledger.jsonl',
                           out=GAME / 'public' / 'audio' / 'sfx', cache=ROOT / '.cache' / 'sfx', root=ROOT)


def now_iso():
    return datetime.datetime.now().isoformat(timespec='seconds')


def read_json(path, default=None):
    return json.loads(Path(path).read_text()) if Path(path).exists() else default


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    tmp.replace(path)


def rate_of(budget):
    """Credits a second for the plan: budget.json sfxPerSecond, never below 40."""
    try:
        return max(MIN_RATE, float(budget.get('sfxPerSecond') or MIN_RATE))
    except (TypeError, ValueError):
        return MIN_RATE


def ids_arg(text):
    return [s.strip() for s in (text or '').split(',') if s.strip()]


def all_items(spec):
    return ([dict(e, loop=False) for e in spec.get('effects', [])]
            + [dict(e, loop=True) for e in spec.get('loops', [])])


def plan(spec, out_dir, rate, only=(), retake=(), core=False, probe=False):
    """The effects and loops to make, each with its credits, and the ones skipped because their file exists.

    Raises SystemExit for an unknown id or one in `later`.
    """
    items = all_items(spec)
    by_id = {i['id']: i for i in items}
    later = {i['id'] for i in spec.get('later', [])}
    asked = list(only) + list(retake)
    waiting = sorted({i for i in asked if i in later})
    if waiting:
        raise SystemExit(f'Not made in this version (sfx.json later): {", ".join(waiting)}.')
    unknown = sorted({i for i in asked if i not in by_id})
    if unknown:
        raise SystemExit(f'Unknown ids: {", ".join(unknown)}.')
    if probe:
        chosen = [by_id[spec['probe']]]
    elif retake:
        chosen = [i for i in items if i['id'] in retake]
    else:
        chosen = [i for i in items if (not only or i['id'] in only) and (not core or i.get('core') or i['loop'])]
    todo, skipped = [], []
    for item in chosen:
        if item['id'] not in retake and (Path(out_dir) / f'{item["id"]}.mp3').exists():
            skipped.append(item['id'])
            continue
        todo.append(dict(item, credits=round(float(item['seconds']) * rate, 2)))
    return todo, skipped


def refusal(used, planned, cap, left, floor):
    """Why the run may not spend `planned` credits, or None."""
    if used + planned > cap:
        return (f'Refusing: the ledger ({used:g}) plus this plan ({planned:g}) is {used + planned:g}, '
                f'over the cap of {cap:g}.')
    if left is not None and left - planned < floor:
        return (f'Refusing: {left:g} credits left minus this plan ({planned:g}) is {left - planned:g}, '
                f'under the floor of {floor:g}.')
    return None


class Ledger:
    """This run's line in the ledger. It is written before the first call and rewritten after every attempt, so the
    cap always counts every attempt, also when the process dies in the middle of a call."""

    def __init__(self, path, before):
        self.path = Path(path)
        self.rec = {'t': now_iso(), 'lines': 'sfx', 'made': 0, 'seconds': 0, 'credits': 0, 'credits_before': before,
                    'attempts': 0, 'ids': []}
        self.run = f'sfx-{datetime.datetime.now().strftime("%Y%m%dT%H%M%S.%f")}'
        self.rec['run'] = self.run
        self.written = False

    def _write(self):
        lines = self.path.read_text().splitlines() if self.path.exists() else []
        out, placed = [], False
        for line in lines:
            try:
                same = json.loads(line).get('run') == self.run
            except ValueError:
                same = False
            if same:
                out.append(json.dumps(self.rec))
                placed = True
            elif line.strip():
                out.append(line)
        if not placed:
            out.append(json.dumps(self.rec))
        tmp = self.path.with_name(self.path.name + '.tmp')
        tmp.write_text('\n'.join(out) + '\n')
        tmp.replace(self.path)
        self.written = True

    def book(self, item):
        self.rec['attempts'] += 1
        self.rec['seconds'] = round(self.rec['seconds'] + float(item['seconds']), 2)
        self.rec['credits'] = round(self.rec['credits'] + item['credits'], 2)
        self.rec['ids'].append(item['id'])
        self._write()

    def made(self):
        self.rec['made'] += 1
        self._write()

    def correct(self, extra):
        """Book `extra` credits more (the probe cost more than planned)."""
        self.rec['credits'] = round(self.rec['credits'] + extra, 2)
        self._write()


# ------------------------------------------------------------------------------------------------ ffmpeg

def run_ffmpeg(*args):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError('ffmpeg failed: ' + r.stderr[-600:])
    return r.stderr


def probe_value(path, entry):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', f'stream={entry}',
                        '-of', 'csv=p=0', str(path)], capture_output=True, text=True)
    try:
        return float(r.stdout.strip().split(',')[0])
    except ValueError:
        return None


def process_effect(raw, out):
    """Mono, 44.1 kHz, 96 kbps; trailing silence under -50 dB trimmed, a 5 ms fade-in, the peak at -3 dBFS."""
    chain = f'{HEAD},{TAIL_TRIM},afade=t=in:st=0:d=0.005'
    log = run_ffmpeg('-i', str(raw), '-af', f'{chain},volumedetect', '-f', 'null', '-')
    m = re.search(r'max_volume:\s*(-?[\d.]+) dB', log)
    gain = -3.0 - float(m.group(1)) if m else 0.0
    tmp = out.with_name(out.stem + '.tmp.mp3')
    run_ffmpeg('-i', str(raw), '-af', f'{chain},volume={gain:.2f}dB', '-ac', '1', '-ar', str(SAMPLE_RATE),
               '-c:a', 'libmp3lame', '-b:a', '96k', str(tmp))
    tmp.replace(out)
    seconds = probe_value(out, 'duration')
    return {'seconds': round(seconds, 4) if seconds else None, 'loopStart': None, 'loopEnd': None}


def process_loop(raw, out):
    """Mono, 44.1 kHz, 96 kbps at -20 LUFS (one gain, no limiter, so the seam stays), not trimmed.

    Decoders differ in what they keep of the MP3 encoder delay: Chrome reads the gapless header and keeps none,
    WebKit keeps 576 samples, a plain decoder 1105. So the file holds the loop twice, and the loop window is the middle
    period (from half a period to one and a half). That window is exactly one period long and lies inside the sound
    whatever the decoder keeps in front, so the seam has no gap of padding in any browser. `seconds` is one period."""
    log = run_ffmpeg('-i', str(raw), '-af', f'{HEAD},loudnorm=I=-20:TP=-2:LRA=11:print_format=json', '-f', 'null', '-')
    m = json.loads(log[log.rindex('{'):log.rindex('}') + 1])
    try:
        gain = min(-20.0 - float(m['input_i']), -1.5 - float(m['input_tp']))
    except (KeyError, ValueError):
        gain = 0.0
    wav = out.with_name(out.stem + '.tmp.wav')
    tmp = out.with_name(out.stem + '.tmp.mp3')
    run_ffmpeg('-i', str(raw), '-af', f'{HEAD},volume={gain:.2f}dB', '-c:a', 'pcm_s16le', str(wav))
    samples = int(probe_value(wav, 'duration_ts'))
    run_ffmpeg('-stream_loop', '1', '-i', str(wav), '-ac', '1', '-ar', str(SAMPLE_RATE), '-c:a', 'libmp3lame',
               '-b:a', '96k', str(tmp))
    wav.unlink()
    tmp.replace(out)
    start = (samples // 2) / SAMPLE_RATE
    seconds = samples / SAMPLE_RATE
    return {'seconds': round(seconds, 6), 'loopStart': round(start, 6), 'loopEnd': round(start + seconds, 6)}


def default_process(item, raw, out):
    return process_loop(raw, out) if item['loop'] else process_effect(raw, out)


# ------------------------------------------------------------------------------------------------ the run

def make_one(item, spec, api, paths, process, manifest):
    """One attempt for one item: the POST (tries=1), the raw file kept, the processed file, the manifest entry."""
    body = {'text': item['text'], 'duration_seconds': float(item['seconds']),
            'prompt_influence': spec.get('promptInfluence', 0.5), 'model_id': spec['model']}
    if item['loop']:
        body['loop'] = True
    audio = api.http(API_PATH, body, params={'output_format': 'mp3_44100_128'}, raw=True, tries=1)
    if not audio or len(audio) < 500:
        raise RuntimeError(f'suspiciously small audio ({len(audio or b"")} bytes)')
    stamp = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
    cache = Path(paths.cache)
    cache.mkdir(parents=True, exist_ok=True)
    raw = cache / f'{item["id"]}-{stamp}.mp3'
    raw.write_bytes(audio)
    out_dir = Path(paths.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f'{item["id"]}.mp3'
    if out.exists():  # a retake: the old file stays in the cache, because the API cannot make it again
        (cache / 'old').mkdir(exist_ok=True)
        shutil.copy2(out, cache / 'old' / f'{item["id"]}-{stamp}.mp3')
    info = process(item, raw, out)
    manifest.setdefault('clips', {})[item['id']] = {
        'file': out.name, 'seconds': info.get('seconds'), 'loop': item['loop'], 'loopStart': info.get('loopStart'),
        'loopEnd': info.get('loopEnd'), 'approved': False, 'made': now_iso(), 'raw': raw.name, 'text': item['text'],
    }


def save_manifest(paths, spec, manifest):
    order = [i['id'] for i in all_items(spec)]
    clips = manifest.get('clips', {})
    manifest['clips'] = {i: clips[i] for i in order if i in clips}
    manifest['updated'] = now_iso()
    write_json(Path(paths.out) / 'manifest.json', manifest)


def probe_wait(api, before, sleep):
    """Poll the account counter every 30 s for up to 10 minutes until it moves down. Returns (after, seconds)."""
    waited = 0
    after = before
    while waited < PROBE_WAIT_S:
        sleep(PROBE_POLL_S)
        waited += PROBE_POLL_S
        after, _ = api.credits_left()
        if after < before:
            break
    return after, waited


def approve(paths, ids):
    manifest_path = Path(paths.out) / 'manifest.json'
    manifest = read_json(manifest_path, {'clips': {}})
    missing = [i for i in ids if i not in manifest.get('clips', {})]
    if missing:
        print(f'Not made yet, so not approved: {", ".join(missing)}')
        return 1
    for i in ids:
        manifest['clips'][i]['approved'] = True
    manifest['updated'] = now_iso()
    write_json(manifest_path, manifest)
    print(f'Approved: {", ".join(ids)}')
    return 0


def main(argv=None, api=None, paths=None, sleep=time.sleep, process=default_process):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dry-run', action='store_true', help='print the plan and its credits, call nothing')
    ap.add_argument('--left', type=float, default=None, help='with --dry-run: check the floor against this many credits')
    ap.add_argument('--probe', action='store_true', help='make only the probe effect and measure the real rate')
    ap.add_argument('--only', default='', help='comma separated ids')
    ap.add_argument('--core', action='store_true', help='only the effects marked core, and the loops')
    ap.add_argument('--retake', default='', help='comma separated ids to make again (the old file is kept)')
    ap.add_argument('--approve', default='', help='comma separated ids Tjitse has listened to; calls nothing')
    args = ap.parse_args(argv)
    paths = paths or default_paths()

    if args.approve:
        return approve(paths, ids_arg(args.approve))

    spec = read_json(paths.sfx)
    budget = read_json(paths.budget, {})
    rate = rate_of(budget)
    only, retake = ids_arg(args.only), ids_arg(args.retake)
    try:
        todo, skipped = plan(spec, paths.out, rate, only=only, retake=retake, core=args.core, probe=args.probe)
    except SystemExit as e:
        print(e)
        return 1
    if args.probe and not todo:
        print(f'{spec["probe"]} is already made, so it cannot be the probe. Nothing to do.')
        return 1

    if api is None and not args.dry_run:
        api = default_api()
    read_ledger = api.read_ledger if api else speech_module().read_ledger
    used = read_ledger(paths.ledger)
    cap = float(budget.get('cap', 0))
    floor = max(float(getattr(api, 'min_floor', 8000) if api else 8000), float(budget.get('floor', 0)))
    planned = round(sum(i['credits'] for i in todo), 2)

    print(f'Sound effects: {len(todo)} to make, {len(skipped)} already made, at {rate:g} credits a second.')
    for i in todo:
        flags = ' '.join(f for f, on in (('loop', i['loop']), ('core', i.get('core')), ('retake', i['id'] in retake)) if on)
        print(f'  {i["id"]:<16} {float(i["seconds"]):>5.1f} s {i["credits"]:>8.2f} credits  {flags}')
    if skipped:
        print(f'  made before: {", ".join(skipped)}')
    print(f'Planned: {planned:g} credits. Ledger {used:g} of the cap {cap:g}, floor {floor:g}.')

    if args.dry_run:
        why = refusal(used, planned, cap, args.left, floor)
        if args.left is None:
            print('Floor not checked: a dry run reads no account counter (give --left N).')
        print(why or 'Within the cap' + (' and the floor.' if args.left is not None else '.'))
        return 1 if why else 0
    if not todo:
        print('Nothing to make.')
        return 0

    api.load_key()  # stops here, before anything is booked, when the key is missing
    before, _ = api.credits_left()
    print(f'Credits left on the account: {before:g}')
    why = refusal(used, planned, cap, before, floor)
    if why:
        print(why)
        return 1

    ledger = Ledger(paths.ledger, before)
    manifest = read_json(Path(paths.out) / 'manifest.json', {'clips': {}})
    manifest.setdefault('note', 'Written by tools/audio/gen-sfx.py. approved is false until Tjitse has listened '
                                '(sfx.sh --approve id); the game plays only approved files.')
    for item in todo:
        ledger.book(item)  # booked before the call: a failed or cut-off attempt still counts against the cap
        try:
            make_one(item, spec, api, paths, process, manifest)
        except Exception as e:  # one attempt only: a failure stops the run
            print(f'  FAILED {item["id"]}: {e}')
            print(f'Stopped. Booked {ledger.rec["credits"]:g} credits for {ledger.rec["attempts"]} attempt(s).')
            save_manifest(paths, spec, manifest)
            return 1
        ledger.made()
        save_manifest(paths, spec, manifest)
        print(f'  made {item["id"]}')

    if args.probe:
        item = todo[0]
        print(f'Waiting for the account counter to move (every {PROBE_POLL_S} s, up to {PROBE_WAIT_S // 60} minutes).')
        after, waited = probe_wait(api, before, sleep)
        seconds = float(item['seconds'])
        record = {'t': now_iso(), 'id': item['id'], 'seconds': seconds, 'before': before, 'after': after,
                  'minutes': round(waited / 60, 1)}
        if after < before:
            cost = before - after
            measured = cost / seconds
            record.update(credits=cost, rate=round(measured, 2))
            budget['sfxPerSecond'] = max(MIN_RATE, round(measured, 2))
            if cost > item['credits']:
                ledger.correct(round(cost - item['credits'], 2))
            print(f'The probe took {cost:g} credits: {measured:.1f} a second. sfxPerSecond is now '
                  f'{budget["sfxPerSecond"]:g}.')
            if measured > SHRINK_RATE or cost >= SHRINK_CALL:
                print('That is more than 50 a second (or 200 a call): make only the core effects and the day loop '
                      '(sfx.sh --core). The rest waits for 2.3.1.')
        else:
            record.update(credits=None, rate=None, note='The counter did not move in 10 minutes: no rate.')
            budget['sfxPerSecond'] = rate
            print(f'The counter did not move in {PROBE_WAIT_S // 60} minutes: no rate. sfxPerSecond stays {rate:g}.')
        budget['sfxProbe'] = record
        write_json(paths.budget, budget)

    print(f'Done: {ledger.rec["made"]} made, {ledger.rec["credits"]:g} credits booked. Listen to each one, then '
          f'sfx.sh --approve <ids>.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
