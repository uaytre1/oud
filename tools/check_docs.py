#!/usr/bin/env python3
"""Walk test for the agent docs: every path a doc points to must exist.

A backticked token that looks like a repo path (has a "/" or a known file extension, no spaces,
no placeholders like <x> or *) is a pointer and must resolve from the repo root. Relative markdown
links must resolve too. Bare (unbackticked) names are just names and are not checked.

usage: python3 tools/check_docs.py      (exit 1 on a dead pointer; runs in CI on every push)
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ['AGENTS.md', 'CLAUDE.md', 'TODO.md', 'README.md', 'STATE.md'] + sorted(
    str(p.relative_to(ROOT)) for p in (ROOT / 'docs' / 'memory').rglob('*.md'))
EXT = ('.md', '.js', '.css', '.html', '.py', '.json', '.yml', '.yaml', '.svg', '.png', '.mp4', '.webmanifest')
TICK = re.compile(r'`([^`\n]+)`')
LINK = re.compile(r'\]\(([^)\s]+)\)')


def looks_like_path(tok):
    if any(c in tok for c in ' <>*{}|=') or tok.startswith(('#', 'http', '/', '-', '.')) and not tok.startswith('.github/'):
        return False
    if '..' in tok:
        return False
    return '/' in tok or tok.lower().endswith(EXT)


def main():
    bad = []
    for doc in DOCS:
        path = ROOT / doc
        if not path.exists():
            bad.append((doc, 0, '(the doc itself is missing)'))
            continue
        for n, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
            toks = [t.strip().rstrip('.,:;') for t in TICK.findall(line)]
            toks += [l for l in LINK.findall(line) if not l.startswith(('http', '#', 'mailto:'))]
            for tok in toks:
                if looks_like_path(tok) and not (ROOT / tok.split('#')[0]).exists():
                    bad.append((doc, n, tok))
    for doc, n, tok in bad:
        print(f'{doc}:{n}: dead pointer `{tok}`')
    print(f'checked {len(DOCS)} docs: {"OK" if not bad else str(len(bad)) + " dead pointer(s)"}')
    media = no_recordings()
    return 1 if bad or media else 0


# Public repo: no recordings (third-party performances or the owner's playing) may be committed.
MEDIA = ('.m4a', '.wav', '.mp3', '.aac', '.ogg', '.flac', '.mov', '.mp4', '.webm', '.zip')
ALLOWED = {'awake.mp4'}   # 1.5 KB silent black video that keeps the screen awake


def no_recordings():
    import subprocess
    try:
        files = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    except Exception:
        return []
    bad = [f for f in files if (f.lower().endswith(MEDIA) and f not in ALLOWED) or (ROOT / f).stat().st_size > 3_000_000]
    for f in bad:
        print(f'{f}: recordings and large files must not be committed (public repo)')
    print(f'checked {len(files)} tracked files for recordings: {"OK" if not bad else str(len(bad)) + " found"}')
    return bad


if __name__ == '__main__':
    sys.exit(main())
