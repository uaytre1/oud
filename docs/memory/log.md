---
authority: reference
status: live
---
# Log (newest first)

Format: `## YYYY-MM-DD [agent] short title`, then what changed, what was tested, and "Next:". Never edit
another agent's entry; add a correction line. Keep entries short; details belong in the topic files.

## 2026-11-22 [claude] Ringing notes, versions, sound, tuner, shared memory
- Owner sent a real iPhone take (Slowly, Hob Eih Player 4, 47 "wrong" notes). Cause: the double course
  beats while ringing, the onset detector fired on the swells, and the ringing pitch was reported as a
  new note. Fix: pick-click gate (`docs/memory/detection.md`); Slowly ignores the note just played if heard
  again within 0.5 s. Quarter tones widened to −25/+45 cents (his textbook مي was rejected before).
- Versions are now chips on the song screen. Listen (and In time "Hear it") plays every pick of the version.
- Helper agents (Claude subagents): one rebuilt the tuner (`js/tuner.js`, `tuner.css`) toward a Pano-like
  feel; one retuned the oud synth in `js/audio.js` against 109 real picks (spectrum spread vs real 13.4 dB →
  1.9 dB; a decay bug fixed); one is re-transcribing حب من تحب from the owner's three new videos.
- Created this shared memory (`AGENTS.md`, `docs/memory/`) and the docs check (`tools/check_docs.py`).
- Tuner (shipped): own mic analysis in `js/tuner.js` (about 60 readings/s), octave-safe string choice, a string
  is only taken up after a pick, ±10 cents green, 4 s hold, tap a string to lock. Cause of "not working": the
  old gates dropped 90 of 112 frames of his quiet real F2 picks, and the low strings read an octave high.
  His F string read +35 to +41 cents in that take (sharp).
- Oud sound (shipped): `js/audio.js` sound section only; A/B clips of Hob Eih line 1 (old, new, real) were
  made for the owner. Nobody has listened to it yet.
- حب من تحب: the helper stopped early (account usage limit reached) before writing any song data. Its notes
  are in Claude's session scratchpad (folder hmt). Not started in the repo.
- Tested together after merging: all Slowly self-tests (18/18, 34/34, 43/43), In time Player 4 96%/100% and
  Simple 100%/100%, tuner −25 cents sine read −25 and held, takes save and send, screen kept awake.
  Not tested on his phone.
- Sent the owner 7 check videos (app sound + note on screen) for Hob Eih Player 4 and Original 1–3, Ahib
  Lesson, Hob Min Tihib Player 1 and Tónos, so he can say by ear which lines sound wrong. Waiting for his verdict.
- Next: re-transcribe حب من تحب from the three videos (method in `docs/memory/songs.md`); ask the owner to retry
  Slowly on line 1 and the tuner, and to send a take (Save to Files, attach in the same chat).

## 2026-11-22 [claude] Screen sleep
- Screen kept on in lessons and the tuner (`js/awake.js`, `awake.mp4`). Tested in Chromium as an iPhone.

## 2026-11-22 [claude] Review round with three fresh-eyes subagents
- Reviewers: first-time beginner flow, look/phone ergonomics, teaching value. Fixed their top issues:
  honest stars, Stop = cancel, In time shows the coming note, results replace the card, readable neck,
  RTL fixes, quarter tones, mic-delay correction, help after 3 misses, first-day card, iPad layout.
  Their idea list is in `TODO.md` (section 0b).

## 2026-11-22 [claude] Guided path rebuild
- Owner: "the interface is the problem". Rebuilt as home → song path → lesson (Listen, Slowly, In time).

## 2026-11-21 [claude] Library, real recordings, new songs
- Song library with versions measured from real videos (Hob Eih Players 1–4, Lesson; Original from
  archive.org); real-recording player with notes in sync; أحب الليل والسهرة and حب من تحب added; main-notes-only
  switch. First version of the app (tabs) built and deployed to GitHub Pages.
