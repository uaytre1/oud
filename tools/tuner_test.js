// Plays a WAV into the tuner as the microphone and prints what the tuner shows over time.
// usage: node tools/tuner_test.js <wav> [seconds] [--lock N] [--s5 K] [--json out.json]
// WAV: 16-bit PCM, ~1 s of silence first. Prints one line whenever the shown string / rounded cents /
// in-tune state changes (time is seconds since the tuner started), then a short summary.
// --json writes the tuner's per-frame log (t, db, mode, n, cents, target, inTune, deg, raw candidates).
const { chromium } = require('playwright');
const fs = require('fs');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const wav = args[0], secs = +(args[1] && !args[1].startsWith('--') ? args[1] : 10);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 664 } }); await ctx.grantPermissions(['microphone']);
  await ctx.addInitScript((s5) => { localStorage.setItem('oudcoach.introSeen', 'true'); if (s5 != null) localStorage.setItem('oudcoach.s5', s5); }, opt('--s5'));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/#/tuner');
  await p.waitForFunction(() => window.__coach && window.__coach.tuner);
  if (opt('--lock')) await p.click(`#tuStrings button[data-n="${opt('--lock')}"]`);
  await p.click('#tuStart');
  await p.waitForTimeout(secs * 1000);
  const log = await p.evaluate(() => window.__coach.tuner.log);
  const shown = await p.evaluate(() => ['#tuString', '#tuNote', '#tuCents', '#tuHint'].map((s) => document.querySelector(s).textContent).join(' | '));
  await b.close();
  if (!log.length) { console.log('no frames', errs); process.exit(1); }
  const t0 = log[0].t;
  let last = '';
  for (const l of log) {
    const s = l.mode === 'wait' ? 'waiting' : l.mode === 'far' ? 'not an open string' :
      `${l.mode === 'hold' ? 'held ' : ''}string ${l.n} ${l.cents >= 0 ? '+' : ''}${Math.round(l.cents)}¢${l.inTune ? ' in tune' : ''}`;
    if (s !== last) { console.log((l.t - t0).toFixed(2).padStart(6), s.padEnd(30), `needle ${l.deg.toFixed(1)}°`); last = s; }
  }
  console.log(`frames ${log.length} (${(log.length / (log[log.length - 1].t - t0)).toFixed(0)}/s) · end: ${shown}`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(log));
  if (errs.length) { console.log('ERRORS', errs); process.exit(1); }
})();
