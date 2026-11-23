"""Validation of the score follower against known answers.

  (a) loo     Hob Eih players 1-4 and Lesson: follow another player's version, or the consensus of the
              others, through each video; compare with that video's own measured transcription.
  (b) synth   App-synth renderings with tempo warp, noise, phone EQ, tuning offset, dropped notes and
              added decorations; compare with the exact times used to render them.
  (c) robust  Real recordings with the song starting late after other music, played twice, time-stretched
              60-130 %, and after silence or talking.

usage: python3 tools/follow/validate.py <loo|synth|robust|all> --media <dir with the tuned media files>
                                        --work <scratch dir> [--out results.json]
Audio never goes into the repo: --work must be outside it.
"""
import argparse, json, math, os, pickle, subprocess, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import features as F      # noqa: E402
import align as A         # noqa: E402
import score as S         # noqa: E402

HOB = 'hob-eih'
PLAYERS = ['player-1', 'player-2', 'player-3', 'player-4', 'lesson']


# ---- helpers ------------------------------------------------------------------------------------
def feat_of(path, work, key=None):
    key = key or os.path.splitext(os.path.basename(path))[0]
    p = os.path.join(work, f'{key}.feat.pkl')
    if os.path.exists(p) and os.path.getmtime(p) > os.path.getmtime(path):
        return pickle.load(open(p, 'rb'))
    f = F.analyze(F.load_audio(path))
    pickle.dump(f, open(p, 'wb'))
    return f


def followed(res):
    """All played notes of all occurrences: list of (t, midi_of_score_note, conf)."""
    out = []
    for o in res['occurrences']:
        for n in o['notes']:
            if n['played']:
                out.append((n['t'], n['midi'], n['conf']))
    return sorted(out)


def match_same_pitch(fol, tru, tol=0.15):
    """One-to-one, in-order matching of followed notes to true picks of the same pitch class
    (octave-equivalent) within tol seconds; maximizes pairs, then minimizes total time error."""
    n, m = len(fol), len(tru)
    BIG = 1000.0
    D = np.zeros((n + 1, m + 1)); B = np.zeros((n + 1, m + 1), int)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            best, b = D[i - 1, j], 1
            if D[i, j - 1] < best:
                best, b = D[i, j - 1], 2
            dt = abs(fol[i - 1][0] - tru[j - 1][0])
            if dt <= tol and S.pc_dist(fol[i - 1][1], tru[j - 1][1]) < 0.4:
                c = D[i - 1, j - 1] - BIG + dt
                if c < best:
                    best, b = c, 0
            D[i, j], B[i, j] = best, b
    pairs, i, j = [], n, m
    while i > 0 and j > 0:
        if B[i, j] == 0:
            pairs.append((i - 1, j - 1)); i -= 1; j -= 1
        elif B[i, j] == 1:
            i -= 1
        else:
            j -= 1
    return pairs[::-1]


def windows_of(truth, pad=0.1):
    """Time spans the reference covers: each pass from its first to its last note (+-pad)."""
    w = {}
    for n in truth:
        a, b = w.get(n['pass'], (n['t'], n['t']))
        w[n['pass']] = (min(a, n['t']), max(b, n['t']))
    return [(a - pad, b + pad) for a, b in w.values()]


