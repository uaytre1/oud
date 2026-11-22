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
| Player 1 (best) | performance video, offset −3.00 | hob-min-tihib-player-1 / p1 0.708 | all 43 Tónos notes found |
| Simple | Player 1's main notes | none | |
| Tónos | published sheet | none | |
Open issue (2026-11-22): owner says the first notes are well timed, then it goes bad midway. The Player 1
pass ends at 13.7 s of a 40.8 s video, so the rest was never transcribed. He sent three more videos;
re-transcription in progress (see `docs/memory/log.md`). Singer's name unknown: don't guess.

## Waiting for a video
نساي and سكة طويلة (Abadi Al Johar), يوم كنتي (Khaled Abdulrahman): listed in `js/library.js` as WANTED.
