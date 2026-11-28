#!/usr/bin/env python3
"""Deterministic multi-agent guard & context injector for Oud Coach.

Works identically for BOTH:
  - Antigravity (.agents/hooks.json -> camelCase JSON stdin/stdout)
  - Claude Code (.claude/settings.json -> snake_case JSON stdin/stdout + exit code 2 on block)

Enforces:
  1. SessionStart: auto-injects STATE.md, ready Beads tasks (`bd`), and unread peer Messages/.
  2. PreInvocation / UserPromptSubmit: auto-injects newly arrived peer Messages/ immediately.
  3. PostToolUse (Read / read_file / Bash / run_command): records which standard docs were read in this session.
  4. PreToolUse (Edit / Write / edit_file / write_file):
     - HARD BLOCKS edits to frozen `tools/fable/original/` and `js/detector-worklet.js`.
     - BLOCKS editing `js/songs/*.js` until `fable-method.md` and `song-standard.md` have been read in this session.
     - BLOCKS editing UI files (`index.html`, `style.css`, `tuner.css`, `js/app.js`, `js/coach.js`, `js/record-oud.js`)
       until `STATE.md` and `quality.md` have been read in this session.
     - BLOCKS editing `js/audio.js` or `js/analyze.js` until `detection.md` and `oud-sound.md` have been read.
"""
import hashlib, json, os, pathlib, subprocess, sys, time

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
STATE_DIR = pathlib.Path('/tmp/oud-agent-guard')
STATE_DIR.mkdir(parents=True, exist_ok=True)


def load_payload():
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}


def is_agy(p):
    return 'hookEventName' in p or 'conversationId' in p or 'toolCall' in p


def session_key(p, agy):
    sid = p.get('conversationId') if agy else p.get('session_id')
    if not sid:
        sid = f"default-{'agy' if agy else 'claude'}"
    safe = ''.join(c for c in str(sid) if c.isalnum() or c in ('-', '_'))[:80]
    return safe or 'default'


def state_file(skey):
    return STATE_DIR / f'{skey}.json'


