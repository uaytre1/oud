"""Mirror candidate builder (song-standard steps 2-3) from Basic Pitch events + risha picks (picks.py).
usage: build.py tuned.wav bp.json KEYS(json name->midi) t0 t1 out.json
Writes {"cand": {"notes": [[t_rel, midi, dur]...]}, "start": first_pick_s, "kept": [...], "rows": [...]}

Fast plucking (2026-11-27, owner: "fast plucking... sounds like 80% right"):
- pick times = Basic Pitch starts AND risha picks from picks.py (2.9 ms high-band transients), so fast repeats that
  Basic Pitch merges into one long event are split at each re-attack;
- level jump / click are measured from the short dip just before the pick (window starts 25 ms after the previous
  pick), not a fixed 80 ms window that lands on the previous fast pick's peak;
- a note needs 32 ms of steady pitch (was 60 ms), so fast ornaments survive;
- each pick's time is snapped to its transient (+-25 ms).
Pitch is never guessed: a pick gets a pitch only from a Basic Pitch event that starts with it, or (a re-attack inside
a long event) from that event's pitch when the pitch's own energy dips and rises there. Otherwise it is listed, not kept."""
import sys, os, json, numpy as np, librosa
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from picks import Picks
wav, bpf, keysj, t0, t1, outf = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
KEYS = json.loads(keysj)
JUMP, CLICK, PICK_HF = 5.0, float(os.environ.get('CLICK', 8)), float(os.environ.get('PICK_HF', 8))   # dB, short-dip measure
MIN_DUR, REP_RISE = 0.032, 2.0
y, sr = librosa.load(wav, sr=22050); P = Picks(y, sr)
C = np.abs(librosa.cqt(y, sr=sr, hop_length=128, fmin=librosa.midi_to_hz(36), n_bins=108, bins_per_octave=24, filter_scale=0.5))
Cdb = 20 * np.log10(C + 1e-6); ct = np.arange(C.shape[1]) * 128 / sr
def prow(m):
    bb = int(round((m - 36) * 2)); rows = [k for k in (bb - 1, bb, bb + 1) if 0 <= k < 108]; return Cdb[rows].max(axis=0)
def pitch_dip_rise(m, t, prev):     # the pitch's own energy: short dip before t -> peak after (fast re-attack)
    r = prow(m); lo = t - 0.035 if prev is None else max(prev + 0.025, t - 0.035)
    pre = r[(ct >= lo) & (ct <= t + 0.003)]; post = r[(ct >= t + 0.01) & (ct <= t + 0.06)]
    return float(post.max() - pre.min()) if len(pre) and len(post) else 0.0
def snap(p):
    k, m = min(KEYS.items(), key=lambda kv: abs(kv[1] - p)); return (k, m) if abs(m - p) <= 0.6 else (None, None)
ev = [e for e in json.load(open(bpf)) if t0 - 1 <= e[0] < t1 and snap(e[2])[0]]
# candidate pick times: Basic Pitch starts + risha picks, merged within 30 ms (snapped to the transient)
cands = sorted([(e[0], 'bp') for e in ev if t0 <= e[0] < t1] + [(t, 'pick') for t, h, b in P.onsets(t0, t1, hf_db=PICK_HF, bb_db=99)])
times = []
for t, src in cands:
    if times and t - times[-1][0] < 0.03: times[-1][1].add(src); continue
    times.append([t, {src}])
rows = []; prev = None
for k, (t, srcs) in enumerate(times):
    ts = P.peak(t)                                  # snap to the transient (+-25 ms)
    nxt = times[k + 1][0] if k + 1 < len(times) else None
    starting = [e for e in ev if abs(e[0] - t) < 0.045]
    row = {'t': round(ts, 3), 'src': sorted(srcs)}
    if starting:                                    # Basic Pitch event starts here: its strongest pitch
        byp = {}
        for e in starting:
            q = byp.setdefault(e[2], [e[0], e[1], 0]); q[1] = max(q[1], e[1]); q[2] = max(q[2], e[3])
        p, (s_, e_, amp) = max(byp.items(), key=lambda kv: kv[1][2]); k_, m = snap(p); dur = e_ - s_; how = 'bp start'
    else:                                           # a re-attack inside a long Basic Pitch event (merged repeat)
        inside = [e for e in ev if e[0] + 0.03 < t < e[1] - 0.02]
        if not inside: row['drop'] = 'no pitch reading here'; rows.append(row); continue
        e = max(inside, key=lambda e: e[3]); k_, m = snap(e[2]); dur = e[1] - t; amp = e[3]; how = 'split repeat'
        if pitch_dip_rise(m, ts, prev) < REP_RISE: row.update(key=k_, drop='repeat: the pitch does not dip and rise'); rows.append(row); continue
    hf = P.rise(P.hf, ts, prev, nxt); bb = P.rise(P.bb, ts, prev, nxt)
    row.update(key=k_, midi=m, how=how, hf=round(hf, 1), jump=round(bb, 1), dur=round(dur, 3), amp=round(amp, 2))
    if dur < MIN_DUR: row['drop'] = 'pitch not steady 32 ms'
    elif bb < JUMP and hf < CLICK: row['drop'] = 'no level jump, no click'
    rows.append(row)
    if 'drop' not in row: prev = ts
keep = [r for r in rows if 'drop' not in r]
out = []
for r in keep:                                      # one note per pick: same pitch within 55 ms, any two within 30 ms
    if out and ((r['key'] == out[-1]['key'] and r['t'] - out[-1]['t'] < 0.055) or r['t'] - out[-1]['t'] < 0.03):
        r['drop'] = 'second detection'; continue
    out.append(r)
for i, r in enumerate(out):                         # octave: keep the melody near its neighbours
    nb = [o['midi'] for o in out[max(0, i - 3):i] + out[i + 1:i + 4]]
    if not nb: continue
    med = float(np.median(nb))
    for k2, m2 in KEYS.items():
        if abs(abs(m2 - r['midi']) - 12) < 0.01 and abs(m2 - med) + 4 < abs(r['midi'] - med) and pitch_dip_rise(m2, r['t'], None) > 3:
            r['octave_from'] = r['key']; r['key'], r['midi'] = k2, m2; break
start = out[0]['t']
notes = [[round(r['t'] - start, 3), r['midi'], round((out[i + 1]['t'] if i + 1 < len(out) else r['t'] + 0.5) - r['t'], 3)] for i, r in enumerate(out)]
json.dump({'cand': {'notes': notes}, 'start': start, 'kept': out, 'rows': rows}, open(outf, 'w'), ensure_ascii=False, indent=0, default=float)
print(f"{len(out)} notes from {len(times)} pick times ({sum(1 for r in out if r['how'] == 'split repeat')} split repeats); start {start:.3f}", file=sys.stderr)
