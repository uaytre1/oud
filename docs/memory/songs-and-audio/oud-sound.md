---
authority: rule
status: plan (not built)
---
# Real oud sound: from the owner's plucks to the app's playback

Goal (owner, 2026-11-26): Listen and "Hear it" should sound like a real oud, also when notes are fast, instead of
the computed sound in `js/audio.js`. This page is the whole method: what he records, how an agent checks and cuts
it, how the app plays it, and how to know it is good. Follow it in order. Nothing here is built yet.

## Before anything: one decision that is the owner's
**Decided (2026-11-26):** the owner said yes ("its fine, its only my oud") to storing short single-note samples of his
oud (no voice, no room talk) in a `samples` folder at the repo root. When samples are added, update
`tools/check_docs.py` to allow audio files only in that folder and only under 80 kB each.
He also asked for a guided in-app recorder (`js/record-oud.js`, route `#/record-oud`, linked from Settings) so he
can check tuning (5th string = فا قرار), follow the exact sequence below without talking, and export labeled WAVs
in one `.zip`.

## What the owner records (about 5 minutes, once)
Phone on a table 30–40 cm in front of the oud, quiet room, Voice Memos set to Lossless. Tune first with the app.
Say the string number before each string. Let every note ring until it is gone (about 3 seconds). Medium loudness.
For each string, thickest to thinnest (6 or 5 strings, as in Settings):
1. Open string: down stroke (صد) ×3, then up stroke (رد) ×3.
2. Finger 1: صد ×3, رد ×3.   3. Finger 2: صد ×3, رد ×3.   4. Finger 3: صد ×3, رد ×3.   5. Finger 4: صد ×3, رد ×3.
   (Fingers where the app puts them: a whole step, three, four and five half steps above the open string. On
   string 3 also the half-flat مي with finger 1; on string 2 the half-flat سي with finger 2.)
Then two extras on string 3: the same open note picked 8 times fast (صد رد صد رد…), and 5 seconds of tremolo.
One long memo is fine. If a note buzzes or is clearly out of tune, play it again and say "again".

## What the agent does with the memo (each step has a pass mark)
1. **Cut**: find each pick (level jump of 8 dB or more), cut from 5 ms before the pick to where the note is 40 dB down
   or the next pick, fade the last 30 ms. The spoken numbers separate the strings. Pass: 30 picks per string, or
   the missing ones are listed for him to re-record.
2. **Name each note**: measure its pitch (median over 0.1–0.6 s). It must be within 60 cents of an expected note of
   that string (open, fingers 1–4, the half-flats). This is also the **finger check**: a note that lands on the wrong
   pitch class is a wrong finger position: list it ("string 3 finger 2 sounded مي, expected فا").
3. **Tuning check**: report cents off for every open string and every fingered note in one small table and send it
   to him. Open string more than 10 cents off: ask him to retune and redo that string. Fingered note 10–35 cents
   off: correct it by resampling (pitch shift) to the exact target, and tell him which way his finger tends to sit.
   More than 35 cents: re-record. Half-flats are corrected to the app's targets (مي 51.3, سي 58.3), not to 51.5.
4. **Choose**: of the 3 takes of each note and stroke keep the 2 cleanest (no buzz, steady pitch, similar loudness).
   Normalise all kept samples to the same loudness (RMS of the first 300 ms), keep the natural decay.
5. **Pack**: mono, 32 kHz, AAC `.m4a` or MP3 (both play in Safari), about 2 s each, target under 2 MB in total. A small
   JSON map: for each sample its midi, string, finger, stroke (down/up), file, and gain.
Pass for the whole set: every note the songs use (`js/notes.js`) has a sample within 2 half steps on the same
string, and he has heard the table and agreed.

## How the app plays them (`js/audio.js`, oud-sound section only; the Listener is not touched)
- `schedule()` picks the sample for the note: same string and finger if it exists, else the nearest sample on that
  string shifted by `playbackRate` (at most 2 half steps), else the synth as it is today. The synth stays as the
  fallback for missing samples and while samples load.
- **Not the same sample twice in a row**: alternate the 2 takes (round robin), and use an up-stroke sample for every
  second pick of a fast run (two picks of one string less than 0.35 s apart).
- **Fast notes**: when a string is picked again, fade the old voice on that string over 15–30 ms (the risha stops
  the string); voices on other strings keep ringing, as on the oud. Never cut a voice without a fade (clicks).
