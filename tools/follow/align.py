"""Follow a known note sequence through a recording.

1. Tuning offset: the coarse alignment tried at every 25-cent shift, refined on the pyin histogram.
2. Coarse alignment: local DTW between the recording and a plain synth rendering of the score
   (folded harmonic salience + chroma onsets, 46 ms frames), at a few tempo scales; finds where the song
   is, possibly several times, or only part of it.
3. Fine alignment: score notes against detected picks with a DP that allows notes not played (deletions)
   and extra picks (insertions); match cost = pitch evidence (octave-equivalent, quarter tones) + click +
   distance from the coarse path + local rhythm. Forward-backward gives each note's confidence.
4. Each matched note sits on a real pick; a much stronger click within +-80 ms takes over.
"""
import math
import numpy as np
import numba
import librosa

import features as F
from score import pc_dist, name_of

FR = 4                         # coarse frame = 4 analysis frames = 46 ms
CF = FR * F.HOP / F.SR
REF_PAD = 0.25                 # the reference synth starts this long before the first note

P = dict(                      # costs are in nats (negative log-likelihood ratios); see README "Calibration"
    pk=14.0, pm0=0.60, pcap=(-6.0, 5.5),   # pitch: LLR = clip(pk * (match - pm0)); slope fitted on 216 true picks
    wc=0.55,                   # match = wc * salience at the note + (1 - wc) * pyin closeness
    real=(3.73, 1.901, -1.54, -0.04, 0.037), prior=0.24, ccap=(-3.0, 2.5),
                               # LLR that a candidate is a real pick (not a swell of a ringing course):
                               # logistic fit on 387 Hob Eih candidates (AUC 0.856) of log(flux strength),
                               # same pitch before and after, click dB, and click x same
    sig_a=0.35, win=1.2,       # distance from the coarse path: Gaussian sigma, hard window (s)
    sig_r=0.40, wr=1.0,        # local rhythm: log ratio of time gaps, Gaussian sigma
    del_main=1.5, del_g=0.7, del_r=1.0,  # a score note not played
    ins=0.2, ins_click=0.5,    # a candidate pick no note explains: ins + ins_click * max(0, click LLR)
    rho=0.0,                   # if > 0: ins + -log(rho * e^clickLLR + 1 - rho) (extra real pick or false candidate)
    KS=6, KP=14,
)


def pitch_llr(m):
    return float(np.clip(P['pk'] * (m - P['pm0']), *P['pcap']))


def real_pick_llr(feat):
    """Per candidate pick: log-likelihood ratio that it is a real pick."""
    if '_real' in feat:
        return feat['_real']
    S48 = feat['S48']
    b0, b1, b2, b3, b4 = P['real']
    out = []
    for p in feat['picks']:
        k = int(round(p['t'] * F.SR / F.HOP))
        pre = S48[:, max(0, k - 5):max(1, k - 1)].mean(axis=1)
        same = float(abs(((int(np.argmax(pre)) - int(np.argmax(p['chroma'])) + 24) % 48) - 24) <= 1)
        c = float(np.clip(p['click'], -5, 40))
        logit = b0 + b1 * math.log(p['odf'] + 0.01) + b2 * same + b3 * c + b4 * c * same
        out.append(float(np.clip(logit - P['prior'], *P['ccap'])))
    feat['_real'] = np.array(out)
    return feat['_real']


# ---- 1. tuning offset ---------------------------------------------------------------------------
def _circ_smooth(h, sig):
    n = len(h); k = np.arange(-int(3 * sig), int(3 * sig) + 1)
    g = np.exp(-0.5 * (k / sig) ** 2)
    return np.array([np.dot(h[(b + k) % n], g) for b in range(n)])


def note_durs(notes):
    return [min(1.0, max(0.05, (notes[k + 1]['t'] - n['t']) if k + 1 < len(notes) else 0.5)) for k, n in enumerate(notes)]


# ---- 2. coarse alignment ------------------------------------------------------------------------
def coarse_feats(S48):
    T = S48.shape[1] // FR
    X = S48[:, :T * FR].reshape(48, T, FR).mean(axis=2)
    d = np.maximum(0.0, np.diff(S48, axis=1, prepend=S48[:, :1]))
    O = d[:, :T * FR].reshape(48, T, FR).sum(axis=2)
    for t in range(1, T):                     # decaying chroma onsets
        O[:, t] += 0.5 * O[:, t - 1]

    def norm(A):
        n = np.linalg.norm(A, axis=0)
        fl = 0.15 * np.percentile(n, 90) + 1e-9
        return A / np.maximum(n, fl)
    return norm(X), norm(O)


