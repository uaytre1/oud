# Fable's originals (frozen, read-only)

The owner's rule (2026-11-27): keep the Fable version untouched in separate files; experiments happen on copies.
These are exact copies out of git history. Do not edit them. Compare against them before claiming anything
"is Fable's". Experiments live in `tools/lab/` and on the local branch `claude/lab` (not pushed without the
owner's yes).

| File | From commit | What it is | sha256 (first 12) |
|---|---|---|---|
| verify_version.py | `6373279` (Fable, 2026-11-26 19:03) | the gate (Mirror check); identical to `tools/verify_version.py` today | 36f6ffeb3a5f |
| song-standard.md | `1c6dca2` (Fable, 2026-11-26 19:04) | the Mirror standard as Fable left it (the live one was corrected 2026-11-27, steps 2-3) | 2731410523b1 |
| hob-eih-player-4-mirror.json | `e862899` (Fable) | حب إيه Player 4, the version the owner calls perfect | 17f3115e5645 |
| app.js | `114a9b1` (Fable's last commit) | the app as Fable left it (Slowly listening rules) | 772e747248f1 |
| audio.js | `114a9b1` (Fable's last commit) | the listener and sound as Fable left them | 98345b57f4ca |

Check: `shasum -a 256 tools/fable/original/*`
