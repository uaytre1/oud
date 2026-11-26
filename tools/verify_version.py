"""The gate: does a version's data match its own recording?

For every note it asks the recording one direct question: "does this pitch start sounding here?" (the energy at
the note's pitch, or its octave partial, rises within 0.1 s of the note's time). That works in fast runs and under
ringing strings, where "find a pick, then guess its pitch" fails (the first draft failed the known-good حب من تحب
at 66% that way). It also lists clear picks of the recording that have no note.
A version built from ONE recording should pass; a patchwork (one player's notes on another's times) will not.

usage: node tools/plain/notes.mjs <song-id> | python3 tools/verify_version.py --version <id> --media <tuned.wav> --start <s>
       --start = where the pass begins in the recording (media.starts in the song file). Audio stays outside the repo.
Results and how to read them: docs/memory/transcription.md ("The gate").
"""
import argparse, json, sys
import numpy as np, librosa

ap = argparse.ArgumentParser()
ap.add_argument('--version', required=True); ap.add_argument('--media', required=True)
ap.add_argument('--start', type=float, required=True); ap.add_argument('--tol', type=float, default=0.06)
ap.add_argument('--rise', type=float, default=5.0, help='dB the pitch must rise to count as starting')
ap.add_argument('--report', help='write a JSON list: every note with its verdict, and every stray pick')
ap.add_argument('--strict', action='store_true', help='the bar for a NEW version: 95%%, notes not in the recording at most 4%% (the gate itself errs about that often on a known-good version), at most 2 stray picks')
a = ap.parse_args()
notes = json.load(sys.stdin)[a.version]['notes']                                   # [t, midi, dur]
t0, t1 = notes[0][0], notes[-1][0] + 1.0
off0 = max(0, a.start + t0 - 1)
y, sr = librosa.load(a.media, sr=22050, offset=off0, duration=t1 - t0 + 2)
base = off0 - a.start                                                              # recording time -> pass time
hop = 128
# quarter-tone spectrum from دو2 (midi 36) up: one row per quarter tone
C = np.abs(librosa.cqt(y, sr=sr, hop_length=hop, fmin=librosa.midi_to_hz(36), n_bins=108, bins_per_octave=24, filter_scale=0.5))   # shorter filters: sharper in time
Cdb = 20 * np.log10(C + 1e-6); ct = np.arange(C.shape[1]) * hop / sr + base
def level(m, lo, hi):
    b = int(round((m - 36) * 2)); rows = [k for k in (b - 1, b, b + 1) if 0 <= k < 108]
    cols = (ct >= lo) & (ct < hi)
    return float(Cdb[rows][:, cols].max(axis=0).mean()) if rows and cols.any() else -120.0
def rise1(m, t): return level(m, t + 0.02, t + 0.10) - level(m, t - 0.08, t - 0.01)
def rise(m, t): return max(rise1(m, t), rise1(m + 12, t) if m + 12 <= 89 else -99)   # fundamental or octave partial
def find(m, t, win):                                                               # where near t does pitch m start?
    ts = t + np.arange(-win, win + 0.001, 0.01); r = [rise(m, x) for x in ts]; k = int(np.argmax(r))
    return float(ts[k]), float(r[k])
def loudest(t):                                                                    # which pitch starts at t?
    ms = np.arange(45, 76.5, 0.5); return float(ms[int(np.argmax([rise1(m, t) for m in ms]))])
NAMES = ['دو', 'دو#', 'ري', 'مي♭', 'مي', 'فا', 'فا#', 'صول', 'لا♭', 'لا', 'سي♭', 'سي']
def nm(m):
    f = m - np.floor(m)
    return NAMES[int(np.ceil(m)) % 12] + '½♭' if 0.2 < f < 0.8 else NAMES[int(round(m)) % 12]
# a constant shift between data and recording (start time a little off) is not an error: remove the median
# WHEN a note starts is read from the picks (any onset of the recording); the pitch test above is blurry in time
# (its filters are 0.1 s long on low notes) and only says WHETHER the note starts around there.
ons = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop, backtrack=False, delta=0.04, wait=3, units='time') + base
near = lambda t: float(ons[np.argmin(np.abs(ons - t))] - t) if len(ons) else 9.0
good = [near(t) for t, m, _ in notes if abs(near(t)) < 0.1]
shift = float(np.median(good)) if good else 0.0
ok = offtime = missing = 0; bad = []; rows = []
for i, (t, m, _) in enumerate(notes):
    same = (i > 0 and abs(notes[i - 1][1] - m) < 0.3 and t - notes[i - 1][0] < 0.6)  # a repeat re-excites a ringing note
    ft, r = find(m, t + shift, 0.10)
    if r < (a.rise / 2 if same else a.rise):
        missing += 1; rows.append({'t': t, 'midi': m, 'verdict': 'not in the recording: delete'}); bad.append(f'{t:6.2f}s {nm(m)}: this note does not start here in the recording (it plays {nm(loudest(t + shift))})'); continue
    d = near(t + shift)
    if abs(d) > 0.12: d = 0.0                      # the pitch starts but no sharp pick: a soft note, not a timing error
    if abs(d) > a.tol: offtime += 1; rows.append({'t': t, 'midi': m, 'verdict': 'off time', 'move_by': round(d, 3)}); bad.append(f'{t:6.2f}s {nm(m)}: {"late" if d < 0 else "early"} by {abs(d) * 1000:.0f} ms'); continue
    ok += 1; rows.append({'t': t, 'midi': m, 'verdict': 'ok'})
# clear picks of the recording (the sound jumps 8 dB or more) with no note near them
rms = librosa.feature.rms(y=y, frame_length=512, hop_length=hop)[0]; db = 20 * np.log10(rms + 1e-7)
tt = np.arange(len(db)) * hop / sr + base
def jump(t):
    pre = db[(tt >= t - 0.09) & (tt < t - 0.004)]; post = db[(tt >= t - 0.004) & (tt < t + 0.06)]
    return float(post.max() - pre.min()) if len(pre) and len(post) else 0.0
on = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop, backtrack=False, delta=0.07, wait=5, units='time') + base
nt = np.array([n[0] + shift for n in notes])
extra = [t for t in on if jump(t) >= 8 and t0 + shift - 0.05 <= t <= notes[-1][0] + shift + 0.3 and np.min(np.abs(nt - t)) > 0.10]
for t in extra: bad.append(f'{t - shift:6.2f}s: the recording has a clear pick ({nm(loudest(t))}) with no note')
n = len(notes); score = round(100 * ok / n)
print(f'{a.version}: {n} notes | start in the recording at the right time: {ok} ({score}%) | off time {offtime} | not there {missing} | clear picks without a note {len(extra)} | shift removed {shift * 1000:.0f} ms')
if a.report:
    json.dump({'version': a.version, 'score': score, 'notes': rows, 'stray_picks': [{'t': round(float(t - shift), 3), 'midi_guess': loudest(t)} for t in extra]}, open(a.report, 'w'), ensure_ascii=False, indent=1)
passed = (score >= 95 and missing <= max(1, 0.04 * n) and len(extra) <= 2) if a.strict else (score >= 90 and len(extra) <= 0.05 * n)
print('PASS' if passed else 'FAIL: fix these places, or rebuild the version from this recording')
for line in sorted(bad): print('  ' + line)
