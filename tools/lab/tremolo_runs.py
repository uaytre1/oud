# Tremolo as the player plays it: every stroke, measured, grouped into runs (owner, 2026-11-28, marks on the Mirror review
# page of أحب الليل: "here a tremolo on sol", "here a tremolo too" at 7.91, 8.69, 9.45, 10.15, 11.70, 12.87, 14.94 s;
# "6.56: continuous in the real one, the app plays 3-4 notes while the real plays 8 or more").
# Mirror rules: stroke times are the recording's own; nothing is moved; written notes stay.
# 1 strokes: envelope peaks (4 ms hop) at least 40 ms apart that rise 1.5 dB or more above the dip before them.
# 2 a stroke's pitch: pyin 20-50 ms after it (short: strokes come every ~55 ms). Up and down strokes read a little
#   apart (57.0 / 57.5) and some read an octave off, so pitch is judged per run and octave-free (pitch class).
# 3 strokes inside a written note's span whose pitch class matches the note (within 0.5), or has no reading but sits
#   between matching strokes, become that note's tremolo strokes.
# 4 3 or more strokes in a row, 90 ms or less apart, inside a span but NOT matching its note, with one pitch class
#   (spread under 0.6), and no written note within 70 ms of the first: a tremolo nobody wrote: a new note at the first
#   stroke, key = the version's key (or low صول / la) nearest the run's median, in the octave most strokes read; the
#   rest are its strokes. Low notes (under 48) get the decoration flag 'g' (heard, never asked in Slowly).
# usage: python tremolo_runs.py <tuned.wav> <start> <notes.json [{t, midi, key, ...}]> <keys.json> <out.json> [end]
import sys, json, numpy as np, soundfile as sf, librosa, warnings
warnings.filterwarnings('ignore')
wav, start, njson, kjson, out = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
END = float(sys.argv[6]) if len(sys.argv) > 6 else 1e9
x, sr = sf.read(wav); x = x if x.ndim == 1 else x[:, 0]; seg = x[int(start * sr):]
NOTES = sorted(json.load(open(njson))['notes'], key=lambda n: n['t']); K = json.load(open(kjson))
keys = sorted({n['key'] for n in NOTES} | ({'la', 'solL'} & set(K)))
hop = int(0.004 * sr); env = 20 * np.log10(np.sqrt(np.convolve(seg ** 2, np.ones(hop * 2) / (hop * 2), 'same'))[::hop] + 1e-9)
f0, vv, _ = librosa.pyin(seg, fmin=85, fmax=900, sr=sr, frame_length=1024, hop_length=64); tt = np.arange(len(f0)) * 64 / sr; mm = librosa.hz_to_midi(f0)
def pitch(t):
    s = (tt >= t + 0.02) & (tt <= t + 0.05) & vv; return float(np.median(mm[s])) if s.sum() >= 2 else None
pc = lambda a, b: abs(((a - b + 6) % 12) - 6)            # pitch-class distance, octave-free
strokes, last, dip = [], -1, 1e9
for j in range(1, min(len(env) - 1, int(END / 0.004))):
    dip = min(dip, env[j])
    if env[j] >= env[j - 1] and env[j] > env[j + 1] and env[j] - dip >= 1.5 and j * 0.004 - last >= 0.04:
        t = j * 0.004 - 0.008; strokes.append({'t': round(t, 3), 'p': pitch(t), 'rise': round(float(env[j] - dip), 1)}); last = j * 0.004; dip = 1e9
out_notes, new_notes, used = [], [], set()
for i, n in enumerate(NOTES):
    nxt = NOTES[i + 1]['t'] if i + 1 < len(NOTES) else min(n['t'] + 1.5, END)
    inside = [s for s in strokes if n['t'] + 0.035 < s['t'] < nxt - 0.02]
    match = [s['p'] is not None and pc(s['p'], n['midi']) < 0.5 for s in inside]
    # a stroke with no reading counts when the strokes on both sides match
    ok = [m or (s['p'] is None and 0 < k < len(inside) - 1 and match[k - 1] and match[k + 1]) for k, (s, m) in enumerate(zip(inside, match))]
    mine = [s for s, o in zip(inside, ok) if o]
    rec = dict(n); rec['strokes'] = [s['t'] for s in mine]; out_notes.append(rec)
    # step 4: runs inside this span that do not match the note
    rest = [s for s, o in zip(inside, ok) if not o and s['p'] is not None]
    run = []
    for s in rest + [None]:
        if s is not None and (not run or (s['t'] - run[-1]['t'] <= 0.09 and pc(s['p'], run[0]['p']) < 0.6)): run.append(s); continue
        if len(run) >= 3 and min(abs(m['t'] - run[0]['t']) for m in NOTES) > 0.07:
            ps = np.array([r['p'] for r in run]); med = float(np.median(ps))
            key = min(keys, key=lambda k: pc(K[k][0], med))
            if pc(K[key][0], med) <= 0.35:
                octs = np.round((ps - K[key][0]) / 12); oc = float(np.bincount((octs + 3).astype(int)).argmax() - 3)
                midi = K[key][0] + 12 * oc
                kk = key if oc == 0 else next((k for k, v in K.items() if abs(v[0] - midi) < 0.3), key)
                new_notes.append({'t': run[0]['t'], 'midi': K[kk][0], 'key': kk, 'string': K[kk][2], 'finger': K[kk][3], 'dur': 0.15, 'line': n.get('line', 0),
                                  'g': K[kk][0] < 48, 'ar': K[kk][1], 'strokes': [r['t'] for r in run[1:]], 'new_run': True, 'run_median': round(med, 2)})
        run = [s] if s is not None else []
allnotes = sorted(out_notes + new_notes, key=lambda n: n['t'])
json.dump({'version': 'tremolo runs', 'notes': allnotes}, open(out, 'w'), ensure_ascii=False)
print(f"{len(strokes)} strokes found; {sum(len(n['strokes']) for n in out_notes)} as tremolo of written notes ({sum(1 for n in out_notes if n['strokes'])} notes); "
      f"{len(new_notes)} new tremolo notes nobody wrote:")
for n in new_notes: print(f"  {n['t']:6.3f} {n['ar']} ({n['key']}, run median {n['run_median']}) + {len(n['strokes'])} strokes{' g' if n['g'] else ''}")
