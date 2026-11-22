---
authority: reference
status: live
---
# Songs: registry and method

Data lives in `js/songs/` (one file per song, listed in `js/library.js`). Note keys in `js/notes.js`.
The "real recording" files (media) are third-party videos tuned to standard pitch; they are never in git.
Claude keeps them in its session scratchpad and sends them to the owner, who loads each once in the app.

## Method (how a version is made)
1. Get a recording (owner's video, or a legal download: archive.org works; YouTube/TikTok are blocked).
2. Find the player's tuning offset (best fit of all pitches to the maqam) and remove it.
3. Detect every pick: Basic Pitch (ONNX) for note starts, librosa pyin for exact pitch, onset strength.
4. Map to note keys; choose string and finger as in `js/notes.js`; split into lines at long notes and breaths.
5. Align with a published note sheet when there is one (Needleman–Wunsch): matched = main note, same note again
   = repeat (`r`), anything else = extra (`g`).
6. Validate before adding: render with the app and compare with the recording (pitch per moment, onsets,
   chroma against shifted controls), and play the tuned recording into the coach (`docs/memory/testing.md`).
7. Make the media file: standard pitch with ffmpeg asetrate+atempo, length unchanged, named as `media.file`.

## حب إيه (Hob Eih), Umm Kulthum, intro, Bayati on Re (file `js/songs/hob-eih.js`)
| Version | Source | Media file / starts (s) | Notes |
|---|---|---|---|
| Player 4 (best) | performance video, offset −2.28 | hob-eih-player-4 / p1 13.13 | the one the owner liked; default |
| Original | archive.org radio recording, orchestra in Bayati on Do, moved +2 | hob-eih-original / p1 3.21, p2 12.07, p3 20.47 | chroma match 0.80–0.85 vs controls 0.56–0.70 |
| Simple | Original's main notes, even pace | none | made by `js/library.js` |
| Note sheet, Tónos | published sheets | none | even pace |
| Player 1–3, Lesson | performance videos | hob-eih-player-1..3, hob-eih-lesson | under "More": owner said they didn't sound good |
مي half-flat target 51.3. Which social account each player is stays out of this public repo.
Agreement across recordings (2026-11-22, notes of each version also played by the others, average):
first time Player 1 80%, Original 78%, Player 2 73%, Player 3 65%, Player 4 60% (the most personal, and the
one the owner says sounds perfect); second time Lesson 73%, Player 3 68%, Player 2 60%, Original 30%.
Melody/decoration marks were re-set from this agreement (method in `docs/memory/decisions.md`).

## أحب الليل والسهرة, Badr Al-Laimoun, Bayati on Sol (file `js/songs/ahib-al-lail.js`)
| Version | Source | Media file / starts (s) | Notes |
|---|---|---|---|
| Lesson (best) | lesson video, offset +1.71 | ahib-al-lail-lesson / p1 25.186 | all 34 sheet notes found; heavy tremolo |
| Simple | Lesson's main notes | none | |
| Note sheet | Darwisha sheet | none | |
لا half-flat target 56.5.

## حب من تحب, Nahawand on Sol (file `js/songs/hob-min-tihib.js`)
| Version | Source | Media file / starts (s) | Notes |
|---|---|---|---|
| Player 1 (best) | performance video, offset −3.00 | hob-min-tihib-player-1 / p1 0.702, p2 20.933 | whole video. First time: 19 lines (sheet lines 1–13, then the فا فا صول لا part, lines 14–19). Second time: 14 lines (sheet 1–13 with his variations, short ending on ري). All 43 Tónos notes found in each |
| Player 2 | another player's video, offset +0.52 | hob-min-tihib-player-2 / p1 0.749, p2 9.334 | plays sheet lines 1–9, then 1–11, at a very even pace with low open-string picks between groups; all sheet notes found |
| Simple | Player 1's first time without decorations | none | made by `js/library.js` |
| Tónos | published sheet | none | sheet lines 1–13 only |
- The part after "صول فا" (فا فا صول لا …, re-measured 2026-11-22) uses low مي at 51.3 (half-flat, key `mi`): it moves
  to Bayati on Re. The high مي in the first part is Mi♭ (63.1). The sheet does not cover this part; its lines are
  one bar each, split after the long لا / مي / ري.
- The owner's third video is a Tónos lesson (animated neck) whose sound is Player 1's recording (same audio,
  0.11 s offset, cut at 18.3 s to the final strum), so it is not a separate version. Its labels follow the sheet slowly,
  not the sound.
- Fixed 2026-11-22 ("first notes well timed, then it goes bad midway"): the old Player 1 data was accurate where it
  existed (all 75 notes within 27 ms of a pick, pitch agreed), but it stopped at 13.7 s of the pass (14.4 s of a 40.8 s
  video): the فا فا صول لا part and the second time were missing, so the app's notes ended while the song went on.
  Chroma match of the old data per 2 s window: 0.73–0.88 up to 14.7 s, then 0.44 and 0. Small fixes too: line 4 had
  Mi♭ 70 ms late and its second Mi♭ pick labelled صول; line 12 had a ري extra 120 ms off any pick.

Validation (2026-11-22; picks = librosa onsets + Basic Pitch note starts; pitch at a pick = Basic Pitch/pyin;
renders = `tools/render_versions.js`; coach = tuned recording into In time, all lines, speed 100%):
| Pass | Notes (main) | Timing to nearest pick, median / p90 | Within 50 ms, same pitch | Chroma vs 0.25 s / 0.5 s late / half step | Coach (notes, on time) |
|---|---|---|---|---|---|
| Player 1, first time | 111 (63) | 13 / 28 ms | 96% | 0.85 vs 0.62 / 0.58 / 0.47–0.50 | 89%, 96%, ★★★ |
| Player 1, second time | 92 (51) | 14 / 28 ms | 95% (100% with the harmonic match) | 0.82 vs 0.61 / 0.58 / 0.47–0.51 | 88%, 98%, ★★★ |
| Player 2, first time | 48 (30) | 5 / 21 ms | 94% (100%) | 0.82 vs 0.62 / 0.63 / 0.42–0.45 | 87%, 100%, ★★★ |
| Player 2, second time | 57 (38) | 5 / 16 ms | 88% (98%) | 0.86 vs 0.64 / 0.64 / 0.42–0.47 | 95%, 97%, ★★★ |
The ~13 ms median for Player 1 is mostly a constant offset between the two pick detectors (the app's own render
shows the same 14–15 ms against its exact note times). Coach misses are fast repeats (ري ×4 at 90 ms apart) and
notes right after an open-string strum, whose ringing the mic reads instead. The app's own render of Player 1
(first time) into In time: 100% notes, 100% on time.
Uncertain, rests on the pitch trackers only (nobody has listened): Player 1 line 12 سي (12.99 s, a soft pick, kept
because the sheet has it and a faint Si♭ overtone is there), the quick pick at 17.43 s (written as صول again), the picks at
17.57 s and 19.91 s (they start on صول and slide to فا; written as فا), and Player 2's last صول before the final strum. Low لا and صول
bass picks are written in the melody octave (the coach accepts either octave). Singer's name unknown: don't guess.

## Waiting for a video
نساي and سكة طويلة (Abadi Al Johar), يوم كنتي (Khaled Abdulrahman): listed in `js/library.js` as WANTED.
