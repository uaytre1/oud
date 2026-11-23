# Oud transcription tool

Writes down which notes an oud player plays, and when, from a phone video or any recording. Output is
the song-file format of `js/songs/*.js` (`[time, key, line, flag]`) plus a confidence per note and the
moments worth checking by ear. Code only: no audio and no model weights live in this folder.

## Run it

```bash
pip install -r tools/transcribe/requirements.txt      # CPU torch: see the comment in the file; ffmpeg on PATH
python3 tools/transcribe/transcribe.py VIDEO.mp4 \
  --scale faL,laL,siL,doL,re,mi,fa,sol,la,si,do,reH --keys solL=43 \
  --start 13.0 --end 25.0 -o notes.json --js
```

- `--scale`: the maqam's note keys over the oud's range (keys from `js/notes.js`; `--keys name=midi` adds a
  key the app does not have yet, which then has to be added to `js/notes.js` before the song can use it).
  Give the whole maqam, not only the notes you expect: the tuning fit and the octave check need it.
- `--offset S`: the player's tuning offset in semitones, if known. Leave it out for videos (it is fitted).
  For the owner's own takes (oud tuned with the app's tuner) pass `--offset 0`: on his practice take the fit
  was wrong by about 1.8 semitones (many noisy, out-of-tune notes), and the tool warns when the fit is poor.
- `--sheet 'si,do,la,sol|re,fa,fa'`: main notes from a note sheet, lines split by `|`. Then flags follow
  `docs/memory/songs.md` step 5 (matched = main, same note again = `r`, anything else = `g`) and lines come
  from the sheet. Without it: `r` = same key as the note before, `g` only for notes shorter than 0.1 s
  before a different note (that rule was right 75% of the time and found 31% of decorations on the benchmark),
  lines split at long gaps.
- `--drift`: let the tuning move slowly (6 s windows). Off by default: no measured gain (see below).
- `--separate`: remove singing/drums with Demucs first (htdemucs; the model downloads on first use, which
  worked from the agent container on 2026-11-23). Only tried on the orchestral Hob Eih Original, where the
  tool does not work with or without it (note F1 .08 -> .10 against the song file): the tool is for solo oud.
- `--no-neural`: pyin and the template only, no torch. Less reliable: on Player 4's pass, note F1 .77
  against the song file vs .83 with the full vote (line 1 alone: .87 both).

Output JSON: `notes` (time from the first note), `start` (where the first note is in the file: use it for
`media.starts`), `offset_semitones`, `tuning` (fit cost, runner-up), `confidence` per note (share of the four
pitch votes), `check_by_ear` (notes whose votes split, as `[time, key, confidence, other keys voted]`;
listen to the lowest first) and `details` (each estimator's vote, the number of onset detectors that fired,
the treble click in dB). On real videos about half the notes have split votes, mostly low/high octave splits
on the bass courses. Times in `details` and `check_by_ear` are
seconds in the input file.

Speed: about 0.4 s per second of audio with 2 threads (CREPE tiny is most of it).

## How it works

