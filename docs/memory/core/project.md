---
authority: brief
status: live
---
# Project

## What it is for
Oud Coach helps a beginner learn real songs on a 6-course Arabic oud quickly and correctly, like a patient
teacher sitting next to him: it shows each note (Arabic name, string, finger), plays how it should sound,
listens through the phone mic, and tells him plainly what was right, what was wrong and what to fix.

## Who it serves
One owner, a beginner (started on the oud in late 2026), using an iPhone or iPad. Details of how he works
and what he has asked for: `docs/memory/core/owner.md`.

## What "good" means (owner's own tests)
- It must **sound like the real song** (notes and timing measured from real recordings).
- It must **hear him reliably**: right notes count as right, ringing strings are not new notes.
- It must be **obvious to use** on a phone with the oud in his hands: one next step at a time.
- The tuner must be as smooth and trustworthy as a good phone tuner (A4 = 440 Hz, about ±10 cents green).

## Shape of the app (as of 2026-11-22)
Home (songs, Tune, My takes) → a song's lines as a path with stars → each line in three steps:
Listen, Slowly (the coach waits for each note), In time (count-in, notes slide to a line, a score).
Code map: `docs/memory/core/architecture.md`.

## Songs (as of 2026-11-22)
حب إيه (Umm Kulthum) intro, أحب الليل والسهرة, حب من تحب. Status per song: `docs/memory/songs-and-audio/songs.md`.

## Where it stands
See the newest entries of `docs/memory/logs/latest.md` and the top of `TODO.md`. Not yet tested on the owner's
own iPhone by an agent; the owner tests it himself and sends takes.
