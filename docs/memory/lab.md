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
(26/26); حب من تحب Player 1 fair (63/63, see section 5 for the final count).
**Not tested**: the owner's real oud.

## 3. أحب الليل Solo: timing tightened with the gate (data only, not in the app)
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

## 4. Next experiments (planned)
- Fast soft spots: compare the gate's onset settings with a finer one (hop 64) and a per-pitch attack time at the
  places in section 3, in a LAB copy of the gate (`tools/lab/`), never in `tools/verify_version.py`.
- Render the tightened أحب الليل and send the overlay; only if the owner says it is closer, add it to the app.

## 5. Results log (newest last)
- 2026-11-27: sections 1-3 written. Echo-fix round 6 in progress when written.
