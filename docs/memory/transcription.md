---
authority: reference
status: live
---
# From a recording to a lesson: method, lessons learned, open ideas

Written 2026-11-26 by Claude (cloud session) as a handover for every agent on this project (Claude, Codex,
Antigravity/Gemini, local or cloud). It is the reasoning behind the song data, so the next agent does not
repeat the same loops. Numbers and per-song facts stay in `docs/memory/songs.md` and `docs/memory/detection.md`.

## The goal, in the owner's words
"This should be the most consistent thing of the whole app": he gives a video, the app learns the notes and
timing, and plays a computer version that sounds like the song, so a learner can copy it. He judges by ear and
knows these songs well. If a version sounds wrong to him, it is wrong, whatever the numbers say.

## Why حب من تحب sounds right and حب إيه does not (the main lesson)
The difference is the method, not the tool.
- **حب من تحب**: one clean solo recording per version. Notes and timing both come from that one video. Before
  shipping it was checked against the same video: every note within about 30 ms of a real pick, pitch agreeing
  at the pick, chroma of the render against the recording, and the tuned recording played into the coach.
- **حب إيه**: a patchwork. Player 4's measured times; then quick notes removed by ear; then the teacher's caption
  notes written over Player 4's times (he was playing a fill there); then gaps closed by hand. Every patch fixed
  the spot the owner named and broke the next one: a pause before لا (times of a removed fill), a 1.5 s hole
  (the fill removed), a missing ري (part of the fill that was real melody for that player).
- Rule that follows: **a version = one recording.** Never one player's notes on another player's times. If the
  owner prefers the teacher's notes, the version is the teacher's recording, with the teacher's times.
  A "consensus" version is allowed only as its own, clearly named thing, built by a written rule (below), not by
  hand edits.

## The pipeline to standardize on
1. **One recording, tuned once.** Find the player's tuning offset (best fit of all pitches to the maqam), remove it.
   Keep the tuned audio outside git; note the offset and the start time of each pass in `docs/memory/songs.md`.
2. **Picks (onsets): be generous, then filter.** Take the union of the detectors (not 2-of-3: voting drops soft
   up-strokes and leaves timing holes). Then drop an onset when the sound does not get louder there AND it has no
   pick click (the level-jump test in `docs/memory/detection.md`, measured on the owner's own clips). A slide or a
   finger landing has neither; a soft up-stroke has at least one.
3. **Pitch: note events first.** Basic Pitch note events (start + pitch together) as the primary reading; pyin /
   CREPE / PESTO as a second opinion at the pick. Octave rule: the melody stays in the oud's melody range and close
   to its neighbours; a ringing open bass string (فا, لا) under the melody is not a new note unless there is a
   pick with a level jump at that pitch. Quarter tones: decide from the maqam, then measure the player's own
   placement (مي half-flat sits near 51.3, about 20 cents under the exact quarter tone).
4. **Write the rhythm in beats as well as seconds.** Estimate the beat from the picks, store each note's position
   in beats (rounded to a sensible grid for that song) next to the measured seconds. A pause or a rush then shows
   as "half a beat late" instead of hiding in decimals. Not built yet: today the data is seconds only.
5. **Check against the same recording before shipping**: every note within 50 ms of a real pick; no real pick
   (level jump over about 8 dB) without a note unless it is marked as a decoration; render over the recording and
   compare by ear at the unsure places only. List those places for the owner instead of asking "does it sound right?".
6. **Check against other recordings as a second opinion**: `tools/check_rhythm.mjs` prints phrases whose gaps
   disagree with the other players. It is a pointer to listen, not a verdict: players really do differ.
7. **Then the lesson layer**: melody / repeat / decoration flags, lines split at long notes, string and finger.
   These are choices on top of the measured notes and must never move a note's time.

## The gate (`tools/verify_version.py`), draft
One command that checks a version against its own recording and prints the places that disagree (note with no
pick, wrong pitch, off time, clear pick with no note). First results, 2026-11-26, tuned recordings from Claude's
scratchpad:
| Version | Score | What it printed |
|---|---|---|
| حب إيه Player 4 | 68%, FAIL | لا at 5.13 s: "the recording plays صول"; clear picks at 5.52 s (صول) and 5.91 s (ري) with no note: the fill that was removed, which the owner heard as a pause and a missing note; 9 notes with no pick |
| حب من تحب Player 1 | 66%, FAIL (false alarm) | 22 "wrong pitch" (pyin pulled by ringing strings), 11 "no pick" in fast runs |
So the idea works on the broken song, but the detectors inside are too crude: the known-good version must pass first.
**First job for the next agent:** put the standard detectors in it (Basic Pitch note starts, union of onsets with
the level-jump filter, melody-range octave rule) and calibrate until حب من تحب Players 1 and 2 pass at 95%+
(they measured 96% / 94–100% on 2026-11-22, table in `docs/memory/songs.md`). Then every version of every song
goes through it, and nothing ships below the bar. This is the consistency the owner is asking for.

## How to build a "consensus" version, if the owner wants one
Only when three or more recordings of the same passage exist.
- Notes: keep a note when at least half the players play it at that place (alignment by note names, as was done
  for the melody marks, see `docs/memory/decisions.md`). A note only one player plays is that player's decoration.
- Rhythm: per phrase, take the median of each gap's ratio to the previous gap, then scale to one tempo.
- Name it "Main" or "Consensus", say in `about` which recordings it came from, and keep each player's own
  version untouched next to it so the owner can always compare.
- Today's حب إيه "Main" is NOT built this way: it is Player 4 with hand edits. Rebuilding it by this rule from the
  owner's newer solo videos is the first job (see "What to do next").

## Playback (the Listen step)
- The truest Listen is the recording itself. When a version has a recording loaded on the phone, Listen should
  play that, in sync with the notes. Other people's recordings may not go in this public repo (rule in
  `AGENTS.md`); only the owner's own playing could ever ship inside the app, and only if he decides so.