def cost_matrix(R, A, w_on=0.7):
    (Xr, Or), (Xa, Oa) = R, A
    c1 = np.maximum(0, (Xr ** 2).sum(0)[:, None] + (Xa ** 2).sum(0)[None, :] - 2 * Xr.T @ Xa)
    c2 = np.maximum(0, (Or ** 2).sum(0)[:, None] + (Oa ** 2).sum(0)[None, :] - 2 * Or.T @ Oa)
    return (0.5 * c1 + 0.5 * w_on * c2) / (1 + w_on)


def _stretch(R, scale):
    X, O = R
    T = X.shape[1]; T2 = max(4, int(round(T * scale)))
    src = np.linspace(0, T - 1, T2)
    lo = np.floor(src).astype(int); hi = np.minimum(lo + 1, T - 1); w = src - lo
    return (X[:, lo] * (1 - w) + X[:, hi] * w, O[:, lo] * (1 - w) + O[:, hi] * w)


SIGMA = np.array([[1, 1], [1, 2], [2, 1]])


def ref_feats(notes, offset):
    _, Sr = F.salience(F.synth(notes, offset))
    return coarse_feats(F.fold(Sr))


def _half(R):
    X, O = R
    T = X.shape[1] // 2 * 2
    return (0.5 * (X[:, 0:T:2] + X[:, 1:T:2]), 0.5 * (O[:, 0:T:2] + O[:, 1:T:2]))


def scan_offsets(feat, notes, scales=(0.7, 1.2), tau=0.22, top=3):
    """Tuning offsets ranked by how well the score aligns at all: the coarse features are 48 pitch-class
    bins (25 cents), so a tuning shift is a circular roll of the reference; every 25-cent step is tried."""
    if '_coarse' not in feat:
        feat['_coarse'] = coarse_feats(feat['S48'])
    A_ = _half(feat['_coarse'])               # 92 ms frames are enough to rank offsets
    X0, O0 = _half(ref_feats(notes, 0.0))
    gains = np.zeros(48)
    for k in range(48):
        R = (np.roll(X0, k, axis=0), np.roll(O0, k, axis=0))
        g = 0.0
        for sc in scales:
            Rs = _stretch(R, sc)
            if Rs[0].shape[1] >= A_[0].shape[1] * 2:
                continue
            D, _ = _local_dtw(cost_matrix(Rs, A_), tau)
            g = max(g, -float(D.min()) / sc)
        gains[k] = g
    out = []
    for k in range(48):
        if gains[k] >= gains[k - 1] and gains[k] >= gains[(k + 1) % 48] and gains[k] > 0:
            out.append((float(gains[k]), ((k / 4.0) + 6) % 12 - 6))
    out.sort(reverse=True)
    return out[:top], gains


@numba.njit(cache=True)
def _local_dtw(C, tau):
    """Local alignment DTW: a path may start and end anywhere in both the score and the recording.
    Each score row adds (cost - tau); a path keeps going while it pays. Steps: (1,1), (1,2), (2,1)."""
    n, m = C.shape
    D = np.zeros((n, m)); B = np.zeros((n, m), np.int8)
    for i in range(n):
        for j in range(m):
            best = 0.0; b = 0
            if i >= 1 and j >= 1 and D[i - 1, j - 1] < best:
                best = D[i - 1, j - 1]; b = 1
            if i >= 1 and j >= 2 and D[i - 1, j - 2] < best:
                best = D[i - 1, j - 2]; b = 2
            if i >= 2 and j >= 1:
                v = D[i - 2, j - 1] + (C[i - 1, j] - tau)
                if v < best:
                    best = v; b = 3
            D[i, j] = C[i, j] - tau + best; B[i, j] = b
    return D, B


def _backtrack(B, i, j):
    path = [(i, j)]
    while True:
        b = B[i, j]
        if b == 0:
            break
        if b == 1:
            i, j = i - 1, j - 1
        elif b == 2:
            i, j = i - 1, j - 2
        else:
            path.append((i - 1, j)); i, j = i - 2, j - 1
        path.append((i, j))
    return np.array(path[::-1])


