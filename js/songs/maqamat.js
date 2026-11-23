// The 8 basic maqamat as scale exercises (owner, 2026-11-23: his teacher says to master all 8 first).
// Same lesson steps as a song (Listen, Slowly, In time), even pace (0.7 s per note), each note with its string
// and finger. All 8 sit in the first position of a 6-course oud (دو صول ري لا · فا).
// Source: each scale is its two ajnas as listed by Maqam World (maqamworld.com, maqam pages, read 2026-11-23),
// with the Arabic Wikipedia's notes for Rast, Bayati, Hijaz, Nahawand, Kurd and its tonic for 'Ajam (سي♭).
// Not yet checked against the owner's teacher's video: tonics, fingers and descending forms may change.
export default {
  id: 'maqamat',
  exercise: true,
  home: true,                 // shown on the home screen after the songs
  title: 'المقامات الثمانية',
  titleEn: 'The 8 maqamat',
  artist: 'scales',
  part: 'Exercise',
  maqam: '8 maqamat',
  versionLabel: 'Maqam',
  versions: [
    { id: 'rast', name: 'Rast راست', paced: true,
      about: 'On دو. Jins Rast (دو ري مي½♭ فا) + Rast on صول. Both مي and سي are half-flat. Going down, سي becomes سي♭.',
      lines: [['doL', 're', 'miQ', 'fa'], ['sol', 'la', 'siQ', 'do'], ['do', 'siB', 'la', 'sol'], ['fa', 'miQ', 're', 'doL']] },
    { id: 'bayati', name: 'Bayati بياتي', paced: true,
      about: 'On ري. Jins Bayati (ري مي½♭ فا صول) + Nahawand on صول. The scale of حب إيه.',
      lines: [['re', 'miQ', 'fa', 'sol'], ['la', 'siB', 'do', 'reH'], ['reH', 'do', 'siB', 'la'], ['sol', 'fa', 'miQ', 're']] },
    { id: 'sikah', name: 'Sikah سيكاه', paced: true,
      about: 'On مي½♭ (the سيكاه note). Jins Sikah (مي½♭ فا صول) + Rast on صول. Starts and ends on a half-flat: listen first.',
      lines: [['miQ', 'fa', 'sol', 'la'], ['siQ', 'do', 'reH', 'miHQ'], ['miHQ', 'reH', 'do', 'siQ'], ['la', 'sol', 'fa', 'miQ']] },
    { id: 'hijaz', name: 'Hijaz حجاز', paced: true,
      about: 'On ري. Jins Hijaz (ري مي♭ فا# صول: the wide step from مي♭ to فا#) + Nahawand on صول.',
      lines: [['re', 'miB', 'faS', 'sol'], ['la', 'siB', 'do', 'reH'], ['reH', 'do', 'siB', 'la'], ['sol', 'faS', 'miB', 're']] },
    { id: 'saba', name: 'Saba صبا', paced: true,
      about: 'On ري. Jins Saba (ري مي½♭ فا صول♭) + Hijaz on فا + Ajam on سي♭. صول♭ is finger 3 on string 3, not the open صول.',
      lines: [['re', 'miQ', 'fa', 'solB'], ['la', 'siB', 'do', 'reH'], ['reH', 'do', 'siB', 'la'], ['solB', 'fa', 'miQ', 're']] },
    { id: 'nahawand', name: 'Nahawand نهاوند', paced: true,
      about: 'On دو. Jins Nahawand (دو ري مي♭ فا) + Hijaz on صول going up (لا♭ سي♮), Kurd going down (سي♭).',
      lines: [['doL', 're', 'miB', 'fa'], ['sol', 'laB', 'siN', 'do'], ['do', 'siB', 'laB', 'sol'], ['fa', 'miB', 're', 'doL']] },
    { id: 'ajam', name: 'Ajam عجم', paced: true,
      about: 'On سي♭ (string 4, finger 1). Jins Ajam (سي♭ دو ري مي♭) + Ajam on فا: like a major scale.',
      lines: [['siLB', 'doL', 're', 'miB'], ['fa', 'sol', 'la', 'siB'], ['siB', 'la', 'sol', 'fa'], ['miB', 're', 'doL', 'siLB']] },
    { id: 'kurd', name: 'Kurd كرد', paced: true,
      about: 'On ري. Jins Kurd (ري مي♭ فا صول) + Nahawand on صول. Like Bayati, but مي♭ instead of مي½♭.',
      lines: [['re', 'miB', 'fa', 'sol'], ['la', 'siB', 'do', 'reH'], ['reH', 'do', 'siB', 'la'], ['sol', 'fa', 'miB', 're']] },
  ],
};
