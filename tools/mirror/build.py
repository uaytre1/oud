"""Mirror candidate builder (song-standard steps 2-3) from Basic Pitch events + measured level jump / click.
usage: build.py tuned.wav bp.json KEYS(json name->midi) t0 t1 out.json
Writes {"cand": {"notes": [[t_rel, midi, dur]...]}, "start": first_pick_s, "rows": [...details...]}"""
import sys, json, numpy as np, librosa, scipy.signal as sg
wav, bpf, keysj, t0, t1, outf = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
KEYS = json.loads(keysj); import os; CLICK = float(os.environ.get('CLICK', 6))   # dB: the app's click gate (docs/memory/detection.md)
y, sr = librosa.load(wav, sr=22050)
hop = 64
rms = librosa.feature.rms(y=y, frame_length=512, hop_length=hop)[0]; rdb = 20*np.log10(rms+1e-6)
b, a = sg.butter(4, 1800/(sr/2), 'high'); yh = sg.lfilter(b, a, y)
hdb = 20*np.log10(np.convolve(yh**2, np.ones(64*3)/(64*3), 'same')[::hop]**0.5+1e-7)
ft = np.arange(len(rdb))*hop/sr
C = np.abs(librosa.cqt(y, sr=sr, hop_length=128, fmin=librosa.midi_to_hz(36), n_bins=108, bins_per_octave=24, filter_scale=0.5))
Cdb = 20*np.log10(C+1e-6); ct = np.arange(C.shape[1])*128/sr
def seg(arr, tt, lo, hi, f):
    m = (tt >= lo) & (tt < hi); return f(arr[m]) if m.any() else -120.0
def jump(t): return seg(rdb, ft, t+0.02, t+0.10, np.max) - seg(rdb, ft, t-0.08, t-0.01, np.mean)
def click(t): return seg(hdb, ft, t, t+0.044, np.max) - seg(hdb, ft, t-0.09, t-0.012, np.min)
def lvl(m, lo, hi):
    bb = int(round((m-36)*2)); rows = [k for k in (bb-1, bb, bb+1) if 0 <= k < 108]
    cols = (ct >= lo) & (ct < hi); return float(Cdb[rows][:, cols].max(axis=0).mean()) if cols.any() else -120
def prise(m, t): return lvl(m, t+0.02, t+0.10) - lvl(m, t-0.08, t-0.01)
ev = [e for e in json.load(open(bpf)) if t0 <= e[0] < t1 and (45 <= e[2] <= 77 or any(abs(v - e[2]) < 0.6 for v in KEYS.values()))]   # low keys of the song (فا قرار) too
# cluster event starts within 45 ms: one pick
ev.sort(); cl = []
for e in ev:
    if cl and e[0] - cl[-1][0][0] < 0.045: cl[-1].append(e)
    else: cl.append([e])
def snap(p):   # nearest maqam key within 0.6 semitone
    k, m = min(KEYS.items(), key=lambda kv: abs(kv[1]-p)); return (k, m) if abs(m-p) <= 0.6 else (None, None)
rows = []
for c in cl:
    t = min(e[0] for e in c)
    opts = []
    byp = {}
    for e in c:                                    # same pitch split in pieces inside one pick: join them
        q = byp.setdefault(e[2], [e[0], e[1], 0]); q[1] = max(q[1], e[1]); q[2] = max(q[2], e[3])
    for p_, (s_, e_, amp_) in byp.items():
        k, m = snap(p_)
        if k: opts.append((amp_, prise(m, t), k, m, e_ - s_))
    if not opts: rows.append({'t': t, 'drop': 'not in maqam', 'bp': [e[2] for e in c]}); continue
    opts.sort(reverse=True); amp, r, k, m, dur = opts[0]     # Basic Pitch is the primary reading: strongest event
    j, ck = jump(t), click(t)
    row = {'t': round(t, 3), 'key': k, 'midi': m, 'rise': round(r, 1), 'jump': round(j, 1), 'click': round(ck, 1), 'dur': round(dur, 3), 'alts': [o[2] for o in opts[1:]], 'amp': round(amp,2)}
    if dur < 0.06: row['drop'] = 'pitch not steady 60 ms'
    elif j < 5 and ck < CLICK: row['drop'] = 'no level jump, no click'
    rows.append(row)
keep = [r for r in rows if 'drop' not in r]
# second detection of the same pick: same pitch within 70 ms -> keep the first
out = []
for r in keep:
    if out and r['key'] == out[-1]['key'] and r['t'] - out[-1]['t'] < 0.07: r['drop'] = 'second detection'; continue
    out.append(r)
# octave: keep the melody near its neighbours (only for keys with an octave twin)
for i, r in enumerate(out):
    nb = [o['midi'] for o in out[max(0, i-3):i] + out[i+1:i+4]]
    if not nb: continue
    med = float(np.median(nb))
    for k2, m2 in KEYS.items():
        if abs(abs(m2 - r['midi']) - 12) < 0.01 and abs(m2 - med) + 4 < abs(r['midi'] - med) and prise(m2, r['t']) > 3:
            r['octave_from'] = r['key']; r['key'], r['midi'] = k2, m2; break
start = out[0]['t']
notes = [[round(r['t']-start, 3), r['midi'], round((out[i+1]['t'] if i+1 < len(out) else r['t']+0.5) - r['t'], 3)] for i, r in enumerate(out)]
json.dump({'cand': {'notes': notes}, 'start': start, 'kept': out, 'rows': rows}, open(outf, 'w'), ensure_ascii=False, indent=0, default=float)
print(f'{len(out)} notes kept from {len(cl)} picks; start {start:.3f}', file=sys.stderr)
