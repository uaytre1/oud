// usage: node tools/plain/notes.mjs <song-id> | python3 tools/plain/render.py <song-id> <outdir> [version ...]
// prints the built notes (t, midi, dur) of every version of a song as JSON
const [song] = process.argv.slice(2);
const L = await import(new URL('../../js/library.js', import.meta.url));
const s = L.SONGS.find((x) => x.id === song);
const out = {};
for (const v of s.versions) { const p = L.buildPass(v.passes[0]); out[v.id] = { pass: v.passes[0].id, notes: p.notes.map((n) => [n.t, n.midi, n.dur]) }; }
console.log(JSON.stringify(out));
