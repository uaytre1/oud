// Tuner: hears one open string, finds which of the six it is, and shows how far it is from the right
// pitch (A4 = 440 Hz, green within ±10 cents, like Pano Tuner).
//
// It has its own pitch analysis on the mic (an AnalyserNode behind two native low-pass filters), so it
// does not depend on the lesson detector's gates. The pure parts (analyzeFrame, StringTracker) use no
// DOM, so they can also be run on WAV files in Node.
//
// Why not plain YIN + nearest note: a phone mic barely hears the fundamental of the low strings
// (F2 87 Hz, G2 98 Hz), so YIN often locks onto the 2nd harmonic and reads an octave up. Each frame
// therefore offers a few period candidates (YIN's pick, its double, triple and half), and the tracker
// scores them against the strings the oud actually has, preferring the string already ringing.

import { nameOf } from './notes.js';

export const A4 = 440;
export const IN_TUNE = 10;                       // cents either side that count as in tune
export const hzToMidi = (f) => 69 + 12 * Math.log2(f / A4);
const LATIN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const latinName = (midi) => { const r = Math.round(midi); return LATIN[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1); };
const median = (a) => { const s = [...a].sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

// ---------------------------------------------------------------- one frame
const MIN_F = 55, MAX_F = 1100;                  // period search range (open strings are 73–262 Hz)
const DEC_RATE = 12000;                          // YIN runs on a copy decimated to about this rate
const WIN = 0.042;                               // integration window, seconds
const geo = (sr) => {
  const D = Math.max(1, Math.round(sr / DEC_RATE)), fs = sr / D;
  const tMax = Math.ceil(fs / MIN_F) + 2, tMin = Math.max(2, Math.floor(fs / MAX_F)), W = Math.round(WIN * fs);
  return { D, fs, tMax, tMin, W, n: W + tMax + 2 };
};
/** Samples analyzeFrame needs (use an AnalyserNode with at least this fftSize). */
export function frameSize(sr) { const g = geo(sr); return Math.max(g.n * g.D, g.W * g.D + (g.tMax + 2) * g.D + 4); }

let scratch = { y: null, d: null };
/**
 * Pitch of the newest samples. x: Float32Array, already low-passed below ~2 kHz. sr: sample rate.
 * Returns { db, clarity, cands: [{ f, d, k }] }: d is YIN's dip (0 = perfectly periodic) and
 * k says which multiple of YIN's own pick the candidate is.
 */
export function analyzeFrame(x, sr) {
  const { D, tMax, tMin, W, n } = geo(sr), N = x.length;
  let ss = 0;
  for (let i = N - W * D; i < N; i++) ss += x[i] * x[i];
  const db = 10 * Math.log10(ss / (W * D) + 1e-20);
  if (db < -110) return { db, clarity: 0, cands: [] };
  if (!scratch.y || scratch.y.length !== n) scratch = { y: new Float32Array(n), d: new Float32Array(tMax + 2) };
  const y = scratch.y, d = scratch.d, start = N - n * D;
  let mean = 0;
  for (let j = 0; j < n; j++) { y[j] = x[start + j * D]; mean += y[j]; }
  mean /= n;
  for (let j = 0; j < n; j++) y[j] -= mean;
  // cumulative mean normalised difference (YIN)
  d[0] = 1; let run = 0;
  for (let tau = 1; tau <= tMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const v = y[i] - y[i + tau]; s += v * v; }
    run += s; d[tau] = run > 0 ? (s * tau) / run : 1;
  }
  let g = 9;
  for (let tau = tMin; tau <= tMax; tau++) if (d[tau] < g) g = d[tau];
  if (g > 0.6) return { db, clarity: 1 - g, cands: [] };
  // YIN's pick: the first dip that is nearly as deep as the deepest one
  let t0 = -1;
  for (let tau = tMin; tau <= tMax; tau++) {
    if (d[tau] <= g + 0.1) { while (tau < tMax && d[tau + 1] < d[tau]) tau++; t0 = tau; break; }
  }
  const cands = [], seen = new Set();
  for (const k of [1, 2, 3, 0.5]) {
    const L = t0 * k;
    if (L < tMin || L > tMax - 1) continue;
    const r = Math.max(2, Math.round(L * 0.04));
    let b = -1;
    for (let tau = Math.max(tMin, Math.round(L) - r); tau <= Math.min(tMax - 1, Math.round(L) + r); tau++) if (b < 0 || d[tau] < d[b]) b = tau;
    if (b < 1 || seen.has(b) || d[b] > 0.6) continue;
    seen.add(b);
    let frac = b;
    const a = d[b - 1], c = d[b], e = d[b + 1], den = a - 2 * c + e;
    if (den > 0) frac = b + Math.max(-0.5, Math.min(0.5, (0.5 * (a - e)) / den));
    const lag = refine(x, frac * D, D, W * D);
    cands.push({ f: sr / lag, d: d[b], k });
  }
  return { db, clarity: 1 - g, cands };
}

