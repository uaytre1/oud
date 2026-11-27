---
authority: reference
status: live
---
# How Fable made the version that sounds right, and why the others went wrong

Written 2026-11-27 by the local Claude, from the cloud Claude's (Fable's) commits, its log entries and new
measurements. Owner's request: learn exactly what Fable did, write it down as a guide to follow step by step,
"and not mess it up". This file only describes and measures. It does not change the app, the song data or the
other standards. Where it disagrees with another doc, the disagreement is listed at the end for the owner to settle.

## 1. What the owner heard (2026-11-27, same new synth sound on all of them, real recording first; in the Player 4
file the real part was by mistake 4.5 half steps high, the computer part was right)
| Version | How it was made | Owner |
|---|---|---|
| حب إيه Player 4, Fable's rebuild (`tools/candidates/hob-eih-player-4-mirror.json`) | Fable's own measurement (2026-11-21), owner's flick removals, then the gate | **"perfect"** (2026-11-26: "it sounds better, much better") |
| حب إيه Main = Player 2 (tools/candidates/hob-eih-player-2-mirror.json) | Basic Pitch pipeline (local agent), then ear edits by Claude and Antigravity | "shit" |
| حب إيه 92 s solo v1 (commit `3283eee`) | tools/mirror (Basic Pitch) + Antigravity's ear edits | "shit" |
| حب إيه 92 s solo v2 (commit `9e250c3`) | v1 + fast picks added (tools/mirror/addfast.py, tools/mirror/retime.py) | "so shit" |
| أحب الليل solo v1 / v2 | same as the 92 s solo | v1 "80% right", v2 worse |
On the sound itself (every version): "the oud sounds are so bad, doesn't even sound like oud, sound like electric
guitar". So the synth is a separate problem (section 7). The notes are what made Fable's version right.

