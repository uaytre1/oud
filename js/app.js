import { STRINGS, STRING5_OPTIONS, nameOf, NOTES } from './notes.js';
import { SONGS, WANTED, buildPass, linesOf, groupsOf } from './library.js';
import { Listener, audioCtx, playNote, stopAll, click, hzToMidi, median } from './audio.js';
import { analyzeTake, octaveRelated } from './analyze.js';
import { takes, Recorder, shareTake, shareSummary } from './takes.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('oudcoach.' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem('oudcoach.' + k, JSON.stringify(v)); } catch (_) {} },
};
const debug = (window.__coach = { notes: [], results: [] });

function toast(msg, ms = 3500) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), ms);
}
const where = (n) => (n.finger ? `String ${n.string} · finger ${n.finger}` : `String ${n.string} · open`);
const whereShort = (n) => (n.finger ? `${n.string}·${n.finger}` : `${n.string}`);

// current selection: song -> version -> pass
let song = SONGS.find((s) => s.id === store.get('song')) || SONGS[0];
let version = song.versions.find((v) => v.id === store.get('version')) || song.versions[0];
let pass = buildPass(version.passes.find((p) => p.id === store.get('pass')) || version.passes[0]);
function select({ s = song, v, p } = {}) {
  song = s;
  version = v || (s === song && version && s.versions.includes(version) ? version : s.versions[0]);
  const raw = p || version.passes.find((x) => x.id === pass.id) || version.passes[0];
  pass = buildPass(raw);
  store.set('song', song.id); store.set('version', version.id); store.set('pass', pass.id);
  $('#pTiming').checked = !version.paced;     // timing is judged by default only when it was measured
  player.stop(); renderLearn(); practice.reset();
}

// ------------------------------------------------------------------ tabs
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab !== 'tuner') tuner.stop();
  if (b.dataset.tab !== 'practice') practice.stop(true);
  if (b.dataset.tab === 'progress') renderProgress();
}));

// ------------------------------------------------------------------ chips
function chip(n, opts = {}) {
  const c = el('button', 'chip' + (n.grace ? ' grace' : '') + (n.dur > 0.85 && n.count === 1 ? ' hold' : '') + (n.count > 1 ? ' multi' : ''));
  c.type = 'button';
  const times = n.count > 1 ? `<span class="x">×${n.count}</span>` : '';
  c.innerHTML = `<span class="ar">${n.ar}</span>${times}<span class="wh">${opts.short ? whereShort(n) : (n.finger ? `${n.string} · f${n.finger}` : `${n.string}`)}</span>`;
  c.title = `${n.name}: ${where(n)}` + (n.count > 1 ? `, picked ${n.count} times` : '');
  c.dataset.i = n.i;
  if (n.notes) c.dataset.last = n.notes[n.notes.length - 1].i;
  if (!opts.static) c.addEventListener('click', () => { audioCtx().resume(); playNote(n.midi, 0, 1.2); });
  return c;
}

