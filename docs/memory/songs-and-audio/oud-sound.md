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
- Dropped by the owner 2026-11-28: a "My oud report" about where his fingers land.
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

## Measured on the owner's 194 plucks, and the method to follow (Claude Fable, 2026-11-28)
Measured with pyin and level meters on every file (script kept in the session scratchpad; redo with tools/lab when built):
- Format: 32 kHz mono, each file 2.7 s, pick starts 0-0.15 s in, nothing clipped.
- Set: 6 strings x (open + fingers 1-4) x 3 down + 3 up = 180, plus the two half-flat positions (string 2 finger 2,
  string 3 finger 1: 6 takes each), plus 8 fast picks and a tremolo on string 3.
- Pitch: takes of one position agree within 0-30 cents; fingered notes sit 20-30 cents flat (string 3 finger 1 is +15).
  Down and up strokes have the same pitch.
- **Level is low and uneven**: peaks -44 to -25 dBFS, background noise -64 to -59 dBFS. Loudness inside one position
  differs by up to 15 dB; down strokes are 2-9 dB louder than up strokes.
- **Strings 5 and 6 are only about 8-10 dB above the noise** (strings 1-2: 20 dB or more). Raised to playing level they
  will hiss. Best fix: he records strings 5 and 6 again with the phone about 20 cm from the sound hole. The recorder
  page should warn "too quiet, move closer" (level check before each string).
- Ring: string 1 fingered notes die in 0.55-0.7 s, open and low notes ring 1-2 s or more (natural; keep it).
**Method (do the steps in order; each has a pass mark; stop and report if one fails):**
1. Choose takes. Per position drop a take whose pitch is over 15 cents from the position's median, or 8 dB quieter
   than its median. Keep at least 2 down and 2 up. Pass: every position has them (else list it for re-recording).
2. Clean the noise once, the same way for every file: one noise profile from the silent starts and the last 0.2 s of
   all files; spectral subtraction of at most 10-12 dB, smoothed; no gate (a gate makes notes pump in and out, which is
   the "edited" sound he does not want). Fade the last 0.15 s. Pass: after step 4 the end of each file is at least
   30 dB under its start; positions that fail go on the re-record list.
3. Tune. Shift every take of a position by that position's median error (not take by take: the small differences
   between takes are what make it sound alive). Half-flat notes use the half-flat takes. Pass: position median within
   5 cents of the target, measured again with pyin.
4. Level. Set each position's median loudness (first 0.2 s after the pick) to the same value; squeeze the differences
   between takes to +-1.5 dB; keep up strokes 1.5 dB under down strokes. Pass: measured.
5. Trim to 5 ms before the pick (keep the risha click), no fade-in over 2 ms.
6. Engine rules: sample by the note's string and finger; round-robin, down for normal notes, down/up alternating for
   fast runs and repeats (as the risha marks show); a new note on the same string cuts the old one in 15 ms, other
   strings ring to their natural end; no artificial release; notes faster than 0.12 s start 10 ms in at 85%; the
   level of each note follows the player's recording, limited to +-6 dB; timing is the mirror's timing, untouched.
   A note with no take: nearest take on the same string, shifted by at most 2 half steps.
7. Prove it: (a) the numbers above; (b) every line rendered with the engine passes Slowly 3 times; (c) the mirror: run
   the gate (`tools/verify_version.py --strict`) with the RENDER as the recording: every note at its time and pitch,
   100%; (d) the owner's ear: حب إيه line 1 as computer / his plucks plain / his plucks with the player's dynamics.
Not built or heard by anyone yet. The noise finding may also explain the tuner's trouble on strings 5 and 6 (not proven).
- 2026-11-28, first listening clips sent to the owner (made offline by Claude Fable with a light version of steps 2-6:
  a short tune on strings 1-2 and a run on strings 5-6, each with and without hiss cleaning). Waiting for his ear.
  He recorded strings 5 and 6 with the phone at his left side, the others with the phone in front: that is why they
  are quieter. A friend may record his oud too (same page, same zip); it needs the friend's OK before it goes online.
- 2026-11-28, owner's ear on the first clips: strings 1-2 "decent, like someone playing, can improve"; strings 5-6
  "really bad", a fabric/moving noise. He will record strings 5 and 6 again with the phone in front.
  Voice memo checked (246 s, much louder than the zip: plucks 20-25 dB over its noise): it has clean long open plucks of
  strings 6, 5 and 4 but only 1-4 plucks of each fingered low note, so it cannot replace the low-string set.
  Second clip sent: حب إيه Main lines 1-3 with his plucks (mirror timing, fast notes alternate down/up, the app's low
  Fa mapped to his string 5 open). Waiting for his ear. Note for the engine: the app's string numbers for low notes do
  not match the recorder's (app says string 6 for Fa 41; his zip has string 5 = 41, string 6 = 36): map by pitch.

