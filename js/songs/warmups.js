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
  versionLabel: 'Exercise',
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
      id: 'four-fingers', name: 'Four fingers', paced: true,
      about: 'Left hand: fingers 1-2-3-4 on string 3 (ري مي♮ فا فا# صول) and string 2 (صول لا سي♭ سي♮ دو). Keep each finger down until the next one plays.',
      lines: [['re', 'miN', 'fa', 'faS', 'solF4'], ['solF4', 'faS', 'fa', 'miN', 're'], ['sol', 'la', 'siB', 'siN', 'doF4'], ['doF4', 'siN', 'siB', 'la', 'sol']],
    },
    {
      id: 'bayati', name: 'Bayati scale', paced: true,
      about: 'The scale of حب إيه and أحب الليل: ري to the high ري and back. مي is half-flat.',
      lines: [['re', 'mi', 'fa', 'sol'], ['la', 'si', 'do', 'reH'], ['reH', 'do', 'si', 'la'], ['sol', 'fa', 'mi', 're']],
    },
  ],
};
