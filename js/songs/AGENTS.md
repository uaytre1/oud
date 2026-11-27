# Song Directory Rules (`js/songs/`)

Before editing any file in `js/songs/`, read `docs/memory/songs-and-audio/fable-method.md` and `docs/memory/songs-and-audio/song-standard.md` (enforced by `.agents/hooks.json` and `.claude/settings.json`).
- Never guess pitches by ear alone: measure with `tools/fable/build.py`, `tools/lab/match.py`, and `tools/verify_version.py --strict --rise 5.0` on lossless `ffmpeg asetrate+atempo` tuned audio.
- Never tighten timing below `0.06 s`.
- Run 3× sequential `Slowly` checks (`tools/render_versions.js` + `tools/run_test.js`) on a quiet machine after any song edit.