- **Tremolo and repeats faster than 0.12 s**: start the sample 10–20 ms in (softer attack) and at 80–90% gain, so a
  run does not sound like a machine gun. Compare by ear with his own fast-picks and tremolo takes.
- Loudness: one master gain so Listen is as loud as today; a soft limiter at the output.
- Loading: fetch and decode after the first tap (iOS needs a user gesture for audio), show nothing, play the synth
  until ready. Keep the decoded buffers in memory; never block a lesson on a download.

## How to know it is good (all must hold before release)
1. **Owner's ear**: A/B of one line of حب من تحب: real player, then the app with samples. He says it sounds like an oud.
2. **Fast playing**: the same A/B for a line with a fast run (حب إيه line 3) and for a risha rhythm in Watch.
3. **The app still hears itself**: the regression set in `docs/memory/songs-and-audio/song-standard.md`, rendered with the NEW
   sound, still passes 3 times each on a quiet machine (the tests feed the app's own sound into its listener).
4. **Phone**: first sound within 1 s of the first tap on his iPhone; page weight up by less than 2 MB; works offline
   after the first load (or falls back to the synth).
5. Setting in Settings: "Oud sound: My oud / Computer", so he can always go back.

## What can go wrong (seen in this project already)
- The computed sound's low courses beat strongly and gave the listener false onsets; sampled low strings may do the
  same or less. Re-run the listener numbers in `docs/memory/songs-and-audio/detection.md` after the change, do not assume.
- A sample that starts late (silence before the pick) makes every note late: check each cut starts within 5 ms.
- Pitch-shifting more than 2 half steps sounds wrong (the body of the oud moves with it): record more notes instead.

## Design for the real-sample engine and the voice memo (Claude Fable, 2026-11-28; not built yet)
Source: the owner's 194 plucks (record-oud zip, 2026-11-28). He allows the plucks in the public repo; his voice never.
Antigravity's check: every position read 6 of 6, open strings within 12 cents, fingered notes 14-32 cents flat.
**Engine (in this order, each step tested before the next):**
1. Prepare offline: trim each pluck to its onset, correct its pitch by its own measured error (a few cents, no audible
   change), match loudness by the first 200 ms, cut to about 2.5 s with a fade. Check each with pyin: target within 5 cents.
2. Pick the sample by the note's own string and finger (song notes already carry them), so it sounds like the real
   fingering. A note that was not recorded (quarter tones) = nearest pluck on the same string, shifted under 1 half step.
3. Round-robin: 3 down and 3 up takes per position. Never the same take twice in a row; fast alternating notes use
   down/up as the risha marks in the lesson show. This removes the machine-gun sound.
4. Strings behave like strings: a new note on the same string cuts the old one in about 15 ms; notes on other strings
   keep ringing.
5. Music, not a typewriter: play each note at the loudness measured for that note in the player's recording (the
   mirror already has the timing; add the level), keep the fast-repeat rule above (start 10-20 ms in, 80-90% gain).
6. Size: compress (AAC, mono), load only the notes the current song uses, cache for offline use.
7. Switch in Settings: Computer oud / Real oud. Any user can record his own oud and use it (kept on the device).
**Tests:** every song line rendered with the engine passes Slowly 3 times; one line sent to the owner three ways
(computer, real plucks flat, real plucks with the player's dynamics) and he picks by ear before more is built.
**More uses of the same plucks:**
- A realistic test player: render the songs from his real plucks (with their real ringing) as fake-mic takes. This is
  the best way to reproduce the echo problem and to test the tuner on strings 5 and 6.
- "My oud report" for him: per finger, where his fingers land (for example finger 1 a little toward the pegs), with one
  tip each. The numbers are already measured.
**Voice memo (he plays and says what he plays): scratchpad only, never in git.**
- It is labelled truth from the player. Split voice from plucks (plucks: sharp start, steady pitch, decay), measure each
  pluck with pyin, list: time, what he said, pitch measured, string and finger, name the app would show. Where his word
  and the app's name differ, the app follows his word.
- Words: no hearing agent is online until 3 December. Either ask him to allow a small local speech model, or show him
  the table with times and let him confirm the names. Do not guess what he said.
- Same pipeline as the tool "Write what I play": notes heard -> rows -> a saved exercise or version, checked against his
  own recording with the gate.
- Compare with the players: measure where each player really puts the quarter tones (مي and سي half-flat, in cents) and
  where he puts them. Use the players' measured cents as the targets of the quarter-tone trainer, not theory.