1. **Note starts**: three onset detectors on the audio: rectified complex-domain (phase and level change),
   spectral flux, and the rise of the treble level above 1.8 kHz (the risha's click). A start is kept when two
   of the three fire within 30 ms; its time is the complex-domain time (the most precise, about 2 ms median
   error on the benchmark). Each detector's fixed latency was measured and removed.
2. **Tuning**: one offset for the whole recording, fitted from the pyin and CREPE pitch of every note.
3. **Key of each note**: four estimators vote: pyin, CREPE (tiny), PESTO, and a harmonic template on the
   *new* energy after the pick (spectrum after the pick minus 0.3 x the spectrum before it, so the ringing
   previous note counts less). The template scores each key by its harmonics and subtracts energy at the
   half-harmonics, which is what tells a low فا from a high one. Ties go to the template.
4. **Confidence**: the share of votes. On the benchmark, notes with 4/4 votes were right 99.6% of the time
   (2934 notes), 3/4: 81%, 2/4: 80%, 1/4: 0 of 4. So every note under 1.0 is listed in `check_by_ear`.

## Benchmark (2026-11-22/23)

Synthetic notes with exact answers: note lists (15 real song passes and 36 random maqam melodies) rendered
with the app's own synth (`renderOffline` in `js/audio.js`, per-note loudness), then degraded: phone-mic EQ,
room reverb, room noise at 20-35 dB SNR (18-24 dB for "quiet", peaks at -45 dBFS), AAC encoding, tuning
offsets of 0.5-3 semitones, tempo rubato (+-30%) with drift (+-15 cents), repeated picks (x2-x6, 0.1-0.22 s
apart), decorations (50-110 ms), quarter tones, low strings. Thresholds were tuned on a separate dev set
(20 items, other random seed). Test set: 66 items, 3,265 notes. Note F1 = onset within 50 ms and the right key.

| Method | clean | noisy | rubato | fast repeats | decorations | quarter tones | low strings | quiet | all |
|---|---|---|---|---|---|---|---|---|---|
| Basic Pitch alone | .935 | .894 | .884 | .880 | .902 | .907 | .821 | .718 | .884 |
| Basic Pitch starts + pyin (old pipeline, before hand alignment) | .913 | .862 | .883 | .890 | .847 | .885 | .838 | .815 | .874 |
| flux + pyin (old transcribe.py) | .924 | .919 | .956 | .976 | .908 | .958 | .954 | .962 | .938 |
| complex-domain + CREPE | .973 | .939 | .984 | .987 | .943 | .971 | .811 | .965 | .951 |
| HMM (Viterbi over scale keys, pYIN-note style) | .819 | .808 | .863 | .947 | .874 | .885 | .901 | .897 | .855 |
| **this tool: 2-of-3 onsets + 4-way pitch vote** | .972 | .960 | .989 | .998 | .971 | .987 | .964 | .982 | **.974** |

This tool on the test set: onset F1 .992, right key on matched notes 97.9%, onset error median 1.9 ms
(p90 3.7 ms), repeated picks found 98.5%, decorations found 87.9%, tuning error median 0.8 cents (none over
25). The packaged code was re-run on the dev and test sets: same scores as the benchmark code (note F1 .969 and .974).

Real recordings (tuned videos in the session scratchpad; no exact truth):
- Hob Eih Player 4, line 1 (near-truth: the owner checked it by ear, 2026-11-23; 10 notes): all 10 found
  with the right key and within 2 ms median of the marked times, plus 3 extra notes (note F1 .87). The old
  pipeline found the 10 with 11 extra (F1 .65); Basic Pitch alone .45.
- Agreement with the 12 existing passes (Hob Eih Players 1-4 and Lesson, أحب الليل Lesson, حب من تحب
  Players 1-2): note F1 .71 (old pipeline .58). The existing passes are not truth: several were hand-fixed and
  the owner has called some of them wrong. Notes with 4/4 votes agreed with them 95% of the time, 3/4 81%,
  2/4 63%.
- "Sounds the same" check (render the notes with the app synth, compare frame by frame with the recording):
  averaged over the 12 passes, this tool vs the existing transcriptions: onset-envelope correlation .70 vs .56
  (better in 11 of 12), log-CQT similarity .62 vs .60, CREPE pitch agreement .71 vs .70. The check shares
  detectors with the tool (CREPE, spectral flux), so it is supporting evidence only.
- Tuning on the owner's untuned حب من تحب videos: +3.05 and -0.54 semitones, against +3.00 and -0.52 found
  earlier by hand. Tuned videos: -0.08 to +0.07.

Tried and not adopted (numbers on the synthetic test set unless said):
- One pitch estimator alone. Key agreement at the existing notes' times on the 12 real passes: pyin .73,
  CREPE .79, PESTO .77, template .81, the 4-way vote .86. CREPE and PESTO read low strings an octave high
  (CREPE .811 on the low-strings set; on Player 4 every low فا); pyin reads an octave low when bass strings
  ring (حب من تحب).
- HMM note tracker (states: silence, attack and sustain per scale key; harmonic salience, onset evidence,
  pyin pitch class): .855 after tuning; frame-level salience was too noisy.
- Basic Pitch onset posteriorgram as a detector: F1 .71 on dev; Basic Pitch notes as a 4th onset voter:
  .977 vs .974 (no real gain, one more model).
- Treble-click gates (the app's rule, or "needs a click or a level rise"): -0.2 to -2.4 points on synthetic,
  no change on the real passes. Kept as data (`click_db` in details), not as a filter.
- Drifting tuning (6 s windows): identical scores; on real videos the median pitch residual per third of the
  video stayed within 20 cents.
- Tuning only from notes where pyin and CREPE agree: worse (.964, one item off by more than 25 cents).

## What is still unreliable

- Very quick turns and slurs (left-hand notes without a pick): found only when a detector fires.
- Decoration (`g`) flags without a note sheet.
- Strong ringing of open bass strings can still pull single estimators an octave down; the vote helps but
  check notes in `check_by_ear`.
- Tuning of noisy practice takes: pass `--offset`.
