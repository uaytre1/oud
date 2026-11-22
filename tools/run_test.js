// Plays a WAV into the app as the microphone and runs one lesson step, like the owner would.
// usage: node run_test.js <wav> <line: 1..N|all> <step: slow|time> <seconds>
// env: SONG, VERSION, PASS (which song/version/part), SPEED (time step: 0.6|0.8|1), MAIN (on|off: main notes only)
const { chromium } = require('playwright');
const [wav, line, step0, secs] = process.argv.slice(2);
const step = { wait: 'slow', along: 'time' }[step0] || step0;
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 664 } }); await ctx.grantPermissions(['microphone']);
  await ctx.addInitScript(({ s, v, p, m }) => {
    const set = (k, x) => localStorage.setItem('oudcoach.' + k, JSON.stringify(x));
    if (s) set('song', s);
    if (s && v) set('ver.' + s, v);
    if (s && p) set('pass.' + s, p);
    if (m) set('mainOnly2', m === 'on');
  }, { s: process.env.SONG, v: process.env.VERSION, p: process.env.PASS, m: process.env.MAIN });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:8765/#/lesson/${line}/${step}`);
  await p.waitForTimeout(400);
  if (step === 'time' && process.env.SPEED) {
    const label = { '0.6': 'Slow', '0.8': 'Medium', '1': 'Full speed' }[process.env.SPEED];
    await p.click(`#speedSeg button:text-is("${label}")`);
  }
  await p.click('#mainBtn');
  await p.waitForTimeout(+secs * 1000);
  const out = await p.evaluate(() => {
    const c = window.__coach, r = c.lastResult;
    return {
      heard: c.notes.map((n) => `${n.t.toFixed(2)}:${n.midi.toFixed(2)}${n.legato ? 'L' : ''}`),
      result: r ? { score: r.score, items: r.items.map((it) => `${it.ref.ar}${it.ref.grace ? '(g)' : ''}=${it.status}${it.cents != null ? '(' + it.cents + ')' : ''}${it.dt != null ? '@' + it.dt.toFixed(2) : ''}`), tips: r.tips.slice(0, 5).map((t) => t.text) } : null,
      shown: document.querySelector('#result').hidden ? null : document.querySelector('#result').innerText.replace(/\n+/g, ' | '),
      msg: document.querySelector('#msg').textContent,
      strip: [...document.querySelectorAll('#strip .chip')].map((c) => (c.classList.contains('ok') ? 'ok' : c.classList.contains('now') ? 'NOW' : '-')).join(' '),
      wait: c.practice.list ? `${c.practice.wi}/${c.practice.list.length} left ${c.practice.left} errors ${c.practice.errors}` : null,
      lane: c.lane.groups.map((g) => g.state || '-').join(' '),
      actions: [...document.querySelectorAll('#actions button')].map((x) => x.textContent),
    };
  });
  console.log(JSON.stringify(out, null, 1));
  if (errs.length) console.log('ERRORS:', errs);
  await b.close();
})();
