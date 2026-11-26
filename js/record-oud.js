// Guided Oud Sample Recorder (docs/memory/oud-sound.md).
// Lets the owner record clean, labeled single-note WAVs with zero talking:
// 1. Confirms 5th string = فا قرار (Fa low, 41) and runs a live open-string tune check.
// 2. Walks through every string (thickest to thinnest), fingers 0–4, half-flats (مي½♭, سي½♭),
//    ↓ down (صد) ×3 and ↑ up (رد) ×3, plus fast alternating and tremolo extras on string 3.
// 3. Checks pitch live on every pluck, coaches in plain words, keeps only good takes,
//    supports multiple runs, and packs everything into one .zip (WAVs + manifest.json).

import { nameOf } from './notes.js';
import { analyzeFrame, frameSize, hzToMidi, latinName, IN_TUNE, StringTracker } from './tuner.js';

const OUT_SR = 32000;          // 32 kHz mono 16-bit PCM WAV (clean, compact, matches oud-sound.md)
const PREROLL_S = 0.12;        // keep 120 ms before onset so pick attack is never clipped
const RING_S = 2.6;            // capture 2.6 s after onset for single notes
const FAST_S = 4.0;            // 8x fast alternating capture duration
const TREM_S = 5.5;            // 5 s tremolo capture duration
const CHECK_START_S = 0.08;    // skip initial pick transient when checking pitch
const CHECK_END_S = 0.52;      // evaluate pitch within first ~0.5 s
const OPEN_TOL = 15;           // cents tolerance for open strings
const FINGER_TOL = 35;         // cents tolerance for fingered notes (matches oud-sound.md)
const HF_TOL = 30;             // cents tolerance for half-flats (مي½♭, سي½♭)

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};

// Build Fable's exact sequence from docs/memory/oud-sound.md
export function buildPlan(strings, mode = 'full') {
  const ordered = [...strings].sort((a, b) => b.n - a.n); // thickest -> thinnest
  const list = mode === 'quick' ? ordered.filter((s) => s.n === 3) : ordered;
  const steps = [];
  const addNote = (s, finger, midi, ar, label, opts = {}) => {
    for (const stroke of ['down', 'up']) {
      for (let rep = 1; rep <= 3; rep++) {
        steps.push({
          kind: 'note',
          string: s.n,
          stringAr: s.ar,
          finger,
          midi,
          ar,
          label,
          stroke,
          rep,
          totalReps: 3,
          halfFlat: !!opts.halfFlat,
          tag: opts.tag || `s${s.n}_f${finger}`,
        });
      }
    }
  };

  for (const s of list) {
    // Open string
    addNote(s, 0, s.midi, s.ar, `String ${s.n} · open`);
    // Finger 1 (+2 semitones)
    const f1 = nameOf(s.midi + 2);
    addNote(s, 1, s.midi + 2, f1.ar, `String ${s.n} · finger 1`);
    // Half-flat مي½♭ on string 3 (51.3)
    if (s.n === 3) {
      addNote(s, 1, 51.3, 'مي½♭', 'String 3 · finger 1 (half-flat)', { halfFlat: true, tag: 's3_f1_hf' });
    }
    // Finger 2 (+3 semitones)
    const f2 = nameOf(s.midi + 3);
    addNote(s, 2, s.midi + 3, f2.ar, `String ${s.n} · finger 2`);
    // Half-flat سي½♭ on string 2 (58.3)
    if (s.n === 2) {
      addNote(s, 2, 58.3, 'سي½♭', 'String 2 · finger 2 (half-flat)', { halfFlat: true, tag: 's2_f2_hf' });
    }
    // Finger 3 (+4 semitones)
    const f3 = nameOf(s.midi + 4);
    addNote(s, 3, s.midi + 4, f3.ar, `String ${s.n} · finger 3`);
    // Finger 4 (+5 semitones)
    const f4 = nameOf(s.midi + 5);
    addNote(s, 4, s.midi + 5, f4.ar, `String ${s.n} · finger 4`);
  }

  // Two extras on string 3 (ري open)
  const s3 = ordered.find((s) => s.n === 3);
  if (s3) {
    steps.push({
      kind: 'extra',
      extraType: 'fast8',
      string: 3,
      stringAr: s3.ar,
      finger: 0,
      midi: s3.midi,
      ar: s3.ar,
      label: 'String 3 · open · 8× fast صد رد',
      stroke: 'alt',
      rep: 1,
      totalReps: 1,
      tag: 's3_open_fast8',
      dur: FAST_S,
    });
    steps.push({
      kind: 'extra',
      extraType: 'tremolo',
      string: 3,
      stringAr: s3.ar,
      finger: 0,
      midi: s3.midi,
      ar: s3.ar,
      label: 'String 3 · open · 5 s tremolo',
      stroke: 'trem',
      rep: 1,
      totalReps: 1,
      tag: 's3_open_tremolo',
      dur: TREM_S,
    });
  }
  return steps;
}