def occurrences(feat, notes, offset, max_occ=4, scales=(0.6, 0.85, 1.2, 1.7), tau=0.22, min_part=0.25, rel=0.5,
                cost_ratio=1.25):
    """Where the score (or a part of it of at least min_part) is played in the recording."""
    R = ref_feats(notes, offset)
    if '_coarse' not in feat:
        feat['_coarse'] = coarse_feats(feat['S48'])
    A_ = feat['_coarse']
    nA = A_[0].shape[1]
    best = None
    for sc in scales:
        Rs = _stretch(R, sc)
        if Rs[0].shape[1] >= nA * 2:
            continue
        C = cost_matrix(Rs, A_)
        D, B = _local_dtw(C, tau)
        k = np.unravel_index(int(np.argmin(D)), D.shape)
        val = D[k] / sc                       # per unit of the original score length
        if best is None or val < best['val']:
            best = dict(scale=sc, C=C, val=val)
    if best is None or best['val'] >= 0:
        return []
    C, sc = best['C'].copy(), best['scale']
    n_rows = C.shape[0]
    found = []
    for _ in range(max_occ + 2):
        D, B = _local_dtw(C, tau)
        k = np.unravel_index(int(np.argmin(D)), D.shape)
        if D[k] >= 0:
            break
        wp = _backtrack(B, *k)
        r0, r1, a, b = wp[0, 0], wp[-1, 0], wp[0, 1], wp[-1, 1]
        gain = -float(D[k]) / sc
        C[:, max(0, a - 2):b + 3] = 5.0         # this stretch of the recording is used
        if (r1 - r0 + 1) < min_part * n_rows:
            continue
        if found and gain < rel * found[0]['gain'] * (r1 - r0 + 1) / n_rows:
            continue
        cost = float(best['C'][wp[:, 0], wp[:, 1]].mean())
        if found and cost > cost_ratio * found[0]['cost']:
            continue
        found.append(dict(cost=cost, gain=gain, a=int(a), b=int(b), r0=int(r0), r1=int(r1), path=wp, scale=sc))
        if len(found) >= max_occ:
            break
    found.sort(key=lambda o: o['a'])
    t0 = notes[0]['t']
    st = np.array([n['t'] for n in notes])
    for o in found:
        rows, cols = o['path'][:, 0], o['path'][:, 1]
        ur = np.unique(rows)
        uc = np.array([cols[rows == r].mean() for r in ur])
        tau_n = np.array([(n['t'] - t0 + REF_PAD) * sc / CF for n in notes])
        e = np.interp(tau_n, ur, uc) * CF
        # outside the matched part of the score: extrapolate a little, then the note is out of range
        lo_s = (ur[0] * CF / sc) + t0 - REF_PAD
        hi_s = (ur[-1] * CF / sc) + t0 - REF_PAD
        inr = (st >= lo_s - 1.0) & (st <= hi_s + 1.0)
        e = np.where(st < lo_s, e[0] if len(e) else 0, e)
        r_edge = sc * (uc[-1] - uc[0]) / max(1, ur[-1] - ur[0]) if len(ur) > 1 else sc
        e = np.where(st < lo_s, uc[0] * CF - (lo_s - st) * r_edge, e)
        e = np.where(st > hi_s, uc[-1] * CF + (st - hi_s) * r_edge, e)
        rate = np.ones(len(notes))
        for i in range(len(notes)):
            m = (np.abs(st - st[i]) <= 1.2) & inr
            if m.sum() >= 3 and np.ptp(st[m]) > 0.3:
                rate[i] = np.polyfit(st[m], e[m], 1)[0]
            else:
                rate[i] = r_edge
        o['expected'] = e
        o['in_range'] = inr
        o['rate'] = np.clip(rate, 0.25, 4.0)
        o['start'], o['end'] = o['a'] * CF, o['b'] * CF
        o['part'] = (float(lo_s), float(hi_s))
    return found


