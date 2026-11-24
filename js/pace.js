// Right hand (risha), in the same three steps as a song lesson (owner, 2026-11-23: "show me the order first,
// let me practise slowly, then in time; tell me which string"):
//  1 Watch: the computer plays the pattern slowly while each box lights up (you hear and see the order).
//  2 Step by step: no metronome; the coach waits for each stroke and checks the string (bass or not, and the
//    note when the scale is on), then moves to the next box.
//  3 With the click: metronome; the mic judges each stroke's timing, the string, and the note.
// Patterns: steady 1, 2 (down-up) or 4 (tremolo) per beat, and three tarab rhythms from the owner's lesson
// video (a.oudd), measured from his playing: إيقاع عربي (↓ ↑ ↓ ↓bass, even), مقسوم (bass ↓ . ↓ bass . ↓ .,
// gaps measured 1-2-1-2-2), رومبا (8 even strokes, 3-3-2). Bass strokes (قرار) go on string 6 (low فا, as in
// the video; string 5 on a 5-string oud); the others on string 3 (open ري), or on the scale note when "On the
// Bayati scale" is on. Across the strings (owner, 2026-11-24): صد, then صد رد, on every open string from the
// thickest to the thinnest and back, for a 5- or 6-string oud, each stroke checked for its string. With the click,
// a good run starts the next one by itself 5 BPM faster (a weak one repeats or slows down): the speed ladder.
import { audioCtx, click, stopAll, playNote } from './audio.js';
import { NOTES, nameOf, STRINGS } from './notes.js';
import { Recorder } from './takes.js';

export const PATTERNS = {
  walk1: { name: 'صد on every string', walk: true, perBeat: 1, slots: 4,
    strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↓' }, { s: 2, d: '↓' }, { s: 3, d: '↓' }] },
  walk2: { name: 'صد رد on every string', walk: true, perBeat: 2, slots: 4,
    strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↑' }, { s: 2, d: '↓' }, { s: 3, d: '↑' }] },
  s1: { name: '1 per beat', perBeat: 1, slots: 1, strokes: [{ s: 0, d: '↓' }] },
  s2: { name: '2 per beat', perBeat: 2, slots: 2, strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↑' }] },
  s4: { name: '4 per beat', perBeat: 4, slots: 4, strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↑' }, { s: 2, d: '↓' }, { s: 3, d: '↑' }] },
  arabi: { name: 'إيقاع عربي', count: 4, perBeat: 2, slots: 4,
    strokes: [{ s: 0, d: '↓' }, { s: 1, d: '↑' }, { s: 2, d: '↓' }, { s: 3, d: '↓', bass: true }] },
  maqsum: { name: 'مقسوم', count: 5, perBeat: 2, slots: 8,
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 1, d: '↓' }, { s: 3, d: '↓' }, { s: 4, d: '↓', bass: true }, { s: 6, d: '↓' }] },
  rumba: { name: 'رومبا', count: 8, perBeat: 2, slots: 8,
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 1, d: '↓' }, { s: 2, d: '↑' }, { s: 3, d: '↓', acc: true }, { s: 4, d: '↓' }, { s: 5, d: '↑' }, { s: 6, d: '↓', acc: true }, { s: 7, d: '↑' }] },
  // More rhythms, from the دم/تك chart of M. Frishkopf ("Some Arab rhythmic cycles", 2009; read 2026-11-23):
  // دم = قرار (bass) stroke, تك = a stroke on string 3. All down strokes until a lesson video shows otherwise.
  baladi: { name: 'بلدي', count: 5, perBeat: 2, slots: 8,          // dum dum . tek dum . tek .
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 1, d: '↓', bass: true }, { s: 3, d: '↓' }, { s: 4, d: '↓', bass: true }, { s: 6, d: '↓' }] },
  saidi: { name: 'سعيدي', count: 5, perBeat: 2, slots: 8,          // dum tek . dum dum . tek .
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 1, d: '↓' }, { s: 3, d: '↓', bass: true }, { s: 4, d: '↓', bass: true }, { s: 6, d: '↓' }] },
  malfuf: { name: 'ملفوف', count: 3, perBeat: 4, slots: 8,         // in two: dum . . tek . . tek .
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 3, d: '↓' }, { s: 6, d: '↓' }] },
  khaliji: { name: 'خليجي', count: 3, perBeat: 4, slots: 8,        // in two: dum . . dum . . tek .
    strokes: [{ s: 0, d: '↓', bass: true }, { s: 3, d: '↓', bass: true }, { s: 6, d: '↓' }] },
};
const SCALE = ['re', 'mi', 'fa', 'sol', 'la', 'si', 'do', 'reH', 'do', 'si', 'la', 'sol', 'fa', 'mi', 're'];   // Bayati on ري, up and back
const HIGH = NOTES.re;                            // the non-bass strokes: string 3 (open ري)
const BASS_MAX = 47.5;                           // a stroke below this (strings 4–6) counts as a bass stroke
const TOTAL_BEATS = 32, WATCH_STEP = 0.6;     // Watch: 0.6 s per box, slow enough to follow
const LADDER_RUNS = 6;                           // the speed ladder stops after this many runs in a row
const ABOUT = {                                  // one line under the exercise name
  walk1: '4 down strokes on each string, thickest to thinnest and back.',
  walk2: 'Down-up on each string, thickest to thinnest and back.',
  s1: 'One down stroke per beat on string 3.',
  s2: 'Down-up (صد رد) on string 3.',
  s4: 'Down-up-down-up per beat: the start of tremolo.',
  arabi: 'Gulf rhythm: ↓ ↑ ↓ then قرار.', maqsum: 'Egyptian rhythm: قرار ↓ · ↓ قرار · ↓ ·', rumba: 'Gulf rhythm: 8 strokes, 3-3-2.',
  baladi: 'دم دم · تك دم · تك ·  (دم = قرار, تك = string 3)', saidi: 'دم تك · دم دم · تك ·', malfuf: 'In two: دم · · تك · · تك ·', khaliji: 'In two: دم · · دم · · تك ·',
};

