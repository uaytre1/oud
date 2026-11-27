---
authority: reference
status: live
---
# Lab: experiments kept apart from Fable's version (local branch **claude/lab**, not pushed)

## The owner's rule (2026-11-27)
"Before making changes to the code, make the Fable version untouched and in a separate file, then make the
changes you want and test on it, but don't upload anything. Keep memory of everything in the MD files. If it
runs better, maybe we can push it to GitHub." So:
- Fable's originals are frozen, read-only, in `tools/fable/original/` (see its README for commits and sha256).
- Experiments: scripts in `tools/lab/`, data in `tools/lab/data/`, code changes only on local branches
  (**claude/lab**, **claude/echo-fix**). Local `main` = GitHub `main`. Nothing is pushed without the owner's yes.
- Every experiment and result is written here (newest section last), with the numbers.

## 1. Did Fable already fix soft or fast notes? (checked in git, 2026-11-27)
All of Fable's soft/fast work is in `main` and live: `6373279` the gate lists possible missing soft notes;
`e9659f0` Slowly counts soft picks, late ringing cannot advance; `7b33d9f` Slowly never stalls on a fast note;
`ab0410d` a repeat faster than 0.15 s is not asked for; `ded09d0` weak notes in Slowly. Two WIP branches
(claude/wip-weak-notes `01b389f`, claude/wip-level-gate `6775c37`): their content is in main in another form.
The gate itself was built for fast runs: per note it asks "does this pitch start here?" (CQT, quarter tones),
and reads WHEN from onsets tuned for fast picks (hop 128, delta 0.04, wait 3).

