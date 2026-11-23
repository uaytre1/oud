---
authority: reference
status: live
---
# Architecture

Static site, no build step, no server. Plain ES modules loaded by `index.html`. Deployed by
`.github/workflows/pages.yml` on every push to `main` (live within about a minute).

## Files
| File | Role |
|---|---|
| `index.html` | All screens as `<section class="screen">`: home, song, lesson, tuner; sheets for settings, takes, first-day card |
| `style.css` | Theme tokens (dark default, light via prefers-color-scheme), layout, phone and iPad rules |
| `tuner.css` | Tuner styles |
| `js/app.js` | Screens, routing, lesson steps, practice engine, settings, takes sheet. Sections marked `// ----` |
| `js/tuner.js` | Tuner logic (string detection, cents, needle) |
| `js/audio.js` | Two separate parts: `Listener` (mic → picks + pitch → notes) and the oud sound (synth, `playNote`, `renderOffline`) |
| `js/detector-worklet.js` | AudioWorklet: pick (onset) detection with a "click" measure, YIN pitch frames |
| `js/analyze.js` | Judging a take: alignment, tempo, pitch rules (`pitchMatch`), timing, tips |
| `js/library.js` | Song list, builds passes, Simple version, `groupsOf` (repeated picks ×n), main-notes filter |
| `js/notes.js` | Note keys → Arabic name, string, finger, pitch; the 6 strings; quarter-tone names |
| `js/songs/hob-eih.js` | One file per song: versions → passes → notes `[time, key, line, flag]` |
| `js/takes.js` | Saved takes (IndexedDB) and Send to Claude (share sheet) |
| `js/media.js` | Real recordings the owner loads on his phone (IndexedDB, never uploaded) |
| `js/pace.js` | Right hand · risha in 3 steps: Watch (computer plays it slowly, boxes light up), Step by step (no metronome, waits for each stroke, checks the string), With the click (timed). Steady strokes and مقسوم, إيقاع عربي, رومبا; Bayati-scale option. Each box shows the string (S6 = قرار on low فا, S3 = ري) |
| `js/songs/warmups.js` | Left-hand warm-ups (open strings, fingers, Bayati scale), an `exercise` played through the lesson steps |
| `tools/transcribe/transcribe.py` | Finds the notes in a recording (vote of detectors); see its README |
| `tools/follow/follow.py` | Follows a known song in any oud video; overlay videos with the notes |
| `js/awake.js` | Keeps the screen on in lessons and the tuner (Wake Lock + silent video on iPhone) |
| `awake.mp4` | 1.5 KB silent black video used by `js/awake.js` |
| `tools/run_test.js` | Drives a lesson in headless Chromium with a WAV as the mic |

## Screens and routes (hash routes, so iOS swipe-back works)
- `#/` home: songs with progress, Tune, My takes.
- `#/song`: version chips, part tabs, the lines as a path (✓, stars, "next").
- `#/lesson/<line|all>/<listen|slow|time>`: one line, three steps. One main button at the bottom.
- `#/tuner`.
- `#/daily`: daily practice (tune, right hand, left hand, your song), a tick per item per day and a streak.
- `#/pace`: right hand · risha trainer.
- Progress lives in localStorage `oudcoach.prog`, per song / part / line.

## Listening, in one paragraph
The worklet posts pitch frames (YIN, 70–700 Hz) and onsets (treble jump). For each onset it also measures
the pick "click" (treble rise against the 12–90 ms before). `Listener` turns an onset plus the median pitch
30–170 ms later into a note, and drops an onset with no click when it repeats the pitch that is still
ringing (details and numbers: `docs/memory/detection.md`). Slowly waits for the expected note; In time
matches notes live to the sliding chips and judges the take at the end with `analyzeTake`.

## Data model
- A song lists versions; a version lists passes; a pass lists notes `[time_s, key, line, flag]`.
  flag `g` = extra/decoration, `r` = same note picked again. "Main notes only" drops both.
- A version with real timing can have `media: { file, duration, starts: { passId: seconds } }` naming the
  recording the owner loads; files are matched by name, then by length (±0.6 s).

## Takes (what the owner sends)
Send to Claude shares two files named oud-take-DATE-TIME: a `.json` report and an `.m4a` recording (the
Claude app may zip them with a prompt.txt). JSON fields: song, version, passTitle, partLabel, mode
(`wait` = Slowly, `along` = In time), speed, score {notes, tuning, timing, tempo, latency}, tips, items
(each expected note: status ok/wrong/missed, cents, dt seconds, heard), heard (every detected note with
time and pitch), waitMistakes (Slowly), device. Read the JSON, run the m4a through the detector if needed
(`docs/memory/testing.md`, "Replaying a take"), and answer in plain words.

Right-hand (risha) takes are named oud-risha-DATE-TIME and have `kind: "risha"`: partLabel (the rhythm), mode
(`step` = Step by step, `time` = With the click), bpm, click, scale, score (step: strokes, wrong; time: onTime %,
missed, strings %, notes %, meanMs, sdMs, latencyMs), tips, strokes (step: every stroke heard, with want / where /
heard / ok, and `ignored` for an echo of the last stroke; time: every expected stroke with t from the first beat,
heard, offMs after the mic delay, status on time / early / late / missed / wrong string / wrong note), heard (time).
