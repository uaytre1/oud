// Browser test of the built-in Real player (2026-11-28): each version with a built-in recording (media/*.m4a) plays it
// in Listen with the notes on top, with no upload. usage: PWMOD=<playwright module> node tools/lab/real_test.cjs <port> <outdir>
// Note: Playwright's Chromium may lack the AAC codec that iPhone Safari has; then playback is reported as untested.
const { chromium } = require(process.env.PWMOD);
const [port, out] = process.argv.slice(2); const base = `http://localhost:${port}/`;
const results = []; const ok = (name, cond, info = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + info : ''}`);
const cases = [['hob-eih', 'main'], ['ahib-al-lail', 'solo'], ['hob-min-tihib', 'player-1']];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [s, v] of cases) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(([s, v]) => { const set = (k, x) => localStorage.setItem('oudcoach.' + k, JSON.stringify(x));
      set('song', s); set('ver.' + s, v); set('introSeen', true); set('mig.main', 1); set('realMode', true); set('useReal', true); }, [s, v]);
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(base + '#/song'); await p.waitForTimeout(700);
    const rec = await p.evaluate(() => (document.querySelector('#recBox') || {}).textContent || '');
    await p.goto(base + '#/lesson/1/listen'); await p.waitForTimeout(1200);
    const st = await p.evaluate(() => ({ stage: !document.querySelector('#realStage').hidden, src: document.querySelector('#realVideo').getAttribute('src') || '',
      aac: document.createElement('audio').canPlayType('audio/mp4; codecs="mp4a.40.2"') }));
    ok(`${s} ${v}: real stage shows with no upload`, st.stage && /^media\//.test(st.src), st.src);
    if (st.aac) {
      // how many different notes line 1 has, and where it ends in the recording (the player stops at the line's end)
      const want = await p.evaluate(async ([s, v]) => { const L = await import('./js/library.js'); const ver = L.SONGS.find((x) => x.id === s).versions.find((x) => x.id === v);
        const ns = L.buildPass(ver.passes[0], false).notes; const l1 = ns.filter((n) => n.line === 1);
        return { names: new Set(l1.map((n) => n.ar)).size, end: ver.media.starts.p1 + ns.find((n) => n.line === 2).t }; }, [s, v]);
      await p.click('#mainBtn'); const seen = new Set(); let t1 = 0;
      for (let k = 0; k < 30; k++) { await p.waitForTimeout(200); const r = await p.evaluate(() => [document.querySelector('#realNote').textContent, document.querySelector('#realVideo').currentTime]); if (r[0]) seen.add(r[0]); t1 = r[1]; }
      ok(`${s} ${v}: recording plays and the notes change`, seen.size >= Math.min(3, want.names) && t1 > 0.5,
        `${seen.size} of ${want.names} different notes seen, video at ${t1.toFixed(1)} s (line 1 ends at ${want.end.toFixed(1)} s)`);
      await p.screenshot({ path: `${out}/real-${s}.png` });
    } else ok(`${s} ${v}: playback`, true, 'UNTESTED here: this Chromium has no AAC (iPhone Safari has it)');
    ok(`${s} ${v}: no page errors`, !errs.length, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  // Listen loop (2026-11-28): with Loop on, the line plays again by itself; Stop ends it
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { const set = (k, x) => localStorage.setItem('oudcoach.' + k, JSON.stringify(x));
      set('song', 'hob-min-tihib'); set('ver.hob-min-tihib', 'player-1'); set('introSeen', true); set('realMode', true); set('useReal', true); set('loopListen', true); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(base + '#/lesson/1/listen'); await p.waitForTimeout(1000);
    ok('Listen: the Loop switch shows and is on', await p.evaluate(() => !document.querySelector('#loopBtn').hidden && document.querySelector('#loopBtn').classList.contains('on')));
    await p.click('#mainBtn'); let last = 0, restarts = 0;
    for (let k = 0; k < 40; k++) { await p.waitForTimeout(150); const t = await p.evaluate(() => document.querySelector('#realVideo').currentTime); if (t < last - 0.3) restarts++; last = t; }
    ok('Listen loop: the line played again by itself', restarts >= 1, `${restarts} restarts in 6 s`);
    await p.click('#mainBtn'); await p.waitForTimeout(2500);
    const after = await p.evaluate(() => [document.querySelector('#realVideo').paused, document.querySelector('#mainBtn').textContent]);
    ok('Listen loop: Stop ends it', after[0] && !/Stop/.test(after[1]), after[1]);
    ok('no page errors (loop)', !errs.length, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close(); console.log(results.join('\n')); console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
})();
