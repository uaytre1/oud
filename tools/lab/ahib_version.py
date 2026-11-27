# Turn the Fable-built candidate into the app's notes. Rules only, no ear:
# 1. same key again within 70 ms = one pick (song-standard step 3): keep the first
#    (three notes the gate moved onto a pick that already had that note);
# 2. add the gate's possible soft notes that pass step 3 by measurement (bin/soft5.py);
# 3. flag 'r' = the same key as the note before; 4. lines: split at a gap of 0.5 s or more,
#    a line under 4 notes joins the next, a line over 16 notes splits at its longest gap (4 notes or more on each side).
import json, sys
cand, out = sys.argv[1], sys.argv[2]
d = json.load(open(cand)); ns = [list(n) for n in d['notes']]
ADD = []  # 25.269 si and 27.335 sol pass step 3 by pyin, but the gate hears another note there and says delete (also at 3.5): left out, unsure
clean, dropped = [], []
for t, k in sorted(ns):
    if clean and clean[-1][1] == k and t - clean[-1][0] < 0.07: dropped.append((t, k)); continue
    clean.append([t, k])
for a in ADD:
    assert not any(abs(a[0] - t) < 0.07 for t, _ in clean), a
clean = sorted(clean + ADD)
gaps = [clean[i + 1][0] - clean[i][0] for i in range(len(clean) - 1)] + [9]
lines, cur = [], []
for i, n in enumerate(clean):
    cur.append(i)
    if gaps[i] >= 0.5: lines.append(cur); cur = []
if cur: lines.append(cur)
m = []
for L in lines:
    if m and len(m[-1]) < 4: m[-1] += L
    else: m.append(L)
if len(m) > 1 and len(m[-1]) < 4: last = m.pop(); m[-1] += last
def split(L):
    if len(L) <= 16: return [L]
    j = max(range(3, len(L) - 4), key=lambda q: (gaps[L[q]], -abs(q - len(L) / 2)))
    return split(L[:j + 1]) + split(L[j + 1:])
lines = [s for L in m for s in split(L)]
line_of = {i: li + 1 for li, L in enumerate(lines) for i in L}
res = []
for i, (t, k) in enumerate(clean):
    flag = 'r' if i and clean[i - 1][1] == k else ''
    res.append([round(t, 3), k, line_of[i]] + ([flag] if flag else []))
json.dump({'notes': res, 'dropped_same_pick': dropped, 'added_soft': ADD}, open(out, 'w'), ensure_ascii=False)
print(len(ns), '->', len(res), 'notes; dropped', dropped, '; lines', [len(L) for L in lines])
print('line starts', [round(clean[L[0]][0], 2) for L in lines])
