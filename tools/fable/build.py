# Build a version's notes the way docs/memory/fable-method.md section 4 says (steps 1-5).
# usage: python3 tools/fable/build.py tuned.wav t0 t1 'key,key,...' out.json
# Pick times: librosa onsets + Basic Pitch note starts. Keep a pick when the level jumps or the risha clicks.
# Pitch of each pick: pyin, median 30-120 ms after it (full oud range). Nearest key of the maqam. Nothing added.
import json, os, re, sys, warnings
warnings.filterwarnings('ignore')
import numpy as np, librosa, soundfile as sf

wav, t0, t1, keyarg, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5]
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'notes.js'), encoding='utf8').read()
ALL = {k: float(v) for k, v in re.findall(r"^\s*(\w+):\s*\{[^}]*?midi:\s*([\d.]+)", src, re.M)}
KEYS = {k: ALL[k] for k in keyarg.split(',')}
SR, HOP = 22050, 128
pad = 0.3
y, _ = librosa.load(wav, sr=SR, offset=t0 - pad, duration=(t1 - t0) + 2 * pad)
T = lambda i: t0 - pad + i * HOP / SR

# 1. tuning proof: every voiced frame against the nearest key of the maqam
f0, vf, _ = librosa.pyin(y, fmin=librosa.midi_to_hz(38), fmax=librosa.midi_to_hz(80), sr=SR, frame_length=2048, hop_length=HOP)
mid = librosa.hz_to_midi(f0); ft = np.array([T(i) for i in range(len(mid))])
kv = np.array(sorted(set(KEYS.values())))
v = mid[~np.isnan(mid)]
dev = ((v[:, None] - kv[None, :] + 6) % 12 - 6)[np.arange(len(v)), np.argmin(np.abs((v[:, None] - kv[None, :] + 6) % 12 - 6), axis=1)]
tuning = {'median_cents_off': round(float(np.median(dev)) * 100), 'within_30_cents': round(float(np.mean(np.abs(dev) < 0.3)) * 100)}

# 2. pick times
on = librosa.onset.onset_detect(y=y, sr=SR, hop_length=HOP, units='time', backtrack=False) + (t0 - pad)
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import predict
mp = str(ICASSP_2022_MODEL_PATH); c = os.path.join(os.path.dirname(mp), 'nmp.onnx'); mp = c if os.path.exists(c) else mp
tmp = out + '.seg.wav'; sf.write(tmp, y, SR)
_, _, ev = predict(tmp, mp, onset_threshold=0.5, frame_threshold=0.3)
os.remove(tmp)
bp = [s + t0 - pad for s, e, p, a, _ in ev]
cand = sorted(set([round(x, 3) for x in list(on) + bp]))
picks = []
for x in cand:
    if t0 <= x <= t1 and (not picks or x - picks[-1] > 0.045): picks.append(x)

rms = librosa.feature.rms(y=y, frame_length=512, hop_length=HOP)[0]; db = 20 * np.log10(rms + 1e-7)
hf = librosa.feature.rms(y=librosa.effects.preemphasis(y, coef=0.97), frame_length=512, hop_length=HOP)[0]
fr = lambda t: int(round((t - (t0 - pad)) * SR / HOP))
def jump(t):
    i = fr(t); a = db[i:i + 11].max(); b = db[max(0, i - 16):i].min() if i > 0 else a; return float(a - b)
def click(t):
    i = fr(t); a = hf[i:i + 6].max(); b = hf[max(0, i - 14):max(1, i - 2)].mean(); return float(20 * np.log10(a / (b + 1e-9)))

kept = []
for x in picks:
    j, c = jump(x), click(x); gap = x - kept[-1]['t'] if kept else 9
    need = 3 if gap < 0.3 else 4 if gap < 0.6 else 5
    if j >= need or c >= 13: kept.append({'t': x, 'jump': round(j, 1), 'click': round(c, 1)})

# 3. pitch at each pick (pyin), 4. octave report
notes = []
for i, k in enumerate(kept):
    nxt = kept[i + 1]['t'] if i + 1 < len(kept) else k['t'] + 0.5
    a, b = k['t'] + 0.03, min(k['t'] + 0.12, nxt - 0.01)
    if b - a < 0.02: a, b = k['t'] + 0.012, nxt - 0.005
    w = (ft > a) & (ft < b) & ~np.isnan(mid)
    if not w.any(): k['unsure'] = 'no pitch'; continue
    p = float(np.median(mid[w])); key = min(KEYS, key=lambda q: abs(KEYS[q] - p))
    k.update(midi=round(p, 2), key=key, cents=round((p - KEYS[key]) * 100))
    if abs(p - KEYS[key]) > 0.5: k['unsure'] = f'pitch {p:.1f} is between keys'
    if KEYS[key] < 48 or key.startswith(('fa', 'la')): k['octave_check'] = True
    notes.append(k)

# 5. remove: same key again within 70 ms (one pick), then X-Y-X flicks under 0.25 s (owner's rule)
clean = []
for n in notes:
    if clean and n['key'] == clean[-1]['key'] and n['t'] - clean[-1]['t'] < 0.07: continue
    clean.append(n)
removed = []
i = 0
while i + 2 < len(clean):
    a, b, c = clean[i], clean[i + 1], clean[i + 2]
    if a['key'] == c['key'] != b['key'] and c['t'] - a['t'] < 0.25:
        removed += [(b['t'], b['key'], 'flick'), (c['t'], c['key'], 'flick return')]; del clean[i + 1:i + 3]
    else: i += 1

st = clean[0]['t']
res = {'from': wav, 'window': [t0, t1], 'start': st, 'tuning_check': tuning, 'picks_found': len(picks), 'picks_kept': len(kept),
       'removed': removed, 'notes': [[round(n['t'] - st, 3), n['key']] for n in clean],
       'detail': [{**n, 't': round(n['t'] - st, 3)} for n in clean]}
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
print('tuning', tuning, '| picks', len(picks), 'kept', len(kept), '| notes', len(clean), '| removed', len(removed))
print('unsure:', [(round(n['t'] - st, 2), n['key'], n['unsure']) for n in clean if 'unsure' in n][:20])
print('first notes:', ' '.join(n['key'] for n in clean[:30]))
