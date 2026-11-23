#!/usr/bin/env python3
"""Write down which notes an oud player plays, and when, from a recording (audio or video).

usage:
  python3 tools/transcribe/transcribe.py VIDEO_OR_AUDIO --scale re,mi,fa,sol,la,si,do,reH,faL,laL [options]

Pipeline (chosen by the benchmark in tools/transcribe/README.md):
  1. Note starts: three onset detectors (complex-domain, spectral flux, treble "click" rise); a start is kept
     when at least two of them fire within 30 ms. Its time is the complex-domain time (most precise).
  2. Tuning: the player's offset from standard pitch, fitted to the scale's keys from pyin and CREPE pitches.
  3. Pitch of each note: four estimators vote on the key (pyin, CREPE tiny, PESTO, and a harmonic template on
     the new energy after the pick, which also checks the octave). Confidence = share of votes (1.0 = all four).
  4. Flags: 'r' = same key as the note before. 'g' = decoration: from --sheet alignment when given, else only
     very quick notes (< 0.1 s before a different note). Lines: from --sheet, else split at long gaps.
Output: JSON with notes [time, key, line, flag] (time from the first note, as in js/songs/*.js), the start time
in the file (for media.starts), the tuning offset, a confidence per note and the moments worth checking by ear.
"""
import argparse, json, os, re, subprocess, sys, warnings
import numpy as np

warnings.filterwarnings('ignore')
SR = 22050; HOP = 128; FPS = SR / HOP
HERE = os.path.dirname(os.path.abspath(__file__))
NOTES_JS = os.path.join(HERE, '..', '..', 'js', 'notes.js')

# Onset detectors: threshold (delta for librosa peak_pick on the 99th-percentile-normalized envelope) and the
# latency removed from each (median bias against exact synthetic truth). Tuned on the dev set (README).
DETECTORS = {'complex': (0.20, 0.000), 'flux': (0.12, 0.028), 'hf': (0.13, 0.012)}


# ---------------------------------------------------------------- input
def load_audio(path, start=None, end=None):
    cmd = ['ffmpeg', '-v', 'error', '-nostdin']
    if start is not None: cmd += ['-ss', str(max(0.0, start))]
    if end is not None: cmd += ['-t', str(end - max(0.0, start or 0.0))]
    cmd += ['-i', path, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float32)


def read_keys(extra):
    """Note keys and MIDI pitches from js/notes.js, plus extra 'name=midi' pairs."""
    keys = {}
    if os.path.exists(NOTES_JS):
        for m in re.finditer(r"^\s*(\w+):\s*\{[^}]*?midi:\s*([\d.]+)", open(NOTES_JS, encoding='utf-8').read(), re.M):
            keys[m.group(1)] = float(m.group(2))
    for kv in extra or []:
        k, v = kv.split('='); keys[k.strip()] = float(v)
    return keys


# ---------------------------------------------------------------- onsets
def envelopes(y):
    import librosa
    from scipy.ndimage import uniform_filter1d, minimum_filter1d
    flux = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    X = librosa.stft(y, n_fft=1024, hop_length=HOP, center=True)
    mag, ph = np.abs(X), np.angle(X)
    pred = np.zeros_like(X)
    pred[:, 2:] = mag[:, 1:-1] * np.exp(1j * (2 * ph[:, 1:-1] - ph[:, :-2]))
    d = np.abs(X - pred); d[:, :2] = 0
    cd = (d * (mag >= np.concatenate([mag[:, :1], mag[:, :-1]], 1))).sum(0)          # rectified complex domain
    cd = np.log1p(cd / (np.median(cd) + 1e-9))
    P = np.abs(librosa.stft(y, n_fft=512, hop_length=HOP, center=True)) ** 2
    fr = librosa.fft_frequencies(sr=SR, n_fft=512)
    hf = 10 * np.log10(P[fr > 1800].sum(0) + 1e-12)                                    # treble level, dB
    hfs = uniform_filter1d(hf, 3)
    hfr = np.maximum(0, hfs - minimum_filter1d(hfs, 7, origin=3))                       # treble rise over ~35 ms
    return {'complex': cd, 'flux': flux, 'hf': hfr}, hfs


