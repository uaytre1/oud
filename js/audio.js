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

  async start() {
    const ac = audioCtx();
    if (ac.state !== 'running') await ac.resume();
    if (!this.node) {
      await ac.audioWorklet.addModule(new URL('./detector-worklet.js', import.meta.url));
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
      this.src = ac.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(ac, 'oud-detector');
      const sink = ac.createGain(); sink.gain.value = 0;      // keep the graph pulling, silently
      this.src.connect(this.node); this.node.connect(sink); sink.connect(ac.destination);
      this.node.port.onmessage = (e) => this._msg(e.data);
    }
    this.running = true;
  }

  stop() {
    this.running = false;
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); }
    if (this.node) { this.node.disconnect(); }
    this.stream = null; this.node = null; this.src = null;
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
    } else if (m.type === 'onset') {
      if (this.log.onsets.length < 1000) this.log.onsets.push([+m.t.toFixed(3), +m.strength.toFixed(1), +m.db.toFixed(1)]);
      this._finishPending();
      this.pending = { t: m.t, strength: m.strength, f: [] };
      // collect pitch frames from 30 ms to 170 ms after the pick
      this.pendingUntil = m.t + 0.17;
    }
  }

  _collect(fr) {
    const p = this.pending; if (!p) return;
    // right after a detected pick, a moderately confident reading is enough (phone mics are noisy)
    if (fr.t >= p.t + 0.03 && fr.t <= this.pendingUntil && fr.f0 > 0 && fr.conf > 0.55) p.f.push(hzToMidi(fr.f0));
    if (fr.t > this.pendingUntil) this._finishPending();
  }

  _finishPending() {
    const p = this.pending; this.pending = null;
    if (!p) return;
    if (p.f.length < 2) return;                       // a muted stroke or noise: no clear pitch
    const midi = median(p.f);
    const sorted = [...p.f].sort((a, b) => a - b);
    const q = (x) => sorted[Math.min(sorted.length - 1, Math.floor(x * sorted.length))];
    const spread = q(0.75) - q(0.25);          // how steady the pitch was while measured
    const n = { t: p.t, midi, spread, conf: Math.min(1, p.f.length / 6), legato: false, strength: p.strength };
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
// Physical model of a plucked double course: two slightly detuned Karplus–Strong strings,
// pluck position comb, frequency-dependent loss, then a small body (resonances + presence).
const cache = new Map();
function renderString(sr, f, dur, detuneCents, pickPos, bright) {
  const n = Math.floor(sr * dur), out = new Float32Array(n);
  const ff = f * Math.pow(2, detuneCents / 1200);
  const P = sr / ff;                         // loop period in samples (fractional)
  // loop delay = M (line) + 0.5 (two-point average) + d (allpass), with d in [0.1, 1.1)
  const M = Math.floor(P - 0.6), d = P - 0.5 - M;
  const apc = (1 - d) / (1 + d);             // first-order allpass for the fractional part
  const line = new Float32Array(M);
  // excitation: low-passed noise burst, comb-shaped by the pluck position
  let lp = 0; const raw = new Float32Array(M);
  for (let i = 0; i < M; i++) { const r = Math.random() * 2 - 1; lp = lp + bright * (r - lp); raw[i] = lp; }
  const pp = Math.max(1, Math.round(M * pickPos));
  for (let i = 0; i < M; i++) line[i] = raw[i] - (i >= pp ? raw[i - pp] : 0);
  // loss: longer sustain for low notes
  const decay = Math.pow(0.001, 1 / (sr * (f < 120 ? 3.2 : f < 200 ? 2.4 : 1.8)));
  let idx = 0, lastX = 0, apIn = 0, apOut = 0;
  for (let i = 0; i < n; i++) {
    const x = line[idx];
    const y = 0.5 * (x + lastX) * decay; lastX = x;
    const z = apc * y + apIn - apc * apOut; apIn = y; apOut = z;
    out[i] = x;
    line[idx] = z;
    idx = idx + 1 === M ? 0 : idx + 1;
  }
  return out;
}

export function oudBuffer(midi, dur = 2.2) {
  const ac = audioCtx(), sr = ac.sampleRate;
  const key = `${midi}|${dur}`;
  if (cache.has(key)) return cache.get(key);
  const f = midiToHz(midi);
  const a = renderString(sr, f, dur, -1.8, 0.13, 0.55);
  const b = renderString(sr, f, dur, +1.8, 0.11, 0.5);
  const buf = ac.createBuffer(1, a.length, sr), d = buf.getChannelData(0);
  // pick click: very short bright noise
  const clickN = Math.floor(sr * 0.006);
  let peak = 0;
  for (let i = 0; i < a.length; i++) {
    let v = 0.55 * a[i] + 0.45 * b[i];
    if (i < clickN) v += (Math.random() * 2 - 1) * 0.25 * (1 - i / clickN);
    d[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  const fadeN = Math.floor(sr * 0.04);
  for (let i = 0; i < a.length; i++) {
    d[i] /= peak || 1;
    if (i > a.length - fadeN) d[i] *= (a.length - i) / fadeN;
  }
  cache.set(key, buf);
  return buf;
}

// wooden bowl: low resonance, a hollow mid, a little presence; no harsh top
function buildBody(ac) {
  const inp = ac.createGain();
  const r1 = ac.createBiquadFilter(); r1.type = 'peaking'; r1.frequency.value = 105; r1.Q.value = 1.6; r1.gain.value = 6;
  const r2 = ac.createBiquadFilter(); r2.type = 'peaking'; r2.frequency.value = 240; r2.Q.value = 1.2; r2.gain.value = 3;
  const dip = ac.createBiquadFilter(); dip.type = 'peaking'; dip.frequency.value = 700; dip.Q.value = 1.0; dip.gain.value = -3;
  const pres = ac.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2600; pres.Q.value = 0.9; pres.gain.value = 4;
  const top = ac.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 6500;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  const out = ac.createGain(); out.gain.value = 0.8;
  inp.connect(r1).connect(r2).connect(dip).connect(pres).connect(top).connect(comp).connect(out).connect(ac.destination);
  return { inp, out };
}
let body = null;
function bodyChain() { return body || (body = buildBody(audioCtx())); }

function schedule(ac, dest, midi, t0, dur, gain) {
  const src = ac.createBufferSource();
  src.buffer = oudBuffer(midi);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  // let the note ring, but damp it a little after its slot so the next pick is clear
  const hold = Math.max(0.15, dur);
  g.gain.setTargetAtTime(gain * 0.35, t0 + hold, 0.12);
  src.connect(g).connect(dest);
  src.start(t0); src.stop(t0 + hold + 1.2);
  return src;
}

// Render notes [{t, dur, midi}] to an AudioBuffer (same sound as live playback).
export async function renderOffline(notes, speed = 1) {
  const sr = audioCtx().sampleRate, base = notes[0].t;
  const len = (notes[notes.length - 1].t - base) / speed + 2.5;
  const oc = new OfflineAudioContext(1, Math.ceil(len * sr), sr);
  const b = buildBody(oc);
  for (const n of notes) schedule(oc, b.inp, n.midi, 0.1 + (n.t - base) / speed, n.dur / speed, 0.9);
  return oc.startRendering();
}

const playing = new Set();
export function playNote(midi, when = 0, dur = 1.6, gain = 0.9) {
  const ac = audioCtx();
  const src = schedule(ac, bodyChain().inp, midi, when || ac.currentTime, dur, gain);
  playing.add(src); src.onended = () => playing.delete(src);
  return src;
}
export function stopAll() { for (const s of playing) { try { s.stop(); } catch (_) {} } playing.clear(); }

export function click(when, accent = false) {
  const ac = audioCtx();
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.value = accent ? 1800 : 1200;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  o.connect(g).connect(ac.destination); o.start(when); o.stop(when + 0.06);
}