# ---- 3. fine alignment --------------------------------------------------------------------------
def pitch_match(pk, q):
    """0..1: how well the evidence after pick pk fits pitch q (MIDI, recording's tuning)."""
    v = pk['chroma']
    x = ((q - F.MIDI0) * 4.0) % 48.0
    lo = int(math.floor(x)); w = x - lo
    vals = [v[(lo + d) % 48] * (1 - w) + v[(lo + d + 1) % 48] * w for d in (-1, 0, 1)]
    sc = max(vals[1], 0.85 * max(vals[0], vals[2]))
    if math.isnan(pk['f0']):
        sf = 0.4
    else:
        sf = math.exp(-0.5 * (pc_dist(pk['f0'], q) / 0.3) ** 2)
    return P['wc'] * sc + (1 - P['wc']) * sf


@numba.njit(cache=True)
def _lse_add(m, s, c):
    """Online soft-min: keep m (min so far) and s = sum exp(-(c - m))."""
    if not np.isfinite(c):
        return m, s
    if c < m:
        return c, s * math.exp(-(m - c)) + 1.0
    return m, s + math.exp(-(c - m))


@numba.njit(cache=True)
def _dp(L, st, pt, rate, dl, ins, KS, KP, sig_r, wr, soft):
    """Viterbi (soft=False) or forward pass (soft=True) over (note i matched to pick j)."""
    N, M = L.shape
    cd = np.zeros(N + 1); ci = np.zeros(M + 1)
    for i in range(N):
        cd[i + 1] = cd[i] + dl[i]
    for j in range(M):
        ci[j + 1] = ci[j] + ins[j]
    D = np.full((N, M), np.inf)
    Bi = -np.ones((N, M), np.int64); Bj = -np.ones((N, M), np.int64)
    for i in range(N):
        for j in range(M):
            if not np.isfinite(L[i, j]):
                continue
            best = cd[i]                 # start here: notes before i not played, earlier picks are outside
            m, s = cd[i], 1.0
            bi = -1; bj = -1
            for i2 in range(max(0, i - KS), i):
                for j2 in range(max(0, j - KP), j):
                    if not np.isfinite(D[i2, j2]):
                        continue
                    dt = pt[j] - pt[j2]; ds = (st[i] - st[i2]) * rate[i]
                    lr = math.log((dt + 0.04) / (max(ds, 0.0) + 0.04))
                    c = D[i2, j2] + (cd[i] - cd[i2 + 1]) + (ci[j] - ci[j2 + 1]) + wr * 0.5 * (lr / sig_r) ** 2
                    if soft:
                        m, s = _lse_add(m, s, c)
                    elif c < best:
                        best = c; bi = i2; bj = j2
            if soft:
                D[i, j] = L[i, j] + m - math.log(s)
            else:
                D[i, j] = L[i, j] + best; Bi[i, j] = bi; Bj[i, j] = bj
    return D, Bi, Bj, cd


@numba.njit(cache=True)
def _backward(L, st, pt, rate, dl, ins, KS, KP, sig_r, wr):
    N, M = L.shape
    cd = np.zeros(N + 1); ci = np.zeros(M + 1)
    for i in range(N):
        cd[i + 1] = cd[i] + dl[i]
    for j in range(M):
        ci[j + 1] = ci[j] + ins[j]
    B = np.full((N, M), np.inf)
    for i in range(N - 1, -1, -1):
        for j in range(M - 1, -1, -1):
            if not np.isfinite(L[i, j]):
                continue
            m, s = cd[N] - cd[i + 1], 1.0      # end here: later notes not played
            for i2 in range(i + 1, min(N, i + KS + 1)):
                for j2 in range(j + 1, min(M, j + KP + 1)):
                    if not np.isfinite(L[i2, j2]) or not np.isfinite(B[i2, j2]):
                        continue
                    dt = pt[j2] - pt[j]; ds = (st[i2] - st[i]) * rate[i2]
                    lr = math.log((dt + 0.04) / (max(ds, 0.0) + 0.04))
                    c = (cd[i2] - cd[i + 1]) + (ci[j2] - ci[j + 1]) + wr * 0.5 * (lr / sig_r) ** 2 + L[i2, j2] + B[i2, j2]
                    m, s = _lse_add(m, s, c)
            B[i, j] = m - math.log(s)
    return B


