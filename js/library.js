// The song library. Add a song: put its file in js/songs/ and list it in SONGS.
import { NOTES } from './notes.js';
import hobEih from './songs/hob-eih.js';
import ahibAlLail from './songs/ahib-al-lail.js';
import hobMinTihib from './songs/hob-min-tihib.js';
import warmups from './songs/warmups.js';
import maqamat from './songs/maqamat.js';
import drills from './songs/drills.js';
import firstTunes from './songs/first-tunes.js';

export const SONGS = [hobEih, ahibAlLail, hobMinTihib, maqamat, drills, firstTunes, warmups];   // exercises: maqamat on home (home: true), warm-ups via Daily

// A simplified version for learning: the measured notes of one pass with the quick notes and
// repeated picks left out, at an even pace (last note of each line held twice as long).
function simplified(fromVersion) {
  const p = fromVersion.passes[0];
  const kept = p.notes.filter((n) => n[3] !== 'g');   // repeats are melody too
  const out = []; let t = 0;
  kept.forEach((n, k) => {
    out.push([+t.toFixed(3), n[1], n[2]]);
    const lastOfLine = k + 1 === kept.length || kept[k + 1][2] !== n[2];
    t += lastOfLine ? 1.4 : 0.7;
  });
  return {
    id: 'simple', name: 'Simple', about: `${fromVersion.name}'s notes without the extras, at an even pace.`,
    source: `Simplified from ${fromVersion.name}'s measured notes.`,
    passes: [{ id: 'p1', title: 'First time', end: +t.toFixed(3), notes: out }],
  };
}
// Versions written only as notes (from note sheets) get an even pace: 0.7 s per note,
// 'key:2' = a long note (twice as long), and the last note of each line is held a little longer.
// They are marked paced: timing is not judged unless the player turns it on.
const BEAT = 0.7;
function pacedPass(v, id = 'p1') {
  const notes = []; let t = 0;
  // 'key:beats' (default 1 beat = 0.7 s; 0.5 = half a beat); '-:beats' is a rest (silence, no note).
  // v.beat sets the beat length in seconds for that version (tunes written with real rhythm).
  const beat = v.beat || BEAT;
  v.lines.forEach((line, li) => line.forEach((tok, k) => {
    const [key, mult] = tok.split(':');
    const prev = k > 0 ? line[k - 1].split(':')[0] : null;
    if (key !== '-') notes.push(prev === key ? [+t.toFixed(3), key, li + 1, 'r'] : [+t.toFixed(3), key, li + 1]);   // same note again = ×n
    t += beat * (mult === undefined ? 1 : +mult) + (k === line.length - 1 ? beat : 0);
  }));
  return { id, title: 'Whole part', end: +t.toFixed(3), notes };
}
// حب إيه "Main": Player 4's notes and feel with the 1.5 s hole after صول فا صول لا closed (owner, 2026-11-25: "there
// is a kind of pause… match it with the timing of the other videos"). The teacher and Player 2 go straight from
// that لا into the next phrase (لا→لا 0.28 s and 0.35 s); Player 4 played a fill there that the teacher's notes
// don't have, so removing it had left a silence. The second لا of the pair is the next phrase's first note.
// Player 4 itself stays as measured, in step with its video; this version has no video.
{
  const p4 = hobEih.versions.find((v) => v.id === 'player-4'), p = p4 && p4.passes[0];
  if (p && !hobEih.versions.some((v) => v.id === 'main')) {
    // Player 4's own playing (measured, before the caption edit) has a ري between that لا and the next phrase:
    // صول فا صول لا · ري · لا سي سي لا… The ري with a short hold is the "slight pause" (owner, 2026-11-25: "a very
    // slight pause… and a note missing in between"). Next phrase starts 0.45 s after the ري, not 1.5 s.
    const LA2 = 5.36, NEXT = 6.88, RE = 5.33, shift = NEXT - (RE + 0.45);
    const notes = p.notes.filter((n) => n[0] !== LA2)
      .map((n) => (n[0] >= NEXT ? [+(n[0] - shift).toFixed(2), ...n.slice(1)] : n));
    notes.splice(notes.findIndex((n) => n[0] > RE), 0, [RE, 're', 2]);
    hobEih.versions.unshift({ id: 'main', name: 'Main',
      about: "Player 4's feel with the teacher's notes: صول فا صول لا, then Player 4's ري and a short breath before the next phrase.",
      source: 'Player 4 measured pick by pick; صول فا صول لا from the teacher; the ري after it from Player 4 (measured 2026-11-22).',
      passes: [{ id: p.id, title: p.title, end: +(p.end - shift).toFixed(2), notes }] });
  }
}
for (const s of SONGS) {
  // exercises: each version is its own exercise, so its pass id is the version id (progress is kept per pass)
  for (const v of s.versions) if (v.lines && !v.passes) v.passes = [pacedPass(v, s.exercise ? v.id : 'p1')];
  if (!s.exercise && !s.versions.some((v) => v.id === 'simple')) {
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

// Expand a pass into note objects the app uses. mainOnly drops decorations ('g') only;
// each kept note then lasts until the next kept note.
let built = new WeakMap(), builtMain = new WeakMap();
// when the oud's strings change (Settings), notes are placed again: forget built passes
export function clearBuilt() { built = new WeakMap(); builtMain = new WeakMap(); }
export function buildPass(p0, mainOnly = false) {
  const cache = mainOnly ? builtMain : built;
  if (cache.has(p0)) return cache.get(p0);
  // "Main notes only" hides decorations ('g') but keeps repeated picks ('r'): repeats are the rhythm of the
  // song (فا ×4), and removing them made every song sound wrong and off-time (owner, 2026-11-22).
  const p = mainOnly ? { ...p0, notes: p0.notes.filter((n) => n[3] !== 'g') } : p0;
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
