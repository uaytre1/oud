# Oud Coach

A web app that listens to the oud through the microphone and coaches you through songs.
Live at https://uaytre1.github.io/oud/. Works on iPhone/iPad Safari and Chrome. No install,
no server: plain HTML, CSS and JavaScript.

**Songs:**
- أحب الليل والسهرة (Badr Al-Laimoun), Bayati on Sol: Lesson (measured from a lesson video, all 34 sheet
  notes found) and Note sheet (Darwisha, two ways). Simple is made automatically.
- حب من تحب, Nahawand on Sol: Player 1 (measured from a performance video, all 43 Tónos notes found) and Tónos.
- حب إيه (Umm Kulthum, music Baligh Hamdi), the intro, in nine versions (four of them under "More versions"):
- **Original**: transcribed from the original recording (orchestra, Bayati on Do), moved up 2 half
  steps into oud key: first time, second time and the middle part, with real timing.
- **Player 1–4, Lesson**: transcribed from oud performance videos, with real timing.
- **Simple** (the Original's notes at an even pace), **Note sheet** (whole intro, 14 lines) and
  **Tónos**: notes only, even pace.

## What it does
Pick a song, then a line. Each line has three steps, and the coach shows what to do next:
1. **Listen**: the line plays (the real recording if it is loaded, otherwise the computer oud) with
   the current note shown big, where to play it on a drawn neck, and the notes lighting up.
   Slow / Medium / Real speed, pitch kept.
2. **Slowly**: one big note at a time; the coach waits until you play it right, then moves on.
   The screen flashes green or red, and says which way to move the finger when a note is off.
   A live "I hear" readout and level bar show the mic is hearing you.
3. **In time**: 3-2-1 count-in at the song's beat, the notes slide to a gold line, which flashes
   green or red as you play; the big card shows the note coming next. Afterwards: right notes %,
   on time %, one tip. Speeds 60–100%; a clean take (notes ≥ 80% and on time ≥ 70%) offers "Faster",
   then the next line. A steady mic delay up to 0.15 s is removed before timing is judged. Stop = cancel.
- Slowly: quarter tones (مي, لا half-flat) must be within about ±30 cents; after 3 misses on one note
  it offers "Hear it" and "Skip". A first-day card explains string and finger numbers.
- Each song shows its lines as a path with ✓ and stars (★ slow, ★★ medium, ★★★ full speed); progress
  stays on the phone. The last row is the whole part.
- Behind the ⚙︎: version, **Main notes only** (on by default), and loading the **real recording**
  (files come from Claude in chat, tuned to standard pitch). Each song opens on its best version.
- Home: **Tune** (all 6 strings, string 5 selectable) and **My takes**: every take is saved with its
  recording; replay it, or tap *Send to Claude* to share the report and audio.

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

## Songs and versions (`js/songs/`, `js/library.js`, `js/notes.js`)
A song file lists versions; a version lists passes; a pass lists notes as `[time, key, line, flag]`
(`g` quick in-between note, `r` the same note picked again). `js/notes.js` says where each key is
played (string, finger, pitch). To add a song: add a file in `js/songs/` and list it in `SONGS`.

### How versions are transcribed
1. Find the player's tuning offset (best fit of all pitches to the maqam).
2. Print the pitch every 50 ms and every pick (attack), and read the notes one by one.
3. Check: for every moment the recording has a clear pitch, the transcription must say the same note
   (Hob Eih versions: 93–100%), and the octave of every low/high note must match.
4. Drop repeated picks that are no stronger than background noise (they are finger noise, not picks).
No third-party audio is included in this app. The half-flat مي target is 51.3 (about 20 cents under
the exact quarter tone), as real players play it.

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

## The Original version (2026-11-21)
The original recording was found on archive.org (a radio programme with the intro). Its melody was read
with Basic Pitch (Spotify, open source; the highest line, bass removed), gaps checked with a pitch
tracker, and moved up 2 half steps (the orchestra plays in Bayati on Do; oud players use Re).
Check: the app's rendering of the transcription was compared with the recording, frame by frame, as
pitch-class profiles (chroma). Match 0.80–0.85 per section, against 0.63–0.70 for the same
transcription shifted half a second late and 0.56–0.57 shifted a half step — so notes, key and timing
all line up. The original is faster than the oud players: the first time through takes 8.9 s.

## How new songs were transcribed (2026-11-21)
Basic Pitch for note starts, pyin for exact pitch, the player's tuning offset removed, then every played
note aligned to the published note sheet (Needleman–Wunsch): matched = main note, same note again = repeat,
anything else = extra. Notes are matched by name in any octave.
Coach checks (free play, all lines): app-rendered audio: Tónos/Simple/Note sheet 100%, Player 1 98%,
Lesson 89%. Real videos into their own versions: حب من تحب 81%, أحب الليل 65% (heavy tremolo on the
lesson video bends سي toward the half-flat لا at each pick). Sync of the real-recording player: 108/108
and 74/78 sampled moments.
A played note counts as right if the expected note is the nearest note of the song's scale (within one
half step), so maqam intonation and tremolo wobble are not marked wrong; a note a full half step off is.

## More test results (2026-11-21, after the song library)
Each real performance played into its own version (free play, all lines):
Player 1 100% notes · Player 2 94% / 100% (second time) · Player 3 90% / 87% · Player 4 93% · Lesson 82%.
Misses are fast decorated passages (notes of 0.1–0.2 s overlapping). The same versions played by the
app's own oud sound: Simple 100%, the fast versions 82–97%. Wait mode counts all four picks of فا ×4.

## Files
`index.html`, `style.css`, `js/app.js` (screens), `js/audio.js` (mic, notes, oud sound),
`js/detector-worklet.js` (picks + pitch), `js/analyze.js` (grading), `js/library.js` (song library),
`js/notes.js` (where notes are played), `js/songs/*.js` (songs), `js/takes.js` (saved takes, sharing).
`tools/` has the test scripts; `TODO.md` the plan.

## Run locally
`python3 -m http.server 8000` in this folder, open http://localhost:8000 (the mic needs
localhost or https).
