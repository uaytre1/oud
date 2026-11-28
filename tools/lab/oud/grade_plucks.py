# Grade every pluck the owner recorded: keep or drop, with the reason (owner, 2026-11-28: "you judge what plucks are
# good and what plucks are bad from all my recordings ... later I can add more runs, so that bad plucks get removed").
# Works on any number of record-oud folders (unzipped, with manifest.json) and memo-pluck folders (index.json from
# memo_plucks.py): takes of the same position from all runs are pooled and ranked, so every new run can only help.
# usage: python grade_plucks.py <out.json> <folder> [<folder> ...]
# Checks per take (numbers in docs/memory/songs-and-audio/oud-sound.md, "Grading plucks"):
#   pitch    : steady pitch 0.1-0.6 s after the pick; off by over 20 cents from the position's median -> drop
#   wobble   : pitch spread over 12 cents while it rings -> drop (a finger moving or a half-pressed string)
#   noisy    : energy on the note's harmonics against between them (0.15-1.0 s) under 8 dB -> drop (hiss, room)
#   rustle   : a rise of 8 dB or more in the band above 2.5 kHz after 0.25 s -> drop (clothes, a touch, a second pick)
#   (first try, 2026-11-28: level-above-background and any level rise dropped every take: the takes ring for the
#    whole file and a double course beats; these two measures separate his strings 1-2 from 5-6 as he heard them)
#   clipped  : samples at full scale -> drop
#   rings    : under 0.3 s to fall 20 dB -> drop (muted)
#   matches  : level and brightness against the other good takes of the position, for fast runs (kept as numbers)
import sys, os, re, json, glob, numpy as np, soundfile as sf, librosa, warnings
warnings.filterwarnings('ignore')
out, folders = sys.argv[1], sys.argv[2:]

def takes_in(folder):
    if os.path.exists(os.path.join(folder, 'index.json')):           # memo plucks
        for r in json.load(open(os.path.join(folder, 'index.json'))):
            if r.get('key') and r.get('string'):
                yield os.path.join(folder, r['file']), f"memo_s{r['string']}_{r['key']}", 'down', 'memo'
        return
    for f in sorted(glob.glob(os.path.join(folder, 'run*_s*_*.wav'))):
        m = re.search(r'(run\d+)_(s\d_f\d(?:_hf)?)_(down|up)_\d\.wav$', f)
        if m: yield f, m[2], m[3], os.path.basename(folder) + ':' + m[1]