def evaluate(res, truth, pad=0.1):
    """Followed notes inside the spans the reference covers, against the reference's picks."""
    if not truth:
        return None
    win = windows_of(truth, pad)
    fol = [f for f in followed(res) if any(a <= f[0] <= b for a, b in win)]
    tru = [(n['t'], n['midi']) for n in truth]
    pairs = match_same_pitch(fol, tru)
    err = np.array([fol[i][0] - tru[j][0] for i, j in pairs])
    n = len(fol)
    return {
        'followed': n, 'true_picks': len(tru), 'pairs': len(pairs),
        'median_ms': round(1000 * float(np.median(np.abs(err))), 1) if len(err) else None,
        'p90_ms': round(1000 * float(np.percentile(np.abs(err), 90)), 1) if len(err) else None,
        'bias_ms': round(1000 * float(np.median(err)), 1) if len(err) else None,
        'within50': round(100 * float((np.abs(err) <= 0.05).sum()) / max(1, n), 1),
        # the same after removing the median offset between this follower's pick times (attack start)
        # and the reference's (the Hob Eih transcriptions mark a point 15-25 ms into the attack)
        'within50_bc': round(100 * float((np.abs(err - np.median(err)) <= 0.05).sum()) / max(1, n), 1) if len(err) else 0.0,
        'wrong': round(100 * (n - len(pairs)) / max(1, n), 1),
        'coverage': round(100 * len(pairs) / max(1, len(tru)), 1),
    }


def add_midi(res, score):
    for o in res['occurrences']:
        for n in o['notes']:
            n['midi'] = score['notes'][n['i']]['midi']
    return res


def table(rows, cols):
    w = {c: max(len(c), *(len(str(r.get(c, ''))) for r in rows)) for c in cols}
    print(' | '.join(c.ljust(w[c]) for c in cols))
    print('-|-'.join('-' * w[c] for c in cols))
    for r in rows:
        print(' | '.join(str(r.get(c, '')).ljust(w[c]) for c in cols))


def summarize(rows):
    def med(k):
        v = [r[k] for r in rows if r.get(k) is not None]
        return round(float(np.median(v)), 1) if v else None
    return {k: med(k) for k in ('median_ms', 'p90_ms', 'bias_ms', 'within50', 'within50_bc', 'wrong', 'coverage')}


# ---- (a) leave-one-out on the Hob Eih players ---------------------------------------------------
def loo(args):
    rows = []
    p1s = [v for v in PLAYERS if any(p['id'] == 'p1' for p in S.version(HOB, v)['passes'])]
    for vid in PLAYERS:
        media = os.path.join(args.media, f'hob-eih-{vid}.mp4')
        f = feat_of(media, args.work)
        truth = S.truth_of(HOB, vid)
        scores = []
        for other in PLAYERS:
            if other == vid:
                continue
            for p in S.version(HOB, other)['passes']:
                scores.append((f'{other} {p["id"]}', S.pass_score(HOB, other, p['id'])))
        members = [(v, 'p1') for v in p1s if v != vid]
        center = ('player-4', 'p1') if vid != 'player-4' else None
        scores.append((f'consensus p1 of {len(members)}', S.consensus(HOB, members, center)))
        for label, sc in scores:
            t = time.time()
            res = add_midi(A.follow(f, sc), sc)
            ev = evaluate(res, truth)
            row = {'video': vid, 'score': label, 'notes': len(sc['notes']), 'occ': len(res['occurrences']),
                   'offset': res['offset'], 'sec': round(time.time() - t, 1), **ev}
            rows.append(row)
            print(json.dumps(row), flush=True)
    cols = ['video', 'score', 'notes', 'occ', 'followed', 'pairs', 'median_ms', 'p90_ms', 'bias_ms', 'within50', 'within50_bc', 'wrong', 'coverage']
    table(rows, cols)
    cons = [r for r in rows if r['score'].startswith('consensus')]
    other = [r for r in rows if not r['score'].startswith('consensus')]
    print('\nconsensus (5 videos):', summarize(cons))
    print('other player (%d pairs):' % len(other), summarize(other))
    return {'rows': rows, 'consensus': summarize(cons), 'other_player': summarize(other)}


# ---- (b) synthetic: app-synth renderings with known truth --------------------------------------
SYNTH_CASES = [('hob-eih', 'player-4', 'p1'), ('ahib-al-lail', 'lesson', 'p1'), ('hob-min-tihib', 'player-1', 'p1')]