def fine_align(feat, notes, occ, offset):
    """Match score notes to picks inside one occurrence. Returns per-note results and extra picks."""
    e, rate = occ['expected'], occ['rate']
    allp = feat['picks']
    inr0 = occ.get('in_range', np.ones(len(notes), bool))
    lo, hi = e[inr0].min() - P['win'] - 0.5, e[inr0].max() + P['win'] + 0.5
    idx = [j for j, p in enumerate(allp) if lo <= p['t'] <= hi]
    pk = [allp[j] for j in idx]
    real = real_pick_llr(feat)
    N, M = len(notes), len(pk)
    st = np.array([n['t'] for n in notes]); pt = np.array([p['t'] for p in pk])
    q = np.array([n['midi'] + offset for n in notes])
    clk = np.array([p['click'] for p in pk])
    cl = real[idx] if M else np.zeros(0)
    L = np.full((N, max(M, 1)), np.inf)
    PM = np.zeros((N, max(M, 1)))
    inr = occ.get('in_range', np.ones(N, bool))
    for i in range(N):
        if not inr[i]:
            continue
        for j in range(M):
            d = pt[j] - e[i]
            if abs(d) > P['win']:
                continue
            m = pitch_match(pk[j], q[i]); PM[i, j] = m
            L[i, j] = -pitch_llr(m) - cl[j] + 0.5 * (d / P['sig_a']) ** 2
    dl = np.array([P['del_g'] if n['flag'] == 'g' else P['del_r'] if n['flag'] == 'r' else P['del_main'] for n in notes])
    if not M:
        ins = np.zeros(1)
    elif P['rho'] > 0:
        ins = P['ins'] - np.log(P['rho'] * np.exp(cl) + 1 - P['rho'])
    else:
        ins = P['ins'] + P['ins_click'] * np.maximum(0.0, cl)
    args = (st, pt if M else np.zeros(1), rate, dl, ins, P['KS'], P['KP'], P['sig_r'], P['wr'])
    D, Bi, Bj, cd = _dp(L, *args, False)
    tot = D + (cd[N] - cd[1:N + 1])[:, None]
    match = {}
    if np.isfinite(tot).any() and tot.min() < cd[N]:
        i, j = np.unravel_index(np.argmin(tot), tot.shape)
        while i >= 0:
            match[int(i)] = int(j)
            i, j = Bi[i, j], Bj[i, j]
    # confidence: posterior of each (note, pick) pair
    Fw, _, _, _ = _dp(L, *args, True)
    Bw = _backward(L, *args)
    Z = np.logaddexp.reduce(np.concatenate([(-(Fw + (cd[N] - cd[1:N + 1])[:, None])).ravel(), [-cd[N]]]))
    post = np.exp(-(Fw + Bw) - Z)
    post[~np.isfinite(post)] = 0.0
    # refine: a much stronger click within +-80 ms that nothing else uses takes over
    used = set(match.values())
    moved = 0
    for i, j in list(match.items()):
        for j2 in range(M):
            if j2 in used or abs(pt[j2] - pt[j]) > 0.08:
                continue
            if clk[j2] >= clk[j] + 6.0 and pitch_match(pk[j2], q[i]) >= PM[i, j] - 0.1:
                used.discard(j); used.add(j2); match[i] = j2; moved += 1
                break
    res = []
    for i, n in enumerate(notes):
        r = {'i': i, 'key': n['key'], 'ar': n['ar'], 'line': n['line'], 'flag': n['flag'], 'pass': n.get('pass'),
             'score_t': n['t'], 'expected_t': round(float(e[i]), 3), 'p_played': round(float(post[i].sum()), 3),
             'in_range': bool(inr[i])}
        if i in match:
            j = match[i]
            dev = None
            if not math.isnan(pk[j]['f0']):
                d = (pk[j]['f0'] - q[i] + 6) % 12 - 6
                dev = round(100 * d)
            r.update(played=True, t=round(float(pt[j]), 3), conf=round(float(post[i, j]), 3),
                     pitch=round(float(PM[i, j]), 3), click_db=round(float(clk[j]), 1), cents=dev)
        else:
            r.update(played=False, t=None, conf=round(float(1 - post[i].sum()), 3))
        res.append(r)
    # extra picks: real picks (click >= 8 dB) between the first and last matched note that no note took
    extras = []
    if match:
        t_a, t_b = pt[min(match.values())], pt[max(match.values())]
        used = set(match.values())
        for j in range(M):
            if j in used or not (t_a < pt[j] < t_b) or clk[j] < 8.0:
                continue
            f0 = pk[j]['f0']
            if math.isnan(f0):
                b = int(np.argmax(pk[j]['chroma'])); f0 = F.MIDI0 + b / 4.0 + 12
            mid = f0 - offset
            nm = name_of(mid)
            extras.append({'t': round(float(pt[j]), 3), 'midi': round(float(mid), 2), 'ar': nm['ar'], 'en': nm['en'],
                           'click_db': round(float(clk[j]), 1)})
    return res, extras, moved