## 2. The short answer
Fable's notes take each note's **pitch from the recording's own pitch track at the pick (pyin)** and check the
**octave of every low and high فا and لا by hand-measurement**. The newer pipeline takes the pitch from Basic Pitch's
"strongest event" and sets the octave "near the neighbours" inside midi 45–77. That rule cannot write فا قرار
(midi 41), and the strongest event is often the string that is still ringing. The gate passes both mistakes,
because its pitch test accepts an octave (the low فا's 2nd harmonic IS the middle فا) and blurs neighbours.

Measured (pyin, median 30–120 ms after each written note, each version against its own tuned recording):
| Version | Same note | Octave off | **Different note** |
|---|---|---|---|
| Fable Player 4 (perfect) | 36 of 43 | 7 (mostly the middle فا ×4 while the low فا still rings) | **0** |
| Main Player 2 (bad) | 29 of 43 | 3 | **11** |
| 92 s v1 (bad) | 56 of 67 | 3 | **7** |
| 92 s v2 (very bad) | 66 of 81 | 4 | **9** |
| أحب الليل v1 (80%) | 109 of 124 | 5 | **8** |
The chroma match (Fable's old check, octave-blind) does NOT separate them: Fable 0.85, Main 0.86, 92 s v1 0.79.
The gate does NOT separate them: all of them PASS at `--rise 3.5` (Fable's too; at 5.0 it is 88%).

Two places, so anyone can hear it:
- The tune is "ري مي فا قرار · فا ×4". Fable writes `re faL fa fa fa fa`. Main and the 92 s solo write
  `re fa fa fa fa`: the low فا became a middle فا. pyin at that pick: Main 3.08 s = 41.0, 92 s 2.51 s = 40.9 (low فا).
- The tune goes on "صول فا صول لا". Fable writes `sol fa sol sol la`. Main writes `sol la sol` at 4.51-4.87 s, where
  the recording reads فا (53.1-53.7): that is the spot the owner called wrong ("in 20 [s of the A/B] the 2 notes").
  pyin may be hearing the فا ×4 still ringing there: measure it again by section 4 step 4 before changing anything.

## 3. Exactly what Fable did for Player 4 (in order, with the commits)
1. **2026-11-21, `666987b`**: transcribed "pick by pick from a performance video and checked against it"
   (header of `js/songs/hob-eih.js`, method in `docs/memory/songs.md`):
   - tuning offset: best fit of all pitches to the maqam, removed (Player 4: −2.28, which means tune DOWN 2.28 half steps; see section 4, step 1);
   - pick times: Basic Pitch note starts and onset strength, time taken from the attack;
   - pitch: librosa pyin over a short window at each pick (about 50 ms), mapped to the song's note keys;
   - "the octave of every low/high فا and لا confirmed", one by one;
   - "repeated picks weaker than background noise removed";
   - checked: render with the app, compare with the recording (pitch per moment, onsets within 50 ms with the
     same pitch, chroma against shifted controls), and the tuned recording played into the coach.
2. **2026-11-22**: the owner's A/B/C test: Player 4 every note "so good, so perfect"; main-notes-only sounded bad
   (it removed repeated picks, which are the rhythm). Repeats stayed.
3. **2026-11-23, `bb0814a`**: the owner's flick rule: "سي دو لا صول", the small سي between two لا is an extra note.
   Removed that flick and the same one in line 2. Rule: a quick neighbour flick X-Y-X under 0.25 s goes.
   (First measurement 50 notes → 46: removed 1.44 سي, 1.52 لا, 4.58 لا, 4.65 صول.)
3b. **2026-11-23, `449bc5d`**: the owner's string rule: "the four فا are on string 3, finger 2 (players don't pick the
   low فا four times)". The first measurement had written the run as low فا ×4 (pyin heard the low string still
   ringing). Now: one فا قرار, then the middle فا ×4, exactly four; the same in line 3. So Fable's own pitch method
   made an octave mistake too, in the other direction, and the owner's knowledge of the tune fixed it.
4. Later hand edits (teacher's captions at 4-8 s, `d2f0a4a`; the hole closed for "Main") failed the gate (85%) and were dropped
   (`docs/memory/decisions.md`: "each fixed one spot and broke the next").
5. **2026-11-26, Mirror**: started again from the `bb0814a` notes with the 3b string rule (before those hand edits), ran the gate against
   Player 4's own recording: 46 notes, 83%. Removed only the 3 notes it flagged (low ري fill, 6.29 / 6.51 / 6.71 s).
   Kept the 5 notes that passed at `--rise 3.5` (soft notes). Added nothing. 43 notes.
6. A/B: real first (tuned file, from 0.3 s before the first note, 13.6 s, fade out), 1.2 s silence, then the app's
   own sound rendering the same notes (`renderOffline`, each note's length = gap to the next, at most 1.6 s).

**Checked 2026-11-27: the audio the owner calls perfect is exactly `tools/candidates/hob-eih-player-4-mirror.json`**
(Fable's A/B file: every one of the 43 notes has an onset within 30 ms, median 7 ms, no extra onset). The app's
"Player 4" version is NOT this: it still has the 2026-11-23 caption edits (40 notes; it differs at 2.67 s and 4.4-5.9 s).

## 4. The guide: make a version the way Fable did (follow every step, in order)
0. **One recording, chosen by the owner's ear.** He liked Player 4's feel before any rebuild. Ask which player.
1. **Tune it, then prove the tuning.** Measure the offset (all pitches fitted to the maqam). Tune with ffmpeg
   (`asetrate` + `aresample` + `atempo`, length unchanged). **Then check with pyin: the song's first note must read
   its own key ±0.3** (حب إيه starts on سي = 58). If it reads about 4-5 half steps off, the sign was wrong.
   (Claude, 2026-11-27, tuned Player 4 the wrong way: the real part of an A/B was 4.5 half steps high.)
2. **Pick times**: Basic Pitch note starts and onset strength; the time is the attack. Keep a pick only if the
   level jumps 5 dB or there is a pick click (`docs/memory/detection.md`); one pitch within 70 ms counts once.
3. **Pitch of each pick: pyin**, median 30-120 ms after the pick, full oud range (midi 38-80, so فا قرار 41 and
   لا قرار 45 are possible). Map to the nearest key of the maqam (`js/notes.js`). Not Basic Pitch's strongest event.
4. **Octave, one note at a time, for every فا and لا and anything below دو (48)**: measure the low range on its own.
   If the low fundamental starts at that pick, it is the low note (قرار). A middle note picked while the low one
   still rings can read low: keep the octave the pick itself adds (in حب إيه the player picks فا قرار once, then
   the middle فا ×4). Never choose an octave "to stay near the neighbours".
5. **Remove only**: second detections, picks not louder than the background, and flicks X-Y-X under 0.25 s.
6. **Gate** against the same recording (`tools/verify_version.py --strict --report`). A note it says is not there:
   test it at `--rise 3.5`; soft = keep and list; still failing = remove. Add nothing for a stray pick unless it
   passes steps 2-4.
7. **Pitch check (the one the gate cannot do)**: the pyin table of section 2. **"Different note" must be 0**, as
   Fable's is. "Octave off" is allowed only where a low string is still ringing under a re-picked middle note.
   Every listed note is measured again (steps 3-4), never guessed.
8. **The owner's rules for this tune** (each one came from his ear; apply them to every player of حب إيه):
   starts سي دو لا صول with nothing before it; no X-Y-X flick under 0.25 s; "ري مي فا قرار" is ONE low فا, then
   the middle فا ×4 on string 3, exactly four.
8b. **Tune check**: where the player plays the tune, his pitch classes should follow the teacher's notes
   (حب إيه: سي دو لا صول · ري مي فا قرار · فا ×4 · صول فا صول لا · لا صول فا مي ري). A mismatch is a place to
   measure again, not to edit. Players do add their own touches: if the measurement says so, keep it.
9. **A/B**: the real recording (key proven in step 1), then the computer, nothing else. List the unsure seconds.
10. **The owner decides.** If he names a note, remove it and write it down (`docs/memory/song-standard.md` step 7).

## 5. Never (each one happened)
- Never set an octave by "near the neighbours", and never limit notes to midi 45-77 (it deletes فا قرار).
- Never take a note's pitch from Basic Pitch's strongest event alone.
- Never change a pitch from your own spectrum math: Claude's "new energy" reading turned two لا into سي (draft 3,
  "much worse").
- Never remove or move a note on another model's ear alone: Antigravity called a real pick (5.80 s, 8 dB jump,
  10 dB click) an echo; removing it made the line "hesitant".
- Never add fast picks to a version that sounds right (92 s v2 and أحب الليل v2: "so shit", "worse").
- Never call a version good because the gate PASSES or the chroma is high: both are blind to the errors above.
- Never send an A/B before checking the real part's key (section 4 step 1).

## 6. What is still not known
- Whether pyin alone is right at every note: on Fable's version it reads the ringing low فا under the middle فا ×4.
  A note-by-note low-range check (step 4) settles those; it is not a tool yet.
- Whether Main and the 92 s solo become "perfect" when rebuilt this way. Not tried (owner asked for this guide first).

## 7. The sound (separate from the notes)
- Owner, 2026-11-27, on the new same-string damping (the git branch claude/restrike, not released): "sound like
  electric guitar". Do not release that branch. The plan for real sound is real plucks (`docs/memory/oud-sound.md`).

## 8. Where other docs disagree with this one (owner to decide; not changed here)
- `docs/memory/song-standard.md` step 3: "pitch... in the oud's melody range (midi 45-77)" and "choose the octave
  that keeps the melody near its neighbours". Section 4 steps 3-4 above say the opposite.
- `docs/memory/transcription.md` "The pipeline to standardize on" step 3: "Basic Pitch note events as the primary
  reading" and the same octave rule. Fable's own measured versions used pyin for pitch.
- tools/mirror/README.md step 3: "pitch = the strongest event, snapped to a song key; octave set by the neighbours".

## 9. Side by side: Fable's Player 4 and Claude's Main (Player 2), as the owner asked (2026-11-27)
- Is Fable's A/B the same as its saved file? **Yes.** Fable's own code (pasted by the owner) saved the notes it
  rendered; Claude checked the audio note by note: 43 of 43.
- Did Fable build it? **Yes.** Fable did NOT build tools/mirror/ (the local Claude did, 2026-11-27; it made the
  92 s solo v1/v2). Fable built the gate, the standard and this Player 4 version.
- Did Claude make Main the same way? **No.**
| Step | Fable (Player 4, "perfect") | Claude (Main = Player 2, "shit") |
|---|---|---|
| Where the notes came from | its own measurement of the recording, pick by pick, pitch from pyin | a draft made by Antigravity's own script (Basic Pitch, strongest event, octave by neighbours) |
| Low فا (فا قرار) | measured; one low فا, then four middle فا (owner's rule) | written as middle فا (the script cannot write midi 41) |
| The owner's tune rules | all three applied | only "starts سي دو لا صول" |
| The gate | run; removed only what it flagged; soft notes kept | run; same |
| Changes after the gate | none | pitches changed from Claude's own spectrum math (rejected), notes removed and put back on Antigravity's ear |
| Notes whose real pitch is a different note (pyin) | 0 | 11 |
Lesson: the check (gate) was the same; the notes going into it were not. Fable measured; Claude patched a guess.

## 10. Which "Mirror" files are Fable's (checked in git, 2026-11-27)
| File | Made by | What it is |
|---|---|---|
| `docs/memory/song-standard.md` | **Fable** (cloud, 2026-11-26); the desktop Claude corrected steps 2-3 (pitch by pyin, octave measured) and added the ornament bullet on 2026-11-27 | the Mirror standard |
| `tools/verify_version.py` | **Fable**, never changed since | the gate (the mirror check) |
| `tools/candidates/hob-eih-player-4-mirror.json` | **Fable** (commit `e862899`) | the version the owner calls perfect |
| tools/mirror/ (all scripts) | **not Fable**: the local "Oud Claude" session, 2026-11-27 02:49-03:38 | a Basic Pitch builder; made the two below |
| tools/candidates/hob-eih-solo92-mirror.json, tools/candidates/ahib-al-lail-solo-mirror.json | not Fable (made with tools/mirror/) | the 92 s solo and أحب الليل candidates (owner: bad) |
| tools/candidates/hob-eih-player-2-mirror.json | not Fable: the desktop Claude, from Antigravity's draft | the Main of 2026-11-27.1 (owner: bad) |
The word "mirror" in a file name does not mean Fable's method. Only the first three are Fable's.
**Removed 2026-11-27 at the owner's request: the last four rows (they stay in git history).**