// The decimated lag is only good to a few cents; redo the difference function at full rate around it.
function refine(x, guess, D, Wf) {
  const N = x.length, lo = Math.max(2, Math.floor(guess - D - 1)), hi = Math.ceil(guess + D + 1);
  const s0 = N - Wf - hi - 2;
  if (s0 < 0) return guess;
  const e = new Float64Array(hi - lo + 3);
  for (let tau = lo - 1; tau <= hi + 1; tau++) {
    let s = 0;
    for (let i = 0; i < Wf; i++) { const v = x[s0 + i] - x[s0 + i + tau]; s += v * v; }
    e[tau - lo + 1] = s;
  }
  let m = 1;
  for (let j = 2; j <= hi - lo + 1; j++) if (e[j] < e[m]) m = j;
  const a = e[m - 1], c = e[m], f = e[m + 1], den = a - 2 * c + f;
  const off = den > 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - f)) / den)) : 0;
  return lo - 1 + m + off;
}

// ---------------------------------------------------------------- over time
const K_PEN = { 1: 0, 2: 0.06, 3: 0.1, 0.5: 0.1 };   // assuming YIN picked a harmonic costs a little
const HOLD = 0.35;          // s without a reading before the display shows "last reading"
const FORGET = 4;           // s before a held reading is cleared
const SMOOTH = 0.07;        // s, needle time constant

/** Turns frames into a steady reading: which string, how many cents, live / held / waiting. */
export class StringTracker {
  constructor(strings = []) { this.strings = strings; this.locked = null; this.reset(); }
  reset() {
    Object.assign(this, { cur: null, buf: [], target: null, disp: null, lastGood: -1e9, mode: 'wait', heard: null,
      floor: null, lv: [], onsetT: -1e9, pend: null, pendN: 0, farSince: null, glitch: 0, snap: true, tickT: null, db: -120, lastT: null, bestD: 1, nbuf: [] });
  }
  setStrings(s) {
    const same = s.length === this.strings.length && s.every((x, i) => x.midi === this.strings[i].midi);
    this.strings = s;
    if (!same) this.clear();
  }
  lock(n) { this.locked = n || null; this.clear(); }
  clear() { Object.assign(this, { cur: null, buf: [], target: null, disp: null, mode: 'wait', pend: null, pendN: 0, snap: true, bestD: 1, nbuf: [] }); }

