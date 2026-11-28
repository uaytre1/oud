// Browser test of "Write what I play" (js/coach.js, 2026-11-28): a WAV of known notes is played into the page as the mic;
// the notes written must match the song's notes; Save makes a "My phrases" version that opens as a Slowly lesson.
// usage: PWMOD=<playwright module> node tools/lab/write_test.cjs <port> <wav> <song> <version> <seconds> <outdir>
//   wav: the app's own render of that version's main notes (tools/render_versions.js with MAIN=on)
const { chromium } = require(process.env.PWMOD);
const [port, wav, songId, verId, secs, out] = process.argv.slice(2);
const base = `http://localhost:${port}/`;
const results = []; const ok = (n, c, i = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ' · ' + i : ''}`);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
  await ctx.addInitScript(() => { localStorage.setItem('oudcoach.introSeen', 'true'); localStorage.setItem('oudcoach.mig.main', '1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(base + '#/practice'); await p.waitForTimeout(500);
  ok('Practice has Write what I play', await p.isVisible('#goWrite'));
  await p.click('#goWrite'); await p.waitForTimeout(400);
  await p.click('#wrGo'); await p.waitForTimeout(+secs * 1000);
  await p.screenshot({ path: `${out}/w1-writing.png` });
  await p.click('#wrGo'); await p.waitForTimeout(300);
  // what was written against what the song has (main notes, repeats kept), compared in order
  const res = await p.evaluate(async ([songId, verId, secs]) => {
    const L = await import('./js/library.js'); const v = L.SONGS.find((s) => s.id === songId).versions.find((x) => x.id === verId);
    const want = L.buildPass(v.passes[0], true).notes.filter((n) => n.t < secs - 1.5).map((n) => n.key);
    const got = __coach.coach.write.phrase().map((n) => n[1]);
    // longest common subsequence: how many of the song's notes were written, in order
    const D = Array.from({ length: want.length + 1 }, () => new Array(got.length + 1).fill(0));
    for (let i = 1; i <= want.length; i++) for (let j = 1; j <= got.length; j++) D[i][j] = want[i - 1] === got[j - 1] ? D[i - 1][j - 1] + 1 : Math.max(D[i - 1][j], D[i][j - 1]);
    return { want: want.length, got: got.length, match: D[want.length][got.length], chips: document.querySelectorAll('#wrRow .wr-chip').length };
  }, [songId, verId, +secs]);
  ok('notes written match the song, in order', res.match >= 0.9 * res.want && res.got <= res.want + 3, `${res.match} of ${res.want} song notes found; ${res.got} written; ${res.chips} chips`);
  await p.click('#wrCopy'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok('Copy gives the notes as text', clip.split('\n').length >= 1 && clip.length > 5, clip.slice(0, 60).replace(/\n/g, ' / '));
  await p.click('#wrSave'); await p.waitForTimeout(300);
  ok('Save lists the phrase', (await p.$$eval('#wrSaved .wr-saved', (x) => x.length)) === 1);
  await p.screenshot({ path: `${out}/w2-saved.png` });
  await p.click('#wrSaved .wr-saved .btn.second'); await p.waitForTimeout(800);
  const les = await p.evaluate(() => ({ hash: location.hash, chips: document.querySelectorAll('#strip .chip').length }));
  ok('Practise opens the phrase as a Slowly lesson', /lesson\/all\/slow/.test(les.hash) && les.chips > 0, `${les.hash} · ${les.chips} chips`);
  await p.goto(base + '#/write'); await p.waitForTimeout(300); await p.reload(); await p.waitForTimeout(600);
  ok('Saved phrases survive a reload', (await p.$$eval('#wrSaved .wr-saved', (x) => x.length)) === 1);
  ok('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
  await b.close(); console.log(results.join('\n')); console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
})();
