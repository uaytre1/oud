# To do

This is the plan for every agent (see `AGENTS.md`). The "Now" section is the one current direction.
Claim an item with `(claimed: <agent> <date>)` before starting it; log the result in `docs/memory/log.md`.

## Now (as of 2026-11-25): open work, handed over
The owner is on a small usage budget: work in small steps, test, release, log. He wants the app simple, consistent
and trustworthy ("users can trust it and rely on it for learning") and may share it with other people.
Listed in the order he asked for. Each item says where to look and how to know it is done.

### A. Listening he can trust (most important)
- [x] **False notes in normal playing** (he played 12 picks, the app heard 46): fixed 2026-11-25 with a level-jump
  gate, see `docs/memory/detection.md`. Fast strokes below are what remains.
- [ ] **Fast repeated picks / tremolo are still miscounted** (strokes section: 62 notes for about 53 reference picks,
  12 real ones missed; the reference itself is unsure there). Needs a clean tremolo recording with a known count.
  Older notes: Onsets closer than 0.42 s are not gated at all (`_finishPending` in
  `js/audio.js`), so a ringing swell can count as a pick, and real fast picks have a weak click (rise 5–8) so a rise
  gate drops them. Evidence and numbers: `docs/memory/detection.md`, "Owner's calibration take". Use the fast picks in
  that take (4 quick picks per open string at about 9–12 s, 52–60 s, 61–77 s; tremolo on string 3 at 138–171 s; the
  recording is not in git: ask the owner to send it again if the scratchpad copy is gone). Idea not yet tried: count
  a fast repeat only when the level (dB) dips and rises again, not only on treble click. Done when: his take gives
  4 notes for each group of 4 picks and the timed مقسوم/خليجي tests and all drills still pass.
- [ ] **Double onsets on slow picks** (a weak onset 0.07–0.15 s before the real pick, his oud). Only the risha
  trainer's Slowly ignores them (0.18 s). Song lessons (`waitNote`/`alongNote` in `js/app.js`) do not. Same take.
- [ ] **String 6 on his oud reads about 37** (between دو 36 and ري 38). He was asked which note it should be and has
  not answered. Settings has "String 6 is tuned to" (default فا): until he sets it, the tuner shows string 6 far off.
- [ ] **مي half-flat on his oud**: he cannot play the بياتي scale yet. When he can, record it and check the app's
  target (51.3) and tolerance (−25/+45 cents, `js/analyze.js`).
- [ ] **In time on a real oud is untested.** His one In-time take (Fingers warm-up, 60%): every note 0.1–0.5 s early,
  timing 9%. Check whether that was him or the mic-delay estimate (clamped −0.05…0.15 s in `js/analyze.js`).
- [ ] **The tuner only reads open strings.** A how-to card tells him to check fingered notes; a "check any note"
  mode (show the nearest note name and cents) would let him place fingers. `js/tuner.js`.
- [ ] Nothing since 2026-11-22 has been tried on his iPhone except his takes: the share sheet with a zip, the speed
  ladder, Settings, the how-to sheets. Ask him for a screen recording of one full daily practice.

