"""Apply an ear check's answers to a candidate, but keep only what the recording's numbers agree with (step 3).
usage: edits.py final.json(from step5.py) tuned.wav edits.json out_cand.json
edits.json: [{"op": "remove"|"add"|"change", "t": recording seconds, "midi": new pitch (add/change), "who": "..."}]
  remove: the note within 40 ms of t goes (an ear call that a pick is decay or a slur is enough: leaving out is safe).
  add / change: the new pitch must start there (rise >= 3.5 dB at the pitch or its octave, the gate's soft bar; half that for a repeat of the note before within 0.6 s, as the gate does)
  AND the pick must show a level jump >= 5 dB or a treble click >= 6 dB; otherwise refused and listed.
Writes build.py's format ({"cand": {"notes"}, "start"}) for step5.py, and prints every decision."""
import sys, json, numpy as np, librosa, scipy.signal as sg
fin, wav, edf, outf = sys.argv[1:5]
d = json.load(open(fin)); st = d['start']
notes = [[round(st + t, 3), m] for t, m in d['notes']]
y, sr = librosa.load(wav, sr=22050); hop = 64
rdb = 20*np.log10(librosa.feature.rms(y=y, frame_length=512, hop_length=hop)[0]+1e-6)
b, a = sg.butter(4, 1800/(sr/2), 'high'); yh = sg.lfilter(b, a, y)
hdb = 20*np.log10(np.convolve(yh**2, np.ones(192)/192, 'same')[::hop]**0.5+1e-7); ft = np.arange(len(rdb))*hop/sr
C = np.abs(librosa.cqt(y, sr=sr, hop_length=128, fmin=librosa.midi_to_hz(36), n_bins=108, bins_per_octave=24, filter_scale=0.5))
Cdb = 20*np.log10(C+1e-6); ct = np.arange(C.shape[1])*128/sr
def seg(arr, tt, lo, hi, f):
    m = (tt >= lo) & (tt < hi); return float(f(arr[m])) if m.any() else -120.0
def lvl(m, lo, hi):
    bb = int(round((m-36)*2)); rows = [k for k in (bb-1, bb, bb+1) if 0 <= k < 108]
    cols = (ct >= lo) & (ct < hi); return float(Cdb[rows][:, cols].max(axis=0).mean()) if cols.any() else -120
def prise(m, t):   # best start of pitch m (or its octave partial) within 60 ms of t, as the gate looks for it
    return max(max(lvl(mm, x+0.02, x+0.10) - lvl(mm, x-0.08, x-0.01) for mm in (m, m+12)) for x in t + np.arange(-0.06, 0.061, 0.01))
def pick(t):
    return max((seg(rdb, ft, x+0.02, x+0.10, np.max) - seg(rdb, ft, x-0.08, x-0.01, np.mean),
                seg(hdb, ft, x, x+0.044, np.max) - seg(hdb, ft, x-0.09, x-0.012, np.min)) for x in t + np.arange(-0.04, 0.041, 0.01))
refused = []
for e in json.load(open(edf)):
    t = e['t']; i = min(range(len(notes)), key=lambda k: abs(notes[k][0] - t)) if notes else None
    if e['op'] == 'remove':
        if i is not None and abs(notes[i][0] - t) < 0.04: print(f"removed {notes[i]}  ({e.get('who','')})"); del notes[i]
        else: print(f"remove {t}: no note there"); refused.append(e)
        continue
    m = e['midi']; r = prise(m, t); j, c = pick(t)
    before = [n for n in notes if n[0] < t - 0.03]
    rep = bool(before) and abs(before[-1][1] - m) < 0.3 and t - before[-1][0] < 0.6   # the gate's repeat rule: half the bar
    ok = r >= (1.75 if rep else 3.5) and (j >= 5 or c >= 6)
    print(f"{e['op']} {t} -> {m}: pitch rise {r:.1f} dB{' (repeat: bar 1.75)' if rep else ''}, level jump {j:.1f}, click {c:.1f}: {'OK' if ok else 'REFUSED'}  ({e.get('who','')})")
    if not ok: refused.append({**e, 'rise': round(r, 1), 'jump': round(j, 1), 'click': round(c, 1)}); continue
    if e['op'] == 'change':
        if abs(notes[i][0] - t) < 0.04: notes[i][1] = m
        else: print('  no note there to change'); refused.append(e)
    else: notes.append([t, m])
notes.sort(); s0 = notes[0][0]
rel = [[round(t - s0, 3), m, round((notes[k+1][0] if k+1 < len(notes) else t + 0.5) - t, 3)] for k, (t, m) in enumerate(notes)]
json.dump({'cand': {'notes': rel}, 'start': s0, 'refused': refused}, open(outf, 'w'), ensure_ascii=False, indent=0)
print(f'{len(notes)} notes, start {s0}; refused {len(refused)}')
