---
authority: decision
status: live
---
# Decisions and closed questions

One line each: what was decided or rejected, the date, why, and where the evidence is. Newest first.
Don't reopen a line without new evidence; if you do, add a new dated line below it instead of editing it.

## Product
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