- The synth is for Slowly, single notes, and versions without a recording. Its known faults: (1) re-striking the
  same string restarts the same buffer at the same loudness, so fast صد رد sounds choppy: damp the old voice on
  that string over a few ms and vary gain and brightness slightly per stroke (down vs up); (2) the two strings of a
  course beat too strongly on low notes, which also disturbs self-tests (`docs/memory/detection.md`).
- Sampled plucks from the owner's own oud would be the best sound; it needs clean single notes on every string
  (open, fingers 1–4), recorded lossless. His calibration take shows his tuning (`docs/memory/detection.md`).

## Why the app's listening is inconsistent, and the order to fix it
Measured on his own recordings (2026-11-24/25):
1. False notes in normal playing: he played 12 picks, the app heard 46. Fixed in part (25) by the level-jump test.
   A stricter setting reached 17 but dropped real notes in fast passages.
2. Tremolo: 43 strokes in 7 s; the detector reports 47 onsets (good) but the filters keep about 22. Letting fast
   same-note repeats through brought the false notes back (40). Idea not tried: recognise a tremolo *run* (three or
   more evenly spaced same-pitch onsets) and only then relax the filter.
3. Octave slips on fast strokes of string 3 (fixed for readings below the low فا).
4. In time judging on a real oud is untested; his one take was 0.1–0.5 s early on every note. Check the mic-delay
   estimate before blaming his timing.
The honest state: Slowly on a song works on synthetic audio; on his real oud nothing is proven except his takes.
Every listening change should be tested on his recordings first, synthetic second.

## Ideas worth trying (not done)
- **One command**: `video in → version file + list of unsure places + A/B audio (recording, then render)`.
  Today these are separate scripts and hand steps, which is where the inconsistency comes from.
- **A/B by default**: every new or changed version is sent to the owner as "real, then computer" for each line,
  with the unsure places named by time. He should never have to find the wrong spot himself.
- **Score following for judging**: in In time, follow the player through the expected notes (DTW/HMM as in
  `tools/follow`) instead of matching free onsets; extra onsets then cannot become wrong notes.
- **Per-player calibration in the app**: a one-minute "teach the app your oud" step (open strings, a few picks)
  that sets the level-jump and click thresholds for that phone and oud.
- **Levels**: the path has 8 stages for beginners; advanced players need full songs, taqsim phrases and speed.
  Keep one path, add stages; do not fork the app.

## What to do next (in order)
0. Finish the gate (section above) so it passes حب من تحب and fails the patchwork.
1. Rebuild حب إيه from the owner's own solo uploads, one version per recording, with steps 1–5 above; send A/B
   audio per line; let him pick the main one. Stop hand-editing Player 4.
2. Same for أحب الليل والسهرة (it has one weak lesson recording; he said he will send more).
3. Fix the synth re-strike; make Listen use the loaded recording when there is one.
4. Then the listening items in `TODO.md` section A.