// ------------------------------------------------------------------ LEARN
function renderPicker() {
  $('#songTitle').innerHTML = `<span class="ar">${song.title}</span> <span class="muted">· ${song.part.toLowerCase()}</span>`;
  $('#songCard').innerHTML = `<div><div class="sc-title"><span class="ar">${song.title}</span> · ${song.titleEn}</div>` +
    `<div class="muted">${song.artist} · ${song.part} · maqam ${song.maqam}</div></div><span class="sc-change">Songs ▾</span>`;
  $('#versionBtn').innerHTML = `<div><b>${version.name}</b>${tagOf(version)}<div class="muted" style="font-size:13px">Version · ${song.versions.length} to choose from</div></div><span class="sc-change">Change ▾</span>`;
  const pb = $('#passTabs'); pb.innerHTML = '';
  version.passes.forEach((p) => {
    const b = el('button', p.id === pass.id ? 'on' : '', p.title); b.type = 'button';
    b.addEventListener('click', () => select({ v: version, p }));
    pb.append(b);
  });
  pb.hidden = version.passes.length < 2;
  $('#passHint').textContent = version.about + (version.passes.length < 2 && !version.paced ? ' (This video has one pass.)' : '');
}
function renderNow() {
  $('#pNow').innerHTML = `<div><span class="ar">${song.title}</span> · <b>${version.name}</b>${version.passes.length > 1 ? ' · ' + pass.title : ''}` +
    `<div class="muted">${version.paced ? 'Even pace (timing not measured)' : version.id === 'original' ? 'Real timing, measured from the original song' : 'Real timing, measured from a video'}</div></div><span class="sc-change">Change ▸</span>`;
}
function goTab(name) { document.querySelector(`.tabs button[data-tab=${name}]`).click(); }
$('#pNow').addEventListener('click', () => goTab('learn'));
function renderLearn() {
  renderPicker(); renderNow();
  const box = $('#lines'); box.innerHTML = '';
  linesOf(pass.notes).forEach((line, k) => {
    const card = el('div', 'line');
    const head = el('div', 'line-head');
    head.append(el('b', '', `Line ${k + 1}`));
    const acts = el('div', 'acts');
    const play = el('button', '', '▶ Play'); play.type = 'button';
    play.addEventListener('click', () => player.play(line, true));
    const prac = el('button', '', '🎯 Practice'); prac.type = 'button';
    prac.addEventListener('click', () => { player.stop(); goTab('practice'); $('#pSection').value = String(k + 1); practice.reset(); });
    acts.append(play, prac); head.append(acts);
    const chips = el('div', 'chips');
    groupsOf(line).forEach((g) => chips.append(chip(g)));
    card.append(head, chips); box.append(card);
  });
  fillSections();
}

function tagOf(v) {
  if (v.id === 'original') return '<span class="tag real">the real song</span>';
  return v.paced ? '<span class="tag notes">notes only</span>' : '<span class="tag measured">real timing</span>';
}
function openVersions() {
  const list = $('#versionList'); list.innerHTML = '';
  song.versions.forEach((v) => {
    const b = el('button', 'ver-row' + (v === version ? ' on' : ''), `<b>${v.name}</b>${tagOf(v)}<small>${v.about}</small>`);
    b.type = 'button'; b.addEventListener('click', () => { $('#versionSheet').hidden = true; select({ v }); });
    list.append(b);
  });
  $('#versionSheet').hidden = false;
}
$('#versionBtn').addEventListener('click', openVersions);
$('#versionSheetClose').addEventListener('click', () => ($('#versionSheet').hidden = true));
$('#versionSheet').addEventListener('click', (e) => { if (e.target.id === 'versionSheet') e.target.hidden = true; });
$('#songSheet').addEventListener('click', (e) => { if (e.target.id === 'songSheet') e.target.hidden = true; });

// song picker sheet
function openSongs() {
  const sh = $('#songSheet'), list = $('#songList'); list.innerHTML = '';
  SONGS.forEach((s) => {
    const b = el('button', 'song-row' + (s === song ? ' on' : ''), `<span class="ar">${s.title}</span><span>${s.titleEn} · ${s.artist}</span><small class="muted">${s.part} · ${s.versions.length} versions</small>`);
    b.type = 'button'; b.addEventListener('click', () => { sh.hidden = true; select({ s }); });
    list.append(b);
  });
  const wl = $('#wantedList'); wl.innerHTML = '';
  WANTED.forEach((w) => wl.append(el('div', 'song-row soon', `<span class="ar">${w.title}</span><span>${w.titleEn}${w.artist ? ' · ' + w.artist : ''}</span><small class="muted">Send Claude a video of someone playing it, and it gets added with real timing.</small>`)));
  sh.hidden = false;
}
$('#songCard').addEventListener('click', openSongs);
$('#songSheetClose').addEventListener('click', () => ($('#songSheet').hidden = true));

