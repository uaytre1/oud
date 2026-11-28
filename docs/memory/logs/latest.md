---
authority: reference
status: live
---
# Recent Session Log (newest first)

Format: `## YYYY-MM-DD [agent] short title`, then what changed, what was tested, and "Next:". Never edit
another agent's entry; add a correction line. Keep entries short; older entries live in `docs/memory/logs/archive/2026-11.md`.

## 2026-11-28 [claude] Live 2026-11-28.2 checked; أحب الليل clip with his plucks; memo plucks without voice
- Live version.json = 2026-11-28.2.
- Owner on حب إيه v2: "sounds so good". أحب الليل Solo, first 16 s, rendered the same way (tools/lab/oud/engine2.py):
  gate on the render 57 of 58 notes ok in the first 15.5 s (one fast note at 15.08 s did not stand out). Sent.
- Voice memo (owner: "cut what you need from my recording, cut my voice"): tools/lab/oud/memo_plucks.py keeps only
  clear plucks (onset + steady pitch), stopping before any speech: 97 plucks, 93 speech onsets left out, in the private
  Support/State/memo-plucks-2026-11-28 folder with index.json. Long clean open plucks of the low فا (string 5) at 19.8,
  60.5, 167.6 s; few fingered low notes, so strings 5 and 6 still need his new recording. Not in git yet (he allowed
  it once the voice is cut; it goes in with the sample engine).
- Next: owner's ear on the أحب الليل clip; when strings 5-6 are re-recorded, build the engine into the app (step 6).

## 2026-11-28 [claude] Release 2026-11-28.2: the claude/fixes branch merged (owner: "push it fixes")
- Contents: calm feedback, By ear plays first, More group, tuner (low-tuning offer, calmer, low strings sooner),
  record-oud short session, Listen loop, Write what I play, Clean tone check, Say notes (see the entries below).
- Tuner change tested (owner: "your tuning was right and 5 and 6 were not heard; make it smooth and responsive"):
  low strings (under midi 46) get a 4 dB loudness margin (was 5) and a looser periodicity bar (0.32 new / 0.36 same,
  was 0.25 / 0.30); the needle settles with 0.16 s near the target (0.07 s when far). On his quiet string-6 pluck the
  first reading came 0.2 s after the pick (was 0.4 s); needle steps near the target p90 0.42° (was 0.62°); live frames
  726 (was 665); tuner_fix_test 4/4. Not tested on his iPhone, where strings 5 and 6 were not heard: cause there unknown.
- Listening regression on the branch (fresh renders, 80 s Simple window): Simple 3/3 95/95 with 0 mistakes;
  أحب الليل Solo fair 3/3 and full 3/3 72/72; حب إيه Player 4 3/3; حب من تحب Player 1 3/3; حب إيه Main fair 0/3 stuck
  at 9/30. Cause checked: an extra low فا onset at 4.17 s after the real one at 3.99 s (the known fake-mic desync); the
  LIVE code does the same (live: 1 of 2 extra runs stuck, branch: 1 of 2 extra runs passed with the same extra onset).
  Not caused by these changes; a real player would just pick again. Watch it (TODO A).
- feature_test 27/27, real_test 13/13, write_test 7/7, tone_test 8/8, say_test 4/4 (earlier entries).
- Next: verify live; أحب الليل clip with his plucks; memo plucks without voice.