def read_state(skey):
    sf = state_file(skey)
    if sf.exists():
        try:
            return json.loads(sf.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {'reads': [], 'seen_msgs': []}


def write_state(skey, st):
    try:
        state_file(skey).write_text(json.dumps(st), encoding='utf-8')
    except Exception:
        pass


def rel_path(raw_path):
    if not raw_path:
        return ''
    try:
        p = pathlib.Path(raw_path).expanduser().resolve()
        # Handle Repo-Claude worktree or main Repo by matching path tail
        for candidate in (REPO, REPO.parent / 'Repo-Claude', REPO.parent / 'Repo'):
            try:
                return str(p.relative_to(candidate.resolve())).replace('\\', '/')
            except Exception:
                pass
        s = str(p).replace('\\', '/')
        for marker in ('/Repo-Claude/', '/Repo/'):
            if marker in s:
                return s.split(marker, 1)[1]
    except Exception:
        pass
    return str(raw_path).lstrip('./')


def find_mailbox(agy):
    # Relative to parent of Repo / Repo-Claude on team machine; silent no-op elsewhere
    inbox_name = 'For Antigravity' if agy else 'For Claude'
    for parent in (REPO.parent, REPO.parent.parent):
        mb = parent / 'Messages' / inbox_name
        if mb.is_dir():
            return mb
    return None


def unread_messages(agy):
    mb = find_mailbox(agy)
    if not mb:
        return []
    out = []
    for f in sorted(mb.iterdir()):
        if f.is_file() and f.suffix in ('.md', '.txt') and not f.name.startswith('.'):
            out.append(f)
    return out


def beads_summary():
    bd_candidates = [
        REPO.parent / 'Support' / 'Tools' / 'bd',
        pathlib.Path.home() / '.local' / 'bin' / 'bd',
    ]
    bd_bin = next((str(b) for b in bd_candidates if b.is_file() and os.access(b, os.X_OK)), 'bd')
    if not (REPO / '.beads').exists():
        return ''
    try:
        r = subprocess.run([bd_bin, 'ready', '--limit', '5'], cwd=REPO, capture_output=True, text=True, timeout=2)
        txt = (r.stdout or '').strip()
        return txt[:900] if r.returncode == 0 and txt else ''
    except Exception:
        return ''


def build_startup_brief(agy, skey):
    st = read_state(skey)
    parts = []
    state_md = REPO / 'STATE.md'
    if state_md.is_file():
        parts.append('=== OUD COACH LIVE STATE (STATE.md) ===\n' + state_md.read_text(encoding='utf-8').strip()[:2200])
        if 'STATE.md' not in st['reads']:
            st['reads'].append('STATE.md')
    bd_txt = beads_summary()
    if bd_txt:
        parts.append('=== READY TASKS (Beads `bd ready`) ===\n' + bd_txt)
    msgs = unread_messages(agy)
    if msgs:
        msg_lines = []
        seen = set(st.get('seen_msgs', []))
        for m in msgs[-3:]:
            tag = f"{m.name}:{int(m.stat().st_mtime)}"
            seen.add(tag)
            snippet = m.read_text(encoding='utf-8', errors='replace').strip()[:900]
            msg_lines.append(f"--- Unread peer note: {m.name} ---\n{snippet}")
        if len(msgs) > 3:
            msg_lines.insert(0, f"({len(msgs)} unread notes in mailbox; showing newest 3 — move handled notes to Handled/)")
        parts.append('=== PEER MAILBOX ===\n' + '\n\n'.join(msg_lines))
        st['seen_msgs'] = sorted(seen)[-40:]
    write_state(skey, st)
    return '\n\n'.join(parts)


def check_new_messages(agy, skey):
    st = read_state(skey)
    seen = set(st.get('seen_msgs', []))
    fresh = []
    for m in unread_messages(agy):
        tag = f"{m.name}:{int(m.stat().st_mtime)}"
        if tag not in seen:
            seen.add(tag)
            snippet = m.read_text(encoding='utf-8', errors='replace').strip()[:900]
            fresh.append(f"--- New peer note arrived: {m.name} ---\n{snippet}")
    if fresh:
        st['seen_msgs'] = sorted(seen)[-40:]
        write_state(skey, st)
        return '=== NEW PEER MESSAGE RECEIVED ===\n' + '\n\n'.join(fresh)
    return ''


def record_reads_from_tool(p, agy, skey):
    tc = p.get('toolCall', {}) if agy else {'name': p.get('tool_name', ''), 'args': p.get('tool_input', {})}
    name = (tc.get('name') or '').lower()
    args = tc.get('args') or {}
    found = []
    if name in ('read_file', 'view_file', 'read'):
        raw = args.get('Path') or args.get('AbsolutePath') or args.get('file_path') or args.get('path')
        rp = rel_path(raw)
        if rp:
            found.append(rp)
    elif name in ('run_command', 'bash'):
        cmd = args.get('CommandLine') or args.get('command') or ''
        for doc in (
            'STATE.md',
            'docs/memory/songs-and-audio/fable-method.md',
            'docs/memory/songs-and-audio/song-standard.md',
            'docs/memory/teaching-and-ui/quality.md',
            'docs/memory/songs-and-audio/detection.md',
            'docs/memory/songs-and-audio/oud-sound.md',
        ):
            if doc in cmd or os.path.basename(doc) in cmd:
                found.append(doc)
    if found:
        st = read_state(skey)
        rds = set(st.get('reads', []))
        rds.update(found)
        st['reads'] = sorted(rds)
        write_state(skey, st)


REQUIRED_STANDARDS = [
    (
        lambda rp: rp.startswith('js/songs/') and rp.endswith('.js'),
        ['docs/memory/songs-and-audio/fable-method.md', 'docs/memory/songs-and-audio/song-standard.md'],
        'Before editing song data (`js/songs/*.js`), you MUST read BOTH `docs/memory/songs-and-audio/fable-method.md` and `docs/memory/songs-and-audio/song-standard.md` in this session. Never guess pitches by ear: verify with `tools/lab/match.py` and `tools/verify_version.py --strict`.'
    ),
    (
        lambda rp: rp in ('index.html', 'style.css', 'tuner.css', 'js/app.js', 'js/coach.js', 'js/record-oud.js'),
        ['STATE.md', 'docs/memory/teaching-and-ui/quality.md'],
        'Before editing UI/app files, you MUST read `STATE.md` and `docs/memory/teaching-and-ui/quality.md` in this session so Design D ("Stage") rules, non-merging 6-string rules, and current peer work are respected.'
    ),
    (
        lambda rp: rp in ('js/audio.js', 'js/analyze.js'),
        ['docs/memory/songs-and-audio/detection.md', 'docs/memory/songs-and-audio/oud-sound.md'],
        'Before touching `js/audio.js` or `js/analyze.js`, you MUST read `docs/memory/songs-and-audio/detection.md` and `docs/memory/songs-and-audio/oud-sound.md`. Reminder: the `Listener` note-detection logic in `js/audio.js` is OFF-LIMITS without explicit owner approval!'
    ),
]


def check_pre_tool(p, agy, skey):
    tc = p.get('toolCall', {}) if agy else {'name': p.get('tool_name', ''), 'args': p.get('tool_input', {})}
    name = (tc.get('name') or '').lower()
    args = tc.get('args') or {}
    if name not in ('edit_file', 'write_file', 'replace_file_content', 'multi_replace_file_content', 'edit', 'write', 'multiedit'):
        return None  # allow
    raw = args.get('Path') or args.get('TargetFile') or args.get('file_path') or args.get('path')
    rp = rel_path(raw)
    if not rp:
        return None

    # 1. Hard-protected frozen baselines
    if rp.startswith('tools/fable/original/'):
        return 'BLOCKED: `tools/fable/original/` is the frozen read-only Fable baseline (`docs/memory/songs-and-audio/fable-method.md`). Never modify files in this folder.'
    if rp == 'js/detector-worklet.js' and not (STATE_DIR / 'allow-detector-edit').exists():
        return 'BLOCKED: `js/detector-worklet.js` is protected listening code. Ask the owner explicitly before modifying it.'

    # 2. Read-the-standard-before-editing gate
    st = read_state(skey)
    reads = set(st.get('reads', []))
    for match_fn, req_docs, msg in REQUIRED_STANDARDS:
        if match_fn(rp):
            missing = [d for d in req_docs if d not in reads and not any(r.endswith('/' + os.path.basename(d)) or r == os.path.basename(d) for r in reads)]
            if missing:
                return f"READ STANDARD FIRST (blocked edit on `{rp}`): Missing read of {', '.join(f'`{m}`' for m in missing)}. {msg}"
    return None


def main():
    p = load_payload()
    agy = is_agy(p)
    ev = p.get('hookEventName') if agy else p.get('hook_event_name', '')
    skey = session_key(p, agy)

    if ev == 'SessionStart':
        brief = build_startup_brief(agy, skey)
        if agy:
            steps = [{'systemMessage': {'systemMessage': brief}}] if brief else []
            print(json.dumps({'injectSteps': steps}))
        else:
            if brief:
                print(json.dumps({'hookSpecificOutput': {'hookEventName': 'SessionStart', 'additionalContext': brief}}))
            else:
                print('{}')
        return 0

    if ev in ('PreInvocation', 'UserPromptSubmit'):
        fresh = check_new_messages(agy, skey)
        if agy:
            steps = [{'systemMessage': {'systemMessage': fresh}}] if fresh else []
            print(json.dumps({'injectSteps': steps}))
        else:
            if fresh:
                print(json.dumps({'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': fresh}}))
            else:
                print('{}')
        return 0

    if ev == 'PostToolUse':
        record_reads_from_tool(p, agy, skey)
        print('{}')
        return 0

    if ev == 'PreToolUse':
        block_reason = check_pre_tool(p, agy, skey)
        if agy:
            if block_reason:
                print(json.dumps({'decision': 'deny', 'reason': block_reason}))
            else:
                print(json.dumps({'decision': 'allow'}))
            return 0
        else:
            if block_reason:
                sys.stderr.write(block_reason + '\n')
                return 2
            return 0

    if ev == 'Stop':
        if agy:
            print(json.dumps({'decision': 'allow'}))
            return 0
        # Reminder, once per session (owner, 2026-11-28: agents lose track; Fable's tidy-up step c): when code was
        # committed or changed after the last update of STATE.md / DASHBOARD.md / the log, say so before stopping.
        st = read_state(skey)
        if st.get('stop_reminded'):
            print('{}'); return 0
        def last(*paths):
            try:
                r = subprocess.run(['git', 'log', '-1', '--format=%ct', '--', *paths], cwd=REPO, capture_output=True, text=True, timeout=3)
                return int(r.stdout.strip() or 0)
            except Exception:
                return 0
        try:
            dirty = subprocess.run(['git', 'status', '--porcelain', '--', 'js', 'index.html', 'style.css', 'tools'], cwd=REPO,
                                   capture_output=True, text=True, timeout=3).stdout.strip()
        except Exception:
            dirty = ''
        t_code = last('js', 'index.html', 'style.css', 'tools', 'media')
        t_docs = min(last('STATE.md'), last('DASHBOARD.md'), last('docs/memory/logs/latest.md'))
        msgs = []
        if dirty: msgs.append('there are uncommitted code changes (commit them: small commit, your own files only)')
        if t_code > t_docs: msgs.append('code changed after the last update of STATE.md, DASHBOARD.md or docs/memory/logs/latest.md (update all three)')
        if msgs:
            st['stop_reminded'] = True; write_state(skey, st)
            print(json.dumps({'decision': 'block', 'reason': 'Before stopping: ' + '; '.join(msgs) + '. This reminder shows once per session.'}))
            return 0
        print('{}')
        return 0

    print('{}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
