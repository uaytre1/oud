---
authority: reference
status: live
---
# Recent Session Log (newest first)

Format: `## YYYY-MM-DD [agent] short title`, then what changed, what was tested, and "Next:". Never edit
another agent's entry; add a correction line. Keep entries short; older entries live in `docs/memory/logs/archive/2026-11.md`.

## 2026-11-28 [claude] Owner feedback after trying 27.6 on his iPhone; feature picks
- Owner tried 27.6 on his iPhone: "it's good". First test on the real phone.
- His problems: (1) a ringing note still counts as the next note (echo); (2) wrong-note red "spams", "I hear" text not
  smooth, green overlay not clean; (3) tuner: strings 5 and 6 read wrong and it is slower than Pano Tuner; (4) By ear:
  unclear what to do; (5) In time: the bar does not move at the start.
- Picks: Real player slow-down + loop yes; Install as app yes; Today's lesson and Eyes-free maybe; Before and after and
  Rhythm trainer dropped. Three new tool ideas offered (Play with a band, Write what I play, Clean tone check).
- All of it is in the start-here note for Opus (sections 0 and A-G) and on `DASHBOARD.md`. Nothing built or tested.
- Next: Opus starts at step 0 of the start-here note.

## 2026-11-28 [claude] Fable review of the 27.7 candidate; start-here note for Opus; owner dashboard
- Reviewed Antigravity's note and commit 0654f77 (read-only, no test runs). Approved: coaching tools, drone fix,
  guardrails, memory folders (the test diff only changes 3 -> 2 oscillators; the gate tool is unchanged).
- Held for the owner's yes: (a) أحب الليل Solo line 4 note change (2 added, 1 removed; he approved the song by ear and
  second 10 is where an earlier change went wrong), (b) removal of old versions (حب إيه Original, Lesson, Player 1-3;
  أحب الليل Lesson): he was not asked.
- Owner: Antigravity is out until 3 December, so Opus works alone; pluck samples may go in the public repo, the voice
  memo may not unless the voice is removed (recorded in core/decisions.md).
