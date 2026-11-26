---
authority: rule
status: live
---
# Song standard: how every song version is made (all agents)

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

## Lesson layer (after the notes are final; it must never move a note)
Melody / repeat / decoration marks, lines split at long notes, string and finger from `js/notes.js`.

## If the gate cannot be passed
Say so plainly to the owner with the score and the list of places, and ask for a cleaner recording of that song.
Do not lower the bar and do not patch.
