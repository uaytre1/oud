// Hob Eih (حب إيه) intro, maqam Bayati on Re.
// Every time below was measured from real recordings, note by note:
//   pass 1: a well-known recording of the first pass (standard tuning), each note snapped to the actual pick.
//   pass 2: another player's second pass (the فا فا فا فا version), scaled to the same speed as pass 1.
// Times are seconds from the first note of the pass.

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

// grace: a very quick in-between note. Wait mode skips it; play-along counts it lightly.
const P1 = [
  // line 1
  [0.000, 'si', 1], [0.999, 'do', 1], [1.469, 'la', 1], [2.357, 'sol', 1], [2.816, 're', 1],
  [3.274, 'faL', 1], [3.869, 'fa', 1],
  // line 2
  [5.161, 'sol', 2], [5.518, 'la', 2], [6.325, 'laL', 2],
  // line 3
  [7.379, 'si', 3], [7.744, 'la', 3], [7.985, 'sol', 3], [8.461, 'fa', 3],
  [8.738, 'mi', 3, 'grace'], [8.778, 're', 3], [9.021, 'mi', 3], [9.169, 'fa', 3],
  // line 4
  [10.308, 'mi', 4, 'grace'], [10.378, 'fa', 4], [10.678, 'sol', 4], [10.931, 'fa', 4],
  [11.294, 'mi', 4], [11.793, 're', 4],
];
const P1_END = 12.6;

const P2 = [
  // line 1
  [0.000, 'si', 1], [0.576, 'do', 1], [1.141, 'la', 1], [1.972, 'sol', 1],
  [2.335, 're', 1], [2.541, 'mi', 1], [2.706, 'faL', 1],
  // line 2: the four فا
  [3.024, 'fa', 2], [3.240, 'fa', 2], [3.550, 'fa', 2], [3.717, 'fa', 2],
  // line 3
  [4.045, 'sol', 3], [4.371, 'fa', 3], [4.531, 'sol', 3], [4.669, 'la', 3],
  // line 4
  [5.010, 'la', 4], [5.213, 'sol', 4], [5.362, 'fa', 4], [5.746, 'mi', 4], [5.916, 're', 4],
];
const P2_END = 6.7;

function build(list, end) {
  return list.map(([t, key, line, flag], i) => {
    const next = i + 1 < list.length ? list[i + 1][0] : end;
    return { i, t, dur: next - t, key, line, grace: flag === 'grace', ...NOTES[key] };
  });
}

export const PASSES = [
  {
    id: 'p1', title: 'First time', subtitle: 'Timing measured from real players\' recordings',
    notes: build(P1, P1_END), end: P1_END,
  },
  {
    id: 'p2', title: 'Second time · فا فا فا فا', subtitle: 'Timing measured from real players\' recordings',
    notes: build(P2, P2_END), end: P2_END,
  },
];

export function linesOf(pass) {
  const out = [];
  for (const n of pass.notes) (out[n.line - 1] ||= []).push(n);
  return out;
}

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
