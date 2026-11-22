const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${process.argv[2]}%noloop`] });
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } }); await ctx.grantPermissions(['microphone']);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  // usage: node take_test.js <wav of the Simple version> <outdir>  (runs Hob Eih, Simple, line 1, Slowly)
  await ctx.addInitScript(() => { localStorage.setItem('oudcoach.song', '"hob-eih"'); localStorage.setItem('oudcoach.ver.hob-eih', '"simple"'); });
  await p.goto('http://localhost:8765/#/lesson/all/slow'); await p.waitForTimeout(400);
  await p.click('#mainBtn'); await p.waitForTimeout(22000);
  console.log('result:', await p.$eval('#result', (r) => r.innerText.replace(/\n+/g, ' | ')));
  const saved = await p.evaluate(async () => { const m = await import('./js/takes.js'); const l = await m.takes.list(); return l.map((t) => ({ part: t.partLabel, mode: t.mode, score: t.score, audioBytes: t.audio ? t.audio.size : 0, audioType: t.audio && t.audio.type, items: t.items.length, heard: t.heard.length })); });
  console.log('saved takes:', JSON.stringify(saved));
  // Send to Claude (headless has no share sheet -> files are downloaded)
  const dls = [];
  p.on('download', async (d) => { const f = `${process.argv[3]}/${d.suggestedFilename()}`; await d.saveAs(f); dls.push(f); });
  await p.click('#result .link:text("Send to Claude")'); await p.waitForTimeout(2500);
  console.log('downloaded:', dls.map((f) => `${f.split('/').pop()} (${fs.statSync(f).size} bytes)`));
  await p.goto('http://localhost:8765/#/'); await p.click('#goTakes'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${process.argv[3]}/s5_progress.png` });
  console.log('progress rows:', await p.$$eval('#history li', (ls) => ls.map((l) => l.innerText.replace(/\n/g, ' | '))));
  console.log('errors:', errs); await b.close();
})();
