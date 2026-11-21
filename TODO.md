# To do

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
- [ ] حب من تحب (singer not confirmed yet)
- [ ] أحب الليل والسهرة — Badr Al-Laimoun
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
- [x] Tuner, song map, wait / play along / free play, feedback, saved takes, Send to Claude (2026-11-21).
- [x] Song library with versions: Player 1–4, Lesson, Simple; repeated picks shown as ×n (2026-11-21).
- [x] Note sheet (whole intro, 14 lines) and Tónos versions; "Judge my timing" switch; Practice header;
  Practice button on each line; songs waiting for a video listed in the song picker (2026-11-21).
