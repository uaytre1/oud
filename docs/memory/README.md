---
authority: reference
status: live
---
# Shared memory: index

Shared by every agent working on Oud Coach (Claude, Codex). Rules for using it are in `AGENTS.md`.
One line per file: what it holds and when to open it.

| File | Holds | Open it when |
|---|---|---|
| `docs/memory/project.md` | Purpose, who it serves, goals, current state | starting, or deciding what matters |
| `docs/memory/owner.md` | How the owner works, what he asked for, his verdicts | writing UI text, choosing priorities |
| `docs/memory/architecture.md` | Code map, data flow, screens, take format | touching code |
| `docs/memory/path.md` | The learning path (8 stages): what courses teach in what order, sources, our own choices | changing the path or adding exercises |
| `docs/memory/quality.md` | **What "done" means and how the app should feel** (the bar for every change; how to review the design) | before releasing anything or touching the UI |
| `docs/memory/oud-sound.md` | **Real oud sound from the owner's plucks**: what he records, how to check tuning and fingers, how the app plays samples, pass marks (plan, not built) | working on playback sound |
| `docs/memory/song-standard.md` | **The steps every song version must follow** (what to do, never-do list, the gate's bar) | making or changing any song version |
| `docs/memory/fable-method.md` | **How the version that sounds right (حب إيه Player 4) was made, measured against the ones that don't**: step-by-step guide, never-do list, where other docs disagree | before making or judging any song version |
| `docs/memory/transcription.md` | **How a recording becomes a lesson**: why some songs sound right and others don't, the pipeline to standardize on, playback, why listening is inconsistent, ideas, what to do next | before touching any song data or the listener |
| `docs/memory/songs.md` | Songs, versions, sources, media files, transcription method, open issues | adding or fixing a song |
| `docs/memory/detection.md` | Measured facts about picks, pitch, quarter tones, mic delay | touching listening or judging |
| `docs/memory/testing.md` | How to test, where test audio lives, known results (dated) | before showing any change |
| `docs/memory/decisions.md` | Settled questions and rejected options, dated | before proposing or re-investigating |
| `docs/memory/log.md` | What each agent did, newest first | start and end of every session |
| `TODO.md` | The plan: current direction on top, backlog below | choosing the next task |

Keep this index and the files in step: when a file changes what it holds, change its line here in the same commit.