// Each Step-by-step or With-the-click run is recorded and kept as a take ({kind: 'risha'}) so it can be
// heard again or sent to Claude like a song take (`saveTake`, `takeLinks` come from app.js).
export function createPace({ $, el, listener, store, toast, onDone, saveTake, takeLinks, oud }) {
  const st = {
    bpm: store.get('pace.bpm', 60), pat: store.get('pace.pat', 's1'), clickOn: store.get('pace.click', true),
    scale: store.get('pace.scale', false), mode: store.get('pace.mode', 'watch'), active: false, raf: 0, gen: 0,
  };
  if (!PATTERNS[st.pat]) st.pat = 's1';
  const ui = {
    bpm: $('#paceBpm'), go: $('#paceGo'), dot: $('#paceDot'), count: $('#paceCount'), lane: $('#paceLane'),
    msg: $('#paceMsg'), result: $('#paceResult'), clickSw: $('#paceClick'), scaleSw: $('#paceScale'),
    boxes: $('#pacePattern'), note: $('#paceNote'), order: $('#paceOrder'), hint: $('#paceHint'),
  };
  const P = () => PATTERNS[st.pat];
  const where = (n) => (n.finger ? `string ${n.string} · finger ${n.finger}` : `string ${n.string} · open`);
  // the oud's open strings (5 or 6, string 5 as tuned), from app.js; قرار is the lowest one
  const strings = () => { const s = oud ? oud() : null; return s && s.length ? s : STRINGS; };
  const openNote = (num) => { const s = strings().find((x) => x.n === num) || strings()[0]; return { ar: s.ar, name: s.name, midi: s.midi, string: s.n, finger: 0 }; };
  // قرار is the low فا (as in the lesson video): string 6 on most ouds, string 5 on ouds whose 5th string is فا;
  // an oud without a low فا uses its lowest string
  const BASS = () => {
    const low = strings().filter((s) => s.n >= 4), fa = low.filter((s) => Math.abs((((s.midi - 41) % 12) + 18) % 12 - 6) < 0.6);
    return openNote((fa.length ? fa : low.length ? low : strings())[(fa.length ? fa : low.length ? low : strings()).length - 1].n);
  };
  const bassText = () => `قرار: the low ${BASS().ar}, string ${BASS().string}`;
  // across the strings: thickest to thinnest and back (6 5 4 3 2 1 2 3 4 5), one string per cycle
  const walkOrder = () => { const n = strings().length, down = Array.from({ length: n }, (_, i) => n - i); return [...down, ...down.slice(1, -1).reverse()]; };
  const noteOf = (k, c = 0) => (P().walk ? openNote(walkOrder()[c % walkOrder().length]) : k.bass ? BASS() : st.scale ? NOTES[SCALE[c % SCALE.length]] : HIGH);
  const HINTS = () => ({
    watch: `Watch and listen: the computer plays it slowly. Gold box = now.${P().walk ? '' : ` قرار = the low ${BASS().ar} string (${BASS().string}).`}`,
    step: 'No click. Play the lit box; the coach checks the string and waits for you, then moves on.',
    time: 'After 4 clicks, play on the click. The coach judges every stroke; a good run starts the next one faster.',
  });
  const short = (n) => `S${n.string}${n.finger ? '·F' + n.finger : ''}`;
  // a phone mic often hears the low فا string an octave up, so فا in any octave counts as the قرار string
  const pcd = (m, ref) => Math.abs((((m - ref) % 12) + 18) % 12 - 6);
  const soundsBass = (m) => m < BASS_MAX || pcd(m, BASS().midi) < 0.6;
  // across the strings: the exact open string (a low string 4–6 may be heard an octave up)
  const exactString = (m, want) => Math.abs(m - want.midi) < 0.6 || (want.string >= 4 && Math.abs(m - want.midi - 12) < 0.6);
  const stringOk = (k, m, want) => (P().walk ? exactString(m, want)
    : k.bass ? soundsBass(m) : m >= BASS_MAX && (pcd(m, BASS().midi) >= 0.6 || pcd(want.midi, BASS().midi) < 0.6));
  const strokeOk = (k, m, want) => stringOk(k, m, want) && (P().walk || k.bass || !st.scale || pcd(m, want.midi) < 0.6);

  // the pattern as boxes: arrow, قرار for bass, and the string (and finger) of each stroke
  function drawBoxes(cur = -1, c = 0, marks = {}) {
    const p = P(); ui.boxes.innerHTML = '';
    for (let s = 0; s < p.slots; s++) {
      const k = p.strokes.find((x) => x.s === s);
      const n = k && noteOf(k, c);
      const b = el('span', 'pbox' + (k ? '' : ' rest') + (k && k.bass ? ' bass' : '') + (k && k.acc ? ' acc' : '') + (s === cur ? ' now' : '') + (marks[s] ? ' ' + marks[s] : ''),
        k ? `${k.d}${k.bass ? '<small>قرار</small>' : ''}<em>${short(n)}</em>` : '·');
      ui.boxes.append(b);
    }
  }
  // the order in words (قرار → ري → ري …) and what each word means on the oud
  function drawOrder(c = 0) {
    const p = P(), ar = (x) => `<bdi class="ar">${x}</bdi>`;
    if (p.walk) {
      const ord = walkOrder(), at = c % ord.length;
      ui.order.innerHTML = `<div>${p.strokes.length} strokes (${p.strokes.map((k) => k.d).join('')}) on each string: ${ord.map((n, i) => (i === at ? `<b>${n}</b>` : n)).join(' → ')}</div>` +
        `<div class="legend">${strings().map((s) => `S${s.n} ${ar(s.ar)}`).join(' · ')}</div>`;
      return;
    }
    const word = (k) => (k.bass ? 'قرار' : noteOf(k, c).ar);
    const seen = new Map();
    for (const k of p.strokes) { const n = noteOf(k, c); seen.set(k.bass ? 'b' : n.ar, k.bass ? `${ar('قرار')} = low ${ar(n.ar)}, ${where(n)}` : `${ar(n.ar)} = ${where(n)}`); }
    ui.order.innerHTML = `<div>Order: ${p.strokes.map((k, i) => `<b>${i + 1}</b>${k.d}${ar(word(k))}`).join(' → ')}</div>` +
      `<div class="legend">${[...seen.values()].join(' · ')}${p.slots > p.strokes.length ? ' · dot = wait' : ''}</div>`;
  }
  // the moving parts (boxes, order, big note) are only rebuilt when the box or the cycle changes:
  // rebuilding them every frame was heavy enough to disturb the listening on a slow machine
  function paint(slot, c) {
    const key = `${st.pat}|${slot}|${c}|${st.scale}|${strings().length}`; if (st.painted === key) return false; st.painted = key;
    drawBoxes(slot, c); drawOrder(c);
    const k = P().strokes.find((x) => x.s === slot); showNote(k ? noteOf(k, c) : null);
    return true;
  }
  function showNote(n) { ui.note.innerHTML = n ? `<b class="ar">${n.ar}</b><small>${where(n)}</small>` : ''; }
  function render() {
    ui.bpm.textContent = st.bpm;
    const pn = $('#pacePickName'); if (pn) { pn.innerHTML = `<bdi>${P().name}</bdi>`; $('#pacePickAbout').innerHTML = `<bdi>${ABOUT[st.pat] || ''}</bdi>`; }
    document.querySelectorAll('#pacePats button').forEach((b) => b.classList.toggle('on', b.dataset.pat === st.pat));
    document.querySelectorAll('#paceModes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === st.mode));
    ui.hint.textContent = HINTS()[st.mode];
    ui.clickSw.checked = st.clickOn; ui.scaleSw.checked = st.scale;
    ui.scaleSw.closest('label').hidden = !!P().walk;                       // the scale has no meaning across the strings
    const cs = $('#paceCourses'); if (cs) cs.value = String(strings().length);
    $('#paceSpeedRow').hidden = st.mode !== 'time'; $('#paceClickRow').hidden = st.mode !== 'time';
    $('#paceLane').hidden = st.mode !== 'time'; ui.dot.hidden = st.mode !== 'time';
    const busy = st.active || st.waiting;
    ui.go.textContent = busy ? '■ Stop' : { watch: '▶ Show me', step: '🎤 Start · waits for you', time: '🎤 Start with the click' }[st.mode];
    ui.go.classList.toggle('stop', busy);
    $('#paceView').classList.toggle('practising', st.active);
    if (!st.active) { drawBoxes(); drawOrder(); showNote(P().walk ? noteOf(P().strokes[0], 0) : st.scale ? NOTES[SCALE[0]] : null); }
  }
  function setBpm(v) { st.bpm = Math.max(40, Math.min(160, v)); store.set('pace.bpm', st.bpm); render(); }
  function setMode(m) { if (st.active) stop(true); st.mode = m; store.set('pace.mode', m); ui.result.hidden = true; ui.msg.textContent = ''; render(); }
  $('#paceMinus').addEventListener('click', () => !st.active && setBpm(st.bpm - 5));
  $('#pacePlus').addEventListener('click', () => !st.active && setBpm(st.bpm + 5));
  document.querySelectorAll('#pacePats button').forEach((b) => b.addEventListener('click', () => {
    if (st.active) return; if (st.waiting) stop(true);
    st.pat = b.dataset.pat; store.set('pace.pat', st.pat); ui.result.hidden = true; $('#pacePats').hidden = true; render();
  }));
  const pick = $('#pacePick');
  if (pick) pick.addEventListener('click', () => { if (st.active) return; const pats = $('#pacePats'); pats.hidden = !pats.hidden; });
  const cs = $('#paceCourses');
  if (cs) cs.addEventListener('change', (e) => { if (st.active || st.waiting) stop(true); store.set('courses', +e.target.value); st.painted = ''; render(); });
  document.querySelectorAll('#paceModes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ui.clickSw.addEventListener('change', (e) => { st.clickOn = e.target.checked; store.set('pace.click', st.clickOn); });
  ui.scaleSw.addEventListener('change', (e) => { st.scale = e.target.checked; store.set('pace.scale', st.scale); render(); });
  ui.go.addEventListener('click', () => {
    if (st.active || st.waiting) { stop(true); return; }
    if (st.mode === 'watch') watch(); else if (st.mode === 'step') stepByStep(); else { st.runs = 0; start(); }
  });

  // ---------------------------------------------------------------- recording and takes
  function startRec() { st.rec = new Recorder(listener.stream); st.rec.start(); st.startedAt = Date.now(); }
  // stop the recorder before the microphone (stopping the mic first can cut the end of the recording)
  async function endRun() {
    const gen = st.gen, rec = st.rec; st.rec = null;
    listener.onNote = null;
    const audio = rec ? await rec.stop() : null;
    if (gen !== st.gen) return { cancelled: true };
    stop(false);
    return { audio };
  }
  function keepTake(take, audio) {
    const full = { id: String(Date.now()), at: Date.now(), app: 'oud-coach', kind: 'risha', song: 'Right hand · risha',
      pattern: st.pat, partLabel: P().name, scale: st.scale, durationSec: Math.round((Date.now() - st.startedAt) / 100) / 10,
      device: navigator.userAgent, audio: audio || null, ...take };
    if (saveTake) saveTake(full);
    const box = ui.result.querySelector('.r-links'); if (box && takeLinks) takeLinks(full, box);
    return full;
  }
  const strokeInfo = (k, c) => { const n = noteOf(k, c); return { dir: k.d === '↓' ? 'down' : 'up', bass: !!k.bass, want: k.bass ? 'قرار' : n.ar, where: where(n) }; };

  // ---------------------------------------------------------------- 1. watch: the computer plays it slowly
  function watch() {
    const gen = ++st.gen, p = P(), ac = audioCtx(); ac.resume(); st.painted = '';
    ui.result.hidden = true;
    const step = WATCH_STEP, t0 = ac.currentTime + 0.3;
    let cycles = Math.max(2, Math.ceil(8 / p.strokes.length));                 // at least 8 strokes to watch
    if (st.scale) cycles = Math.max(cycles, Math.min(SCALE.length, Math.ceil(24 / p.slots)));
    if (p.walk) cycles = strings().length;                                      // one way across: thickest to thinnest
    const plan = [];
    for (let c = 0; c < cycles; c++) for (const k of p.strokes) plan.push({ t: t0 + (c * p.slots + k.s) * step, k, c });
    for (const x of plan) playNote(noteOf(x.k, x.c).midi, x.t, step * 1.6, x.k.bass ? 0.9 : 0.7);
    const end = t0 + cycles * p.slots * step;
    st.active = true; render();
    const tick = () => {
      if (!st.active || gen !== st.gen) return;
      const now = ac.currentTime, c = Math.max(0, Math.floor((now - t0) / (p.slots * step))), slot = Math.floor(((now - t0) % (p.slots * step)) / step);
      if (now >= t0 && paint(slot, c)) {
        const k = p.strokes.find((x) => x.s === slot);
        ui.msg.textContent = k ? `${k.d === '↓' ? 'Down' : 'Up'} on ${where(noteOf(k, c))}${k.bass ? ' (قرار)' : ''}` : 'wait…';
      }
      if (now > end + 0.4) {
        stop(false); ui.msg.textContent = 'Now play it yourself, step by step.';
        const g = st.gen; setTimeout(() => { if (g === st.gen && !st.active) { setMode('step'); ui.msg.textContent = 'Now you: tap Start and play the gold box.'; } }, 1500);
        return;
      }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------- 2. step by step: waits for each stroke
  async function stepByStep() {
    const gen = ++st.gen, p = P();
    ui.result.hidden = true; ui.msg.textContent = 'Opening the microphone…';
    try { if (!(await listener.start()) || gen !== st.gen) return; }
    catch (e) { ui.msg.textContent = 'The microphone is blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.'; return; }
    startRec(); const t0 = listener.now ? listener.now() : 0, log = [];
    const seq = [], cycles = p.walk ? walkOrder().length
      : st.scale ? Math.min(SCALE.length, Math.max(4, Math.ceil(16 / p.strokes.length))) : Math.max(4, Math.ceil(8 / p.strokes.length));
    for (let c = 0; c < cycles; c++) for (const k of p.strokes) seq.push({ k, c });
    let i = 0, wrong = 0, lastT = -1, okT = -9, okMidi = null;
    const marks = {};
    const show = () => {
      const x = seq[i]; drawBoxes(x.k.s, x.c, marks); drawOrder(x.c);
      const n = noteOf(x.k, x.c); showNote(n);
      ui.count.textContent = `${i + 1}/${seq.length}`;
      ui.msg.textContent = `${x.k.d === '↓' ? 'Down' : 'Up'}: ${where(n)}${x.k.bass ? ' (قرار)' : ''}`;
    };
    st.active = true; render(); show();
    listener.onFrame = null;
    listener.onNote = (nt) => {
      if (!st.active || gen !== st.gen || nt.legato || nt.midi < 34 || nt.midi > 72) return;
      // the same stroke heard twice: his oud often gives a weak onset 0.07–0.15 s before the real pick (calibration take)
      if (lastT >= 0 && nt.t - lastT < 0.18) return;
      lastT = nt.t;
      const x = seq[i], want = noteOf(x.k, x.c), ok = strokeOk(x.k, nt.midi, want);
      // the last string still ringing (or played twice) is not a mistake: keep waiting, say what is due
      const echo = !ok && okMidi != null && nt.t - okT < 1.2 && pcd(nt.midi, okMidi) < 0.6;
      log.push({ n: i + 1, cycle: x.c + 1, ...strokeInfo(x.k, x.c), t: +(nt.t - t0).toFixed(3), midi: +nt.midi.toFixed(2), heard: nameOf(nt.midi).ar, ok, ...(echo ? { ignored: 'same as the last stroke' } : {}) });
      if (echo) { ui.msg.textContent = `Still waiting: ${x.k.bass ? bassText() : `${want.ar}, ${where(want)}`}.`; return; }
      if (ok) {
        okT = nt.t; okMidi = nt.midi; marks[x.k.s] = 'ok'; i++;
        if (i >= seq.length) { finishStep(seq.length, wrong, log); return; }
        if (seq[i].c !== x.c) for (const s in marks) delete marks[s];   // a new cycle starts clean
        show();
      } else {
        wrong++; marks[x.k.s] = 'bad'; show(); delete marks[x.k.s];
        ui.msg.textContent = P().walk ? `That was ${nameOf(nt.midi).ar}. This one is string ${want.string}: open ${want.ar}.`
          : x.k.bass ? `That was a high string. This one is ${bassText()}.`
            : !stringOk(x.k, nt.midi, want) ? `That was the low string. This one is ${want.ar}, ${where(want)}.` : `Not that note: ${want.ar}, ${where(want)}.`;
      }
    };
  }
  async function finishStep(n, wrong, log) {
    const { audio, cancelled } = await endRun(); if (cancelled) return;
    const tip = wrong ? 'Once more step by step, then with the click.' : 'You know the order. Now play it with the click.';
    ui.result.hidden = false;
    ui.result.innerHTML = `<div class="r-big">${wrong ? `${wrong} wrong` : 'All right!'}</div><div class="r-sub">${n} strokes, in order · <bdi>${P().name}</bdi></div>` +
      `<p class="r-tip">${tip}</p><div class="r-links"></div>`;
    keepTake({ mode: 'step', score: { strokes: n, wrong }, waitErrors: wrong, tips: [tip], strokes: log }, audio);
    ui.msg.textContent = '';
    ui.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const g = st.gen;
    if (!wrong) setTimeout(() => { if (g === st.gen && !st.active) setMode('time'); }, 2500);
  }

  // ---------------------------------------------------------------- 3. with the click: judged on time
  function plot(off, tol, cls) {
    const w = ui.lane.clientWidth || 300, x = w / 2 + Math.max(-1, Math.min(1, off / 0.15)) * (w / 2 - 10);
    const d = el('i', 'pdot ' + cls); d.style.left = `${x.toFixed(1)}px`; ui.lane.append(d);
    const all = ui.lane.querySelectorAll('.pdot'); if (all.length > 24) all[0].remove();
  }
  async function start() {
    const gen = ++st.gen, p = P(); st.painted = '';
    ui.result.hidden = true; ui.lane.querySelectorAll('.pdot').forEach((d) => d.remove());
    ui.msg.textContent = 'Opening the microphone…';
    try { if (!(await listener.start()) || gen !== st.gen) return; }
    catch (e) { ui.msg.textContent = 'The microphone is blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.'; return; }
    const ac = audioCtx(); ac.resume();
    const beat = 60 / st.bpm, step = beat / p.perBeat, cycle = p.slots * step;
    const passBeats = walkOrder().length * p.slots / p.perBeat;               // across the strings: whole passes
    const cycles = p.walk ? walkOrder().length * Math.max(1, Math.round(TOTAL_BEATS / passBeats)) : Math.max(4, Math.round(TOTAL_BEATS * beat / cycle));
    const t0 = ac.currentTime + 0.4, play0 = t0 + 4 * beat;
    const end = play0 + cycles * cycle;
    const targets = [];
    for (let c = 0; c < cycles; c++) for (const k of p.strokes) targets.push({ t: play0 + c * cycle + k.s * step, k, c, note: st.scale && !k.bass && !p.walk ? noteOf(k, c) : null });
    for (let k = 0; k < 4; k++) click(t0 + k * beat, k === 0);                         // count-in, always heard
    if (st.clickOn) for (let k = 0; k * beat < cycles * cycle - 1e-6; k++) click(play0 + k * beat, Math.abs((k * beat) % cycle) < 1e-6);
    const picks = [];
    st.active = true; render(); startRec(); st.play0 = play0;
    listener.onFrame = null;
    // the clicks are 1.2–1.8 kHz: a "note" above the oud's range is the metronome, not a stroke
    listener.onNote = (n) => { if (!n.legato && n.midi > 34 && n.midi < 72 && n.t > play0 - step && n.t < end + step) picks.push(n); };
    st.offs = []; st.lat = 0; st.shown = 0;
    const tol = Math.max(0.03, Math.min(0.07, 0.25 * step));
    const tick = () => {
      if (!st.active || gen !== st.gen) return;
      const now = ac.currentTime;
      if (now < play0) {
        const cnt = String(4 - Math.floor((now - t0) / beat)); if (ui.count.textContent !== cnt) ui.count.textContent = cnt;
        if (paint(-1, 0)) ui.msg.textContent = 'Get ready: start on the first beat after the count.';
      } else {
        const inC = (now - play0) % cycle, c = Math.floor((now - play0) / cycle), slot = Math.floor(inC / step + 1e-6);
        const cnt = String(Math.floor(inC / beat) + 1); if (ui.count.textContent !== cnt) ui.count.textContent = cnt;
        const on = ((now - play0) % beat) < 0.1; if (ui.dot.classList.contains('on') !== on) ui.dot.classList.toggle('on', on);
        if (paint(slot, c)) ui.msg.textContent = `${st.runs ? `Run ${st.runs + 1} · ` : ''}${p.walk ? `string ${noteOf(p.strokes[0], c).string}` : `cycle ${Math.min(cycles, c + 1)} of ${cycles}`}`;
        while (st.shown < picks.length && picks[st.shown].t < now - step / 2) {
          const n = picks[st.shown++], tg = nearest(targets, n.t);
          const off = n.t - tg.t; st.offs.push(off);
          const s = [...st.offs].sort((x, y) => x - y); st.lat = st.offs.length >= 3 ? Math.max(-0.05, Math.min(0.15, s[s.length >> 1])) : 0;
          const o = off - st.lat, wrongString = !stringOk(tg.k, n.midi, noteOf(tg.k, tg.c));
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
    if (st.waiting) { st.waiting = false; clearInterval(st.iv); ui.result.querySelectorAll('.r-next').forEach((x) => x.remove()); }
    if (st.rec) { st.rec.stop(); st.rec = null; }                       // a cancelled run keeps no recording
    if (st.active) { listener.onNote = null; listener.stop(); stopAll(); }
    st.active = false; ui.dot.classList.remove('on'); ui.count.textContent = '';
    if (cancelled) ui.msg.textContent = 'Stopped. Tap Start to go again.';
    render();
  }

  async function finish(picks, targets, step, tol) {
    const { audio, cancelled } = await endRun(); if (cancelled) return null;
    const got = targets.map(() => null);
    for (const n of picks) {
      let bi = -1; for (let i = 0; i < targets.length; i++) if (bi < 0 || Math.abs(targets[i].t - n.t) < Math.abs(targets[bi].t - n.t)) bi = i;
      if (bi < 0 || Math.abs(targets[bi].t - n.t) > step / 2) continue;
      if (!got[bi] || Math.abs(n.t - targets[bi].t) < Math.abs(got[bi].t - targets[bi].t)) got[bi] = n;
    }
    const hits = got.map((n, i) => n && { n, tg: targets[i], off: n.t - targets[i].t }).filter(Boolean);
    if (hits.length < targets.length / 4) { ui.msg.textContent = 'Too few strokes heard. Play a little louder or closer to the phone.'; return null; }
    // (a run with too few strokes keeps no take: there is nothing to judge)
    const offs = hits.map((h) => h.off).sort((a, b) => a - b), lat = Math.max(-0.05, Math.min(0.15, offs[offs.length >> 1]));
    const adj = hits.map((h) => h.off - lat);
    const onBeat = adj.filter((o) => Math.abs(o) <= tol).length, missed = targets.length - hits.length;
    const mean = adj.reduce((s, o) => s + o, 0) / adj.length;
    const sd = Math.sqrt(adj.reduce((s, o) => s + (o - mean) ** 2, 0) / adj.length);
    const sOk = (h) => stringOk(h.tg.k, h.n.midi, noteOf(h.tg.k, h.tg.c));
    const bassT = hits.filter((h) => h.tg.k.bass), bassOk = bassT.filter(sOk).length;
    const highT = hits.filter((h) => !h.tg.k.bass), highOk = highT.filter(sOk).length;
    const noteT = highT.filter((h) => h.tg.note), noteOk = noteT.filter((h) => pcd(h.n.midi, h.tg.note.midi) < 0.6).length;
    const score = Math.round(100 * onBeat / targets.length);
    const stringsPct = (P().walk || P().strokes.some((k) => k.bass)) && bassT.length + highT.length ? Math.round(100 * (bassOk + highOk) / (bassT.length + highT.length)) : null;
    const notesPct = noteT.length ? Math.round(100 * noteOk / noteT.length) : null;
    const tip = missed > targets.length * 0.2 ? `${missed} strokes missing. Go back to Step by step until the order is easy, then try again.`
      : stringsPct != null && stringsPct < 80 ? (P().walk ? 'Some strokes were on the wrong string. The gold box says which string; try Step by step first.'
        : `The قرار strokes go on the low ${BASS().ar} (string ${BASS().string}), the others on string 3. Practise Step by step first.`)
        : notesPct != null && notesPct < 80 ? 'Some strokes were not on the note shown. Move the left hand only when the next cycle starts.'
          : mean < -0.025 ? 'You rush a little: you play before the click. Wait for it.'
            : mean > 0.025 ? 'You drag a little: you play after the click. Play right on it.'
              : sd > tol ? 'On the beat on average but uneven. Keep the risha stroke the same size every time.'
                : score >= 85 ? 'Steady. Now 5 faster.' : 'Good. Once more at this speed.';
    const res = { at: Date.now(), pattern: st.pat, bpm: st.bpm, scale: st.scale, score, missed, strings: stringsPct, notes: notesPct,
      meanMs: Math.round(mean * 1000), sdMs: Math.round(sd * 1000), latencyMs: Math.round(lat * 1000) };
    ui.result.hidden = false;
    ui.result.innerHTML = `<div class="r-big">${score}%</div><div class="r-sub">strokes on time · <bdi>${P().name}</bdi> · ${st.bpm} BPM</div>` +
      `<div class="r-sub">average ${res.meanMs > 0 ? '+' : ''}${res.meanMs} ms · spread ±${res.sdMs} ms · ${missed} missed` +
      `${stringsPct != null ? ` · strings right ${stringsPct}%` : ''}${notesPct != null ? ` · notes right ${notesPct}%` : ''}</div><p class="r-tip">${tip}</p><div class="r-links"></div>`;
    const p0 = st.play0;
    keepTake({ mode: 'time', bpm: st.bpm, click: st.clickOn,
      score: { onTime: score, missed, strings: stringsPct, notes: notesPct, meanMs: res.meanMs, sdMs: res.sdMs, latencyMs: res.latencyMs }, tips: [tip],
      strokes: targets.map((tg, i) => { const n = got[i], o = n ? n.t - tg.t - lat : null;
        return { n: i + 1, cycle: tg.c + 1, ...strokeInfo(tg.k, tg.c), t: +(tg.t - p0).toFixed(3),
          heard: n ? nameOf(n.midi).ar : null, midi: n ? +n.midi.toFixed(2) : null, offMs: n ? Math.round(o * 1000) : null,
          status: !n ? 'missed' : !stringOk(tg.k, n.midi, noteOf(tg.k, tg.c)) ? 'wrong string' : tg.note && pcd(n.midi, tg.note.midi) >= 0.6 ? 'wrong note' : Math.abs(o) <= tol ? 'on time' : o < 0 ? 'early' : 'late' }; }),
      heard: picks.map((n) => ({ t: +(n.t - p0).toFixed(3), midi: +n.midi.toFixed(2), note: nameOf(n.midi).ar })) }, audio);
    ui.msg.textContent = '';
    ui.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const hist = store.get('pace.hist', []); hist.unshift(res); store.set('pace.hist', hist.slice(0, 50));
    const good = score >= 85 && (stringsPct == null || stringsPct >= 80);
    if (good && st.bpm < 160) setBpm(st.bpm + 5); else if (score < 60 && st.bpm > 40) setBpm(st.bpm - 5);
    if (onDone) onDone(res);
    // the speed ladder: start the next run by itself (setting "Repeat until right"); any Stop ends it
    st.runs = (st.runs || 0) + 1;
    if (store.get('repeat', true) && st.runs < LADDER_RUNS) nextRun(good ? 'Faster' : score >= 60 ? 'Again' : 'A little slower');
    return res;
  }
  function nextRun(word) {
    const box = el('p', 'r-next'); ui.result.append(box);
    st.waiting = true; render();
    let left = 5;
    const tickDown = () => {
      if (!st.waiting) return;
      box.textContent = `${word}: run ${st.runs + 1} of ${LADDER_RUNS} at ${st.bpm} BPM in ${left}… (Stop to rest)`;
      if (left-- <= 0) { st.waiting = false; clearInterval(st.iv); box.remove(); start(); }
    };
    tickDown(); st.iv = setInterval(tickDown, 1000);
  }

  // the path opens the trainer on a given pattern, mode, speed and scale
  function preset(o) {
    if (st.active || st.waiting) stop(true);
    if (o.pat && PATTERNS[o.pat]) { st.pat = o.pat; store.set('pace.pat', st.pat); }
    if (o.mode) { st.mode = o.mode; store.set('pace.mode', st.mode); }
    if (o.scale != null) { st.scale = !!o.scale; store.set('pace.scale', st.scale); }
    if (o.bpm) { st.bpm = Math.max(40, Math.min(160, o.bpm)); store.set('pace.bpm', st.bpm); }
    if (o.click != null) { st.clickOn = !!o.click; store.set('pace.click', st.clickOn); }
    ui.result.hidden = true; ui.msg.textContent = ''; render();
  }
  render();
  return { stop: () => (st.active || st.waiting) && stop(true), render, preset };
}
