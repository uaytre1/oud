"""Audio features for following a known oud melody through a recording.

- salience: constant-Q spectrum at 25-cent resolution, log-compressed, with harmonics summed onto their
  fundamental (so a plucked note shows mostly at its own pitch class, not at its fifth).
- f0: librosa pyin, for exact pitch (quarter tones) after a pick.
- picks: candidate note starts from spectral flux plus the treble "click" of the plectrum (a real pick
  jumps 14-50 dB above 1.8 kHz on a phone; a ringing course swells only 2-9 dB).
"""
import subprocess
import numpy as np
import librosa
import scipy.ndimage as ndi

SR = 22050
HOP = 256              # 11.6 ms frames for the spectrum and pyin
FHOP = 64              # 2.9 ms frames for the treble envelope (pick times)
MIDI0 = 36             # lowest CQT bin: C2
BPO = 48               # 4 bins per half step = 25 cents
NOCT = 6
CLICK_HZ = 1800.0


def load_audio(path, sr=SR):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def frame_time(k, hop=HOP):
    return k * hop / SR


def salience(y):
    """Log CQT (bins x frames) and its harmonic-summed salience, both 25-cent bins from C2."""
    C = np.abs(librosa.cqt(y, sr=SR, hop_length=HOP, fmin=librosa.midi_to_hz(MIDI0), n_bins=BPO * NOCT,
                           bins_per_octave=BPO, tuning=0.0))
    ref = np.percentile(C, 99.5) + 1e-9
    L = np.log1p(100.0 * C / ref)
    S = np.zeros_like(L)
    for h, w in ((1, 1.0), (2, 0.6), (3, 0.45), (4, 0.3), (5, 0.2)):
        k = int(round(BPO * np.log2(h)))
        S[:L.shape[0] - k] += w * L[k:]
    return L, S


def fold(S):
    """Fold octaves: (bins, frames) -> (48 pitch-class bins, frames). Bin b is pitch class MIDI0 + b/4."""
    return S.reshape(NOCT, BPO, -1).sum(axis=0)


def treble_env(y):
    """Level above 1.8 kHz in dB, 2.9 ms frames, lightly smoothed."""
    D = np.abs(librosa.stft(y, n_fft=256, hop_length=FHOP, center=True)) ** 2
    f = librosa.fft_frequencies(sr=SR, n_fft=256)
    e = D[f >= CLICK_HZ].sum(axis=0)
    e = ndi.uniform_filter1d(e, 3)
    return 10 * np.log10(e + 1e-10)


def click_db(env, t):
    """Treble rise at time t: max level in the 44 ms after against the minimum 12-90 ms before (dB)."""
    k = int(round(t * SR / FHOP))
    a = env[k:k + int(0.044 * SR / FHOP) + 1]
    b = env[max(0, k - int(0.090 * SR / FHOP)):max(1, k - int(0.012 * SR / FHOP))]
    if len(a) == 0 or len(b) == 0:
        return 0.0
    return float(a.max() - b.min())


def pyin(y):
    # fill_na=None keeps pyin's best guess in "unvoiced" frames: a ringing double course often reads
    # unvoiced, yet its best guess is still the right pitch (measured on the Hob Eih players).
    f0, vf, vp = librosa.pyin(y, fmin=62.0, fmax=1100.0, sr=SR, frame_length=2048, hop_length=HOP, fill_na=None)
    midi = librosa.hz_to_midi(f0)
    return midi, vp


def picks(y, env, S):
    """Candidate pick times (high recall; the aligner decides which are notes)."""
    hop2 = 128
    flux = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop2, lag=1, max_size=3)
    flux = flux / (np.percentile(flux, 99) + 1e-9)
    # treble rise per hop2 frame
    r = SR / FHOP / (SR / hop2)
    tr = np.interp(np.arange(len(flux)) * r, np.arange(len(env)), env)
    trd = np.maximum(0.0, tr - ndi.minimum_filter1d(tr, 6, origin=2))
    trd = trd / (np.percentile(trd, 99) + 1e-9)
    odf = 0.6 * flux + 0.4 * trd
    pk = librosa.util.peak_pick(odf, pre_max=3, post_max=3, pre_avg=12, post_avg=6, delta=0.04, wait=5)
    out = []
    w = int(0.030 * SR / FHOP)
    sm = ndi.uniform_filter1d(env, 5)
    der = np.diff(sm, prepend=sm[0])
    for p in pk:
        t = p * hop2 / SR
        # refine: the steepest treble rise within -30..+15 ms (attack start of the pick)
        k = int(round(t * SR / FHOP))
        lo, hi = max(1, k - w), min(len(der), k + int(0.015 * SR / FHOP) + 1)
        if hi > lo:
            k2 = lo + int(np.argmax(der[lo:hi]))
            t = (k2 - 1.5) * FHOP / SR       # the uniform filter and diff delay the steepest point ~1.5 frames
        out.append((max(0.0, t), float(odf[p])))
    out.sort()
    # merge picks closer than 35 ms (keep the stronger)
    merged = []
    for t, s in out:
        if merged and t - merged[-1][0] < 0.035:
            if s > merged[-1][1]:
                merged[-1] = (t, s)
        else:
            merged.append((t, s))
    return merged


