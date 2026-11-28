# F1 of the method (oud-sound.md): measure the owner's own re-picks on one string (fast 8 picks, tremolo)
import sys, os, numpy as np, soundfile as sf, librosa, warnings
warnings.filterwarnings('ignore')
d = sys.argv[1]
for name in ['run1_s3_open_fast8_alt_1.wav', 'run1_s3_open_tremolo_trem_1.wav']:
    x, sr = sf.read(os.path.join(d, name)); x = x if x.ndim == 1 else x[:, 0]
    h = 32; env = np.sqrt(np.convolve(x ** 2, np.ones(64) / 64, 'same'))[::h]; db = 20 * np.log10(env + 1e-9); fs = sr / h
    on = librosa.onset.onset_detect(y=x, sr=sr, hop_length=h, delta=0.04, wait=int(0.05 * fs), backtrack=False, units='frames')
    rows = []
    for i, o in enumerate(on):
        a = max(0, o - int(0.03 * fs)); pre = db[a:o].min() if o > a else db[o]
        pk_i = o + int(np.argmax(db[o:o + int(0.04 * fs)])); pk = db[pk_i]
        rise_ms = (pk_i - o) / fs * 1000
        seg = x[o * h: o * h + int(0.06 * sr)]
        cen = float(np.mean(librosa.feature.spectral_centroid(y=seg, sr=sr, n_fft=512, hop_length=128))) if len(seg) > 512 else np.nan
        rows.append((o / fs, pre, pk, rise_ms, cen))
    rows = np.array(rows); gaps = np.diff(rows[:, 0])
    first = rows[0, 2]
    print('%s: %d picks over %.1f s | gap median %.3f s (%.1f/s), spread %.0f%%' % (name, len(rows), rows[-1, 0] - rows[0, 0], np.median(gaps), 1 / np.median(gaps), 100 * np.std(gaps) / np.mean(gaps)))
    print('   dip before a re-pick (pick peak minus the level just before it): median %.1f dB, range %.1f..%.1f' % (np.median(rows[1:, 2] - rows[1:, 1]), np.min(rows[1:, 2] - rows[1:, 1]), np.max(rows[1:, 2] - rows[1:, 1])))
    print('   re-pick level vs first pick: median %+.1f dB (range %+.1f..%+.1f) | rise to peak median %.1f ms' % (np.median(rows[1:, 2] - first), np.min(rows[1:, 2] - first), np.max(rows[1:, 2] - first), np.median(rows[:, 3])))
    odd, even = rows[0::2, 4], rows[1::2, 4]
    print('   brightness, alternate picks: %.0f Hz vs %.0f Hz (%+.0f%%)' % (np.nanmedian(odd), np.nanmedian(even), 100 * (np.nanmedian(even) / np.nanmedian(odd) - 1)))
    print('   level of every pick (dB):', ' '.join('%.0f' % v for v in rows[:16, 2]))
