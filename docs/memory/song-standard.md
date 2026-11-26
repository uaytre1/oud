---
authority: rule
status: live
---
# The Mirror standard: how every song version is made (all agents)

Name: **Mirror**. The computer version must mirror ONE recording; the gate (`tools/verify_version.py`) is the mirror check.

The owner's rule, 2026-11-26: "make a standard or a system it can follow… to make this perfect each time".
Follow these steps in order for every version. No step is optional. Reasons and measurements are in
`docs/memory/transcription.md`; this page is only what to do.

## What the owner wants
- The computer version must sound like the recording it was made from: same notes, same timing, nothing added.
- For حب إيه he wants the **solo oud** versions (his uploaded solo videos). **Not the orchestra recording.**
- His complaints about agent output so far: **added notes, added beats, wrong timing.** So: when unsure, leave a
  note OUT. A missing soft note is a small fault; an invented note or a moved note ruins the tune.
- If it sounds wrong to him, it is wrong, whatever the score says.

## Never
- Never mix recordings (one player's notes on another's timing), and never "average" players into a version.
- Never edit note times by hand, never snap times to a grid or a tempo, never stretch a passage to "fix" it.
- Never add anything that is not a picked note of the recording: no beat, click, drum, count-in, chord or bass
  in the computer version or in the A/B audio.
- Never ship, or send to the owner as finished, a version that has not passed the gate with `--strict`.
- Never re-tune the gate to make a version pass.

## Steps
1. **One recording.** Tune it once to standard pitch (find the offset from all pitches against the maqam). Write the
   offset, the file name and the start time of each pass in `docs/memory/songs.md`. Audio stays out of git.
2. **Find candidate notes** with the tools you have (Basic Pitch note events first; other detectors may add
   candidates). Candidates are not notes yet.
3. **Keep a candidate only if all are true:**
   - the sound gets louder there (level jump of 5 dB or more) OR there is a clear pick click;
   - its pitch is steady for 60 ms or more and lies in the oud's melody range (midi 45–77), in or next to the maqam;
   - it is not a second detection of the same pick (same pitch within 70 ms: keep one);
   - a low open string (فا, لا) still ringing under the melody is NOT a new note.
   Octave: choose the octave that keeps the melody near its neighbours.
4. **Run the gate** against the same recording, with a report:
   `node tools/plain/notes.mjs <song> | python3 tools/verify_version.py --version <id> --media <tuned.wav> --start <s> --strict --report <file.json>`
5. **Act on the report, then run the gate again. Repeat until PASS.**
   - every note with verdict "not in the recording: delete" → run the gate again with `--rise 3.5`: if the note
     passes there it is a soft note: keep it and list it for the owner as unsure, with its time; if it still
     fails, delete it;
   - every "off time" note → take the time of the recording's pick (the report gives `move_by`); never the other way;
   - every stray pick → add a note there only if it passes step 3; otherwise leave it out and list it as unsure.
   PASS with `--strict` = 95% of notes right, notes not in the recording at most 4%, at most 2 stray picks.
6. **Overlay check by ear:** play the computer version over the recording (computer about 6 dB quieter). Every note
   should land together with the player's pick; a double hit means that note's time is wrong. Fix by step 5, not by hand.
7. **Send the owner A/B audio per line:** the real recording, then the computer version, nothing else in the audio.
   Name the unsure places by their seconds. He decides.
8. **Only after he says it sounds right:** add the version to the song file, make it the default if he chose it
   (`BEST` in `js/app.js`), bump `BUILD` and `version.json`, and write the gate's numbers in `docs/memory/songs.md`.
9. **Log it** in `docs/memory/log.md` (what recording, gate score, what he said), ending with "Next:".

## Other recordings as witnesses (owner's idea, 2026-11-26)
One recording builds the version. Other recordings of the same song may only help decide the unsure places:
- a soft note the gate is unsure of → keep it if two or more other players play that note at that place; drop it if none do;
- a stray pick with no note → add the note only if other players also play a note there;
- a phrase whose rhythm differs from every other player (`tools/check_rhythm.mjs`) → listen there again; do not change it.
Witnesses never add a note the main recording does not play, never move a time, and never replace the owner's ear.
Not built yet as a tool: today this is done by reading the other versions' notes at that place.

## Lesson layer (after the notes are final; it must never move a note)
Before release the version must also pass the app's own Slowly test on its render (`tools/run_test.js`), with main
notes only on and off. Two notes closer than about 0.1 s are one pick with an ornament: a learner cannot play them as
two, and the listener hears one. Keep both for Listen; the lesson needs a rule for them (open, see the log).
Melody / repeat / decoration marks, lines split at long notes, string and finger from `js/notes.js`.

## What keeps a lesson from getting stuck (built into the app; do not work around it in song data)
- Decorations are never asked for in Slowly.
- A repeat less than 0.15 s after the pick before it is not asked for (`needPicks`).
- A note less than 0.2 s after the pick before it is a FAST note: if it is not heard and the player plays the next
  note right, Slowly passes over it (at most two in a row). Normal notes are never passed over.
- A soft onset the listener is unsure of counts only when it is the expected note, never as a wrong note.
So fast passages in future songs cannot stall a lesson. Do NOT slow a song's data down or delete fast notes to make a
test pass: the data stays what the recording plays.
**Regression set before every release** (quiet machine, each 3 times): حب إيه Player 4 full audio 26/26; حب من تحب
Simple 95/95; حب من تحب Player 1 with `MAIN=on` render and `MAIN=on` 63/63; and the same fair test for any new version.

## If the gate cannot be passed
Say so plainly to the owner with the score and the list of places, and ask for a cleaner recording of that song.
Do not lower the bar and do not patch.