const player = {
  timer: 0, playing: false,
  play(notes, single = false) {
    this.stop();
    const ac = audioCtx(); ac.resume();
    const speed = +$('#speed').value, loop = $('#loop').checked;
    const t0 = ac.currentTime + 0.15, base = notes[0].t;
    const end = (notes[notes.length - 1].t - base + Math.min(1.2, notes[notes.length - 1].dur)) / speed;
    notes.forEach((n) => playNote(n.midi, t0 + (n.t - base) / speed, n.dur / speed));
    this.playing = true;
    $('#playAll').textContent = '■ Stop';
    const tick = () => {
      if (!this.playing) return;
      const now = (ac.currentTime - t0) * speed + base;
      let cur = null; for (const n of notes) if (n.t <= now) cur = n;
      document.querySelectorAll('#lines .chip').forEach((c) => {
        const lo = +c.dataset.i, hi = c.dataset.last != null ? +c.dataset.last : lo;
        c.classList.toggle('now', !!cur && cur.i >= lo && cur.i <= hi && now - cur.t < Math.max(0.25, cur.dur));
      });
      if (ac.currentTime - t0 > end + 0.2) {
        if (loop) { this.play(notes, single); return; }
        this.stop(); return;
      }
      this.timer = requestAnimationFrame(tick);
    };
    this.timer = requestAnimationFrame(tick);
  },
  stop() {
    this.playing = false; cancelAnimationFrame(this.timer); stopAll();
    $('#playAll').textContent = '▶ Play all';
    document.querySelectorAll('#lines .chip.now').forEach((c) => c.classList.remove('now'));
  },
};
$('#playAll').addEventListener('click', () => (player.playing ? player.stop() : player.play(pass.notes)));

// ------------------------------------------------------------------ PRACTICE
function fillSections() {
  const sel = $('#pSection'), keep = sel.value; sel.innerHTML = '';
  const n = linesOf(pass.notes).length;
  for (let k = 1; k <= n; k++) sel.append(new Option(`Line ${k}`, String(k)));
  sel.append(new Option(`All ${n} lines`, 'all'));
  sel.value = [...sel.options].some((o) => o.value === keep) ? keep : '1';
}
const MODE_HINT = {
  wait: 'Play each note when you are ready. The coach waits for the right one, then moves on. Quick in-between notes are skipped.',
  along: 'After 4 clicks, play along with the moving highlight. Judges notes, tuning and timing.',
  free: 'Play the part at your own speed. When you stop, the coach checks notes, tuning and rhythm.',
};

const listener = new Listener();
debug.listener = listener;

