---
authority: reference
status: live
---
# Log (newest first)

Format: `## YYYY-MM-DD [agent] short title`, then what changed, what was tested, and "Next:". Never edit
another agent's entry; add a correction line. Keep entries short; details belong in the topic files.

## 2026-11-23 [claude] حب إيه 4–8 s: the teacher's on-screen notes are the reference
- Owner: real Player 4 and real Player 1 sound right at 4–8 s; every computer copy (P4 or P1 data) sounds wrong there.
- The a.oudd lesson video (hob-eih-lesson) captions the notes: "سي دو لا صول", "ري مي فا قرار / فا فا فا فا",
  "صول فا صول لا / لا صول فا مي ري" (read at 42–55 s, 64–69 s, 80–82 s). His full-speed playing at the start of the
  video (our Lesson version) matches the captions exactly, except that the first of the five فا must be the قرار
  (low فا). Player 4's data had مي missing after ري, and at 4–8 s plays an extra fill (صول, لا ري ري لا).
- Sent the owner a test: teacher's version / Player 4 with the teacher's notes at 2.5–7 s / the real teacher.
- Next: make his choice the default حب إيه version; use captioned lesson videos as ground truth when available.

## 2026-11-23 [claude] Why the overlays drift; better sources looked for; lines 3–4 test
- Owner: overlays go off after the four فا. Measured: the follower is within ~50 ms until the فا run, then shifts
  +175…+340 ms (Player 2) and −170…−320 ms (Player 3): same-pitch runs confuse it. Player 2's own transcription also
  has two فا picks 0.07 s apart (6.12/6.19 s), likely one pick counted twice. The new note-finder hears that run as
  6 picks, some very soft (6–10 dB click): runs are where every method is least sure.
- archive.org (works from the container): found the studio LP of حب إيه (item oum_kalthoum_hob_eih_vinyl_lp_studio),
  a 1961 live recording, a private session, and Maher El-Ghamri's notation videos. The notation's first page is the
  sung melody, not the oud intro, so it cannot settle the intro. Kept in Claude's scratchpad (folder srcs).
