// Browser test of the coaching tools (js/coach.js, 2026-11-27): Call and response, Tremolo meter, Taqsim playground,
// Your hard notes, Drone. It renders its own fake-mic WAVs with the app's oud sound (into outdir), then plays each one
// into a fresh browser as the microphone and reads what the screen says.
// usage: PWMOD=<playwright module> node tools/lab/coach_test.cjs <port> <outdir> [drone-db]
//   drone-db (default -20): how loud the drone is mixed into the taqsim take, against the oud's peak, as if the phone's
//   speaker played it into its own mic. Pass "off" to leave it out.
const { chromium } = require(process.env.PWMOD); const fs = require('fs');
const [port, out, droneArg = '-20'] = process.argv.slice(2);
const ONLY = process.env.ONLY || 'echo,trem,taqsim,hard';   // which parts to run (render always runs)
const run = (k) => ONLY.split(',').includes(k);
const base = `http://localhost:${port}/`;
fs.mkdirSync(out, { recursive: true });
const results = []; const ok = (name, cond, info = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + info : ''}`); };
const seed = { song: 'hob-eih', 'ver.hob-eih': 'main', mainOnly2: true, 'mig.main': 1, introSeen: true, repeat: false };
function wav16(data, sr, lead = 0) {   // 16-bit PCM, peak 0.8, lead seconds of silence first
  const pad = Math.round(lead * sr), n = pad + data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  let peak = 0; for (const x of data) peak = Math.max(peak, Math.abs(x));
  for (let i = 0; i < data.length; i++) buf.writeInt16LE(Math.round((data[i] / (peak || 1)) * 0.8 * 32767), 44 + (pad + i) * 2);
  return buf;
}
async function newPage(b, s = seed, patch = false) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.grantPermissions(['microphone']);
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem('oudcoach.' + k, JSON.stringify(v)); }, s);
  if (patch) await ctx.addInitScript(() => {   // count the drone's oscillators
    window.__osc = { made: 0, stopped: 0 };
    const mk = AudioContext.prototype.createOscillator, st = OscillatorNode.prototype.stop;
    AudioContext.prototype.createOscillator = function () { window.__osc.made++; return mk.call(this); };
    OscillatorNode.prototype.stop = function (...a) { window.__osc.stopped++; return st.apply(this, a); };
  });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  return { ctx, p, errs };
}
const micBrowser = (w) => chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  `--use-file-for-fake-audio-capture=${w}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
// read #sel's text (and bead classes) every 100 ms for ms; returns the distinct messages in order
async function watch(p, ms, sel = '#ecMsg') {
  const seen = []; const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const m = await p.evaluate((sel) => document.querySelector(sel).textContent, sel);
    if (m && seen[seen.length - 1] !== m) seen.push(m);
    await p.waitForTimeout(100);
  }
  return seen;
}

