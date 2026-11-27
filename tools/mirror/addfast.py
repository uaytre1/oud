"""Add the fast picks of a new build to an ear-checked candidate, without touching the checked notes.
usage: addfast.py checked_final.json new_final.json tuned.wav out_cand.json
A note of the new build is added only where the checked version has no note within 60 ms (70 ms for the same pitch: step5's second-detection rule), and only when its pitch
is backed by a second reading: pyin over the first 20-70 ms agrees (same pitch class within 0.6 semitone), or pyin
hears nothing and the note repeats the note just before it (a fast same-pitch risha repeat).
SNAP=1: also snap every note to a strong risha transient (picks.py, 8 dB) within 25 ms (off by default: the
checked notes sit a median 3 ms from their transient, and snapping made step5 merge neighbours on ahib).
Writes build.py's format for step5.py and prints every decision."""
import sys, json, numpy as np, librosa
chk, new, wav, outf = sys.argv[1:5]
a = json.load(open(chk)); b = json.load(open(new))
A = sorted([[round(t + a['start'], 3), m] for t, m in a['notes']]); B = [[round(t + b['start'], 3), m] for t, m in b['notes']]
y, sr = librosa.load(wav, sr=22050)
f0, v, _ = librosa.pyin(y, fmin=90, fmax=700, sr=sr, frame_length=1024, hop_length=128)
tt = np.arange(len(f0)) * 128 / sr; mm = librosa.hz_to_midi(f0)
def py(t):
    s = (tt >= t + 0.02) & (tt <= t + 0.07) & v; return float(np.median(mm[s])) if s.sum() >= 2 else None
added = []; skipped = []
for t, m in B:
    if any(abs(t - u) < 0.06 or (abs(t - u) < 0.07 and abs(n - m) < 0.3) for u, n in A): continue   # the same pick, timed a little differently
    before = [n for u, n in A + added if u < t]; prev = before[-1] if before else None
    p = py(t); pc = None if p is None else abs(((p - m) + 6) % 12 - 6)
    if (pc is not None and pc <= 0.6) or (p is None and prev is not None and abs(prev - m) < 0.3):
        added.append([t, m]); print(f'add {t:.3f} {m}  (pyin {p if p is None else round(p, 1)}, before {prev})')
    else: skipped.append([t, m, None if p is None else round(p, 1)])
print('skipped (pitch not backed):', skipped)
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from picks import Picks
ons = np.array([x[0] for x in Picks(y, sr).onsets(hf_db=8, bb_db=99)])   # strong risha transients
snapped = 0
for n in (A + added if os.environ.get('SNAP') == '1' else []):   # off by default: on ahib it pushed checked notes into each other
    # timing: snap to a strong transient within 25 ms (fast rhythm jitter)
    if len(ons):
        k = int(np.argmin(np.abs(ons - n[0])))
        if 0.003 < abs(ons[k] - n[0]) <= 0.025: n[0] = round(float(ons[k]), 3); snapped += 1
print('snapped to the risha transient:', snapped)
N = sorted(A + added); s0 = N[0][0]
rel = [[round(t - s0, 3), m, round((N[k + 1][0] if k + 1 < len(N) else t + 0.5) - t, 3)] for k, (t, m) in enumerate(N)]
json.dump({'cand': {'notes': rel}, 'start': s0, 'added': added, 'skipped': skipped}, open(outf, 'w'), ensure_ascii=False, indent=0)
print(f'{len(A)} checked + {len(added)} fast picks = {len(N)} notes')
