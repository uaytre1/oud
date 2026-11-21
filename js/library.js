// The song library. Add a song: put its file in js/songs/ and list it in SONGS.
import { NOTES } from './notes.js';
import hobEih from './songs/hob-eih.js';
import ahibAlLail from './songs/ahib-al-lail.js';
import hobMinTihib from './songs/hob-min-tihib.js';

export const SONGS = [hobEih, ahibAlLail, hobMinTihib];

// A simplified version for learning: the measured notes of one pass with the quick notes and
// repeated picks left out, at an even pace (last note of each line held twice as long).
function simplified(fromVersion) {
  const p = fromVersion.passes[0];
  const kept = p.notes.filter((n) => !n[3]);
  const out = []; let t = 0;
  kept.forEach((n, k) => {
    out.push([+t.toFixed(3), n[1], n[2]]);
    const lastOfLine = k + 1 === kept.length || kept[k + 1][2] !== n[2];
    t += lastOfLine ? 1.4 : 0.7;
  });
  return {
    id: 'simple', name: 'Simple', about: `${fromVersion.name}'s notes without the extras, at an even pace. Start here.`,
    source: `Simplified from ${fromVersion.name}'s measured notes.`,
    passes: [{ id: 'p1', title: 'First time', end: +t.toFixed(3), notes: out }],
  };
}
// Versions written only as notes (from note sheets) get an even pace: 0.7 s per note,
// 'key:2' = a long note (twice as long), and the last note of each line is held a little longer.
// They are marked paced: timing is not judged unless the player turns it on.
const BEAT = 0.7;
function pacedPass(v) {
  const notes = []; let t = 0;
  v.lines.forEach((line, li) => line.forEach((tok, k) => {
    const [key, mult] = tok.split(':');
    const prev = k > 0 ? line[k - 1].split(':')[0] : null;
    notes.push(prev === key ? [+t.toFixed(3), key, li + 1, 'r'] : [+t.toFixed(3), key, li + 1]);   // same note again = ×n
    t += BEAT * (+mult || 1) + (k === line.length - 1 ? BEAT : 0);
  }));
  return { id: 'p1', title: 'Whole part', end: +t.toFixed(3), notes };
}
for (const s of SONGS) {
  for (const v of s.versions) if (v.lines && !v.passes) v.passes = [pacedPass(v)];
  if (!s.versions.some((v) => v.id === 'simple')) {
    const simple = simplified(s.versions[0]); simple.paced = true;
    s.versions.splice(1, 0, simple);
  }
}

// Songs the owner asked for that still need a video to transcribe (shown in the song list).
export const WANTED = [
  { title: 'نساي', titleEn: 'Nassay', artist: 'Abadi Al Johar' },
  { title: 'سكة طويلة', titleEn: 'Sikka Tawila', artist: 'Abadi Al Johar' },
  { title: 'يوم كنتي', titleEn: 'Yom Kenti', artist: 'Khaled Abdulrahman' },
];

// Expand a pass into note objects the app uses. mainOnly drops extras ('g') and repeated picks ('r');
// each kept note then lasts until the next kept note.
const built = new WeakMap(), builtMain = new WeakMap();
export function buildPass(p0, mainOnly = false) {
  const cache = mainOnly ? builtMain : built;
  if (cache.has(p0)) return cache.get(p0);
  const p = mainOnly ? { ...p0, notes: p0.notes.filter((n) => !n[3]) } : p0;
  const list = p.notes.map(([t, key, line, flag], i) => {
    const next = i + 1 < p.notes.length ? p.notes[i + 1][0] : p.end;
    if (!NOTES[key]) throw new Error(`Unknown note key "${key}"`);
    const dur = +(next - t).toFixed(3);
    // quick: a real note, but so short that a phone mic may not catch it cleanly
    return { i, t, dur, key, line, grace: flag === 'g', rep: flag === 'r', quick: flag !== 'g' && dur < 0.16, ...NOTES[key] };
  });
  const out = { id: p.id, title: p.title, end: p.end, notes: list, mainOnly };
  cache.set(p0, out);
  return out;
}

export function linesOf(notes) {
  const out = [];
  for (const n of notes) (out[n.line - 1] ||= []).push(n);
  return out.filter(Boolean);
}

// Group a note with the repeated picks that follow it: فا فا فا فا -> one group of 4.
export function groupsOf(notes) {
  const g = [];
  for (const n of notes) {
    const last = g[g.length - 1];
    if (n.rep && last && last.key === n.key) { last.notes.push(n); last.count++; last.dur += n.dur; }
    else g.push({ ...n, notes: [n], count: 1 });
  }
  return g;
}
