# Tremolo strokes inside the written notes of a version, measured in its own recording (owner, 2026-11-28: "he did
# tremolo sol, which sounded different, and he's doing mostly tremolos"). Mirror rule: the strokes are the player's own
# times, never a made-up rate. A written note is a tremolo when its span holds 3 or more re-picks of the SAME pitch:
# envelope peaks (5 ms hop) at least 45 ms apart that rise 1.5 dB or more above the dip before them, with the pitch
# 30-60 ms after each peak within 0.4 half step of the note. Output: {note_time: [stroke times]} + a short report.
# usage: python tremolo_strokes.py <tuned.wav> <start_s> <notes.json [[t, midi, key, grace], ...]> <out.json> [pass_end]
import sys, json, numpy as np, soundfile as sf, librosa, warnings
warnings.filterwarnings('ignore')
wav, start, vjson, out = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
end_pass = float(sys.argv[5]) if len(sys.argv) > 5 else 1e9
x, sr = sf.read(wav); x = x if x.ndim == 1 else x[:, 0]; seg = x[int(start * sr):]
V = sorted(json.load(open(vjson)), key=lambda n: n[0])
hop = int(0.005 * sr); env = 20 * np.log10(np.sqrt(np.convolve(seg ** 2, np.ones(hop * 2) / (hop * 2), 'same'))[::hop] + 1e-9)
f0, vv, _ = librosa.pyin(seg, fmin=85, fmax=900, sr=sr, frame_length=1024, hop_length=64); tt = np.arange(len(f0)) * 64 / sr; mm = librosa.hz_to_midi(f0)
def pitch(t):
    s = (tt >= t + 0.03) & (tt <= t + 0.06) & vv; return float(np.nanmedian(mm[s])) if s.sum() >= 2 else None
res, rep = {}, []
for i, (t, m, k, g) in enumerate(V):
    nxt = V[i + 1][0] if i + 1 < len(V) else min(t + 1.5, end_pass)
    if nxt - t < 0.2 or t > end_pass: continue
    a, b = int((t + 0.04) / 0.005), int((nxt - 0.02) / 0.005)
    strokes, last, dip = [], t, 1e9
    for j in range(a, b):
        dip = min(dip, env[j])
        if 0 < j < len(env) - 1 and env[j] >= env[j - 1] and env[j] > env[j + 1] and env[j] - dip >= 1.5 and j * 0.005 - last >= 0.045:
            p = pitch(j * 0.005 - 0.01)
            if p is not None and abs(p - m) < 0.4: strokes.append(round(j * 0.005 - 0.01, 3)); last = j * 0.005; dip = 1e9
    if len(strokes) >= 3:
        gaps = np.diff([t] + strokes); res[f'{t:.3f}'] = strokes
        rep.append(f'{t:6.2f} {k:5s} {nxt - t:4.2f}s: {len(strokes)} re-picks, {1 / np.median(gaps):4.1f}/s')
json.dump(res, open(out, 'w'))
print(f'{len(res)} of {len(V)} written notes are tremolo ({sum(len(v) for v in res.values())} re-picks)')
print('\n'.join(rep))
