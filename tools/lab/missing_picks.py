# Real picks in a recording that a version has no note for, measured one by one (Claude + Codex, 2026-11-28, after
# the owner: "the real player is playing soft notes or notes you aren't hearing ... it's fast"). Read-only: it writes
# a candidate list and a candidate notes file; the song file changes only after the gate and the owner's ear.
# usage: python missing_picks.py <tuned.wav> <start_s> <version_notes.json [[t, midi, key, grace], ...]> <keys.json
#        {key: [midi, ar, string, finger]}> <out_prefix>
# Steps (song-standard.md steps 2-3, fable-method.md section 4; agreed with Codex):
#  1 attack: picks = fine onsets (hop 32, delta 0.04, merged within 30 ms). A candidate needs a level rise of 5 dB in
#    40 ms, or 3.5 dB (a real soft note) with a pick click (band above 2.5 kHz jumps 8 dB).
#  2 pitch: pyin with a 32 ms window, only frames whose whole window lies between this pick (+10 ms) and the next pick;
#    60 ms or more of steady pitch (spread under 0.3 half step) = measured; 40-60 ms = provisional (listed, not added);
#    less = unresolved. Mapped to the nearest key the version already uses, within 0.3 half step.
#  3 duplicate: the same key within 70 ms of a written note = the same pick.
#  4 role: same key as the note just before, under 0.25 s = tremolo re-pick, flag 'r'. Low صول and anything under
#    midi 48 = bass / accompaniment, flag 'g' (heard in Listen and the render, never asked in Slowly), only with a
#    fresh low attack (the band 70-130 Hz jumps 5 dB). A pick under 0.12 s before the next note = ornament, 'g'.
#    Otherwise a melody note (no flag).
import sys, json, numpy as np, soundfile as sf, librosa, warnings
warnings.filterwarnings('ignore')
wav, start, vjson, kjson, outp = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
PASS_END = float(sys.argv[6]) if len(sys.argv) > 6 else 1e9   # song time where the pass ends (later picks are ignored)
x, sr = sf.read(wav); x = x if x.ndim == 1 else x[:, 0]; seg = x[int(start * sr):]
V = json.load(open(vjson)); K = json.load(open(kjson)); used = sorted({n[2] for n in V} | ({'solL'} & set(K)))   # + low صول for bass picks
raw = librosa.onset.onset_detect(y=seg, sr=sr, hop_length=32, delta=0.04, wait=2, units='time')
picks = []
for o in raw:
    if not picks or o - picks[-1][-1] > 0.03: picks.append([o])
    else: picks[-1].append(o)
picks = [p[0] for p in picks]
env = 20 * np.log10(np.sqrt(np.convolve(seg ** 2, np.ones(256) / 256, 'same')) + 1e-9)
Z = np.abs(librosa.stft(seg, n_fft=1024, hop_length=128)) ** 2; fb = librosa.fft_frequencies(sr=sr, n_fft=1024)
hf = 10 * np.log10(Z[fb > 2500].sum(0) + 1e-12); lo = 10 * np.log10(Z[(fb > 70) & (fb < 130)].sum(0) + 1e-12)
def jump(band, t):
    i = int(t * sr / 128); return float(band[i: i + 4].max() - band[max(0, i - 4): max(1, i)].min())
def rise(t):
    i = int(t * sr); return float(env[i: i + int(0.04 * sr)].max() - env[max(0, i - int(0.03 * sr)): max(1, i)].min())
H = 64; f0, vv, _ = librosa.pyin(seg, fmin=85, fmax=900, sr=sr, frame_length=1024, hop_length=H); tt = np.arange(len(f0)) * H / sr
mm = librosa.hz_to_midi(f0); half = 512 / sr
rows, add = [], []
for i, o in enumerate(picks):
    if o > PASS_END: continue
    near = min(V, key=lambda n: abs(n[0] - o))
    if abs(near[0] - o) <= 0.07: continue                        # a written note within 70 ms: the same pick (Oud Claude's review)
    r, click, low = rise(o), jump(hf, o), jump(lo, o)
    if not (r >= 5 or (r >= 3.5 and click >= 8)): continue        # step 1
    nxt = next((p for p in picks[i + 1:] if p > o + 0.03), o + 1.0)
    nxt_note = min([n[0] for n in V if n[0] > o], default=o + 9)
    end = min(nxt, nxt_note)
    sel = (tt - half >= o + 0.01) & (tt + half <= end) & vv
    ms = mm[sel]; dur = float(sel.sum() * H / sr) if sel.any() else 0.0
    rec = {'t': round(o, 3), 'rise_db': round(r, 1), 'click_db': round(click, 1), 'low_db': round(low, 1), 'window_s': round(end - o, 3)}
    if dur < 0.04 or len(ms) < 2 or np.percentile(ms, 75) - np.percentile(ms, 25) >= 0.3:
        rec.update(verdict='unresolved', why=f'pitch measurable for {dur * 1000:.0f} ms only' if dur < 0.04 else 'pitch moves (a slide?)'); rows.append(rec); continue
    m = float(np.median(ms)); key = min(used, key=lambda k: abs(K[k][0] - m))
    if abs(K[key][0] - m) > 0.25:
        rec.update(verdict='unresolved', why=f'pitch {m:.2f} is no key of this version', midi=round(m, 2)); rows.append(rec); continue
    rec.update(midi=round(m, 2), key=key, ar=K[key][1], steady_ms=round(dur * 1000))
    if any(n[2] == key and abs(n[0] - o) <= 0.07 for n in V):
        rec.update(verdict='duplicate', why='same key within 70 ms'); rows.append(rec); continue
    prev = max([n for n in V if n[0] < o], key=lambda n: n[0], default=None)
    if m < 48:
        flag = 'g' if low >= 5 else None
        rec.update(verdict='bass g' if flag else 'reject', why='fresh low attack' if flag else 'low string still ringing (no fresh low attack)')
    elif prev and prev[2] == key and o - prev[0] < 0.25: flag = 'r'; rec.update(verdict='tremolo r')
    elif nxt_note - o < 0.12: flag = 'g'; rec.update(verdict='ornament g')
    else: flag = ''; rec.update(verdict='melody')
    if dur < 0.06: rec['verdict'] = 'provisional ' + rec['verdict']; rec['why'] = f'steady only {dur * 1000:.0f} ms'
    rows.append(rec)
    if not rec['verdict'].startswith(('provisional', 'reject')): add.append([round(o, 3), key, flag])
json.dump(rows, open(outp + '_candidates.json', 'w'), ensure_ascii=False, indent=1)
json.dump(add, open(outp + '_add.json', 'w'), ensure_ascii=False)
from collections import Counter
print(f'{len(picks)} picks; candidates without a note (5 dB, or 3.5 dB + click): {len(rows)}')
print('verdicts:', dict(Counter(r['verdict'] for r in rows)))
for r in rows: print(f"  {r['t']:6.3f} rise {r['rise_db']:4.1f} click {r['click_db']:4.1f} low {r['low_db']:4.1f}  {r['verdict']:18s} {r.get('ar', '')} {r.get('midi', '')} {r.get('why', '')}")
