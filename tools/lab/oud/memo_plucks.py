# Cut the oud plucks out of a voice memo where the player says what he will play, then plays it (owner, 2026-11-28:
# "cut what you need from my recording, cut my voice"). Speech has moving pitch; a pluck starts with a sharp onset and
# holds a steady pitch. Each clear pluck is kept from 5 ms before its onset until the next onset (or 3 s), with a short
# fade, and only if no speech-like onset falls inside it. Output: one WAV per pluck (named by time and note) + an index.
# usage: python memo_plucks.py <memo.wav or .m4a converted to wav> <outdir> <notes.json: {key: [midi, ar, string, finger]}>
import sys, os, json, numpy as np, soundfile as sf, librosa, warnings
warnings.filterwarnings('ignore')
src, outd, notes_json = sys.argv[1:4]; os.makedirs(outd, exist_ok=True)
x, sr = sf.read(src); x = x if x.ndim == 1 else x[:, 0]; T = json.load(open(notes_json))
h = 512
on = librosa.onset.onset_detect(y=x, sr=sr, hop_length=h, backtrack=True, delta=0.12, units='samples')
f0, v, _ = librosa.pyin(x, fmin=55, fmax=700, sr=sr, frame_length=4096, hop_length=h)
kind = []
for i, o in enumerate(on):
    e = on[i + 1] if i + 1 < len(on) else len(x); a, b = (o + int(0.08 * sr)) // h, min(e, o + int(0.5 * sr)) // h
    seg = librosa.hz_to_midi(f0[a:b]) if b > a else np.array([]); ok = v[a:b] if b > a else np.array([], bool)
    if b - a < 4 or ok.mean() < 0.6: kind.append(('other', None)); continue
    m = float(np.nanmedian(seg[ok])); st = float(np.nanstd(seg[ok]))
    kind.append(('voice', m) if st > 0.25 else ('pluck', m))
rows = []
for i, (o, (k, m)) in enumerate(zip(on, kind)):
    if k != 'pluck': continue
    nxt = on[i + 1] if i + 1 < len(on) else len(x)
    end = min(nxt, o + int(3.0 * sr))
    # stop before any voice that starts while the pluck rings
    if i + 1 < len(on) and kind[i + 1][0] == 'voice': end = min(end, on[i + 1] - int(0.02 * sr))
    if end - o < int(0.25 * sr): continue
    y = x[max(0, o - int(0.005 * sr)): end].copy(); f = min(len(y) // 4, int(0.08 * sr)); y[-f:] *= np.linspace(1, 0, f)
    key, d = min(((kk, abs(t[0] - m)) for kk, t in T.items()), key=lambda q: q[1])
    name = f'{o / sr:06.2f}s_{key if d <= 0.35 else "unk"}_{m:.2f}.wav'
    sf.write(os.path.join(outd, name), y, sr, subtype='PCM_16')
    rows.append({'file': name, 't': round(o / sr, 2), 'midi': round(m, 2), 'key': key if d <= 0.35 else None,
                 'ar': T[key][1] if d <= 0.35 else None, 'string': T[key][2] if d <= 0.35 else None, 'dur': round((end - o) / sr, 2)})
json.dump(rows, open(os.path.join(outd, 'index.json'), 'w'), ensure_ascii=False, indent=1)
print(len(rows), 'plucks kept (voice removed);', sum(1 for k in kind if k[0] == 'voice'), 'voice onsets skipped')
