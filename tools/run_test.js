// usage: node run_test.js <wav> <section: 1|2|3|4|all> <mode: free|wait> <seconds> [pass index]
const { chromium } = require('playwright');
const [wav, section, mode, secs, passIdx] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(); await ctx.grantPermissions(['microphone']);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/');
  if (passIdx === '1') await p.click('#passTabs button:nth-child(2)');
  await p.click('.tabs button[data-tab=practice]');
  await p.click(`#pMode button[data-mode=${mode}]`);
  await p.selectOption('#pSection', section);
  if (mode === 'along') await p.selectOption('#pSpeed', process.env.SPEED || '1');
  await p.click('#pStart');
  const t0 = Date.now();
  await p.waitForTimeout(+secs * 1000);
  const out = await p.evaluate(() => {
    const c = window.__coach, r = c.lastResult;
    return {
      heard: c.notes.map((n) => `${n.t.toFixed(2)}:${n.midi.toFixed(2)}${n.legato ? 'L' : ''}`),
      result: r ? { score: r.score, items: r.items.map((it) => `${it.ref.ar}${it.ref.grace ? '(g)' : ''}=${it.status}${it.cents != null ? '(' + it.cents + ')' : ''}${it.dt != null ? '@' + it.dt.toFixed(2) : ''}`), tips: r.tips.slice(0, 5).map((t) => t.text) } : null,
      liveMsg: document.querySelector('#liveMsg').textContent, target: document.querySelector('#tNote').textContent,
      stateTrack: [...document.querySelectorAll('#track .chip')].map((c) => c.className.replace('chip', '').trim()),
    };
  });
  console.log(JSON.stringify(out, null, 1));
  if (errs.length) console.log('ERRORS:', errs);
  await b.close();
})();
