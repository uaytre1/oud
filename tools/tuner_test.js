const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${process.argv[2]}%noloop`] });
  const ctx = await b.newContext(); await ctx.grantPermissions(['microphone']);
  const p = await ctx.newPage(); await p.goto('http://localhost:8765/');
  await p.click('.tabs button[data-tab=tuner]'); await p.click('#tuStart');
  for (let i = 0; i < 4; i++) {
    await p.waitForTimeout(1000);
    console.log(await p.evaluate(() => [document.querySelector('#tuString').textContent, document.querySelector('#tuNote').textContent, document.querySelector('#tuCents').textContent].join(' | ')));
  }
  await b.close();
})();