def render_app(notes, wav):
    """notes: [{t, dur, midi}] -> WAV with the app's oud sound (tools/follow/render_synth.js)."""
    nj = wav + '.json'
    json.dump(notes, open(nj, 'w'))
    subprocess.run(['node', os.path.join(HERE, 'render_synth.js'), nj, wav], check=True, capture_output=True)


def phone(y, sr, rng, snr_db=20.0):
    """A phone-like recording: band-limited (300 Hz-7 kHz), presence lift, pinkish room noise."""
    from scipy import signal
    sos = signal.butter(2, [300, 7000], btype='bandpass', fs=sr, output='sos')
    y = signal.sosfilt(sos, y)
    b, a = signal.iirpeak(2500, 1.5, fs=sr)
    y = y + 0.5 * signal.lfilter(b, a, y)
    n = rng.standard_normal(len(y))
    n = signal.lfilter([1.0], [1.0, -0.95], n)            # brown-ish -> pinkish after the band filter
    n = signal.sosfilt(sos, n)
    act = np.abs(y) > 0.05 * np.abs(y).max()
    ps = np.mean(y[act] ** 2) if act.any() else np.mean(y ** 2)
    n *= math.sqrt(ps / (np.mean(n ** 2) * 10 ** (snr_db / 10)))
    out = y + n
    return (out / np.abs(out).max() * 0.8).astype(np.float32)


def make_performance(sc, rng, tempo=None, lead=3.0, p_del=0.10, p_dec=0.15):
    """Warp the score's timing, drop some notes, add decorations. Returns (render notes, truth list)."""
    notes = sc['notes']
    base = tempo if tempo is not None else rng.uniform(0.75, 1.25)
    ph, per = rng.uniform(0, 2 * math.pi), rng.uniform(5, 9)
    pitches = sorted({n['midi'] for n in notes})
    T, out, truth = lead, [], []
    for k, n in enumerate(notes):
        if k:
            s0, s1 = notes[k - 1]['t'], n['t']
            r = 1.0 / base * (1 + 0.15 * math.sin(2 * math.pi * (s0 + s1) / 2 / per + ph))
            T += (s1 - s0) * r
        t = T + rng.normal(0, 0.012)
        drop = k > 0 and rng.random() < (0.3 if n['flag'] == 'g' else p_del)
        truth.append({'i': k, 'played': not drop, 't': None if drop else t, 'midi': n['midi']})
        if drop:
            continue
        gap_prev = (t - out[-1]['t']) if out else 1.0
        if k and rng.random() < p_dec and gap_prev > 0.2:
            near = [p for p in pitches if 0.5 < abs(p - n['midi']) <= 3.5]
            if near:
                dt = rng.uniform(0.06, 0.10)
                out.append({'t': t - dt, 'midi': float(rng.choice(near)), 'extra': True})
        out.append({'t': t, 'midi': n['midi'], 'extra': False})
    for k, o in enumerate(out):
        o['dur'] = round(min(1.6, max(0.06, (out[k + 1]['t'] - o['t']) if k + 1 < len(out) else 1.2)), 3)
    return out, truth, base


def score_synth(res, truth, perf, offset_true):
    fol = {}
    for o in res['occurrences']:
        for n in o['notes']:
            if n['played'] and (n['i'] not in fol or n['conf'] > fol[n['i']]['conf']):
                fol[n['i']] = n
    err, missed, kept_ok, dele, dele_ok = [], 0, 0, 0, 0
    for tr in truth:
        f = fol.get(tr['i'])
        if tr['played']:
            if f is None:
                missed += 1
            else:
                err.append(f['t'] - tr['t'])
        else:
            dele += 1
            dele_ok += f is None
    err = np.array(err)
    played = sum(t['played'] for t in truth)
    ext = [p['t'] for p in perf if p['extra']]
    found = [x['t'] for o in res['occurrences'] for x in o['extras']]
    ext_found = sum(any(abs(a - b) <= 0.05 for b in found) for a in ext)
    return {
        'notes': len(truth), 'played': played, 'deleted': dele, 'decorations': len(ext),
        'median_ms': round(1000 * float(np.median(np.abs(err))), 1) if len(err) else None,
        'p90_ms': round(1000 * float(np.percentile(np.abs(err), 90)), 1) if len(err) else None,
        'bias_ms': round(1000 * float(np.median(err)), 1) if len(err) else None,
        'within50': round(100 * float((np.abs(err) <= 0.05).sum()) / max(1, played), 1),
        'missed': round(100 * missed / max(1, played), 1),
        'not_played_ok': round(100 * dele_ok / max(1, dele), 1),
        'decor_found': round(100 * ext_found / max(1, len(ext)), 1),
        'offset_err_c': round(100 * (res['offset'] - offset_true)),
    }


