#!/usr/bin/env python3
"""Build the shared phonics library in shared/audio/phonics/ (pure British letter sounds, voice Elizabeth).

Usage (from the repo root, outside the sandbox):
    python3 scripts/generate-phonics.py [--max-chars 1500] [--dry-run] [--no-stt] [--only s,b,ai]
        [--dump b,d]

ElevenLabs cannot say a pure single sound when asked directly (see docs/v2/audio-research.md), so every
sound is made by one of these methods:
- respell:   a written-out long sound on eleven_v4, such as "Sssss.", used whole.
- onset:     a carrier word ("Top.") with its first sound cut out, cut before the vowel starts.
- sonorant:  like onset, but for voiced first sounds (l r w y qu): cut where the vowel's loudness rise starts.
- vowel:     a carrier word that starts with the vowel ("At."), cut at the closure of the next consonant.
- strip:     a carrier word whose first consonant is removed, keeping the vowel ("Car." gives ar).
- strip-vowel: the vowel in the middle of a carrier word, between a voiceless first consonant and the closure
             of the last consonant ("Hook." gives oo as in book).
- coda:      the last sound of a carrier word, after its vowel ("Box." gives x).
- coda-nasal / tail: the nasal at the end of "Sing." (ng) and the final vowel of "Letter." (er).
- word:      a real word or letter name used whole (vowel teams: "Oh.", "Air.").
- concat:    two finished sounds joined (nk = ng + k).

Weak sounds get two or three takes. Each take is measured (voiced time, loud vowel time) and checked with
speech-to-text (scribe_v2). For consonants a pure sound gives an empty transcript. The best take is chosen
automatically and recorded in index.json together with every take and its numbers. All takes are kept in
shared/audio/phonics/takes/ for listening in shared/review.html.

Raw API audio is cached in .cache/tts/ by the same hash as generate-audio.py, so reruns are free.
Standard library plus ffmpeg.
"""
import argparse
import array
import concurrent.futures
import datetime
import importlib.util
import json
import math
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'shared' / 'audio' / 'phonics'
TAKES = OUT / 'takes'
SR, HOP = 16000, 160  # 10 ms frames

_spec = importlib.util.spec_from_file_location('generate_audio', ROOT / 'scripts' / 'generate-audio.py')
ga = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ga)


def T(method, text=None, **kw):
    return dict(method=method, text=text, **kw)