def peaks(e, delta):
    import librosa
    e = e / (np.percentile(e, 99) + 1e-9)
    return librosa.util.peak_pick(e, pre_max=3, post_max=3, pre_avg=17, post_avg=5, delta=delta, wait=6)


def mono(times, gap=0.035):
    out = []
    for t in sorted(times):
        if out and t - out[-1] < gap: continue
        out.append(float(t))
    return np.array(out)


def note_starts(env, t0, t1, need=2, tol=0.03):
    lists = []
    for k, (delta, lat) in DETECTORS.items():
        t = peaks(env[k], delta) / FPS - lat
        lists.append(mono(t[(t >= t0) & (t <= t1)]))
    allt = sorted((t, i) for i, L in enumerate(lists) for t in L)
    out, used = [], [False] * len(allt)
    for a, (t, i) in enumerate(allt):
        if used[a]: continue
        cl = [(t, i)]; used[a] = True
        for b in range(a + 1, len(allt)):
            if allt[b][0] - t > tol: break
            if not used[b] and allt[b][1] not in [c[1] for c in cl]: cl.append(allt[b]); used[b] = True
        if len({c[1] for c in cl}) >= need:
            p = [c[0] for c in cl if c[1] == 0]                      # complex-domain time when it fired
            out.append((p[0] if p else float(np.median([c[0] for c in cl])), len(cl)))
    res, last = [], -1
    for t, n in sorted(out):
        if res and t - res[-1][0] < 0.035: continue
        res.append((t, n))
    return np.array([r[0] for r in res]), np.array([r[1] for r in res])


def click_db(hfs, t):
    """Treble jump at a pick: max in the 44 ms after against the min 12-90 ms before (as in js/audio.js)."""
    i = int(round(t * FPS)); a = hfs[i:i + 8]; b = hfs[max(0, i - 15):max(1, i - 2)]
    return float(a.max() - b.min()) if len(a) and len(b) else 0.0


# ---------------------------------------------------------------- pitch tracks: (times, midi, confidence)
def track_pyin(y):
    import librosa
    f, vf, vp = librosa.pyin(y, fmin=60, fmax=900, sr=SR, frame_length=2048, hop_length=256)
    m = np.where(np.nan_to_num(f) > 0, 69 + 12 * np.log2(np.maximum(np.nan_to_num(f), 1e-6) / 440), np.nan)
    return np.arange(len(m)) * 256 / SR, m, vp


def track_crepe(y, threads):
    import torch, torchcrepe, librosa
    torch.set_num_threads(threads)
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000)
    acts = [torchcrepe.infer(f, model='tiny').detach().numpy()
            for f in torchcrepe.preprocess(torch.tensor(y16)[None], 16000, hop_length=160, batch_size=1024, device='cpu', pad=True)]
    a = np.concatenate(acts, 0)
    bins = 69 + 12 * np.log2(10 * 2 ** ((1997.3794084376191 + 20 * np.arange(360)) / 1200) / 440)
    i = a.argmax(1); m = np.zeros(len(a))
    for k in range(len(a)):                                   # weighted average around the peak
        s = slice(max(0, i[k] - 4), min(360, i[k] + 5)); w = a[k, s]
        m[k] = np.sum(w * bins[s]) / max(1e-9, w.sum())
    return np.arange(len(a)) * 0.01, m, a.max(1)


def track_pesto(y, threads):
    import torch, pesto
    torch.set_num_threads(threads)
    _, f, c, _ = pesto.predict(torch.tensor(y), SR, step_size=10.0, convert_to_freq=True)
    f = f.numpy(); return np.arange(len(f)) * 0.01, 69 + 12 * np.log2(np.maximum(f, 1e-6) / 440), c.numpy()


