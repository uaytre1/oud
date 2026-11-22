// Microphone, note tracking and the oud sound.
const hzToMidi = (f) => 69 + 12 * Math.log2(f / 440);
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
export { hzToMidi, midiToHz };

let ctx = null;
export function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  return ctx;
}

// ---------------------------------------------------------------- listening
const CLICK_MIN = 10;   // dB the treble must jump at a pick for it to count as a new note

export class Listener {
  constructor() {
    this.frames = [];            // recent pitch frames {t,f0,conf,db}
    this.onFrame = null;         // (frame) => void
    this.onNote = null;          // (note) => void   note = {t, midi, conf, legato}
    this.pending = null;         // note being collected after a pick
    this.lastNote = null;
    this.running = false;
    this.log = { onsets: [], frames: [] };   // kept small; read by the test harness
  }

  // Resolves true when listening, false when stop() was called while the mic was still starting
  // (e.g. the player left the screen during the permission prompt). Two quick starts share one stream.
  // (Mic lifecycle from Codex's review, 2026-11-22.)
  async start() {
    if (this.running) return true;
    if (this.starting) return this.starting;
    const generation = this.generation || 0;
    const task = (async () => {
      const ac = audioCtx();
      if (ac.state !== 'running') await ac.resume();
      if (!ac.audioWorklet || !navigator.mediaDevices?.getUserMedia)
        throw new Error('Microphone audio processing is unavailable. Open the https:// site in an updated Safari or Chrome.');
      await ac.audioWorklet.addModule(new URL('./detector-worklet.js', import.meta.url));
      if (generation !== (this.generation || 0)) return false;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
      if (generation !== (this.generation || 0)) { stream.getTracks().forEach((t) => t.stop()); return false; }
      this.stream = stream;
      try {
        this.src = ac.createMediaStreamSource(stream);
        this.node = new AudioWorkletNode(ac, 'oud-detector');
        this.sink = ac.createGain(); this.sink.gain.value = 0;   // keep the graph pulling, silently
        this.src.connect(this.node); this.node.connect(this.sink); this.sink.connect(ac.destination);
        // every session starts clean: nothing "still ringing" from the last one
        this.frames = []; this.pending = null; this.lastNote = null;
        this.legRun = 0; this.legSum = 0; this.log = { onsets: [], frames: [] };
        this.node.port.onmessage = (e) => this._msg(e.data);
        this.running = true;
        return true;
      } catch (e) { this.stop(); throw e; }
    })();
    this.starting = task;
    try { return await task; } finally { if (this.starting === task) this.starting = null; }
  }

