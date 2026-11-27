# Measure the gate's "possible missing soft notes" by song-standard step 3 (no guessing).
import json, sys, warnings; warnings.filterwarnings('ignore')
import numpy as np, librosa
wav, cand, rep = sys.argv[1:4]
d = json.load(open(cand)); st = d['start']; notes = d['notes']
soft = json.load(open(rep))['possible_missing_soft_notes']
KEYS = {'faL':41,'solL':43,'laL':45,'siL':46,'doL':48,'re':50,'mi':51.3,'fa':53,'sol':55,'laHF':56.5,'si':58,'do':60,'reH':62}
SR, HOP = 22050, 128
y, _ = librosa.load(wav, sr=SR)
f0, vf, _ = librosa.pyin(y, fmin=librosa.midi_to_hz(38), fmax=librosa.midi_to_hz(80), sr=SR, frame_length=2048, hop_length=HOP)
mid = librosa.hz_to_midi(f0); ft = np.arange(len(mid)) * HOP / SR
rms = librosa.feature.rms(y=y, frame_length=512, hop_length=HOP)[0]; db = 20*np.log10(rms+1e-7)
hf = librosa.feature.rms(y=librosa.effects.preemphasis(y, coef=0.97), frame_length=512, hop_length=HOP)[0]
C = np.abs(librosa.cqt(y, sr=SR, hop_length=HOP, fmin=librosa.midi_to_hz(36), n_bins=60, bins_per_octave=12))
Cdb = librosa.amplitude_to_db(C, ref=np.max)
fr = lambda t: int(round(t*SR/HOP))
def jump(t): i=fr(t); return float(db[i:i+11].max()-db[max(0,i-16):i].min())
def click(t): i=fr(t); return float(20*np.log10(hf[i:i+6].max()/(hf[max(0,i-14):max(1,i-2)].mean()+1e-9)))
def new_energy(t, m):  # rise of the CQT bin at midi m: after the pick vs just before
    b = int(round(m)) - 36
    if not 0 <= b < 60: return None
    i = fr(t); return round(float(Cdb[b, i+2:i+10].max() - Cdb[b, max(0,i-8):i-1].mean()), 1)
abs_notes = [n[0]+st for n in notes]
for s in soft:
    t = s['t'] + st
    nxt = min([x for x in abs_notes if x > t+0.01] or [t+0.5])
    prv = max([x for x in abs_notes if x < t-0.001] or [t-9])
    a, b = t+0.03, min(t+0.12, nxt-0.01)
    if b-a < 0.02: a, b = t+0.012, nxt-0.005
    w = (ft>a)&(ft<b)&~np.isnan(mid)
    steady = w.sum()*HOP/SR
    p = float(np.median(mid[w])) if w.any() else None
    key = min(KEYS, key=lambda q: abs(KEYS[q]-p)) if p else None
    near = [(round(n[0],3), n[1]) for n in notes if abs(n[0]-s['t']) < 0.3]
    print(f"t={s['t']:.3f} (file {t:.2f}s) gate guess {s['midi_guess']}: pyin {None if p is None else round(p,2)} -> {key} "
          f"({None if p is None else round((p-KEYS[key])*100)} c), voiced {steady*1000:.0f} ms, jump {jump(t):.1f} dB, click {click(t):.1f}, "
          f"gap from previous note {t-prv:.2f}s, to next {nxt-t:.2f}s")
    if key:
        m = KEYS[key]; print(f"     new energy at {key}: {new_energy(t,m)} dB, octave up: {new_energy(t,m+12)}, octave down: {new_energy(t,m-12)};  version notes near: {near}")