## 2026-11-28 [claude] Voice memo table (private), tidy-up: one job per file, Stop reminder
- Voice memo: no speech-to-text on this Mac (whisper/vosk not installed; installing needs the owner's OK). Made the
  part that needs no hearing: every clear pluck with its time, note, string·finger and cents (167 plucks; 93 onsets
  with moving pitch left out as voice) in the private Support/State folder (not in git). The owner confirms names.
- docs/memory/README.md: "one job per file" table at the top (STATE / DASHBOARD / Beads+TODO / log / decisions).
- tools/guard/agent_guard.py + .claude/settings.json: on Stop, once per session, Claude is reminded when code is
  uncommitted or changed after STATE.md / DASHBOARD.md / the log (tested: reminds once, then allows). Antigravity's
  Stop is unchanged (its hook format for Stop was not checked).
- Not done: moving TODO.md's open items into Beads (step 6a); left for the next agent.

## 2026-11-28 [claude] Say notes (eyes-free) in Slowly (branch claude/fixes, not live)
- Owner: "todays lesson and eyes free sound good". js/app.js LESSON section: a "Say notes" switch in Slowly; each new
  note's Arabic name is spoken (speechSynthesis, an Arabic voice when the phone has one); the mic ignores the speech
  (ignoreUntil 0.9 s, then 0.15 s after it ends). Off with By ear (they contradict each other).
- Test: new tools/lab/say_test.cjs 4/4 (speech stubbed in headless Chromium: names said in the line's order, the
  line finished with 0 mistakes, no errors); feature_test 27/27. Not tested: real speech on the iPhone (voice, and
  whether the mic hears the phone's own voice after the 0.9 s window).
- Today's lesson: plan written for the owner first (DASHBOARD), not built.

## 2026-11-28 [claude] Clean tone check (branch claude/fixes, not live)
- Owner: "tone check is nice". js/coach.js TONE section + index.html #toneView + Practice row + route #/tone.
  He picks one note and lets it ring; from the Listener's frames over the note (0.08-0.6 s, within 20 dB of the peak):
  Clear = mean pitch confidence, Steady = pitch wobble in cents, Rings = time until 20 dB down. Verdict: muted (rings
  under 0.25 s), buzzing (clear under 0.62), wobbly (wobble over 14 cents), else clean; one tip (fingered vs open).
- Test: tools/lab/tone_test.cjs 8/8 with his own plucks (4 open strings -> clean; one cut short after 0.12 s -> muted).
  NOT proven: buzzing. A synthetic stand-in (noise added) was still judged clean, so the buzz rule is unverified until
  he records a real buzzing note (press lightly). A hard cut at the end of a test note made the listener report one
  extra note (test clip artefact; fades fixed it).
- Next: Today's lesson (mock first) and Eyes-free mode.

## 2026-11-28 [claude] Write what I play (branch claude/fixes, not live)
- Owner: "write what i play is good and more appealing to advanced users, not just beginners".
- js/coach.js WRITE section + index.html #writeView + Practice row + js/app.js routes (#/write): he plays freely; each
  note heard becomes a chip (Arabic name, S·F, cents when 15 or more off); the neck shows the last note; ▶ Play plays
  it back with his own rhythm (pauses capped at 1.5 s); Copy gives the notes as text, one line per phrase (new line
  after a 1.2 s pause or 8 notes); Save keeps it in "My phrases" (store myPhrases), registered as the practice song
  "جملي / My phrases" with one version per phrase, so it opens in Slowly / In time / By ear. Advanced use: quick
  transcription of a taqsim idea or a melody, kept and practised with his own timing.
- Test: new tools/lab/write_test.cjs 7/7 PASS (حب إيه Main render as the mic for 12 s: 30 of the song's 33 notes
  written in order, 33 written; copy, save, practise as a lesson, saved after reload, no errors). Screenshot looked at.
  Not on the iPhone.
- Next: Clean tone check.

## 2026-11-28 [claude] Oud sound: F1 measured, engine version 2 clip sent (offline, not in the app)
- F1 from his own fast picks and tremolo (numbers in oud-sound.md): the string is never silent before a re-pick (11 dB
  under the new peak), picks rise in about 20 ms, alternate strokes differ in brightness by 34%.
- tools/lab/oud/engine2.py renders a line from his plucks: same note re-picked = old note dips 9 dB and keeps ringing;
  another note on the same string = old one stops in 25 ms; other strings ring; takes lined up at their steepest
  rise; per-position tuning; level +-1.5 dB. حب إيه Main lines 1-3: the gate finds all 33 notes "ok".
- Clip sent to the owner (second listening test). Not tested: the app itself does not use these samples yet.
- Next: his ear on clip v2; if good, port to the app behind a Settings switch (step 6), after strings 5-6 re-recorded.

## 2026-11-28 [claude] Listen: Loop a line, with the real player (branch claude/fixes, not live)
- Owner: "real player slow down is nice" (picked: slow down + loop a phrase). Slow-down already existed: Listen has
  50% / 75% / 100%, and the real recording plays at that speed with its pitch kept (playbackRate + preservesPitch).
- New: the Loop switch now also shows in Listen, with its own setting (loopListen), so the line plays again by itself
  after 0.8 s until Stop; the practice Loop (Slowly / In time) is unchanged. js/app.js LESSON section.
- Tests: real_test 13/13 (new: Loop shows in Listen, the line restarts by itself, Stop ends it); feature_test 27/27.
  Not on the iPhone.
- Next: update Codex and the owner's dashboard; then Install as an app.

## 2026-11-28 [claude] Record my oud: short session "Strings 5–6 + fast picks" (branch claude/fixes, not live)
- Owner: the full recording run "took too much time"; strings 5 and 6 sounded bad (fabric noise, phone at his side).
- js/record-oud.js buildPlan mode 'low': strings 5 and 6 (open + fingers 1-4, 3 down + 3 up) and 8 fast picks on every
  open string = 66 takes (full = 194). The page says how many takes and, for this session, "Phone in front of you,
  about 20 cm from the sound hole; keep the phone and your clothes still". A saved take under -46 dB on the page's own
  meter shows "Saved, but quiet: phone in front, about 20 cm from the sound hole" (his string 6 takes: median -47.5,
  strings 1-2 about -40). The zip format is unchanged, so it adds to the first zip.
- index.html: third session button; style.css: the three choices stacked (they were squeezed into one row at 375 px).
- Tests: plan counts (full 194, quick 38, low 66, tags listed); screenshot at 375x667 looked at; no page errors.
  The recording itself was not run (needs a real mic).
- Next: real player slow-down + loop.

## 2026-11-28 [claude] Tuner: strings 5 and 6 (branch claude/fixes, not live)
- Owner: "string 5 and 6 doesn't pick up correctly on tuner ... not as reliable as Pano Tuner, it replies instantly".
- Cause found with his own plucks (record-oud zip, strings 6, 5, 4, 2 into tools/tuner_test.js): his oud is tuned
  دو · فا (string 5 = فا 41, string 6 = low دو 36); the app's default is فا · صول (5 = صول 43, 6 = فا 41). With the
  default, his string 6 showed nothing at all and his string 5 showed as "string 6". With his tuning set, both read
  right (string 6 -> live 0.17-0.2 s after the pick at normal level, 0.4 s on his very quiet takes).
- Fix in js/tuner.js (StringTracker remembers a steady low note under the lowest string: lowRun/lowHeard; the screen
  shows "Sounds like low دو on string 6" and a button "Use دو · فا tuning") and js/app.js TUNER section (applyTuning:
  saves s5/s6 like the Settings presets). No change to how a string is read.
- Tests: new tools/lab/tuner_fix_test.cjs 4/4 PASS (default tuning -> offer shown -> tap -> strings 6 and 5 read,
  settings saved); with his tuning the four strings read in order and no offer appears. Speed: no change made; on a
  normal-level pluck the reading comes in about 0.2 s. NOT tested on the iPhone (the slowness he felt may be the
  phone; ask him after this fix).
- Next: Record-my-oud short mode.

## 2026-11-28 [claude] Fixes on branch claude/fixes (not live): calm feedback, By ear plays first, More group
- Owner (iPhone, 27.6): wrong-note red "spams", "I hear" not smooth, green overlay "not clean"; By ear: "I didn't hear
  it"; Tremolo and Taqsim under "More" (agreed).
- js/app.js LESSON section: pop() no longer flashes the whole screen or shakes; the note card gets one soft ring
  (green or red, 0.55 s) and a small ✓/✗; the same wrong note again within 1.5 s is counted as before but not flashed
  again; say() does not redraw the same words; "I hear" shows the note heard most in the last 150 ms, changes at most
  3 times a second, and dims instead of jumping to "—". By ear: Start plays the line first at 75% (the mic ignores it),
  then "Your turn: find it on your oud"; a toast explains By ear when switched on. Judging is unchanged.
- index.html + style.css: Taqsim playground and Tremolo meter inside a "More" row on the Practice tab.
- Tests: feature_test 27/27 PASS (new: By ear plays first, "Your turn", 0 notes judged during the playback; More
  hides and opens the two tools). Screenshots of a right note and the Practice tab looked at. NOT on the iPhone; the
  wrong-note ring was not captured in a screenshot (my forced state was overwritten by the running lesson).
- Next: owner looks at the pictures and says "push"; then tuner (strings 5 and 6, instant).

## 2026-11-28 [claude] Release 2026-11-28.1: Real player built in (the recording the notes were measured from)
- Owner: "I want the players that it found the notes from ... upload the players audio files to the public site,
  that's the purpose of it" (site only for him for now; remove before sharing).
- Made tuned copies from his uploads (Support/State/uploads) with ffmpeg asetrate+atempo, like song-standard step 7,
  and checked each against its notes: pitch (pyin at 15-40 notes: median +1, +1, +6 cents) and the gate at --rise 3.5
  (Player 4 / Main 100%, Solo 100%, Player 1 96%). Shifts: Player 4 -2.28, Solo +0.59, Player 1 -3.00 half steps (the
  opposite signs gave 120-580 cents off, so the gate alone could not tell; pitch did).
  Files: media/hob-eih-player-4.m4a, media/ahib-al-lail-solo.m4a, media/hob-min-tihib-player-1.m4a (AAC 96k mono,
  0.5-0.7 MB). حب من تحب Player 2: no matching recording on this Mac (needs 21.95 s); parked.
- js/app.js (SONG + LESSON sections): BUILT_IN_MEDIA / builtInMedia(); hasSavedMedia, real.load and the song settings
  box use the built-in file when he has not loaded his own; his own copy still wins ("Use my own copy instead").
  tools/check_docs.py allow-lists exactly those three files; AGENTS.md and TODO.md say to remove them before sharing.
- Tests: new tools/lab/real_test.cjs 9/9 PASS (each version: real stage shows with no upload, recording plays from the
  right place, notes change, no errors; needs a Range server, see testing.md); feature_test 22/22 PASS. NOT tested on
  his iPhone; Listening/Slowly regression not re-run (no listening code changed).
- Next: owner tries Real player on his iPhone. Then calm right/wrong feedback (fix 3a).

## 2026-11-28 [claude] Live 27.7 checked; In time bar not reproduced; line 4 clip sent
- Live version.json = 2026-11-27.7; Deploy, Docs check and Pages runs on eb7f328 green; check_docs OK.
- In time bar (owner: "the bar isn't moving when the song starts"): not reproduced in desktop Chromium, live or
  local: the note lane moves at 50% and 100%, with Loop on and off, after the 3-2-1 and after Loop restarts.
  No WebKit here, so iPhone Safari is untested. Added 3 checks to `tools/lab/feature_test.cjs` (In time: playhead
  moved after 2 s, moves again after Loop restarts, no errors): 22 of 22 PASS. Asked the owner which bar
  (DASHBOARD "Waiting on you"). No app code changed.
- أحب الليل line 4: clips of pass 6-13 s (real; old notes from 609b7f4; new notes) with the app sound over the
  real one, in the private Support/State/clips folder (, not in git). Owner notified.
- Next: wait for "old or new" (if old: restore the song file from 609b7f4 and re-run its gate) and the bar
  details; meanwhile start fix 3a (calm right/wrong feedback) on a branch, read quality.md first.

## 2026-11-28 [claude] Release 2026-11-27.7 pushed on the owner's word; oud-sound method; Opus briefed
- Owner: "if yes then can u push". Checked the Real player notes overlay is wired (index.html #realStage/#realHud,
  js/app.js #realNote, style.css .real-hud), then merged claude/features to main (fast-forward) and pushed.
  NOT re-tested by Fable (Antigravity: coach_test 35/35, feature_test 19/19, Slowly runs clean); live site NOT checked.
  The أحب الليل line 4 note change went live with it; the old-vs-new clip is still owed to the owner.
- Oud sound: measured his 194 plucks, wrote the 7-step method and the fast-picks method (F1-F7) in oud-sound.md after
  he heard two test clips (strings 1-2 decent; strings 5-6 and fast plucks bad). He will re-record strings 5 and 6.
- Next: Opus (scheduled 05:55) verifies the live site first, then follows the start-here note in the Claude mailbox.

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