### B. Content that is still a guess
- [ ] **Video → notes → computer version must be the most consistent part of the app** (owner, 2026-11-25). Today:
  `tools/transcribe` finds notes, `tools/check_rhythm.mjs` compares rhythm across recordings, the owner judges by ear.
  Missing: one command that takes a video and gives a version plus a list of unsure places; a rule that notes and
  rhythm come from the same recording; rhythm written in beats (so a pause can't hide in decimals); running the
  rhythm check on every song (`--all` prints many player differences: decide which are style and which are errors).
- [ ] حب إيه Player 4: the check still prints the four فا (2.87 s, 8.95 s: long-short-long-short where others are
  even) and 8.01 s. He likes this version's feel: ask him before changing.
- [ ] **Stroke directions of بلدي, سعيدي, ملفوف, خليجي** are all down strokes by assumption (`js/pace.js`); the chart
  they came from is for drums. Measure from a lesson video of each rhythm on the oud (he can screen-record one).
- [ ] **Gulf rhythms** beyond عربي and رومبا (سامري, عدني, خبيتي) and **Gulf beginner songs** (انتي أجمل, احبك لو تكون
  حاضر, يبان الشوق): no written source; they need recordings. YouTube is blocked from the cloud machine.
- [ ] **First tunes and drills are from scores, not checked by ear** (`docs/memory/songs.md`, "Drills and first
  tunes"). The owner should listen to each once (Listen step) and say which sound wrong.
- [ ] **أحب الليل والسهرة** is weak: he is sending 2–4 more videos; rebuild by agreement across them.
- [ ] **حب إيه 4–8 s**: Player 4 now uses the teacher's captions; he has not confirmed it sounds right.
- [ ] His teacher's video about the 8 maqamat has not arrived: compare tonics (عجم on دو?), fingers and descents
  with `js/songs/maqamat.js` when it does. Other teachers finger one finger per half step; the app uses his rule.
- [ ] Wanted songs (نساي, سكة طويلة, يوم كنتي): need a video each; their maqam is unknown.

### C. Simpler and more consistent
- [ ] **Two words for one thing remain:** the speed ladder is under the setting "Repeat until right"; songs repeat a
  failed take, the risha trainer repeats a good one faster. One clear name and one behaviour.
- [ ] **Path step ticks are invisible rules** (risha: 85% on time at the step's BPM; lessons: Slowly done or In time
  passed). Show the rule on the step ("Pass: 85% on time at 60 BPM") so a tick is never a surprise. `js/path.js`.
- [ ] **A tune from the path opens its line list**, not the next line; one more tap than a drill. `openLesson` in
  `js/app.js`.
- [ ] **Result after a good risha run shows for only 5 s** before the next run starts. Let him read it (longer
  pause, or start the next run on a tap).
- [ ] **"Send to Claude"** means nothing to other people he shares the app with. Maybe "Share take", with Claude as
  one target of the share sheet.
- [ ] **Real recordings must be loaded by hand** per song from files sent in chat (old item, still true).
- [ ] The computer's oud sound beats on low strings much more than a real oud: fine for listening, misleading for
  self-tests (use `tools/plain/` renders for those). His own oud sound would be better (needs clean single notes).
- [ ] Old side branches on GitHub (`claude/wip-*`) can be deleted if the owner agrees.

### D. Design and UI notes from the 2026-11-25 review (seen, not fixed)
Reviewed from screenshots at iPhone size, light and dark. Screens that need the mic (practising, results, stars)
were NOT reviewed in that pass: do them first.
- [ ] **Practising and result screens** (lesson Slowly / In time, risha result, stars): not reviewed. Shoot them with a
  fake mic (`tools/run_test.js` flow) and judge size of feedback, wording, what the eye lands on.
- [ ] **No welcome for a new user.** The intro sheet only appears at the first lesson. A first-run step should ask
  "5 or 6 strings?" and the tuning of strings 5/6, then point to Your path. Matters now that he shares the app.
- [ ] **The big button covers content.** On the risha and tuner screens the sticky Start button hides the options /
  the last row of strings behind a fade; it reads as cut off. Give those screens bottom padding or un-stick the button.
- [ ] **Small tap targets:** the "How" pill (about 30 px high), the step number circle (36 px), version chips, the
  "Change ▾" link. Aim for 44 px.
- [ ] **Small text while holding an oud:** lesson hint line (14 px), "pegs / body →" and string numbers on the neck
  drawing, the risha "Order:" line and legend (12–13 px), chip labels "S2·F1" (about 10 px).
- [ ] **Sideways lists with no hint:** note chips under the lesson card and version chips on a song scroll sideways
  but look cut off. Add a fade edge or wrap them.
- [ ] **Risha screen is mostly empty for steady patterns** (one box in a big card) and crowded for rhythms. The big
  note / string should be the hero there, like the lesson card.
- [ ] **How-to guides are text only.** Posture, risha grip and finger placement need a simple drawing each. With two
  cards in one sheet the title shows twice.
- [ ] **Home leftovers:** the lead sentence repeats the path card; "Songs waiting for a recording" is dead weight for
  other users (move to Settings or remove); My takes sheet is plain (no grouping by day, no best score).
- [ ] **iPad:** only the lesson has a wide layout; home, path, settings stretch across the screen.
- [ ] **Arabic font:** `--ar` names Noto Naskh Arabic but no font file is loaded; iPhone falls back to Geeza Pro,
  Android to something else. Either load one font or accept and remove the name.
- [ ] **Dark mode colours** were only eyeballed: check contrast of muted text, green/red result boxes and the gold
  outline on the dark cards.
- [ ] **Sharing polish:** check there is a home-screen icon, a page title/description and a link preview image
  (`index.html` head); add a short "what this is" line for someone opening the link cold.
- [ ] **English only.** People he shares with may want an Arabic interface: at least keep all UI strings in one
  place so a translation is possible.
- [ ] **Mixed icon styles remain:** home uses line icons, buttons still use emoji (🎤 ▶ ■ ↗ ⚙︎). Pick one style.

### Done recently (for orientation)
2026-11-25: fresh-eye design pass; same step words everywhere (Listen/Watch → Slowly → In time).
2026-11-24: how-to guides, drills, first tunes, Settings (5/6 strings, strings 5 and 6), across-the-strings training,
speed ladder, all takes in one zip, clicks stop on Stop, octave fix from his recording.
2026-11-23: Your path (8 stages), daily practice, risha trainer, the 8 maqamat, repeat until right.

## 0. Make it feel smooth (owner, 2026-11-21/22: "doesn't feel usable"; "the interface is the problem")
Done 2026-11-22: rebuilt as home → song path → lesson (Listen → Slowly → In time), one main button,
big note + neck drawing, green/red flash, "I hear" meter, moving lane, stars, settings behind ⚙︎.
Next: owner tries it on his phone and says what still feels off.
Too many choices before playing; Learn and Practice are split; loading recordings is a chore; feedback
is small text he can't read while holding the oud. Plan, one simple "Play" screen per song:
- [x] Real video on top, the CURRENT note huge in the middle, the next note under it.
- [x] One big button: Listen → Play with me (mic starts after a 3-2-1 count). No tab switching.
- [x] Feedback readable from a distance: whole screen flashes green (right) / red (wrong), big text.
- [x] Settings (version, part, timing, main notes, speed) behind one ⚙️ button; open each song on its
  best version (Hob Eih: Player 4 or Original); tap a line to pick it.
- [ ] Ask the owner for a screen recording of where it feels clunky before polishing further.
Diagnosis 2026-11-22 (owner: "doesn't feel reliable and usable enough"), in order:
- [ ] Reliability first: never tested on his phone mic + his oud. Get one take via Send to Claude, measure
  how often it hears right notes as wrong, tune until a correct note is never marked wrong.
- [ ] Notes he can't trust: rebuild each song's main version from the original recording, in beats.
- [x] First screen is all setup (song, version, switch, parts, "load the recording"), no notes visible.
- [ ] Recording must be loaded by hand each time from a file sent in chat.
- [x] Practice: 3 modes + timing switch (shown even in Wait mode, where it means nothing) + 18 controls.
- [ ] Computer playback sound is a synth, not an oud.

## 0b. From the three fresh-eyes reviews (2026-11-22)
Fixed the same day: stars need right notes AND timing; Stop = cancelled (not saved); big card shows the
note coming next in In time; result replaces the card; bigger neck with thin→thick strings; In time
lights only the line (no full-screen strobe); ✓/✗ mark; RTL fixes (بعدها, <bdi>); "I hear" uses the
song's own note names; quarter tones judged within ±30 cents; steady mic delay removed (≤0.15 s) and a
steady early/late is one tip; count-in at the song's beat; 60–100% speeds; stuck 3× → Hear it / Skip;
first-day card (strings, fingers, tune first); Back from a lesson → the song; iPad two columns.
Still to build, best first:
- [ ] A beat while playing (soft click or darbuka), after checking the phone speaker doesn't fool the mic.
- [ ] "Fix the hard bit": after a take, a 2–4 note drill around the worst spot, then back to the line.
- [ ] Maqam card on the song screen + مي half-flat trainer (hear Mi♭ / half-flat / Mi, then find it).
- [ ] "Today" button: tune → warm-up on weak notes → hard bit → one line in time; streak; weekly before/after.
- [ ] Better Claude loop: a 3-line plain summary on top of each sent take.
- [ ] Learn a long line in halves; echo game (hear 2–3 notes, play them back); picking-direction marks.
- [ ] Mic-delay check ("pick with the clicks") if the automatic correction isn't enough on his phone.

## 1. Make the song sound like the real song (top priority)
The owner's verdict (2026-11-21): the notes and timing still don't sound like the actual song.
Why: each version copies one player's decorated performance, transcribed with a basic pitch tracker,
and played back with a synthetic string sound. Plan:
- [x] **Use the original recording as the reference.** Found on archive.org; Original version added (2026-11-21).
- [ ] Use archive.org (and other legal download sources) for the other songs' original recordings.
- [ ] **Isolate the melody** from the orchestra with a source-separation model (Demucs), so the
  transcription follows the real tune, not one oud player's arrangement.
- [x] **Better transcription tools**: Basic Pitch (ONNX) used for the Original (2026-11-21).
- [ ] **Find the beat and write rhythm in beats** (e.g. سي 2 beats, دو 1), not raw seconds. Then the
  song plays in time at any speed, and "on time" means on the beat, like a real teacher counts.
- [ ] **Separate melody from decoration**: notes all players and the original share are the melody;
  the rest are optional ornaments, shown smaller.
- [ ] **Listening check with the owner**: an A/B page (original clip ↔ transcription, line by line)
  where he taps "sounds right" or "sounds wrong here". Fix every "wrong" before it goes in the app.
- [ ] **Real oud sound for playback**: record the owner's own oud, one note per position, and play
  the song with it. (A free oud sample library is the fallback; its download was blocked once.)

## Songs waiting for a video (owner asked 2026-11-21)
- [x] حب من تحب and أحب الليل والسهرة added from the owner's videos (2026-11-21)
- [x] حب من تحب: the part after "صول فا" (done 2026-11-22). Singer's name still unknown.
- [ ] Easy suggestions with published note sheets: Abadi Al Johar — نساي، سكة طويلة; Khaled Abdulrahman — يوم كنتي
Written notes for these could not be read online (sites blocked or no notes). Each gets added with real
timing once the owner sends a video of someone playing it.

## 2. Later: create a song from an uploaded video (owner: "make it later, not now")
Owner uploads a video of a song → the app writes out the notes → he checks them → saved as a song.
Plan:
1. Upload: video or audio file from the phone.
2. Audio: extract it; optionally isolate the oud or the melody (Demucs).
3. Tuning: find the player's offset from standard (best fit to the maqam).
4. Notes: pitch + picks with Basic Pitch / CREPE (in the browser via its JS/ONNX version, or done by
   Claude when the owner sends the video in chat).
5. Rhythm: beat tracking, notes written in beats.
6. Where to play: choose string and finger for each note (lowest hand movement, open strings first).
7. Lines: split at long notes and breaths.
8. Review: side-by-side listening (original ↔ transcription), owner fixes or confirms, then save.
Until it exists: the owner sends a video in the Claude chat and Claude adds the song by hand.

## 3. Ideas to make it a real coach (to discuss with the owner)
Progress
- [ ] Daily practice plan (5–15 min) built from weak notes and past takes; streaks.
- [ ] Speed builder: each clean take raises the tempo 5% until full speed.
- [ ] Progress charts per line over days ("line 2: 60% → 90% this week").
Hearing and hands
- [ ] Oud neck view: a drawn neck shows where to press, and a live dot shows where your pitch lands
  ("a few mm toward the body").
- [ ] Your pitch line over the reference pitch line after each take (see exactly where you drift).
- [ ] Ear training: the app plays a note or a short phrase, you find it on the oud, the mic checks.
- [ ] Quarter-tone trainer for مي half-flat and other Arabic notes.
- [ ] Warm-ups: finger exercises and scales with mic checking.
Rhythm
- [ ] Rhythm trainer with darbuka patterns (baladi, maqsum, saidi) and a picking-evenness score.
- [ ] Tremolo (riyasha) trainer: picks per second, evenness, endurance.
- [ ] Down-stroke / up-stroke marks in the notation.
Music
- [ ] Maqam explorer: Bayati, Rast, Hijaz, Saba, Nahawand — hear them, see them on the neck, drills.
- [ ] Play along with a backing track (darbuka, or the original song with the melody removed).
- [ ] More songs, chosen by the owner.
Tools
- [ ] Latency calibration for play-along.
- [ ] Works offline (installable app with cached files).
- [ ] Notation options: Arabic names, Western names, string/finger only.
- [ ] Export a short video of a take with the notes on screen, to share.
- [ ] Optional automatic sync of takes so Claude sees them without tapping Send.
- [ ] Camera check of posture and pick angle (much later).

## Done
- [x] Main notes only switch; More versions section; phone layout polish (2026-11-21).
- [x] Real recording player with notes in sync; recordings tuned to standard and sent in chat (2026-11-21).
- [x] Tuner, song map, wait / play along / free play, feedback, saved takes, Send to Claude (2026-11-21).
- [x] Song library with versions: Player 1–4, Lesson, Simple; repeated picks shown as ×n (2026-11-21).
- [x] Note sheet (whole intro, 14 lines) and Tónos versions; "Judge my timing" switch; Practice header;
  Practice button on each line; songs waiting for a video listed in the song picker (2026-11-21).