  push(fr, t) {
    const dt = this.lastT == null ? 0 : Math.min(0.2, t - this.lastT); this.lastT = t;
    this.db = fr.db;
    // noise floor: drops at once, creeps up 1 dB/s
    this.floor = this.floor == null || fr.db < this.floor ? Math.max(-100, fr.db) : this.floor + dt;
    // a pick = level jumps 6 dB within ~120 ms. A new string is only taken up after a pick, so a steady
    // hum or buzz in the room never shows as a string.
    this.lv.push([t, fr.db]); while (this.lv.length && this.lv[0][0] < t - 0.12) this.lv.shift();
    const lo = Math.min(...this.lv.map((v) => v[1]));
    if (fr.db - lo > 6 && t - this.onsetT > 0.15) { this.onsetT = t; this.buf = []; this.glitch = 0; this.bestD = 1; this.nbuf = []; }
    const fresh = t - this.onsetT < 0.3, recent = t - this.onsetT < 1.5;
    const loud = fr.db > this.floor + 5 && fr.db > -95;
    let best = null;
    if (loud) {
      const pool = this.locked ? this.strings.filter((s) => s.n === this.locked) : this.strings;
      for (const c of fr.cands) {
        if (c.k === 3 && !this.locked) continue;   // in Auto a 12th above a string would pass for that string
        const m = hzToMidi(c.f);
        for (const s of pool) {
          const dev = (m - s.midi) * 100;
          if (Math.abs(dev) > (this.locked ? 650 : c.k === 1 ? 250 : 75)) continue;   // other multiples only fix an octave slip
          let sc = c.d + K_PEN[c.k] + Math.abs(dev) * (this.locked ? 0.0003 : 0.0015);
          const same = this.cur && s.n === this.cur.n;
          if (!same && !recent) continue;
          if (same && !fresh) sc -= 0.12;
          if (c.d > (same ? 0.3 : 0.25)) continue;     // how periodic the sound must be
          if (!best || sc < best.sc) best = { s, dev, sc, c, m };
        }
      }
    }
    if (!best) {
      // a clear pitch that is no open string: say so only if it lasts (no flicker)
      const c1 = fr.cands.find((c) => c.k === 1);
      if (loud && recent && c1 && c1.d < 0.2 && !this.locked) {
        this.farSince ??= t;
        if (t - this.farSince > 0.5 && t - this.lastGood > HOLD) { this.mode = 'far'; this.heard = hzToMidi(c1.f); this.cur = null; this.target = null; this.disp = null; this.snap = true; }
      } else this.farSince = null;
      return;
    }
    this.farSince = null;
    if (!this.cur || best.s.n !== this.cur.n) {
      if (this.pend === best.s.n) this.pendN++; else { this.pend = best.s.n; this.pendN = 1; }
      if (this.pendN < (!this.cur || this.mode !== 'live' ? 2 : fresh ? 2 : 6)) return;
      this.cur = best.s; this.buf = []; this.snap = true; this.glitch = 0; this.bestD = 1; this.nbuf = [];
    }
    this.pend = null; this.pendN = 0;
    let v = best.dev;
    // As the string fades the frames get noisy. A noisy frame keeps the reading alive but does not move
    // it, unless several noisy frames in a row agree (the peg is being turned while the string rings).
    this.bestD = Math.min(this.bestD, best.c.d);
    if (this.buf.length && best.c.d > Math.max(0.15, this.bestD + 0.06)) {
      this.nbuf.push(v); if (this.nbuf.length > 5) this.nbuf.shift();
      const agree = this.nbuf.length === 5 && Math.max(...this.nbuf) - Math.min(...this.nbuf) < 8;
      if (!agree) {
        if (Math.abs(v - this.target) < 15) { this.lastGood = t; if (this.mode === 'hold') this.mode = 'live'; }
        return;
      }
      v = median(this.nbuf);
    } else this.nbuf = [];
    // a stray frame is ignored, unless it persists
    if (this.buf.length >= 3 && Math.abs(v - median(this.buf)) > 35) {
      if (++this.glitch < 4) { this.lastGood = t; return; }
      this.buf = [];
    }
    this.glitch = 0;
    this.buf.push(v); if (this.buf.length > 5) this.buf.shift();
    this.target = median(this.buf);
    if (this.snap || this.disp == null || this.mode !== 'live' && t - this.lastGood > 1) { this.disp = this.target; this.snap = false; }
    this.lastGood = t; this.mode = 'live'; this.heard = best.m;
  }

