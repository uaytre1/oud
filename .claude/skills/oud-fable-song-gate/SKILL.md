---
name: oud-fable-song-gate
description: Mandatory Fable Mirror workflow for building, checking, or fixing any Oud Coach song version in js/songs/. Use whenever touching song note data or verifying recordings.
---

# Oud Coach — Fable Mirror Song Workflow

Never guess pitches or rhythms by ear alone. Follow these exact steps (`docs/memory/songs-and-audio/fable-method.md` §4):

1. **Tune Recording Losslessly (`ffmpeg asetrate+atempo`):**
   - Measure raw pitch of note 1 with `librosa.pyin` (`fmin=midi 38, fmax=midi 80`) to prove the tuning offset sign (`±0.3` semitones of target).
   - Produce the standard-pitch WAV with `ffmpeg` `asetrate` + `atempo` (never STFT phase-vocoder `librosa.effects.pitch_shift`, which smears risha transients).
2. **Measure Picks & Pitch (`tools/fable/build.py`):**
   - Median `pyin` `30–120 ms` after each pick across full oud range (`38–80`).
   - Check low notes (`< 48`: `faL`, `laL`, `solL`, `doL`) individually for new fundamental CQT energy (`rise1(m)` vs `rise1(m+12)`).
   - Never tighten pick times below `0.06 s` onto raw onset peaks.
3. **Pass Both Mathematical Gates:**
   - `node tools/plain/notes.mjs <song> | python3 tools/verify_version.py --version <id> --media <tuned.wav> --start <s> --strict --rise 5.0` → MUST print `PASS`.
   - `python3 tools/lab/match.py <tuned.wav> <vjson> <start> js/notes.js <out.json>` → verify `different note` and timing gaps.
4. **Quiet-Machine `Slowly` 3× Check + Ear A/B:**
   - Render with `MAIN=on node tools/render_versions.js /tmp/rv <song>` and run `tools/run_test.js` 3× sequentially with nothing else running on the 8 GB Mac (`0` errors).
   - Render a short Real-then-Synth A/B `.m4a` only AFTER both gates pass.
