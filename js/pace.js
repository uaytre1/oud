// Right hand (risha): a metronome, the mic hears every stroke, and the app says how close each stroke was to
// its place in the pattern. Patterns:
//  - steady: 1, 2 (down-up) or 4 (tremolo) strokes per beat on one open string;
//  - three tarab rhythms from the owner's lesson video (a.oudd, 2026-11-23), measured from his playing:
//    إيقاع عربي (4 strokes: ↓ ↑ ↓ ↓bass, even), مقسوم (5 strokes on 8 steps: bass ↓ . ↓ bass . ↓ .,
//    gaps measured 1-2-1-2-2), رومبا (8 even strokes grouped 3-3-2).
// "On the Bayati scale" walks one scale note per cycle (the video's تطبيق التمرين): the bass strokes stay on a
// low string, the others play the note shown. A steady mic delay (≤ 0.15 s, the median) is removed first.
import { audioCtx, click, stopAll } from './audio.js';
import { NOTES } from './notes.js';

export const PATTERNS = {
  s1: { name: '1 per beat', perBeat: 1, slots: 1, strokes: [{ s: 0, d: '↓' }] },
  s2: { name: '2 per beat', perBeat: 2, slots: 2, strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↑' }] },
  s4: { name: '4 per beat', perBeat: 4, slots: 4, strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↑' }, { s: 2, d: '↓' }, { s: 3, d: '↑' }] },
  arabi: { name: 'إيقاع عربي', count: 4, perBeat: 2, slots: 4,
    strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↑' }, { s: 2, d: '↓' }, { s: 3, d: '↓', bass: true }] },
  maqsum: { name: 'مقسوم', count: 5, perBeat: 2, slots: 8,
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 1, d: '↓' }, { s: 3, d: '↓' }, { s: 4, d: '↓', bass: true }, { s: 6, d: '↓' }] },
  rumba: { name: 'رومبا', count: 8, perBeat: 2, slots: 8,
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 1, d: '↓' }, { s: 2, d: '↑' }, { s: 3, d: '↓', acc: true }, { s: 4, d: '↓' }, { s: 5, d: '↑' }, { s: 6, d: '↓', acc: true }, { s: 7, d: '↑' }] },
};
const SCALE = ['re', 'mi', 'fa', 'sol', 'la', 'si', 'do', 'reH', 'do', 'si', 'la', 'sol', 'fa', 'mi', 're'];   // Bayati on ري, up and back
const BASS_MAX = 47.5;          // a stroke below this (strings 4–6: لا, صول, فا) counts as a bass stroke
const TOTAL_BEATS = 32;

