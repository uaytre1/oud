"""Scores to follow: song versions and passes from the app's library, and consensus melodies.

A score is a dict: {'title', 'label', 'notes': [note, ...]} where each note has
t (seconds, score time), key, midi, ar, line, flag ('' main, 'g' decoration, 'r' same note again),
string, finger, and pass (the pass id it came from).
"""
import functools, json, math, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
PASS_GAP = 1.0   # seconds between passes when a version's passes are joined and it has no media starts


@functools.lru_cache(maxsize=1)
def library():
    out = subprocess.run(['node', os.path.join(HERE, 'songdata.mjs')], capture_output=True, text=True, check=True).stdout
    return {s['id']: s for s in json.loads(out)}


def song(song_id):
    lib = library()
    if song_id not in lib:
        raise SystemExit(f'unknown song "{song_id}"; songs: {", ".join(lib)}')
    return lib[song_id]


def version(song_id, version_id):
    s = song(song_id)
    for v in s['versions']:
        if v['id'] == version_id:
            return v
    raise SystemExit(f'unknown version "{version_id}" of {song_id}; versions: {", ".join(v["id"] for v in s["versions"])}')


def _notes_of(p, offset=0.0):
    return [dict(n, t=round(n['t'] + offset, 4), **{'pass': p['id']}) for n in p['notes']]


def pass_score(song_id, version_id, pass_id='all'):
    """The notes of one pass, or of every pass joined in order (pass_id 'all')."""
    s, v = song(song_id), version(song_id, version_id)
    if pass_id != 'all':
        ps = [p for p in v['passes'] if p['id'] == pass_id]
        if not ps:
            raise SystemExit(f'unknown pass "{pass_id}"; passes: {", ".join(p["id"] for p in v["passes"])}')
        notes = _notes_of(ps[0])
    else:
        notes, t0 = [], 0.0
        starts = (v.get('media') or {}).get('starts') or {}
        first = v['passes'][0]['id']
        for k, p in enumerate(v['passes']):
            if k and p['id'] in starts and first in starts:
                t0 = starts[p['id']] - starts[first]
            notes += _notes_of(p, t0)
            t0 = notes[-1]['t'] + max(0.3, p['end'] - p['notes'][-1]['t']) + PASS_GAP
    return {'song': s['id'], 'title': s['title'], 'titleEn': s['titleEn'],
            'label': f"{v['name']} · {pass_id}", 'notes': notes}


def truth_of(song_id, version_id):
    """A version's own measured notes placed at their times in its media file (for validation)."""
    v = version(song_id, version_id)
    starts = (v.get('media') or {}).get('starts') or {}
    out = []
    for p in v['passes']:
        if p['id'] in starts:
            out += _notes_of(p, starts[p['id']])
    return sorted(out, key=lambda n: n['t'])


# ---- pitch helpers -------------------------------------------------------------------------------
def pc_dist(a, b):
    """Distance in half steps between two pitches, octave-equivalent."""
    d = (a - b) % 12.0
    return min(d, 12.0 - d)


QT = [('دو', 'Do'), ('دو+', 'Do quarter-sharp'), ('دو#', 'Do#'), ('ري-', 'Re half-flat'),
      ('ري', 'Re'), ('ري+', 'Re quarter-sharp'), ('مي♭', 'Mi-flat'), ('مي', 'Mi half-flat'),
      ('مي♮', 'Mi'), ('فا-', 'Fa quarter-flat'), ('فا', 'Fa'), ('فا+', 'Fa quarter-sharp'),
      ('فا#', 'Fa#'), ('صول-', 'Sol half-flat'), ('صول', 'Sol'), ('صول+', 'Sol quarter-sharp'),
      ('لا♭', 'La-flat'), ('لا-', 'La half-flat'), ('لا', 'La'), ('لا+', 'La quarter-sharp'),
      ('سي♭', 'Si-flat'), ('سي-', 'Si half-flat'), ('سي', 'Si'), ('سي+', 'Si quarter-sharp')]


def name_of(midi):
    """Arabic quarter-tone name of any pitch (same table as nameOf in js/notes.js)."""
    q = int(round(midi * 2)) % 24
    return {'ar': QT[q][0], 'en': QT[q][1]}


# ---- consensus melody ----------------------------------------------------------------------------
def _norm_times(notes):
    t0, t1 = notes[0]['t'], notes[-1]['t']
    return [(n['t'] - t0) / max(1e-6, t1 - t0) for n in notes]


def align_notes(a, b):
    """Needleman-Wunsch between two note lists: same pitch (octave-equivalent) at a similar place in the
    pass is a match. Returns (score, pairs) where pairs lists (index in a, index in b)."""
    ta, tb = _norm_times(a), _norm_times(b)
    na, nb = len(a), len(b)
    GAP = -1.0
    S = [[0.0] * (nb + 1) for _ in range(na + 1)]
    B = [[0] * (nb + 1) for _ in range(na + 1)]
    for i in range(1, na + 1):
        S[i][0], B[i][0] = S[i - 1][0] + GAP, 1
    for j in range(1, nb + 1):
        S[0][j], B[0][j] = S[0][j - 1] + GAP, 2
    for i in range(1, na + 1):
        for j in range(1, nb + 1):
            same = pc_dist(a[i - 1]['midi'], b[j - 1]['midi']) < 0.4
            m = (2.0 if same else -1.0) - 4.0 * abs(ta[i - 1] - tb[j - 1])
            c = [S[i - 1][j - 1] + m, S[i - 1][j] + GAP, S[i][j - 1] + GAP]
            k = max(range(3), key=lambda x: c[x])
            S[i][j], B[i][j] = c[k], k
    pairs, i, j = [], na, nb
    while i > 0 or j > 0:
        k = B[i][j] if i > 0 and j > 0 else (1 if i > 0 else 2)
        if k == 0:
            pairs.append((i - 1, j - 1)); i -= 1; j -= 1
        elif k == 1:
            i -= 1
        else:
            j -= 1
    return S[na][nb], pairs[::-1]


def consensus(song_id, members, center=None):
    """Consensus melody of several (version, pass) members: the notes of the center member that at least
    half of all members play (same pitch, octave-equivalent, at the aligned spot). Times are the center's.
    members: list of (version_id, pass_id). center: one of members, or None to pick the most typical."""
    scores = {m: pass_score(song_id, *m)['notes'] for m in members}
    if center is None:
        tot = {m: sum(align_notes(scores[m], scores[o])[0] for o in members if o != m) for m in members}
        center = max(members, key=lambda m: tot[m])
    c = scores[center]
    support = [1] * len(c)
    for o in members:
        if o == center:
            continue
        _, pairs = align_notes(c, scores[o])
        for i, j in pairs:
            if pc_dist(c[i]['midi'], scores[o][j]['midi']) < 0.4:
                support[i] += 1
    need = math.ceil(len(members) / 2)
    notes = [dict(n, support=s) for n, s in zip(c, support) if s >= need]
    s = song(song_id)
    return {'song': song_id, 'title': s['title'], 'titleEn': s['titleEn'],
            'label': f"Consensus of {len(members)} ({center[0]} timing)", 'notes': notes,
            'center': list(center), 'members': [list(m) for m in members]}