def window_pitch(track, ts, a=0.025, b=0.15, minc=0.3):
    t, m, c = track; out, conf = [], []
    for k, o in enumerate(ts):
        nxt = ts[k + 1] if k + 1 < len(ts) else o + 1
        hi = max(o + a + 0.03, min(nxt - 0.005, o + b))
        s = (t >= o + a) & (t <= hi) & ~np.isnan(m) & (c >= minc)
        if s.sum() < 2: s = (t >= o) & (t <= o + 0.08) & ~np.isnan(m)
        if s.sum() == 0: out.append(np.nan); conf.append(0.0); continue
        w = c[s] + 1e-3; mm = m[s]; o_ = np.argsort(mm)
        out.append(float(mm[o_][np.searchsorted(np.cumsum(w[o_]), w.sum() / 2)])); conf.append(float(np.mean(c[s])))
    return np.array(out), np.array(conf)


# ---------------------------------------------------------------- harmonic template on the new energy
NFFT = 1 << 14
FR = np.fft.rfftfreq(NFFT, 1 / SR)


def spectrum(y, a, d):
    i = int(a * SR); n = max(64, int(d * SR)); seg = y[max(0, i):i + n]
    seg = np.pad(seg, (0, n - len(seg)))
    return np.abs(np.fft.rfft(seg * np.hanning(n), NFFT))


def band_max(L, f, tol=0.015):
    df = FR[1]
    lo = np.clip((f * (1 - tol) / df).astype(int), 0, len(L) - 1); hi = np.clip((f * (1 + tol) / df).astype(int) + 1, 1, len(L))
    return np.array([L[x:z].max() if z > x else 0.0 for x, z in zip(lo, hi)])


def template_scores(y, ts, km, off, beta=0.6, gamma=0.3, H=8, dmax=0.15, fmax=4000.0):
    """Per note and key: mean log energy at the key's harmonics in (after - gamma*before the pick), minus
    beta * the mean at its half-harmonics (energy there means the real note is an octave lower)."""
    S = np.zeros((len(ts), len(km))); hs = np.arange(1, H + 1)
    f = 440 * 2 ** ((km + off - 69) / 12)
    for k, o in enumerate(ts):
        nxt = ts[k + 1] if k + 1 < len(ts) else o + 0.5
        d = min(dmax, max(0.045, nxt - o - 0.012))
        D = np.maximum(spectrum(y, o + 0.008, d) - gamma * spectrum(y, o - 0.008 - d, d), 0)
        L = np.log1p(D / (np.median(D[(FR > 60) & (FR < fmax)]) + 1e-9))
        for j, fj in enumerate(f):
            hp = hs * fj; hp = hp[hp < fmax]; hn = (hs[1:] - 0.5) * fj; hn = hn[hn < fmax]
            S[k, j] = band_max(L, hp).mean() - beta * (band_max(L, hn).mean() if len(hn) else 0)
    return S


# ---------------------------------------------------------------- tuning
def fit_offset(m, w, km, lo=-3.5, hi=3.5, prior=0.02, detail=False):
    """Tuning offset (semitones) that puts the note pitches closest to the scale's keys (robust squared
    distance, capped at 0.6). detail=True also returns the fit cost and the best offset > 0.4 away."""
    m = np.asarray(m, float); w = np.asarray(w, float); ok = ~np.isnan(m); m, w = m[ok], w[ok]
    if len(m) == 0: return (0.0, 1.0, None, None) if detail else 0.0
    grid = np.arange(lo, hi + 1e-9, 0.01)
    cost = np.array([np.sum(w * np.minimum(np.min(np.abs(m[:, None] - d - km[None, :]), 1), 0.6) ** 2) / np.sum(w) + prior * abs(d) / 3.5 for d in grid])
    b = int(np.argmin(cost))
    if not detail: return float(grid[b])
    far = np.abs(grid - grid[b]) > 0.4; r = int(np.argmin(np.where(far, cost, 1e9)))
    return float(grid[b]), float(cost[b]), float(grid[r]), float(cost[r])