def synth(args):
    rows = []
    # (seed, level, tempo, snr dB, share of notes dropped, share given a decoration)
    runs = [(1, 'normal', None, 20, 0.10, 0.15), (2, 'normal', None, 20, 0.10, 0.15), (3, 'normal', None, 20, 0.10, 0.15),
            (4, 'hard', 0.6, 10, 0.20, 0.30), (5, 'hard', 1.3, 10, 0.20, 0.30)]
    for song, ver, ps in SYNTH_CASES:
        sc = S.pass_score(song, ver, ps)
        for seed, level, tempo_set, snr, p_del, p_dec in runs:
            rng = np.random.default_rng(seed)
            perf, truth, tempo = make_performance(sc, rng, tempo=tempo_set, p_del=p_del, p_dec=p_dec)
            off = float(rng.uniform(-3, 3))
            import hashlib
            h = hashlib.sha1(json.dumps([perf, off, snr]).encode()).hexdigest()[:8]   # the score may change
            key = f'syn_{song}_{ver}_{ps}_{seed}_{h}'
            wav = os.path.join(args.work, key + '.wav')
            if not os.path.exists(wav):
                render_app([{'t': p['t'], 'dur': p['dur'], 'midi': p['midi'] + off} for p in perf], wav)
                import soundfile as sf
                y, sr = sf.read(wav)
                sf.write(wav, phone(y, sr, rng, snr), sr)
            f = feat_of(wav, args.work, key)
            res = add_midi(A.follow(f, sc), sc)
            row = {'case': f'{song} {ver}', 'level': level, 'seed': seed, 'tempo': round(tempo, 2), 'snr': snr,
                   'offset': round(off, 2), **score_synth(res, truth, perf, off)}
            rows.append(row)
            print(json.dumps(row), flush=True)
    cols = ['case', 'level', 'seed', 'tempo', 'snr', 'offset', 'notes', 'deleted', 'decorations', 'median_ms', 'p90_ms',
            'bias_ms', 'within50', 'missed', 'not_played_ok', 'decor_found', 'offset_err_c']
    table(rows, cols)
    out = {'rows': rows}
    for level in ('normal', 'hard'):
        rs = [r for r in rows if r['level'] == level]
        summ = {k: round(float(np.median([r[k] for r in rs if r[k] is not None])), 1)
                for k in ('median_ms', 'p90_ms', 'bias_ms', 'within50', 'missed', 'not_played_ok', 'decor_found')}
        summ['offset_err_c_max'] = max(abs(r['offset_err_c']) for r in rs)
        print(f'synthetic {level} (median of {len(rs)} runs):', summ)
        out[level] = summ
    return out


# ---- (c) robustness on real recordings ----------------------------------------------------------
def _cut(src, a, b, dst, tempo=None):
    af = ['-af', f'atempo={tempo}'] if tempo else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-t', str(b - a), '-i', src, '-vn', '-ac', '1',
                    '-ar', '22050', *af, dst], check=True)


def _concat(parts, dst):
    import soundfile as sf
    ys = []
    for p in parts:
        if isinstance(p, (int, float)):
            ys.append(np.random.default_rng(0).normal(0, 1e-4, int(p * 22050)).astype(np.float32))
        else:
            y, _ = sf.read(p, dtype='float32'); ys.append(y)
    sf.write(dst, np.concatenate(ys), 22050)


