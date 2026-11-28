# Real-oud engine, version 2 (offline proof), following oud-sound.md steps 1-6 and F1-F5 with the measured numbers.
# usage: engine2.py <samples_dir> <notes.json from the app> <out.wav> [memo.wav for the low string-5 open pluck]
import sys, os, glob, json, numpy as np, soundfile as sf, librosa, warnings
warnings.filterwarnings('ignore')
d, notes_json, out = sys.argv[1:4]; memo = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != '-' else None
# optional 5th argument: grades.json from grade_plucks.py; then only takes graded "keep" are used (all, when a position
# has none kept for that stroke)
GRADES = {os.path.basename(r['file']): r for r in json.load(open(sys.argv[5]))} if len(sys.argv) > 5 else None
SR = 32000
OPEN = {1: 60, 2: 55, 3: 50, 4: 45, 5: 41, 6: 36}; NAT = {0: 0, 1: 2, 2: 3, 3: 4, 4: 5}

def load(f):
    x, sr = sf.read(f); x = x if x.ndim == 1 else x[:, 0]
    return x if sr == SR else librosa.resample(x, orig_sr=sr, target_sr=SR)

def steepest(x):
    # F4: line takes up at the steepest rise of the envelope in the first 150 ms after it starts
    env = np.sqrt(np.convolve(x ** 2, np.ones(32) / 32, 'same')); a = int(np.argmax(env > 0.1 * env.max()))
    w = env[max(0, a - 160): a + int(0.15 * SR)]; dv = np.diff(w)
    return max(0, a - 160) + int(np.argmax(dv))

def pitch(x, i):
    f0, v, _ = librosa.pyin(x[i + 3200: i + 19200], fmin=55, fmax=700, sr=SR, frame_length=4096)
    return float(np.nanmedian(librosa.hz_to_midi(f0[v]))) if v.any() else np.nan

def lowcut(x):   # F5: strings 1-4 only need a gentle low cut (rumble under 60 Hz) and the end fade
    S = librosa.stft(x, n_fft=2048); f = librosa.fft_frequencies(sr=SR, n_fft=2048)
    S[f < 60] *= 0.1
    return librosa.istft(S, length=len(x))

bank = {}; dropped = {}
def position(pos, target):
    if pos in bank: return bank[pos]
    raw = []
    import re
    for f in sorted(glob.glob(os.path.join(d, f'run1_{pos}_*.wav'))):
        if not re.search(rf'run1_{pos}_(down|up)_\d\.wav$', f): continue          # exact position (s2_f2 is not s2_f2_hf)
        x = load(f); i = steepest(x); raw.append((f, x, i, pitch(x, i)))
    med = np.nanmedian([r[3] for r in raw])
    takes = {'down': [], 'up': []}
    kept = lambda f: not GRADES or (GRADES.get(os.path.basename(f)) or {'keep': True})['keep']
    any_kept = any(kept(f) for f, *_ in raw)
    for f, x, i, p in raw:
        if not abs(p - med) <= 0.15: continue                                   # step 1: drop off-pitch takes
        if any_kept and not kept(f):                                            # graded: noisy, rustle, muted ...
            dropped.setdefault(pos, []).append(f); continue                     # (all used when none was kept)
        y = lowcut(x)[max(0, i - int(0.005 * SR)):]                           # step 5: 5 ms before the pick
        r = 2 ** ((target - med) / 12)                                          # step 3: shift by the position's median error
        y = librosa.resample(y, orig_sr=SR, target_sr=SR / r)
        n = int(0.15 * SR); y[-n:] *= np.linspace(1, 0, n)
        lvl = np.sqrt(np.mean(y[:int(0.2 * SR)] ** 2))
        takes['down' if '_down_' in f else 'up'].append([y, lvl])
    allv = [l for k in takes for _, l in takes[k]]; ref = np.median(allv)
    for k in takes:                                                             # step 4: same level, +-1.5 dB, up 1.5 dB under down
        for t in takes[k]:
            g = (0.05 / t[1]) * np.clip(t[1] / ref, 10 ** (-1.5 / 20), 10 ** (1.5 / 20)) * (10 ** (-1.5 / 20) if k == 'up' else 1)
            t[0] = t[0] * g
    bank[pos] = (takes, med); return bank[pos]