export function createPace({ $, el, listener, store, toast, onDone }) {
  const st = {
    bpm: store.get('pace.bpm', 60), pat: store.get('pace.pat', 's1'), clickOn: store.get('pace.click', true),
    scale: store.get('pace.scale', false), active: false, raf: 0, gen: 0,
  };
  if (!PATTERNS[st.pat]) st.pat = 's1';
  const ui = {
    bpm: $('#paceBpm'), go: $('#paceGo'), dot: $('#paceDot'), count: $('#paceCount'), lane: $('#paceLane'),
    msg: $('#paceMsg'), result: $('#paceResult'), clickSw: $('#paceClick'), scaleSw: $('#paceScale'),
    boxes: $('#pacePattern'), note: $('#paceNote'),
  };
  const P = () => PATTERNS[st.pat];
  const where = (n) => (n.finger ? `String ${n.string} · finger ${n.finger}` : `String ${n.string} · open`);

  function drawBoxes(cur = -1) {
    const p = P(); ui.boxes.innerHTML = '';
    for (let s = 0; s < p.slots; s++) {
      const k = p.strokes.find((x) => x.s === s);
      const b = el('span', 'pbox' + (k ? '' : ' rest') + (k && k.bass ? ' bass' : '') + (k && k.acc ? ' acc' : '') + (s === cur ? ' now' : ''),
        k ? `${k.d}${k.bass ? '<small>قرار</small>' : ''}` : '·');
      ui.boxes.append(b);
    }
  }
  function render() {
    ui.bpm.textContent = st.bpm;
    document.querySelectorAll('#pacePats button').forEach((b) => b.classList.toggle('on', b.dataset.pat === st.pat));
    ui.clickSw.checked = st.clickOn; ui.scaleSw.checked = st.scale;
    ui.go.textContent = st.active ? '■ Stop' : '🎤 Start';
    ui.go.classList.toggle('stop', st.active);
    if (!st.active) { drawBoxes(); showNote(st.scale ? NOTES[SCALE[0]] : null); }
  }
  function showNote(n) { ui.note.innerHTML = n ? `<b class="ar">${n.ar}</b><small>${where(n)} · bass strokes on a low string</small>` : ''; }
  function setBpm(v) { st.bpm = Math.max(40, Math.min(160, v)); store.set('pace.bpm', st.bpm); render(); }
  $('#paceMinus').addEventListener('click', () => !st.active && setBpm(st.bpm - 5));
  $('#pacePlus').addEventListener('click', () => !st.active && setBpm(st.bpm + 5));
  document.querySelectorAll('#pacePats button').forEach((b) => b.addEventListener('click', () => {
    if (st.active) return; st.pat = b.dataset.pat; store.set('pace.pat', st.pat); render();
  }));
  ui.clickSw.addEventListener('change', (e) => { st.clickOn = e.target.checked; store.set('pace.click', st.clickOn); });
  ui.scaleSw.addEventListener('change', (e) => { st.scale = e.target.checked; store.set('pace.scale', st.scale); render(); });
  ui.go.addEventListener('click', () => (st.active ? stop(true) : start()));

  function plot(off, tol, cls) {
    const w = ui.lane.clientWidth || 300, x = w / 2 + Math.max(-1, Math.min(1, off / 0.15)) * (w / 2 - 10);
    const d = el('i', 'pdot ' + cls); d.style.left = `${x.toFixed(1)}px`; ui.lane.append(d);
    const all = ui.lane.querySelectorAll('.pdot'); if (all.length > 24) all[0].remove();
  }

  async function start() {
    const gen = ++st.gen, p = P();
    ui.result.hidden = true; ui.lane.querySelectorAll('.pdot').forEach((d) => d.remove());
    ui.msg.textContent = 'Opening the microphone…';
    try { if (!(await listener.start()) || gen !== st.gen) return; }
    catch (e) { ui.msg.textContent = 'The microphone is blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.'; return; }
    const ac = audioCtx(); ac.resume();
    const beat = 60 / st.bpm, step = beat / p.perBeat, cycle = p.slots * step;
    const cycles = Math.max(4, Math.round(TOTAL_BEATS * beat / cycle)), t0 = ac.currentTime + 0.4, play0 = t0 + 4 * beat;
    const end = play0 + cycles * cycle;
    // every stroke of the run: its time, its pattern entry, and (on the scale) the note to play
    const targets = [];
    for (let c = 0; c < cycles; c++) {
      const note = st.scale ? NOTES[SCALE[c % SCALE.length]] : null;
      for (const k of p.strokes) targets.push({ t: play0 + c * cycle + k.s * step, k, c, note });
    }
    for (let k = 0; k < 4; k++) click(t0 + k * beat, k === 0);                         // count-in, always heard
    if (st.clickOn) for (let k = 0; k * beat < cycles * cycle - 1e-6; k++) click(play0 + k * beat, Math.abs((k * beat) % cycle) < 1e-6);
    const picks = [];
    st.active = true; render();
    listener.onFrame = null;
    // the clicks are 1.2–1.8 kHz: a "note" above the oud's range is the metronome, not a stroke
    listener.onNote = (n) => { if (!n.legato && n.midi > 34 && n.midi < 72 && n.t > play0 - step && n.t < end + step) picks.push(n); };
    st.offs = []; st.lat = 0; st.shown = 0;
    const tol = Math.max(0.03, Math.min(0.07, 0.25 * step));
    const tick = () => {
      if (!st.active || gen !== st.gen) return;
      const now = ac.currentTime;
      if (now < play0) {
        ui.count.textContent = String(4 - Math.floor((now - t0) / beat));
        ui.msg.textContent = 'Get ready: start on the first beat after the count.';
        if (st.scale) showNote(targets[0].note);
      } else {
        const inC = (now - play0) % cycle, c = Math.floor((now - play0) / cycle), slot = Math.floor(inC / step + 1e-6);
        ui.count.textContent = String(Math.floor(inC / beat) + 1);
        ui.dot.classList.toggle('on', ((now - play0) % beat) < 0.1);
        drawBoxes(slot);
        if (st.scale) showNote(NOTES[SCALE[c % SCALE.length]]);
        ui.msg.textContent = `Cycle ${Math.min(cycles, c + 1)} of ${cycles}`;
        while (st.shown < picks.length && picks[st.shown].t < now - step / 2) {
          const n = picks[st.shown++], tg = nearest(targets, n.t);
          const off = n.t - tg.t; st.offs.push(off);
          const s = [...st.offs].sort((x, y) => x - y); st.lat = st.offs.length >= 3 ? Math.max(-0.05, Math.min(0.15, s[s.length >> 1])) : 0;
          const o = off - st.lat, wrongString = !!tg.k.bass !== n.midi < BASS_MAX;
          plot(o, tol, wrongString ? 'miss' : Math.abs(o) <= tol ? 'ok' : o < 0 ? 'early' : 'late');
        }
      }
      if (now > end + 0.4) { finish(picks, targets, step, tol); return; }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }
  function nearest(targets, t) { let b = targets[0]; for (const x of targets) if (Math.abs(x.t - t) < Math.abs(b.t - t)) b = x; return b; }

  function stop(cancelled) {
    st.gen++; cancelAnimationFrame(st.raf);
    if (st.active) { listener.onNote = null; listener.stop(); stopAll(); }
    st.active = false; ui.dot.classList.remove('on'); ui.count.textContent = '';
    if (cancelled) ui.msg.textContent = 'Stopped. Tap Start to go again.';
    render();
  }

  function finish(picks, targets, step, tol) {
    stop(false);
    // each stroke of the pattern takes the nearest pick within half a step
    const got = targets.map(() => null);
    for (const n of picks) {
      let bi = -1; for (let i = 0; i < targets.length; i++) if (bi < 0 || Math.abs(targets[i].t - n.t) < Math.abs(targets[bi].t - n.t)) bi = i;
      if (bi < 0 || Math.abs(targets[bi].t - n.t) > step / 2) continue;
      if (!got[bi] || Math.abs(n.t - targets[bi].t) < Math.abs(got[bi].t - targets[bi].t)) got[bi] = n;
    }
    const hits = got.map((n, i) => n && { n, tg: targets[i], off: n.t - targets[i].t }).filter(Boolean);
    if (hits.length < targets.length / 4) { ui.msg.textContent = 'Too few strokes heard. Play a little louder or closer to the phone.'; return null; }
    const offs = hits.map((h) => h.off).sort((a, b) => a - b), lat = Math.max(-0.05, Math.min(0.15, offs[offs.length >> 1]));
    const adj = hits.map((h) => h.off - lat);
    const onBeat = adj.filter((o) => Math.abs(o) <= tol).length, missed = targets.length - hits.length;
    const mean = adj.reduce((s, o) => s + o, 0) / adj.length;
    const sd = Math.sqrt(adj.reduce((s, o) => s + (o - mean) ** 2, 0) / adj.length);
    // bass strokes must be on a low string, the others on a higher one
    const bassT = hits.filter((h) => h.tg.k.bass), bassOk = bassT.filter((h) => h.n.midi < BASS_MAX).length;
    const highT = hits.filter((h) => !h.tg.k.bass), highOk = highT.filter((h) => h.n.midi >= BASS_MAX).length;
    // on the scale: the non-bass strokes should be the note shown (any octave)
    const noteT = highT.filter((h) => h.tg.note), noteOk = noteT.filter((h) => Math.abs((((h.n.midi - h.tg.note.midi) % 12) + 18) % 12 - 6) < 0.6).length;
    const score = Math.round(100 * onBeat / targets.length);
    const stringsPct = bassT.length + highT.length && P().strokes.some((k) => k.bass) ? Math.round(100 * (bassOk + highOk) / (bassT.length + highT.length)) : null;
    const notesPct = noteT.length ? Math.round(100 * noteOk / noteT.length) : null;
    const tip = missed > targets.length * 0.2 ? `${missed} strokes missing. Keep the right hand moving through the whole pattern, even after a mistake.`
      : stringsPct != null && stringsPct < 80 ? 'The bass strokes (قرار) go on a low string, the others on the note. Watch the boxes marked قرار.'
        : notesPct != null && notesPct < 80 ? 'Some strokes were not on the note shown. Move the left hand only when the next cycle starts.'
          : mean < -0.025 ? 'You rush a little: you play before the click. Wait for it.'
            : mean > 0.025 ? 'You drag a little: you play after the click. Play right on it.'
              : sd > tol ? 'On the beat on average but uneven. Keep the risha stroke the same size every time.'
                : score >= 85 ? 'Steady. Try it 5 faster.' : 'Good. Once more at this speed.';
    const res = { at: Date.now(), pattern: st.pat, bpm: st.bpm, scale: st.scale, score, missed, strings: stringsPct, notes: notesPct,
      meanMs: Math.round(mean * 1000), sdMs: Math.round(sd * 1000), latencyMs: Math.round(lat * 1000) };
    ui.result.hidden = false;
    ui.result.innerHTML = `<div class="r-big">${score}%</div><div class="r-sub">strokes on time · ${P().name} · ${st.bpm} BPM</div>` +
      `<div class="r-sub">average ${res.meanMs > 0 ? '+' : ''}${res.meanMs} ms · spread ±${res.sdMs} ms · ${missed} missed` +
      `${stringsPct != null ? ` · bass/strings right ${stringsPct}%` : ''}${notesPct != null ? ` · notes right ${notesPct}%` : ''}</div><p class="r-tip">${tip}</p>`;
    ui.msg.textContent = '';
    ui.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const hist = store.get('pace.hist', []); hist.unshift(res); store.set('pace.hist', hist.slice(0, 50));
    if (score >= 85 && (stringsPct == null || stringsPct >= 80) && st.bpm < 160) setBpm(st.bpm + 5);
    if (onDone) onDone(res);
    return res;
  }

  render();
  return { stop: () => st.active && stop(true), render };
}
