// The song library. Add a song: put its file in js/songs/ and list it in SONGS.
import { NOTES } from './notes.js';
import hobEih from './songs/hob-eih.js';

export const SONGS = [hobEih];

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
for (const s of SONGS) if (!s.versions.some((v) => v.id === 'simple')) s.versions.splice(1, 0, simplified(s.versions[0]));

// Expand a pass into note objects the app uses.
const built = new WeakMap();
export function buildPass(p) {
  if (built.has(p)) return built.get(p);
  const list = p.notes.map(([t, key, line, flag], i) => {
    const next = i + 1 < p.notes.length ? p.notes[i + 1][0] : p.end;
    if (!NOTES[key]) throw new Error(`Unknown note key "${key}"`);
    const dur = +(next - t).toFixed(3);
    // quick: a real note, but so short that a phone mic may not catch it cleanly
    return { i, t, dur, key, line, grace: flag === 'g', rep: flag === 'r', quick: flag !== 'g' && dur < 0.16, ...NOTES[key] };
  });
  const out = { id: p.id, title: p.title, end: p.end, notes: list };
  built.set(p, out);
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
