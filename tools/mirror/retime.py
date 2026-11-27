"""Move late notes back to their risha pick (song-standard step 5: "take the time of the recording's pick").
usage: retime.py final.json tuned.wav out_cand.json
Basic Pitch marks a note where its tone settles; on fast plucking that can be 30-65 ms after the risha strikes.
A note moves to a strong pick (picks.py, click >= 10 dB) 30-65 ms before it when the note has no strong pick of its own (within 20 ms), nothing else lies between them, and
pyin already hears the note's own pitch class 20-70 ms after the pick. Writes build.py's format for step5.py."""
import sys, os, json, numpy as np, librosa
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from picks import Picks
fin, wav, outf = sys.argv[1:4]
d = json.load(open(fin)); N = sorted([[round(t + d['start'], 3), m] for t, m in d['notes']])
y, sr = librosa.load(wav, sr=22050)
ons = [x[0] for x in Picks(y, sr).onsets(hf_db=10, bb_db=99)]
f0, v, _ = librosa.pyin(y, fmin=90, fmax=700, sr=sr, frame_length=1024, hop_length=128)
tt = np.arange(len(f0)) * 128 / sr; mm = librosa.hz_to_midi(f0)
moved = []
for i, n in enumerate(N):
    t, m = n; prev = N[i - 1][0] if i else -9
    if any(abs(o - t) <= 0.02 for o in ons): continue      # the note already sits on a strong pick of its own
    for o in ons:
        if 0.03 <= t - o <= 0.065 and o > prev + 0.04:
            s = (tt >= o + 0.02) & (tt <= o + 0.07) & v
            if s.sum() >= 2 and abs(((float(np.median(mm[s])) - m) + 6) % 12 - 6) <= 0.6:
                moved.append([t, round(o, 3), m]); n[0] = round(o, 3)
            break
for a, b, m in moved: print(f'{a:.3f} -> {b:.3f} ({1000 * (b - a):+.0f} ms) {m}')
N.sort(); s0 = N[0][0]
rel = [[round(t - s0, 3), m, round((N[k + 1][0] if k + 1 < len(N) else t + 0.5) - t, 3)] for k, (t, m) in enumerate(N)]
json.dump({'cand': {'notes': rel}, 'start': s0, 'moved': moved}, open(outf, 'w'), ensure_ascii=False, indent=0)
print(f'{len(moved)} of {len(N)} notes moved to their pick')
