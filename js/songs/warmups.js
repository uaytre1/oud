// Daily warm-ups for the left hand (and reading strings): played through the same lesson steps as a song
// (Listen, Slowly, In time). Not a song: `exercise: true` keeps it off the song list; the Daily practice
// screen links to it. Even pace (0.7 s per note), written as note keys from js/notes.js.
export default {
  id: 'warmups',
  exercise: true,
  title: 'تمارين',
  titleEn: 'Warm-ups',
  artist: '',
  part: 'Exercise',
  maqam: 'Bayati on Re',
  versions: [
    {
      id: 'open-strings', name: 'Open strings', paced: true,
      about: 'Right hand and reading strings: pick each open string, thinnest to thickest and back.',
      lines: [['do', 'do', 'sol', 'sol'], ['re', 're', 'laL', 'laL'], ['laL', 're', 'sol', 'do']],
    },
    {
      id: 'fingers', name: 'Fingers', paced: true,
      about: 'Left hand: open string, finger 1, finger 2 and back, on strings 3, 2 and 1.',
      lines: [['re', 'mi', 'fa', 'mi', 're'], ['sol', 'la', 'si', 'la', 'sol'], ['do', 'reH', 'do']],
    },
    {
      id: 'bayati', name: 'Bayati scale', paced: true,
      about: 'The scale of حب إيه and أحب الليل: ري to the high ري and back. مي is half-flat.',
      lines: [['re', 'mi', 'fa', 'sol'], ['la', 'si', 'do', 'reH'], ['reH', 'do', 'si', 'la'], ['sol', 'fa', 'mi', 're']],
    },
  ],
};
