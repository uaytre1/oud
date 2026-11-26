# usage: offset.py wav "pc1,pc2,..." [t0 t1]  -> tuning offset (semitones) that best fits voiced pyin frames to the maqam
import sys, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=16000, offset=float(sys.argv[3]) if len(sys.argv) > 3 else 0, duration=(float(sys.argv[4]) - float(sys.argv[3])) if len(sys.argv) > 4 else None)
f0, v, p = librosa.pyin(y, fmin=80, fmax=900, sr=sr, frame_length=2048)
m = librosa.hz_to_midi(f0[v & (p > 0.5)]); pcs = np.array([float(x) for x in sys.argv[2].split(',')])
def cost(o):
    d = np.abs(((m - o)[:, None] - pcs[None, :] + 6) % 12 - 6).min(axis=1); return float(np.mean(np.minimum(d, 0.5) ** 2))
grid = np.arange(-6, 6, 0.01); c = [cost(o) for o in grid]; k = int(np.argmin(c))
srt = np.argsort(c); ru = next(grid[j] for j in srt if abs(grid[j] - grid[k]) > 0.7)
print(f'offset {grid[k]:+.2f}  cost {c[k]:.4f}  runner-up {ru:+.2f} cost {cost(ru):.4f}  frames {len(m)}')