def _shift(truth, dt, scale=1.0, t_from=None, t_to=None):
    out = []
    for n in truth:
        if (t_from is None or n['t'] >= t_from) and (t_to is None or n['t'] <= t_to):
            out.append(dict(n, t=(n['t'] - (t_from or 0)) / scale + dt))
    return out


def robust(args):
    w = lambda name: os.path.join(args.work, name)
    med = lambda name: os.path.join(args.media, name)
    p1, p2 = med('hob-eih-player-1.mp4'), med('hob-eih-player-2.mp4')
    other_song = med('ahib-al-lail-lesson.mp4')        # 30-55 s: a different melody on oud
    talk = med('ahib-al-lail-lesson.mp4')              # 0-24 s: a teacher talking
    t1, t2 = S.truth_of(HOB, 'player-1'), S.truth_of(HOB, 'player-2')
    cons_p1 = S.consensus(HOB, [('player-2', 'p1'), ('player-3', 'p1'), ('player-4', 'p1')], ('player-4', 'p1'))
    cons_p2 = S.consensus(HOB, [('player-1', 'p1'), ('player-3', 'p1'), ('player-4', 'p1')], ('player-4', 'p1'))
    _cut(p1, 0, 15, w('r_p1.wav'))
    _cut(other_song, 30, 55, w('r_other.wav'))
    _cut(talk, 0, 24, w('r_talk.wav'))
    cases = []
    _concat([w('r_other.wav'), w('r_p1.wav')], w('r_late.wav'))
    cases.append(('starts at 25 s after another song', w('r_late.wav'), cons_p1, _shift(t1, 25.0, t_to=15)))
    _concat([w('r_p1.wav'), w('r_p1.wav')], w('r_twice.wav'))
    cases.append(('played twice', w('r_twice.wav'), cons_p1, _shift(t1, 0.0, t_to=15) + _shift(t1, 15.0, t_to=15)))
    _concat([20.0, w('r_p1.wav')], w('r_silence.wav'))
    cases.append(('20 s of silence first', w('r_silence.wav'), cons_p1, _shift(t1, 20.0, t_to=15)))
    _concat([w('r_talk.wav'), w('r_p1.wav')], w('r_talking.wav'))
    cases.append(('24 s of talking first', w('r_talking.wav'), cons_p1, _shift(t1, 24.0, t_to=15)))
    for tempo in (0.6, 0.8, 1.0, 1.3):
        _cut(p2, 0, 21, w(f'r_tempo{tempo}.wav'), tempo=tempo)
        cases.append((f'tempo {int(tempo * 100)}%', w(f'r_tempo{tempo}.wav'), cons_p2, _shift(t2, 0.0, tempo, t_from=0, t_to=21)))
    rows = []
    for label, path, sc, truth in cases:
        f = feat_of(path, args.work)
        res = add_midi(A.follow(f, sc), sc)
        ev = evaluate(res, sorted(truth, key=lambda n: n['t']))
        occ = [f"{o['start']:.1f}-{o['end']:.1f}" for o in res['occurrences']]
        row = {'case': label, 'occurrences': ' '.join(occ), **ev}
        rows.append(row)
        print(json.dumps(row), flush=True)
    table(rows, ['case', 'occurrences', 'followed', 'pairs', 'median_ms', 'p90_ms', 'bias_ms', 'within50', 'within50_bc', 'wrong', 'coverage'])
    return {'rows': rows}


# ---- held-out: songs and score types not used to set the parameters ----------------------------
def _lag(a, b):
    """Seconds to add to times in recording a to get times in recording b (onset-envelope correlation)."""
    import librosa
    ea = librosa.onset.onset_strength(y=F.load_audio(a), sr=F.SR, hop_length=256)
    eb = librosa.onset.onset_strength(y=F.load_audio(b), sr=F.SR, hop_length=256)
    n = min(len(ea), len(eb))
    c = np.correlate(eb[:n] - eb[:n].mean(), ea[:n] - ea[:n].mean(), mode='full')
    k = int(np.argmax(c)) - (n - 1)
    return k * 256 / F.SR


