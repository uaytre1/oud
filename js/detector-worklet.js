// AudioWorklet: hears the oud.
//  - pick (onset) detection on the full-rate signal: a struck string has a sharp
//    high-frequency click, so we watch a high-passed energy envelope for jumps.
//  - pitch with YIN on a low-passed, decimated copy (oud fundamentals are 80–600 Hz).
// Posts {type:'frame', t, f0, conf, db} every hop and {type:'onset', t, strength}.

class Biquad {
  constructor(b0, b1, b2, a1, a2) { Object.assign(this, { b0, b1, b2, a1, a2, x1: 0, x2: 0, y1: 0, y2: 0 }); }
  static lowpass(fs, fc, q = 0.707) {
    const w = 2 * Math.PI * fc / fs, c = Math.cos(w), s = Math.sin(w) / (2 * q), a0 = 1 + s;
    return new Biquad((1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - s) / a0);
  }
  static highpass(fs, fc, q = 0.707) {
    const w = 2 * Math.PI * fc / fs, c = Math.cos(w), s = Math.sin(w) / (2 * q), a0 = 1 + s;
    return new Biquad((1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - s) / a0);
  }
  step(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y;
  }
}

class OudDetector extends AudioWorkletProcessor {
  constructor() {
    super();
    const fs = sampleRate;
    this.D = Math.max(1, Math.round(fs / 11025));          // decimation factor
    this.fsd = fs / this.D;                                // ~11.025–12 kHz
    this.lp1 = Biquad.lowpass(fs, 2400); this.lp2 = Biquad.lowpass(fs, 2400);
    this.hp1 = Biquad.highpass(fs, 1800); this.hp2 = Biquad.highpass(fs, 1800);
    this.minF = 70; this.maxF = 700;
    this.tauMax = Math.ceil(this.fsd / this.minF);
    this.tauMin = Math.floor(this.fsd / this.maxF);
    this.W = 512;                                          // YIN integration window
    this.N = this.W + this.tauMax + 2;
    this.buf = new Float32Array(this.N * 2); this.w = 0;   // double-written ring
    this.hop = 128; this.sinceHop = 0; this.dc = 0; this.decCount = 0; this.acc = 0;
    this.diff = new Float32Array(this.tauMax + 2);
    // onset state (blocks of 64 samples): a peak-held treble envelope that only jumps on a real attack
    this.blk = 64; this.bi = 0; this.eHF = 0; this.eAll = 0;
    this.envRel = Math.exp(-this.blk / (0.025 * fs));      // 25 ms release
    this.lvRel = Math.exp(-this.blk / (0.3 * fs));         // overall level, 300 ms release
    this.env = 1e-12; this.lv = 1e-12;
    this.hist = new Float32Array(32).fill(-120); this.histT = new Float64Array(32); this.bbHist = new Float32Array(32).fill(-120); this.hi = 0;
    this.lastOnset = -1; this.lag = 2;
    this.port.onmessage = (e) => { if (e.data && e.data.sensitivity != null) this.sens = e.data.sensitivity; };
    this.sens = 1;
  }

