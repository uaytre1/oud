---
authority: binding
status: live
---
# Oud Coach: rules for every agent (Claude, Codex, Antigravity)

A static web app (GitHub Pages, no build step) that listens to a beginner's oud through the phone mic
and coaches him through songs, note by note. Live at https://uaytre1.github.io/oud/.
`CLAUDE.md` imports this file; Codex and Antigravity read it directly. Keep it short: rules and pointers only.

## Start here (every session)
1. Read `STATE.md` (live < 40-line snapshot; auto-injected at session start by `tools/guard/agent_guard.py`), `docs/memory/README.md` (the index), and run `bd ready` (Beads task graph) + `TODO.md`.
2. Read `docs/memory/logs/latest.md` to see what the last agent did and left unfinished (older history is in `docs/memory/logs/archive/2026-11.md`).
3. Before investigating anything, check `docs/memory/core/decisions.md`: it lists questions already settled and
   options already tried and rejected. Don't reopen one without new evidence, and say what the evidence is.
4. On the local team machine, run `git pull --rebase` in the `Repo` clone (never edit the older non-git `Project`
   copy), check your mailbox in `Messages` (`For Claude`, `For Antigravity`, `For Codex`; unread notes are also auto-injected by the hook), and check live sessions
   with `Open Oud Team.command` (`list`).

## Rules
- **Public repo.** No personal details about the owner (name, school, contacts), no keys or tokens, no
  recordings of the owner or of other players. Third-party audio/video never goes in git: Claude makes tuned
  copies and sends them to the owner in chat. Private notes about the owner live outside this repo.
  Enforced by `tools/check_docs.py` for recordings (audio/video/zip files fail CI); personal details: intent, not enforced.
  Exception (owner, 2026-11-28): the players' tuned source recordings in `media/` (allow-listed in check_docs.py)
  while the site is only for him; remove them before he shares the site.
- **Test before showing.** Every change is tested (see `docs/memory/teaching-and-ui/testing.md`). Say plainly what was and
  wasn't tested. Nothing has been tested on the owner's real iPhone unless a log entry says so. (intent, not enforced)
- **Song data is measured, never guessed, and follows `docs/memory/songs-and-audio/song-standard.md` step by step,
  with notes measured as in `docs/memory/songs-and-audio/fable-method.md` section 4 (how the version the owner calls perfect was made; the
  only reference version is `tools/candidates/hob-eih-player-4-mirror.json`; tools/mirror was removed 2026-11-27).** One recording per
  version, nothing added, no hand edits, and the gate (`tools/verify_version.py --strict`) must PASS before the owner
  hears it as finished. For حب إيه the owner wants the solo oud versions, not the orchestra. (intent, not enforced)
- **Phone-first and simple.** English UI with Arabic note names. One obvious next action per screen. The
  owner is a beginner who judges by ear and reads on an iPhone/iPad with the oud in his hands. (intent, not enforced)
- **Plans and ideas go in `TODO.md`.** Decisions (with the rejected alternative) go in `docs/memory/core/decisions.md`.
  Measured numbers go in the registry docs, dated. (intent, not enforced)

## Working together (Claude + Codex + Antigravity)
- **Use Agent of Empires (`Open Oud Team.command`) + dated mailbox notes — never ad-hoc scratch files.**
  - Always invoke Agent of Empires through `Open Oud Team.command` (bundles its libraries; never call the raw `aoe` binary directly).
  - Live team sessions in group `Oud`: `"Oud Antigravity"` (hearing, UI, audio/Playwright tests, `ntfy`), `"Oud Claude"` (songs, Mirror gate, architecture/docs), `"Oud Codex"` (coordinator when online).
  - Check your `Messages` folder (`For Claude`, `For Antigravity`, `For Codex`) at the start of **every** turn.
  - Write only clean dated `.md` notes (`YYYY-MM-DD-<from>-<topic>.md`) in the recipient's `Messages` folder — never invent ad-hoc scratch files (`ask.txt`, `reply.txt`, etc.) — and immediately wake the peer with `Open Oud Team.command` (`send "<Session Title>" "<one-line pointer to your note>"`).
