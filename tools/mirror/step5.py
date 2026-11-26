"""Song-standard step 5 loop: gate, act on the report (move off-time notes to the pick, soft-note test at
--rise 3.5, delete what still fails), repeat until PASS. Never adds notes; stray / soft picks are only listed.
usage: step5.py cand.json(from build.py) tuned.wav repo_dir out.json"""
import sys, json, subprocess, os, tempfile
cand, wav, repo, outf = sys.argv[1:5]
PY = sys.executable
d = json.load(open(cand)); st = d['start']
notes = [[round(st + t, 3), m, du] for t, m, du in d['cand']['notes']]          # absolute seconds
log = {'moved': [], 'soft_kept': [], 'deleted': []}
def gate(rise):
    s = notes[0][0]; rel = [[round(t - s, 3), m, du] for t, m, du in notes]
    fd, rp = tempfile.mkstemp(suffix='.json'); os.close(fd)
    p = subprocess.run([PY, '-I', os.path.join(repo, 'tools/verify_version.py'), '--version', 'cand', '--media', wav,
                        '--start', str(s), '--strict', '--rise', str(rise), '--report', rp],
                       input=json.dumps({'cand': {'notes': rel}}), capture_output=True, text=True)
    return p.stdout, json.load(open(rp)), s
for it in range(8):
    out, rep, s = gate(5.0)
    print(f'--- round {it}:', out.splitlines()[0][:200])
    bad = [n for n in rep['notes'] if n['verdict'] != 'ok']
    if 'PASS' in out.splitlines()[1] if len(out.splitlines()) > 1 else False:
        pass
    soft = None; changed = False; drop = set()
    for n in bad:
        i = min(range(len(notes)), key=lambda k: abs(notes[k][0] - s - n['t']))
        if n['verdict'] == 'off time':
            notes[i][0] = round(notes[i][0] + n['move_by'], 3); log['moved'].append([notes[i][0], notes[i][1], n['move_by']]); changed = True
        elif n['verdict'].startswith('not in the recording'):
            if soft is None: _, soft, s35 = gate(3.5)
            ok35 = any(abs(x['t'] - n['t']) < 0.005 and x['verdict'] == 'ok' for x in soft['notes'])
            if ok35:
                if [notes[i][0], notes[i][1]] not in [x[:2] for x in log['soft_kept']]: log['soft_kept'].append([notes[i][0], notes[i][1]])
            else: drop.add(i)
    for i in sorted(drop, reverse=True): log['deleted'].append(notes[i][:2]); del notes[i]; changed = True
    notes.sort()
    k = 1
    while k < len(notes):                          # a move can land on another pick of the same pitch: keep one
        if (abs(notes[k][1] - notes[k-1][1]) < 0.3 and notes[k][0] - notes[k-1][0] < 0.07) or notes[k][0] - notes[k-1][0] < 0.03:   # or two pitches on one pick
            log['deleted'].append(notes[k][:2] + ['second detection']); del notes[k]; changed = True
        else: k += 1
    for i in range(len(notes)): notes[i][2] = round((notes[i+1][0] if i + 1 < len(notes) else notes[i][0] + 0.5) - notes[i][0], 3)
    if not changed: break
o35, r35, s = gate(3.5); o50, r50, _ = gate(5.0)
print('=== final at --rise 3.5:\n' + o35 + '=== final at --rise 5.0:\n' + o50.splitlines()[0])
json.dump({'start': s, 'notes': [[round(t - s, 3), m] for t, m, _ in notes], 'log': log,
           'gate35': o35, 'gate50': o50, 'stray': r35['stray_picks'], 'soft_missing': r35['possible_missing_soft_notes']},
          open(outf, 'w'), ensure_ascii=False, indent=1)
print(json.dumps(log, ensure_ascii=False))