  yin() {
    const N = this.N, start = this.w, b = this.buf, W = this.W, d = this.diff;
    let sumsq = 0;
    for (let i = 0; i < W; i++) { const v = b[start + i]; sumsq += v * v; }
    const db = 10 * Math.log10(sumsq / W + 1e-12);
    if (db < -65) return { f0: 0, conf: 0, db };
    d[0] = 1; let run = 0, best = -1, bestVal = 1;
    for (let tau = 1; tau <= this.tauMax; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const x = b[start + i] - b[start + i + tau]; s += x * x; }
      run += s; d[tau] = run > 0 ? s * tau / run : 1;
    }
    // first dip under the threshold, then walk to its local minimum
    const th = 0.15;
    for (let tau = this.tauMin; tau <= this.tauMax; tau++) {
      if (d[tau] < th) {
        while (tau + 1 <= this.tauMax && d[tau + 1] < d[tau]) tau++;
        best = tau; bestVal = d[tau]; break;
      }
    }
    if (best < 0) {
      // no clear dip: find the global minimum, then prefer the FIRST local minimum that is
      // nearly as good (a shorter period = the real note, not an octave below it)
      let g = 1e9;
      for (let tau = this.tauMin; tau <= this.tauMax; tau++) if (d[tau] < g) g = d[tau];
      if (g > 0.45) return { f0: 0, conf: 0, db };
      for (let tau = this.tauMin + 1; tau < this.tauMax; tau++) {
        if (d[tau] <= d[tau - 1] && d[tau] <= d[tau + 1] && d[tau] < g + 0.15) { best = tau; bestVal = d[tau]; break; }
      }
      if (best < 0) return { f0: 0, conf: 0, db };
    }
    let t = best;
    if (best > 1 && best < this.tauMax) { // parabolic interpolation
      const a = d[best - 1], c = d[best], e = d[best + 1], den = a - 2 * c + e;
      if (den !== 0) t = best + 0.5 * (a - e) / den;
    }
    return { f0: this.fsd / t, conf: Math.max(0, 1 - bestVal), db };
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    const fs = sampleRate;
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i];
      // ---- onset path (full rate)
      const h = this.hp2.step(this.hp1.step(x));
      this.eHF += h * h; this.eAll += x * x;
      if (++this.bi >= this.blk) {
        const eh = this.eHF / this.blk + 1e-12, ea = this.eAll / this.blk + 1e-12;
        this.env = Math.max(eh, this.env * this.envRel);
        this.lv = Math.max(ea, this.lv * this.lvRel);
        const envDb = 10 * Math.log10(this.env), lvDb = 10 * Math.log10(this.lv), eaDb = 10 * Math.log10(ea);
        const blockStart = (currentFrame + i + 1 - this.blk) / fs;
        const H = this.hist.length, prevIdx = (this.hi - this.lag + H) % H;
        const jump = envDb - this.hist[prevIdx];
        this.bb = Math.max(ea, (this.bb || 1e-12) * this.envRel);
        const bbDb = 10 * Math.log10(this.bb), bbJump = bbDb - this.bbHist[(this.hi - 15 + H) % H];   // ~22 ms back: catches soft picks
        const need = 4.5 / this.sens;
        const hit = (jump > need && envDb > lvDb - 50) || (bbJump > 8 / this.sens && bbDb > lvDb - 30);
        if (hit && eaDb > -70 && blockStart - this.lastOnset > 0.07) {
          // back-date to the block where the rise began
          let t = blockStart, k = (this.hi - 1 + H) % H, cur = envDb;
          for (let s2 = 0; s2 < this.lag; s2++) {
            if (this.hist[k] < cur - 1) { t = this.histT[k]; cur = this.hist[k]; k = (k - 1 + H) % H; } else break;
          }
          this.lastOnset = blockStart;
          this.port.postMessage({ type: 'onset', t, strength: jump, db: eaDb });
        }
        this.hist[this.hi] = envDb; this.histT[this.hi] = blockStart; this.bbHist[this.hi] = bbDb; this.hi = (this.hi + 1) % H;
        this.eHF = 0; this.eAll = 0; this.bi = 0;
      }
      // ---- pitch path (decimated)
      const l = this.lp2.step(this.lp1.step(x));
      this.acc += l;
      if (++this.decCount >= this.D) {
        let v = this.acc / this.D; this.acc = 0; this.decCount = 0;
        this.dc = 0.995 * this.dc + 0.005 * v; v -= this.dc;
        this.buf[this.w] = v; this.buf[this.w + this.N] = v;
        this.w = (this.w + 1) % this.N;
        if (++this.sinceHop >= this.hop) {
          this.sinceHop = 0;
          const r = this.yin();
          // time stamp = centre of the analysis window
          const tc = (currentFrame + i) / fs - (this.N / 2) / this.fsd;
          this.port.postMessage({ type: 'frame', t: tc, f0: r.f0, conf: r.conf, db: r.db });
        }
      }
    }
    return true;
  }
}
registerProcessor('oud-detector', OudDetector);