  /** Call every animation frame with the audio clock; moves the needle smoothly and ages the reading. */
  tick(t) {
    const dt = this.tickT == null ? 0 : Math.max(0, Math.min(0.1, t - this.tickT)); this.tickT = t;
    if (this.mode === 'live' && t - this.lastGood > HOLD) this.mode = 'hold';
    if (this.mode === 'hold' && t - this.lastGood > FORGET) this.clear();
    if (this.mode === 'far' && this.farSince == null && t - (this.farEnd ??= t) > 1.5) { this.mode = 'wait'; this.farEnd = null; }
    if (this.mode !== 'far') this.farEnd = null;
    if (this.target != null && this.disp != null && this.mode === 'live') this.disp += (this.target - this.disp) * (1 - Math.exp(-dt / SMOOTH));
  }

  get view() {
    const c = this.disp;
    return { mode: this.mode, string: this.cur, cents: c, inTune: c != null && Math.abs(Math.round(c)) <= IN_TUNE,
      heard: this.heard, locked: this.locked, db: this.db };
  }
}

// ---------------------------------------------------------------- screen
const SVGNS = 'http://www.w3.org/2000/svg';
const DEG_PER_CENT = 1.4;                     // ±50 cents = ±70°
const CX = 150, CY = 152, R = 128;
const polar = (c, r) => { const a = (c * DEG_PER_CENT * Math.PI) / 180; return [CX + r * Math.sin(a), CY - r * Math.cos(a)]; };
const fmtCents = (c) => { const r = Math.round(c); return r === 0 ? '0' : (r > 0 ? '+' : '−') + Math.abs(r); };

