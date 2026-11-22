# To do

This is the plan for every agent (see `AGENTS.md`). The "Now" section is the one current direction.
Claim an item with `(claimed: <agent> <date>)` before starting it; log the result in `docs/memory/log.md`.

## Now (as of 2026-11-22)
- [ ] حب من تحب: full re-transcription from the owner's three new videos; fix the timing that goes bad midway. (claimed: claude 2026-11-22)
- [x] Tuner rebuilt toward Pano Tuner (A4 = 440, ±10 cents green, smooth needle). Shipped 2026-11-22.
- [x] New oud sound (synth retuned against real picks). Shipped 2026-11-22; owner still to hear the A/B clips.
- [ ] Owner retries Slowly on his iPhone after the pick-click fix and sends a take (Save to Files, attach in the same chat).
- [ ] A better way for takes to reach agents than a new chat each time (never via this public repo).

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
- [ ] حب من تحب: the part after "صول فا" (the video plays on: فا فا صول لا…) and the singer's name
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