def drift_offsets(ts, m, w, km, off, win=6.0, lim=0.35):
    from scipy.ndimage import median_filter
    out = np.full(len(ts), off)
    for i, t in enumerate(ts):
        s = (np.abs(ts - t) < win / 2) & ~np.isnan(m)
        if s.sum() >= 6: out[i] = fit_offset(m[s], w[s], km, off - lim, off + lim, prior=0)
    return median_filter(out, 5, mode='nearest')


# ---------------------------------------------------------------- flags and lines
def align_sheet(keys, sheet, km_of):
    """Needleman-Wunsch of the transcribed keys against the sheet's main notes. Returns, per transcribed note,
    the index of the sheet note it plays (or -1)."""
    n, m = len(keys), len(sheet); C = np.zeros((n + 1, m + 1)); P = np.zeros((n + 1, m + 1), int)
    C[1:, 0] = np.arange(1, n + 1) * 0.6; C[0, 1:] = np.arange(1, m + 1) * 1.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            a, b = keys[i - 1], sheet[j - 1]
            sub = 0 if a == b else (0.8 if abs((km_of[a] - km_of[b]) % 12) < 0.3 or abs((km_of[a] - km_of[b]) % 12) > 11.7 else 1.6)
            opts = (C[i - 1, j - 1] + sub, C[i - 1, j] + 0.6, C[i, j - 1] + 1.0)
            P[i, j] = int(np.argmin(opts)); C[i, j] = min(opts)
    i, j, match = n, m, [-1] * n
    while i > 0 and j > 0:
        if P[i, j] == 0:
            if keys[i - 1] == sheet[j - 1]: match[i - 1] = j - 1
            i -= 1; j -= 1
        elif P[i, j] == 1: i -= 1
        else: j -= 1
    return match


def flags_and_lines(ts, keys, km_of, sheet_lines=None, gap_line=None):
    n = len(ts); flags = [''] * n; lines = [1] * n
    if sheet_lines:
        sheet = [k for ln in sheet_lines for k in ln]; line_of = [li + 1 for li, ln in enumerate(sheet_lines) for _ in ln]
        mt = align_sheet(keys, sheet, km_of); cur = 1
        for i in range(1, n):        # in a run of the same key the FIRST pick is the sheet note, the rest repeats
            if mt[i] >= 0 and keys[i] == keys[i - 1] and mt[i - 1] < 0:
                k = i
                while k > 0 and keys[k - 1] == keys[i] and mt[k - 1] < 0: k -= 1
                mt[k], mt[i] = mt[i], -1
        for i in range(n):
            if mt[i] >= 0: cur = line_of[mt[i]]
            lines[i] = cur
            if mt[i] < 0: flags[i] = 'r' if i and keys[i] == keys[i - 1] else 'g'
            elif i and keys[i] == keys[i - 1]: flags[i] = 'r'
        return flags, lines
    ioi = np.diff(ts) if n > 1 else np.array([1.0])
    gap = gap_line or max(0.6, 2.5 * float(np.median(ioi)))
    cur = 1
    for i in range(n):
        if i and ts[i] - ts[i - 1] >= gap: cur += 1
        lines[i] = cur
        if i and keys[i] == keys[i - 1]: flags[i] = 'r'
        elif i + 1 < n and ts[i + 1] - ts[i] < 0.1 and keys[i + 1] != keys[i]: flags[i] = 'g'
    return flags, lines


