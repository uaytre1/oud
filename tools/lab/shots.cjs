// Lab: phone-size screenshots of every screen, light and dark, including practising and the result (fake mic).
// usage: PWMOD=<playwright module> node tools/lab/shots.cjs <port> <wav for the fake mic> <outdir>
const { chromium } = require(process.env.PWMOD); const fs = require('fs');
const [port, wav, out] = process.argv.slice(2);
const base = `http://localhost:${port}/`;
const screens = [['home', '#/'], ['path', '#/path'], ['song', '#/song'], ['lesson-listen', '#/lesson/1/listen'],
  ['lesson-slow', '#/lesson/1/slow'], ['tuner', '#/tuner'], ['risha', '#/pace'], ['daily', '#/daily'],
  ['settings', '#/settings'], ['record-oud', '#/record-oud']];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
  for (const scheme of ['light', 'dark']) {
    const seed = async (ctx, intro) => ctx.addInitScript(({ intro }) => {
      const set = (k, x) => localStorage.setItem('oudcoach.' + k, JSON.stringify(x));
      set('song', 'hob-eih'); set('ver.hob-eih', 'main'); set('mainOnly2', true); set('mig.main', 1);
      if (!intro) set('introSeen', true);
    }, { intro });
    // first open (welcome sheet)
    let ctx = await b.newContext({ viewport: { width: 390, height: 664 }, colorScheme: scheme, deviceScaleFactor: 2 });
    await seed(ctx, true); let p = await ctx.newPage(); await p.goto(base); await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${scheme}-00-first-open.png` }); await ctx.close();
    ctx = await b.newContext({ viewport: { width: 390, height: 664 }, colorScheme: scheme, deviceScaleFactor: 2 });
    await ctx.grantPermissions(['microphone']); await seed(ctx, false); p = await ctx.newPage();
    for (const [i, [name, hash]] of screens.entries()) {
      await p.goto(base + hash); await p.waitForTimeout(600);
      await p.screenshot({ path: `${out}/${scheme}-${String(i + 1).padStart(2, '0')}-${name}.png` });
    }
    // practising and result: Slowly on line 1 with the fake mic
    await p.goto(base + '#/lesson/1/slow'); await p.waitForTimeout(500); await p.click('#mainBtn');
    await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${scheme}-20-practising.png` });
    for (let k = 0; k < 40; k++) { if (await p.evaluate(() => !document.querySelector('#result').hidden)) break; await p.waitForTimeout(500); }
    await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${scheme}-21-result.png` });
    await ctx.close();
  }
  await b.close(); console.log('shots done');
})();