def memo_low_fa():
    # the clean long string-5 open pluck from the voice memo (t = 19.8 s), level-matched like the others
    x = load(memo); a = int(19.6 * SR); seg = x[a: a + int(3.0 * SR)]; i = steepest(seg)
    y = seg[max(0, i - int(0.005 * SR)):]; p = pitch(seg, i); y = librosa.resample(y, orig_sr=SR, target_sr=SR / (2 ** ((41 - p) / 12)))
    n = int(0.3 * SR); y[-n:] *= np.linspace(1, 0, n); y *= 0.05 / np.sqrt(np.mean(y[:int(0.2 * SR)] ** 2))
    return y

def choose(n):
    s = n['string'] or 1
    if s == 6 and n['midi'] >= 41: s = 5                                        # his oud: low فا is string 5 open
    c = [(f's{s}_f{f}', OPEN[s] + o) for f, o in NAT.items()]
    if s == 2: c.append(('s2_f2_hf', 58.5))
    if s == 3: c.append(('s3_f1_hf', 51.5))
    return min(c, key=lambda q: abs(q[1] - n['midi']))[0], s

ns = json.load(open(notes_json))['notes']; t0 = ns[0]['t']
total = int((ns[-1]['t'] - t0 + 3.0) * SR); mix = np.zeros(total)
ring = {}            # string -> {a: start sample, buf, gain: the gain applied so far, midi, fingered, released}
def reshape(vc, a, fade_s, floor):
    # multiply what is left of a ringing note (from sample a) by a curve: 1 -> floor over fade_s, then floor
    off = a - vc['a']; L = len(vc['buf']) - off
    if L <= 0: return
    n = min(int(fade_s * SR), L); g = np.concatenate([np.linspace(1, floor, n), np.full(L - n, floor)])
    old = vc['gain'][off:].copy(); new = old * g
    end = min(total, a + L); mix[a:end] += (vc['buf'][off:] * (new - old))[: end - a]; vc['gain'][off:] = new
rr = {}; prev_t = -9; stroke = 'down'; low_fa = memo_low_fa() if memo else None
for n in ns:
    t = n['t'] - t0; a = int(t * SR); pos, s = choose(n)
    fast = t - prev_t < 0.18; stroke = ('up' if stroke == 'down' else 'down') if fast else 'down'; prev_t = t
    if pos == 's5_f0' and low_fa is not None: y = low_fa.copy()
    else:
        takes, _ = position(pos, n['midi']); pool = takes[stroke] or takes['down']
        k = rr.get((pos, stroke), 0); rr[(pos, stroke)] = k + 1; y = pool[k % len(pool)][0].copy()
    # F2 and the other strings (version 3, 2026-11-28: in أحب الليل 6-12 s the notes ringing on the other strings
    # covered the new ones: measured 46 and 40.9 instead of si / do, and fa masked by laHF). What happens to every note
    # still ringing when this one is picked:
    #  - same string, same note: the risha touches the string, it dips 9 dB in 15 ms and keeps fading under the pick;
    #  - same string, other note: the finger moved, it stops in 25 ms;
    #  - other string, fingered note: the finger lifts to play this one, it stops in 60 ms;
    #  - other string, open: it keeps ringing but fades out over 0.35 s (the risha hand damps it; 0.8 s left سي read sharp).
    same_string = ring.get(s)
    for vs, vc in list(ring.items()):
        if vs == s:
            same = abs(vc['midi'] - n['midi']) < 0.5
            reshape(vc, a, 0.015 if same else 0.025, 10 ** (-9 / 20) if same else 0.0)
        elif vc['fingered']: reshape(vc, a, 0.06, 0.0)
        elif not vc['released']:
            # an open string in a quick run (picked under 0.4 s before) is damped by the risha hand in 0.12 s
            reshape(vc, a, 0.12 if a - vc['a'] < 0.4 * SR else 0.35, 0.0); vc['released'] = True
    y = y[: total - a] * (10 ** (-1 / 20) if same_string and abs(same_string['midi'] - n['midi']) < 0.5 and fast else 1)
    mix[a:a + len(y)] += y
    ring[s] = {'a': a, 'buf': y, 'gain': np.ones(len(y)), 'midi': n['midi'], 'fingered': not pos.endswith('_f0'), 'released': False}
mix = mix / np.abs(mix).max() * 0.7
sf.write(out, mix, SR); print('wrote', out, '%.1f s' % (len(mix) / SR), '| positions:', ' '.join(sorted(bank)))