const practice = {
  mode: 'wait', active: false,
  section() {
    const v = $('#pSection').value;
    return v === 'all' ? pass.notes : pass.notes.filter((n) => n.line === +v);
  },
  reset() { this.stop(true); this.renderTrack(); this.showTarget(null); $('#result').hidden = true; $('#waitActions').innerHTML = ''; },
  renderTrack(states = {}) {
    const box = $('#track'); box.innerHTML = '';
    let lastLine = null;
    for (const n of groupsOf(this.section())) {
      if (lastLine != null && n.line !== lastLine) box.append(el('div', 'sep'));
      lastLine = n.line;
      const c = chip(n, { short: true, static: true });
      if (states[n.i]) c.classList.add(states[n.i]);
      box.append(c);
    }
  },
  mark(i, cls) {
    const c = [...document.querySelectorAll('#track .chip')].find((x) => i >= +x.dataset.i && i <= +(x.dataset.last ?? x.dataset.i));
    if (c) { c.classList.remove('now', 'ok', 'off', 'bad', 'miss'); if (cls) c.classList.add(cls); }
  },
  showTarget(n, next) {
    $('#tNote').textContent = n ? n.ar : '—';
    $('#tWhere').textContent = n ? where(n) : (this.active ? 'Listening…' : 'Tap Start, then play');
    $('#tNext').textContent = next ? `next: ${next.ar}` : '';
  },
  msg(text, cls = '') { const m = $('#liveMsg'); m.textContent = text; m.className = 'live-msg ' + cls; },

  async start() {
    if (this.active) { this.stop(); return; }
    $('#result').hidden = true; $('#waitActions').innerHTML = '';
    try { await listener.start(); }
    catch (e) {
      this.msg(location.protocol === 'https:' || location.hostname === 'localhost'
        ? 'Microphone blocked. Allow it in your browser settings and try again.'
        : 'The microphone needs the https:// address of this site.', 'bad');
      return;
    }
    this.active = true; this.played = []; this.waitMistakes = []; this.waitDone = null;
    this.startedAt = Date.now(); this.audioT0 = listener.now();
    this.recorder = new Recorder(listener.stream); this.recorder.start();
    $('#pStart').textContent = '■ Stop'; $('#pStart').classList.add('rec');
    listener.onFrame = (f) => liveMeter(f, this.expectedMidi());
    listener.onNote = (n) => { debug.notes.push(n); this.onNote(n); };
    this.renderTrack();
    if (this.mode === 'wait') this.startWait();
    if (this.mode === 'along') this.startAlong();
    if (this.mode === 'free') this.startFree();
  },
  async stop(silent = false) {
    if (!this.active) return;
    this.active = false; clearTimeout(this.endTimer); cancelAnimationFrame(this.raf); stopAll();
    listener.onNote = null; listener.onFrame = null;
    const rec = this.recorder; this.recorder = null;
    const audio = rec && !silent ? await rec.stop() : (rec && rec.stop(), null);
    listener.stop();
    $('#pStart').textContent = '🎤 Start'; $('#pStart').classList.remove('rec');
    if (!silent && (this.mode === 'free' || this.mode === 'along') && this.played.length) this.finish(audio);
    else if (!silent && this.mode === 'wait' && this.waitDone) this.saveWait(audio);
    else if (!silent && this.mode === 'free') this.msg('No notes heard. Play a little louder or closer to the phone.', 'warn');
    this.showTarget(null);
  },
  expectedMidi() {
    if (this.mode === 'wait' && this.waitList) { const n = this.waitList[this.wi]; return n ? n.midi : null; }
    return null;
  },
  onNote(n) {
    this.played.push(n);
    if (this.mode === 'wait') this.waitNote(n);
    if (this.mode === 'free') { clearTimeout(this.endTimer); this.endTimer = setTimeout(() => this.stop(), 3500); }
  },

  // ---- wait mode: step by step
  startWait() {
    this.waitList = groupsOf(this.section().filter((n) => !n.grace)); this.wi = 0; this.errors = 0; this.left = this.waitList[0] ? this.waitList[0].count : 0;
    this.stepWait();
    this.msg('Play the note shown.');
  },
  stepWait() {
    const n = this.waitList[this.wi];
    this.waitList.forEach((m, k) => this.mark(m.i, k < this.wi ? 'ok' : (k === this.wi ? 'now' : null)));
    this.showTarget(n, this.waitList[this.wi + 1]);
    if (n && n.count > 1) $('#tWhere').textContent = `${where(n)} · pick it ${this.left === n.count ? n.count + ' times' : this.left + ' more'}`;
  },
  waitNote(p) {
    const n = this.waitList[this.wi]; if (!n || p.legato) return;
    const d = p.midi - n.midi, tol = n.key === 'mi' ? 0.75 : 0.6, card = $('#target');
    card.classList.remove('good', 'badflash'); void card.offsetWidth;
    const octave = octaveRelated(d, tol);
    if (Math.abs(d) < tol || octave) {
      const cents = octave || p.spread > 0.4 ? 0 : Math.round(d * 100);
      card.classList.add('good');
      if (Math.abs(cents) > 35 && n.finger) this.msg(`✓ ${n.ar}, but ${cents > 0 ? 'a bit high: finger slightly toward the pegs' : 'a bit low: finger slightly toward the body'} (${cents > 0 ? '+' : ''}${cents}¢)`, 'warn');
      else if (Math.abs(cents) > 35) this.msg(`✓ ${n.ar}, string ${n.string} is ${cents > 0 ? 'sharp' : 'flat'} (${cents}¢): check the tuner`, 'warn');
      else if (octave) this.msg(`✓ ${n.ar} (make sure it's ${where(n).toLowerCase()})`, 'good');
      else this.msg(`✓ ${n.ar}${n.count > 1 ? ` (${n.count - this.left + 1} of ${n.count})` : ''}`, 'good');
      if (--this.left > 0) { this.stepWait(); return; }
      this.wi++;
      this.left = this.waitList[this.wi] ? this.waitList[this.wi].count : 0;
      if (this.wi >= this.waitList.length) {
        const errs = this.errors;
        this.waitList.forEach((m) => this.mark(m.i, 'ok'));
        this.msg(errs ? `Done! ${errs} wrong note${errs > 1 ? 's' : ''} on the way. Go again, or try Play along.` : 'Done, no mistakes! Try Play along next.', 'good');
        this.waitDone = { errs };
        this.showTarget(null); this.stop(); return;
      }
      this.stepWait();
    } else {
      this.errors++;
      card.classList.add('badflash');
      const got = nameOf(p.midi);
      this.waitMistakes.push({ expected: n.ar, where: where(n), heard: got.ar, semitones: +d.toFixed(2) });
      let hint;
      if (Math.abs(d) < 1.6 && n.finger) hint = `${d < 0 ? 'Too low' : 'Too high'}: move finger ${n.finger} ${d < 0 ? 'toward the body' : 'toward the pegs'}.`;
      else hint = `That was ${got.ar}. Want ${n.ar}: ${where(n).toLowerCase()}.`;
      this.msg(`✗ ${hint}`, 'bad');
      bumpWeak(n.key);
    }
  },

  saveWait(audio) {
    const n = this.waitList.length, errs = this.waitDone.errs;
    const take = buildTake({ mode: 'wait', score: { notes: Math.round(100 * n / (n + errs)) }, audio,
      extra: { waitErrors: errs, waitMistakes: this.waitMistakes } });
    takes.save(take);
    showTakeActions(take, $('#waitActions'));
  },

  // ---- play along: count-in, moving highlight, judged on timing too
  startAlong() {
    const ac = audioCtx(), speed = +$('#pSpeed').value, notes = this.section();
    const beat = 0.46 / speed;                       // the real players' beat is about 0.46 s
    const t0 = ac.currentTime + 0.3;
    for (let k = 0; k < 4; k++) click(t0 + k * beat, k === 0);
    this.alongStart = t0 + 4 * beat;                 // first note is due here
    this.alongNotes = notes; this.alongSpeed = speed;
    const base = notes[0].t, end = notes[notes.length - 1].t - base + notes[notes.length - 1].dur;
    this.msg('Count in: 1 · 2 · 3 · 4');
    const tick = () => {
      if (!this.active) return;
      const now = (ac.currentTime - this.alongStart) * speed;
      if (now < 0) { this.showTarget(notes[0], notes[1]); }
      else {
        let k = -1; for (let j = 0; j < notes.length; j++) if (notes[j].t - base <= now) k = j;
        const cur = notes[Math.max(0, k)];
        notes.forEach((m, j) => this.mark(m.i, j === k ? 'now' : null));
        this.showTarget(k >= 0 ? cur : notes[0], notes[k + 1]);
        if (now > 0.05) this.msg('');
      }
      if (now > end + 0.8) { this.stop(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },

  // ---- free play
  startFree() {
    const notes = this.section();
    this.showTarget(notes[0], notes[1]);
    $('#tWhere').textContent = 'Play the part at your own speed';
    this.msg('Listening… stops by itself after a few seconds of silence.');
  },

  finish(audio) {
    const ref = this.section();
    const judgeTiming = $('#pTiming').checked;
    const opts = this.mode === 'along'
      ? { mode: 'along', start: this.alongStart, speed: this.alongSpeed, judgeTiming }
      : { mode: 'free', judgeTiming };
    const played = this.played.filter((p) => this.mode !== 'along' || p.t > this.alongStart - 0.5);
    const res = analyzeTake(played, ref, opts);
    debug.results.push(res); debug.lastResult = res;
    const take = buildTake({ mode: this.mode, speed: this.mode === 'along' ? this.alongSpeed : null, score: res.score, res, audio });
    showResult(res, ref, this.mode, take);
    takes.save(take);
    res.items.forEach((it) => { if (!it.ref.grace && it.status !== 'ok') bumpWeak(it.ref.key); });
  },
};

function buildTake({ mode, speed, score, res, audio, extra = {} }) {
  const part = $('#pSection').value;
  const t0 = practice.audioT0 || 0;
  return {
    id: String(Date.now()), at: Date.now(), app: 'oud-coach', version: 1,
    song: `${song.title} (${song.titleEn}) — ${song.part}`, songId: song.id, version: version.name, versionId: version.id,
    passId: pass.id, passTitle: pass.title,
    part, partLabel: part === 'all' ? 'All 4 lines' : `Line ${part}`, mode, speed,
    judgeTiming: $('#pTiming').checked, score, durationSec: Math.round((Date.now() - practice.startedAt) / 100) / 10,
    tips: res ? res.tips.slice(0, 6).map((t) => t.text) : [],
    items: res ? res.items.map((it) => ({
      line: it.ref.line, ar: it.ref.ar, name: it.ref.name, where: where(it.ref), grace: it.ref.grace,
      status: it.status, cents: it.cents, dt: it.dt != null ? +it.dt.toFixed(3) : null,
      heard: !it.played ? null : (it.status === 'ok' ? it.ref.ar : nameOf(it.played.midi).ar),
    })) : [],
    heard: practice.played.map((p) => ({ t: +(p.t - t0).toFixed(3), midi: +p.midi.toFixed(2), note: nameOf(p.midi).ar, slid: !!p.legato })),
    device: navigator.userAgent, audio: audio || null, ...extra,
  };
}

function showTakeActions(take, box) {
  box.innerHTML = '';
  if (take.audio) {
    const play = el('button', 'btn', '▶ My take'); play.type = 'button';
    let au = null;
    play.addEventListener('click', () => {
      if (au && !au.paused) { au.pause(); play.textContent = '▶ My take'; return; }
      au = au || new Audio(URL.createObjectURL(take.audio));
      au.onended = () => (play.textContent = '▶ My take');
      au.currentTime = 0; au.play(); play.textContent = '■ Stop';
    });
    box.append(play);
  }
  const send = el('button', 'btn primary', '↗ Send to Claude'); send.type = 'button';
  send.addEventListener('click', async () => {
    const r = await shareTake(take);
    if (r === 'shared') toast('Sent. Ask Claude how it went.');
    else if (r === 'downloaded') toast('Saved the files. Attach them in your Claude chat.');
  });
  box.append(send);
}

function showResult(res, ref, mode, take) {
  $('#result').hidden = false;
  if (take) showTakeActions(take, $('#resActions'));
  const s = res.score;
  $('#tempoTxt').textContent = mode === 'free' ? `Your speed: ${Math.round(s.tempo * 100)}% of the real players.` : '';
  $('#scores').innerHTML =
    `<div class="score"><b>${s.notes}%</b><span>right notes</span></div>` +
    `<div class="score"><b>${s.tuning}%</b><span>in tune</span></div>` +
    (s.timing == null ? `<div class="score off"><b>—</b><span>timing off</span></div>`
      : `<div class="score"><b>${s.timing}%</b><span>${mode === 'along' ? 'on time' : 'rhythm'}</span></div>`);
  const box = $('#resTrack'); box.innerHTML = '';
  let lastLine = null;
  for (const it of res.items) {
    if (lastLine != null && it.ref.line !== lastLine) box.append(el('div', 'sep'));
    lastLine = it.ref.line;
    const c = chip(it.ref, { short: true });
    const cls = it.status === 'missed' ? 'miss' : it.status === 'ok' ? (it.cents != null && Math.abs(it.cents) > 35 ? 'off' : 'ok') : 'bad';
    c.classList.add(cls); box.append(c);
  }
  const tips = $('#tips'); tips.innerHTML = '';
  const top = res.tips.slice(0, 4);
  if (!top.length) tips.append(el('li', '', 'Clean take. Try it faster, or move to the next line.'));
  top.forEach((t) => tips.append(el('li', '', t.text.replace(/([؀-ۿ]+)/g, '<span class="ar">$1</span>'))));
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function liveMeter(f, target) {
  if (!(f.f0 > 0) || f.conf < 0.8 || f.db < -55) return;
  const m = hzToMidi(f.f0), nm = nameOf(m);
  $('#liveNote').textContent = nm.ar;
  const ref = target != null ? target : Math.round(m * 2) / 2;
  const c = Math.max(-100, Math.min(100, (m - ref) * 100));
  const needle = $('#liveNeedle');
  needle.style.left = `calc(${50 + c / 2}% - 3px)`;
  needle.style.background = Math.abs(c) < 20 ? 'var(--ok)' : Math.abs(c) < 50 ? 'var(--warn)' : 'var(--bad)';
}

document.querySelectorAll('#pMode button').forEach((b) => b.addEventListener('click', () => {
  practice.stop(true);
  practice.mode = b.dataset.mode;
  document.querySelectorAll('#pMode button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
  $('#pSpeedWrap').hidden = practice.mode !== 'along';
  $('#modeHint').textContent = MODE_HINT[practice.mode];
  practice.reset();
}));
$('#pSection').addEventListener('change', () => practice.reset());
$('#pStart').addEventListener('click', () => practice.start());
$('#pHear').addEventListener('click', () => {
  const notes = practice.section(), ac = audioCtx(); ac.resume();
  const sp = practice.mode === 'along' ? +$('#pSpeed').value : 0.75;
  const t0 = ac.currentTime + 0.1, base = notes[0].t;
  notes.forEach((n) => playNote(n.midi, t0 + (n.t - base) / sp, n.dur / sp));
});

// ------------------------------------------------------------------ TUNER
const tuner = {
  active: false, hist: [],
  strings() { const s = STRINGS.map((x) => ({ ...x })); const o = STRING5_OPTIONS[store.get('s5', 0)] || STRING5_OPTIONS[0]; Object.assign(s[4], o); return s; },
  render(active, cents) {
    const ul = $('#tuStrings'); ul.innerHTML = '';
    for (const s of this.strings()) {
      const li = el('li', active === s.n ? (Math.abs(cents) <= 8 ? 'ok' : 'off') : '', `<span class="ar">${s.ar}</span><small>String ${s.n}</small>`);
      ul.append(li);
    }
  },
  async start() {
    if (this.active) { this.stop(); return; }
    try { await listener.start(); } catch (_) { toast('Microphone blocked. Allow it and try again.'); return; }
    this.active = true; $('#tuStart').textContent = '■ Stop';
    listener.onNote = null;
    listener.onFrame = (f) => this.frame(f);
  },
  stop() {
    if (!this.active) return;
    this.active = false; listener.onFrame = null; listener.stop();
    $('#tuStart').textContent = '🎤 Start tuner';
  },
  frame(f) {
    if (!(f.f0 > 0) || f.conf < 0.85 || f.db < -55) return;
    this.hist.push(hzToMidi(f.f0)); if (this.hist.length > 7) this.hist.shift();
    if (this.hist.length < 4) return;
    const m = median(this.hist);
    let best = null;
    for (const s of this.strings()) { const d = m - s.midi; if (!best || Math.abs(d) < Math.abs(best.d)) best = { s, d }; }
    if (Math.abs(best.d) > 2.5) { $('#tuString').textContent = 'Not an open string'; $('#tuNote').textContent = nameOf(m).ar; $('#tuCents').textContent = ''; this.render(); return; }
    const cents = Math.round(best.d * 100);
    $('#tuString').textContent = `String ${best.s.n}`;
    $('#tuNote').textContent = best.s.ar;
    $('#tuNeedle').style.left = `calc(${50 + Math.max(-50, Math.min(50, cents)) }% - 3px)`;
    $('#tuCents').textContent = Math.abs(cents) <= 5 ? '✓ In tune' : `${cents > 0 ? '+' : ''}${cents}¢ · ${cents > 0 ? 'loosen a little' : 'tighten a little'}`;
    this.render(best.s.n, cents);
  },
};
$('#tuStart').addEventListener('click', () => tuner.start());
STRING5_OPTIONS.forEach((o, k) => $('#s5').append(new Option(`${o.ar} · ${o.name}`, k)));
$('#s5').value = store.get('s5', 0);
$('#s5').addEventListener('change', (e) => { store.set('s5', +e.target.value); tuner.render(); });

// ------------------------------------------------------------------ PROGRESS
function bumpWeak(key) { const w = store.get('weak', {}); w[key] = (w[key] || 0) + 1; store.set('weak', w); }
async function renderProgress() {
  const w = store.get('weak', {});
  const box = $('#weak'); box.innerHTML = '';
  const top = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) box.append(el('span', 'muted', 'Nothing yet. Practise a line and this fills in.'));
  top.forEach(([k, n]) => { const c = chip({ ...NOTES[k], i: -1, dur: 0 }, { short: true }); c.querySelector('.wh').textContent += ` · ${n}×`; box.append(c); });
  const ul = $('#history'); ul.innerHTML = '';
  const list = await takes.list();
  $('#sendAll').hidden = !list.length;
  if (!list.length) ul.append(el('li', 'muted', 'No takes yet.'));
  list.slice(0, 30).forEach((t) => {
    const d = new Date(t.at), s = t.score || {};
    const vname = t.version ? `${t.version} · ` : '';
    const sc = t.mode === 'wait' ? `${t.waitErrors || 0} wrong` : `notes ${s.notes}% · tune ${s.tuning}%` + (s.timing == null ? '' : ` · ${t.mode === 'along' ? 'time' : 'rhythm'} ${s.timing}%`);
    const li = el('li', 'take');
    li.append(el('div', 'take-info', `<b>${vname}${t.partLabel} · ${t.passId === 'p2' ? '2nd time' : '1st time'} · ${{ wait: 'Wait', along: 'Play along', free: 'Free' }[t.mode]}</b>` +
      `<span class="muted">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${sc}</span>`));
    const act = el('div', 'take-act'); showTakeActions(t, act);
    const del = el('button', 'btn ghost', '✕'); del.type = 'button'; del.title = 'Delete';
    del.addEventListener('click', async () => { await takes.remove(t.id); renderProgress(); });
    act.append(del); li.append(act); ul.append(li);
  });
}
$('#sendAll').addEventListener('click', async () => {
  const list = (await takes.list()).filter((t) => Date.now() - t.at < 24 * 3600e3);
  if (!list.length) { toast('No takes in the last 24 hours.'); return; }
  const r = await shareSummary(list);
  if (r === 'shared') toast('Sent. Ask Claude how today went.');
});
$('#clearHist').addEventListener('click', async () => { if (confirm('Delete all saved takes and recordings?')) { await takes.clear(); store.set('weak', {}); renderProgress(); } });

// ------------------------------------------------------------------ boot
$('#pTiming').checked = !version.paced;
renderLearn();
tuner.render();
$('#modeHint').textContent = MODE_HINT.wait;
practice.reset();
debug.practice = practice; debug.pass = () => pass;