def heldout(args):
    med = lambda name: os.path.join(args.media, name)
    HMT, AHIB = 'hob-min-tihib', 'ahib-al-lail'
    cases = [
        ('hmt P2 video', med('hob-min-tihib-player-2.mp4'), (HMT, 'player-1', 'p1'), (HMT, 'player-2'), 0.0, None),
        ('hmt P2 video', med('hob-min-tihib-player-2.mp4'), (HMT, 'player-1', 'all'), (HMT, 'player-2'), 0.0, None),
        ('hmt P1 video', med('hob-min-tihib-player-1.mp4'), (HMT, 'player-2', 'p1'), (HMT, 'player-1'), 0.0, None),
        ('hmt P1 video', med('hob-min-tihib-player-1.mp4'), (HMT, 'player-2', 'all'), (HMT, 'player-1'), 0.0, None),
        ('ahib lesson video', med('ahib-al-lail-lesson.mp4'), (AHIB, 'note-sheet', 'p1'), (AHIB, 'lesson'), 0.0, None),
        ('ahib lesson video', med('ahib-al-lail-lesson.mp4'), (AHIB, 'simple', 'p1'), (AHIB, 'lesson'), 0.0, None),
        ('hob-eih P4 video', med('hob-eih-player-4.mp4'), (HOB, 'note-sheet', 'p1'), (HOB, 'player-4'), 0.0, None),
        ('hob-eih P4 video', med('hob-eih-player-4.mp4'), (HOB, 'tonos', 'p1'), (HOB, 'player-4'), 0.0, None),
    ]
    if args.untuned:
        for path, ref, tune in args.untuned:
            cases.append((f'untuned {os.path.basename(path)[:8]}', path, (HMT, 'player-1', 'p1'), (HMT, ref), None, (med(f'hob-min-tihib-{ref}.mp4'), tune)))
    rows = []
    for label, path, (song, ver, ps), (tsong, tver), off_true, untuned in cases:
        f = feat_of(path, args.work)
        sc = S.pass_score(song, ver, ps)
        res = add_midi(A.follow(f, sc), sc)
        truth = S.truth_of(tsong, tver)
        extra = {}
        if untuned:
            lag = _lag(untuned[0], path)
            truth = [dict(n, t=n['t'] + lag) for n in truth]
            extra = {'offset_true': untuned[1], 'timeline_shift_s': round(lag, 3)}
        ev = evaluate(res, truth)
        row = {'video': label, 'score': f'{ver} {ps}', 'notes': len(sc['notes']), 'offset': res['offset'], **extra,
               'occ': len(res['occurrences']), **ev}
        rows.append(row)
        print(json.dumps(row), flush=True)
    table(rows, ['video', 'score', 'notes', 'offset', 'occ', 'followed', 'pairs', 'median_ms', 'p90_ms', 'bias_ms',
                 'within50', 'within50_bc', 'wrong', 'coverage'])
    return {'rows': rows}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('task', choices=['loo', 'synth', 'robust', 'heldout', 'all'])
    ap.add_argument('--media', required=True)
    ap.add_argument('--work', required=True)
    ap.add_argument('--out')
    ap.add_argument('--untuned', nargs=3, action='append', metavar=('MEDIA', 'VERSION', 'OFFSET'),
                    help='an untuned original of a tuned hob-min-tihib media file, its version id and known offset')
    args = ap.parse_args()
    os.makedirs(args.work, exist_ok=True)
    out = {}
    for t in (['loo', 'synth', 'robust', 'heldout'] if args.task == 'all' else [args.task]):
        out[t] = globals()[t](args)
    if args.out:
        json.dump(out, open(args.out, 'w'), indent=1, default=float)


if __name__ == '__main__':
    main()