# ---------------------------------------------------------------- main
def transcribe(path, scale, keys_extra=None, start=None, end=None, offset=None, drift=False, sheet=None,
               neural=True, threads=2, separate=False, log=print):
    KEYS = read_keys(keys_extra)
    missing = [k for k in scale if k not in KEYS]
    if missing: raise SystemExit(f'unknown note keys {missing}: add them to js/notes.js or pass --keys name=midi')
    km = np.array([KEYS[k] for k in scale])
    pad = 1.0
    a0 = max(0.0, start - pad) if start is not None else None
    y = load_audio(path, a0, end + pad if end is not None else None)
    base = a0 or 0.0
    if separate: y = separate_oud(y, log)
    t0 = (start - base) if start is not None else 0.0
    t1 = (end - base) if end is not None else len(y) / SR
    log(f'audio: {len(y) / SR:.1f} s'); env, hfs = envelopes(y)
    ts, nvotes = note_starts(env, t0, t1)
    if len(ts) == 0: raise SystemExit('no notes found')
    log(f'note starts: {len(ts)}')
    tracks = {'pyin': track_pyin(y)}
    if neural:
        try:
            tracks['crepe'] = track_crepe(y, threads); tracks['pesto'] = track_pesto(y, threads)
        except ImportError as e:
            log(f'warning: {e}; using pyin and the template only (install requirements.txt for the full vote)')
    wp = {k: window_pitch(v, ts) for k, v in tracks.items()}
    tuning = dict(given=offset is not None)
    if offset is None:
        mm = np.concatenate([wp[k][0] for k in ('pyin', 'crepe') if k in wp]); cc = np.concatenate([wp[k][1] for k in ('pyin', 'crepe') if k in wp])
        offset, cost, ru, ruc = fit_offset(mm, cc + 0.05, km, detail=True)
        tuning.update(fit_cost=round(cost, 3), runner_up=round(ru, 2), runner_up_cost=round(ruc, 3))
        # measured: clean videos fit at 0.03-0.07; lesson videos with talking and the owner's practice take at 0.15-0.17
        # (the take's fit was wrong by about 1.8 semitones). Warn rather than guess.
        if cost > 0.12:
            tuning['warning'] = f'tuning uncertain (fit cost {cost:.2f}; next best {ru:+.2f}): check, or pass --offset'
            log('warning: ' + tuning['warning'])
    offs = drift_offsets(ts, wp['pyin'][0], wp['pyin'][1] + 0.05, km, offset) if drift else np.full(len(ts), offset)
    offs = offs.round(2); S = np.zeros((len(ts), len(km)))
    for o in np.unique(offs):
        sel = offs == o; S[sel] = template_scores(y, ts, km, o)[sel]
    Z = (S - S.mean(1, keepdims=True)) / (S.std(1, keepdims=True) + 1e-9)
    members = {'template': Z.argmax(1)}
    for k, (m, c) in wp.items():
        members[k] = np.array([int(np.argmin(np.abs(x - o - km))) if not np.isnan(x) else -1 for x, o in zip(m, offs)])
    votes = np.zeros_like(Z)
    for idx in members.values():
        for i, j in enumerate(idx):
            if j >= 0: votes[i, j] += 1
    win = (votes + 0.01 * Z).argmax(1); share = votes[np.arange(len(ts)), win] / len(members)
    keys = [scale[j] for j in win]
    sheet_lines = [[k for k in ln.split(',') if k] for ln in sheet.split('|')] if sheet else None
    flags, lines = flags_and_lines(ts, keys, KEYS, sheet_lines)
    first = float(ts[0])
    notes = [[round(float(t) - first, 3), k, ln] + ([f] if f else []) for t, k, ln, f in zip(ts, keys, lines, flags)]
    details = [dict(time=round(float(t) + base, 3), key=k, confidence=round(float(s), 2), onset_detectors=int(n),
                    click_db=round(click_db(hfs, t), 1), votes={name: (scale[idx[i]] if idx[i] >= 0 else None) for name, idx in members.items()})
               for i, (t, k, s, n) in enumerate(zip(ts, keys, share, nvotes))]
    # split votes: on the benchmark 3/4 was right 81%, 2/4 80%; on real passes (agreement with the existing
    # transcriptions) 4/4 95%, 3/4 81%, 2/4 63%. Listen to the lowest first.
    check = [[d['time'], d['key'], d['confidence'], sorted({v for v in d['votes'].values() if v and v != d['key']})]
             for d in details if d['confidence'] < 1.0]
    return dict(source=os.path.basename(path), start=round(first + base, 3), offset_semitones=round(float(offset), 2),
                tuning=tuning, drift=bool(drift), scale=scale, estimators=list(members), notes=notes,
                confidence=[round(float(s), 2) for s in share], check_by_ear=check, details=details)