// Linear resample Float32Array to target sample rate and encode 16-bit mono WAV
function encodeWav16(samples, srcSr, dstSr = OUT_SR) {
  let pcm;
  if (srcSr === dstSr) {
    pcm = samples;
  } else {
    const ratio = srcSr / dstSr;
    const outLen = Math.max(1, Math.floor(samples.length / ratio));
    pcm = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = samples[idx] || 0;
      const b = samples[Math.min(samples.length - 1, idx + 1)] || 0;
      pcm[i] = a + (b - a) * frac;
    }
  }
  // Gentle 15 ms fade-out at end to avoid clicks
  const fadeN = Math.min(Math.floor(dstSr * 0.015), pcm.length);
  for (let i = 0; i < fadeN; i++) pcm[pcm.length - 1 - i] *= i / fadeN;

  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);          // PCM
  v.setUint16(22, 1, true);          // mono
  v.setUint32(24, dstSr, true);
  v.setUint32(28, dstSr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

// Compact fingerboard SVG showing the target string & finger (1..4, or open circle at nut)
function miniNeckSVG(stringNo, finger, count, halfFlat) {
  const rows = count === 5 ? [5, 4, 3, 2, 1] : [6, 5, 4, 3, 2, 1];
  const W = 260, H = rows.length * 18 + 16;
  const xNut = 32, xEnd = W - 14;
  const fingerX = [xNut, 76, 122, 168, 214];
  let out = `<svg viewBox="0 0 ${W} ${H}" class="ro-neck-svg" aria-hidden="true">`;
  out += `<line x1="${xNut}" y1="8" x2="${xNut}" y2="${H - 8}" stroke="currentColor" stroke-width="3" opacity="0.5"/>`;
  rows.forEach((n, i) => {
    const y = 16 + i * 18;
    const active = n === stringNo;
    out += `<line x1="${xNut}" y1="${y}" x2="${xEnd}" y2="${y}" stroke="currentColor" stroke-width="${active ? 2.4 : 1}" opacity="${active ? 0.95 : 0.25}"/>`;
    out += `<text x="14" y="${y + 4}" font-size="11" text-anchor="middle" fill="currentColor" opacity="${active ? 1 : 0.45}">S${n}</text>`;
    if (active) {
      let cx = fingerX[Math.min(4, finger)] || xNut;
      if (halfFlat) cx -= 11; // slightly toward the nut
      if (finger === 0) {
        out += `<circle cx="${xNut}" cy="${y}" r="6.5" fill="var(--bg)" stroke="var(--gold)" stroke-width="2.6"/>`;
      } else {
        out += `<circle cx="${cx}" cy="${y}" r="8" fill="var(--gold)"/>`;
        out += `<text x="${cx}" y="${y + 3.5}" font-size="10.5" font-weight="800" text-anchor="middle" fill="var(--on-gold)">${finger}</text>`;
      }
    }
  });
  out += '</svg>';
  return out;
}

export function createOudRecorder({ $, el, audioCtx, playNote, strings, setString5Fa, toast, zipBlob }) {
  let phase = 'tune';          // 'tune' | 'record' | 'done'
  let mode = 'full';           // 'full' | 'quick'
  let runNo = 1;
  let plan = [];
  let idx = 0;
  let takes = [];              // [{ id, run, file, wav: Uint8Array, meta }]
  let tunedSet = new Set();    // string numbers confirmed in tune during Phase 0
  let tunedHold = { n: null, since: 0 };

  // Audio graph state
  let running = false;
  let stream = null, src = null, lp1 = null, lp2 = null, ana = null, proc = null, sink = null;
  let raf = 0, buf = null, sr = 48000;
  let tracker = null;

  // Ring buffer for pre-roll + active capture
  let ring = null, ringPos = 0;
  let floorDb = -75, lastFrameT = 0;
  let cap = null;              // active capture object
  let cooldownUntil = 0;
  let playAudioUrl = null, playAudioEl = null;

  const curStrings = () => strings();
  const isString5Fa = () => {
    const s5 = curStrings().find((s) => s.n === 5);
    return !!(s5 && s5.midi === 41);
  };

  function resetCapture() {
    cap = null;
    cooldownUntil = performance.now() / 1000 + 0.35;
  }

  function stopMic() {
    running = false;
    cancelAnimationFrame(raf);
    cap = null;
    if (proc) { proc.onaudioprocess = null; try { proc.disconnect(); } catch (_) {} proc = null; }
    if (sink) { try { sink.disconnect(); } catch (_) {} sink = null; }
    if (ana) { try { ana.disconnect(); } catch (_) {} ana = null; }
    if (lp2) { try { lp2.disconnect(); } catch (_) {} lp2 = null; }
    if (lp1) { try { lp1.disconnect(); } catch (_) {} lp1 = null; }
    if (src) { try { src.disconnect(); } catch (_) {} src = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    updateMicButtons();
  }

  async function startMic() {
    if (running) { stopMic(); return; }
    try {
      const ctx = audioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
      sr = ctx.sampleRate;
      src = ctx.createMediaStreamSource(stream);
      lp1 = ctx.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = 2000; lp1.Q.value = 0.707;
      lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 2000; lp2.Q.value = 0.707;
      ana = ctx.createAnalyser();
      const need = frameSize(sr);
      let n = 1024; while (n < need) n <<= 1;
      ana.fftSize = n;
      buf = new Float32Array(n);
      src.connect(lp1); lp1.connect(lp2); lp2.connect(ana);

      // Raw mono capture into rolling pre-roll buffer + active capture chunks
      const ringLen = Math.ceil(sr * PREROLL_S);
      ring = new Float32Array(ringLen);
      ringPos = 0;
      proc = ctx.createScriptProcessor(2048, 1, 1);
      sink = ctx.createGain(); sink.gain.value = 0;
      proc.onaudioprocess = (ev) => {
        const ch = ev.inputBuffer.getChannelData(0);
        if (cap && cap.recording) {
          const copy = new Float32Array(ch.length);
          copy.set(ch);
          cap.chunks.push(copy);
          cap.samples += ch.length;
        }
        // Always update rolling pre-roll ring
        for (let i = 0; i < ch.length; i++) {
          ring[ringPos] = ch[i];
          ringPos = (ringPos + 1) % ring.length;
        }
      };
      src.connect(proc); proc.connect(sink); sink.connect(ctx.destination);

      tracker = new StringTracker(curStrings());
      floorDb = -75;
      lastFrameT = performance.now() / 1000;
      cooldownUntil = lastFrameT + 0.3;
      running = true;
      updateMicButtons();
      loop();
    } catch (e) {
      toast('Microphone access is needed to tune and record.');
      stopMic();
    }
  }

  function snapshotPreRoll() {
    const out = new Float32Array(ring.length);
    const tail = ring.length - ringPos;
    out.set(ring.subarray(ringPos), 0);
    out.set(ring.subarray(0, ringPos), tail);
    return out;
  }

  function setStatus(state, text) {
    const msg = $('#roMsg');
    const card = $('#roCard');
    if (msg) msg.textContent = text;
    if (card) card.dataset.state = state; // 'idle' | 'listen' | 'ok' | 'warn'
  }

  function setLevel(db) {
    const pct = Math.max(0, Math.min(100, ((db + 75) / 60) * 100));
    const bar = phase === 'tune' ? $('#roTuneLvl') : $('#roLvl');
    if (bar) bar.style.width = `${pct}%`;
  }

  // Pick the YIN candidate closest to targetMidi (handles 2nd/3rd harmonics on low strings cleanly)
  function pickCandidate(cands, targetMidi) {
    if (!cands || !cands.length) return null;
    let best = null, bestDist = 1e9;
    for (const c of cands) {
      const m = hzToMidi(c.f);
      const dist = Math.abs(m - targetMidi);
      if (dist < bestDist) { bestDist = dist; best = { midi: m, dist, d: c.d, k: c.k }; }
    }
    return best;
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const t = performance.now() / 1000;
    const dt = Math.min(0.2, Math.max(0.005, t - lastFrameT));
    lastFrameT = t;

    ana.getFloatTimeDomainData(buf);
    const fr = analyzeFrame(buf, sr);
    setLevel(fr.db);

    if (phase === 'tune') {
      handleTuneFrame(fr, t);
    } else if (phase === 'record') {
      handleRecordFrame(fr, t, dt);
    }
  }

  function handleTuneFrame(fr, t) {
    const st = tracker.push(fr, t);
    const outNote = $('#roTuneNote');
    const outCents = $('#roTuneCents');
    const outHint = $('#roTuneHint');
    const card = $('#roTuneCard');
    if (!st.string || st.mode === 'wait') {
      if (outHint) outHint.textContent = 'Play one open string at a time';
      if (card) card.dataset.state = 'listen';
      tunedHold.n = null;
      return;
    }
    const cents = Math.round(st.cents || 0);
    const inTune = Math.abs(cents) <= IN_TUNE;
    if (outNote) outNote.innerHTML = `<bdi class="ar">${st.string.ar}</bdi> <small>S${st.string.n} · ${latinName(st.string.midi)}</small>`;
    if (outCents) outCents.textContent = `${cents > 0 ? '+' : ''}${cents}¢`;
    if (card) card.dataset.state = inTune ? 'ok' : 'warn';
    if (inTune) {
      if (outHint) outHint.textContent = '✓ In tune — hold steady';
      if (tunedHold.n !== st.string.n) { tunedHold = { n: st.string.n, since: t }; }
      else if (t - tunedHold.since >= 0.35 && !tunedSet.has(st.string.n)) {
        tunedSet.add(st.string.n);
        renderTuneChips();
        if (outHint) outHint.textContent = `✓ String ${st.string.n} in tune!`;
      }
    } else {
      tunedHold.n = null;
      if (outHint) outHint.textContent = cents < 0 ? 'Too low — tighten peg' : 'Too high — loosen peg';
    }
  }

  function handleRecordFrame(fr, t, dt) {
    const step = plan[idx];
    if (!step) return;

    // Adaptive noise floor (only updates when not actively capturing)
    if (!cap) {
      if (fr.db < floorDb) floorDb = Math.max(-90, fr.db);
      else floorDb = Math.min(-45, floorDb + dt * 1.2);
    }

    // Start capture on level jump
    if (!cap && t >= cooldownUntil) {
      const jump = fr.db - floorDb;
      if (jump >= 7 && fr.db > -52) {
        const pre = snapshotPreRoll();
        cap = {
          startT: t,
          recording: true,
          chunks: [pre],
          samples: pre.length,
          midis: [],
          allMidis: [],
          peakDb: fr.db,
          checked: false,
          passed: false,
          targetDur: step.kind === 'extra' ? step.dur : RING_S,
        };
        setStatus('listen', step.kind === 'extra' ? 'Recording… keep going' : 'Listening… let it ring');
      }
      return;
    }

    if (!cap) return;
    const elapsed = t - cap.startT;
    if (fr.db > cap.peakDb) cap.peakDb = fr.db;

    // Collect pitch during evaluation window
    if (step.kind === 'note' && !cap.checked && elapsed >= CHECK_START_S && elapsed <= CHECK_END_S) {
      if (fr.cands.length && fr.clarity > 0.45) {
        const near = pickCandidate(fr.cands, step.midi);
        if (near) cap.midis.push(near.midi);
        const top = hzToMidi(fr.cands[0].f);
        cap.allMidis.push(top);
      }
    }

    // Evaluate pitch once check window ends
    if (step.kind === 'note' && !cap.checked && elapsed > CHECK_END_S) {
      cap.checked = true;
      const med = median(cap.midis);
      if (med == null) {
        cap.recording = false;
        setStatus('warn', 'Too quiet — pluck a bit firmer');
        resetCapture();
        return;
      }
      const cents = Math.round((med - step.midi) * 100);
      const tol = step.finger === 0 ? OPEN_TOL : step.halfFlat ? HF_TOL : FINGER_TOL;
      if (Math.abs(cents) <= tol) {
        cap.passed = true;
        cap.measuredMidi = +med.toFixed(3);
        cap.cents = cents;
        setStatus('ok', `✓ Great (${cents > 0 ? '+' : ''}${cents}¢) — let ring`);
      } else {
        cap.recording = false;
        let msg;
        if (Math.abs(cents) > 120) {
          const heard = nameOf(median(cap.allMidis) || med);
          msg = `Heard ${heard.ar} — need ${step.ar}`;
        } else if (step.finger === 0) {
          msg = cents < 0 ? `Retune peg (${cents}¢)` : `Retune peg (+${cents}¢)`;
        } else {
          msg = cents < 0
            ? `Too low (${cents}¢) — slide toward body`
            : `Too high (+${cents}¢) — slide toward pegs`;
        }
        setStatus('warn', msg);
        resetCapture();
        return;
      }
    }

    // Finish capture when duration reached
    const needSamples = Math.floor((cap.targetDur + PREROLL_S) * sr);
    if (elapsed >= cap.targetDur || cap.samples >= needSamples) {
      cap.recording = false;
      const full = new Float32Array(cap.samples);
      let off = 0;
      for (const c of cap.chunks) { full.set(c, off); off += c.length; }
      const wav = encodeWav16(full, sr, OUT_SR);
      const file = `run${runNo}_${step.tag}_${step.stroke}_${step.rep}.wav`;
      const take = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        run: runNo,
        file,
        wav,
        meta: {
          file,
          run: runNo,
          kind: step.kind,
          extraType: step.extraType || null,
          string: step.string,
          finger: step.finger,
          ar: step.ar,
          halfFlat: !!step.halfFlat,
          stroke: step.stroke,
          rep: step.rep,
          targetMidi: step.midi,
          measuredMidi: cap.measuredMidi ?? null,
          cents: cap.cents ?? null,
          peakDb: Math.round(cap.peakDb * 10) / 10,
          sampleRate: OUT_SR,
          durationS: +(full.length / sr).toFixed(2),
          recordedAt: new Date().toISOString(),
        },
      };
      // Replace any previous take for the exact same slot in this run
      takes = takes.filter((x) => x.file !== file);
      takes.push(take);
      cap = null;
      cooldownUntil = t + 0.55;

      // Advance to next step
      idx++;
      if (idx >= plan.length) {
        stopMic();
        phase = 'done';
        render();
      } else {
        renderRecordStep();
        setStatus('ok', '✓ Saved! Ready for next');
      }
    }
  }

  function updateMicButtons() {
    const tb = $('#roTuneStart');
    if (tb) tb.textContent = running ? '⏹ Stop tune check' : '🎤 Check tuning';
    const rb = $('#roStart');
    if (rb) rb.textContent = running ? '⏸ Pause mic' : '🎤 Start listening';
  }

  function renderTuneChips() {
    const box = $('#roTuneList');
    if (!box) return;
    box.innerHTML = '';
    const ordered = [...curStrings()].sort((a, b) => b.n - a.n);
    for (const s of ordered) {
      const done = tunedSet.has(s.n);
      const b = el('button', 'ro-str' + (done ? ' ok' : ''),
        `<b>S${s.n} · <bdi class="ar">${s.ar}</bdi>${s.n === 5 && s.midi === 41 ? ' قرار' : ''}</b>` +
        `<small>${done ? '✓ In tune' : latinName(s.midi) + ' · tap to hear'}</small>`);
      b.type = 'button';
      b.addEventListener('click', () => {
        playNote(s.midi, 0, 1.4, 0.7);
        if (tracker) tracker.lock(s.n);
      });
      box.append(b);
    }
  }

  function renderRecordStep() {
    const step = plan[idx];
    if (!step) return;
    const total = plan.length;
    $('#roProgFill').style.width = `${Math.round((idx / total) * 100)}%`;
    $('#roProgTxt').textContent = `Run ${runNo} · Step ${idx + 1} of ${total} · ${takes.length} saved`;
    $('#roNote').textContent = step.ar;
    $('#roWhere').textContent = step.label;
    const strokeText = step.kind === 'extra'
      ? (step.extraType === 'fast8' ? '↓↑ 8× fast alternating (صد رد)' : '↓↑ 5 seconds steady tremolo')
      : `${step.stroke === 'down' ? '↓ Down (صد)' : '↑ Up (رد)'} · ${step.rep} of ${step.totalReps}`;
    $('#roStroke').textContent = strokeText;
    $('#roNeck').innerHTML = miniNeckSVG(step.string, step.finger, curStrings().length, step.halfFlat);
    if (!running) setStatus('idle', 'Tap Start listening, then pluck');
    else setStatus('listen', step.kind === 'extra' ? 'Play when ready' : `Play ${step.stroke === 'down' ? '↓ down' : '↑ up'} — let ring`);
    const expBtn = $('#roExportMid');
    if (expBtn) {
      expBtn.hidden = !takes.length;
      expBtn.textContent = `📦 Export .zip (${takes.length})`;
    }
    const playBtn = $('#roPlayLast');
    if (playBtn) playBtn.disabled = !takes.length;
    const redoBtn = $('#roRedo');
    if (redoBtn) redoBtn.disabled = idx === 0 && !takes.length;
  }

  function render() {
    const view = $('#recordOudView');
    if (!view) return;
    $('#roPhaseTune').hidden = phase !== 'tune';
    $('#roPhaseRecord').hidden = phase !== 'record';
    $('#roPhaseDone').hidden = phase !== 'done';
    window.scrollTo(0, 0);

    if (phase === 'tune') {
      const okFa = isString5Fa();
      const s5 = curStrings().find((s) => s.n === 5);
      const box = $('#roFaCheck');
      if (okFa) {
        box.className = 'ro-fa ok';
        box.innerHTML = '<b>✓ String 5 is set to <bdi class="ar">فا قرار</bdi> (Fa low · 87 Hz)</b>' +
          '<small>Matches your oud. Tune all strings below, then tap Start recording.</small>';
      } else {
        box.className = 'ro-fa warn';
        box.innerHTML = `<b>String 5 is currently <bdi class="ar">${s5 ? s5.ar : '—'}</bdi> — switch to <bdi class="ar">فا قرار</bdi>?</b>` +
          '<small>Your oud uses Fa (low) on String 5. Tap below to set it before tuning.</small>' +
          '<button class="btn primary wide" id="roSetFa" type="button" style="margin-top:8px">Set String 5 to فا قرار</button>';
        $('#roSetFa').addEventListener('click', () => {
          setString5Fa();
          tunedSet.delete(5);
          if (tracker) tracker.setStrings(curStrings());
          render();
          toast('String 5 set to فا قرار (Fa low).');
        });
      }
      $$('#roModeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
      renderTuneChips();
      updateMicButtons();
    } else if (phase === 'record') {
      renderRecordStep();
      updateMicButtons();
    } else if (phase === 'done') {
      const noteTakes = takes.filter((t) => t.meta.cents != null);
      const avgCents = noteTakes.length
        ? Math.round(noteTakes.reduce((s, t) => s + Math.abs(t.meta.cents), 0) / noteTakes.length)
        : 0;
      $('#roDoneStats').innerHTML =
        `<b>Run ${runNo} complete — ${takes.length} clean recordings saved</b>` +
        `<small>Average tuning accuracy: ±${avgCents}¢ · 32 kHz WAV + manifest.json ready to share.</small>`;
      $('#roExportDone').textContent = `📦 Export .zip (${takes.length} files)`;
      $('#roNextRun').textContent = `🔁 Start Run ${runNo + 1}`;
    }
  }

  async function exportZip() {
    if (!takes.length) { toast('No recordings saved yet.'); return; }
    toast(`Packing ${takes.length} WAV files…`, 2500);
    const enc = new TextEncoder();
    const manifest = {
      app: 'Oud Coach — Record My Oud',
      exportedAt: new Date().toISOString(),
      courses: curStrings().length,
      strings: curStrings(),
      runs: runNo,
      count: takes.length,
      takes: takes.map((t) => t.meta),
    };
    const entries = [
      { name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 2)) },
      ...takes.map((t) => ({ name: t.file, data: t.wav })),
    ];
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    const name = `oud-samples-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.zip`;
    const file = new File([zipBlob(entries)], name, { type: 'application/zip' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Oud samples (${takes.length})` });
        toast('Shared! Send it to Antigravity / Claude.');
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    toast('Saved .zip file. Send it in chat.');
    return 'downloaded';
  }

  function playLastTake() {
    if (!takes.length) return;
    const last = takes[takes.length - 1];
    if (playAudioEl) { playAudioEl.pause(); playAudioEl = null; }
    if (playAudioUrl) { URL.revokeObjectURL(playAudioUrl); playAudioUrl = null; }
    playAudioUrl = URL.createObjectURL(new Blob([last.wav], { type: 'audio/wav' }));
    playAudioEl = new Audio(playAudioUrl);
    playAudioEl.play().catch(() => {});
  }

  // Bind UI controls once
  const $$ = (s) => [...document.querySelectorAll(s)];
  $$('#roModeSeg button').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.m;
    render();
  }));
  $('#roTuneStart').addEventListener('click', () => startMic());
  $('#roGoRecord').addEventListener('click', async () => {
    const wasRunning = running;
    plan = buildPlan(curStrings(), mode);
    idx = 0;
    phase = 'record';
    render();
    if (!wasRunning) await startMic();
    else resetCapture();
  });
  $('#roStart').addEventListener('click', () => startMic());
  $('#roHear').addEventListener('click', () => {
    const step = plan[idx];
    if (step) playNote(step.midi, 0, 1.4, 0.7);
  });
  $('#roRedo').addEventListener('click', () => {
    if (idx > 0) idx--;
    const step = plan[idx];
    if (step) {
      const f = `run${runNo}_${step.tag}_${step.stroke}_${step.rep}.wav`;
      takes = takes.filter((x) => x.file !== f);
    }
    resetCapture();
    renderRecordStep();
    toast('Ready to redo this note.');
  });
  $('#roPlayLast').addEventListener('click', playLastTake);
  $('#roSkip').addEventListener('click', () => {
    resetCapture();
    idx++;
    if (idx >= plan.length) { stopMic(); phase = 'done'; render(); }
    else renderRecordStep();
  });
  $('#roBackTune').addEventListener('click', () => {
    stopMic();
    phase = 'tune';
    render();
  });
  $('#roExportMid').addEventListener('click', exportZip);
  $('#roExportDone').addEventListener('click', exportZip);
  $('#roNextRun').addEventListener('click', async () => {
    runNo++;
    plan = buildPlan(curStrings(), mode);
    idx = 0;
    phase = 'record';
    render();
    await startMic();
  });
  $('#roDoneTune').addEventListener('click', () => {
    stopMic();
    phase = 'tune';
    render();
  });

  return {
    render,
    stop: stopMic,
    start: startMic,
    exportZip,
    getState: () => ({ phase, mode, runNo, idx, total: plan.length, saved: takes.length, isString5Fa: isString5Fa() }),
  };
}
