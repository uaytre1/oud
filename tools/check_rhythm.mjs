// Rhythm agreement check: does each version time a shared phrase the way the other recordings do?
// For every run of 5 melody notes (decorations left out) that 3 or more versions of a song play, the 4 gaps are
// compared as "how long is this gap next to the one before it" (so tempo doesn't matter), against the median of the
// versions. A gap more than LIMIT times longer or shorter than the others play it is printed: a pause or a rush the
// other players don't make. This is what the owner's ear caught in حب إيه (صول فا صول ‖ لا, 2026-11-25): on the old
// data this prints that phrase. Only the first (default) version of each song is reported unless --all is given;
// players do differ, so a line here is a place to listen, not proof of a mistake.
// usage: node tools/check_rhythm.mjs [song-id] [--all]
const L = await import(new URL('../js/library.js', import.meta.url));
const W = 5, LIMIT = 1.7, all = process.argv.includes('--all'), only = process.argv.slice(2).find((a) => !a.startsWith('--'));
// the version people hear first is named in js/app.js (BEST); read it from there
const { readFileSync } = await import('node:fs');
const bestSrc = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8').match(/const BEST = (\{[^}]*\})/);
const BEST = bestSrc ? Function(`return ${bestSrc[1]}`)() : {};
let flags = 0;
for (const song of L.SONGS) {
  if (song.exercise || (only && song.id !== only)) continue;
  const seen = new Map();                                   // phrase (5 keys) -> [{ver, t, shares}]
  for (const v of song.versions) {
    if (v.paced) continue;                                  // even-paced versions carry no measured rhythm
    for (const p of v.passes) {
      const n = p.notes.filter((x) => x[3] !== 'g');
      for (let i = 0; i + W <= n.length; i++) {
        const seg = n.slice(i, i + W), dur = seg[W - 1][0] - seg[0][0];
        if (dur <= 0 || dur > 4) continue;                  // a phrase across a long rest says nothing
        const key = seg.map((x) => x[1]).join(' ');
        const gaps = seg.slice(1).map((x, k) => x[0] - seg[k][0]);
        const shares = gaps.slice(1).map((g, k) => Math.log2(g / gaps[k]));      // each gap against the one before
        (seen.get(key) || seen.set(key, []).get(key)).push({ ver: `${v.id}/${p.id}`, t: seg[0][0], shares });
      }
    }
  }
  for (const [key, list] of seen) {
    const vers = new Set(list.map((x) => x.ver.split('/')[0]));
    if (vers.size < 3) continue;
    const med = [0, 1, 2].map((g) => { const s = list.map((x) => x.shares[g]).sort((a, b) => a - b); return s[s.length >> 1]; });
    for (const x of list) {
      if (!all && x.ver.split('/')[0] !== (BEST[song.id] || song.versions[0].id)) continue;
      const off = x.shares.map((s, g) => s - med[g]), worst = Math.max(...off.map(Math.abs));
      if (worst > Math.log2(LIMIT)) {
        flags++;
        const names = key.split(' ').map((k) => (L.SONGS && k)), fmt = (a) => a.map((s) => (2 ** s).toFixed(1)).join(' ');
        console.log(`${song.id} ${x.ver} at ${x.t}s  [${names.join(' ')}]  each gap ÷ the one before: ${fmt(x.shares)}  others: ${fmt(med)}  (${vers.size} versions)`);
      }
    }
  }
}
console.log(flags ? `${flags} phrase(s) disagree with the other recordings` : 'rhythm agrees across recordings');
