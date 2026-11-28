// The tuner offers the right low tuning (2026-11-28). Plays a WAV whose first pluck is a low string 6 (low دو, as on the
// owner's oud) into the tuner with the app's default tuning (فا · صول), taps the offered fix, and checks that the later
// plucks of string 6 and string 5 read as those strings.
// usage: PWMOD=<playwright module> node tools/lab/tuner_fix_test.cjs <port> <wav> <outdir>
//   wav: ~1 s silence, then s6 open, s6 open, s5 open, s5 open (2.7 s each + 0.3 s gaps), e.g. from his record-oud zip.
const { chromium } = require(process.env.PWMOD); const [port, wav, out] = process.argv.slice(2);
const results = []; const ok = (n, c, i = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ' · ' + i : ''}`);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}%noloop`] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.grantPermissions(['microphone']);
  await ctx.addInitScript(() => { localStorage.setItem('oudcoach.introSeen', 'true'); localStorage.setItem('oudcoach.s5', '0'); localStorage.setItem('oudcoach.s6', '0'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${port}/#/tuner`); await p.waitForTimeout(800); await p.click('#tuStart');
  let seen = false, hint = '';
  for (let k = 0; k < 40 && !seen; k++) { await p.waitForTimeout(100); seen = await p.isVisible('.tu-fix'); hint = await p.evaluate(() => document.querySelector('#tuHint').textContent); }
  ok('default tuning, low string 6 plucked: the fix is offered', seen, hint);
  await p.screenshot({ path: `${out}/tuner-fix.png` });
  if (seen) await p.click('.tu-fix');
  const reads = [];
  for (let k = 0; k < 110; k++) { await p.waitForTimeout(100); const r = await p.evaluate(() => document.querySelector('#tuString').textContent); if (r && reads[reads.length - 1] !== r) reads.push(r); }
  ok('after the fix: string 6 and string 5 both read', reads.includes('String 6') && reads.includes('String 5'), reads.join(' → '));
  ok('settings saved (s5 فا, s6 low دو)', await p.evaluate(() => localStorage.getItem('oudcoach.s5') === '1' && localStorage.getItem('oudcoach.s6') === '3'));
  ok('no page errors', !errs.length, errs.join(' | ').slice(0, 200));
  await b.close(); console.log(results.join('\n'));
})();
