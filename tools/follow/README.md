# Score follower: find when each known note is played in any oud video

Give it a video (or audio) of a song the app already knows, and a version of that song. It finds where
the melody is played (once, twice, or only part of it), the time of every note, which notes the player
skipped, and the extra picks the player added. It can draw the notes on the video and lay the app's
computer oud over the original sound at those times, so the result can be judged by eye and ear.

This is score following (like a karaoke screen following a singer), not blind transcription: the notes
are known, only their times are found.

## Run

```bash
pip install -r tools/follow/requirements.txt     # plus ffmpeg; node + playwright for --mix
python3 tools/follow/follow.py VIDEO.mp4 --song hob-eih --version player-4 --pass p1 \
    --json out.json --video out.mp4 --mix out_mix.mp4
# the consensus of several versions instead of one (timing from the first with --center-first):
python3 tools/follow/follow.py VIDEO.mp4 --song hob-eih --consensus --version player-4,player-1,player-2 --center-first
```

- The tuning offset is estimated (untuned videos are fine); `--offset` skips that.
- `--pass all` joins a version's passes. Prefer one pass at a time: a 22 s video holding one pass was
  over-compressed when both passes of Hob Min Tihib Player 1 were joined.
- `OUD_ROOT=<dir>` reads the song files from another checkout, e.g. a commit:
  `git archive <commit> js | tar -x -C <dir>`.
- About 15-40 s per video on one CPU, plus about 20-40 s per video file written.
- Audio and videos never go in this repo. Write outputs outside it.

## Output (JSON)

`result.offset` (half steps, recording minus standard pitch) and `result.occurrences`, each with
`start`, `end`, `score_part` (the part of the score matched, in score seconds), and:
- `notes`: every score note: `t` (seconds in the media) or `played: false`, `conf` (posterior that this
  pick is the note; for a note not played, the probability that it was not played), `pitch` (0-1 match),
  `cents` (pyin pitch minus expected), `click_db`, `in_range` (inside the matched part).
- `extras`: real picks (click >= 8 dB) between matched notes that no score note explains, with a
  guessed name. The guess is blind transcription, so treat it as a hint.

## How it works

1. **Features** (`features.py`): constant-Q spectrum at 25-cent bins with harmonics summed onto their
   fundamental and octaves folded (quarter-tone chroma, octave-equivalent); pyin with `fill_na=None`
   (a ringing double course often reads "unvoiced", but its best guess is still right); candidate
   picks from spectral flux plus the treble "click" above 1.8 kHz, timed at the steepest treble rise.
2. **Tuning** (`align.py`, `scan_offsets`): the coarse alignment is tried at all 48 quarter-of-a-half-step
   shifts (a circular roll of the pitch-class features), best three refined on the pyin histogram,
   then corrected by the median pitch of the matched notes.
3. **Where** (`occurrences`): local DTW (free start and end in both the score and the recording)
   between the recording and a plain synth rendering of the score, at four tempo scales. Finds the
   melody anywhere, several times, or only part of it.
4. **Which pick is which note** (`fine_align`): a DP over (score note, candidate pick) that allows notes
   not played and extra picks. Costs are log-likelihood ratios: pitch evidence, the chance that a
   candidate is a real pick and not a swell of a ringing course, distance from the coarse path, and
   local rhythm. Forward-backward gives each note's confidence.
5. **Refine**: an unused candidate within 80 ms with a click at least 6 dB stronger takes over.
6. Weak second occurrences (under 50 % of notes found, or mean pitch match under 0.72) are dropped.
   That removed a false match inside 24 s of talking.

## Calibration (2026-11-22, Hob Eih players 1-4 and Lesson only)

- Pitch evidence: right vs wrong note on 216 true picks, ROC AUC 0.989. A pitch match under 0.4 was never
  right (0 of 1093); over 0.8 it was right 98 % of the time.
- Real pick vs swell: logistic fit on 387 candidates (AUC 0.856) of flux strength, click dB, and "same
  pitch before and after". Same pitch with a click under 6 dB was a real pick only 3-9 % of the time.
