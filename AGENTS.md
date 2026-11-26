---
authority: binding
status: live
---
# Oud Coach: rules for every agent (Claude, Codex, anyone)

A static web app (GitHub Pages, no build step) that listens to a beginner's oud through the phone mic
and coaches him through songs, note by note. Live at https://uaytre1.github.io/oud/.
`CLAUDE.md` imports this file; Codex reads it directly. Keep it short: rules and pointers only.

## Start here (every session)
1. Read `docs/memory/README.md` (the index), then `TODO.md` (the plan; its top section is the one current direction).
2. Read the newest entries of `docs/memory/log.md` to see what the last agent did and left unfinished.
3. Before investigating anything, check `docs/memory/decisions.md`: it lists questions already settled and
   options already tried and rejected. Don't reopen one without new evidence, and say what the evidence is.

## Rules
- **Public repo.** No personal details about the owner (name, school, contacts), no keys or tokens, no
  recordings of the owner or of other players. Third-party audio/video never goes in git: Claude makes tuned
  copies and sends them to the owner in chat. Private notes about the owner live outside this repo.
  Enforced by `tools/check_docs.py` for recordings (audio/video/zip files fail CI); personal details: intent, not enforced.
- **Test before showing.** Every change is tested (see `docs/memory/testing.md`). Say plainly what was and
  wasn't tested. Nothing has been tested on the owner's real iPhone unless a log entry says so. (intent, not enforced)
- **Song data is measured, never guessed, and follows `docs/memory/song-standard.md` step by step.** One recording per
  version, nothing added, no hand edits, and the gate (`tools/verify_version.py --strict`) must PASS before the owner
  hears it as finished. For حب إيه the owner wants the solo oud versions, not the orchestra. (intent, not enforced)
- **Phone-first and simple.** English UI with Arabic note names. One obvious next action per screen. The
  owner is a beginner who judges by ear and reads on an iPhone/iPad with the oud in his hands. (intent, not enforced)
- **Plans and ideas go in `TODO.md`.** Decisions (with the rejected alternative) go in `docs/memory/decisions.md`.
  Measured numbers go in the registry docs, dated. (intent, not enforced)

## Working together (Claude + Codex)
- **Log every session** in `docs/memory/log.md`: newest first, one dated entry, tagged `[claude]` or `[codex]`,
  saying what changed, what was tested, and what is left. Never edit another agent's entries; add a
  correction line instead.
- **Claim before big work.** Put `(claimed: codex 2026-11-22)` next to the item in `TODO.md` before starting,
  remove it when done. Don't start an item someone else has claimed in the last 2 days.
- **Small commits on `main`**, docs updated in the same commit as the code they describe. Pull before you
  start (`git pull --rebase`). Commit messages say what and why; tag the agent in the body.
- **Files with one owner at a time:** `js/songs/*.js` (one song per agent), `js/audio.js` (Listener vs oud
  sound are separate sections), `js/app.js` (sections are marked with `// ----` headers). Say in the log which
  section you changed.
- **Releasing:** bump `BUILD` in `js/app.js` and `version.json` together, so phones holding an old copy show "Tap to update".
- **Handing over:** end your log entry with "Next:" and the exact step the next agent should take.

## Map
| Need | Go to |
|---|---|
| What the project is for, who it serves, where it stands | `docs/memory/project.md` |
| Code map, data flow, take format | `docs/memory/architecture.md` |
| How to test, test inputs, known results | `docs/memory/testing.md` |
| Songs, versions, sources, transcription method and status | `docs/memory/songs.md` |
| Why song data goes wrong and the method to follow (read before editing a song) | `docs/memory/transcription.md` |
| Measured facts about listening (picks, pitch, latency) | `docs/memory/detection.md` |
| How the owner works and what he has said | `docs/memory/owner.md` |
| Settled questions and rejected options | `docs/memory/decisions.md` |
| History, newest first | `docs/memory/log.md` |
| Plan and idea backlog | `TODO.md` |
| User-facing description | `README.md` |

## Quick commands
- Serve: `python3 -m http.server 8765` in the repo root (the mic needs localhost or https).
- Lesson test with a WAV as the mic: `SONG=hob-eih VERSION=player-4 MAIN=off SPEED=1 node tools/run_test.js <wav> <line|all> <slow|time> <seconds>`.
- Render every version with the app's own sound: `node tools/render_versions.js <dir> [song-id]`.
- **The gate**, a version against its own recording (must PASS before a song version ships; see `docs/memory/transcription.md`): `node tools/plain/notes.mjs <song> | python3 tools/verify_version.py --version <id> --media <tuned.wav> --start <s>`.
- Rhythm of a song's main version against the other recordings: `node tools/check_rhythm.mjs [song-id] [--all]`.
- Check that every path these docs mention exists: `python3 tools/check_docs.py` (runs in CI on every push).

Enforced by: `tools/check_docs.py` via `.github/workflows/docs-check.yml` (dead pointers fail the build).
The other rules are not enforced by a machine; they hold because every agent reads this file.
