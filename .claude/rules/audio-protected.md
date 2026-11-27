---
paths:
  - "js/audio.js"
  - "js/detector-worklet.js"
  - "js/analyze.js"
---
# Protected Listening & Oud Audio Rules

1. **`Listener` & `js/detector-worklet.js` are OFF-LIMITS** unless the owner explicitly approves a listening change first (`docs/memory/songs-and-audio/detection.md`).
2. **Rejected branches (NEVER re-enable):** Do NOT merge or enable `claude/echo-fix` or `claude/restrike` (cancelled by the owner).
3. **Oud playback samples (`docs/memory/songs-and-audio/oud-sound.md`):** Only touch the playback/oud-sound section of `js/audio.js`, keep the synth fallback, and re-run the full 3× `Slowly` regression suite afterward.