- Deletion, insertion and timing weights: a small grid; all settings were within about 3 points.
The other songs were not used for tuning (see held-out below).

## Validation

`python3 tools/follow/validate.py <loo|synth|robust|heldout|all> --media <tuned media dir> --work <scratch dir>`
(held-out also takes `--untuned <file> <version> <offset>` for the untuned originals).

"Within 50 ms" = share of followed notes that sit within 50 ms of a reference pick of the same pitch
(octave-equivalent), one-to-one. "Wrong" = followed notes with no same-pitch reference pick within 150 ms.
The reference transcriptions mark a point 15-25 ms into each attack. This follower marks the attack start,
which the waveforms and the synthetic test (bias -1.5 ms) support. That offset is reported as bias, and
"bc" removes it.

Results of 2026-11-23 (leave-one-out with Hob Eih Player 4 as of commit bb0814a):

| Test | Within 50 ms | Median / p90 error | Wrong |
|---|---|---|---|
| (a) Leave-one-out, consensus of the other players, 5 videos (median) | 74 % | 24 / 38 ms | 20 % |
| (a) Another player's version, 28 pairs (median) | 75 % | 23 / 35 ms | 15 % |
| (b) Synthetic (app synth, phone EQ, 20 dB SNR, tempo warp, drops, decorations), 9 runs | 93 % | 1.9 / 4.3 ms | - |
| (b) Hard synthetic (10 dB SNR, 20 % dropped, 30 % decorated, tempo 60 % / 130 %), 6 runs | 73 % | 6.2 / 153 ms | - |
| (c) After 25 s of another song / played twice / after 20 s of silence / after 24 s of talking | 74 / 77 / 74 / 76 % | about 17 / 35 ms | 20-21 % |
| (c) Time-stretched 60 / 80 / 100 / 130 % (bc) | 79 / 80 / 81 / 81 % | | 14-21 % |
| Held-out: Hob Min Tihib P2 video following P1, P1 video following P2 | 79 %, 95 % | | 21 %, 4 % |
| Held-out: Ahib lesson video following the note sheet (33 of 43 notes found) | 73 % | 24 / 93 ms | 0 % |
| Held-out: untuned originals, tuning offset error | 9 and 10 cents | | |
| Synthetic tuning offset error (15 runs) | at most 7 cents | | |

Known weak spots:
- The synthetic tests show the timing of a matched note is exact (1-2 ms). The real-video errors are
  mostly which pick a note goes to: decorations and repeated picks next to the expected note.
- Notes really not played are flagged "not played" only 60 % of the time (35 % in the hard set). The
  follower would rather put a dropped note on a nearby pick of the same pitch.
- "Wrong" includes places where the follower put a note on a clear, strong pick that the reference
  transcription does not list. Nobody has checked those by ear.
- Paced scores (note sheets) are followed exactly where they match, but often only partly
  (Hob Eih note sheet: 20 notes found in Player 4's video).

## Files

| File | Role |
|---|---|
| `follow.py` | Command line: media + song/version/pass -> JSON, overlay video, mix video |
| `score.py` | Song data (via `songdata.mjs`), passes, consensus melody, pitch helpers |
| `songdata.mjs` | Prints the app's song library as JSON (reads `js/library.js`, `js/notes.js`) |
| `features.py` | Audio loading (ffmpeg), salience, pyin, candidate picks, plain synth for the coarse step |
| `align.py` | Tuning scan, local DTW, note-to-pick DP with confidence, the follower |
| `overlay.py` | Draws the notes on the video (Pillow + raqm), mixes the computer oud |
| `render_synth.js` | Renders notes with the app's own oud sound (`js/audio.js`) via Playwright |
| `validate.py` | Tests (a) leave-one-out, (b) synthetic, (c) robustness, held-out songs |

## Own notes at the measured times (no re-finding)
`overlay_measured.py VIDEO --song S --version V --pass P --start SECONDS --mix out.mp4` draws a version's own measured
notes on its own video exactly where they were measured. Use it for a version made from that video: the follower can
slip 0.2–0.3 s inside runs of the same note.
