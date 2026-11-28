"""Build a private, standalone listening review using the app's actual playback engine.
Usage: python spot_review.py SONG VERSION PASS OUTPUT [--audition FROM TO]
Needs numpy, scipy, librosa, ffmpeg, node and Playwright (set PWMOD if installed separately).
Output contains source audio. Keep it outside the public checkout.
"""
import argparse
import base64
import hashlib
import io
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import librosa
import numpy as np
from scipy.signal import resample_poly
from math import gcd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SR = 22050
HOP = 32
TOL = 0.055


def match(left, right, tolerance=TOL):
    """Chronological one-to-one pairing. Maximise pair count, then minimise total time error."""
    n, m = len(left), len(right)
    cost = np.zeros((n + 1, m + 1))
    move = np.zeros((n, m), dtype=np.uint8)
    reward = (min(n, m) + 1) * tolerance
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            delta = abs(left[i] - right[j])
            choices = (cost[i+1, j], cost[i, j+1],
                       cost[i+1, j+1] + reward - delta if delta <= tolerance else -1)
            k = max(range(3), key=choices.__getitem__)
            cost[i, j], move[i, j] = choices[k], k
    pairs = []
    i = j = 0
    while i < n and j < m:
        k = move[i, j]
        if k == 2:
            pairs.append((i, j))
        i += k != 1
        j += k != 0
    return pairs


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) if len(x) else 0.


def attacks(x):
    # Pad so the first pick is measurable at pass time zero. Reject small background fluctuations.
    pad = SR // 5
    padded = np.pad(x, (pad, pad))
    found = librosa.onset.onset_detect(y=padded, sr=SR, hop_length=HOP, delta=0.04, wait=2, units='samples')
    events = []
    for sample in found:
        t = (sample - pad) / SR
        if not -0.025 <= t < (len(x) / SR) - 0.025:
            continue
        left = padded[sample-620:sample-80]
        right = padded[sample:sample+540]
        if rms(right) < max(0.00025, 1.25 * rms(left)):
            continue
        if not events or t - events[-1] > 0.03:
            events.append(max(0., t))
    return events