# ---- the whole follower -------------------------------------------------------------------------
def _refine_hist(feat, notes, off, span=0.3):
    """Finer offset near `off` from the pitch-class histogram (10-cent steps)."""
    f0, vp = feat['f0'], feat['vp']
    ok = ~np.isnan(f0) & (vp > 0.5)
    if ok.sum() < 20:
        return off
    h = np.zeros(120)
    np.add.at(h, (np.round((f0[ok] * 10) % 120).astype(int)) % 120, vp[ok])
    h = _circ_smooth(h, 2)
    tm = np.zeros(120)
    for n, d in zip(notes, note_durs(notes)):
        tm[int(round(n['midi'] * 10)) % 120] += d
    tm = _circ_smooth(tm, 2.5)
    best = (-1, off)
    for d in np.arange(-span, span + 1e-9, 0.1):
        s = int(round((off + d) * 10)) % 120
        v = float(np.dot(np.roll(h, -s), tm))
        if v > best[0]:
            best = (v, off + d)
    return round(float(best[1]), 3)


def follow(feat, score, offset=None, max_occ=4, rel=0.5):
    notes = score['notes']
    if offset is not None:
        cands, tries = [], [offset]
    else:
        cands, _ = scan_offsets(feat, notes)
        tries = [_refine_hist(feat, notes, off) for _, off in cands] or [0.0]
    best = None
    for off in tries:
        occ = occurrences(feat, notes, off, max_occ=max_occ, rel=rel)
        if not occ:
            continue
        cost = -max(o['gain'] for o in occ)
        if best is None or cost < best[2]:
            best = (off, occ, cost)
    if best is None:
        return {'offset': offset or 0.0, 'occurrences': [], 'tuning_candidates': [[round(g, 1), o] for g, o in cands]}
    off, occ, _ = best
    out = []
    for o in occ:
        res, extras, moved = fine_align(feat, notes, o, off)
        # tuning refinement from the matched notes' own pitch, then align again
        devs = [r['cents'] for r in res if r['played'] and r.get('cents') is not None and r['conf'] > 0.5]
        if offset is None and len(devs) >= 5 and 6 < abs(np.median(devs)) <= 50:
            off2 = off + float(np.median(devs)) / 100.0
            res, extras, moved = fine_align(feat, notes, o, off2)
            o['offset'] = off2
        else:
            o['offset'] = off
        played = [r for r in res if r['played']]
        out.append({'start': round(min(r['t'] for r in played), 3) if played else round(o['start'], 3),
                    'end': round(max(r['t'] for r in played), 3) if played else round(o['end'], 3),
                    'dtw_cost': round(o['cost'], 4), 'tempo_scale': o['scale'], 'offset': round(o['offset'], 3),
                    'score_part': [round(o['part'][0], 2), round(o['part'][1], 2)],
                    'played': len(played), 'of': len(res), 'moved_to_stronger_click': moved,
                    'notes': res, 'extras': extras})
    # a second (third ...) occurrence must look like real playing of the melody, not talking or other music
    if out:
        best_k = int(np.argmax([o['gain'] for o in occ]))
        keep = []
        for k, o in enumerate(out):
            inr = max(1, sum(n['in_range'] for n in o['notes']))
            pl = [n for n in o['notes'] if n['played']]
            o['found_share'] = round(len(pl) / inr, 3)
            o['mean_pitch_match'] = round(float(np.mean([n['pitch'] for n in pl])), 3) if pl else 0.0
            if k == best_k or (o['found_share'] >= 0.5 and o['mean_pitch_match'] >= 0.72):
                keep.append(o)
        out = keep
    offs = [o['offset'] for o in out]
    return {'offset': round(float(np.median(offs)), 3) if offs else 0.0,
            'tuning_candidates': [[round(g, 1), o] for g, o in cands], 'occurrences': out}
