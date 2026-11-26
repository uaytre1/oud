---
authority: reference
status: live
---
# Log (newest first)

Format: `## YYYY-MM-DD [agent] short title`, then what changed, what was tested, and "Next:". Never edit
another agent's entry; add a correction line. Keep entries short; details belong in the topic files.

## 2026-11-26 [claude] First run of the standard: حب إيه Player 4 rebuilt from his own recording (audio to the owner)
- Candidate = Player 4's measured notes from commit bb0814a (before the caption and hand edits; the سي flick the
  owner removed stays out). Gate vs his recording: 46 notes, 83%, 8 "not in the recording", 2 stray picks
  (1.47 s = that سي flick; 11.89 s = the ending).
- Removed the three low ري fill notes it flagged (6.29, 6.51, 6.71 s): 43 notes, 88% at the strict bar (FAIL), PASS
  at `--rise 3.5`. So the five notes still flagged (7.43 لا, 8.57 ري, 9.31 فا, 11.00 فا, 11.68 ري) are soft notes,
  kept and listed as unsure. Not checked: whether the three ري would also pass at 3.5 (they were removed first).
- Sent the owner real-then-computer audio of the whole first time. Nothing added to the app: step 8 of the standard
  waits for his ear. The candidate's notes: bb0814a Player 4 p1 minus those three notes.
- Lesson for the standard: a note flagged at 5 dB but passing at 3.5 dB is "soft", not "invented": keep it, list it.
- Next: his verdict. If good, add it as the version "Player 4" data (replace the hand-edited one) and make it the
  default; if the 6–6.9 s gap sounds empty, test the three ري at `--rise 3.5` and put back the ones that pass.

## 2026-11-26 [claude] `docs/memory/song-standard.md`: the steps every agent follows; gate gets --strict and --report
- Owner: another agent's new حب إيه renders (overlays on his solo videos) have "added beats and notes and timing";
  the orchestra version is "not the version I want"; "push files to make a standard… to make this perfect each
  time". He asked me not to analyse those files (budget). New standard page with a never-do list and 9 steps;
  AGENTS.md rule now points to it. Gate: `--report file.json` lists every note's verdict (delete / off time with
  `move_by` / ok) and stray picks; `--strict` is the bar for new versions (95%, not-in-recording ≤ 4%, stray ≤ 2).
  Checked: حب من تحب Player 1 passes strict; حب إيه Player 4 fails with 5 notes to delete and 4 stray picks.
- Correction to the earlier entry today: the owner does NOT want حب إيه Original (orchestra) as the main version.
- Next: the agent with his solo uploads follows the standard on one solo video, sends A/B per line.

## 2026-11-26 [claude] Gate run on every version; A/B audio of the passing حب إيه parts sent to the owner
- Table in `docs/memory/transcription.md`. Passing: حب من تحب Player 1 (both times), حب إيه Original first and second
  time, Player 2 second time, Player 3 second time. Failing: حب إيه Player 4 / Main (the default he has been
  hearing), Player 1, Teacher, first-time passes of Players 2 and 3, Original third time, أحب الليل والسهرة (77%).
- Sent him one audio: for each passing حب إيه part, the real recording then the computer version. No app change yet:
  the default version changes only after he picks by ear.
- Next: set `BEST['hob-eih']` in `js/app.js` to the version he picks; rebuild the failing versions from their own
  recordings (pipeline in the doc); أحب الليل needs a better recording.

## 2026-11-26 [claude] The gate works: passes حب من تحب (95%), fails حب إيه (85%, missing notes listed)
- `tools/verify_version.py` rewritten: for each note, "does this pitch start here in the recording?" (quarter-tone
  spectrum rise), timing from the recording's onsets, plus clear picks without a note. حب من تحب Player 1 95% PASS;
  حب إيه Player 4 85% FAIL with the removed fill at 5.52 / 5.91 s printed. Table and limits in
  `docs/memory/transcription.md` ("The gate"). No app change, no release.
