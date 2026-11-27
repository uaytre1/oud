"""Risha pick detector for fast plucking (2.9 ms resolution).
A pick = the 2.2-7 kHz band jumps out of a short dip (the risha damps the string 12-28 ms before it strikes), or
the broadband level dips and rises. Measured against the dip just before the pick, not a fixed 80 ms window,
so a pick 90-140 ms after the previous one is not compared with that one's peak.
usage (library): from picks import Picks; P = Picks(y, sr); P.onsets() -> [(t, hf_rise_db, bb_rise_db)]
usage (cli): picks.py tuned.wav t0 t1  -> prints the picks"""
import sys, numpy as np, scipy.signal as sg

class Picks:
    HOP = 64
    def __init__(self, y, sr):
        self.sr = sr; h = self.HOP
        b, a = sg.butter(4, [2200 / (sr / 2), min(7000 / (sr / 2), 0.99)], 'band'); yh = sg.lfilter(b, a, y)
        win = np.ones(h) / h                                            # 2.9 ms frames at 22050 Hz
        self.hf = 10 * np.log10(np.convolve(yh ** 2, win, 'same')[::h] + 1e-10)
        self.bb = 10 * np.log10(np.convolve(y ** 2, np.ones(4 * h) / (4 * h), 'same')[::h] + 1e-10)
        self.t = np.arange(len(self.hf)) * h / sr
    def _i(self, t): return int(np.clip(round(t * self.sr / self.HOP), 0, len(self.t) - 1))
    def rise(self, arr, t, prev=None, nxt=None):
        """dB from the short dip before t to the peak just after it (adaptive windows for fast picks)."""
        lo = t - 0.035 if prev is None else max(prev + 0.025, t - 0.035)
        hi = t + 0.055 if nxt is None else max(t + 0.012, min(nxt - 0.003, t + 0.055))
        pre = arr[self._i(lo):self._i(t + 0.003) + 1]; post = arr[self._i(t + 0.005):self._i(hi) + 1]
        return float(post.max() - pre.min()) if len(pre) and len(post) else 0.0
    def peak(self, t, w=0.025):
        """time of the steepest high-band rise within +-w of t (snaps a pick to its transient)."""
        i0, i1 = self._i(t - w), self._i(t + w); d = np.diff(self.hf[i0:i1 + 2])
        return float(self.t[i0 + int(np.argmax(d)) + 1]) if len(d) else t
    def onsets(self, t0=0, t1=1e9, hf_db=4.5, bb_db=2.8, min_ioi=0.055):
        d = np.diff(self.hf, prepend=self.hf[0]); sm = np.convolve(d, np.ones(3), 'same')
        cand = sg.find_peaks(sm, height=1.5, distance=int(min_ioi * self.sr / self.HOP))[0]
        out = []
        for i in cand:
            t = float(self.t[i])
            if not (t0 <= t < t1): continue
            prev = out[-1][0] if out else None
            hr = self.rise(self.hf, t, prev); br = self.rise(self.bb, t, prev)
            if hr >= hf_db or br >= bb_db: out.append((t, round(hr, 1), round(br, 1)))
        return out

if __name__ == '__main__':
    import librosa
    y, sr = librosa.load(sys.argv[1], sr=22050)
    for t, h, b in Picks(y, sr).onsets(float(sys.argv[2]), float(sys.argv[3])): print(f'{t:.3f} hf {h:+.1f} bb {b:+.1f}')
