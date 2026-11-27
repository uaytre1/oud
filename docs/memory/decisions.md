---
authority: decision
status: live
---
# Decisions and closed questions

One line each: what was decided or rejected, the date, why, and where the evidence is. Newest first.
Don't reopen a line without new evidence; if you do, add a new dated line below it instead of editing it.

## Product
- 2026-11-27: **Fable's method is the way to make a song version (`docs/memory/fable-method.md`); the only reference
  version is `tools/candidates/hob-eih-player-4-mirror.json`.** Owner, 2026-11-27: "remove the other mirror files, that i called bad, and make sure that instructions arent misleading and tells all agents what to use and whats good". Removed: the tools/mirror folder and the
  candidates it and the desktop Claude made (92 s solo, أحب الليل solo, Player 2 Main data). Rejected because: Basic Pitch
  strongest-event pitch and octave-by-neighbours (11, 7 and 9 notes that sound a different note; Fable's: 0).
- 2026-11-26: **All agents coordinate strictly via Agent of Empires (`Open Oud Team.command`) + dated `Messages` notes (owner's rule):**
  every agent works in the `Repo` git clone (not `Project`), checks its `Messages` inbox every turn, writes only dated
  `.md` notes (rejected: ad-hoc `ask.txt` / `reply.txt` files or standalone untracked sessions), and wakes peers via
  `Open Oud Team.command` (`send "Oud Claude"` / `"Oud Antigravity"` / `"Oud Codex"`). Real soft notes may use `--rise 3.5`
  per `docs/memory/song-standard.md` step 5 (keep soft notes!), verified by Antigravity's ear check when unsure; never guess pitches. Rules in `AGENTS.md`.
- 2026-11-26: **Real oud samples approved for the public repo; guided in-app recorder built (owner's decision):**
  owner confirmed short single-note samples of his oud (no voice, no room talk) may live in a samples folder in git,
  and asked for a guided, button-driven "Record my oud" screen (`js/record-oud.js`) with live tuning check (5th string
  فا قرار) and `.zip` export instead of talking into Voice Memos. Method: `docs/memory/oud-sound.md`.
- 2026-11-26: **Song pipeline standardized (owner's decision):** one recording per version; Basic Pitch note events;
  onsets from any detector, kept only with a loudness jump or pick click; octave locked to the melody range; overlay
  check against the same recording before shipping; plus a small re-strike fix in the synth. Method and reasons:
  `docs/memory/transcription.md`. Rejected: more hand edits to حب إيه Player 4 / Main (each fixed one spot and broke
  the next); the last one (ري put back) was dropped unheard.
- 2026-11-25: **A version takes its notes AND its rhythm from recordings that agree; never one player's times under
  another's notes.** Owner heard a pause in حب إيه Player 4 after صول فا صول: that phrase had the teacher's notes on
  Player 4's times (he played a fill there), so both لا came late (gaps 0.35 / 0.46 s; teacher 0.21 / 0.28). Fixed
  with the teacher's rhythm scaled to Player 4's speed. `tools/check_rhythm.mjs` compares every shared phrase with the
  other recordings; run it before a song version ships. Owner: "this should be the most consistent thing of the
  whole app… learn from the videos and make a good computer version".
- 2026-11-25: **A note counts only if the sound gets louder at that moment** (level-jump gate, numbers in
  `docs/memory/detection.md`). Found from the owner's own clips: the app heard 46 notes where he played 12. Rejected:
  tightening the click gate (click rise of real and false onsets overlap on his recordings).
- 2026-11-25: **Welcome sheet on first open** (what the app is, 5 or 6 strings), **path steps say what ticks them**,
  result stays 8 s before the next risha run. Owner: easy to pick up, consistent, shareable.
- 2026-11-25: **One set of words for the three steps everywhere: Listen/Watch → Slowly → In time.** The risha trainer's
  "Step by step" and "With the click" are now "Slowly" and "In time" (mode ids `step`/`time` unchanged). Owner: easy
  to pick up, may share the app with others.
- 2026-11-25: **Home has one hero (the path); everything else is quieter.** Line icons (inline SVG, gold) instead of
  emoji; song cards are one row; a path step is one card and only the next step is outlined. Light-mode gold is
  #a36800 for readable text. Rejected: emoji icons (look different per phone, read as clutter); inline tip lists in
  the path (duplicated the how-to guides).
- 2026-11-24: **The listener is tuned from the owner's own recordings, not from the app's oud sound or other players.**
  Owner: "use my own recording… so you can improve the tracker and the tuner". His calibration take showed real
  ringing swells are weak (2–10) but real fast repeats are weak too (5–8), so fast onsets are not gated by click
  rise; octave-down slips are corrected only below the low فا and never onto the oud's own low strings. Rejected: a
  rise gate tuned on the app's render (its course beating is far stronger than his oud's and dropped real repeats).
- 2026-11-24: **قرار = the low فا string wherever it is** (string 6, or string 5 when string 5 is tuned to فا, as on
  his oud); Settings has string 5 and string 6 tunings; low فا/صول notes follow them (`placeLow` in `js/notes.js`).
- 2026-11-24: **Drills and first tunes come from written methods and published scores**, labelled with source and
  page, checked with a plain one-string render (all 0 wrong notes). Each path stage pairs a drill and a tune with its
  maqam. How-to guides (15) are short, sourced, and shown where they apply (path step, risha trainer, Settings).
- 2026-11-23: **Repeat until right**: a take that isn't right yet restarts by itself after a 4 s countdown (any tap stops it;
  switch in ⚙︎). **Slowly judges rhythm at the player's own speed.** In time speeds 40–100%. Owner: "it should try again until
  I get it right", "wait for me to play, then judge my timing".
- 2026-11-24: **Home = path, daily practice, four practice tiles (right hand, left hand, 8 maqamat, tune), songs, then
  My takes and Settings; one Settings page for everything not about one song; the risha trainer shows one exercise
  chooser instead of 12 buttons.** Owner: "it will get too messy with all those features". Rejected: separate selects
  for the oud in the tuner and the trainer (two places for one fact).
- 2026-11-23: **A guided path (8 stages) is the app's front door**; Daily practice follows its current stage. Order
  from Arabic beginner courses (`docs/memory/path.md`), except بياتي second because of his songs. Steps tick themselves
  from app data where the mic can judge; posture and taqsim are ticked by hand. Exercise versions now have their own
  pass id (the version id), so each maqam keeps its own stars (before, all 8 shared line progress). Rejected: a
  fixed calendar (stages move when steps are done, or when he chooses to move on).
- 2026-11-23: **The 8 maqamat are one exercise with 8 versions** (on home), scales from their ajnas (Maqam World) and
  checked against the Arabic Wikipedia; rhythms بلدي, سعيدي, ملفوف, خليجي from Frishkopf's دم/تك chart (2009), دم = قرار,
  تك = string 3, all down strokes. Rejected: waiting for the teacher's video before building anything (the owner can
  practise now; the video will correct tonics, fingers and strokes). Rejected for rhythm data: Maqam World and
  Wikipedia (patterns only as images, or absent).
- 2026-11-23: **Risha trainer in three steps: Watch → Step by step → With the click**, and every stroke shows its string.
  Owner: "it's coming up fast; I don't know which order to hit and which string… show it really slow or show me the order
  before playing". قرار = low فا (string 6, as in his lesson video), other strokes = open ري (string 3) or the scale note.
  A phone mic may hear the low فا an octave up, so فا in any octave counts as the قرار string. Rejected: only slowing the
  metronome (he still would not know the order or the string before it rushes past).
- 2026-11-23: **Daily practice** (tune → right hand risha trainer → left-hand warm-ups → your song). Right-hand rhythms come
  from the owner's lesson video (a.oudd): إيقاع عربي ↓↑↓↓bass, مقسوم bass↓ ↓ . ↓ bass↓ . ↓ . (gaps measured 1-2-1-2-2),
  رومبا 8 even strokes 3-3-2. Stroke direction cannot be heard: arrows are guidance; the mic judges timing and bass vs high string.
- 2026-11-22: **"Main notes only" keeps repeated picks (`r`) and hides only decorations (`g`)**; Simple keeps repeats too.
  Why: the owner's A/B/C test: "main notes only" sounded wrong, and 17 of the 22 notes it removed from Hob Eih
  Player 4 were repeats that all other recordings also play (the rhythm, e.g. فا ×4).
- 2026-11-22: **Hob Eih melody vs decoration is decided by agreement across recordings** (Players 1–4 + Original for
  the first time; Players 2–3, Lesson, Original for the second): a note is melody if at least half of the other
  recordings play it there; a short note that at most a quarter of them play is a decoration. Script and numbers
  are summarised in `docs/memory/songs.md`.
- 2026-11-22: **Versions are chips on the song screen**, best first. Rejected: versions only behind ⚙︎ (owner couldn't find them).
- 2026-11-22: **Listen plays every pick of the version** even when "Main notes only" is on; the screen shows the main notes. Why: the main-notes-only sound didn't sound like the song.
- 2026-11-22: **Screen stays on** in lessons and the tuner: Wake Lock plus a silent looping video on iPhone (`js/awake.js`). Why: owner's phone slept mid-practice; iOS often ignores Wake Lock alone.
- 2026-11-22: **Guided path**: song → line → Listen, Slowly, In time; one main button per screen; settings behind ⚙︎. Rejected: the 4-tab layout (Learn/Practice/Tuner/Progress) with mode/timing switches ("too many controls", "I don't know how to use it").
- 2026-11-22: **Free play removed from the UI** (`analyzeTake` still supports it). Rejected: three practice modes.
- 2026-11-22: **Stars need right notes AND timing** (notes ≥ 80% and on time ≥ 70%); ★ by speed (<80%, <100%, full). Rejected: stars by notes only (a late take got ★★★).
- 2026-11-22: **Stop = cancel**: a stopped take is not scored or saved.
- 2026-11-22: **Main notes only is on by default** for new users.
- 2026-11-22: **Hob Eih opens on Player 4**; Players 1–3 and Lesson under "More". Owner: only Player 4 sounded good.
- 2026-11-21: **Upload-a-video-to-make-a-song is deferred** (owner: "later, not now"). Plan in `TODO.md`.

## Listening and judging
- 2026-11-22: **Codex review (made on commit 764136b, before the click gate, tuner and docs): ported by hand, not
  applied as a patch** (it conflicted with 6 newer files). Taken: mic start/stop lifecycle, cancel on leaving or
  hiding the page, timing judged in real seconds at every speed, skipped notes give no stars, honest "every note"
  wording, neck dot placed by pitch, real-recording Listen waits for playback, storage connections closed.
  Rejected: octave readings as "uncertain" with no advance in Slowly (the owner's own correct ري picks read an
  octave low on his iPhone, so it would block him); progress per version (would drop his stars when switching).
- 2026-11-22: **Tuner has its own mic analysis** (`js/tuner.js`), separate from the lesson `Listener`, and only takes up
  a string after a pick. Rejected: reusing the lesson frames with confidence/level gates (dropped most frames of quiet
  real picks; low strings read an octave high).
- 2026-11-22: **Pick-click gate** against ringing notes heard as new picks. Evidence: `docs/memory/detection.md`.
  Rejected: a plain higher onset threshold (would drop soft real picks); gating every onset by click size
  (dropped fast real repeats on Player 4).
- 2026-11-22: **Quarter tones −25/+45 cents** around the target. Rejected: ±75 (accepted natural Mi); ±30 (rejected
  the owner's correct textbook half-flat).
- 2026-11-22: **Mic delay up to 0.15 s removed automatically** in In time. Rejected for now: a calibration step (extra
  screen); revisit if real iPhone takes show more delay.
- 2026-11-22: **Count-in at the song's own beat**, speeds 60–100% in steps of 10.
- 2026-11-22: **In time lights only the line and the chip**, no full-screen flash (strobing at speed). Slowly keeps the full flash.
- 2026-11-21: **Nearest-scale acceptance**: a note counts if the expected note is the nearest note of the song's scale
  (within a half step). Why: real teachers' recordings were judged too harshly.
- 2026-11-21: Rejected onset ideas: block treble variance (fired every 65 ms), spectral "new energy" (worse).

## Data and hosting
- 2026-11-23: **A teacher's on-screen note names beat any transcription.** Hob Eih notes follow the a.oudd lesson captions;
  Player 4 keeps its timing. Rejected: guessing note combinations by A/B tests alone (three rounds failed at 4–8 s).
- 2026-11-23: **Transcription method = vote** (`tools/transcribe/`): onsets need 2 of complex-domain, spectral flux and
  treble click; pitch is a vote of pyin, CREPE-tiny, PESTO and a harmonic template. Rejected after measurement: Basic Pitch
  alone (.884), HMM/Viterbi (.855), drifting tuning (no gain), Demucs for orchestral recordings (does not help).
- 2026-11-21: **Static GitHub Pages site, public repo, no build step.** The owner can open it anywhere; agents can edit it.
- 2026-11-21: **No third-party audio in git**; tuned copies are sent in chat and loaded once on the phone. Files match a
  version by name, then by length (±0.6 s).
- 2026-11-21: **مي half-flat target 51.3** (measured players), not 51.5.
- 2026-11-21: **Downloads**: archive.org works from the agent container; YouTube, TikTok, chordify and some note-sheet
  sites are blocked. Don't retry them; ask the owner for files.

## Working with the owner
- 2026-11-22: **Send to Claude** opens a new Claude chat on iPhone. Better for continuity: Save to Files in the share
  sheet, then attach the file in the existing chat. Pushing takes somewhere an agent can read automatically is an
  open idea in `TODO.md` (must not put his recordings in this public repo).
