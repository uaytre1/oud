// Browser test of the design D features (2026-11-27): Check my take + Replay, Practise these notes, Loop, maqam card.
// usage: PWMOD=<playwright module> node tools/lab/feature_test.cjs <port> <right.wav> <wrong.wav> <outdir>
//   right.wav = the app's own render of hob-eih Main (main notes) -> a clean Slowly take with a review
//   wrong.wav = a render of another song -> a take with wrong notes -> "Practise these notes"
const { chromium } = require(process.env.PWMOD);
const [port, right, wrong, out] = process.argv.slice(2);
const base = `http://localhost:${port}/`;
const results = []; const ok = (name, cond, info = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + info : ''}`); };
async function page(b, wav, seed) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.grantPermissions(['microphone']);
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem('oudcoach.' + k, JSON.stringify(v)); }, seed);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  return { ctx, p, errs };
}
(async () => {
  const launch = (wav) => chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
  const seed = { song: 'hob-eih', 'ver.hob-eih': 'main', mainOnly2: true, 'mig.main': 1, introSeen: true, repeat: false };
  // 1. clean take -> review line + Replay
  let b = await launch(right); let { ctx, p, errs } = await page(b, right, seed);
  await p.goto(base + '#/lesson/1/slow'); await p.waitForTimeout(500);
  ok('loop switch shows in Slowly', await p.isVisible('#loopBtn'));
  await p.click('#mainBtn');
  for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !document.querySelector('#result').hidden)) break; await p.waitForTimeout(500); }
  await p.waitForTimeout(600);
  const check = await p.evaluate(() => (document.querySelector('.r-check') || {}).textContent || '');
  ok('result shows the check line', /in tune/.test(check), check);
  ok('Replay button', await p.isVisible('text=Replay my take'));
  await p.screenshot({ path: `${out}/f1-result.png` });
  await p.click('text=Replay my take'); await p.waitForTimeout(500);
  ok('replay sheet opens', await p.isVisible('#replaySheet'));
  const chips = await p.$$eval('#rpRow .rp-chip', (c) => c.length);
  ok('replay has one chip per note heard', chips > 0, `${chips} chips`);
  ok('replay shows a note and a tip', await p.evaluate(() => !!document.querySelector('#rpNote').textContent && !!document.querySelector('#rpTip').textContent));
  await p.screenshot({ path: `${out}/f2-replay.png` });
  await p.click('#rpNext'); await p.waitForTimeout(200);
  ok('next note works', await p.evaluate(() => document.querySelectorAll('#rpRow .rp-chip.now').length === 1));
  await p.click('#rpPlay'); await p.waitForTimeout(1500);
  ok('play my take starts', await p.evaluate(() => /Pause/.test(document.querySelector('#rpPlay').textContent)));
  await p.screenshot({ path: `${out}/f3-replay-playing.png` });
  ok('no page errors (clean take)', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close(); await b.close();
  // 2. wrong take -> Practise these notes
  b = await launch(wrong); ({ ctx, p, errs } = await page(b, wrong, seed));
  await p.goto(base + '#/lesson/1/slow'); await p.waitForTimeout(500); await p.click('#mainBtn');
  for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !document.querySelector('#result').hidden)) break; await p.waitForTimeout(500); }
  await p.waitForTimeout(600);
  const check2 = await p.evaluate(() => (document.querySelector('.r-check') || {}).textContent || '');
  ok('slightly sharp notes show as "a bit off"', /a bit off/.test(check2), check2);
  const practise = await p.$('text=/Practise these \\d+ notes/');
  ok('Practise these notes button', !!practise);
  await p.screenshot({ path: `${out}/f4-off-take.png` });
  if (practise) {
    await practise.click(); await p.waitForTimeout(800);
    const chips = await p.$$eval('#strip .chip', (c) => c.length);
    ok('practise session shows only those notes', chips > 0 && chips <= 6, `${chips} notes`);
    await p.screenshot({ path: `${out}/f4b-practise.png` });
  }
  ok('no page errors (off take)', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close(); await b.close();
  // 3. maqam card: a song and one of the 8 maqamat; loop is on by default for the maqamat
  b = await chromium.launch();
  ({ ctx, p, errs } = await page(b, null, seed));
  await p.goto(base + '#/song'); await p.waitForTimeout(600);
  const card = await p.evaluate(() => { const c = document.querySelector('#maqamCard'); return c && !c.hidden ? c.textContent : ''; });
  ok('maqam card on حب إيه', /home note/.test(card), card.slice(0, 80));
  await p.screenshot({ path: `${out}/f5-song-card.png` });
  await ctx.close();
  ({ ctx, p, errs } = await page(b, null, { ...seed, song: 'maqamat', 'ver.maqamat': 'bayati' }));
  await p.goto(base + '#/song'); await p.waitForTimeout(600);
  const card2 = await p.evaluate(() => { const c = document.querySelector('#maqamCard'); return c && !c.hidden ? c.textContent : ''; });
  ok('maqam card on Bayati', /home note/.test(card2), card2.slice(0, 80));
  await p.screenshot({ path: `${out}/f6-maqam-card.png` });
  await p.goto(base + '#/lesson/1/slow'); await p.waitForTimeout(600);
  ok('loop is on by default for the 8 maqamat', await p.evaluate(() => document.querySelector('#loopBtn').classList.contains('on')));
  ok('By ear switch shows in Slowly', await p.isVisible('#earBtn'));
  await p.click('#earBtn'); await p.waitForTimeout(200);
  ok('By ear switch turns the mode on', await p.evaluate(() => document.querySelector('#lesson').classList.contains('byear')));
  await p.screenshot({ path: `${out}/f7-maqam-lesson.png` });
  ok('no page errors (cards)', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close(); await b.close();
  // 4. In time (owner, 2026-11-28: "the bar isn't moving when the song starts"): the note lane must move after
  // Start, and again after Loop restarts the line. 100% speed so one round fits in the wait.
  b = await launch(right); ({ ctx, p, errs } = await page(b, right, { ...seed, repeat: true }));
  await p.goto(base + '#/lesson/1/time'); await p.waitForTimeout(500);
  await p.click('#speedSeg button:has-text("100%")');
  const x0 = () => p.evaluate(() => parseFloat((document.querySelector('#lane .lchip').style.transform.match(/-?[\d.]+/) || [0])[0]));
  await p.click('#mainBtn'); await p.waitForTimeout(500); const a0 = await x0();
  await p.waitForTimeout(2000); const a2 = await x0();
  ok('In time: playhead moved after 2 s', a2 - a0 > 100, `${a0.toFixed(0)} -> ${a2.toFixed(0)} px`);
  await p.screenshot({ path: `${out}/f8-in-time-2s.png` });
  for (let k = 0; k < 40; k++) { if (await p.evaluate(() => !document.querySelector('#result').hidden)) break; await p.waitForTimeout(500); }
  for (let k = 0; k < 20; k++) { if (await p.evaluate(() => document.querySelector('#lesson').classList.contains('practising'))) break; await p.waitForTimeout(500); }
  await p.waitForTimeout(500); const b0 = await x0(); await p.waitForTimeout(2000); const b2 = await x0();
  ok('In time: playhead moves again after Loop restarts', b2 - b0 > 100, `${b0.toFixed(0)} -> ${b2.toFixed(0)} px`);
  ok('no page errors (In time)', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close(); await b.close();
  console.log(results.join('\n'));
})();
