# Tighten a version's timing with the gate (tools/verify_version.py), Mirror step 5: every "off time" note takes the
# time of the recording's pick (move_by). Nothing added, no pitch changed. A note moves only when that pick is
# nearer to it than to any other note. Same key within 70 ms after a move = one pick (keep one). Repeat until stable.
import json, re, subprocess, sys
gate, notesjs, media, vin, vout, start, tol = sys.argv[1:8]; start = float(start); tol = float(tol)
src = open(notesjs, encoding='utf8').read()
MIDI = {k: float(v) for k, v in re.findall(r"^\s*(\w+):\s*\{[^}]*?midi:\s*([\d.]+)", src, re.M)}
notes = [list(n) for n in json.load(open(vin))['notes']]
PY = sys.executable
def run(ns, st, rep):
    data = {'solo': {'notes': [[n[0], MIDI[n[1]], (ns[i + 1][0] - n[0]) if i + 1 < len(ns) else 0.5] for i, n in enumerate(ns)]}}
    r = subprocess.run([PY, gate, '--version', 'solo', '--media', media, '--start', str(st), '--strict', '--tol', str(tol), '--report', rep],
                       input=json.dumps(data), capture_output=True, text=True)
    return r.stdout.splitlines()[0], json.load(open(rep))
log = []
for it in range(6):
    line, rep = run(notes, start, vout + '.rep.json')
    print('round', it, '|', line); rows = rep['notes'] if isinstance(rep, dict) else rep
    moves = [(i, r['move_by']) for i, r in enumerate(rows) if r.get('verdict') == 'off time']
    if not moves: break
    moved = 0
    for i, mb in moves:
        tgt = notes[i][0] + mb
        nearest = min(range(len(notes)), key=lambda k: abs(notes[k][0] - tgt))
        if nearest != i and notes[nearest][1] == notes[i][1]:   # its pick is the same-key note's own pick: one pick (keep one)
            log.append(('one pick: lands on the same note', round(notes[i][0], 3), notes[i][1], mb)); notes[i][1] = None; continue
        if nearest != i: log.append(('not moved: pick nearer another note', round(notes[i][0], 3), notes[i][1], mb)); continue
        log.append(('moved', round(notes[i][0], 3), notes[i][1], mb)); notes[i][0] = round(tgt, 3); moved += 1
    notes = [n for n in notes if n[1] is not None]
    notes.sort(key=lambda n: n[0])
    keep = []
    for n in notes:
        if keep and keep[-1][1] == n[1] and n[0] - keep[-1][0] < 0.07: log.append(('one pick (same key within 70 ms)', n[0], n[1])); continue
        keep.append(n)
    notes = keep
    if not moved and not any(l[0].startswith('one pick: lands') for l in log): break
# constant shift left over -> the pass start (where the first note is in the recording)
m = re.search(r'shift removed (-?\d+) ms', line); sh = int(m.group(1)) / 1000 if m else 0
t0 = notes[0][0]
for n in notes: n[0] = round(n[0] - t0, 3)
start2 = round(start + t0 + sh, 3)
line2, _ = run(notes, start2, vout + '.rep.json')
print('final (start %.3f) |' % start2, line2)
for rise in ('3.5',):
    pass
json.dump({'notes': notes, 'start': start2, 'log': log}, open(vout, 'w'), ensure_ascii=False)
print('moves:', sum(1 for l in log if l[0] == 'moved'), '| not moved:', [l for l in log if l[0].startswith('not')], '| merged:', [l for l in log if l[0].startswith('one')], '| total notes', len(notes))