## 2. Echo fix in Slowly (branch **claude/echo-fix**, = **claude/lab** code; NOT pushed, waits for the owner)
**Problem** (found in the release tests of 2026-11-27.4): حب من تحب Simple, Slowly test, 10-11 mistakes in some runs
(live build 2 of 9, .4 build 5 of 9). The listener sometimes heard a faint فا after each فا pick; Slowly counted it
as a pick of a repeated فا, ended the group early, then every real فا was "wrong".
**Measured** (run logs, app's own render): echoes came 0.19-0.57 s after the pick, click (rise) 21-59% of the pick's,
and a level jump of -0.5 to 0.0 dB. Real soft repeats (أحب الليل دو x4, حب إيه, حب من تحب Player 1): click can be as
low as 44-59% of the pick before, but the level always jumps (2.3 dB or more; none under 0.5).
**Rule** (js/app.js, lesson section, waitNote): a normal onset at the same pitch as the pick just before, 0.05-0.6 s
after it, under 60% of its click AND level jump under 0.3 dB = echo: ignored (never a pick, never a mistake).
Plus, as the last check before marking "wrong" (after all safety nets): the note just played right, heard again
within 0.6 s, or within 1.5 s and under 80% of its click, is that note ringing: not a mistake.
**Rejected on the way** (each broke something, measured):
- click ratio alone (0.25-0.6 s, under 60%): threw away real soft repeats of دو in أحب الليل; the lesson fell 20
  notes behind (36/69, 47 mistakes, every run). The level-jump test is what separates them.
- a lower limit of 0.25 s: missed an echo at 0.19 s (33%).
- widening the old "still ringing" window (0.5 s) in its old place: echoes also came at 0.51 s and 0.82 s.
**Tests** (round 6, commit `d059264`, clean worktree, port 8799, one test at a time):
حب من تحب Simple 8 of 9 runs 95/95 with 0 mistakes (before: 10-11 mistakes in half the runs); 1 run stopped at
note 6 of 95 with 0 mistakes while the listener heard every later note: NOT explained. The new rules cannot
cause it (the note it stopped on, ري after دو, matches neither rule) but it is not proven; it was never seen in 18
runs of the live and .4 builds. أحب الليل Solo fair 3/3 and full 3/3 (69/69, 0 mistakes); حب إيه Player 4 3/3
(26/26); حب من تحب Player 1 fair 3/3 (63/63); حب إيه Main fair 3/3 (30/30). All with 0 mistakes.
**Not tested**: the owner's real oud.

## 3. أحب الليل Solo: timing tightened with the gate (data only, not in the app) -- REJECTED by the owner
**Owner, 2026-11-27, on the TIGHT overlay: "its not better, at second 10 it messes up, and there are much more
mistakes ... if urs has problems then use fable and cancel your changes".** Cancelled: the app keeps the released
version (the one he said sounds right). The data stays in `tools/lab/data/` only as a record. What changed near 10 s:
no note added or swapped, but in the fast دو-دو-دو (9.1-10.3 s) notes moved 23-28 ms LATER (9.159, 9.652, 10.012 دو,
10.332 لا), plus the 10 ms make-up in the overlay. Likely cause (not proven): the gate's onsets (backtrack off) mark
the peak of the sound change, a little after the attack the ear hears, so "exact to the onsets" pushed notes late.
Lesson: every number agreed (gate 117/117, median 1 ms) and the ear still said worse. Onset numbers cannot prove
"closer"; only the owner's ear can. Never tighten below the gate's normal 0.06 s by onsets again without his ear
on a short passage first.
Owner: "fix it, implementing mirror and making them match really closely, not by guessing and adding notes".
**Method** (`tools/lab/mirror_tight.py`, uses the gate unchanged): gate with `--tol 0.015` (strictest); every note
it calls "off time" takes the recording's pick time (move_by), Mirror step 5. A note moves only if that pick is
nearer to it than to any other note; if the pick is the same-key note's own pick, the two are one pick (keep one,
song-standard step 3). Repeat until stable. The constant shift the gate removes (12 ms) goes into the start time.
**Result**: 14 notes moved, 1 دو merged (24.257 s: it had no pick of its own; the gate put it on the دو 0.08 s
before). 117 notes, start 1.922 (was 1.91). Gate `--strict --tol 0.015`: 117/117 (was 103/118), not there 0,
stray picks 0, shift 0 ms; PASS at --rise 5.0 and 3.5. Second detector (`tools/lab/match.py`, librosa default
onsets, hop 64): median gap 6 ms (was 13), 108 of 117 under 20 ms (was 86 of 118).
Data: `tools/lab/data/ahib-solo-tight.json` (released notes: `tools/lab/data/ahib-solo-released.json`).
**Where the second detector still disagrees** (seconds of the recording): 10.62 لا +57 ms, 13.55 سي +40, 16.31 لا
-99, 16.91 صول -86, and no onset found within 0.1 s for 3.97 دو, 7.26 فا, 17.00 and 17.07 لا, 18.27 فا. These are
fast or soft places (16.91-17.07: صول لا لا 70 ms apart). The gate (more sensitive onsets) puts all of them within
15 ms. Which detector is right there is not proven: next step, section 4.
**Pitch** (pyin, `tools/lab/match.py`): 106 same note, 6 between keys (the player's لا half-flat sits 50-90 cents
high at 14.23, 16.74, 25.26; سي -50 at 5.64, 13.99; فا -60 at 18.27), 5 دو read an octave low by pyin (3.48, 14.68,
15.35, 25.59, 25.93). Not changed: the five دو are inside a fast دو-دو-دو on one string (same octave), and the CQT
new-energy check says middle دو; the high لا is the player's intonation of Bayati's لا half-flat (changing it to لا
would teach the wrong maqam). Never change a pitch from our own spectrum math (fable-method.md section 5).
**Owner's ear**: not yet. Overlay files were sent in chat (computer 3 dB louder than the player).

