const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${process.argv[2]}%noloop`] });
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } }); await ctx.grantPermissions(['microphone']);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8765/');
  await p.click('.tabs button[data-tab=practice]'); await p.click('#pMode button[data-mode=free]'); await p.selectOption('#pSection', '1');
  await p.click('#pStart'); await p.waitForTimeout(15000);
  console.log('result buttons:', await p.$$eval('#resActions button', (bs) => bs.map((x) => x.textContent)));
  const saved = await p.evaluate(async () => { const m = await import('./js/takes.js'); const l = await m.takes.list(); return l.map((t) => ({ part: t.partLabel, mode: t.mode, score: t.score, audioBytes: t.audio ? t.audio.size : 0, audioType: t.audio && t.audio.type, items: t.items.length, heard: t.heard.length })); });
  console.log('saved takes:', JSON.stringify(saved));
  // Send to Claude (headless has no share sheet -> files are downloaded)
  const dls = [];
  p.on('download', async (d) => { const f = `${process.argv[3]}/${d.suggestedFilename()}`; await d.saveAs(f); dls.push(f); });
  await p.click('#resActions button.primary'); await p.waitForTimeout(2500);
  console.log('downloaded:', dls.map((f) => `${f.split('/').pop()} (${fs.statSync(f).size} bytes)`));
  await p.click('.tabs button[data-tab=progress]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${process.argv[3]}/s5_progress.png` });
  console.log('progress rows:', await p.$$eval('#history li', (ls) => ls.map((l) => l.innerText.replace(/\n/g, ' | '))));
  console.log('errors:', errs); await b.close();
})();
