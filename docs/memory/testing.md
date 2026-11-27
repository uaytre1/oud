---
authority: reference
status: live
---
# Testing

Every change is tested before it is shown to the owner. Say plainly what was and wasn't tested.

## How
- Serve the repo: `python3 -m http.server 8765`. Playwright and Chromium drive the page headless.
- Fake mic: launch Chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
  --use-file-for-fake-audio-capture=<wav>%noloop` and grant the microphone. The WAV must be 16-bit PCM
  with about 1 s of silence first and some silence after.
- `tools/run_test.js <wav> <line|all> <slow|time> <seconds>` opens a lesson step and prints what was heard,
  the result and the lane states. Env: SONG, VERSION, PASS, MAIN (on/off), SPEED (0.6–1, In time).
- `tools/render_versions.js <dir>` renders every version with the app's own oud sound (self-test input).
- `tools/tuner_test.js <wav>` and `tools/take_test.js <wav> <outdir>` test the tuner and saving/sending takes.
- In time needs the audio to start at the count-in: 0.3 s + 3 beats, beat = `songBeat` in `js/app.js`
  divided by the speed. Shift test WAVs with ffmpeg `adelay` to match.
- Timing tests are sensitive to CPU load: when several agents run Chromium at once, re-run before believing
  a timing failure.
- Look at the screens: screenshots at iPhone SE, iPhone 13 (light and dark) and iPad landscape.
- `tools/lab/shots.cjs <port> <wav> <outdir>` (env PWMOD = the playwright module): phone-size screenshots of every
  screen, including practising and the result with a fake mic. Since design D (2026-11-27) the app is dark only.
- `tools/lab/feature_test.cjs <port> <right.wav> <wrong.wav> <outdir>`: the design D features (Check my take, Replay,
  loop switch, maqam card) in a real page, PASS/FAIL per check plus screenshots.
- **Read the errors, not only "95/95"**: with mistakes, "Again in 4…" starts a second session by itself and the fake
  mic restarts; a test window longer than the song then reads that second session ("stopped at note 6", 2026-11-27).
  Keep the Simple window at 80 s.
- **Keep the machine quiet during a round**: a download during a test sent the load to 9.5 and one حب من تحب run to
  18/63 (2026-11-27); the rerun on a quiet machine was 63/63 three times.

## Replaying a take
Convert the owner's m4a to mono 44.1 kHz WAV with 1 s of silence in front, then play it into
`#/lesson/all/slow` and read `window.__coach.listener.log` (onsets, frames, skipped) and `window.__coach.notes`.
Compare with an offline analysis of the same audio (librosa pyin + onsets) to label real picks.

A free recording (not a lesson) can be fed straight to a fresh `Listener` from `js/audio.js` in a page (fake mic
= the WAV): collect `onNote` (t, midi, rise), `onFrame` and `log.skipped`. Spoken notes in the owner's memos:
faster-whisper (`small`, language en and ar) on 16 kHz mono; pass the samples as an array (the installed PyAV
rejects file paths).

## Test audio
Kept out of the repo (third-party or the owner's own playing). Claude's copies are in its session scratchpad;
regenerate synthetic inputs with `tools/render_versions.js` when they are missing.
Checking note data of tunes and drills: the app's own render beats on low courses and can add false wrong notes
(`docs/memory/detection.md`). Use a plain one-string pluck render where re-picking the same note stops the old
vibration first (`tools/plain/notes.mjs` piped into `tools/plain/render.py`).
`tools/run_test.js` now prints each heard note's click rise (`/r…`).

## Known results (dated; newest first)
| Date | Input | Result |
|---|---|---|
| 2026-11-22 | Simple versions of all 3 songs, Slowly, app's own sound | 18/18, 34/34, 43/43, no mistakes |
| 2026-11-22 | Hob Eih Player 4 render, In time 100% | notes 96%, on time 100%, ★★★ |
| 2026-11-22 | Hob Eih Player 4 line 1 at 60% | notes 100%, on time 86%, ★ |
| 2026-11-22 | Same take 0.3 s late | "Steady, but behind the beat", no stars |
| 2026-11-22 | مي played as natural Mi or Mi♭ in Slowly | rejected (stops at مي) |
| 2026-11-22 | Owner's iPhone take replayed (pick-click gate) | 77 → about 43 notes, false repeats gone |
| 2026-11-22 | New tuner, Re string −25 cents (sine) | String 3, −25¢, held 4 s after the sound stops |
| 2026-11-22 | New tuner, 6 strings clean / detuned / plucked / noisy / weak fundamental | right string every time, error ≤ 3.7¢, settles in 60–200 ms |
| 2026-11-22 | Stop halfway in In time | nothing saved, "Stopped" |
| 2026-11-21 | Real performances into their own versions (free play) | Player 1 100%, 2 94%, 3 90%, 4 93%, Lesson 82% |
| 2026-11-21 | Real-recording sync, sampled moments | 41/43, 63/63, 108/108, 74/78 |
Not tested by an agent: the owner's real iPhone mic in his room (he tests and sends takes).
