# To do

## Next
- [ ] Test on the owner's real iPhone/iPad mic: does it catch every pick? Tune sensitivity and latency.
- [ ] Record the owner's own oud, one note per string/position, and use it as the playback sound.

## Songs
- [ ] **Create a song from an uploaded video.** The owner uploads a video of someone playing; the app
  writes out the notes, timing and string/finger for each version, and adds it to the library.
  The method already works offline (see "How versions are transcribed" in README.md): tuning offset,
  picks from the attack, pitch every 50 ms, read note by note, checked against the recording. Next
  step is to run it in the browser (or through Claude) and let the owner confirm or fix notes.
- [ ] More of حب إيه: the next part of the intro (after line 4), and the second time for Player 1.
- [ ] More songs, chosen by the owner.

## Coaching
- [ ] Latency calibration (play along with a click once, store the offset).
- [ ] Tremolo (fast repeated picking) as its own skill, with a tempo target.
- [ ] Practice plan: "today: line 2 ×5 in wait mode, then play along at 75%", built from past takes.
- [ ] Optional automatic sync of takes to a private repo so Claude sees them without tapping Send.

## Done
- [x] Tuner, song map, wait / play along / free play, feedback, saved takes, Send to Claude (2026-11-21).
- [x] Song library with versions: Player 1–4, Lesson, Simple; repeated picks shown as ×n (2026-11-21).
