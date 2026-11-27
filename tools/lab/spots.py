# Lab: at chosen notes, measure the pick time four ways and compare (no data is changed).
#  gate   = the gate's onsets (hop 128, delta 0.04, wait 3)       fine  = onsets at hop 32, delta 0.04, wait 2
#  click  = the risha click: biggest rise of the treble (pre-emphasis RMS, 1.5 ms steps) near the note
#  pitch  = where this note's own pitch band starts rising most (CQT, quarter tones, 5 ms steps)
# usage: python tools/lab/spots.py <tuned.wav> <notes.json with "notes" and "start"> <js/notes.js> <sec,sec,...>
import json, re, sys, warnings; warnings.filterwarnings('ignore')
import numpy as np, librosa
wav, vj, notesjs, secs = sys.argv[1:5]
d = json.load(open(vj)); start = d['start']; notes = d['notes']
M = {k: float(v) for k, v in re.findall(r"^\s*(\w+):\s*\{[^}]*?midi:\s*([\d.]+)", open(notesjs, encoding='utf8').read(), re.M)}
sr = 22050; y, _ = librosa.load(wav, sr=sr)
og = librosa.onset.onset_detect(y=y, sr=sr, hop_length=128, backtrack=False, delta=0.04, wait=3, units='time')
of = librosa.onset.onset_detect(y=y, sr=sr, hop_length=32, backtrack=False, delta=0.04, wait=2, units='time')
hf = librosa.feature.rms(y=librosa.effects.preemphasis(y, coef=0.97), frame_length=256, hop_length=32)[0]
hdb = 20 * np.log10(hf + 1e-7); ht = np.arange(len(hdb)) * 32 / sr
C = np.abs(librosa.cqt(y, sr=sr, hop_length=64, fmin=librosa.midi_to_hz(36), n_bins=108, bins_per_octave=24, filter_scale=0.5))
Cdb = 20 * np.log10(C + 1e-6); ct = np.arange(C.shape[1]) * 64 / sr
def near(on, t): k = np.argmin(np.abs(on - t)); return float(on[k] - t) if abs(on[k] - t) < 0.1 else None
def click(t):  # time of the steepest treble rise within +-60 ms
    w = (ht > t - 0.06) & (ht < t + 0.06); idx = np.where(w)[0]
    rise = [hdb[i + 2] - hdb[i - 3] for i in idx if i >= 3 and i + 2 < len(hdb)]
    return float(ht[idx[int(np.argmax(rise))]] - t) if rise else None
def pitch(t, m):  # time of the steepest rise of this pitch band within +-60 ms
    b = int(round((m - 36) * 2)); rows = [k for k in (b - 1, b, b + 1) if 0 <= k < 108]
    w = np.where((ct > t - 0.06) & (ct < t + 0.06))[0]
    lv = Cdb[rows].max(axis=0)
    r = [lv[i + 1] - lv[i - 2] for i in w if i >= 2 and i + 1 < len(lv)]
    return float(ct[w[int(np.argmax(r))]] - t) if r else None
want = [float(x) for x in secs.split(',')]
ms = lambda v: '  -  ' if v is None else f'{v * 1000:+4.0f}'
print('second key   | gate  fine  click pitch (ms from the note; - = none within 100 ms)')
for n in notes:
    t = n[0] + start
    if not any(abs(t - w) < 0.03 for w in want): continue
    print(f'{t:6.2f} {n[1]:5s} | {ms(near(og, t))} {ms(near(of, t))} {ms(click(t))} {ms(pitch(t, M[n[1]]))}')