def pick_evidence(t, t_next, S48, f0):
    """Pitch evidence just after a pick: the salience folded to 48 pitch-class bins (max 1) and the median
    pyin pitch (MIDI). The plain salience after the pick separated right from wrong notes better than the
    newly added salience (ROC AUC 0.966 vs 0.854 on 216 true picks of the Hob Eih players)."""
    n = S48.shape[1]
    k = int(round(t * SR / HOP))
    end = min(t + 0.13, t_next - 0.01) if t_next is not None else t + 0.13
    a0, a1 = min(k + 1, n - 1), min(n, max(k + 2, int(round(end * SR / HOP))))
    post = S48[:, a0:a1].mean(axis=1) if a1 > a0 else S48[:, min(k, n - 1)]
    post = post / (post.max() + 1e-9)
    f1 = int(round((t + 0.03) * SR / HOP))
    f2 = max(f1 + 1, int(round(min(t + 0.16, (t_next or 1e9) - 0.005) * SR / HOP)))
    seg = f0[f1:f2]
    seg = seg[~np.isnan(seg)]
    m = float(np.median(seg)) if len(seg) else float('nan')
    return post, m


def analyze(y):
    """All features of one recording."""
    L, S = salience(y)
    S48 = fold(S)
    env = treble_env(y)
    f0, vp = pyin(y)
    pk = picks(y, env, S)
    ev = []
    for j, (t, s) in enumerate(pk):
        tn = pk[j + 1][0] if j + 1 < len(pk) else None
        vec, m = pick_evidence(t, tn, S48, f0)
        ev.append({'t': t, 'odf': s, 'click': click_db(env, t), 'chroma': vec, 'f0': m})
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=HOP)[0]
    return {'S': S, 'S48': S48, 'env': env, 'f0': f0, 'vp': vp, 'picks': ev, 'rms': rms, 'dur': len(y) / SR}


# ---- a plain plucked-string synth, only for the coarse alignment reference ------------------------
def synth(notes, offset=0.0, tail=1.5):
    """Render score notes [{t, midi}] at pitch midi+offset with decaying harmonics and a pick click."""
    if not notes:
        return np.zeros(int(SR))
    t0 = notes[0]['t']
    total = notes[-1]['t'] - t0 + tail + 0.5
    y = np.zeros(int(total * SR) + 1)
    rng = np.random.default_rng(0)
    for k, n in enumerate(notes):
        nxt = notes[k + 1]['t'] if k + 1 < len(notes) else n['t'] + 1.2
        dur = max(0.08, nxt - n['t'])
        ring = min(dur + 0.25, 2.0)
        L = int(ring * SR)
        tt = np.arange(L) / SR
        f = 440.0 * 2 ** ((n['midi'] + offset - 69) / 12)
        sig = np.zeros(L)
        for h in range(1, 11):
            if h * f > SR / 2 - 500:
                break
            sig += (1.0 / h ** 1.1) * np.exp(-tt * (1.2 + 0.6 * h)) * np.sin(2 * np.pi * h * f * tt)
        rel = tt > dur
        sig[rel] *= np.exp(-(tt[rel] - dur) / 0.08)
        c = int(0.004 * SR)
        sig[:c] += 0.3 * rng.standard_normal(c) * np.linspace(1, 0, c)
        a = int((n['t'] - t0 + 0.25) * SR)
        y[a:a + L] += sig[:len(y) - a]
    return (y / (np.abs(y).max() + 1e-9) * 0.5).astype(np.float32)
