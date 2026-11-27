# Note-by-note check of a version against its own recording: timing (pick onset) and pitch (pyin).
import json, re, sys, warnings; warnings.filterwarnings('ignore')
import numpy as np, librosa
wav, vjson, start, notesjs = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
src = open(notesjs, encoding='utf8').read()
MIDI = {k: float(v) for k, v in re.findall(r"^\s*(\w+):\s*\{[^}]*?midi:\s*([\d.]+)", src, re.M)}
notes = json.load(open(vjson))['notes']
SR, HOP = 22050, 64
y, _ = librosa.load(wav, sr=SR)
env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
on = librosa.onset.onset_detect(onset_envelope=env, sr=SR, hop_length=HOP, units='time', backtrack=False)
f0, vf, _ = librosa.pyin(y, fmin=librosa.midi_to_hz(38), fmax=librosa.midi_to_hz(80), sr=SR, frame_length=2048, hop_length=128)
mid = librosa.hz_to_midi(f0); ft = np.arange(len(mid)) * 128 / SR
rows = []
ts = [n[0] + start for n in notes]
for i, n in enumerate(notes):
    t = ts[i]; key = n[1]; m = MIDI[key]
    near = on[np.abs(on - t) < 0.1]
    dt = float(near[np.argmin(np.abs(near - t))] - t) if len(near) else None
    nxt = ts[i + 1] if i + 1 < len(ts) else t + 0.5
    a, b = t + 0.03, min(t + 0.12, nxt - 0.01)
    if b - a < 0.02: a, b = t + 0.012, nxt - 0.005
    w = (ft > a) & (ft < b) & ~np.isnan(mid)
    p = float(np.median(mid[w])) if w.any() else None
    c = None if p is None else (p - m) * 100
    rows.append((round(n[0] + start, 2), key, None if dt is None else round(dt * 1000), None if c is None else round(c)))
dts = [abs(r[2]) for r in rows if r[2] is not None]
print(f'notes {len(rows)} | a real pluck found within 100 ms: {len(dts)}')
print(f'timing gap ms: median {np.median(dts):.0f}, 90% under {np.percentile(dts, 90):.0f}, max {max(dts)} | under 20 ms: {sum(d < 20 for d in dts)}, under 40: {sum(d < 40 for d in dts)}, under 60: {sum(d < 60 for d in dts)}')
print('no pluck found within 100 ms:', [r[:2] for r in rows if r[2] is None])
print('timing gap 40 ms or more:', [r[:3] for r in rows if r[2] is not None and abs(r[2]) >= 40])
cs = [r for r in rows if r[3] is not None]
same = [r for r in cs if abs(r[3]) < 50]; octv = [r for r in cs if abs(abs(r[3]) - 1200) < 60]
print(f'pitch: same note {len(same)}, octave off {len(octv)}, different note {len(cs) - len(same) - len(octv)}, no pitch read {len(rows) - len(cs)}')
print('pitch not the same note (file second, key, cents off):', [(r[0], r[1], r[3]) for r in cs if abs(r[3]) >= 50])
json.dump(rows, open(sys.argv[5], 'w'))
