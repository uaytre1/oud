# usage: node tools/plain/notes.mjs <song-id> | python3 tools/plain/render.py <song-id> <outdir> [version ...]
# Plain plucked-string render for checking note data. Re-picking the same note stops the old vibration first
# (as on a real string), so repeated notes don't cancel each other out.
import json, sys, wave, numpy as np
song, outdir = sys.argv[1], sys.argv[2]
only = set(sys.argv[3:])
data = json.load(sys.stdin); sr = 48000
def pluck(midi, dur):
    f = 440 * 2 ** ((midi - 69) / 12); n = int(sr * max(0.25, min(dur, 1.5))); t = np.arange(n) / sr
    y = sum((0.9 / k) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (4 + 1.5 * k)) for k in range(1, 9))
    return y * np.minimum(1, t / 0.003)
for vid, d in data.items():
    if only and vid not in only: continue
    notes = d['notes']; base = notes[0][0]; end = notes[-1][0] - base + 3
    N = int(sr * (end + 1.1)); tracks = {}
    for t, m, dur in notes:
        tr = tracks.setdefault(round(m * 2), np.zeros(N))
        i = int((1.0 + t - base) * sr); fade = min(240, N - i)
        tr[i:i + fade] *= np.linspace(1, 0, fade); tr[i + fade:] = 0          # the string is picked again
        y = pluck(m, dur); tr[i:i + len(y)] += y[: N - i]
    out = sum(tracks.values()); out = out / np.abs(out).max() * 0.6
    fn = f'{outdir}/{song}__{vid}__{d["pass"]}.wav'
    with wave.open(fn, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype('<i2').tobytes())
    print('rendered', vid)