function buildGauge(svg) {
  const add = (tag, attrs, parent = svg) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
  const arc = (c1, c2, r) => { const [x1, y1] = polar(c1, r), [x2, y2] = polar(c2, r); return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
  svg.innerHTML = '';
  add('path', { d: arc(-50, 50, R), class: 'g-track' });
  add('path', { d: arc(-IN_TUNE, IN_TUNE, R), class: 'g-zone' });
  for (let c = -50; c <= 50; c += 5) {
    const major = c % 10 === 0, [x1, y1] = polar(c, R + 9), [x2, y2] = polar(c, R + (c === 0 ? 24 : major ? 18 : 13));
    add('line', { x1, y1, x2, y2, class: c === 0 ? 'g-tick g-zero' : major ? 'g-tick' : 'g-tick g-minor' });
  }
  for (const c of [-50, -25, 25, 50]) {
    const [x, y] = polar(c, R - 20);
    add('text', { x, y: y + 5, class: 'g-lab' }).textContent = c > 0 ? `+${c}` : `−${-c}`;
  }
  const g = add('g', { class: 'g-needle' });
  add('line', { x1: CX, y1: CY - R + 16, x2: CX, y2: CY - R - 14, class: 'g-tip' }, g);
  return g;
}

/**
 * The tuner screen. opts: { audioCtx: () => AudioContext, strings: () => [{n, ar, name, midi}], toast }.
 * Elements (index.html #tunerView): #tuCard #tuString #tuLatin #tuNote #tuGauge #tuCents #tuHint
 * #tuMode #tuLevel #tuStrings #tuStart.
 */
export function createTuner({ audioCtx, strings, toast = () => {} }) {
  const $ = (s) => document.querySelector(s);
  const ui = { card: $('#tuCard'), str: $('#tuString'), note: $('#tuNote'), latin: $('#tuLatin'), cents: $('#tuCents'), hint: $('#tuHint'),
    mode: $('#tuMode'), lvl: $('#tuLevel'), list: $('#tuStrings'), btn: $('#tuStart') };
  const needle = buildGauge($('#tuGauge'));
  const tr = new StringTracker(strings());
  let heardAny = false, gen = 0, active = false, stream = null, nodes = [], an = null, buf = null, raf = 0, lastA = 0, silentSince = null, shown = {};
  const log = [];

  const set = (key, elm, prop, val) => { if (shown[key] !== val) { shown[key] = val; elm[prop] = val; } };

  function chips() {
    const v = tr.view, ul = ui.list;
    ul.innerHTML = '';
    // Design D (2026-11-27): the strings drawn as the neck, string 6 on top and string 1 at the bottom like the lesson
    // neck; the string being tuned glows (brass, green when in tune); a ✓ stays on every string heard in tune this session
    for (const s of [...tr.strings].sort((a, b) => b.n - a.n)) {
      const on = v.string && v.string.midi === s.midi && v.mode !== 'wait';   // two strings may share a pitch
      const cls = ['tstr', on ? (v.inTune ? 'ok' : 'off') : '', tr.locked === s.n ? 'lock' : '', tunedNow.has(s.n) ? 'tuned' : ''].join(' ').trim();
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="${cls}" data-n="${s.n}" aria-pressed="${tr.locked === s.n}" aria-label="String ${s.n}, ${latinName(s.midi)}${tunedNow.has(s.n) ? ', in tune' : ''}">` +
        `<span class="tn">${s.n}</span><span class="tline" aria-hidden="true"></span><span class="ar">${s.ar}</span><i>${latinName(s.midi)}</i><b class="tok" aria-hidden="true">${tunedNow.has(s.n) ? '✓' : ''}</b></button>`;
      ul.append(li);
    }
    shown.chips = chipKey();
  }
  const tunedNow = new Set();   // strings heard in tune since the tuner started (session only)
  const chipKey = () => { const v = tr.view; return `${tr.strings.map((s) => s.midi).join()}|${tr.locked}|${v.mode !== 'wait' && v.string ? v.string.n : ''}|${v.inTune}|${[...tunedNow].join()}`; };
  ui.list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-n]'); if (!b) return;
    const n = +b.dataset.n;
    tr.lock(tr.locked === n ? null : n);
    draw(true);
  });

  function draw(force) {
    if (force) shown = {};
    const v = tr.view, s = v.string, live = v.mode === 'live' || v.mode === 'hold';
    if (active && v.mode === 'live' && v.inTune && s) tr.strings.filter((x) => x.midi === s.midi).forEach((x) => tunedNow.add(x.n));
    const state = !active ? 'off' : live ? (v.inTune ? 'ok' : Math.abs(v.cents) <= 30 ? 'near' : 'far') : v.mode === 'far' ? 'other' : 'wait';
    set('state', ui.card.dataset, 'state', state);
    set('held', ui.card.dataset, 'held', String(v.mode === 'hold'));
    set('mode', ui.mode, 'textContent', tr.locked ? `🔒 String ${tr.locked}` : 'Auto');
    let str = '', note = '', latin = '', cents = '', hint = '';
    if (!active) {
      const L = tr.locked && tr.strings.find((x) => x.n === tr.locked);
      str = L ? `String ${L.n}` : ' '; note = L ? L.ar : '—'; latin = L ? latinName(L.midi) : '';
      hint = L ? `Tap Start, then play string ${L.n}` : 'Tap Start, then play one open string';
    } else if (live) {
      str = `String ${tr.strings.filter((x) => x.midi === s.midi).map((x) => x.n).join(' or ')}`;
      note = s.ar; latin = latinName(s.midi);
      cents = `${fmtCents(v.cents)}¢`;
      const r = Math.round(v.cents);
      hint = v.inTune ? '✓ In tune' : r < 0 ? (r < -50 ? '↑ Far too low · tighten' : '↑ Too low · tighten') : r > 50 ? '↓ Far too high · loosen' : '↓ Too high · loosen';
      if (v.mode === 'hold') hint = `Last reading · ${hint.replace('✓ ', '')}`;
    } else if (v.mode === 'far') {
      str = 'Not an open string';
      note = v.heard != null ? nameOf(v.heard).ar : '—'; latin = v.heard != null ? latinName(v.heard) : '';
      hint = 'Play one open string';
    } else {
      const L = tr.locked && tr.strings.find((x) => x.n === tr.locked);
      str = L ? `String ${L.n}` : ' ';
      note = L ? L.ar : '—'; latin = L ? latinName(L.midi) : '';
      hint = L ? `Play string ${L.n}` : 'Play one open string';
      if (!heardAny && silentSince != null && tr.lastT != null && tr.lastT - silentSince > 3) hint = 'No sound from the mic. Check Safari → aA → Website Settings → Microphone';
    }
    set('str', ui.str, 'textContent', str);
    set('note', ui.note, 'textContent', note);
    set('latin', ui.latin, 'textContent', latin);
    set('cents', ui.cents, 'textContent', cents);
    set('hint', ui.hint, 'textContent', hint);
    const deg = live && v.cents != null ? Math.max(-50, Math.min(50, v.cents)) * DEG_PER_CENT : 0;
    const tf = `rotate(${deg.toFixed(2)} ${CX} ${CY})`;
    if (shown.tf !== tf) { shown.tf = tf; needle.setAttribute('transform', tf); }
    const lv = active ? Math.max(0, Math.min(1, (v.db + 80) / 55)) : 0;
    const lvs = `${(lv * 100).toFixed(0)}%`;
    if (shown.lv !== lvs) { shown.lv = lvs; ui.lvl.style.width = lvs; }
    if (shown.chips !== chipKey()) chips();
    set('btn', ui.btn, 'textContent', active ? '■ Stop tuner' : '🎤 Start tuner');
    return deg;
  }

  function loop(now) {
    if (!active) return;
    raf = requestAnimationFrame(loop);
    const ac = audioCtx(), t = ac.currentTime;
    if (ac.state !== 'running' && now - (loop.res || 0) > 1000) { loop.res = now; ac.resume().catch(() => {}); }
    if (now - lastA >= 15) {                     // ≤ ~60 analyses a second, even on 120 Hz screens
      lastA = now;
      an.getFloatTimeDomainData(buf);
      const fr = analyzeFrame(buf, ac.sampleRate);
      tr.push(fr, t);
      if (fr.db < -110) silentSince ??= t; else { silentSince = null; heardAny = true; }
      tr.tick(t);
      const deg = draw();
      const v = tr.view;
      if (log.length < 30000) log.push({ t: +t.toFixed(3), db: +fr.db.toFixed(1), mode: v.mode, n: v.string ? v.string.n : 0,
        cents: v.cents == null ? null : +v.cents.toFixed(2), target: tr.target == null ? null : +tr.target.toFixed(2), inTune: v.inTune, deg: +deg.toFixed(2),
        raw: fr.cands.map((c) => [+hzToMidi(c.f).toFixed(3), +c.d.toFixed(3), c.k]) });
    } else { tr.tick(t); draw(); }
  }

  async function start() {
    if (active) { stop(); return; }
    const my = ++gen, ac = audioCtx();
    const resumed = ac.resume().catch(() => {});  // in the tap itself: iOS only starts audio from a gesture
    let s;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    } catch (_) { if (my === gen) toast('Microphone blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.'); return; }
    await resumed;
    if (my !== gen) { s.getTracks().forEach((t) => t.stop()); return; }
    if (ac.state !== 'running') { try { await ac.resume(); } catch (_) {} }
    stream = s;
    const src = ac.createMediaStreamSource(stream);
    const mk = (type, f) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = 0; return b; };
    const hp = mk('highpass', 45), lp1 = mk('lowpass', 1000), lp2 = mk('lowpass', 1000);
    an = ac.createAnalyser();
    let size = 2048; while (size < frameSize(ac.sampleRate)) size *= 2;
    an.fftSize = Math.min(32768, size); an.smoothingTimeConstant = 0;
    buf = new Float32Array(an.fftSize);
    const sink = ac.createGain(); sink.gain.value = 0;    // keeps the graph pulling on Safari, silently
    src.connect(hp).connect(lp1).connect(lp2).connect(an).connect(sink).connect(ac.destination);
    nodes = [src, hp, lp1, lp2, an, sink];
    tr.setStrings(strings()); tr.reset(); log.length = 0; silentSince = null; heardAny = false; tunedNow.clear();
    active = true; lastA = 0;
    draw(true);
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    gen++;
    if (!active) return;
    active = false; cancelAnimationFrame(raf);
    nodes.forEach((n) => { try { n.disconnect(); } catch (_) {} }); nodes = [];
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; an = null;
    tr.reset(); draw(true);
  }

  function render() { tr.setStrings(strings()); draw(true); }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stop(); });
  render();
  return { start, stop, render, get active() { return active; }, tracker: tr, log };
}
