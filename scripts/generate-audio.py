#!/usr/bin/env python3
"""Generate the spoken clips of one game from its lines.json with ElevenLabs.

Usage (from the repo root, outside the sandbox):
    python3 scripts/generate-audio.py <path>/lines.json [--max-chars N] [--dry-run] [--only id1,id2]
        [--force] [--stt] [--stt-retry N] [--stt-cost N] [--floor N] [--ledger PATH] [--cap N] [--strict-order]
    python3 scripts/generate-audio.py --credits

- Voices come from shared/cast.json (speaker -> voice id, model, settings, seed).
- Writes <dir>/audio/<id>.mp3 next to lines.json and <dir>/audio/manifest.json.
- Each clip is cached by a sha256 of voice id, model, text, settings, seed and
  language code. Unchanged clips are skipped. Raw API audio is also kept in
  .cache/tts/ (gitignored), so reprocessing never costs credits.
- Refuses to call the API when fewer than 8000 credits are left this month.
- The API key is read from the repo env file inside this process only. It is
  never printed, logged or written anywhere.

Standard library plus ffmpeg and ffprobe.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import math
import re
import shlex
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAST_PATH = ROOT / 'shared' / 'cast.json'
RAW_CACHE = ROOT / '.cache' / 'tts'
API = 'https://api.elevenlabs.io'
MIN_CREDITS = 8000
WORKERS = 4
NARRATOR_ONLY_PREFIXES = ('word-', 'name-', 'num-', 'sound-', 'phrase-', 'ord-')
LEARNING_PREFIXES = ('word-', 'name-', 'num-', 'phrase-', 'ord-')
STT_SPEAKERS = ('narrator', 'queen')
ID_RE = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
TAG_RE = re.compile(r'\[[^\]]*\]')

_key_cache = None


def load_key():
    """Read the ElevenLabs key from the repo env file. Never print it."""
    global _key_cache
    if _key_cache:
        return _key_cache
    env_file = ROOT / ('.' + 'env')
    if not env_file.exists():
        raise SystemExit('No env file with an ElevenLabs key in the repo root.')
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line.startswith('export '):
            line = line[7:]
        if '=' not in line or line.startswith('#'):
            continue
        name, value = line.split('=', 1)
        if name.strip() in ('ELEVENLABS_API', 'ELEVENLABS_API_KEY'):
            parts = shlex.split(value, comments=True)
            if parts:
                _key_cache = parts[0]
                return _key_cache
    raise SystemExit('No ElevenLabs key found in the env file.')


def http(path, data=None, params=None, raw=False, headers=None, body=None, tries=6):
    """Call the ElevenLabs API. Retries 429 and 5xx with backoff."""
    url = API + path
    if params:
        url += '?' + '&'.join(f'{k}={v}' for k, v in params.items())
    hdrs = {'xi-api-key': load_key()}
    if body is None and data is not None:
        body = json.dumps(data).encode()
        hdrs['Content-Type'] = 'application/json'
    hdrs.update(headers or {})
    delay = 2.0
    for attempt in range(tries):
        req = urllib.request.Request(url, data=body, headers=hdrs)
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                out = r.read()
            return out if raw else json.loads(out)
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode('utf-8', 'replace')
            if (e.code == 429 or e.code >= 500) and attempt < tries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            raise RuntimeError(f'HTTP {e.code} on {path}: {detail}') from None
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < tries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            raise RuntimeError(f'Network error on {path}: {e}') from None


def credits_left():
    s = http('/v1/user/subscription')
    return int(s.get('character_limit', 0)) - int(s.get('character_count', 0)), s


def load_cast():
    return json.loads(CAST_PATH.read_text())['speakers']


def request_for(speaker, text, cast, seed=None):
    """The exact TTS request for one line. Everything that changes the audio is in here."""
    c = cast[speaker]
    req = {'voice_id': c['voice_id'], 'model': c['model'], 'text': text,
           'voice_settings': c['voice_settings'], 'seed': c['seed'] if seed is None else seed}
    if c.get('language_code'):
        req['language_code'] = c['language_code']
    return req


def clip_hash(req):
    blob = json.dumps([req['voice_id'], req['model'], req['text'], req['voice_settings'], req['seed'],
                       req.get('language_code')], ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()


def tts_raw(req, force=False):
    """Return (path to raw mp3, characters sent). Uses the raw cache unless force."""
    h = clip_hash(req)
    RAW_CACHE.mkdir(parents=True, exist_ok=True)
    path = RAW_CACHE / f'{h}.mp3'
    if path.exists() and not force:
        return path, 0
    body = {'text': req['text'], 'model_id': req['model'], 'voice_settings': req['voice_settings'],
            'seed': req['seed']}
    if req.get('language_code'):
        body['language_code'] = req['language_code']
    audio = http(f'/v1/text-to-speech/{req["voice_id"]}', body,
                 params={'output_format': 'mp3_44100_128'}, raw=True)
    if len(audio) < 500:
        raise RuntimeError(f'Suspiciously small audio ({len(audio)} bytes) for {req["text"]!r}')
    tmp = path.with_suffix('.part')
    tmp.write_bytes(audio)
    tmp.replace(path)
    return path, len(req['text'])


def ffmpeg(*args, capture=False):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError('ffmpeg failed: ' + r.stderr[-600:])
    return r.stderr if capture else None


TRIM = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05:detection=peak,'
        'areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05:detection=peak,areverse')


def process_speech(raw, out, lufs=-16.0):
    """Mono, silence trimmed to about 50 ms, loudness about -16 LUFS, peaks limited to -1 dBFS, 96 kbps mp3.

    Short clips are too short for loudnorm's dynamic mode, so the gain is measured first (loudnorm
    analysis pass) and applied as a plain volume change, with a gentle limiter for plosive peaks.
    """
    log = ffmpeg('-i', str(raw), '-af', f'{TRIM},loudnorm=I={lufs}:TP=-1.5:LRA=11:print_format=json',
                 '-ac', '1', '-f', 'null', '-', capture=True)
    m = json.loads(log[log.rindex('{'):log.rindex('}') + 1])
    try:
        gain = max(min(lufs - float(m['input_i']), 30.0), -30.0)
    except ValueError:
        gain = 0.0
    chain = f'{TRIM},volume={gain:.2f}dB,alimiter=limit=0.891:attack=3:release=60:level=false'
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.stem + '.tmp.mp3')
    ffmpeg('-i', str(raw), '-af', chain, '-ac', '1', '-ar', '44100', '-b:a', '96k', str(tmp))
    tmp.replace(out)


def duration_ms(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                       capture_output=True, text=True)
    try:
        return round(float(r.stdout.strip()) * 1000)
    except ValueError:
        return None


def transcribe(path, model='scribe_v2'):
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in (('model_id', model), ('language_code', 'en'), ('tag_audio_events', 'false')):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
                 f'Content-Type: audio/mpeg\r\n\r\n'.encode() + path.read_bytes() + b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    res = http('/v1/speech-to-text', body=b''.join(parts),
               headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    return res.get('text', '')


ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
        'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def num_to_words(n):
    """British number words for 0 to 999: 41 -> forty-one, 105 -> one hundred and five."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ('' if n % 10 == 0 else '-' + ONES[n % 10])
    rest = n % 100
    return ONES[n // 100] + ' hundred' + ('' if rest == 0 else ' and ' + num_to_words(rest))


def norm_text(t):
    t = TAG_RE.sub(' ', t).lower().replace('’', "'")
    t = re.sub(r'\b(\d{1,3})\b', lambda m: num_to_words(int(m.group(1))), t)
    t = re.sub(r"[^a-z0-9' ]+", ' ', t)
    return ' '.join(t.split())


HOMOPHONES = {'two': 'to', 'too': 'to', 'four': 'for', 'won': 'one', 'ate': 'eight'}
WORD_RULES = [  # applied in order to each word
    (r"'", ''), (r'^wr', 'r'), (r'^kn', 'n'), (r'^wh', 'w'), (r'ph', 'f'), (r'ck', 'k'), (r'q', 'k'),
    (r'c(?=[aoulrt]|$)', 'k'), (r'x', 'ks'), (r'gh', ''),
    (r'ee|ea|ey', 'e'), (r'ai|ay', 'a'), (r'oa|ow|oe', 'o'), (r'oo|ew|ue', 'u'), (r'(?<=.)y', 'i'),
    (r'(?<=..)e$', ''), (r'(.)\1+', r'\1'),
]


def phonetic_key(text):
    """A rough sound-alike key: Lin and Lynn, A net and Annette, Mitt and Mit give the same key."""
    out = []
    for w in norm_text(text).replace('-', ' ').split():
        w = HOMOPHONES.get(w, w)
        for pat, rep in WORD_RULES:
            w = re.sub(pat, rep, w)
        out.append(w)
    return re.sub(r'(.)\1+', r'\1', ''.join(out))


def stt_judge(text, heard, expect=(), others=()):
    """'exact', 'expect', 'alike', 'other-word' or 'miss'.

    others: texts of the other lines in the same lines.json. When the transcript is exactly another line
    (pan heard for pen, cape for cap), the clip says the wrong word, so it is a miss even if it sounds alike.
    """
    h = norm_text(heard)
    if h == norm_text(text):
        return 'exact'
    if any(h == norm_text(e) for e in expect):
        return 'expect'
    if any(h == norm_text(o) for o in others if norm_text(o) != norm_text(text)):
        return 'other-word'
    if phonetic_key(heard) and phonetic_key(heard) == phonetic_key(text):
        return 'alike'
    return 'miss'


STT_PASS = ('exact', 'expect', 'alike')


def budget_limit(before, floor, used, cap):
    """Credits this run may spend: never below the floor of credits left, never above the build cap."""
    return max(0, min(before - floor, cap - used))


def retry_seed(base, attempt):
    return base + 1000 * attempt


def read_ledger(path):
    """Credits spent by earlier runs, from a JSON-lines ledger. A missing file is zero."""
    if not path or not Path(path).exists():
        return 0
    total = sum(float(json.loads(l).get('credits', 0)) for l in Path(path).read_text().splitlines() if l.strip())
    return math.ceil(round(total, 6))  # speech-to-text costs are fractions of a credit


def apply_overrides(lines, overrides):
    """overrides.json next to lines.json: {id: {seed}}. Written by --stt-retry, so lines.json can be rebuilt freely."""
    out = []
    for line in lines:
        o = overrides.get(line['id'])
        out.append(dict(line, **{k: v for k, v in o.items() if k in ('seed', 'text')}) if o else line)
    return out


def validate(lines, cast):
    errors, warnings, seen = [], [], set()
    for i, line in enumerate(lines):
        lid, spk, text = line.get('id'), line.get('speaker'), line.get('text')
        where = f'line {i + 1} ({lid!r})'
        if not isinstance(lid, str) or not ID_RE.match(lid):
            errors.append(f'{where}: id must be lowercase kebab-case [a-z0-9-]')
        elif lid in seen:
            errors.append(f'{where}: duplicate id')
        seen.add(lid)
        if spk not in cast:
            errors.append(f'{where}: unknown speaker {spk!r} (known: {", ".join(cast)})')
        if not isinstance(text, str) or not text.strip():
            errors.append(f'{where}: empty text')
            continue
        if isinstance(lid, str) and lid.startswith(NARRATOR_ONLY_PREFIXES) and spk != 'narrator':
            errors.append(f'{where}: ids starting with {"/".join(NARRATOR_ONLY_PREFIXES)} must use speaker '
                          f'"narrator" (Elizabeth is the only voice for what Emma learns)')
        if re.search(r'\d', TAG_RE.sub('', text)):
            warnings.append(f'{where}: write numbers as words, found a digit in {text!r}')
        if spk in cast and TAG_RE.search(text) and not cast[spk]['model'].startswith(('eleven_v3', 'eleven_v4')):
            warnings.append(f'{where}: audio tags are only understood by eleven_v3 and eleven_v4')
    return errors, warnings


def judge_line(line, heard, lines):
    """Speech-to-text verdict for one line. Words and phrases also fail when the transcript is another word."""
    others = []
    if line['id'].startswith(('word-', 'phrase-')):
        others = [l['text'] for l in lines if l['id'] != line['id'] and l['id'].startswith(('word-', 'phrase-'))]
    return stt_judge(line['text'], heard, line.get('expect', ()), others)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('lines', nargs='?', help='path to a lines.json')
    ap.add_argument('--max-chars', type=int, default=None, help='hard limit on characters sent to the API this run')
    ap.add_argument('--dry-run', action='store_true', help='show what would be generated, call nothing')
    ap.add_argument('--only', default='', help='comma separated ids')
    ap.add_argument('--force', action='store_true', help='regenerate even when cached')
    ap.add_argument('--stt', action='store_true', help='check narrator and queen clips with speech-to-text (scribe_v2)')
    ap.add_argument('--stt-retry', type=int, default=0, help='regenerate a clip that fails speech-to-text up to N times')
    ap.add_argument('--stt-cost', type=float, default=0,
                    help='credits one speech-to-text check costs (sttPerCheck in budget.json); counted in the budget')
    ap.add_argument('--credits', action='store_true', help='print the credits left this month and stop')
    ap.add_argument('--floor', type=int, default=MIN_CREDITS, help='never leave fewer credits than this (at least 8000)')
    ap.add_argument('--ledger', default=None, help='JSON-lines file of earlier runs; this run is appended')
    ap.add_argument('--cap', type=int, default=None, help='most credits all runs in the ledger may spend together')
    ap.add_argument('--strict-order', action='store_true', help='stop at the first line over budget (keeps priority order)')
    args = ap.parse_args()

    if args.credits:
        left, _ = credits_left()
        print(f'Credits left this month: {left}')
        return
    if not args.lines:
        ap.error('the lines.json path is required')

    lines_path = Path(args.lines).resolve()
    audio_dir = lines_path.parent
    rel = lines_path.relative_to(ROOT) if lines_path.is_relative_to(ROOT) else lines_path
    data = json.loads(lines_path.read_text())
    base_lines = data['lines']
    overrides_path = audio_dir / 'overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    lines = apply_overrides(base_lines, overrides)
    by_id = {l['id']: l for l in lines}
    cast = load_cast()
    errors, warnings = validate(lines, cast)
    for w in warnings:
        print('warning:', w)
    if errors:
        for e in errors:
            print('error:', e)
        raise SystemExit(f'{len(errors)} error(s) in {lines_path}. Nothing generated.')

    only = {s.strip() for s in args.only.split(',') if s.strip()}
    unknown = only - set(by_id)
    if unknown:
        raise SystemExit('Unknown ids in --only: ' + ', '.join(sorted(unknown)))

    manifest_path = audio_dir / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    clips = manifest.get('clips', {})
    floor = max(MIN_CREDITS, args.floor)
    used = read_ledger(args.ledger)
    cap = args.cap if args.cap is not None else 10 ** 9

    before = None
    if not args.dry_run:
        before, _ = credits_left()
        print(f'Credits left this month: {before} (floor {floor}, ledger {used} of cap {cap if args.cap else "none"})')
        if before < floor:
            raise SystemExit(f'Refusing to run: fewer than {floor} credits left ({before}).')
        allowed = budget_limit(before, floor, used, cap)
    else:
        allowed = cap - used if args.cap is not None else None

    sent = {'chars': 0, 'credits': 0, 'made': 0, 'failed': [], 'stt': 0, 'stt_credits': 0}
    lock = threading.Lock()

    def save_manifest():
        manifest['clips'] = {l['id']: clips[l['id']] for l in lines if l['id'] in clips}
        manifest['updated'] = datetime.datetime.now().isoformat(timespec='seconds')
        tmp = manifest_path.with_suffix('.tmp')
        tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
        tmp.replace(manifest_path)

    def plan(targets, force):
        """Split lines into work items and lines over budget, in file order."""
        todo, skipped, over, chars_sum, credits_sum, hashes, stop = [], 0, [], 0, 0, set(), False
        reserved = 0  # credits kept back for the speech-to-text check of each clip this run makes
        for line in targets:
            req = request_for(line['speaker'], line['text'].strip(), cast, line.get('seed'))
            h = clip_hash(req)
            out = audio_dir / f'{line["id"]}.mp3'
            if not force and clips.get(line['id'], {}).get('hash') == h and out.exists():
                skipped += 1
                continue
            needs_api = (force or not (RAW_CACHE / f'{h}.mp3').exists()) and h not in hashes
            chars = len(req['text']) if needs_api else 0
            credits = chars * cast[line['speaker']].get('credits_per_char', 1)
            check_cost = args.stt_cost if args.stt and line['speaker'] in STT_SPEAKERS else 0
            budget_left = None if allowed is None else allowed - sent['credits'] - sent['stt_credits']
            too_many = needs_api and (
                (args.max_chars is not None and sent['chars'] + chars_sum + chars > args.max_chars)
                or (budget_left is not None and credits_sum + reserved + credits + check_cost > budget_left))
            if stop or too_many:
                over.append(line['id'])
                stop = stop or args.strict_order
                continue
            if needs_api:
                hashes.add(h)
            chars_sum += chars
            credits_sum += credits
            reserved += check_cost
            todo.append((line, req, h, out, needs_api))
        return todo, skipped, over, chars_sum, credits_sum

    def make(todo, force):
        hash_locks = {h: threading.Lock() for _, _, h, _, _ in todo}

        def work(item):
            line, req, h, out, needs_api = item
            with hash_locks[h]:  # a shared text waits for the first call and then reads the cache
                raw, chars = tts_raw(req, force=force and needs_api)
            process_speech(raw, out)
            return line, req, h, out, chars

        with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {pool.submit(work, item): item for item in todo}
            for fut in concurrent.futures.as_completed(futures):
                line = futures[fut][0]
                try:
                    line, req, h, out, chars = fut.result()
                except Exception as e:  # keep going, report at the end
                    sent['failed'].append(f'{line["id"]}: {e}')
                    print(f'  FAILED {line["id"]}: {e}', flush=True)
                    continue
                with lock:
                    sent['chars'] += chars
                    sent['credits'] += chars * cast[line['speaker']].get('credits_per_char', 1)
                    sent['made'] += 1
                    old_stt = clips.get(line['id'], {}).get('stt')
                    clips[line['id']] = {
                        'hash': h, 'speaker': line['speaker'], 'text': req['text'], 'file': out.name,
                        'model': req['model'], 'seed': req['seed'], 'duration_ms': duration_ms(out),
                        'generated': datetime.datetime.now().isoformat(timespec='seconds'), 'ok': True,
                    }
                    if old_stt and old_stt.get('hash') == h:
                        clips[line['id']]['stt'] = old_stt
                    save_manifest()
                    print(f'  made {line["id"]:<32} {chars:>4} chars  {line["speaker"]}', flush=True)

    def check(targets, force):
        """Speech-to-text on narrator and queen clips. Returns the ids that did not pass."""
        def one(line):
            c = clips.get(line['id'])
            if not c or not (audio_dir / c['file']).exists():
                return line, None
            if c.get('stt', {}).get('hash') == c['hash'] and not force:
                return line, c['stt']['text']
            with lock:
                sent['stt'] += 1
                sent['stt_credits'] += args.stt_cost
            return line, transcribe(audio_dir / c['file'])

        failed = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for line, heard in pool.map(one, [l for l in targets if l['speaker'] in STT_SPEAKERS]):
                if heard is None:
                    continue
                c = clips[line['id']]
                how = judge_line(line, heard, lines)
                c['stt'] = {'hash': c['hash'], 'text': heard, 'match': how in STT_PASS, 'how': how}
                c['ok'] = True
                if how not in STT_PASS:
                    failed.append(line['id'])
        save_manifest()
        return failed

    targets = [l for l in lines if not only or l['id'] in only]
    todo, skipped, over_budget, planned_chars, planned_credits = plan(targets, args.force)
    print(f'{rel}: {len(lines)} lines, {skipped} unchanged, {len(todo)} to make '
          f'({sum(1 for t in todo if t[4])} need the API: {planned_chars} characters, about {planned_credits} credits)')
    if over_budget:
        print(f'Budget reached. Not made this run ({len(over_budget)}): '
              + ', '.join(over_budget[:20]) + (' ...' if len(over_budget) > 20 else ''))
    if args.dry_run:
        for line, req, h, out, needs_api in todo:
            print(f'  {"API " if needs_api else "cache"} {line["id"]:<32} {line["speaker"]:<9} {req["text"]}')
        return

    make(todo, args.force)
    mismatches = []
    if args.stt:
        mismatches = check(targets, args.force)
        base_seed = {l['id']: l.get('seed', cast[l['speaker']]['seed']) for l in base_lines}
        for attempt in range(1, args.stt_retry + 1):
            if not mismatches:
                break
            for lid in mismatches:
                overrides[lid] = {'seed': retry_seed(base_seed[lid], attempt)}
            overrides_path.write_text(json.dumps(overrides, indent=1, sort_keys=True) + '\n')
            retry_lines = apply_overrides([by_id[i] for i in mismatches], overrides)
            for l in retry_lines:
                by_id[l['id']] = l
            lines[:] = [by_id[l['id']] for l in lines]
            todo, _, over, _, _ = plan(retry_lines, False)
            if over:
                print(f'Budget reached during retry {attempt}: {", ".join(over)}')
            print(f'Retry {attempt}: regenerating {len(todo)} clip(s) with new seeds')
            make(todo, False)
            mismatches = check(retry_lines, False)
        for lid in mismatches:
            if lid.startswith(LEARNING_PREFIXES):
                clips[lid]['ok'] = False
        save_manifest()

    save_manifest()
    current = {l['id'] for l in lines}
    orphans = sorted(p.name for p in audio_dir.glob('*.mp3') if p.stem not in current)
    if args.ledger:
        record = {'t': datetime.datetime.now().isoformat(timespec='seconds'), 'lines': str(rel), 'made': sent['made'],
                  'chars': sent['chars'], 'credits': round(sent['credits'] + sent['stt_credits'], 2),
                  'credits_before': before, 'stt_calls': sent['stt'], 'stt_credits': round(sent['stt_credits'], 2)}
        with open(args.ledger, 'a') as f:
            f.write(json.dumps(record) + '\n')

    print('\nSummary')
    print(f'  generated: {sent["made"]}, skipped (unchanged): {skipped}, failed: {len(sent["failed"])}, '
          f'not made (budget): {len(over_budget)}')
    print(f'  characters sent: {sent["chars"]} (about {sent["credits"]} credits), speech-to-text calls: {sent["stt"]}'
          f' (about {sent["stt_credits"]:.1f} credits)')
    if before is not None:
        print(f'  credits left before this run: {before} (the usage counter can lag a few minutes)')
    if orphans:
        print(f'  mp3 files with no line in lines.json ({len(orphans)}): {", ".join(orphans[:15])}')
    if args.stt:
        print(f'  speech-to-text failures after retries: {len(mismatches)}')
        for lid in mismatches:
            c = clips[lid]
            print(f'    {lid}: wanted {c["text"]!r}, heard {c["stt"]["text"]!r} ({"excluded" if c.get("ok") is False else "kept"})')
    if sent['failed']:
        for f in sent['failed']:
            print('  failed:', f)
        sys.exit(1)


if __name__ == '__main__':
    main()
