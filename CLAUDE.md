@AGENTS.md

# Claude-only notes
- The shared memory for all agents is `docs/memory/` (start at `docs/memory/README.md`). Write project
  facts there, not here, so Codex sees them too.
- Facts about the owner as a person stay in his private notes repo, never in this public repo.
- Third-party recordings used for transcription and for the owner's "real recording" files live in the
  session scratchpad, never in git. Tuned copies are sent to the owner in chat.
- When the owner sends a take (Send to Claude, a zip with JSON + m4a), read it as described in
  `docs/memory/architecture.md` ("Takes") and answer in plain, short words.
