// Where each note is played on a 6-course oud tuned (thinnest first) دو صول ري لا · · فا.
// Songs refer to notes by key. Add a key here when a new song needs a new note.
// midi uses fractional values for quarter tones (مي half-flat = 51.5).
export const NOTES = {
  si:  { ar: 'سي',  name: 'Si♭', midi: 58,   string: 2, finger: 3 },
  do:  { ar: 'دو',  name: 'Do',  midi: 60,   string: 1, finger: 0 },
  la:  { ar: 'لا',  name: 'La',  midi: 57,   string: 2, finger: 1 },
  sol: { ar: 'صول', name: 'Sol', midi: 55,   string: 2, finger: 0 },
  re:  { ar: 'ري',  name: 'Re',  midi: 50,   string: 3, finger: 0 },
  // real players put the half-flat مي a little under the exact quarter tone (measured: about -20 cents)
  mi:  { ar: 'مي',  name: 'Mi half-flat', midi: 51.3, string: 3, finger: 1 },
  fa:  { ar: 'فا',  name: 'Fa',  midi: 53,   string: 3, finger: 3 },
  faL: { ar: 'فا',  name: 'Fa (low)', midi: 41, string: 6, finger: 0, low: true },
  laL: { ar: 'لا',  name: 'La (low)', midi: 45, string: 4, finger: 0, low: true },
};


// Six strings, numbered from the thinnest (string 1, nearest the floor).
// String 5 varies between players, so it can be changed in the tuner.
export const STRINGS = [
  { n: 1, ar: 'دو', name: 'Do',  midi: 60 },
  { n: 2, ar: 'صول', name: 'Sol', midi: 55 },
  { n: 3, ar: 'ري', name: 'Re',  midi: 50 },
  { n: 4, ar: 'لا', name: 'La',  midi: 45 },
  { n: 5, ar: 'صول', name: 'Sol (low)', midi: 43 },
  { n: 6, ar: 'فا', name: 'Fa (low)', midi: 41 },
];
export const STRING5_OPTIONS = [
  { ar: 'صول', name: 'Sol (low)', midi: 43 },
  { ar: 'فا', name: 'Fa', midi: 41 },
  { ar: 'مي', name: 'Mi', midi: 40 },
  { ar: 'ري', name: 'Re (low)', midi: 38 },
];

// Name any pitch in quarter tones, Arabic solfège.
const QT = [
  ['دو', 'Do'], ['دو+', 'Do quarter-sharp'], ['دو#', 'Do♯'], ['ري-', 'Re half-flat'],
  ['ري', 'Re'], ['ري+', 'Re quarter-sharp'], ['مي♭', 'Mi♭'], ['مي', 'Mi half-flat'],
  ['مي♮', 'Mi'], ['فا-', 'Fa quarter-flat'], ['فا', 'Fa'], ['فا+', 'Fa quarter-sharp'],
  ['فا#', 'Fa♯'], ['صول-', 'Sol half-flat'], ['صول', 'Sol'], ['صول+', 'Sol quarter-sharp'],
  ['لا♭', 'La♭'], ['لا-', 'La half-flat'], ['لا', 'La'], ['لا+', 'La quarter-sharp'],
  ['سي♭', 'Si♭'], ['سي-', 'Si half-flat'], ['سي', 'Si'], ['سي+', 'Si quarter-sharp'],
];
export function nameOf(midi) {
  const q = Math.round(midi * 2);
  const idx = ((q % 24) + 24) % 24;
  const [ar, en] = QT[idx];
  return { ar, en, octave: Math.floor(q / 24) - 1 };
}