- Sent the owner an A/B/C test of lines 3–4 (now / core from the note sheet / core + players' extras).
- Next: apply his pick to Player 4 lines 3–4; for overlays, draw measured times directly instead of re-finding in runs.

## 2026-11-23 [claude] فا on string 3 with finger 2; Player 4's فا runs moved to string 3
- Owner: the four فا are on string 3, finger 2 (players don't pick the low فا four times). Player 4's low فا runs
  (line 1 ×4, line 3 ×5) are now فا on string 3; the extra فا after line 1's run removed (exactly four).
- Fingering rule fixed in `js/notes.js`: three half steps above the open string = finger 2 (فا, سي♭, low دو).
- Overlays: following another player's version looked off to the owner (players play their own variations); the
  overlays now use each player's own notes. Frame-by-frame finger/string reading was tried on Player 2's video: the
  left hand is out of the picture and the strings blur, so it is not reliable there.

## 2026-11-23 [claude] Repeat until right, daily practice, risha rhythms, overlay tool
- Repeat until right (countdown, ⚙︎ switch); string/finger shown on every chip.
- Daily practice screen and home card (tick per item per day, streak). Right hand · risha trainer (`js/pace.js`):
  steady 1/2/4 per beat and the three rhythms from the owner's lesson video, optional walk on the Bayati scale; the mic
  judges each stroke's timing, bass vs high string, and the note. Left-hand warm-ups (`js/songs/warmups.js`).
- `tools/follow/` committed: follows a known song in any oud video (about 75% of notes within 50 ms on real videos with
  another player's version; 93% on synthetic) and makes overlay videos with the notes (and a computer-oud mix).
- Tested: risha trainer with synthetic strokes (steady 60 BPM 100%, ±10 ms; Maqsum on the scale 100% time, strings,
  notes); repeat restarts a take with a mistake; warm-ups and Hob Eih Simple in Slowly 100%. Not tested on his phone;
  whether the metronome click through the speaker confuses the mic is untested (there is a switch to turn it off).
- Next: owner tries Daily practice; send him the Hob Eih overlay videos; he will send maqam material and single plucked notes.

## 2026-11-23 [claude] حب إيه line 2, string/finger on every note, rhythm at your own speed, note-finding tool
- Owner chose line 2 of Player 4 = صول لا صول (as the Original and the note sheet; Player 4's extra فا, صول picks,
  turn and ري ×4 removed after an A/B/C listening test).
- Every note chip (strip and In time lane) shows string and finger (S2·F1, S3·open); tapping a note shows it big
  with the neck (no sound while the mic listens).
- Slowly now also judges rhythm at the player's own speed: gaps compared with the song scaled to his median speed;
  60–160% of the scaled gap counts. In time gets 40% and 50% speeds; first In time starts at 50%.
- Note-finding research: `tools/transcribe/` (vote of 3 onset detectors and 4 pitch estimators). Synthetic
  benchmark note F1 .974 vs .874 for the old pipeline; Player 4 line 1: 10/10 notes, 2 ms median. On real videos
  about half the notes have split votes (bass octaves), so real accuracy is lower than the synthetic number.
- Tested: Slowly Simple full speed (rhythm 100%, speed 100%) and at 40% (rhythm 96%, speed 40%); chips on iPhone 13.
- Next: score-following helper (tools/follow) still running; owner to hear حب إيه line 3–4 and report.

## 2026-11-23 [claude] حب إيه Player 4: quick flicks removed at the owner's request
- Owner: Player 4 every-note is the best, but line 1 must be "سي دو لا صول": the small سي between two لا
  (a quick flick up and back) is an extra note. Removed it (and the return لا), and the same flick in line 2
  (صول لا صول → صول). Rule for later: a quick neighbour flick X-Y-X under 0.25 s is a decoration the owner
  does not want, even in "every note".
- Tested: Slowly line 1 on a fresh render, 7/7 groups, no mistakes. Research helpers stopped at the usage limit
  (resets 01:30 UTC); their work is saved (tool folders not committed yet).

## 2026-11-22 [claude] Codex review ported; حب من تحب live; حب إيه check videos
- Codex sent a review (patch + notes) made on an older commit. Checked each claim against the current code and
  ported the valid ones by hand (`docs/memory/decisions.md`, "Codex review"). Fixed a real iPhone bug it found:
  Listen with the real recording could stop following the video and leave Stop stuck.
- Tested: mic stop/start twice, leaving mid-take (mic released), double tap, real-recording Listen finishing;
  Slowly and In time on fresh renders (clean 100/100, 0.3 s late caught, Player 4 line 1 at 60% 100/100).
  Old In-time test files no longer line up after the data changes: rebuild them from fresh renders.
- Owner: حب من تحب check videos "all sound good". Asked to focus on حب إيه now; sent its check videos (Player 4
  every note / main notes, Original 1–3).
- Next: owner's verdict on the حب إيه videos; research helpers (transcribe benchmark, follow + overlays) still running.

## 2026-11-22 [claude] حب من تحب re-transcribed from the whole video, Player 2 added
- Diagnosis of "first notes well timed, then it goes bad midway": the old Player 1 data was right where it existed
  (75/75 notes within 27 ms of a pick, pitch agreed) but stopped 13.7 s into the pass (14.4 s of a 40.8 s video).
  The فا فا صول لا part and the whole second time were never transcribed. Two small errors also fixed (line 4 Mi♭
  70 ms late and a Mi♭ pick labelled صول; a ري extra in line 12 that was on no pick).
- `js/songs/hob-min-tihib.js`: Player 1 now covers the whole video in two parts (first time 19 lines with the
  فا فا صول لا part, second time 14 lines); Player 2 added (another player, first half twice). The owner's third
  video has Player 1's own audio under a Tónos lesson animation, so it is not a new version. The new part uses
  low مي half-flat (measured 51.3, key `mi`). No singer's name in any video; artist left empty.
- Tested: validation table in `docs/memory/songs.md` (95–96% of Player 1 notes on a detected pick with the same
  pitch, chroma 0.82–0.85 vs 0.42–0.64 for shifted controls); the tuned recordings into In time: Player 1 89%/96%
  and 88%/98%, Player 2 87%/100% and 95%/97%, all ★★★; app render of Player 1 100%/100%. `tools/check_docs.py` OK.
  Not tested: nobody has listened (pitch trackers only); not on the owner's phone.
- Media files for the owner (Claude's session scratchpad, folder media): hob-min-tihib-player-1.mp4 (unchanged;
  re-checked, in sync within 6 ms) and the new hob-min-tihib-player-2.mp4 (tuned +0.52, length unchanged).
- Next: send the owner hob-min-tihib-player-2.mp4 (and player-1 again if he lacks it), ask him to listen to Player 1
  "First time" with the real recording loaded and say whether the فا فا صول لا part now sounds right; close the two
  حب من تحب items in `TODO.md`.

## 2026-11-22 [claude] Main notes keep repeats; Hob Eih marks by agreement; transcription research started
- Owner: option A of Hob Eih Player 4 (every note) "so good, so perfect"; main-notes-only (B) sounds bad.
  Cause: main-notes-only removed repeated picks, which are the rhythm. Now it hides decorations only.
- Hob Eih melody/decoration marks re-set by agreement across the 5 recordings (`docs/memory/decisions.md`).
- Owner: reliable note finding is the make-or-break problem ("overlay the notes on any oud video and it must be
  exact; play the computer oud on top and it must sound the same"). Started two research helpers: a benchmark of
  transcription methods (tool folder tools/transcribe, not created yet) and score following of a known song in any video with
  overlay videos (tool folder tools/follow, not created yet). Results go in `docs/memory/songs.md` when they land.
- Tested: Slowly on fresh renders (Hob Eih Simple 26/26; Ahib Simple 74/74 with 1 stray note), In time Player 4
  93% notes, 100% on time.
- Next: review both research reports, send the owner the overlay videos, adopt the winning method.

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
- Owner's verdict on the check videos: only حب من تحب sounds right; Hob Eih (Player 4, Original) and أحب الليل
  sound wrong and off-time. Measured: each version matches its own recording (Hob Eih P4: 94% of notes within
  50 ms, 96% right pitch; حب من تحب P1: 88%, 82%), the app plays every note on time (96–100% within 30 ms), and
  rhythm steadiness is similar (about 9% off-grid) except أحب الليل (17.5%). So the data is faithful to those
  players; the likely problem is musical (40–60% quick decorations, free rhythm). Sent an A/B/C test per song:
  A every note, B main notes only, C main notes on a steady beat. Waiting for his pick before rebuilding.
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
