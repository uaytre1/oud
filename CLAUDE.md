# Oud Coach — notes for Claude

A static web app (GitHub Pages, no build step) that listens to the owner's oud and coaches him.
The owner is a beginner, reads on an iPhone/iPad, writes casually (often by voice), and judges by ear.
Keep the UI simple, phone-first, English UI with Arabic note names.

## Rules
- Public repo: no personal details, no recordings of the owner or of other players, no keys.
- Every change is tested before it is shown (see Testing). Say plainly what was and wasn't tested.
- Song data must come from real recordings, measured, never guessed. Note in `js/song.js` where it came from.

## Map
- `js/song.js` — notes (string/finger/midi), passes with measured times, string list. New songs go here.
- `js/detector-worklet.js` — AudioWorklet: pick detection + YIN pitch. Posts `frame` / `onset`.
- `js/audio.js` — mic `Listener` (turns picks + pitch into notes), oud string model, playback, `renderOffline`.
- `js/analyze.js` — aligns a take to the reference, fits tempo, grades notes/tuning/rhythm, writes tips.
- `js/takes.js` — saves takes (report + audio) in IndexedDB; `Send to Claude` via the share sheet.
- `js/app.js` — the four tabs: Learn, Practice (wait / play along / free), Tuner, Progress.

## Owner's data reaching Claude
The owner taps **Send to Claude** on a take (or "today's summary") and shares it into the Claude app.
A take = `oud-take-YYYYMMDD-HHMMSS.json` (+ `.m4a` recording). JSON: song, pass, part, mode, speed,
`score {notes, tuning, timing, tempo}`, `tips`, `items` (each expected note: status ok/wrong/missed,
cents, dt seconds, heard), `heard` (every detected note with time and pitch), wait-mode mistakes.
Read it, listen to the audio if needed, and answer in plain words.

## Testing
Serve the folder (`python3 -m http.server 8765`) and run the Playwright scripts in `tools/` with a WAV
fed in as the microphone (`--use-file-for-fake-audio-capture=file.wav%noloop`; 16-bit PCM, ~1 s of
silence first, ~6 s after). `run_test.js <wav> <part 1-4|all> <wait|along|free> <seconds> [passIndex]`
prints what was heard, the scores and tips. Test recordings are kept out of this repo.
Known results (2026-11-21) are in README.md.
