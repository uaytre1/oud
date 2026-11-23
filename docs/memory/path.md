---
authority: reference
status: live
---
# Your path: the learning order and where it comes from

The owner has no teacher and asked the app to guide him (2026-11-23). `js/path.js` holds the 8 stages; this file
says why they are in that order. Full research report and notes (with every URL) are in the owner's private
notes repo, not here. Summary of what the sources agree on:

- **Opening, the same in all 8 Arabic YouTube beginner series traced** (ListenArabic, oudline/Ramsis Kasis,
  Mohamed Zahhar, Oud Tech, Mido Alashi, izif/Tareq Al-Jundi, Oudista, Yunus Jaffar), a Tunisian conservatory method
  and a Yarmouk University study (Obeidat 2015): parts of the oud, posture, holding the risha, string names and
  tuning with a tuner, open-string down-up strokes (صد/رد). Then finger numbers and a one-string finger exercise.
- **First maqam**: عجم on دو in 6 of 8 courses (no quarter tones). Gulf courses (Oudista, Osarh) teach
  عجم → نهاوند → راست → كرد → بياتي → حجاز → صبا → سيكاه/هزام. Rast-first and finger-pattern orders exist too.
  Each maqam comes with one exercise and one song.
- **Tremolo** right after the first scale (lessons 5–9 in the series). **Rhythms** as "rhythmic risha" after
  several maqamat: Gulf courses teach إيقاع عربي then رومبا; Egyptian songs start with مقسوم. **Taqsim** is in no
  beginner syllabus (about two years in, by copying short phrases).
- **Time**: 20–30 minutes a day; first piece in about 6–8 weeks; level 1 in about 3 months; doulab/sama'i darij
  around 6 months (course claims, not measured).
- **Main beginner mistake** (Obeidat): combining posture, both hands and the risha inside pieces instead of one
  short drill per difficulty. Fix: each step isolates one skill.

Our own choices (not from a source): بياتي second (his songs are بياتي; Mido Alashi's course also teaches حب إيه
early), every BPM, the 85% on-time bar for risha steps, and the week counts per stage.
Steps tick themselves from the app's own data: `pace.hist` (risha runs), lesson progress (`prog`), tuner use;
`manual`/`read` steps are ticked by hand (`path.ticks`). Current stage: `path.stage`.
Unknown, to measure later: stroke directions of بلدي/سعيدي/ملفوف/خليجي, the Gulf rhythms beyond عربي/رومبا, and
the maqam of نساي, سكة طويلة, يوم كنتي.
