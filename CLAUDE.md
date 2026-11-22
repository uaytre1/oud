# Oud Coach — notes for Claude

A static web app (GitHub Pages, no build step) that listens to the owner's oud and coaches him.
The owner is a beginner, reads on an iPhone/iPad, writes casually (often by voice), and judges by ear.
Keep the UI simple, phone-first, English UI with Arabic note names.

## Rules
- Public repo: no personal details, no recordings of the owner or of other players, no keys.
- Every change is tested before it is shown (see Testing). Say plainly what was and wasn't tested.
- Song data must come from real recordings, measured, never guessed (method in README, "How versions
  are transcribed"). Check a transcription against its recording before adding it.
- Plans and ideas go in TODO.md (e.g. creating songs from uploaded videos).

## Map
- `js/songs/*.js` — one file per song: versions → passes → notes `[time, key, line, flag]`. List new songs in `js/library.js`.
- `js/library.js` — song list, builds passes, groups repeated picks (×n), makes the Simple version.
- `js/notes.js` — note keys with string / finger / pitch, the 6 strings, quarter-tone names.
- `js/detector-worklet.js` — AudioWorklet: pick detection + YIN pitch. Posts `frame` / `onset`.
- `js/audio.js` — mic `Listener` (turns picks + pitch into notes), oud string model, playback, `renderOffline`.
- `js/analyze.js` — aligns a take to the reference, fits tempo, grades notes/tuning/rhythm, writes tips.
- `js/takes.js` — saves takes (report + audio) in IndexedDB; `Send to Claude` via the share sheet.
- `js/media.js` — real recordings the owner loads from his phone (kept in IndexedDB, never uploaded).
  A version's `media: { file, duration, starts: {passId: seconds} }` says which file belongs to it and
  where each pass starts in it; files are matched by name, then by length (±0.6 s). The Listen step plays
  the file with the notes in sync. The files themselves are NOT in this repo (copyright): Claude makes
  them (tuned to standard pitch with asetrate+atempo, length unchanged) and sends them in chat.
- `js/app.js` — screens by URL hash: home `#/` (songs, Tune, My takes) → song `#/song` (its lines as a path)
  → lesson `#/lesson/<line|all>/<listen|slow|time>`; tuner `#/tuner`; settings sheet behind ⚙︎. Progress
  (`oudcoach.prog`) is per song/part/line. Keep it to one obvious next action per screen.

## Owner's data reaching Claude
The owner taps **Send to Claude** on a take (or "today's summary") and shares it into the Claude app.
A take = `oud-take-YYYYMMDD-HHMMSS.json` (+ `.m4a` recording). JSON: song, pass, part, mode, speed,
`score {notes, tuning, timing, tempo}`, `tips`, `items` (each expected note: status ok/wrong/missed,
cents, dt seconds, heard), `heard` (every detected note with time and pitch), wait-mode mistakes.
Read it, listen to the audio if needed, and answer in plain words.

## Testing
Serve the folder (`python3 -m http.server 8765`) and run the Playwright scripts in `tools/` with a WAV
fed in as the microphone (`--use-file-for-fake-audio-capture=file.wav%noloop`; 16-bit PCM, ~1 s of
silence first, ~6 s after). `SONG=hob-eih VERSION=player-4 MAIN=off SPEED=1 node tools/run_test.js <wav> <line|all> <slow|time> <seconds>`
prints what was heard, the scores and tips. `node tools/render_versions.js <dir>` renders every version
with the app's own sound for self-tests. Test recordings are kept out of this repo.
Known results (2026-11-21) are in README.md.