  stop() {
    this.generation = (this.generation || 0) + 1;
    this.starting = null; this.running = false;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.node) { this.node.port.onmessage = null; this.node.port.close(); }
    for (const node of [this.src, this.node, this.sink]) if (node) node.disconnect();
    this.stream = null; this.node = null; this.src = null; this.sink = null;
    this.pending = null; this.lastNote = null; this.frames = [];
    this.legRun = 0; this.legSum = 0;
  }

  setSensitivity(s) { this.node && this.node.port.postMessage({ sensitivity: s }); }

  now() { return audioCtx().currentTime; }

  _msg(m) {
    if (!this.running) return;
    if (m.type === 'frame') {
      if (this.log.frames.length < 4000) this.log.frames.push([+m.t.toFixed(3), +m.f0.toFixed(1), +m.conf.toFixed(2), +m.db.toFixed(1)]);
      this.frames.push(m); if (this.frames.length > 400) this.frames.shift();
      this.onFrame && this.onFrame(m);
      this._collect(m);
      this._legato(m);
    } else if (m.type === 'click') {
      if (this.pending && Math.abs(this.pending.t - m.t) < 1e-6) this.pending.rise = m.rise;
      else if (this.lastNote && Math.abs(this.lastNote.t - m.t) < 1e-6) this.lastNote.rise = m.rise;
    } else if (m.type === 'onset') {
      if (this.log.onsets.length < 1000) this.log.onsets.push([+m.t.toFixed(3), +m.strength.toFixed(1), +m.db.toFixed(1)]);
      this._finishPending();
      this.pending = { t: m.t, strength: m.strength, f: [], rise: null };
      // collect pitch frames from 30 ms to 170 ms after the pick
      this.pendingUntil = m.t + 0.17;
    }
  }

  _collect(fr) {
    const p = this.pending; if (!p) return;
    // right after a detected pick, a moderately confident reading is enough (phone mics are noisy)
    if (fr.t >= p.t + 0.03 && fr.t <= this.pendingUntil && fr.f0 > 0 && fr.conf > 0.55) { p.f.push(hzToMidi(fr.f0)); (p.ft ||= []).push(fr.t); }
    if (fr.t > this.pendingUntil) this._finishPending();
  }

  _finishPending() {
    const p = this.pending; this.pending = null;
    if (!p) return;
    if (p.f.length < 2) return;                       // a muted stroke or noise: no clear pitch
    // Right after a pick the previous note is still ringing, so early readings can land between
    // the two notes. Use the later half of the window when it has enough readings.
    const late = p.f.filter((_, k) => p.ft[k] >= p.t + 0.09);
    const use = late.length >= 3 ? late : p.f;
    const midi = median(use);
    // No pick click and the same pitch (or an octave of it) as the note still ringing: the "onset"
    // was that note swelling (the two strings of a course beat) or a finger lifting, not a new pick.
    // On the owner's iPhone take real picks rose 14–50 dB, these 2–9 dB.
    const last = this.lastNote, d = last ? midi - last.midi : 99;
    const sameAsRinging = last && p.t - last.t < 4 && [0, 12, -12, 24, -24, 19.02, -19.02].some((k) => Math.abs(d - k) < 0.7);
    // Fast repeated picks (tremolo, ×4) come within ~0.4 s and can have a smaller click: keep those.
    const slow = !last || p.t - last.t > 0.42;
    if (p.rise != null && slow && (p.rise < 6 || (p.rise < CLICK_MIN && sameAsRinging))) {
      (this.log.skipped ||= []).push([+p.t.toFixed(3), +midi.toFixed(2), +p.rise.toFixed(1)]);
      return;
    }
    const sorted = [...use].sort((a, b) => a - b);
    const q = (x) => sorted[Math.min(sorted.length - 1, Math.floor(x * sorted.length))];
    const spread = q(0.75) - q(0.25);          // how steady the pitch was while measured
    const n = { t: p.t, midi, spread, conf: Math.min(1, p.f.length / 6), legato: false, strength: p.strength, rise: p.rise };
    this.lastNote = n;
    this.onNote && this.onNote(n);
  }

  // A new note without a new pick (a slide or hammer-on): pitch moves and stays.
  _legato(fr) {
    if (this.pending || !this.lastNote || !(fr.f0 > 0) || fr.conf < 0.7) { this.legRun = 0; return; }
    const m = hzToMidi(fr.f0);
    if (fr.t - this.lastNote.t < 0.12) return;
    if (this.legRun && Math.abs(m - this.legSum / this.legRun) > 0.5) { this.legRun = 0; this.legSum = 0; }
    if (Math.abs(m - this.lastNote.midi) > 0.7 && Math.abs(m - this.lastNote.midi) < 7.5) {
      this.legRun = (this.legRun || 0) + 1; this.legSum = (this.legSum || 0) + m;
      if (this.legRun === 1) this.legT = fr.t;
      if (this.legRun >= 4) {
        const n = { t: this.legT, midi: this.legSum / this.legRun, conf: 0.6, legato: true };
        this.lastNote = n; this.legRun = 0; this.legSum = 0;
        this.onNote && this.onNote(n);
      }
    } else { this.legRun = 0; this.legSum = 0; }
  }
}

export function median(a) { const s = [...a].sort((x, y) => x - y); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; }

// ---------------------------------------------------------------- oud sound
// Physical model of a plucked double course, tuned against real oud recordings: two Karplus–Strong
// strings about 2 cents apart, plucked by a risha near the bridge, register-dependent loss, then a
// wooden body (fitted resonances, warm top) and a light room. Settings: SYNTH and BODY below.
const SYNTH = {
  // per register: low (< 120 Hz), middle (< 200 Hz), high
  t60: [3.4, 3.0, 2.6],        // seconds for the fundamental to die away by 60 dB
  hfLoss: [0.2, 0.2, 0.2],     // extra loss of the upper harmonics in the string (0.25 = plain two-point average)
  tilt: [1.2, 1.5, 1.6],      // pluck spectrum falls as 1/k^tilt (before the pluck-position comb)
  soft: [3000, 3000, 3000],    // risha softness: the pluck's harmonics roll off above this (Hz)
  pick: [0.12, 0.11, 0.10],    // pluck position, fraction of the string from the bridge
  noise: [0.05, 0.06, 0.08],   // noisy part of the pluck
  click: [0.09, 0.035, 0.02],  // short bright "tick" of the risha on the string
  detune: 1.4,                 // cents each way between the two strings of a course
  lag: 0.0003,                 // seconds between the risha meeting the first and the second string
};
const OPEN = [60, 55, 50, 45, 43, 41];                    // open courses, thinnest first
const courseOf = (midi) => { const c = OPEN.findIndex((o) => midi >= o - 0.01); return c < 0 ? OPEN.length - 1 : c; };

