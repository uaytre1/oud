---
authority: reference
status: live
---
# Shared memory: index

Shared by every agent working on Oud Coach (Claude, Codex, Antigravity). Rules for using it are in `AGENTS.md`.
Live operational state is in `STATE.md` (auto-injected at session start). Topics are organized into four folders so agents read only what applies to the current task:

## 1. Core (`docs/memory/core/`)
| File | Holds | Open it when |
|---|---|---|
| `docs/memory/core/project.md` | Purpose, who it serves, goals, current state | starting, or deciding what matters |
| `docs/memory/core/owner.md` | How the owner works, what he asked for, his verdicts | writing UI text, choosing priorities |
| `docs/memory/core/architecture.md` | Code map, data flow, screens, take format | touching code |
| `docs/memory/core/decisions.md` | Settled questions and rejected options, dated | before proposing or re-investigating |

## 2. Songs & Audio (`docs/memory/songs-and-audio/`)
| File | Holds | Open it when |
|---|---|---|
| `docs/memory/songs-and-audio/fable-method.md` | **How the version that sounds right (حب إيه Player 4) was made, measured against the ones that don't**: step-by-step guide, never-do list | **required before editing `js/songs/*.js`** |
| `docs/memory/songs-and-audio/song-standard.md` | **The steps every song version must follow** (what to do, never-do list, the gate's bar) | **required before editing `js/songs/*.js`** |
| `docs/memory/songs-and-audio/songs.md` | Songs, versions, sources, media files, transcription method, open issues | adding or fixing a song |
| `docs/memory/songs-and-audio/transcription.md` | How a recording becomes a lesson, playback, why listening can vary | touching song tools or transcription |
| `docs/memory/songs-and-audio/detection.md` | Measured facts about picks, pitch, quarter tones, mic delay | **required before touching `js/audio.js` or `js/analyze.js`** |
| `docs/memory/songs-and-audio/oud-sound.md` | Real oud sound from the owner's plucks: recording guide, sample playback plan, pass marks | **required before touching playback sound** |
| `docs/memory/songs-and-audio/lab.md` | Experiments kept apart from Fable's frozen originals (`tools/fable/original/`) | before changing lab scripts or `Slowly` |

## 3. Teaching & UI (`docs/memory/teaching-and-ui/`)
| File | Holds | Open it when |
|---|---|---|
| `docs/memory/teaching-and-ui/quality.md` | **What "done" means and how the app should feel** (Design D "Stage" rules, 6-string neck rules, review checklist) | **required before touching UI or releasing** |
| `docs/memory/teaching-and-ui/oud-teaching.md` | How oud teachers teach and practise, instrument facts, sources | changing exercises or coaching |
| `docs/memory/teaching-and-ui/path.md` | The learning path (8 stages): order, sources, choices | changing the path or adding stages |
| `docs/memory/teaching-and-ui/testing.md` | How to test, test audio locations, known regression results | before showing or shipping any change |

## 4. Session Logs & Plan (`docs/memory/logs/`, `STATE.md`, `TODO.md`)
| File | Holds | Open it when |
|---|---|---|
| `STATE.md` | Short (< 40 lines) live operational state, auto-injected on session start | every session |
| `docs/memory/logs/latest.md` | Newest session entries (< 10 KB), newest first | start and end of every session |
| `docs/memory/logs/archive/2026-11.md` | Archived older session log entries | looking up older history |
| `TODO.md` | Longer-term plan and idea backlog (active task graph also tracked in Beads via `bd ready`) | choosing the next task |

Keep this index and the files in step: when a file changes what it holds, change its line here in the same commit.
