---
authority: rule
status: live
---
# Quality standard: what "done" means, and how the app should feel

The owner (2026-11-26): the quality needs to be perfect; the app must be easy to pick up, smooth to use, and
something a person would actually come back to every day. This page is the bar for every agent and every change.

## Who we build for
A beginner holding an oud, reading a phone propped in front of him, often with no free hand. He judges by ear.
He may share the app with friends who have never seen it. Assume no patience for reading and no teacher.

## A change is done only when all of these are true
1. **It does what the owner asked, in his words.** Quote his sentence in the log entry.
2. **Tested, and the test is named.** The regression set (`docs/memory/song-standard.md`) passes 3 times each on a quiet
   machine; anything visual was looked at as a phone-size screenshot in light and dark; anything about listening
   was run on at least one of the owner's own recordings (`docs/memory/detection.md`).
3. **Nothing else got worse.** Run the whole regression set, not only the test for your change. (On 2026-11-25 a
   listening change was shipped that the suite did not cover; it cost a day.)
4. **Said plainly**: what was tested, what was not, what is a guess. Never "should work".
5. **Logged** (`docs/memory/log.md`), with "Next:".
If one of these cannot be met, say so and do not release.

## How the app should feel (check each screen against these)
- **One obvious next action.** Opening the app, a new user should know what to tap within 3 seconds.
- **Sound within 30 seconds** of first opening: tune or the first Listen. No setup wall.
- **Hands are busy.** While playing: big text, big targets (44 px or more), nothing to read longer than 6 words,
  nothing that needs a tap to continue unless he stopped.
- **Never stuck, never punished for the mic.** If the app is unsure, it waits or moves on; it does not say "wrong".
  A wrong mark must mean he really played a wrong note.
- **Same words everywhere**: Listen / Watch → Slowly → In time. Strings and fingers always "S3·F2" style.
- **Every screen has a way back and a way forward.** No dead ends, no "coming soon".
- **It says why.** A tick, a star, a "try again": the rule is visible ("85% on time at 60 BPM").
- **Fast.** No screen takes more than 1 s to appear on his iPhone; no layout jumps while playing.

## Would a person keep using it? (the daily loop to protect)
Open → "Continue" on the path card → 10 minutes of small wins → a tick and a streak → tomorrow's step is waiting.
Anything that breaks this loop is a top-priority bug: a step that cannot be passed, a lesson that stalls, a result
he cannot understand, sound that is unpleasant, having to choose between many things before playing.
What still weakens the loop today (from `TODO.md`, sections C and D): the practising and result screens were never
reviewed as screens; the computed oud sound ("doesn't really sound like oud"); no first-run guidance beyond the
welcome sheet; results that vanish; small text and targets on the lesson screen; the home list of songs waiting for
recordings; emoji mixed with line icons.

## How to review the design (do this before changing it)
1. Take phone-size screenshots of every screen in light and dark, including while practising and the results
   (use the fake-mic flow in `tools/run_test.js`). Put them side by side.
2. For each screen answer: what is the one action? what could be removed? what must be read with an oud in hand?
3. Fix the worst three, test, release, and ask the owner how it feels. Small steps; he is on a tight budget.
4. Do not redesign what he has said he likes (the calm home, the path, Slowly / In time). Ask before moving things.

## Things only the owner can judge
Whether a song sounds right, whether a hint is too strict, whether the flow feels smooth. Ask with one clear
question at a time, and prefer A/B audio or one screenshot over a description.