# grapheme: dict(takes=[...], sustain=bool, kind='consonant'|'vowel', aliases=[...], expect=[stt words that are fine])
# expect lists acceptable transcripts for vowel sounds. Consonants expect an empty transcript.
SOUNDS = {
    # Long sounds, written out on v4 and held by the slider.
    's': dict(takes=[T('respell', 'Sssss.')], sustain=True, aliases=['ss']),
    'm': dict(takes=[T('respell', 'Mmmmm.')], sustain=True),
    'n': dict(takes=[T('respell', 'Nnnnn.')], sustain=True),
    'f': dict(takes=[T('respell', 'Fffff.')], sustain=True, aliases=['ff', 'ph']),
    'v': dict(takes=[T('respell', 'Vvvvv.')], sustain=True),
    'z': dict(takes=[T('respell', 'Zzzzz.')], sustain=True, aliases=['zz']),
    'sh': dict(takes=[T('respell', 'Shhhhh.')], sustain=True),
    'th': dict(takes=[T('respell', 'Thhhh.')], sustain=True),
    'l': dict(takes=[T('respell', 'Lllll.', cut_open=True), T('sonorant', 'Llllleg.'), T('sonorant', 'Lllllip.')],
              sustain=True, aliases=['ll']),
    # Written out, v4 rolls the r (a trill, wrong for British phonics). The wobble penalty in score() catches it,
    # so a plain onset cut from "Red." or "Rug." usually wins.
    'r': dict(takes=[T('respell', 'Rrrrr.', cut_open=True), T('sonorant', 'Rrrrred.'), T('sonorant', 'Rrrrrat.'),
                     T('sonorant', 'Red.'), T('sonorant', 'Rug.')], sustain=True),
    # Voiceless stops and fricative onsets: cut before the vowel.
    't': dict(takes=[T('onset', 'Top.', cap_ms=100)]),
    'p': dict(takes=[T('onset', 'Pig.', cap_ms=100), T('onset', 'Pot.', cap_ms=100)]),
    'k': dict(takes=[T('onset', 'Kit.', cap_ms=100)], aliases=['c', 'ck']),
    'h': dict(takes=[T('onset', 'Hat.'), T('onset', 'Hop.')]),
    'j': dict(takes=[T('onset', 'Jam.'), T('onset', 'Jet.')]),
    'ch': dict(takes=[T('onset', 'Chip.'), T('onset', 'Chop.')]),
    # Voiced stops: keep the whole burst plus a few ms of voicing, with a fast fade, but no vowel.
    'b': dict(takes=[T('voiced-stop', 'Bat.'), T('voiced-stop', 'Bit.'), T('voiced-stop', 'Bed.')]),
    'd': dict(takes=[T('voiced-stop', 'Dog.'), T('voiced-stop', 'Dip.'), T('voiced-stop', 'Den.')]),
    'g': dict(takes=[T('voiced-stop', 'Got.'), T('voiced-stop', 'Gift.'), T('voiced-stop', 'Get.')]),
    # Glides and qu: voiced onset up to the start of the vowel.
    'w': dict(takes=[T('sonorant', 'Wet.'), T('sonorant', 'Win.')], aliases=['wh']),
    'y': dict(takes=[T('sonorant', 'Yes.'), T('sonorant', 'Yak.')]),
    # British qu is k plus a w that is mostly breathed: the aspiration before the vowel.
    'qu': dict(takes=[T('onset', 'Quit.', cap_ms=150), T('onset', 'Queen.', cap_ms=150)]),
    # Ends of words.
    'x': dict(takes=[T('coda', 'Box.'), T('coda', 'Fox.')]),
    'ng': dict(takes=[T('coda-nasal', 'Sing.'), T('coda-nasal', 'Song.')]),
    'nk': dict(takes=[T('concat', parts=['ng', 'k'])]),
    # Short vowels: from a carrier word, played once.
    'a': dict(takes=[T('vowel', 'At.'), T('vowel', 'Apple.')], kind='vowel', expect=['a', 'ah', 'eh', 'at']),
    'e': dict(takes=[T('vowel', 'Etch.'), T('vowel', 'Ex.')], kind='vowel', expect=['e', 'eh', 'a', 'ah']),
    'i': dict(takes=[T('vowel', 'It.')], kind='vowel'),
    'o': dict(takes=[T('vowel', 'Ox.'), T('vowel', 'Off.')], kind='vowel', expect=['o', 'oh', 'ah', 'uh']),
    'u': dict(takes=[T('vowel', 'Up.')], kind='vowel'),
    # Long vowels and vowel teams: words or letter names, or a word with its first consonant removed.
    'ai': dict(takes=[T('word', 'A.'), T('strip', 'Hay.')], kind='vowel', expect=['a', 'ay', 'eh', 'hey', 'eight'],
               aliases=['ay', 'a-e']),
    'ee': dict(takes=[T('word', 'Ee.')], kind='vowel', aliases=['ea', 'e-e', 'ey']),
    'igh': dict(takes=[T('word', 'Eye.')], kind='vowel', aliases=['ie', 'i-e']),
    'oa': dict(takes=[T('word', 'Oh.')], kind='vowel', aliases=['oe', 'o-e']),
    'oo': dict(takes=[T('word', 'Ooo.')], kind='vowel', aliases=['ue']),
    'ar': dict(takes=[T('word', 'Ah.'), T('strip', 'Car.')], kind='vowel', expect=['ah', 'are', 'r', 'aa', 'car']),
    'or': dict(takes=[T('word', 'Or.')], kind='vowel', aliases=['aw', 'au']),
    'ur': dict(takes=[T('word', 'Err.'), T('strip', 'Fur.')], kind='vowel', expect=['er', 'err', 'ur', 'uh', 'her'],
               aliases=['ir']),
    'ow': dict(takes=[T('word', 'Ow!')], kind='vowel', aliases=['ou']),
    'oi': dict(takes=[T('word', 'Oi!')], kind='vowel', aliases=['oy']),
    'ear': dict(takes=[T('word', 'Ear.')], kind='vowel'),
    'air': dict(takes=[T('word', 'Air.')], kind='vowel'),
    'er': dict(takes=[T('tail', 'Letter.'), T('tail', 'Hammer.')], kind='vowel', expect=['uh', 'er', 'a', 'ah']),
    # Phase 5 (v3). Short oo as in book. No English word starts with it, and "Ook." is read as "oak", so the
    # vowel is cut from the middle of a word after a voiceless first sound (b + the Hood cut + k is heard as a word
    # with the book vowel). Like the other short vowels, a clean cut usually gives an empty transcript.
    'oo-short': dict(takes=[T('strip-vowel', 'Hood.'), T('strip-vowel', 'Foot.'), T('strip-vowel', 'Cook.')],
                     kind='vowel', expect=['ook', 'uk', 'oo', 'u', 'uh', 'look', 'book', 'hood', 'good', 'foot', 'cook']),
    # The long u of cube and few.
    'yoo': dict(takes=[T('word', 'You.'), T('word', 'Yoo.')], kind='vowel', expect=['you', 'yu', 'u', 'ew', 'yoo'],
                aliases=['u-e', 'ew']),
    # The -es ending of foxes, said with the slider and the readbacks (spec 3.10).
    'iz': dict(takes=[T('word', 'Iz.'), T('word', 'Izz.')], kind='vowel', expect=['is', 'iz', 'izz', 'es', 'his']),
}


