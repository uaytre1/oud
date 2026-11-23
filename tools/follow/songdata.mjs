// Prints the app's song library as JSON for the score follower: every version and pass, each note with
// its pitch, Arabic name, string and finger (from js/notes.js). Reads the same files the app reads.
// usage: node tools/follow/songdata.mjs [song-id]
// OUD_ROOT=<dir> reads js/ from another checkout instead (e.g. `git archive <commit> js | tar -x -C <dir>`).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.OUD_ROOT ? path.resolve(process.env.OUD_ROOT) : path.resolve(import.meta.dirname, '..', '..');
const { SONGS } = await import(pathToFileURL(path.join(root, 'js', 'library.js')).href);
const { NOTES } = await import(pathToFileURL(path.join(root, 'js', 'notes.js')).href);

const want = process.argv[2];
const out = SONGS.filter((s) => !want || s.id === want).map((s) => ({
  id: s.id, title: s.title, titleEn: s.titleEn, maqam: s.maqam || '',
  versions: s.versions.map((v) => ({
    id: v.id, name: v.name, media: v.media || null, source: v.source || '', paced: !!v.paced,
    passes: (v.passes || []).map((p) => ({
      id: p.id, title: p.title, end: p.end,
      notes: p.notes.map(([t, key, line, flag]) => {
        const n = NOTES[key];
        if (!n) throw new Error(`Unknown note key "${key}" in ${s.id}/${v.id}/${p.id}`);
        return { t, key, line, flag: flag || '', midi: n.midi, ar: n.ar, name: n.name, string: n.string, finger: n.finger };
      }),
    })),
  })),
}));
process.stdout.write(JSON.stringify(out));
