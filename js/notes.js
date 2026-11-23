// Where each note is played on a 6-course oud tuned (thinnest first) دو صول ري لا · · فا.
// Songs refer to notes by key. Add a key here when a new song needs a new note.
// midi uses fractional values for quarter tones (مي half-flat = 51.5).
// Fingers follow the usual oud rule (owner, 2026-11-23: "فا is third string, second finger"): a whole step above the
// open string = finger 1, three half steps = finger 2 (فا on ري, سي♭ on صول, دو on لا), five = finger 4.
export const NOTES = {
  si:  { ar: 'سي',  name: 'Si♭', midi: 58,   string: 2, finger: 2 },
  do:  { ar: 'دو',  name: 'Do',  midi: 60,   string: 1, finger: 0 },
  la:  { ar: 'لا',  name: 'La',  midi: 57,   string: 2, finger: 1 },
  sol: { ar: 'صول', name: 'Sol', midi: 55,   string: 2, finger: 0 },
  re:  { ar: 'ري',  name: 'Re',  midi: 50,   string: 3, finger: 0 },
  // real players put the half-flat مي a little under the exact quarter tone (measured: about -20 cents)
  mi:  { ar: 'مي',  name: 'Mi half-flat', midi: 51.3, string: 3, finger: 1 },
  fa:  { ar: 'فا',  name: 'Fa',  midi: 53,   string: 3, finger: 2 },
  faL: { ar: 'فا',  name: 'Fa (low)', midi: 41, string: 6, finger: 0, low: true },
  laL: { ar: 'لا',  name: 'La (low)', midi: 45, string: 4, finger: 0, low: true },
  reH: { ar: 'ري',  name: 'Re (high)', midi: 62, string: 1, finger: 1 },
  doL: { ar: 'دو',  name: 'Do (low)', midi: 48, string: 4, finger: 2, low: true },
  laHF: { ar: 'لا', name: 'La half-flat', midi: 56.5, string: 2, finger: 1 },
  miH: { ar: 'مي',  name: 'Mi♭ (high)', midi: 63, string: 1, finger: 2 },
  siL: { ar: 'سي',  name: 'Si♭ (low)', midi: 46, string: 4, finger: 1, low: true },
  // The 8 maqamat (js/songs/maqamat.js) name every flat and half-flat, since one scale has سي♭ and the next سي½♭.
  // Half-flats sit 20 cents under the exact quarter tone, as measured for مي (players put them a little low).
  // Fingers by the rule above; four half steps = finger 3 (فا# on ري, سي on صول).
  miQ:  { ar: 'مي½♭', name: 'Mi half-flat', midi: 51.3, string: 3, finger: 1 },
  miB:  { ar: 'مي♭',  name: 'Mi♭', midi: 51,   string: 3, finger: 1 },
  faS:  { ar: 'فا#',  name: 'Fa♯', midi: 54,   string: 3, finger: 3 },
  solB: { ar: 'صول♭', name: 'Sol♭', midi: 54,  string: 3, finger: 3 },
  laB:  { ar: 'لا♭',  name: 'La♭', midi: 56,   string: 2, finger: 1 },
  siB:  { ar: 'سي♭',  name: 'Si♭', midi: 58,   string: 2, finger: 2 },
  siQ:  { ar: 'سي½♭', name: 'Si half-flat', midi: 58.3, string: 2, finger: 2 },
  siN:  { ar: 'سي♮',  name: 'Si', midi: 59,    string: 2, finger: 3 },
  siLB: { ar: 'سي♭',  name: 'Si♭ (low)', midi: 46, string: 4, finger: 1, low: true },
  miN:  { ar: 'مي♮',  name: 'Mi', midi: 52,    string: 3, finger: 1 },
  // the four-finger warm-up: finger 4 reaches the next open string's note (five half steps)
  solF4: { ar: 'صول', name: 'Sol (string 3)', midi: 55, string: 3, finger: 4 },
  doF4: { ar: 'دو',  name: 'Do (string 2)', midi: 60, string: 2, finger: 4 },
  miHQ: { ar: 'مي½♭', name: 'Mi half-flat (high)', midi: 63.3, string: 1, finger: 2 },
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