def separate_oud(y, log):
    """Optional: keep only the instrument part with Demucs (htdemucs: drums, bass, other, vocals -> other+bass).
    The model (~80 MB) downloads on first use. For recordings with singing or other instruments."""
    import torch, librosa
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    log('separating with demucs (htdemucs)...')
    model = get_model('htdemucs'); model.eval()
    x = librosa.resample(y, orig_sr=SR, target_sr=model.samplerate)
    wav = torch.tensor(np.stack([x, x]))[None]
    with torch.no_grad(): out = apply_model(model, wav, device='cpu', split=True, overlap=0.25)[0]
    src = {n: out[i].mean(0).numpy() for i, n in enumerate(model.sources)}
    z = src['other'] + src['bass']
    return librosa.resample(z, orig_sr=model.samplerate, target_sr=SR).astype(np.float32)


def as_js(res):
    return ',\n'.join('[' + ', '.join([repr(n[0]), "'" + n[1] + "'", str(n[2])] + (["'" + n[3] + "'"] if len(n) > 3 else [])) + ']' for n in res['notes'])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input', help='audio or video file (anything ffmpeg reads)')
    ap.add_argument('--scale', required=True, help="comma-separated note keys of the maqam, e.g. faL,laL,re,mi,fa,sol,la,si,do,reH")
    ap.add_argument('--keys', action='append', help="extra key=midi not in js/notes.js, e.g. --keys solL=43 (repeatable)")
    ap.add_argument('--start', type=float, help='only notes from this time (s)')
    ap.add_argument('--end', type=float, help='only notes up to this time (s)')
    ap.add_argument('--offset', type=float, help='known tuning offset in semitones (default: estimated)')
    ap.add_argument('--drift', action='store_true', help='let the tuning drift slowly (6 s windows, +-0.35 semitone)')
    ap.add_argument('--sheet', help="main notes from a note sheet, lines split by '|', e.g. 'si,do,la,sol|re,fa,fa'")
    ap.add_argument('--no-neural', action='store_true', help='pyin + template only (no torch needed; less reliable)')
    ap.add_argument('--separate', action='store_true', help='remove voice/drums with Demucs first (downloads a model)')
    ap.add_argument('--threads', type=int, default=2)
    ap.add_argument('--js', action='store_true', help='also print the notes as lines for a song file')
    ap.add_argument('-o', '--out', help='write JSON here (default: stdout)')
    a = ap.parse_args()
    log = (lambda *x: print(*x, file=sys.stderr))
    res = transcribe(a.input, [k.strip() for k in a.scale.split(',') if k.strip()], a.keys, a.start, a.end, a.offset, a.drift,
                     a.sheet, not a.no_neural, a.threads, a.separate, log)
    txt = json.dumps(res, ensure_ascii=False, indent=1)
    if a.out: open(a.out, 'w', encoding='utf-8').write(txt); log(f"wrote {a.out}: {len(res['notes'])} notes, offset {res['offset_semitones']:+.2f}, {len(res['check_by_ear'])} to check")
    else: print(txt)
    if a.js: print(as_js(res))


if __name__ == '__main__':
    main()
