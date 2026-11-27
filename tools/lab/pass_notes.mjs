// Lab: turn a data file's notes into what the app plays ([{t, midi, dur}]) using the app's own buildPass.
// usage: node tools/lab/pass_notes.mjs <repo file:// url> <data.json> <end seconds> > notes.json
const [repo, data, end] = process.argv.slice(2);
const L = await import(repo + '/js/library.js');
const fs = await import('fs');
const d = JSON.parse(fs.readFileSync(data, 'utf8'));
const p = L.buildPass({ id: 'lab', title: 'lab', end: +end, notes: d.notes }, false);
console.log(JSON.stringify(p.notes.map((n) => ({ t: n.t, midi: n.midi, dur: n.dur }))));
