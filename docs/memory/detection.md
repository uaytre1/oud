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

## Older facts (2026-11-21)
- Onsets from block treble variance fired every 65 ms: replaced by a peak-held treble envelope.
- Octave-too-low pitch readings: YIN now takes the first local minimum near the best one.
- Readings an octave (or octave + fifth) away count as the right note with tuning unknown.
- Owner's recordings are quiet: peaks around −45 to −50 dBFS, room noise around −65 dBFS.