(async () => {
  // ---- 0. what to play: the first phrase of حب إيه Main, the Bayati scale; render the takes with the app's sound
  let b = await chromium.launch(); let { ctx, p, errs } = await newPage(b);
  await p.goto(base + '#/echo'); await p.waitForTimeout(800);
  const info = await p.evaluate(() => {
    const c = __coach.coach;
    return { phrases: c.echo.phrases.map((P) => P.map((n) => ({ t: n.t, midi: n.midi, dur: n.dur, ar: n.ar, key: n.key }))),
      scale: c.taqsim.scale().map((n) => ({ midi: n.midi, ar: n.ar })), tonic: c.taqsim.tonic(),
      count: document.querySelector('#ecCount').textContent };
  });
  ok('Call and response builds phrases', info.phrases.length > 3 && info.phrases.every((P) => P.length >= 2 && P.length <= 5),
    `${info.phrases.length} phrases, sizes ${info.phrases.map((P) => P.length).join(',')}`);
  await p.screenshot({ path: `${out}/c0-echo.png` });
  // render notes with the app's oud; lead/tail = seconds of silence before/after. drone {m, db}: the drone as js/coach.js
  // makes it (same oscillators, filter and 1.2 s fade-in), from the start of the file to its end, db under the oud's peak
  const render = async (notes, drone, lead = 0, tail = 0) => p.evaluate(async ([notes, drone, lead, tail]) => {
    const A = await import('./js/audio.js'); const buf = await A.renderOffline(notes, 1), sr = buf.sampleRate;
    const oud = buf.getChannelData(0), pad = Math.round(lead * sr), data = new Float32Array(pad + oud.length + Math.round(tail * sr));
    data.set(oud, pad);
    if (drone) {
      const oc = new OfflineAudioContext(1, data.length, sr), f = 440 * 2 ** ((drone.m - 69) / 12);
      const out = oc.createGain(); out.gain.setValueAtTime(0, 0); out.gain.linearRampToValueAtTime(1, 1.2); out.connect(oc.destination);
      const lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4; lp.connect(out);
      for (const [type, fr, g] of [['sawtooth', f, 0.8], ['sine', f / 2, 0.9]]) {
        const o = oc.createOscillator(); o.type = type; o.frequency.value = fr; const gg = oc.createGain(); gg.gain.value = g; o.connect(gg).connect(lp); o.start(0);
      }
      const d = (await oc.startRendering()).getChannelData(0);
      let po = 0, pd = 0; for (let i = 0; i < data.length; i++) { po = Math.max(po, Math.abs(data[i])); pd = Math.max(pd, Math.abs(d[i])); }
      const k = (po / pd) * 10 ** (drone.db / 20); for (let i = 0; i < data.length; i++) data[i] += d[i] * k;
    }
    return { sr, data: Array.from(data) };
  }, [notes, drone, lead, tail]);
  const P = info.phrases[0], callDur = P[P.length - 1].t - P[0].t + Math.min(1.1, P[P.length - 1].dur || 0.6), lead = callDur + 1.6;
  const answer = (shift) => P.map((n, i) => ({ t: i * 0.65, midi: n.midi + (shift[i] || 0), dur: 0.55 }));
  // the near miss: the second note a half step off, in the direction that does not land on a neighbour
  const s1 = [P[0], P[2]].filter(Boolean).some((q) => Math.abs(P[1].midi + 1 - q.midi) < 1.2) ? -1 : 1;
  const takes = { right: answer([]), close: answer([0, s1]), shape: answer(P.map(() => 5)) };
  for (const [k, notes] of Object.entries(takes)) { const r = await render(notes); fs.writeFileSync(`${out}/echo_${k}.wav`, wav16(r.data, r.sr, lead)); }
  const tremo = (gaps, secs) => { const ns = []; let t = 0, i = 0; while (t < secs) { ns.push({ t, midi: 57, dur: 0.2 }); t += gaps[i++ % gaps.length]; } return ns; };
  for (const [k, ns] of Object.entries({ even6: tremo([1 / 6], 5), even9: tremo([1 / 9], 5), uneven: tremo([0.09, 0.24], 5) })) {
    const r = await render(ns); fs.writeFileSync(`${out}/trem_${k}.wav`, wav16(r.data, r.sr, 1.0));
  }
  const sc = info.scale, cand = []; for (let m = sc[0].midi; m < sc[0].midi + 12; m += 0.5) cand.push(m);
  const pcd = (a, c) => { const x = (((a - c) % 12) + 12) % 12; return Math.min(x, 12 - x); };
  const outside = cand.sort((a, c) => Math.min(...sc.map((s) => pcd(c, s.midi))) - Math.min(...sc.map((s) => pcd(a, s.midi))))[0];
  const tq = [sc[0], sc[1], sc[2], sc[3], { midi: outside }, sc[2], sc[1], sc[0]].map((n, i) => ({ t: i * 0.6, midi: n.midi, dur: i === 7 ? 1.2 : 0.5 }));
  const droneM = 43 + ((((info.tonic - 43) % 12) + 12) % 12);
  { const r = await render(tq, droneArg === 'off' ? null : { m: droneM, db: +droneArg }, 1.5, 5); fs.writeFileSync(`${out}/taqsim.wav`, wav16(r.data, r.sr)); }
  ok('no page errors (render)', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close(); await b.close();

  // ---- 1. Call and response: right / close / the right shape from another note
  const expect = {
    right: [/Yes!/, /You got it/],
    close: [new RegExp(`Close: a bit ${s1 > 0 ? 'lower' : 'higher'}`), /So close/],
    shape: [/Right shape/, /got the shape/],
  };
  for (const k of Object.keys(takes)) {
    if (!run('echo')) break;
    b = await micBrowser(`${out}/echo_${k}.wav`); ({ ctx, p, errs } = await newPage(b));
    await p.goto(base + '#/echo'); await p.waitForTimeout(600);
    await p.click('#ecGo');
    const seen = await watch(p, (lead + P.length * 0.65 + 3.4) * 1000);
    const beads = await p.$$eval('#ecBeads .ec-bead', (bs) => bs.map((x) => x.className.replace('ec-bead', '').trim() || '-'));
    const count = await p.evaluate(() => document.querySelector('#ecCount').textContent);
    ok(`Call and response, ${k} answer: live feedback`, expect[k][0].test(seen.join(' | ')), seen.join(' | ').slice(0, 220));
    ok(`Call and response, ${k} answer: verdict`, expect[k][1].test(seen.join(' | ')), `beads now ${beads.join(' ')} · ${count}`);
    if (k === 'right') ok('a phrase got right moves on to the next', /Phrase 2 of/.test(count), count);
    await p.screenshot({ path: `${out}/c1-echo-${k}.png` });
    await p.click('#ecGo');   // Stop
    ok(`no page errors (echo ${k})`, !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close(); await b.close();
  }

  // ---- 2. Tremolo meter: 6 and 9 even picks a second, then an uneven one
  const tremExpect = { even6: [5.4, 6.6, 75], even9: [8.2, 9.8, 75], uneven: [4.5, 7.5, -60] };
  for (const [k, [lo, hi, ev]] of Object.entries(tremExpect)) {
    if (!run('trem')) break;
    b = await micBrowser(`${out}/trem_${k}.wav`); ({ ctx, p, errs } = await newPage(b));
    await p.goto(base + '#/tremolo'); await p.waitForTimeout(500);
    await p.click('#trGo');
    const reads = []; const t0 = Date.now();
    while (Date.now() - t0 < 6200) {
      const r = await p.evaluate(() => [document.querySelector('#trRate').textContent, document.querySelector('#trEvenTxt').textContent, document.querySelector('#trTip').textContent]);
      if (/^\d/.test(r[0])) reads.push(r);
      if (reads.length === 15) await p.screenshot({ path: `${out}/c2-tremolo-${k}.png` });
      await p.waitForTimeout(150);
    }
    const mid = reads.slice(Math.floor(reads.length / 3), Math.floor((2 * reads.length) / 3));
    const rates = mid.map((r) => +r[0]), evens = mid.map((r) => parseInt(r[1], 10));
    const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const rate = med(rates), even = med(evens);
    ok(`Tremolo ${k}: picks a second`, rate >= lo && rate <= hi, `${rate} (expected ${lo}-${hi}; ${reads.length} readings)`);
    ok(`Tremolo ${k}: evenness`, ev > 0 ? even >= ev : even < -ev, `${even}% · tip "${(mid[mid.length - 1] || [])[2] || ''}"`);
    ok(`no page errors (tremolo ${k})`, !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close(); await b.close();
  }

  // ---- 3. Taqsim playground (Bayati): 7 notes inside, 1 outside, ending on the home note; drone mixed into the take
  if (run('taqsim')) {
  b = await micBrowser(`${out}/taqsim.wav`); ({ ctx, p, errs } = await newPage(b));
  await p.goto(base + '#/taqsim'); await p.waitForTimeout(600);
  ok('Taqsim shows the 8 maqamat to choose from', (await p.$$eval('#tqMaqams button', (x) => x.length)) === 8);
  await p.click('#tqGo');
  const tqSeen = await watch(p, 9000, '#tqMsg');
  const trail = await p.$$eval('#tqTrail .ec-bead', (bs) => bs.map((x) => (x.classList.contains('ok') ? '✓' : '✗') + x.textContent));
  const stats = await p.evaluate(() => document.querySelector('#tqStats').textContent);
  ok('Taqsim: every note heard', trail.length === 8, `${trail.join(' ')} (drone ${droneArg} dB)`);
  ok('Taqsim: only the outside note is marked outside', trail.filter((x) => x[0] === '✗').length === 1 && trail[4] && trail[4][0] === '✗', stats);
  ok('Taqsim: a phrase ending on the home note is praised', /came home/.test(tqSeen.join(' | ')), tqSeen.slice(-2).join(' | '));
  await p.screenshot({ path: `${out}/c3-taqsim.png` });
  await p.click('#tqGo');
  ok('no page errors (taqsim)', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close(); await b.close();
  }

  // ---- 4. Your hard notes: from stored results to a drill; 5. Drone switch in the lesson
  if (run('hard')) {
  b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const hardKeys = [...new Set(P.map((n) => n.key))].slice(0, 2);
  const stats0 = Object.fromEntries(hardKeys.map((k, i) => [k, { ok: 0, off: 1, wrong: 3 - i }]));
  ({ ctx, p, errs } = await newPage(b, { ...seed, notestats: stats0 }, true));
  await p.goto(base + '#/practice'); await p.waitForTimeout(500);
  const label = await p.evaluate(() => document.querySelector('#hardLabel').textContent);
  ok('Practice lists your hard notes', hardKeys.every((k) => label.includes(P.find((n) => n.key === k).ar)), label);
  await p.screenshot({ path: `${out}/c4-practice.png` });
  await p.click('#goHard'); await p.waitForTimeout(800);
  const drill = await p.evaluate(() => ({ hash: location.hash, chips: document.querySelectorAll('#strip .chip').length, title: document.querySelector('#lesson') ? document.querySelector('#lesson').textContent.slice(0, 400) : '' }));
  ok('Your hard notes opens a Slowly drill', /lesson/.test(drill.hash) && drill.chips >= 6, `${drill.hash} · ${drill.chips} notes`);
  await p.screenshot({ path: `${out}/c5-hard-drill.png` });
  ok('Drone switch shows in the lesson', await p.isVisible('#droneBtn'));
  const made0 = await p.evaluate(() => window.__osc.made);
  await p.click('#droneBtn'); await p.waitForTimeout(300);
  const on = await p.evaluate(() => [document.querySelector('#droneBtn').classList.contains('on'), window.__osc.made]);
  ok('Drone on: three oscillators start', on[0] && on[1] - made0 === 3, `made ${on[1] - made0}`);
  await p.screenshot({ path: `${out}/c6-drone-on.png` });
  await p.click('#droneBtn'); await p.waitForTimeout(600);
  const off = await p.evaluate(() => [document.querySelector('#droneBtn').classList.contains('on'), window.__osc.stopped]);
  ok('Drone off: they stop', !off[0] && off[1] >= 3, `stopped ${off[1]}`);
  await p.click('#droneBtn'); await p.waitForTimeout(200);
  const st1 = await p.evaluate(() => window.__osc.stopped);
  await p.goto(base + '#/song'); await p.waitForTimeout(500);
  ok('Leaving the lesson stops the drone', (await p.evaluate(() => window.__osc.stopped)) - st1 >= 3);
  ok('Song page has Learn it by ear', await p.isVisible('#svEcho'));
  await p.click('#svEcho'); await p.waitForTimeout(400);
  ok('Learn it by ear opens Call and response', /echo/.test(await p.evaluate(() => location.hash)));
  ok('no page errors (hard notes, drone)', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close(); await b.close();
  }

  console.log(results.join('\n'));
  console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
})();