## 4. The fast soft spots: who was wrong? (`tools/lab/spots.py`, 2026-11-27)
At each disputed note, the pick time measured four ways (ms from the note, gate-0.015 data):
| second | note | gate onsets (hop 128) | fine onsets (hop 32) | risha click | pitch band |
|---|---|---|---|---|---|
| 3.97 | دو | none | none | +4 | +53 |
| 7.26 | فا | -3 | +3 | -19 | -12 |
| 10.62 | لا | -12 | -12 | +31 | -30 |
| 13.55 | سي | -12 | -12 | +27 | +20 |
| 16.31 | لا | -12 | -9 | -42 | +23 |
| 16.91 | صول | +1 | -1 | +40 | +42 |
| 17.00 | لا | -12 | -2 | +27 | +29 |
| 17.07 | لا | -12 | -11 | -43 | -41 |
| 18.27 | فا | +1 | +1 | -6 | -42 |
**Finding**: the gate's onsets and onsets 4x finer agree within about 10 ms everywhere. The click and pitch-band
times jump 20-45 ms either way in fast runs (neighbouring picks fall inside their window): not usable for timing.
So the "fast soft spots" were not placed wrong: the second detector in `tools/lab/match.py` (librosa default
onsets, delta 0.07) was too insensitive and missed soft picks or took a neighbour's. Fable's gate settings were
right. Use fine onsets (hop 32, delta 0.04, wait 2) as the independent check from now on.
**Then**: several notes sat 12 ms early by both precise measures, so the same Mirror tightening was run at
`--tol 0.010`: 30 notes moved by 10-15 ms each, none merged, 117/117 within 10 ms by the gate, start 1.922.
Data: `tools/lab/data/ahib-solo-tight10.json`.
**Independent check, every note, fine onsets** (one soft دو at 3.97 s has no sharp onset; its click is +4 ms):
| version | median gap | 90% under | worst | under 10 ms |
|---|---|---|---|---|
| released in the app (118 notes, start 1.910) | 9 ms | 23 ms | 49 ms | 64 of 117 |
| gate 0.015 (117 notes, start 1.922) | 2 ms | 7 ms | 12 ms | 112 of 116 |
| gate 0.010 (117 notes, start 1.922) | 1 ms | 3 ms | 9 ms | 116 of 116 |
Gate `--strict` on the 0.010 data: PASS at --rise 5.0 and 3.5, 117/117, 0 not there, 0 stray picks, 5 soft picks
without a note (the same 5 as before, measured in songs.md: 3 not picks, 2 unsure). No note added, no pitch changed.

## 4b. The app's sound speaks 10 ms late (found while checking the overlay, 2026-11-27)
The synth starts every note exactly on time (`src.start(t0)` in js/audio.js, no random timing; randomness is only
in the click and string noise), but its attack is soft: fine onsets hear it 10 ms after the scheduled time
(median +10, 10-90% +9..+12 ms, the same in every render and after m4a encoding). So in an overlay the computer
sounds 10 ms behind the player even when the data is exact. The overlay sent to the owner starts the computer track
10 ms earlier (shift 1.812 s instead of 1.822) to make up for it; the note data is not changed. Measured on that
overlay, computer attack vs player pluck, 113 notes: median 1 ms, 90% under 4 ms, worst 17 ms; 105 under 5 ms.
(The same check on the released version's overlay, without the make-up: median 7 ms, worst 64 ms.)
Render: `tools/lab/pass_notes.mjs` (the app's own buildPass) then `tools/lab/render_port.cjs` (the app's renderOffline,
seeded random), first note at 0.1 s. Not decided: whether the app should start its sound 10 ms early when it plays
along with a real recording (open question; nothing changed).

## 5. Next (planned)
- DONE: the 0.010 version rendered and the loud overlay sent. Only if the owner says it is closer,
  put it in the app (then the Slowly fair and full tests 3x, and the regression set).
- The echo fix waits for the owner's yes to push.

## 6. Results log (newest last)
- 2026-11-27: sections 1-3 written. Echo-fix round 6 in progress when written.
- 2026-11-27: section 4: the fast soft spots were the second detector's error; timing at 0.010 s, 117/117.
- 2026-11-27: echo-fix round 6 finished (section 2). Section 4b: the synth's 10 ms attack; TIGHT overlay sent
  (computer 3 dB louder than the player, 10 ms make-up): median 1 ms. Waiting for the owner's ear and his yes to push.
- 2026-11-27: owner: TIGHT is NOT better (messes up at 10 s, more mistakes): cancelled, see section 3. The echo fix
  is parked too (one unexplained stall; the owner: "if urs has problems then use fable and cancel your changes"): it
  stays only on the local branch as a record; the app keeps Fable's listening as released (2026-11-27.4).
