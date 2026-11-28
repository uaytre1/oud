// Browser test of the Clean tone check (js/coach.js, 2026-11-28). Plays a WAV of single notes into the page as the mic
// and compares the verdicts with the expected ones.
// usage: PWMOD=<playwright module> node tools/lab/tone_test.cjs <port> <wav> <expected,comma,separated> <seconds> <outdir>
//   expected: clean | muted | buzzing | wobbly | noisy (noisy = a synthetic stand-in for a buzz: expects buzzing or wobbly)
const { chromium } = require(process.env.PWMOD);
const [port, wav, expected, secs, out] = process.argv.slice(2);
const results = []; const ok = (n, c, i = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ' · ' + i : ''}`);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}%noloop`] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.grantPermissions(['microphone']);
  await ctx.addInitScript(() => localStorage.setItem('oudcoach.introSeen', 'true'));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${port}/#/practice`); await p.waitForTimeout(400);
  ok('Practice has Clean tone check', await p.isVisible('#goTone'));
  await p.click('#goTone'); await p.waitForTimeout(400); await p.click('#toGo');
  await p.waitForTimeout(+secs * 1000);
  await p.screenshot({ path: `${out}/tone.png` });
  const hist = await p.evaluate(() => __coach.coach.tone.hist.slice().reverse().map((h) => h.verdict + ':' + h.ar));
  const want = expected.split(','); const got = hist.map((h) => h.split(':')[0]);
  ok('one verdict per note', got.length === want.length, hist.join(' '));
  want.forEach((w, i) => ok(`note ${i + 1}: ${w}`, w === 'noisy' ? ['buzzing', 'wobbly'].includes(got[i]) : got[i] === w, got[i] || 'none'));
  ok('no page errors', !errs.length, errs.join(' | ').slice(0, 200));
  await b.close(); console.log(results.join('\n')); console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
})();
