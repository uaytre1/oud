// Print Slowly's groups for a song version (main notes only), with picks needed.
const [repo, song, ver, a, b] = process.argv.slice(2);
const L = await import(repo + '/js/library.js');
const s = L.SONGS.find((x) => x.id === song); const v = s.versions.find((x) => x.id === ver);
const p = L.buildPass(v.passes[0], true);
const gs = L.groupsOf(p.notes.filter((n) => !n.grace));
const need = (g) => 1 + (g.notes || []).slice(1).filter((x, i) => x.t - g.notes[i].t >= 0.15).length;
gs.forEach((g, i) => { if (i >= +a && i <= +b) console.log(i, g.t.toFixed(2), g.key, 'count', g.count, 'need', need(g), g.notes.map((x) => x.t.toFixed(2)).join(' ')); });
console.log('groups', gs.length);
