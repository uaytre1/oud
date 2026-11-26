"""The gate: does a version's data match its own recording?

Every note should sit on a real pick of the recording (same time, same pitch), and every clear pick of the
recording should have a note. Prints a score and the exact places that disagree, so nobody has to find them by ear.
A version built from ONE recording should pass; a patchwork (one player's notes on another's times) will not.

usage: node tools/plain/notes.mjs <song-id> | python3 tools/verify_version.py --version <id> --media <tuned.wav> --start <s>
       --start = where the pass begins in the recording (media.starts in the song file). Audio stays outside the repo.
STATUS 2026-11-26: DRAFT, not calibrated. It finds the real holes in حب إيه Player 4 (68%: لا at 5.13 s where the
recording plays صول; picks at 5.52 s صول and 5.91 s ري with no note), but it also fails حب من تحب Player 1 (66%), a
version that measured 96% on 2026-11-22 with Basic Pitch note starts + librosa onsets + a harmonic pitch match. Its
pick finder (librosa onset + level jump) misses fast soft picks and its pitch (pyin at the pick) is pulled by
ringing strings. Finish it: swap in the standard pipeline's detectors (docs/memory/transcription.md) and calibrate
until حب من تحب Player 1 and Player 2 pass at 95% or more; only then trust a FAIL on another song.
"""
import argparse, json, sys
import numpy as np, librosa

ap = argparse.ArgumentParser()
ap.add_argument('--version', required=True); ap.add_argument('--media', required=True)
ap.add_argument('--start', type=float, required=True); ap.add_argument('--tol', type=float, default=0.06)
a = ap.parse_args()
ver = json.load(sys.stdin)[a.version]; notes = ver['notes']                       # [t, midi, dur]
t0, t1 = notes[0][0], notes[-1][0] + 1.0
y, sr = librosa.load(a.media, sr=22050, offset=max(0, a.start + t0 - 1), duration=t1 - t0 + 2)
base = max(0, a.start + t0 - 1) - a.start                                          # recording time -> pass time
hop = 128
rms = librosa.feature.rms(y=y, frame_length=512, hop_length=hop)[0]; db = 20 * np.log10(rms + 1e-7)
tt = np.arange(len(db)) * hop / sr + base
def jump(t):                                                                        # loudest just after minus quietest just before
    pre = db[(tt >= t - 0.09) & (tt < t - 0.004)]; post = db[(tt >= t - 0.004) & (tt < t + 0.06)]
    return float(post.max() - pre.min()) if len(pre) and len(post) else 0.0
on = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop, backtrack=False, delta=0.07, wait=5, units='time') + base
picks = [(t, jump(t)) for t in on if jump(t) >= 4]                                  # real picks: the sound gets louder
f0, _, _ = librosa.pyin(y, fmin=60, fmax=750, sr=sr, frame_length=2048, hop_length=256)
ft = np.arange(len(f0)) * 256 / sr + base
def pitch(t):
    seg = f0[(ft >= t + 0.03) & (ft <= t + 0.16)]; seg = seg[~np.isnan(seg)]
    return float(69 + 12 * np.log2(np.median(seg) / 440)) if len(seg) >= 3 else None
pt = np.array([p[0] for p in picks])
# a constant shift between data and recording (start time a little off) is not an error: remove the median
d0 = [pt[np.argmin(abs(pt - n[0]))] - n[0] for n in notes if len(pt)]
shift = float(np.median([d for d in d0 if abs(d) < 0.15])) if any(abs(d) < 0.15 for d in d0) else 0.0
ok = late = nopick = wrongpitch = 0; used = set(); bad = []
QT = ['دو', 'دو#', 'ري', 'مي♭', 'مي', 'فا', 'فا#', 'صول', 'لا♭', 'لا', 'سي♭', 'سي']
nm = lambda m: QT[int(round(m)) % 12]
for t, m, _ in notes:
    k = int(np.argmin(abs(pt - (t + shift)))) if len(pt) else -1
    off = pt[k] - (t + shift) if k >= 0 else 9
    if abs(off) > 0.15: nopick += 1; bad.append(f'{t:6.2f}s {nm(m)}: no pick in the recording here'); continue
    used.add(k); p = pitch(pt[k])
    if p is not None and abs(((p - m + 6) % 12) - 6) > 0.8: wrongpitch += 1; bad.append(f'{t:6.2f}s {nm(m)}: the recording plays {nm(p)}'); continue
    if abs(off) > a.tol: late += 1; bad.append(f'{t:6.2f}s {nm(m)}: {"late" if off < 0 else "early"} by {abs(off)*1000:.0f} ms'); continue
    ok += 1
extra = [(t, j) for k, (t, j) in enumerate(picks) if k not in used and j >= 8 and t0 - 0.05 <= t - shift <= notes[-1][0] + 0.3]
for t, j in extra:
    p = pitch(t); bad.append(f'{t - shift:6.2f}s: the recording has a clear pick{" (" + nm(p) + ")" if p else ""} with no note')
n = len(notes); score = round(100 * ok / n)
print(f'{a.version}: {n} notes | on a pick, right pitch, within {a.tol*1000:.0f} ms: {ok} ({score}%) | off time {late} | wrong pitch {wrongpitch} | no pick {nopick} | clear picks without a note {len(extra)} | shift removed {shift*1000:.0f} ms')
print('PASS' if score >= 90 and len(extra) <= 0.1 * n else 'FAIL: fix these places, or rebuild the version from this recording')
for line in sorted(bad): print('  ' + line)
