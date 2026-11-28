// Browser test of Say notes / eyes-free (2026-11-28). The phone's speech is stubbed (headless Chromium has no voices):
// each spoken text is recorded and "ends" after 0.5 s. A WAV of line 1 with a 1.7 s pause between notes (a player who
// waits to hear each name) is the mic. Checks: the names are said in the line's order, and every note is still found.
// usage: PWMOD=<playwright module> node tools/lab/say_test.cjs <port> <wav> <seconds> <outdir>
const { chromium } = require(process.env.PWMOD);
const [port, wav, secs, out] = process.argv.slice(2);
const results = []; const ok = (n, c, i = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ' · ' + i : ''}`);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.grantPermissions(['microphone']);
  await ctx.addInitScript(() => {
    const s = (k, v) => localStorage.setItem('oudcoach.' + k, JSON.stringify(v));
    s('song', 'hob-eih'); s('ver.hob-eih', 'main'); s('mainOnly2', true); s('mig.main', 1); s('introSeen', true); s('repeat', false); s('realMode', false); s('sayNotes', true); s('byear', false);
    window.__said = [];
    window.speechSynthesis.speak = (u) => { if (u.text.trim()) window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 500); };
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${port}/#/lesson/1/slow`); await p.waitForTimeout(600);
  ok('Say notes switch shows in Slowly and is on', await p.evaluate(() => !document.querySelector('#sayBtn').hidden && document.querySelector('#sayBtn').classList.contains('on')));
  await p.click('#mainBtn');
  for (let k = 0; k < +secs * 4; k++) { if (await p.evaluate(() => !document.querySelector('#result').hidden)) break; await p.waitForTimeout(250); }
  const r = await p.evaluate(async () => {
    const L = await import('./js/library.js'); const v = L.SONGS.find((s) => s.id === 'hob-eih').versions.find((x) => x.id === 'main');
    const want = L.groupsOf(L.buildPass(v.passes[0], true).notes.filter((n) => n.line === 1 && !n.grace)).map((g) => g.ar);
    return { want, said: window.__said, done: !document.querySelector('#result').hidden, head: (document.querySelector('#result') || {}).textContent || '' };
  });
  ok('names said in the line\'s order', JSON.stringify(r.said.slice(0, r.want.length)) === JSON.stringify(r.want), `said ${r.said.join(' ')} · want ${r.want.join(' ')}`);
  ok('the line was finished with Say notes on', r.done, r.head.replace(/\s+/g, ' ').slice(0, 80));
  await p.screenshot({ path: `${out}/say.png` });
  ok('no page errors', !errs.length, errs.join(' | ').slice(0, 200));
  await b.close(); console.log(results.join('\n')); console.log(`${results.filter((x) => x.startsWith('PASS')).length}/${results.length} PASS`);
})();
