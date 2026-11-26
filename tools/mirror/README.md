# Mirror candidate builder (song-standard steps 1-5)

Builds a version's notes from ONE recording by `docs/memory/song-standard.md`. Code only; audio stays out of git.
Needs the team Python with librosa + basic-pitch (ONNX, about 1 s for a 90 s clip) and, for the render, Playwright
with the site served on port 8765.

1. `offset.py raw.wav "<maqam pitch classes>"`: tuning offset (pyin frames fitted to the maqam). Tune with ffmpeg
   `asetrate=44100*2^(-off/12),aresample=44100,atempo=2^(off/12)`.
2. `bp.py tuned.wav bp.json`: Basic Pitch note events.
3. `build.py tuned.wav bp.json '<keys json name->midi>' t0 t1 cand.json`: step 3. A pick = Basic Pitch events
   within 45 ms; pitch = the strongest event, snapped to a song key; kept when the level jumps 5 dB or more or the
   treble click rises `CLICK` dB (default 6, the app's click gate in `docs/memory/detection.md`), the pitch lasts
   60 ms, and it is not the same pitch within 70 ms; octave set by the neighbours.
4. `step5.py cand.json tuned.wav <repo> final.json`: step 5 loop with `tools/verify_version.py --strict`: moves
   off-time notes to the recording's pick, keeps "not there" notes that pass at `--rise 3.5` (soft), deletes the
   rest and second detections. It never adds a note: stray and soft picks are only listed.
5. `render_notes.js notes.json out.wav`: the app's own oud sound for the A/B (real, then computer, 60% slow).

Candidates made with it: `tools/candidates/hob-eih-solo92-mirror.json`, `tools/candidates/ahib-al-lail-solo-mirror.json`.