def alias_entries(sounds):
    """Index entries for every alias whose main sound is already made. Aliases share the main sound's file."""
    out = {}
    for g, spec in SOUNDS.items():
        entry = sounds.get(g)
        if not entry:
            continue
        for alias in spec.get('aliases', []):
            out[alias] = {'id': f'snd-{alias}', 'file': entry['file'], 'sustain': entry['sustain'],
                          'kind': entry['kind'], 'same_as': g}
    return out

LOUD_DB, VOICED_DB, ZCR_VOICED = -40.0, -28.0, 0.12


# ---------------------------------------------------------------- analysis (standard library only)

def decode(path, filt=None, sr=SR):
    cmd = ['ffmpeg', '-v', 'error', '-nostdin', '-i', str(path)]
    if filt:
        cmd += ['-af', filt]
    cmd += ['-ac', '1', '-ar', str(sr), '-f', 's16le', '-']
    pcm = subprocess.run(cmd, capture_output=True, check=True).stdout
    a = array.array('h')
    a.frombytes(pcm)
    return a


def frames(path):
    """Per 10 ms frame: dB re the loudest frame, zero-crossing rate, share of energy in 300-3000 Hz."""
    x = decode(path)
    band = decode(path, 'highpass=f=300,lowpass=f=3000')
    n = min(len(x), len(band)) // HOP
    rms, zcr, ratio = [], [], []
    for i in range(n):
        f = x[i * HOP:(i + 1) * HOP]
        b = band[i * HOP:(i + 1) * HOP]
        e = sum(v * v for v in f) / HOP + 1e-6
        eb = sum(v * v for v in b) / HOP
        rms.append(e)
        ratio.append(min(eb / e, 1.0))
        zcr.append(sum(1 for j in range(1, HOP) if (f[j] >= 0) != (f[j - 1] >= 0)) / HOP)
    top = max(rms) if rms else 1.0
    db = [10 * math.log10(e / top) for e in rms]
    return db, zcr, ratio


def is_voiced(db, zcr, i):
    return db[i] > VOICED_DB and zcr[i] < ZCR_VOICED