def render(args, tmp, extras=None):
    command = ['node', str(HERE / 'spot_render.cjs'), args.song, args.version, args.part, str(tmp)]
    if extras:
        extra_file = tmp / 'extras.json'
        extra_file.write_text(json.dumps(extras))
        command.append(str(extra_file))
    subprocess.run(command, check=True)
    meta = json.loads((tmp / 'pass.json').read_text())
    rate = meta['rate']
    data = np.fromfile(tmp / 'render.f32', dtype='<f4')
    # renderOffline schedules the first note at 0.1 s. Keep the player's pass clock in all tracks.
    data = data[round(0.1 * rate):]
    div = gcd(SR, rate)
    data = resample_poly(data, SR // div, rate // div)
    data = np.pad(data, (round(meta['notes'][0]['t'] * SR), 0))
    return meta, data


def pitch_auditions(ref, times, rows, notes, bounds):
    # Only audition isolated, voiced attacks within the requested passage. Floating pitch is for playback
    # comparison only: a fretless inflection is not evidence for a named or graded lesson note.
    if not bounds:
        return []
    f0, voiced, _ = librosa.pyin(ref, fmin=75, fmax=900, sr=SR, frame_length=1024, hop_length=64)
    centers = np.arange(len(f0)) * 64 / SR
    written = np.array([n['t'] for n in notes])
    additions = []
    for row in rows:
        t = row['time']
        if row['kind'] != 'Player only' or not bounds[0] <= t <= bounds[1] or min(abs(written-t)) < 0.070:
            continue
        end = min(next((u for u in times if u > t + 0.030), len(ref)/SR),
                  next((u for u in written if u > t), len(ref)/SR), t + 0.20)
        frames = (centers >= t + 0.01 + 512/SR) & (centers <= end - 512/SR)
        pitches = librosa.hz_to_midi(f0[frames & voiced])
        if len(pitches) * 64/SR < 0.060 or len(pitches) < 0.85 * frames.sum():
            continue
        lo, hi = np.percentile(pitches, [10, 90])
        if hi-lo > 0.40:
            continue
        start = round(t * SR)
        peak = rms(ref[start:start+660])
        nearest = round(written[np.argmin(abs(written-t))] * SR)
        ratio = peak / max(1e-6, rms(ref[nearest:nearest+660]))
        midi = round(float(np.median(pitches)), 2)
        additions.append(dict(t=t, dur=round(end-t, 3), midi=midi, gain=round(0.9 * min(1., ratio), 3)))
        row['auditionMidi'] = midi
    return additions


def embed_audio(x):
    stream = io.BytesIO()
    with wave.open(stream, 'wb') as wav:
        wav.setparams((1, 2, SR, 0, 'NONE', 'not compressed'))
        wav.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    return 'data:audio/wav;base64,' + base64.b64encode(stream.getvalue()).decode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ('song', 'version', 'part', 'output'):
        parser.add_argument(arg)
    parser.add_argument('--audition', type=float, nargs=2, metavar=('FROM', 'TO'))
    args = parser.parse_args()
    out = Path(args.output).resolve()
    if out.is_relative_to(ROOT):
        parser.error('Choose a private output folder outside the checkout.')
    with tempfile.TemporaryDirectory() as tmp:
        meta, app = render(args, Path(tmp))
        source = ROOT / 'media' / (meta['source'] + '.m4a')
        decoded = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-ac', '1', '-ar', str(SR),
                                           '-f', 'f32le', '-'])
        a = round(meta['start'] * SR)
        length = round(meta['end'] * SR)
        if len(decoded)//4 < a+length or len(app) < length:
            raise ValueError('The recording or render is shorter than the selected pass.')
        if args.audition and not 0 <= args.audition[0] < args.audition[1] <= meta['end']:
            parser.error('Audition bounds must lie within this pass.')
        ref = np.frombuffer(decoded, dtype='<f4')[a:a+length]
        app = app[:length]
        left, right = attacks(ref), attacks(app)
        pairs = match(left, right)
        matched_l, matched_r = {i for i, _ in pairs}, {j for _, j in pairs}
        rows = sorted([{'time': round(t, 3), 'kind': kind} for events, used, kind in
                      [(left, matched_l, 'Player only'), (right, matched_r, 'App only')]
                      for i, t in enumerate(events) if i not in used], key=lambda row: row['time'])
        extra = pitch_auditions(ref, left, rows, meta['notes'], args.audition)
        # (Claude, 2026-11-28) the pitch of every player-only pick, and the tremolo check: a written note the player
        # picks again and again (envelope peaks 45 ms+ apart, 1.5 dB+ rise, same pitch) but the app picks once.
        f0, vv, _ = librosa.pyin(ref, fmin=75, fmax=900, sr=SR, frame_length=1024, hop_length=64)
        cen = np.arange(len(f0)) * 64 / SR; mm = librosa.hz_to_midi(f0)
        def pitch_at(t, a=0.03, b=0.09):
            s = (cen >= t + a) & (cen <= t + b) & vv
            return float(np.median(mm[s])) if s.sum() >= 2 else None
        names = {}
        for n in meta['notes']: names.setdefault(round(n['midi'] * 2) / 2, n['ar'])
        for row in rows:
            if row['kind'] == 'Player only':
                p = pitch_at(row['time'])
                if p is not None:
                    row['pitch'] = round(p, 2); k = round(p * 2) / 2
                    if k in names and abs(k - p) < 0.25: row['name'] = names[k]
        hop = int(0.005 * SR); env = 20 * np.log10(np.sqrt(np.convolve(ref ** 2, np.ones(hop * 2) / (hop * 2), 'same'))[::hop] + 1e-9)
        tremolo, N = [], meta['notes']
        for i, n in enumerate(N):
            nxt = N[i + 1]['t'] if i + 1 < len(N) else min(n['t'] + 1.5, meta['end'])
            if nxt - n['t'] < 0.2: continue
            strokes, last, dip = [], n['t'], 1e9
            for j in range(int((n['t'] + 0.04) / 0.005), min(len(env) - 1, int((nxt - 0.02) / 0.005))):
                dip = min(dip, env[j])
                if env[j] >= env[j - 1] and env[j] > env[j + 1] and env[j] - dip >= 1.5 and j * 0.005 - last >= 0.045:
                    p = pitch_at(j * 0.005 - 0.01, 0.03, 0.06)
                    if p is not None and abs(p - n['midi']) < 0.4: strokes.append(j * 0.005 - 0.01); last = j * 0.005; dip = 1e9
            app_in = [t for t in right if n['t'] + 0.03 < t < nxt - 0.02]
            if len(strokes) >= 3 and len(app_in) <= 1:
                tremolo.append(dict(t=round(n['t'], 3), dur=round(nxt - n['t'], 3), ar=n['ar'], strokes=len(strokes),
                                    rate=round(len(strokes) / max(0.05, strokes[-1] - n['t']), 1), times=[round(s, 3) for s in strokes]))
        gain = rms(ref) / max(1e-8, rms(app))
        tracks = {'Player': ref, 'App': app * gain}
        corrected = []
        if extra:
            _, candidate = render(args, Path(tmp), extra)
            tracks['Audition'] = candidate[:length] * gain
            fixed_times = attacks(candidate[:length])
            revised = {i for i, j in match(left, fixed_times)}
            corrected = [round(t, 3) for i, t in enumerate(left) if i in revised-matched_l]
            lost = [round(t, 3) for i, t in enumerate(left) if i in matched_l-revised]
        else:
            lost = []
    notes = [{k: n[k] for k in ('t', 'ar', 'midi', 'line')} for n in meta.pop('notes')]
    # Pin the score, player audio, code revision and build for reproducible handoff.
    metadata = dict(meta, build=json.loads((ROOT/'version.json').read_text())['build'],
                    revision=subprocess.check_output(['git','rev-parse','--short','HEAD'], cwd=ROOT,text=True).strip(),
                    sourceHash=hashlib.sha256(source.read_bytes()).hexdigest()[:16],
                    scoreHash=hashlib.sha256(json.dumps(notes).encode()).hexdigest()[:16],
                    notes=notes, events=rows, playerAttacks=len(left), appAttacks=len(right),
                    paired=len(pairs), auditions=extra, newlyPaired=corrected, lostPairs=lost,
                    focus=args.audition, playerTimes=[round(t, 3) for t in left], appTimes=[round(t, 3) for t in right],
                    tremolo=tremolo)
    out.mkdir(parents=True, exist_ok=True)
    name = f'{args.song}-{args.version}-{args.part}'
    (out/(name+'.json')).write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
    scale = 0.88 / max(float(abs(x).max()) for x in tracks.values())
    metadata['audio'] = {key: embed_audio(x * scale) for key, x in tracks.items()}
    template = (HERE/'spot_review.html').read_text()
    data = json.dumps(metadata, ensure_ascii=False).replace('<', r'\u003c')
    (out/(name+'.html')).write_text(template.replace('/*REVIEW_DATA*/null', data))
    print(name, 'paired', len(pairs), 'of', len(left), 'reference and', len(right), 'app attacks;',
          'audition', extra, 'newly paired', corrected, 'lost', lost)


if __name__ == '__main__':
    main()
