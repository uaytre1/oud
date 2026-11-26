---
authority: reference
status: live
---
# Songs: registry and method

Data lives in `js/songs/` (one file per song, listed in `js/library.js`). Note keys in `js/notes.js`.
The "real recording" files (media) are third-party videos tuned to standard pitch; they are never in git.
Claude keeps them in its session scratchpad and sends them to the owner, who loads each once in the app.

## Method (how a version is made)
From 2026-11-23 steps 2–4 are done by `tools/transcribe/transcribe.py` (see its README); the owner checks by ear.

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
| Teacher (a.oudd lesson) | lesson video, offset +0.93; notes written on screen by the teacher | hob-eih-lesson / p2 0.08 | the reference for notes: سي دو لا صول · ري مي فا قرار · فا ×4 · صول فا صول لا · لا صول فا مي ري |
| Main (best, default from 2026-11-27) | Player 2's video by the Mirror standard, offset −0.91, 43 notes, owner's pick (draft 5) | hob-eih-player-2 / p1 2.198 | gate `--strict` PASS at `--rise 3.5` (100%, 0 stray); 93% at 5.0 (soft notes 8.85 مي, 9.72 مي, 10.36 فا kept, step 5). Removed by the owner: 0.482 سي. Data `tools/candidates/hob-eih-player-2-mirror.json`. The old hand-made Main (Player 4 with the hole closed) failed the gate and is gone |
| Player 4 | performance video, offset −2.28 | hob-eih-player-4 / p1 13.13 | owner liked its feel. Notes 2.5–6.9 s corrected to the teacher's captions (2026-11-23) |
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

## المقامات الثمانية (exercise, file `js/songs/maqamat.js`)
Owner, 2026-11-23: his teacher says master the 8 maqamat first. Scales, not recordings, so not measured: each is its
two ajnas as Maqam World lists them (maqam pages, read 2026-11-23), with notes from the Arabic Wikipedia (مقام موسيقي).
All in first position, in the order beginner courses teach them (عجم نهاوند راست كرد بياتي حجاز صبا سيكاه; research
2026-11-23 in the owner's private notes). Lines: lower half up, upper half up, then down. Half-flats 20 cents low, as measured for مي.
| Maqam | Notes (up) | Ajnas | Down |
|---|---|---|---|
| Rast | دو ري مي½♭ فا صول لا سي½♭ دو | Rast + Rast on صول | سي♭ |
| Bayati | ري مي½♭ فا صول لا سي♭ دو ري | Bayati + Nahawand on صول | same |
| Sikah | مي½♭ فا صول لا سي½♭ دو ري مي½♭ | Sikah + Rast on صول | same |
| Hijaz | ري مي♭ فا# صول لا سي♭ دو ري | Hijaz + Nahawand on صول | same |
| Saba | ري مي½♭ فا صول♭ لا سي♭ دو ري | Saba + Hijaz on فا + Ajam on سي♭ (Nikriz would give ري♭) | same |
| Nahawand | دو ري مي♭ فا صول لا♭ سي♮ دو | Nahawand + Hijaz on صول | سي♭ (Kurd on صول) |
| Ajam | دو ري مي♮ فا صول لا سي♮ دو | Ajam + Ajam on صول (on دو as 6 of 8 beginner courses; Wikipedia puts it on سي♭) | same |
| Kurd | ري مي♭ فا صول لا سي♭ دو ري | Kurd + Nahawand on صول | same |
Open: the teacher's video (owner sending it) may use other tonics (e.g. Ajam on دو), fingers or descents: follow it.
Tested 2026-11-23: each scale rendered with the app's sound into Slowly, whole exercise: 16/16, ★★★ (Nahawand stalled
once at note 11 in the first run, then passed 3 times; not reproduced).

## Drills and first tunes (exercises, files `js/songs/drills.js`, `js/songs/first-tunes.js`), 2026-11-24
From written oud methods and published scores, not recordings: notes and rhythms as printed (read page by page, research
2026-11-23/24 in the owner's private notes). Not played or checked by ear. The books write the oud an octave up; the data
is sounding pitch, all in first position. Lines are 1–2 bars. Repeats are not written out (except زوروني's two endings).
A rest at a line break gives up the beat the app adds after each line. New keys: `solL` (43, string 5 open) and `siLN`
(47, string 4 finger 1). beat = seconds per quarter note (0.7 if not set).
| Version | Source, page | Key | beat | Slowly, app's own sound |
|---|---|---|---|---|
| open-strings | Tunisian method (Tunis 2000) ex. 1, PDF p. 20 | open strings | 0.7 | 10/10, 0 errors |
| open-rhythm | Obeidat 2015 ex. 1, p. 132 | open strings, low فا | 0.7 | 36/36, 3 errors |
| first-fingers | Tunisian ex. 4, PDF p. 20 | Nahawand on لا | 0.7 | 22/22, 0 |
| ajam-do | izif Learn Oud 1, 10.2 ex. 2, PDF pp. 19–21 | عجم on دو | 0.7 | 16/16, 1 |
| rast-do | Obeidat ex. 2c, p. 133 | راست on دو | 0.7 | 16/16, 0 |
| keep-finger | Obeidat ex. 5, p. 136 | راست on دو | 0.9 | 94/94, 0 |
| half-steps | Obeidat ex. 4, p. 135 (one finger per half step, not printed) | ري string | 0.9 | 114/114, 0 |
| little-finger | Obeidat ex. 7, p. 138 | عجم on دو | 0.9 | 86/86, 0 |
| tremolo-prep | Obeidat ex. 3, pp. 134–135 | راست on دو | 0.9 | 125/125, 4 |
| min-beit-abuha | izif lesson 7, PDF p. 13 | عجم on دو | 0.7 | 22/22, 7 |
| doulab-bayati | izif lesson 17, Doulab Bayati 1, PDF p. 30 | بياتي on ري | 0.6 | 24/24, 0 |
| tik-tik | Israeli MoE slide unit, slide 15 | عجم on فا, as written | 0.6 | 66/66, 3 |
| mahla-nourha | Malley 2014, PDF p. 8 | عجم on دو, an octave below the oud reading | 0.6 | 77/77, 1 |
| zuruni | Israeli MoE anthology, Taqtuqa, PDF p. 2 | عجم on سي♭, as written | 0.6 | 47/47, 1 |
| helwa-di | Würzburg score, bars 1–28 | حجاز on ري, as written | 0.6 | 136/136, 1 |
| shalabiya | Malley 2014, PDF p. 5 | نهاوند on دو, as written | 0.75 | 146/146, 3 |
Counts are the coach's note groups. Every version reached its last note; the 7 with 0 errors showed ★★★. After a pass
with errors the coach restarts it, so those counts come from replaying the run's heard notes through the Slowly rules.
The errors are not in the data. The app's own sound makes extra weak onsets after low notes on string 4 (دو, سي) and the
low فا (the two strings of a course beat; strength 3–5 in the run measured, picks mostly 16–75). The listener keeps them
because they come within 0.42 s of a note. Replaying only the onsets within 80 ms of a real pick gives no wrong notes for
13 of 16. Left over: a pick read as the open string still ringing (زوروني, شلبية), and one pick missed after fast ري
repeats (open-rhythm). This is open for the listener (`js/audio.js`). A filter on same-pitch onsets with strength < 8
fixed min-beit and ajam-do, but it dropped real repeated open-string picks, so it is not the fix.

## Waiting for a video
نساي and سكة طويلة (Abadi Al Johar), يوم كنتي (Khaled Abdulrahman): listed in `js/library.js` as WANTED.