- New: `DASHBOARD.md` (the owner's one-page follow-up list; agents update it after every step). Start-here note for
  Opus is in the Claude mailbox (auto-shown at session start).
- Correction (same day): the owner had asked Antigravity to remove those versions himself; hold (b) is lifted. Only
  the line 4 clip is left before release. No more plugins: tidy-up is step 6 of the start-here note.
- Tested: nothing run this session. Not on the iPhone.
- Next: Opus follows the start-here note: step 1 is the line 4 old-vs-new clip for the owner, then STOP for his answer.

## 2026-11-28 [antigravity] Finished 2026-11-27.7 candidate + Fable fix on أحب الليل + Real player version + multi-agent guardrails & memory folders
- Owner: (1) finish all 5 coaching tools, clean song variations, fix the wrong 7-note sequence in أحب الليل Solo using Fable's system (not ear guessing), add a Real player version with live notes on top for learners who dislike computer oud, and make `#/record-oud` easy for a friend with a 5-string oud; (2) install lean GitHub plugins (`ccusage`, `Beads`, `Superpowers`, `frontend-design`; skip `RTK`), organize `docs/memory` into folders + split the session log, and enforce rule-reading & communication across agents; (3) ask Claude at 05:50 for a low-usage approval check on the process.
- App & Song Changes (branch **claude/features**, build **2026-11-27.7**):
  1. `js/coach.js` + `js/app.js` (PRACTICE, LESSON): fixed `drone.fake(n, wantMidi)` so home-note plucks (`ري`, midi 50) pass in `Slowly` and `Call and response` while sub-octave speaker bleed stays blocked.
  2. `js/songs/hob-eih.js` + `js/songs/ahib-al-lail.js`: removed cluttered variations (`original`, `lesson`, `player-1..3` on حب إيه; `lesson` on أحب الليل).
  3. `js/songs/ahib-al-lail.js` (`Solo`): tuned recording losslessly via `ffmpeg asetrate+atempo` (+0.59 st) and verified with `pyin` + `CQT` (`tools/verify_version.py`): replaced false `laHF` ×7 in Line 4 with measured `[8.785, 'sol', 4]` (+10.38 dB CQT rise, pyin 55.10) + resolving `[10.825, 'sol', 4]` (pyin 55.00, +4.46 dB) and removed +79 ms duplicate `[24.257, 'do', 9]`.
  4. `index.html` + `js/app.js` (SONG, LESSON, SETTINGS) + `style.css`: added **Real player** directly to `#verChips` and `#versionList` on songs with `version.media`, wired `playPhrase` across `Listen`, `Slowly` (`▶ Hear it`), and `In time` (`▶ Hear it`), and added `#realHud` live Arabic note + next-note overlay over `#realStage` in sync with `#neck` + `#strip`.
  5. `js/record-oud.js` + `style.css` + `js/app.js`: added top `5 strings / 6 strings` guide (`#roOudPick`) + String 5 tuning buttons (`فا / صول / ري`) and hid `#intro` on `#/record-oud`.
- Workflow, Plugins & Memory Changes:
  1. Reorganized `docs/memory` into `docs/memory/core`, `docs/memory/songs-and-audio`, `docs/memory/teaching-and-ui`, and `docs/memory/logs` (`docs/memory/logs/latest.md` < 9 KB + `docs/memory/logs/archive/2026-11.md`), added `STATE.md`, and updated `tools/check_docs.py`.
  2. Installed `ccusage` (`usage-check`), `Beads` (`bd`, embedded mode, `.beads/issues.jsonl` tracked, `.beads/dolt` gitignored), `Superpowers` (`verification-before-completion`, `systematic-debugging`, `writing-plans`), and `frontend-design` across `.agents/skills` and `.claude/skills`.
  3. Added `tools/guard/agent_guard.py` wired to `.agents/hooks.json`, `.claude/settings.json`, and `.git/hooks/pre-commit`: auto-injects `STATE.md` + `bd ready` + unread `Messages` at session start, hard-blocks `tools/fable/original` and `js/detector-worklet.js`, and blocks song/UI/audio edits until the matching standard docs are read.
- Tested:
  - أحب الليل `Solo` strict Fable gate: `--rise 3.5` **100% PASS** (119 of 119, 0 off-time, 0 stray); `--rise 5.0` **99% PASS** (118 of 119, 0 stray).
  - `tools/lab/coach_test.cjs`: **35 of 35 PASS** (-20 dB) + Taqsim **7 of 7 PASS** at -20, -12, and -6 dB.
  - `tools/lab/feature_test.cjs`: **19 of 19 PASS**, 0 page errors.
  - Quiet-machine `tools/render_versions.js` `Slowly` 3×: حب إيه Main 30 of 30 (3 runs, plus 3 runs with Drone on: 30 of 30, 0 errors), حب إيه Player 4 26 of 26 (3 runs), حب من تحب Player 1 63 of 63 (3 runs), أحب الليل Solo 72 of 72 (3 runs).
  - `tools/check_docs.py` + `tools/guard/agent_guard.py` hook contract tests (Antigravity + Claude Code): **PASS**. Not tested on the owner's physical iPhone yet.
- Next: Claude reviews the handoff note in For Claude at 05:50 (low-usage YES/NO check), then merge **claude/features** to **main** as **2026-11-27.7** (`oud-rng`).

## 2026-11-27 [claude] In progress (branch claude/features, not released): five coaching tools
- Owner: "call and response is a perfect idea ... it should also call out when the user is close or he gets the idea,
  interactive feedback rather than right or wrong; drone ... add it; hard notes so nice; 4 is nice, 5 is nice; all of
  them ... make them perfect execution".
- New file `js/coach.js` (createCoach, wired in js/app.js after the Listener; app.js sections ROUTES, PRACTICE, LESSON):
  1. Call and response (#/echo): the app plays a short phrase (up to 4 notes from the song's pass, split at line changes
     or gaps over 0.55 s), then listens. Live words while he plays: Yes! / Right note, other octave / Close: a bit
     higher or lower (within 1.6 half steps) / Higher or Lower. After the phrase: You got it / So close / You've got the
     shape (contour 70%+) / N of M / Listen again. 3 tries, then the notes are shown. Progress kept per song.
  2. Drone: a soft home note (saws + sub sine, low-pass, gain 0.05). Switch in the lesson, Call and response, Taqsim.
  3. Your hard notes: every Check my take adds to per-note stats (store 'notestats'); the 4 worst become a short
     exercise (each with its neighbours from the songs), built with useSong() in js/library.js.
  4. Taqsim playground (#/taqsim): pick a maqam, play freely; the neck shows each note green (in the maqam) or red;
     a trail of the last 12; ends on the home note -> praise.
  5. Tremolo meter (#/tremolo): counts raw picks (new Listener.onOnset hook in js/audio.js; note detection unchanged),
     picks per second over 2 s, evenness %, goals 4/6/8/10, best kept.
- Antigravity asked (Messages/For Antigravity/2026-11-27-claude-research-for-new-features.md) to research call and
  response teaching, tremolo speeds, taqsim for beginners, drones, quarter tones; reply expected in For Claude.
- Tested (tools/lab/coach_test.cjs, new: fake-mic takes rendered with the app's sound): 32/35 PASS. Call and response
  right/close/shape answers get the right live words and verdicts; tremolo 6/s read 6.0, 9/s read 9.0, uneven 9% even;
  hard notes, drone switch, Learn it by ear: PASS. Found: with the drone mixed into the mic (phone speaker), extra notes
  at the drone's sub pitch (midi 38) in the fade-in and from two detuned saws swelling. Fixed (one saw, 1.2 s fade,
  drone.fake() ignores those notes in Slowly, echo, taqsim) but NOT re-tested. No regression round, not on the iPhone.
- Owner: "let anti continue, and you just guide it" (Claude near its limit). Handed to Antigravity with exact steps:
  Messages/For Antigravity/2026-11-27-claude-finish-coaching-tools.md.
- Next: Antigravity re-runs coach_test (taqsim at -20/-12/-6 dB drone), feature_test, Slowly with drone, regression 3x,
  screenshots, then releases 2026-11-27.7.

## 2026-11-27 [claude] Release 2026-11-27.6: design D (Stage) live: new look, lesson coach, Check/Replay my take, loop, By ear, maqam card, tuner neck
- Owner: "apply both of these what you learned from these apps and the mirror into the website ... and an actually
  impressive feature"; then "maqam training should be able to train on loop ... apply them ... make the design better ...
  research more about oud from oud teachers ... record everything".
- Research recorded: `docs/memory/teaching-and-ui/oud-teaching.md` (how teachers teach and practise, the instrument, sources) and
  quality.md (app research: Simply Guitar, Yousician, Flowkey, Violin Vista, Trala, Rocksmith; oud/maqam apps).
- Built (index.html, style.css, js/app.js sections HOME/LESSON, js/path.js renderCard):
  1. Stage look on every screen (dark only, Archivo; Amiri and Noto Naskh Arabic), bottom bar Today/Songs/Practice/Tune
     with icon and label, Today home (stage title, next step, thin 8-part stage line, this week's 7 days, Continue).
  2. Lesson: wood neck to scale (neckX: L·(1−2^(−n/12))), dashed target ring, the line's other notes on that string as
     dim dots, quiet risha marks under each note (↓ unless a fast note alternates; ↓↑ for repeats), quiet while playing
     (steps and hints hidden, bar dimmed), a green ✓ ring for a clean line.
  3. Live coach dot: in Slowly the dot follows the pitch heard along the target string (display only).
  4. Check my take + Replay my take: after Slowly, "N in tune · N a bit off · N wrong" (25 / 75 cents) and a Replay sheet:
     the recording plays and the neck shows each note's target and where the finger landed, with which way to slide.
  5. Loop: a switch on every lesson (on by default for the 8 maqamat); the next take starts by itself; In time goes 10%
     faster after each clean round up to 100%.
  6. Practise these notes: from Check my take, loop the notes that were off or wrong (one each side, up to 6) until two
     clean rounds in a row; the line's progress is not touched.
  7. Maqam card on each song page: the maqam, its home note, every note of the version on the neck, home notes in brass.
- Added while the owner was away (he said: "keep working ... keep improving and upload this to github live"):
  8. The tuner's strings drawn as the neck (js/tuner.js chips + tuner.css): 6 on top, 1 at the bottom, the string being
     tuned in brass (green in tune), a ✓ on every string heard in tune this session; tapping a string still locks it.
  9. Quality pass (UI UX Pro Max checklist): contrast measured for every text colour (6:1 to 16:1); the week labels and
     the risha marks raised to the readable muted colour (were 3.4-3.9:1); reduce-motion support added.
  10. Check my take and Replay for In time too (from analyzeTake's items; "a bit late/early" past 0.12 s).
  11. By ear (teachers: listen, hum, then find): in Slowly the names, string/finger and the neck target are hidden while
      playing; found notes show; 3 misses reveal the note.
  12. The maqam card links a scale and its songs both ways ("Songs in this maqam" / "Practise the Bayati scale").
- Tests on design steps 1-3 (a7257af, 80 s window): أحب الليل fair 3/3 and full 3/3 (69/69, 0 mistakes); حب إيه
  Player 4 3/3; حب من تحب Player 1 3/3; حب إيه Main 3/3; حب من تحب Simple 95/95 every run with the known echo mistakes
  (9, 7, 11) -> live vs new compared side by side (next line).
- Live vs new, Simple alternating (same load): live 48/95 (stuck under load, 59 mistakes), 3, 0 mistakes; new 92/95 (window
  ran out) 3, 7, 5 mistakes. Every new-build mistake is the known echo type (صول<-فا). Coach dot then throttled to 20/s.
- Feature test (`tools/lab/feature_test.cjs`, real page): 19/19 PASS, no page errors. A take rendered with 2 notes 40 cents
  sharp showed "6 in tune · 2 a bit off" (exactly those two) and "Practise these 5 notes" built a 5-note session.
- Final round on the release code (7fdbe7b; only the build number and docs differ): أحب الليل fair 3/3 and full 3/3
  (69/69); حب إيه Player 4 3/3; حب إيه Main 3/3; حب من تحب Simple 95/95 with the known echo mistakes (4, 3, 8);
  حب من تحب Player 1 2/3: one run stuck at 18/63 with 72 mistakes, the same as one UI-build run earlier. Cause seen in the
  heard list: the listener read the soft سي at 2.84 s as 48.5 (the good run reads 58.07 there); Slowly then waits one note
  behind while the fake mic plays on, so every later note counts as wrong. A real player would just play the note again.
  The listener code is not changed by this release; whether the misread is rarer on the live build is not proven
  (0 in about 12 live runs today, 2 in 9 runs of builds with the new UI). Watch it: TODO.md section A.
- NOT tested on the owner's iPhone. The echo fix stays off (cancelled by the owner).
- After release: screenshots on a small phone (375x667) and iPad landscape (1024x768) of Home, song page, lesson and
  tuner: all readable; on the small phone the tuner's Start button floats over the lower strings until you scroll (as
  before); iPad uses the wide lesson layout. Live check: version.json 2026-11-27.6, docs check and deploy green.
- Next: the owner tries it on his oud (Slowly with the live dot, Check my take, Replay) and says what feels wrong.
- Tests: see the next lines (listening regression on steps 1-3; features 4-7 tested in the browser after it).
- Next: finish tests, screenshots to the owner, release only on his yes.

## 2026-11-27 [claude] Six design ideas mocked up; neck drawn to scale; research; take-check plan
- Owner said yes to six ideas (quality.md); mockup `tools/lab/design/direction-d2.html`. Then: "it needs to be accurate,
  and the fingers placement": the lesson neck is now to scale from `js/notes.js` (every finger checked against its
  distance: 0 mismatches). Research of popular learning apps recorded in quality.md. Take checking with the Mirror:
  planned in TODO.md section A (runs on the Mac). App unchanged.

## 2026-11-27 [claude] Direction D mockup (Stage look + horizontal neck + practice row)
- Owner on the three directions: likes them much more; Stage's look; horizontal neck guiding where to press; Poster's
  clear practice row; the bottom buttons of Stage were confusing. `tools/lab/design/direction-d.html` combines these
  (quality.md). Checked in screenshots: fixed the ي tail over "String 2" and the cut-off note row. App unchanged.

## 2026-11-27 [claude] Three design directions (Stage, Poster, Neck): mockups only, the owner picks
- Owner on "wood, ink and the rosette": "bland and like AI ... it looks so cramped". Rejected (quality.md).
- `tools/lab/design/directions.html`: three directions, Home + Lesson each, 390x844, one big thing per screen. Checked
  in screenshots for overlaps (fixed: Kufi word over the title, the ي tail over "String 3"). App unchanged.
- Next: build the one he picks, Home first, then the lesson; self-hosted fonts; screenshots; regression 3x.

## 2026-11-27 [claude] Design idea "wood, ink and the rosette": mockup only, waits for the owner
- Owner: the look is clean but generic ("AI slop"); wants one design idea that flows better and stays simple.
- Mockup `tools/lab/design/concept-wood-ink.html` (Home and Lesson, day and night; not the app); described in
  quality.md ("Design idea proposed 2026-11-27"). Sent as NOW vs NEW IDEA screenshots. Nothing in the app changed.
- Next: if he likes it, build it screen by screen (Home first), self-hosted fonts, screenshots light/dark, regression 3x.

## 2026-11-27 [claude] Release 2026-11-27.5: one icon style, short welcome, Record my oud in plain words; records pushed
- Owner on the before/after screenshots: "it looks cleaner"; then "add ui ux pro, if it will make it better, and not mess
  up and record everything and push to github".
- Released: the three UI fixes below (quality.md items 7, 9, 10). Pushed with them: the lab records (`docs/memory/songs-and-audio/lab.md`,
  `tools/fable/original/`, `tools/lab/`), the rejected-timing never-do (fable-method.md section 5, decisions.md). NOT
  pushed: the Slowly echo fix (cancelled by the owner; local branch only).
- UI UX Pro Max skill installed for Claude on the team Mac (quality.md, "How to review the design"): downloaded with git,
  read first (no network or system calls in its scripts), copied by hand; not in this repo.
- Tested on the release code (clean worktree, port 8799, 80 s window): أحب الليل Solo fair 3/3 and full 3/3 (69/69); حب إيه
  Player 4 3/3 (26/26); حب إيه Main fair 3/3 (30/30); حب من تحب Player 1 fair 2/3 in the round: run 3 failed (18/63, 72
  mistakes) while the load jumped to 9.5 from my own download during the test; rerun on a quiet machine 3/3 (63/63).
  حب من تحب Simple 95/95 every run, 1 clean and 2 with the known echo mistakes (10-11), as on the live build.
- Next: the owner says the design looks generic ("AI slop"): propose one design idea with a mockup before changing more.
