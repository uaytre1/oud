---
authority: reference
status: live
---
# Listening: measured facts (registry)

Numbers here were measured; each says when and on what. Change the code and this file together.

## Pick "click" gate (2026-11-22, owner's iPhone take, 104 s, Slowly on Hob Eih)
- Problem: a ringing note was heard again and again. The two strings of a course beat, so the level swells,
  and the onset detector fired on the swells. The note tracker then reported the ringing pitch as a new note.
- Measure: treble (above 1.8 kHz) level, smoothed over 3 blocks of 64 samples, max in the 44 ms after the
  onset against the minimum 12–90 ms before it (`hfSmooth` in `js/detector-worklet.js`).
- Result: real picks rose 14–50 dB (median about 35). Swells and finger lifts rose 2–9 dB.
- Rule in `js/audio.js` (`_finishPending`): drop an onset when it is more than 0.42 s after the last note and
  (click < 6 dB, or click < 10 dB and the pitch equals the ringing note or an octave of it).
  Within 0.42 s every onset is kept, because fast repeated picks (×4, tremolo) can have a smaller click.
- Effect on that take: 77 heard notes before, about 43 after; every remaining note lines up with a real pick
  except 3 within 0.4 s of a pick. Slowly also ignores the note just played right if it is heard again
  within 0.5 s.
- On a fast TikTok performance (Hob Eih Player 4) nothing was dropped (all its onsets come within 0.42 s).

## Quarter tones (2026-11-22)
- Players measured from videos put مي half-flat at 51.3 (MIDI), about 20 cents under the exact quarter tone.
- The owner's take put it at 51.5–51.7 (the textbook spot) once he found it, and at 52.2 (natural Mi) before.
- Rule in `js/analyze.js` (`pitchMatch`): a quarter-tone note is right from −25 to +45 cents around its
  target. Mi♭ (−30) and natural Mi (+70) are wrong. Other notes: ±60 cents, or the nearest scale note
  within a half step.

## Mic delay (2026-11-22, headless Chromium fake mic)
- Every note arrived 0.11 s late through the fake mic. In time removes a steady delay of up to 0.15 s
  (median offset) before judging timing; anything beyond it is the player's own timing.
- Not measured on the owner's iPhone yet. His takes report `score.latency` in ms when In time is used.

## Level-jump gate (2026-11-25, owner's three phone videos + the calibration take)
Clip 1 (17.7 s, phone video): he played 12 clear picks of the حب إيه phrase (فا فا فا · صول فا صول لا · صول فا مي ري);
the Listener reported 46 notes. The extras had click rise 2–20 (overlapping real picks, 13–20), so the click gate
cannot separate them. What does: **how much the level (dB) jumps at the onset** (loudest frame in the 60 ms after
minus quietest in the 90 ms before, from the worklet's own frames).
| Section | Real picks: level jump | Extra notes: level jump |
|---|---|---|
| Clip 1, normal playing | 8–24 dB | mostly 0–4 (27 of 34 under 4) |
| Calibration 60–78 s, slow + 4 fast picks | 12–28 | 11 of 13 under 4 |
| Calibration 138–171 s, صد / صد رد / tremolo | mostly 5–9, a few 0–4 | 47 of 72 under 4 |
Rule in `_finishPending` (`js/audio.js`): drop an onset when BOTH are weak: its jump is under 5 dB (under 4 when the
last note was 0.3–0.6 s ago, under 3 when under 0.3 s ago) AND its click rise is under 13. The jump alone dropped
real notes in fast passages (other strings still ringing: حب إيه's own render fell to 8 of 26; those notes had click
13–27). "Before" looks back 0.2 s but never past the last accepted note (an onset can be reported late).
Result: clip 1 46 → 25 notes (all 12 real kept); slow + fast picks 27 → 22 (all 14 kept); strokes section 120 → 75
(37 of 53 reference picks found, was 50). With the jump alone it was 17 / 15 / 62: stricter is possible once fast
passages have another safeguard. Reference picks = librosa onsets with a ≥5 dB jump; for tremolo that
reference is itself unsure, so fast strokes are the weak spot still. Notes carry `lvl`; dropped onsets are in
`log.skipped` as [t, midi, rise, lvl]. Clips 2 and 3 (3.5 s, 6.8 s) were too short to tune on.

## Owner's calibration take (2026-11-24, Voice Memos lossless, 213 s, run through the app's own Listener)
He played: open strings thickest first, each string picked slowly then fast, صد / صد رد / tremolo on string 3,
fingers 1–4 on low strings, muting. Not played: the Bayati scale ("I don't know it yet") and the slide. Spoken
notes transcribed with faster-whisper (small). Recording stays in Claude's scratchpad, never in git.
- **His tuning:** S6 ≈ 37.1 (between دو and ري; target not confirmed), S5 فا 41.0, S4 لا 44.8 (−20 cents), S3 ري 49.9,
  S2 صول 55.1, S1 دو 60.0. So the low فا (قرار) is his string 5. Settings now has "String 6 is tuned to".
- **Ringing swells after slow picks:** rise 2–10 dB; the slow click gate skipped 35 of them. Works on his oud.
- **Real fast repeats** (4 quick picks on دو): rise only 5–8. Rise cannot tell a fast real repeat from a swell, so
  fast onsets (< 0.42 s) are not gated by rise. (A rise gate tried on the app's own render dropped real repeats too.)
- **Double onsets on slow picks:** a weak onset (rise 11–18) 0.07–0.15 s before the real pick (31–44). Step by step
  ignores a second stroke within 0.18 s (was 0.12).
- **Octave slips:** fast strokes on string 3 (49.9) read an octave down (37.9) in the later frames: 37 of 117 notes.
  New rule in `_finishPending`: below 40.5 and not on one of the oud's own low strings (`listener.openLow`), when the
  early readings sit an octave above (or the stroke just before was that note, tremolo) take the upper octave.
  Result on the take: 7 of 112 left; low-string notes unchanged. His low strings slip an octave **up** in some
  readings (فا 41 → 52.9, لا 44.8 → 56.8 first frames) but the true pitch is always among the early readings.
- The app's own oud sound (two strings per course) makes onsets 0.1–0.4 s after low picks with rise 15–19, much
  stronger than his real oud's swells: self-tests of tunes on low strings can show false wrong notes. Check note data
  with a plain one-string render instead (see `docs/memory/testing.md`).

## Older facts (2026-11-21)
- Onsets from block treble variance fired every 65 ms: replaced by a peak-held treble envelope.
- Octave-too-low pitch readings: YIN now takes the first local minimum near the best one.
- Readings an octave (or octave + fifth) away count as the right note with tuning unknown.
- Owner's recordings are quiet: peaks around −45 to −50 dBFS, room noise around −65 dBFS.
