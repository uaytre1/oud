# Oud Coach — Live State (`STATE.md`)

> Auto-injected at session start for Claude, Antigravity, and Codex. Keep under 40 lines; full history lives in `docs/memory/logs/latest.md`.

## Current Branch & Build
- **Branch:** main. Live **2026-11-28.4**. أحب الليل note work paused until the owner uploads more recordings; next work in `DASHBOARD.md`.
- **Live on GitHub Pages:** **2026-11-28.2** (pushed 2026-11-28; check version.json).

## Ready in Working Tree (2026-11-27.7 Candidate)
1. **5 Coaching Tools (`js/coach.js`):** Call & response (`#/echo`), Drone (`fake(n, wantMidi)` home-note fix), Your hard notes, Taqsim (`#/taqsim`), Tremolo (`#/tremolo`) — verified 35 of 35 in `tools/lab/coach_test.cjs`, 7 of 7 Taqsim at -20, -12, and -6 dB, 19 of 19 in `tools/lab/feature_test.cjs`, and 3 runs of Drone + Slowly (30 of 30, 0 errors).
2. **Cleaned Song Versions:** Hob Eih (Main, Simple, Player 4, Note sheet, Tónos); Hob Min Tihib (Player 1, Simple, Player 2, Tónos); Ahib Al-Lail (Solo, Simple, Note sheet).
3. **Fable-Verified Ahib Al-Lail Solo Line 4 Fix (`js/songs/ahib-al-lail.js`):** Added `[8.785, 'sol', 4]` (+10.4 dB CQT rise, pyin 55.1) + resolving `[10.825, 'sol', 4]`, removed +79 ms duplicate `[24.257, 'do', 9]` → strict gate 100% PASS at `--rise 3.5`, 99% PASS at `--rise 5.0`, Slowly 72 of 72 (3 runs).
4. **Real Player Version & Live Notes HUD (`index.html`, `js/app.js`, `style.css`):** Live Arabic note + next-note HUD on `#realStage` synchronized with `#neck` + `#strip`, plus **Real player** selectable right in song Version chips and wired to Hear it in Listen, Slowly, and In time.
5. **5-String Friend Guide (`js/record-oud.js`):** Top 5-strings vs 6-strings toggle + String 5 tuning selector + `#intro` suppressed on `#/record-oud`.

## Enforced Guardrails (Hooks Active)
- **Read-before-edit gate (`tools/guard/agent_guard.py`):** Blocks song edits until `docs/memory/songs-and-audio/fable-method.md` + `docs/memory/songs-and-audio/song-standard.md` are read; blocks UI edits until `STATE.md` + `docs/memory/teaching-and-ui/quality.md` are read; hard-blocks `tools/fable/original/` and `js/detector-worklet.js`.
- **Task & token tracking:** Run `bd ready` (Beads) before starting work; run `usage-check` (`ccusage`) to check 5-hour burn; use `team-handoff` to message peers.