def metrics(path):
    db, zcr, ratio = frames(path)
    loud = [i for i, d in enumerate(db) if d > LOUD_DB]
    voiced = [i for i in range(len(db)) if is_voiced(db, zcr, i)]
    opened = [i for i in voiced if ratio[i] > 0.55]
    # Wobble: sharp loudness dips inside the sound. A rolled r (trill) has many.
    wobble = sum(1 for i in range(1, len(db) - 1)
                 if db[i] > -30 and db[i] < min(db[i - 1], db[i + 1]) - 4)
    return {'ms': len(db) * 10, 'sound_ms': (loud[-1] - loud[0] + 1) * 10 if loud else 0,
            'voiced_ms': len(voiced) * 10, 'open_ms': len(opened) * 10, 'wobble': wobble}


def first(seq, pred, start=0, default=None):
    for i in range(start, len(seq)):
        if pred(i):
            return i
    return default


def segment(path, take):
    """Return (start_ms, end_ms) of the wanted sound in a raw clip, or None for the whole clip."""
    m = take['method']
    if m in ('word', 'concat'):
        return None
    db, zcr, ratio = frames(path)
    n = len(db)
    loud = [i for i, d in enumerate(db) if d > LOUD_DB]
    if not loud:
        return None
    on, off = loud[0], loud[-1]
    voiced = lambda i: is_voiced(db, zcr, i)

    def vowelish(i):
        return db[i] > -15 and zcr[i] < 0.16 and ratio[i] >= 0.33

    def vowel_start(start):
        """First of three vowel-like frames: within 15 dB of the loudest frame, periodic, energy above 300 Hz."""
        return first(db, lambda i: all(vowelish(k) for k in range(i, min(i + 3, n))), start, off)

    def skip_murmur(i):
        """v4 often starts with a low hum (prevoicing below 300 Hz) and a short gap before the real sound."""
        while i < off and ((zcr[i] < ZCR_VOICED and ratio[i] < 0.36) or db[i] < -38):
            i += 1
        return i

    if m == 'respell':
        end = off + 1
        if take.get('cut_open'):
            # Drop a trailing open vowel: stop at the first run of 3 open frames after 150 ms.
            for i in range(on + 15, off - 2):
                if all(ratio[k] > 0.6 and db[k] > -35 for k in range(i, i + 3)):
                    end = i
                    break
        return on * 10, min(end, on + 90) * 10
    if m == 'onset':
        start = skip_murmur(on)
        end = vowel_start(start)
        end = min(end, start + take.get('cap_ms', 200) // 10)
        return start * 10, max(end, start + 3) * 10
    if m == 'voiced-stop':
        # Drop the prevoicing hum, keep the whole burst and 25 ms of voicing (the place of the stop), no vowel.
        s = skip_murmur(on)
        start = max(s - 1, on)
        return start * 10, vowel_start(s) * 10 + 25
    if m == 'sonorant':
        # Voiced onset (l r w y) up to where the vowel opens: three frames with most energy above 300 Hz.
        end = first(db, lambda i: all(ratio[k] > 0.5 and db[k] > -12 for k in range(i, min(i + 3, n))),
                    on + 3, off)
        return on * 10, max(end, on + 5) * 10
    if m == 'vowel':
        end = first(db, lambda i: db[i] < -30, on + 3, off + 1)
        return on * 10, max(end, on + 4) * 10
    if m == 'strip':
        v = first(db, voiced, on, off)
        return (v + 3) * 10, (off + 1) * 10
    if m == 'strip-vowel':
        # The vowel in the middle of a carrier word: after a voiceless first consonant ("Hook." gives oo as in
        # book), up to the closure of the last consonant. For vowels no English word starts with.
        v = first(db, voiced, on, off)
        end = first(db, lambda i: db[i] < -30, v + 3, off + 1)
        return (v + 3) * 10, max(end, v + 7) * 10
    if m == 'coda':
        # From the release after the vowel's closure to the end ("Box." gives the k burst and the s).
        last_v = max((i for i in range(n) if voiced(i)), default=on)
        start = first(db, lambda i: db[i] > -30, last_v + 1, off)
        end = first(db, lambda i: db[i] < -42 and db[min(i + 1, n - 1)] < -42, start + 5, off + 1)
        return start * 10, end * 10
    if m == 'coda-nasal':
        # The nasal is the voiced stretch after the vowel where almost all energy is below 300 Hz.
        vs = [i for i in range(n) if voiced(i)]
        peak = max(vs, key=lambda i: db[i])
        start = first(ratio, lambda i: all(ratio[k] < 0.3 and voiced(k) for k in range(i, i + 3)), peak, vs[-1] - 5)
        return start * 10, (vs[-1] + 2) * 10
    if m == 'tail':
        # The final vowel: after the last noisy consonant (Letter) or the last nasal (Hammer).
        end = max(i for i in range(n) if db[i] > -30) + 1
        after = on
        for i in range(on, end - 1):
            if zcr[i] > 0.3 and zcr[i + 1] > 0.3 and db[i] > -35:
                after = i + 2
            if i < end - 10 and all(voiced(k) and ratio[k] < 0.36 for k in range(i, i + 3)):
                after = max(after, i + 3)
        start = first(ratio, lambda i: ratio[i] >= 0.4 and db[i] > -30, after, end - 5)
        return start * 10, end * 10
    raise ValueError(m)


# ---------------------------------------------------------------- audio processing

def peak_db(path):
    x = decode(path, sr=44100)
    p = max((abs(v) for v in x), default=1)
    return 20 * math.log10(max(p, 1) / 32768)


def lufs(path):
    log = ga.ffmpeg('-i', str(path), '-af', 'ebur128', '-f', 'null', '-', capture=True)
    for line in reversed(log.splitlines()):
        line = line.strip()
        if line.startswith('I:'):
            try:
                return float(line.split()[1])
            except ValueError:
                return None
    return None


def cut(raw, dst, seg, fade_out_ms=20, fade_in_ms=6, pad_ms=50):
    """Cut a segment, fade the edges, pad with 50 ms silence, mono 44.1 kHz WAV (lossless intermediate)."""
    chain = []
    if seg:
        s, e = seg
        d = (e - s) / 1000
        chain += [f'atrim=start={s / 1000}:end={e / 1000}', 'asetpts=PTS-STARTPTS',
                  f'afade=t=in:d={fade_in_ms / 1000}', f'afade=t=out:st={max(d - fade_out_ms / 1000, 0):.3f}:d={fade_out_ms / 1000}']
    else:
        chain += [ga.TRIM, 'afade=t=in:d=0.004']
    chain += [f'adelay={pad_ms}:all=1', f'apad=pad_dur={pad_ms / 1000}']
    ga.ffmpeg('-i', str(raw), '-af', ','.join(chain), '-ac', '1', '-ar', '44100', str(dst))


def finish(wav, mp3, long_sound):
    """Peak at -3 dBFS. Long sounds are also held to about -18 LUFS so they match speech."""
    gain = -3.0 - peak_db(wav)
    if long_sound:
        L = lufs(wav)
        if L is not None and L > -70:
            gain = min(gain, -18.0 - L)
    mp3.parent.mkdir(parents=True, exist_ok=True)
    ga.ffmpeg('-i', str(wav), '-af', f'volume={gain:.2f}dB', '-ac', '1', '-ar', '44100', '-b:a', '96k', str(mp3))


def concat(files, dst, joint_ms=15, pad_ms=50):
    """Join finished sounds with a short joint (nk = ng + k), padded like the others."""
    inputs, chains = [], []
    edge = (f'silenceremove=start_periods=1:start_threshold=-50dB:start_silence={joint_ms / 1000}:detection=peak')
    for i, f in enumerate(files):
        inputs += ['-i', str(f)]
        chains.append(f'[{i}:a]{edge},areverse,{edge},areverse[a{i}]')
    n = len(files)
    graph = ';'.join(chains) + ';' + ''.join(f'[a{i}]' for i in range(n)) + \
        f'concat=n={n}:v=0:a=1,adelay={pad_ms}:all=1,apad=pad_dur={pad_ms / 1000}[o]'
    ga.ffmpeg(*inputs, '-filter_complex', graph, '-map', '[o]', '-ac', '1', '-ar', '44100', '-b:a', '96k', str(dst))


# ---------------------------------------------------------------- choosing a take

def norm_words(t):
    return ga.norm_text(t or '')


HUMS = {'', 'mm', 'mmm', 'hmm', 'mm hmm', 'm', 'n', 'hm', 'shh', 'sh', 'ssh'}


def score(g, spec, take):
    """Lower is better. Consonants: empty transcript (a hum or shh is fine), little voicing, no trill.
    Vowels: an accepted transcript and a long enough sound."""
    met, heard = take['metrics'], norm_words(take.get('stt'))
    kind = spec.get('kind', 'consonant')
    s = 0.0
    if kind == 'consonant':
        if heard not in HUMS:
            s += 100
        if take['method'] in ('onset', 'coda'):
            s += met['voiced_ms']
            if met['sound_ms'] < 40:
                s += 50
        elif take['method'] == 'voiced-stop':
            s += abs(met['sound_ms'] - 60) * 0.5 + met['open_ms']
        elif take['method'] in ('sonorant', 'respell', 'coda-nasal'):
            s += met['open_ms'] * 0.5 + met['wobble'] * 15
            if met['sound_ms'] < 150:
                s += (150 - met['sound_ms'])
    else:
        expect = spec.get('expect')
        if expect is not None and heard and heard not in expect:
            s += 100
        if met['sound_ms'] < 120:
            s += 120 - met['sound_ms']
    return round(s, 1)


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--max-chars', type=int, default=1500)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--no-stt', action='store_true')
    ap.add_argument('--only', default='')
    ap.add_argument('--dump', default='', help='print frame tables for these graphemes (tuning aid)')
    args = ap.parse_args()

    cast = ga.load_cast()
    only = [g.strip() for g in args.only.split(',') if g.strip()] or list(SOUNDS)
    jobs = {}
    for g in only:
        for take in SOUNDS[g]['takes']:
            if take['text']:
                req = ga.request_for('narrator', take['text'], cast)
                jobs[ga.clip_hash(req)] = req
    need = {h: r for h, r in jobs.items() if not (ga.RAW_CACHE / f'{h}.mp3').exists()}
    chars = sum(len(r['text']) for r in need.values())
    print(f'{len(jobs)} raw carrier clips, {len(need)} not cached: {chars} characters')
    if args.dry_run:
        for r in need.values():
            print('  API', r['text'])
        return
    if chars > args.max_chars:
        raise SystemExit(f'Needs {chars} characters, more than --max-chars {args.max_chars}.')
    if need or not args.no_stt:
        left, _ = ga.credits_left()
        print(f'Credits left this month: {left}')
        if left < ga.MIN_CREDITS:
            raise SystemExit(f'Refusing to run: fewer than {ga.MIN_CREDITS} credits left.')
    with concurrent.futures.ThreadPoolExecutor(max_workers=ga.WORKERS) as pool:
        sent = sum(n for _, n in pool.map(lambda r: ga.tts_raw(r), need.values()))
    print(f'characters sent: {sent}')

    index_path = OUT / 'index.json'
    old = json.loads(index_path.read_text()) if index_path.exists() else {}
    old_stt = {}
    for entry in old.get('sounds', {}).values():
        for t in entry.get('takes', []):
            if t.get('stt_key'):
                old_stt[t['stt_key']] = t.get('stt')
    TAKES.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / '.cache' / 'phonics-work'
    tmp.mkdir(parents=True, exist_ok=True)
    dump = {g.strip() for g in args.dump.split(',') if g.strip()}

    order = sorted(only, key=lambda g: SOUNDS[g]['takes'][0]['method'] == 'concat')  # concat after its parts
    sounds = dict(old.get('sounds', {}))
    for g in order:
        spec = SOUNDS[g]
        takes = []
        for n, take in enumerate(spec['takes'], 1):
            dst = TAKES / f'{g}-{n}.mp3'
            if take['method'] == 'concat':
                parts = [OUT / sounds[p]['file'] for p in take['parts']]
                concat(parts, dst)
                seg, raw_hash = None, None
            else:
                req = ga.request_for('narrator', take['text'], cast)
                raw_hash = ga.clip_hash(req)
                raw = ga.RAW_CACHE / f'{raw_hash}.mp3'
                if g in dump:
                    db, zcr, ratio = frames(raw)
                    print(f'--- {g} take {n} {take["text"]}')
                    for i in range(len(db)):
                        if db[i] > -50:
                            print(f'{i * 10:5d} ms  db {db[i]:6.1f}  zcr {zcr[i]:.2f}  band {ratio[i]:.2f}'
                                  f'{"  V" if is_voiced(db, zcr, i) else ""}')
                seg = segment(raw, take)
                wav = tmp / f'{g}-{n}.wav'
                fade_out = 15 if take['method'] == 'voiced-stop' else (60 if take['method'] == 'respell' else 20)
                cut(raw, wav, seg, fade_out_ms=fade_out)
                finish(wav, dst, spec.get('sustain', False))
            met = metrics(dst)
            stt_key = f'{raw_hash}:{seg}' if raw_hash else None
            takes.append({'n': n, 'file': f'takes/{dst.name}', 'method': take['method'], 'text': take['text'],
                          'parts': take.get('parts'), 'cut_ms': list(seg) if seg else None, 'metrics': met,
                          'stt_key': stt_key, 'stt': old_stt.get(stt_key) if stt_key else None})
        if not args.no_stt:
            def stt(t):
                if t['stt_key'] and t['stt'] is None:
                    t['stt'] = ga.transcribe(ROOT / 'shared' / 'audio' / 'phonics' / t['file'])
                return t
            with concurrent.futures.ThreadPoolExecutor(max_workers=ga.WORKERS) as pool:
                takes = list(pool.map(stt, takes))
        for t in takes:
            t['score'] = score(g, spec, t)
        chosen = min(takes, key=lambda t: t['score'])
        main_file = OUT / f'snd-{g}.mp3'
        shutil.copyfile(TAKES / Path(chosen['file']).name, main_file)
        entry = {'id': f'snd-{g}', 'file': main_file.name, 'sustain': spec.get('sustain', False),
                 'kind': spec.get('kind', 'consonant'), 'chosen': chosen['n'], 'method': chosen['method'],
                 'duration_ms': ga.duration_ms(main_file), 'takes': takes}
        sounds[g] = entry
        line = ', '.join(f'{t["n"]}:{t["text"] or "+".join(t["parts"])} s={t["score"]} '
                         f'{t["metrics"]["sound_ms"]}ms v{t["metrics"]["voiced_ms"]} o{t["metrics"]["open_ms"]} w{t["metrics"]["wobble"]} '
                         f'stt={t["stt"]!r}' for t in takes)
        print(f'{g:<4} -> take {chosen["n"]}   {line}', flush=True)

    # Every alias of every made sound, also of sounds this run did not touch (new Phase 5 spellings of old sounds).
    for alias, entry in alias_entries(sounds).items():
        src, dst = OUT / entry['file'], OUT / f'snd-{alias}.mp3'
        if not dst.exists() or dst.read_bytes() != src.read_bytes():
            shutil.copyfile(src, dst)
        sounds[alias] = entry
    order_all = list(SOUNDS) + [a for s in SOUNDS.values() for a in s.get('aliases', [])]
    out = {'note': 'Pure British phonics sounds, voice Elizabeth (eleven_v4). Made by scripts/generate-phonics.py. '
                   'Keyed by sound code; aliases (other spellings of the same sound) use the file of their main sound.',
           'updated': datetime.datetime.now().isoformat(timespec='seconds'),
           'sounds': {g: sounds[g] for g in order_all if g in sounds}}
    index_path.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    print(f'wrote {index_path.relative_to(ROOT)} with {len(out["sounds"])} graphemes')


if __name__ == '__main__':
    main()
