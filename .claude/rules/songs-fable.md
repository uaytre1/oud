---
paths:
  - "js/songs/**"
  - "tools/fable/**"
  - "tools/lab/**"
  - "tools/verify_version.py"
---
# Song Data & Fable Mirror Standard (Mandatory)

1. **Zero ear-guessing:** Every song version MUST be measured with Fable's `pyin` (30–120 ms after each pick, full oud range `midi 38–80`) + per-note low-octave energy check (`docs/memory/songs-and-audio/fable-method.md` §4).
2. **Mandatory two-tool gate before shipping:**
   - `node tools/plain/notes.mjs <song> | python3 tools/verify_version.py --version <id> --media <tuned.wav> --start <s> --strict --rise 5.0` → MUST `PASS`.
   - `python3 tools/lab/match.py <tuned.wav> <vjson> <start> js/notes.js <out.json>` → check `different note` count and cents.
3. **Never tighten timing below `0.06 s`** onto raw onset peaks (`docs/memory/songs-and-audio/lab.md` §3).
4. **Never modify `tools/fable/original/`** (frozen read-only baseline).
5. **Quiet-machine `Slowly` 3× check:** Run `tools/render_versions.js` (`MAIN=on`) + `tools/run_test.js` 3× sequentially with nothing else running on the 8 GB Mac.