rows = []
for folder in folders:
    for f, pos, stroke, run in takes_in(folder):
        x, sr = sf.read(f); x = x if x.ndim == 1 else x[:, 0]
        h = 128; env = np.sqrt(np.convolve(x ** 2, np.ones(h) / h, 'same'))[::h]; db = 20 * np.log10(env + 1e-9); fs = sr / h
        on = int(np.argmax(db > db.max() - 20)); pk = int(on + np.argmax(db[on:on + int(0.08 * fs)]))
        below = np.where(db[pk:] < db[pk] - 20)[0]; rings = float(below[0] / fs) if len(below) else float((len(db) - pk) / fs)
        o = int(on / fs * sr)
        # noise: energy between the harmonics against energy on them, 0.15-1.0 s after the pick (the takes ring the whole
        # file, so there is no silence to measure hiss in; a double course's beating does not change this ratio)
        seg = x[o + int(0.15 * sr): o + int(1.0 * sr)]
        f0s, vs, _ = librosa.pyin(seg[: int(0.4 * sr)], fmin=55, fmax=800, sr=sr, frame_length=2048) if len(seg) > int(0.4 * sr) else (np.array([]), np.array([], bool), None)
        hnr = float('nan')
        if vs.any():
            F = float(np.median(f0s[vs])); S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; fr = np.fft.rfftfreq(len(seg), 1 / sr)
            use = (fr > 50) & (fr < 6000); harm = np.zeros_like(fr, bool)
            for k in range(1, 40):
                if k * F > 6000: break
                harm |= np.abs(fr - k * F) < 0.03 * k * F
            hnr = float(10 * np.log10(S[use & harm].sum() / max(S[use & ~harm].sum(), 1e-20)))
        # rustle / touch / second pick: a rise of the band above 2.5 kHz after 0.25 s (the note's own high harmonics have
        # died by then, so a rise there is noise; the courses' beating hardly reaches it)
        Z = librosa.stft(x[o:], n_fft=1024, hop_length=256); fb = librosa.fft_frequencies(sr=sr, n_fft=1024)
        hb = 10 * np.log10((np.abs(Z[fb > 2500]) ** 2).sum(0) + 1e-12)[int(0.25 * sr / 256):]
        bump = float(np.max(hb - np.minimum.accumulate(hb))) if len(hb) > 3 else 0.0
        y = x[int((on / fs + 0.1) * sr): int((on / fs + 0.6) * sr)]
        f0, v, _ = librosa.pyin(y, fmin=55, fmax=800, sr=sr, frame_length=2048) if len(y) > 2048 else (np.array([]), np.array([], bool), None)
        mm = librosa.hz_to_midi(f0[v]) if v.any() else np.array([])
        mid = float(np.median(mm)) if len(mm) else float('nan')
        wob = float(np.std(mm[np.abs(mm - mid) < 0.5]) * 100) if len(mm) > 4 else 99.0
        seg = x[int(on / fs * sr): int(on / fs * sr) + int(0.06 * sr)]
        cen = float(np.mean(librosa.feature.spectral_centroid(y=seg, sr=sr, n_fft=512, hop_length=128))) if len(seg) > 512 else float('nan')
        rows.append({'file': os.path.relpath(f), 'run': run, 'pos': pos, 'stroke': stroke, 'midi': round(mid, 2), 'wobble_c': round(wob, 1),
                     'hnr_db': round(hnr, 1), 'bump_db': round(bump, 1), 'rings_s': round(rings, 2), 'clipped': int(np.sum(np.abs(x) > 0.985)),
                     'level_db': round(float(db[pk]), 1), 'bright_hz': round(cen)})

by = {}
for r in rows: by.setdefault(r['pos'], []).append(r)
for pos, R in by.items():
    med = float(np.nanmedian([r['midi'] for r in R]))
    for r in R:
        why = []
        if not np.isfinite(r['midi']): why.append('no clear pitch')
        elif abs(r['midi'] - med) * 100 > 20: why.append(f"pitch {round((r['midi'] - med) * 100):+d}c from the others")
        if r['wobble_c'] > 12: why.append(f"wobbles {r['wobble_c']}c")
        if not (r['hnr_db'] >= 8): why.append(f"noisy: note only {r['hnr_db']} dB above the noise between its harmonics")
        if r['bump_db'] >= 8: why.append(f"rustle while ringing (+{r['bump_db']} dB above 2.5 kHz): clothes, a touch or a second pick")
        if r['clipped'] > 3: why.append('clipped')
        if r['rings_s'] < 0.3: why.append(f"muted ({r['rings_s']} s)")
        r['keep'] = not why; r['why'] = why; r['pos_median_midi'] = round(med, 2)
    good = [r for r in R if r['keep']]
    for r in R:   # rank: steadiest and cleanest first (the engine uses the best takes; new runs add candidates)
        r['score'] = round((r['hnr_db'] - r['bump_db'] - r['wobble_c'] / 2) if r['keep'] else -99, 1)
json.dump(rows, open(out, 'w'), indent=1)
print(f"{len(rows)} takes graded, {sum(r['keep'] for r in rows)} kept")
print('position  kept down/up  (of)   main reasons for drops')
for pos in sorted(by, key=lambda p: (p.startswith('memo'), p)):
    R = by[pos]; kd = sum(r['keep'] and r['stroke'] == 'down' for r in R); ku = sum(r['keep'] and r['stroke'] == 'up' for r in R)
    reasons = {}
    for r in R:
        for w in r['why']: k = w.split(':')[0].split(' (')[0].split(' only')[0]; k = re.sub(r'[+-]?\d+(\.\d+)?c? ?', '', k).strip()[:22]; reasons[k] = reasons.get(k, 0) + 1
    need = '' if pos.startswith('memo') or (kd >= 2 and ku >= 2) else '   <- record again'
    print(f"{pos:12s} {kd}/{ku}  ({len(R)})   {', '.join(f'{k} x{v}' for k, v in sorted(reasons.items(), key=lambda kv: -kv[1]))}{need}")