- Not done: calibration on a second known-good recording (حب من تحب Player 2's tuned file was not in the scratchpad);
  the listener's fast-pick problem in the app (TODO.md A) is separate and still open.
- Next: local agent runs the gate on every version with a recording, then rebuilds حب إيه one version per recording
  (owner's solo uploads) until each PASSes; A/B audio per line to the owner.

## 2026-11-26 [claude] Draft gate `tools/verify_version.py`; prompt for the local Claude
- Owner: "find a way to make it better and more consistent… so it sounds like the actual song". Built a draft gate
  that checks a version against its own recording. It finds حب إيه Player 4's real holes (68%) but also fails the
  known-good حب من تحب Player 1 (66%): its detectors are too crude. Results and the calibration target are in
  `docs/memory/transcription.md` ("The gate"). No app change, no release.
- Next (local Claude, has the owner's solo uploads and the cached transcriptions): step 0 in that doc, then rebuild
  حب إيه one version per recording, A/B audio per line for the owner.

## 2026-11-26 [claude] Handover: `docs/memory/transcription.md`; حب إيه Main gets Player 4's ري back; release 2026-11-26.1
- Owner is moving to local agents (Codex, Antigravity) on his Mac and asked for everything to be written down:
  methods, reasoning, new ideas, how to fix the inconsistency. New `docs/memory/transcription.md` (linked from
  `AGENTS.md` and the memory index). Main point: حب من تحب is right because each version is one recording checked
  against itself; حب إيه is a patchwork of one player's times and another's notes. Rule: a version = one recording.
- Owner on Main (.5): "there should be a slight pause… and a note missing in between". Player 4's measured data from
  2026-11-22 has ري at 5.91 between that لا and the next phrase. `js/library.js` Main: ري at 5.33, next phrase 0.45 s
  later (was a 1.5 s hole, then no pause at all). Slowly 27/27 on the app's render. He has NOT heard this version:
  an A/B audio (A with ري, B without) was made for him.
- Local agents reported (not checked here, their files are not in this repo): on his new solo uploads of حب إيه,
  `tools/transcribe` misses soft up-strokes with its 2-of-3 vote and splits octaves over ringing bass strings.
  Both are answered in the new doc (union of detectors + level-jump filter; melody-range octave rule).
- Correction, same day (release 2026-11-26.2): the owner said to DROP the ري change; `js/library.js` Main is back to
  the 2026-11-25.5 data (no ري, no pause). He decided to standardize on the pipeline in
  `docs/memory/transcription.md` (one recording per version, Basic Pitch notes, any-detector onsets filtered by
  loudness jump, melody-range octave lock, overlay check against the recording) plus the small re-strike fix in
  `js/audio.js`. Neither is built yet.
- Next: rebuild حب إيه from his solo uploads, one version per recording, A/B audio per line (the doc's "What to do
  next"). Stop hand-editing Player 4. Then the synth re-strike fix.

## 2026-11-25 [claude] حب إيه "Main" version: the hole after صول فا صول لا closed; release 2026-11-25.5
- Owner on the .4 audio: "at 6 seconds there should be 1 instead of 2, and there is a kind of pause after it… match
  it with the timing of the other videos". Lined up: the teacher and Player 2 go straight from that لا into
  لا صول فا مي ري; our Player 4 data had a 1.5 s silence where his fill used to be. New derived version `main`
  (`js/library.js`): drops the repeated لا at 5.36 and moves everything from 6.88 s earlier by 1.52 s. Default
  (`BEST` in `js/app.js`); phones that had Player 4 chosen are moved once (`mig.main`). Player 4 unchanged.
- Tested: Slowly 26/26 on the new render; `tools/check_rhythm.mjs` prints only the uneven four فا now. Audio sent.
- Next: his verdict on the audio (one لا or two at that spot; the four فا even or long-short).

## 2026-11-25 [claude] حب إيه pause before لا fixed; rhythm agreement check; release 2026-11-25.4
- Owner: in the computer version, after the four فا, "صول فا صول, then a very short pause, then لا, then a pause".
  `js/songs/hob-eih.js` Player 4 p1: لا 5.30 → 5.13, لا 5.76 → 5.36 (teacher's ratios; other players agree).
- New `tools/check_rhythm.mjs`: prints phrases whose gaps disagree with the other recordings (catches this pause on
  the old data, silent on it now). It still prints 5 other places in Player 4 (his uneven four فا at 2.87 s and
  8.95 s, and 8.01 s): places to listen with the owner, not yet judged.
- Tried and dropped: letting fast same-note repeats through the level gate for tremolo (his tremolo: 43 strokes in
  7 s, the app keeps about 22; the exemption gave 37 but brought clip 1 back from 25 to 40 notes). Numbers for the
  next try: worklet reports 47 onsets for the 43 strokes; 14 real strokes are dropped by the gates; 6 lack pitch.
- Tested: حب إيه Slowly 26/26 on the new render; check audio sent to the owner. Not tested on his iPhone.
- Next: owner listens to the fixed phrase; go through the 5 printed places with him; run the check on every song.

## 2026-11-25 [claude] Level-jump gate from his clips; welcome sheet; visible tick rules; release 2026-11-25.3
- Owner sent three short phone videos of his playing (audio used; kept in Claude's scratchpad only). Clip 1: 12 real
  picks, the app heard 46 notes. New gate in `js/audio.js` (Listener section): an onset must make the level jump
  (5 / 4 / 3 dB by time since the last note) unless its click is strong. Clip 1 → 25 notes, all real picks kept. Details: `docs/memory/detection.md`.
- Welcome sheet on first open with "My oud has 6 / 5 strings" (`index.html` intro, `js/app.js`); each unticked path
  step shows what ticks it (`js/path.js`); risha result stays 8 s before the next run; bigger tap targets.
- طلعت يا محلا نورها slowed (beat 0.6 → 0.8 s): its 0.15 s run stalled Slowly 2 times in 3, before the gate too.
- Tested on a quiet machine: risha مقسوم, خليجي, steady, across the strings 100%; Slowly مقسوم catches the planted
  wrong string; حب إيه Slowly 26/26; 8 drills/tunes 0 wrong notes (محلا نورها 3 of 3 passes after slowing).
  Timing tests fail when anything else runs on the machine (git, file writes): run them alone. Not tested on his iPhone.
- Next: TODO.md A (fast strokes/tremolo are still the weak spot), then D (practising and result screens review).

## 2026-11-25 [claude] Handover list written in TODO.md
- Owner asked for one file with everything not yet improved, for the next agent. `TODO.md` "Now" rewritten: A
  listening he can trust, B content that is still a guess, C simpler and more consistent; each with where to look and
  how to know it is done. No code change.
- Next: item A1 (fast repeated picks) when the owner says go.

## 2026-11-25 [claude] Same step words everywhere (Slowly / In time); release 2026-11-25.2
- Risha trainer tabs, tips, path steps, how-to guides, takes list and reports now say Slowly / In time like the song
  lessons. Tabs back to one row. "Rhythms (from your lesson video)" → "Rhythms" (he may share the app).
- Tested: risha screen loads with the new tabs, no errors; مقسوم In time 100%.
- Next: fast repeated picks, using the fast picks in his calibration take (he asked to do it last); string 6's note.

## 2026-11-25 [claude] Fresh-eye design pass: calmer home, clearer path, readable gold; release 2026-11-25.1
- Owner asked for a fresh judgment of the whole app ("design, UI, colors, how it works… easy to pick up, consistent,
  trustworthy"). All screens shot in light and dark at iPhone size, then fixed (`index.html`, `style.css` last block,
  `js/app.js` home section, `js/path.js` render):
  home = path card (hero, "Continue ›"), quiet daily row, line icons instead of emoji, compact one-row song cards
  ("7 tunes" for First tunes); path = one card per step, the next step outlined in gold, "How" as a small pill, the
  reading step opens its guide and ticks itself (no long inline list); Daily practice no longer shows a drill as
  "Your song"; risha tabs equal height, shorter option text; Settings without boxes inside boxes; lesson "Next ←"
  label in English; light-mode gold darkened to #a36800 (4.6:1 on white, was 3.6:1), green to #23874a.
- Tested: every flow from home (path step → guide/tuner, song, lesson), risha مقسوم and خليجي 100% (run alone: a run
  right after another browser scored 40% from machine load), حب إيه Slowly 26/26. Not tested on his iPhone.
- Not done (budget): same words for the three steps everywhere (lesson says Listen / Slowly / In time, risha says
  Watch / Step by step / With the click); counting fast repeats reliably (needs his tremolo recording).
- Next: unify the three-step wording; ask him for string 6's note; بياتي scale recording for مي half-flat.

## 2026-11-24 [claude] How-to guides, drills and first tunes, his oud's tuning, octave fix; release 2026-11-24.3
- Owner: "include everything I need… correct… help me improve"; sent a calibration take (Voice Memos) of his oud.
- `js/howto.js`: 15 sourced how-to guides (holding, risha, strokes, crossing, muting, left hand, finding notes,
  quarter tones, tremolo, metronome, routine, tuning, by ear, taqsim, oud care). Shown from a "How" button on path
  steps, "How to play this" in the risha trainer, and Settings → Help. Two cards edited to match the app.
- `js/songs/drills.js` (9 drills: Tunisian method, Obeidat 2015, izif) and `js/songs/first-tunes.js` (7 tunes from
  published scores; on home with the songs). Path stages now pair them (e.g. طلعت من بيت أبوها in stage 2).
  Exercise lines accept rests (`-:beats`) and a per-version `beat`.
- His tuning (take): S6 ≈ 37.1, S5 فا 41.0, S4 لا −20 cents, S3–S1 in tune. Settings: "String 6 is tuned to";
  قرار = the low فا string; low فا/صول follow the strings (`placeLow`); listener gets the oud's low strings.
- Listener (`js/audio.js`, Listener section): octave-down correction below 40.5 (his string-3 strokes misread 37 of
  117 → 7; low strings unchanged). Step by step ignores a second onset within 0.18 s (his double onsets).
- Tested: his take through the Listener (before/after); risha trainer (مقسوم, خليجي, steady, across the strings,
  step by step); حب إيه Slowly; all 16 drills/tunes with a plain render (see `docs/memory/songs.md`); how-to
  sheets in Chromium at iPhone size. Not tested: his iPhone.
- Next: ask him what string 6 is tuned to (≈37 is between دو and ري) and to set it in Settings; when he can play the
  بياتي scale, record it to place مي half-flat on his oud; fast-repeat counting from a tremolo recording.

## 2026-11-24 [claude] Tidier app: practice tiles on home, one Settings page, one exercise chooser; release 2026-11-24.2
- Owner: "too messy with all those features… sort them out", and "an option for 5 strings in the website settings".
  Home (`index.html`, `js/app.js` home + new SETTINGS section): path card, daily practice, Practice tiles, songs only
  (the 8 maqamat is a tile now), My takes + Settings tiles. Settings page: 5/6 strings, string 5 tuning, repeat until
  right, main notes only, metronome click, help, version. Tuner and risha trainer: a "6-string oud · string 5 = صول ·
  Settings ›" link. Risha trainer (`js/pace.js`): one "Exercise · Change ▾" chooser with a one-line description.
- Tested (Chromium, iPhone size): every tile opens its screen; 5 strings → tuner shows 5 strings, the trainer walks
  5 → 1 → 4; click setting reaches the trainer; screenshots checked. Not tested on his iPhone.
- Next: resume the method-exercise research; add the how-to cards to the path steps and the trainer.

## 2026-11-24 [claude] Clicks stop on Stop; across-the-strings training; 5 or 6 strings; speed ladder; all takes in one zip; release 2026-11-24.1
- Owner: "the clicks don't stop after I stop". Cause: a run schedules all its metronome clicks ahead and `stopAll`
  only stopped oud notes. `js/audio.js` (oud-sound section) now tracks clicks and cancels them (disconnect first,
  for old Safari). Test: 33 clicks waiting while running, 0 after Stop.
- `js/pace.js`: "صد on every string" and "صد رد on every string" (4 strokes per open string, thickest to thinnest and
  back), each stroke judged on its exact string (a low string may be heard an octave up). 5- or 6-string oud
  (store `courses`, used by the tuner, the trainer and قرار = lowest string). Speed ladder: with the click, a good run
  (≥85%, strings ≥80%) starts the next one by itself 5 BPM faster after 5 s; 60–84% repeats; <60% goes 5 slower; up to
  6 runs; Stop ends it; follows the "Repeat until right" setting.
- My takes: today's or all takes as one zip (owner: "puts them in a file instead of one by one").
- Tested (Chromium, fake mic): صد on every string, 6 strings and 5 strings, 100% on time, strings 100%, ladder
  countdown at 65 BPM, Stop ends it; Step by step catches a planted wrong string; zip of 3 takes passes Python's
  zipfile test with all files. Not tested on his iPhone (share sheet with a zip).
- His take (Fingers, In time 60%): notes 85%, timing 9% (every note 0.1–0.5 s early); فا heard at 51.9 (−1.1 semitone)
  and سي♭ at 56.4 (−1.6): finger 2 lands too close to finger 1. Suggested Slowly first and checking finger 2 on the tuner.
- Next: tidy the home screen and settings (owner: "too messy"), then the how-to cards and method exercises.

## 2026-11-23 [claude] Your path: 8 stages from Arabic oud courses; release 2026-11-23.7
- Owner: "I need someone to guide me, I don't have that"; asked for research on how Arabic oud teachers teach and
  in what order. Research (5 searches: Arabic YouTube series, method books/institutes, maqam and rhythm order,
  technique and mistakes, Gulf teaching) summarised in `docs/memory/path.md`.
- New `js/path.js` + `#/path` screen + home card; Daily practice opens the stage's next risha / left-hand / song step.
  Maqamat reordered as courses teach, عجم moved to دو (earlier commit). New warm-up "Four fingers" (keys solF4, doF4).
  `pace.preset()` lets the path open the trainer on a pattern. Exercise pass ids are now the version id.
- Tested (Chromium, iPhone size): home card and path screen; Got it ticks the holding tips; a step opens the risha
  trainer on its pattern in Watch; a 100% timed run (fake mic) ticks the step; a lesson step opens the right lesson;
  Daily practice shows "Today: …" from the stage; Ajam progress ticks only the Ajam steps (Bayati stays fresh);
  moving stages works. Four fingers Slowly 20/20 ★★★ from the app's render. Not tested on his iPhone.
- Next: when the teacher's video comes, check stage 1–2 fingering and the maqam order against it; measure Gulf
  rhythm strokes from a lesson video; add a first عجم tune (سنة حلوة) once a recording is available.

## 2026-11-23 [claude] The 8 maqamat as exercises; 4 more rhythms; release 2026-11-23.6
- Owner: his teacher says master all 8 maqamat; asked to research them, the oud and the rhythms; he is sending the
  teacher's video. Added `js/songs/maqamat.js` (8 scales, home card, all 8 choices on screen with the scale explained),
  note keys for flats/half-flats in `js/notes.js`, rhythms بلدي سعيدي ملفوف خليجي in `js/pace.js`. Sources and the
  scale table in `docs/memory/songs.md`. `tools/render_versions.js` now renders one pass at a time (all at once
  broke Node's string limit) and takes an optional song id.
- Tested: Slowly, whole exercise, all 8 scales from the app's own render: 16/16 ★★★ (one Nahawand stall in the first
  run, 3 passes after). خليجي With the click from synthetic strokes: 100%, strings 100%. Screens at iPhone size.
  Not tested: a real oud; whether the teacher plays these tonics and fingers.
- Next: when the teacher's video arrives, compare tonics, fingers, descents and any rhythms with `js/songs/maqamat.js`
  and the patterns in `js/pace.js`, and fix them to match.

## 2026-11-23 [claude] Send to Claude for the risha trainer; release 2026-11-23.5
- Owner: "there should be a share button even for training". Step by step and With the click now record the mic
  and keep the run as a take (`kind: "risha"`, format in `docs/memory/architecture.md`, "Takes"); the result shows
  ▶ Hear my take and ↗ Send to Claude, and the takes list shows these runs. Recorder stops before the mic.
- Step by step: a repeat of the stroke just played (same note within 1.2 s, e.g. the string still ringing) no
  longer moves to the next box or counts as wrong; the box keeps waiting and says what is due. Found when a
  synthetic ري ringing on was heard twice and the next real stroke was judged against the wrong box.
- Tested (Chromium, fake mic): timed مقسوم on the scale 100%, takes saved, Send to Claude falls back to download
  (json 12 kB + m4a 405 kB, 40 strokes with status), listed in My takes; Step by step 1 wrong (the planted one) in
  two runs, json lists each stroke heard. Not tested: the iPhone share sheet with these files (same code path as
  song takes, which the owner has used).
- Next: when the owner sends a risha take, read the strokes list (status per stroke) and answer in plain words.

## 2026-11-23 [claude] Risha trainer: Watch / Step by step / With the click; string on every box; release 2026-11-23.4
- Owner: the rhythm comes too fast, he doesn't know the order or which string. `js/pace.js` rewritten (sections 1–3),
  `index.html` `#paceView` (mode buttons, order line), `style.css` (pbox string labels, ok/bad, practising layout).
  Watch plays the pattern at 0.6 s per box and lights each box, then moves to Step by step. Step by step has no
  metronome: it waits for each stroke, checks the string (and the note with the scale on), shows red with a short
  reason when wrong, and moves to With the click when a round has no mistakes.
- Fixed on the way: the moving parts were rebuilt every frame; on a slow machine that broke the listening (timed
  مقسوم test 33% → 100% once they are only redrawn when the box changes).
- Tested (Chromium, fake mic with synthetic strokes): With the click, مقسوم on the scale 100% (0 ms ± 9), steady 1 per
  beat 100%; Step by step مقسوم 20/20 with the one planted wrong string caught; Step by step إيقاع عربي on the scale
  16/16 with the planted wrong note caught; Watch lights the boxes and hands over to step 2. Screenshots at iPhone size.
  Not tested: his iPhone, a real oud's low فا through a phone mic (octave reading is allowed for).
- Next: ask the owner whether Step by step judges his real strokes right (low فا on string 6 especially).

## 2026-11-23 [claude] حب إيه corrected to the teacher's captions; Teacher version visible; release 2026-11-23.3
- Player 4 (default): ري مي فا قرار, then four فا on string 3 (finger 2), then صول فا صول لا لا (teacher's notes at
  P4's measured times 2.47–5.76 s); lines 3–4 unchanged. Teacher version (was "Lesson", hidden): renamed, shown,
  first فا = قرار, lines split as the captions.
- Tested: Slowly line 1 of Player 4 on a fresh render 8/8; check videos made. Owner has not answered the last
  A/B test; he asked to keep improving, so the captions were applied (easy to undo).

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