- **Division of strengths (no guessing):**
  - Non-hearing agents (Claude, Codex) follow `docs/memory/songs-and-audio/song-standard.md` (`--rise 5.0` normal bar; `--rise 3.5` allowed for real soft notes per step 5 so real soft notes are kept, never deleted) and must **never** guess pitches by hand. When a passage has slurs, vibrato, or unsure soft notes, send a 60%-slow A/B `.mp3` to `Messages` (`For Antigravity`) and wake `"Oud Antigravity"` via `Open Oud Team.command` for an ear + spectrum check before sending anything to the owner.
- **Log every session** in `docs/memory/logs/latest.md`: newest first, one dated entry, tagged `[claude]`, `[codex]`, or `[antigravity]`,
  saying what changed, what was tested, and what is left. Never edit another agent's entries; add a
  correction line instead.
- **Claim before big work.** Put `(claimed: codex 2026-11-22)` next to the item in `TODO.md` before starting,
  remove it when done. Don't start an item someone else has claimed in the last 2 days.
- **Small commits on `main`**, docs updated in the same commit as the code they describe. Pull before you
  start (`git pull --rebase`). Stage only your own claimed files (`git add <files>`, never `git add -A`), and never leave uncommitted edits behind when stopping. Commit messages say what and why; tag the agent in the body.
- **Files with one owner at a time:** `js/songs/*.js` (one song per agent), `js/audio.js` (Listener vs oud
  sound are separate sections), `js/app.js` (sections are marked with `// ----` headers). Say in the log which
  section you changed.
- **Releasing:** bump `BUILD` in `js/app.js` and `version.json` together, so phones holding an old copy show "Tap to update".
- **Handing over:** end your log entry with "Next:" and the exact step the next agent should take.

## Map
| Need | Go to |
|---|---|
| What the project is for, who it serves, where it stands | `docs/memory/core/project.md` |
| Code map, data flow, take format | `docs/memory/core/architecture.md` |
| How to test, test inputs, known results | `docs/memory/teaching-and-ui/testing.md` |
| Songs, versions, sources, transcription method and status | `docs/memory/songs-and-audio/songs.md` |
| How the version the owner calls perfect was made, step by step (read before building a version) | `docs/memory/songs-and-audio/fable-method.md` |
| Why song data goes wrong and the method to follow (read before editing a song) | `docs/memory/songs-and-audio/transcription.md` |
| What "done" means, how the app should feel, how to review the design | `docs/memory/teaching-and-ui/quality.md` |
| Real oud sound from the owner's own plucks (plan and pass marks) | `docs/memory/songs-and-audio/oud-sound.md` |
| Measured facts about listening (picks, pitch, latency) | `docs/memory/songs-and-audio/detection.md` |
| How the owner works and what he has said | `docs/memory/core/owner.md` |
| Settled questions and rejected options | `docs/memory/core/decisions.md` |
| History, newest first | `docs/memory/logs/latest.md` |
| Plan and idea backlog | `TODO.md` |
| User-facing description | `README.md` |

## Quick commands
- Serve: `python3 -m http.server 8765` in the repo root (the mic needs localhost or https).
- Lesson test with a WAV as the mic: `SONG=hob-eih VERSION=player-4 MAIN=off SPEED=1 node tools/run_test.js <wav> <line|all> <slow|time> <seconds>`.
- Render every version with the app's own sound: `node tools/render_versions.js <dir> [song-id]`. With `MAIN=on` it renders
  only the notes a lesson asks for (files end in `__main`): use those for Slowly tests of versions that have decorations.
- **The gate**, a version against its own recording (must PASS before a song version ships; see `docs/memory/songs-and-audio/transcription.md`): `node tools/plain/notes.mjs <song> | python3 tools/verify_version.py --version <id> --media <tuned.wav> --start <s>`.
- Rhythm of a song's main version against the other recordings: `node tools/check_rhythm.mjs [song-id] [--all]`.
- Check that every path these docs mention exists: `python3 tools/check_docs.py` (runs in CI on every push).

Enforced by:
- `tools/check_docs.py` via `.github/workflows/docs-check.yml` and `.git/hooks/pre-commit` (dead pointers, media files, personal path leaks, and `BUILD` / `version.json` mismatches fail commit and CI).
- `tools/guard/agent_guard.py` via `.agents/hooks.json` (Antigravity) and `.claude/settings.json` (Claude Code): auto-injects `STATE.md` + `bd ready` + unread `Messages` on session start, hard-blocks `tools/fable/original/` and `js/detector-worklet.js`, and blocks editing songs, UI, or audio until the corresponding standard docs in `docs/memory/` have been read in the current session.
