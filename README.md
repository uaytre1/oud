# Oud Coach

A web app that listens to the oud through the microphone and coaches one song: the intro of
Umm Kulthum's حب إيه (maqam Bayati on Re). Works on iPhone/iPad Safari and Chrome. No install,
no server: plain HTML, CSS and JavaScript.

## What it does
- **Learn**: the 4 lines of each pass with string and finger for every note. Tap to hear, play a
  line, loop, slow down. Pass 1 is the first time through; pass 2 is the repeat with فا فا فا فا.
- **Practice**
  - *Wait for me*: shows one note, waits until you play it right, then moves on. Says which way
    to move the finger when a note is off.
  - *Play along*: 4-click count-in, moving highlight, then judges notes, tuning and timing.
  - *Free play*: play at any speed; tempo is worked out first, then notes, tuning and rhythm
    (how long each note is compared with the others) are judged.
- **Tuner** for all 6 strings (string 5 is selectable).
- **Progress**: every take is saved on the device with its recording; replay it, or tap
  *Send to Claude* to share the report and audio (share sheet), and ask Claude how it went.

## How the listening works (`js/detector-worklet.js`, `js/audio.js`)
- Runs in an AudioWorklet so timing is sample-accurate.
- Picks: a peak-held treble envelope (the pick click) plus a slower broadband rise (soft picks).
- Pitch: YIN on a low-passed copy at ~11 kHz, 70–700 Hz. When no reading is clear-cut it prefers
  the first near-best period, which avoids octave-too-low errors.
- A note = a pick + the median pitch 30–170 ms after it. Pitch moves without a pick become
  "slid" notes. Repeated picks of the same note are not counted as mistakes.

## How a take is judged (`js/analyze.js`)
Notes are aligned to the reference with Needleman–Wunsch (pitch cost + timing cost), tempo is
fitted with a robust line (Theil–Sen) in free play, then each note is graded. Readings an octave
(or octave + fifth) away count as right with tuning unknown, because strings ringing together
make that ambiguous. Tuning tips only when the pitch held steady and was off by more than 35 cents.

## Where the song data comes from (`js/song.js`)
Note times were measured pick by pick from real recordings of the intro (pass 1 from one player,
pass 2 from another, scaled to the same speed). No third-party audio is included in this app.
The half-flat مي target is 51.3 (about 20 cents under the exact quarter tone), as real players play it.

## Tested (2026-11-21, headless Chromium with recordings fed in as the microphone)
| Input | Result |
|---|---|
| Computer-played reference, all lines | 100% notes, 100% tuning, 100% rhythm, no tips |
| Real player, pass 1 | 100% notes, 100% tuning, 91% rhythm (remaining tips are his real decorations) |
| A learner's line 1 clip | all notes found; flags سي −38 cents and a slide (matches a manual analysis) |
| A learner's line 2 clip | "لا came out as لا♭: too low by a half step" (matches) |
| Real player, pass 2 (فا ×4) | 85%: all four فا found within 0.03 s; misses are fast decorations |
| Play along, timed input | every note within 0.01 s |
| Wait mode, line 1 | steps through all 7 notes |
| Tuner, Re string 25 cents flat | "String 3 · −25¢ · tighten a little" |

Also tested: a take is recorded, saved, listed, and Send produces the report (JSON) and audio (m4a).

Not tested yet: a real iPhone microphone (latency, noise).

## Files
`index.html`, `style.css`, `js/app.js` (screens), `js/audio.js` (mic, notes, oud sound),
`js/detector-worklet.js` (picks + pitch), `js/analyze.js` (grading), `js/song.js` (song data),
`js/takes.js` (saved takes, recording, sharing).

## Run locally
`python3 -m http.server 8000` in this folder, open http://localhost:8000 (the mic needs
localhost or https).