const cache = new Map();
function renderString(sr, f, n, detuneCents, reg, pickPos) {
  const out = new Float32Array(n);
  const ff = f * Math.pow(2, detuneCents / 1200);
  const P = sr / ff;                         // loop period in samples (fractional)
  // loop delay = M (line) + 1 (three-point loss filter) + d (allpass), with d in [0.1, 1.1)
  const M = Math.floor(P - 1.1), d = P - 1 - M;
  const apc = (1 - d) / (1 + d);             // first-order allpass for the fractional part
  // excitation: one period of the string's motion right after the risha lets go. Harmonic k has
  // amplitude sin(k·pi·pos)/k^tilt (pluck position comb), softened above `soft` Hz, plus a little noise.
  const line = new Float32Array(M);
  const K = Math.min(48, Math.floor(0.45 * sr / ff)), soft = SYNTH.soft[reg], tilt = SYNTH.tilt[reg];
  for (let k = 1; k <= K; k++) {
    const a = Math.sin(k * Math.PI * pickPos) / Math.pow(k, tilt) / (1 + Math.pow(k * ff / soft, 2));
    const c = Math.cos(2 * Math.PI * k / P);
    let y1 = a, y2 = a * c;                  // cos recurrence: a·cos(w·i)
    for (let i = 0; i < M; i++) { line[i] += y1; const y = 2 * c * y1 - y2; y2 = y1; y1 = y; }
  }
  let pk = 0; for (let i = 0; i < M; i++) pk = Math.max(pk, Math.abs(line[i]));
  let lp = 0;
  for (let i = 0; i < M; i++) { lp += 0.35 * (Math.random() * 2 - 1 - lp); line[i] = line[i] / pk + SYNTH.noise[reg] * lp; }
  const decay = Math.pow(0.001, 1 / (ff * SYNTH.t60[reg]));   // applied once per trip round the loop
  // loss filter: q*(x[n] + x[n-2]) + (1-2q)*x[n-1]; higher harmonics die away faster (q sets how much)
  const q = SYNTH.hfLoss[reg], q0 = 1 - 2 * q;
  let idx = 0, x1 = 0, x2 = 0, apIn = 0, apOut = 0;
  for (let i = 0; i < n; i++) {
    const x = line[idx];
    const y = (q * (x + x2) + q0 * x1) * decay; x2 = x1; x1 = x;
    const z = apc * y + apIn - apc * apOut; apIn = y; apOut = z;
    out[i] = x;
    line[idx] = z;
    idx = idx + 1 === M ? 0 : idx + 1;
  }
  return out;
}

export function oudBuffer(midi, dur = 2.4) {
  const ac = audioCtx(), sr = ac.sampleRate;
  const key = `${midi}|${dur}`;
  if (cache.has(key)) return cache.get(key);
  const f = midiToHz(midi), reg = f < 120 ? 0 : f < 200 ? 1 : 2;
  const n = Math.floor(sr * dur), lag = Math.round(SYNTH.lag * sr);
  const a = renderString(sr, f, n, -SYNTH.detune, reg, SYNTH.pick[reg]);
  const b = renderString(sr, f, n - lag, +SYNTH.detune, reg, SYNTH.pick[reg] * 0.85);
  const buf = ac.createBuffer(1, n, sr), d = buf.getChannelData(0);
  const clickN = Math.floor(sr * 0.004);
  let peak = 0, hp = 0;
  for (let i = 0; i < n; i++) {
    let v = 0.6 * a[i] + (i >= lag ? 0.4 * b[i - lag] : 0);
    if (i < clickN) { const r = Math.random() * 2 - 1; v += SYNTH.click[reg] * (r - hp) * (1 - i / clickN); hp = r; }
    d[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  const fadeN = Math.floor(sr * 0.04);
  for (let i = 0; i < n; i++) {
    d[i] /= peak || 1;
    if (i > n - fadeN) d[i] *= (n - i) / fadeN;
  }
  cache.set(key, buf);
  return buf;
}

// The bowl and soundboard: filters fitted so the overall spectrum of whole performances matches the
// recordings (strong 150–250 Hz wood, a dip near 350 Hz, a warm top that falls away above ~1.5 kHz).
const BODY = [
  // [type, Hz, Q, gain dB]
  ['highpass', 140, 0.5, 0],     // with the next filter: the air resonance of the bowl near 127 Hz,
  ['peaking', 127, 3.0, 8.5],    //   and little below it (the lowest fundamentals come mostly from their 2nd harmonic)
  ['peaking', 378, 3.0, -3.5],
  ['peaking', 480, 2.0, 2.5],
  ['peaking', 1036, 3.0, -2.1],
  ['peaking', 1792, 1.3, 10.5],  // the oud's nasal "presence"
  ['lowpass', 7400, 0.5, 0],
];
const LEVEL = { pre: 0.3, out: 2.0 };
const ROOM = { seconds: 0.9, wet: 0.2 };                   // a small room, kept light
function roomIR(ac) {
  const sr = ac.sampleRate, n = Math.floor(sr * ROOM.seconds), ir = ac.createBuffer(1, n, sr), d = ir.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = 0.6 * Math.exp(-t * 6);           // the tail gets darker as it dies
    lp += (0.15 + k) * (Math.random() * 2 - 1 - lp);
    d[i] = lp * Math.exp(-6.9 * t / ROOM.seconds) * Math.min(1, t / 0.008);
  }
  return ir;
}
function buildBody(ac) {
  const inp = ac.createGain();
  let node = inp;
  for (const [type, fr, q, gain] of BODY) {
    const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = fr; b.Q.value = q; b.gain.value = gain;
    node.connect(b); node = b;
  }
  // the compressor only catches peaks when many notes ring together; single notes pass untouched,
  // so each pick keeps its natural sharp start and decay
  const pre = ac.createGain(); pre.gain.value = LEVEL.pre;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -8; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.15;
  const out = ac.createGain(); out.gain.value = LEVEL.out;
  node.connect(pre).connect(comp);
  if (ROOM.wet > 0) {
    const room = ac.createConvolver(); room.normalize = true; room.buffer = roomIR(ac);
    const wet = ac.createGain(); wet.gain.value = ROOM.wet;
    node.connect(room).connect(wet).connect(pre);
  }
  comp.connect(out).connect(ac.destination);
  return { inp, out, voices: new Map() };
}
let body = null;
function bodyChain() { return body || (body = buildBody(audioCtx())); }

// A real string rings on after its note until something stops it. Measured in the recordings: 0.3 s
// after the next pick the old note is only about 11 dB down. So open strings ring freely, a fretted
// note fades a little when the finger relaxes, and the next pick on the same course damps it.
const RELEASE = { fretted: 0.4, fretTau: 0.25, sameTau: 0.08 };
function schedule(ac, chain, midi, t0, dur, gain) {
  const src = ac.createBufferSource();
  src.buffer = oudBuffer(midi);
  const g = ac.createGain(), damp = ac.createGain();
  const c = courseOf(midi), open = Math.abs(midi - OPEN[c]) < 0.05;
  const hold = Math.max(0.15, dur);
  g.gain.setValueAtTime(gain, t0);
  if (!open) g.gain.setTargetAtTime(gain * RELEASE.fretted, t0 + hold, RELEASE.fretTau);
  const prev = chain.voices.get(c);
  if (prev && prev.t0 < t0) prev.damp.gain.setTargetAtTime(0, t0, RELEASE.sameTau);   // the risha stops the old note
  chain.voices.set(c, { t0, damp });
  src.connect(g).connect(damp).connect(chain.inp);
  src.start(t0);
  return src;
}

// Render notes [{t, dur, midi}] to an AudioBuffer (same sound as live playback).
export async function renderOffline(notes, speed = 1) {
  const sr = audioCtx().sampleRate, base = notes[0].t;
  const len = (notes[notes.length - 1].t - base) / speed + 2.5;
  const oc = new OfflineAudioContext(1, Math.ceil(len * sr), sr);
  const b = buildBody(oc);
  for (const n of notes) schedule(oc, b, n.midi, 0.1 + (n.t - base) / speed, n.dur / speed, 0.9);
  return oc.startRendering();
}

const playing = new Set();
export function playNote(midi, when = 0, dur = 1.6, gain = 0.9) {
  const ac = audioCtx();
  const src = schedule(ac, bodyChain(), midi, when || ac.currentTime, dur, gain);
  playing.add(src); src.onended = () => playing.delete(src);
  return src;
}
export function stopAll() { for (const s of playing) { try { s.stop(); } catch (_) {} } playing.clear(); if (body) body.voices.clear(); }

export function click(when, accent = false) {
  const ac = audioCtx();
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.value = accent ? 1800 : 1200;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  o.connect(g).connect(ac.destination); o.start(when); o.stop(when + 0.06);
}
