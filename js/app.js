import { STRINGS, STRING5_OPTIONS, nameOf, NOTES } from './notes.js';
import { SONGS, WANTED, buildPass, linesOf, groupsOf } from './library.js';
import { Listener, audioCtx, playNote, stopAll, click, hzToMidi, median } from './audio.js';
import { analyzeTake, octaveRelated, setScale, nearestInScale } from './analyze.js';
import { takes, Recorder, shareTake, shareSummary } from './takes.js';
import { mediaStore, durationOf, matchVersion } from './media.js';

// Screens: home (songs) → song (its lines, a path) → lesson (one line: Listen → Slowly → In time).
// Settings (version, main notes, real recording) sit behind the gear; the tuner and saved takes on home.

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
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
const arSpan = (s) => s.replace(/([؀-ۿ]+)/g, '<span class="ar">$1</span>');

// Each song opens on the version that sounds best (the owner liked Player 4 for Hob Eih).
const BEST = { 'hob-eih': 'player-4', 'ahib-al-lail': 'lesson', 'hob-min-tihib': 'player-1' };
const STEP_HINT = {
  listen: 'Listen and watch the notes. Tap any note to hear it alone.',
  slow: 'Play each note when you are ready. The coach waits for the right one.',
  time: 'After the 3-2-1, play each note as it reaches the line.',
};
const STEPS = ['listen', 'slow', 'time'];

// ------------------------------------------------------------------ selection
let song, version, pass, lineNo = 1, step = 'listen';
let mainOnly = store.get('mainOnly2', true);
function pickVersion(s) {
  const id = store.get('ver.' + s.id);
  return s.versions.find((v) => v.id === id) || s.versions.find((v) => v.id === BEST[s.id]) || s.versions[0];
}
function setSong(s) { song = s; store.set('song', s.id); version = pickVersion(s); setPass(); }
function setVersion(v) { version = v; store.set('ver.' + song.id, v.id); setPass(); }
function setPass(id = store.get('pass.' + song.id)) {
  const raw = version.passes.find((p) => p.id === id) || version.passes[0];
  pass = buildPass(raw, mainOnly); store.set('pass.' + song.id, pass.id);
  setScale(pass.notes);
}
setSong(SONGS.find((s) => s.id === store.get('song')) || SONGS[0]);
const lineCount = () => linesOf(pass.notes).length;
const sectionNotes = () => (lineNo === 'all' ? pass.notes : pass.notes.filter((n) => n.line === lineNo));
const lineLabel = (l = lineNo) => (l === 'all' ? `Whole ${song.part.toLowerCase()}` : `Line ${l}`);

// ------------------------------------------------------------------ progress (per song / part / line)
const prog = {
  all: store.get('prog', {}),
  key(l, s = song, p = pass) { return `${s.id}/${p.id}/${l}`; },
  get(l, s, p) { return this.all[this.key(l, s, p)] || {}; },
  set(l, patch) { this.all[this.key(l)] = { ...this.get(l), ...patch }; store.set('prog', this.all); },
  done(l, s, p) { const g = this.get(l, s, p); return !!(g.time && g.time.score >= 70); },
  stars(l, s, p) { const g = this.get(l, s, p); return g.time && g.time.score >= 70 ? (g.time.speed >= 1 ? 3 : g.time.speed >= 0.8 ? 2 : 1) : 0; },
};
const starStr = (k) => '★'.repeat(k) + '☆'.repeat(3 - k);
function nextLine() { for (let k = 1; k <= lineCount(); k++) if (!prog.done(k)) return k; return 'all'; }
function suggestStep(l) { const g = prog.get(l); return !g.heard ? 'listen' : !g.slow ? 'slow' : 'time'; }

// ------------------------------------------------------------------ navigation (hash routes, so iOS swipe-back works)
let fromApp = false;
function go(hash) { fromApp = true; if (location.hash !== hash) location.hash = hash; else route(); }
function stopEverything() { player.stop(); real.stop(); practice.stop(true); tuner.stop(); }
function route() {
  stopEverything();
  const h = location.hash.replace(/^#\/?/, '').split('/');
  const name = { song: 'songView', lesson: 'lesson', tuner: 'tunerView' }[h[0]] || 'home';
  if (name === 'lesson') {
    lineNo = h[1] === 'all' ? 'all' : Math.min(lineCount(), Math.max(1, +h[1] || 1));
    step = STEPS.includes(h[2]) ? h[2] : suggestStep(lineNo);
  }
  $$('.screen').forEach((s) => (s.hidden = s.id !== name));
  window.scrollTo(0, 0);
  ({ home: renderHome, songView: renderSong, lesson: renderLesson, tunerView: () => tuner.render() })[name]();
}
window.addEventListener('hashchange', route);
$$('[data-back]').forEach((b) => b.addEventListener('click', () => {
  if (fromApp && history.length > 1) history.back();
  else go($('#lesson').hidden ? '#/' : '#/song');
}));
$$('[data-gear]').forEach((b) => b.addEventListener('click', openSettings));
$$('.sheet').forEach((s) => s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-close]')) s.hidden = true; }));

// ------------------------------------------------------------------ HOME
function renderHome() {
  const box = $('#homeSongs'); box.innerHTML = '';
  for (const s of SONGS) {
    const v = pickVersion(s), p = buildPass(v.passes.find((x) => x.id === store.get('pass.' + s.id)) || v.passes[0], mainOnly);
    const n = linesOf(p.notes).length;
    let done = 0; for (let k = 1; k <= n; k++) if (prog.done(k, s, p)) done++;
    const card = el('button', 'song-card');
    card.type = 'button';
    card.innerHTML = `<span class="sc-ar">${s.title}</span>` +
      `<span class="sc-en">${[s.titleEn, s.artist].filter(Boolean).join(' · ')}</span>` +
      `<span class="progress"><i style="width:${Math.round(100 * done / n)}%"></i></span>` +
      `<span class="sc-foot"><span>${done ? `${done} of ${n} lines learned` : `${n} lines · ${s.part.toLowerCase()}`}</span><b>${done ? 'Continue' : 'Start'} ›</b></span>`;
    card.addEventListener('click', () => { setSong(s); go('#/song'); });
    box.append(card);
  }
  const wl = $('#wantedList'); wl.innerHTML = '';
  WANTED.forEach((w) => wl.append(el('div', 'wanted', `<span class="ar">${w.title}</span> <span class="muted">${w.artist || ''}</span>`)));
}
$('#goTuner').addEventListener('click', () => go('#/tuner'));
$('#goTakes').addEventListener('click', openTakes);

// ------------------------------------------------------------------ SONG: the path
function renderSong() {
  $('#svTitle').innerHTML = `<span class="ar">${song.title}</span>`;
  $('#svSub').textContent = `${[song.titleEn, song.artist].filter(Boolean).join(' · ')} · ${version.name}${mainOnly ? ' · main notes' : ''}`;
  const seg = $('#passSeg'); seg.innerHTML = '';
  seg.hidden = version.passes.length < 2;
  version.passes.forEach((p) => {
    const b = el('button', p.id === pass.id ? 'on' : '', p.title); b.type = 'button';
    b.addEventListener('click', () => { setPass(p.id); renderSong(); });
    seg.append(b);
  });
  const box = $('#path'); box.innerHTML = '';
  const nxt = nextLine();
  linesOf(pass.notes).forEach((line, k) => {
    const l = k + 1, done = prog.done(l), stars = prog.stars(l);
    const row = el('button', 'path-row' + (done ? ' done' : '') + (l === nxt ? ' next' : ''));
    row.type = 'button';
    const preview = groupsOf(line.filter((n) => !n.grace)).map((g) => g.ar + (g.count > 1 ? `<sub>×${g.count}</sub>` : '')).join(' ');
    row.innerHTML = `<span class="pr-num">${done ? '✓' : l}</span>` +
      `<span class="pr-body"><b>Line ${l}${l === nxt ? ' <em>next</em>' : ''}</b><span class="pr-notes" dir="rtl">${preview}</span></span>` +
      `<span class="pr-stars">${done ? starStr(stars) : '›'}</span>`;
    row.addEventListener('click', () => go(`#/lesson/${l}`));
    box.append(row);
  });
  const all = el('button', 'path-row whole' + (nxt === 'all' ? ' next' : ''));
  all.type = 'button';
  all.innerHTML = `<span class="pr-num">∞</span><span class="pr-body"><b>Whole ${song.part.toLowerCase()}${nxt === 'all' ? ' <em>next</em>' : ''}</b>` +
    `<span class="pr-notes">All ${lineCount()} lines in one go</span></span><span class="pr-stars">${prog.done('all') ? starStr(prog.stars('all')) : '›'}</span>`;
  all.addEventListener('click', () => go('#/lesson/all'));
  box.append(all);
}

// ------------------------------------------------------------------ LESSON
function setActions(list) {
  const box = $('#actions'); box.innerHTML = '';
  list.forEach(({ label, fn, primary, id }) => {
    const b = el('button', 'btn ' + (primary ? 'primary huge' : 'second'), label); b.type = 'button';
    if (id) b.id = id;
    b.addEventListener('click', fn); box.append(b);
  });
}
function setStep(s) {
  step = s; fromApp = true;
  history.replaceState(null, '', `#/lesson/${lineNo}/${s}`);
  stopEverything(); renderLesson();
}
$$('#steps button').forEach((b) => b.addEventListener('click', () => setStep(b.dataset.step)));

function renderLesson() {
  $('#lsTitle').innerHTML = `${lineLabel()} <span class="muted">· <span class="ar">${song.title}</span></span>`;
  const g = prog.get(lineNo);
  $$('#steps button').forEach((b) => {
    const s = b.dataset.step, ok = s === 'listen' ? g.heard : s === 'slow' ? g.slow : g.time && g.time.score >= 70;
    b.classList.toggle('on', s === step); b.classList.toggle('ok', !!ok);
  });
  $('#stepHint').textContent = STEP_HINT[step];
  $('#lesson').dataset.step = step;
  $('#result').hidden = true; $('#msg').textContent = ''; $('#msg').className = 'msg';
  $('#mic').hidden = true; $('#lane').hidden = step !== 'time'; $('#strip').hidden = step === 'time';
  $('#realStage').hidden = true; $('#big').hidden = false;
  showBig(null);
  renderSpeeds();
  if (step === 'listen') lessonListen();
  if (step === 'slow') lessonSlow();
  if (step === 'time') lessonTime();
}

// big note card + neck diagram
function neckSVG(n) {
  const W = 300, gap = 17, top = 12, H = top * 2 + gap * 5, X = { 1: 120, 2: 170, 3: 215, 4: 255 };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${n ? where(n) : ''}"><rect class="nut" x="46" y="4" width="5" height="${H - 8}" rx="2"/>`;
  for (let k = 1; k <= 6; k++) {
    const y = top + (6 - k) * gap, on = n && n.string === k;
    s += `<line class="${on ? 'str on' : 'str'}" x1="51" x2="${W - 4}" y1="${y}" y2="${y}"/><text class="${on ? 'sn on' : 'sn'}" x="22" y="${y + 5}">${k}</text>`;
  }
  if (n) {
    const y = top + (6 - n.string) * gap;
    if (n.finger) s += `<circle class="dot" cx="${X[n.finger]}" cy="${y}" r="12"/><text class="fn" x="${X[n.finger]}" y="${y + 5}">${n.finger}</text>`;
    else s += `<circle class="ring" cx="78" cy="${y}" r="11"/><text class="fo" x="78" y="${y + 4}">open</text>`;
  }
  return s + '</svg>';
}
function showBig(n, next, extra) {
  $('#bigNote').textContent = n ? n.ar : '—';
  $('#bigWhere').textContent = n ? where(n) + (extra || '') : '';
  $('#neck').innerHTML = neckSVG(n);
  $('#bigNext').innerHTML = next && next.length ? `then <span class="ar">${next.map((m) => m.ar).join(' · ')}</span>` : '';
}
function pop(cls) {
  const f = $('#flash'), b = $('#big');
  f.className = 'flash'; b.classList.remove('good', 'bad'); void f.offsetWidth;
  f.className = 'flash ' + cls; b.classList.add(cls);
  clearTimeout(pop.h); pop.h = setTimeout(() => b.classList.remove('good', 'bad'), 600);
}
function say(text, cls = '') { const m = $('#msg'); m.innerHTML = arSpan(text); m.className = 'msg ' + cls; }

function renderStrip(groups, opts = {}) {
  const box = $('#strip'); box.innerHTML = '';
  let lastLine = null;
  for (const g of groups) {
    if (lastLine != null && g.line !== lastLine) box.append(el('span', 'br'));
    lastLine = g.line;
    const c = el('button', 'chip' + (g.grace ? ' grace' : '') + (g.count > 1 ? ' multi' : ''),
      `<span class="ar">${g.ar}</span>${g.count > 1 ? `<span class="x">×${g.count}</span>` : ''}`);
    c.type = 'button'; c.dataset.i = g.i; c.dataset.last = g.notes[g.notes.length - 1].i;
    c.title = `${g.name}: ${where(g)}`;
    c.addEventListener('click', () => { audioCtx().resume(); playNote(g.midi, 0, 1.1); if (!opts.quiet) showBig(g); });
    box.append(c);
  }
}
function markStrip(i, cls) {
  const c = $$('#strip .chip').find((x) => i >= +x.dataset.i && i <= +x.dataset.last);
  if (c) { c.classList.remove('now', 'ok', 'bad', 'miss'); if (cls) c.classList.add(cls); }
  return c;
}
function showNow(n, notes) {
  $$('#strip .chip.now').forEach((c) => c.classList.remove('now'));
  if (!n) return;
  const c = markStrip(n.i, 'now');
  if (c && c !== showNow.last) { c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); showNow.last = c; }
  if (showNow.big !== n.i) {
    showNow.big = n.i;
    const k = notes ? notes.indexOf(n) : -1;
    showBig(n, k >= 0 ? groupsOf(notes.slice(k + 1).filter((m) => !m.grace)).slice(0, 3) : null);
    $('#realNote').innerHTML = `${n.ar}<small>${where(n)}</small>`;
  }
}

// speed choice: Listen 50/75/100 %, In time Slow/Medium/Full
let listenSpeed = store.get('listenSpeed', 0.75);
let timeSpeed = 0.6;
function renderSpeeds() {
  const seg = $('#speedSeg'); seg.innerHTML = '';
  seg.hidden = step === 'slow';
  const opts = step === 'listen' ? [[0.5, 'Slow'], [0.75, 'Medium'], [1, 'Real speed']] : [[0.6, 'Slow'], [0.8, 'Medium'], [1, 'Full speed']];
  const cur = step === 'listen' ? listenSpeed : timeSpeed;
  opts.forEach(([v, label]) => {
    const b = el('button', v === cur ? 'on' : '', label); b.type = 'button';
    b.addEventListener('click', () => {
      if (step === 'listen') { listenSpeed = v; store.set('listenSpeed', v); } else timeSpeed = v;
      stopEverything(); renderLesson();
    });
    seg.append(b);
  });
}

// ---- step 1: listen
async function lessonListen() {
  const notes = sectionNotes();
  renderStrip(groupsOf(notes));
  showBig(notes[0], groupsOf(notes.slice(1).filter((m) => !m.grace)).slice(0, 3));
  const hasReal = await real.load();
  if (step !== 'listen' || $('#lesson').hidden) return;
  $('#realStage').hidden = !hasReal;
  $('#big').hidden = hasReal;   // the video shows the note itself
  const idle = () => {
    const heard = prog.get(lineNo).heard;
    setActions(heard
      ? [{ label: 'Next: play it slowly ›', primary: true, fn: () => setStep('slow') }, { label: '▶ Listen again', fn: listen }]
      : [{ label: '▶ Listen', primary: true, fn: listen, id: 'mainBtn' }]);
  };
  const listen = () => {
    setActions([{ label: '■ Stop', primary: true, fn: () => { player.stop(); real.stop(); idle(); } }]);
    const done = () => { prog.set(lineNo, { heard: 1 }); $$('#steps button')[0].classList.add('ok'); idle(); };
    if (real.loaded) real.playNotes(notes, listenSpeed, done);
    else player.play(notes, listenSpeed, done);
  };
  idle();
}

// ---- step 2: slowly (the coach waits for each note)
function lessonSlow() {
  const list = groupsOf(sectionNotes().filter((n) => !n.grace));
  renderStrip(list, { quiet: true });
  showBig(list[0], list.slice(1, 4), list[0].count > 1 ? ` · pick it ${list[0].count} times` : '');
  setActions([{ label: '🎤 Start', primary: true, fn: () => practice.start('wait'), id: 'mainBtn' },
    { label: '▶ Hear it', fn: () => player.play(sectionNotes(), 0.75) }]);
}

// ---- step 3: in time (notes slide to the line)
function lessonTime() {
  const best = prog.get(lineNo).time;
  if (!lessonTime.chosen) timeSpeed = best && best.score >= 80 ? Math.min(1, best.speed + 0.2) : best ? best.speed : 0.6;
  lessonTime.chosen = false;
  renderSpeeds();
  const groups = groupsOf(sectionNotes());
  lane.build(groups); lane.update(groups[0].t - 0.5);
  showBig(groups.find((g) => !g.grace), null);
  $('#bigWhere').textContent = 'Get ready';
  setActions([{ label: '🎤 Start', primary: true, fn: () => practice.start('along'), id: 'mainBtn' },
    { label: '▶ Hear it', fn: () => player.play(sectionNotes(), timeSpeed) }]);
}
// keep a speed the player picked by hand
$('#speedSeg').addEventListener('click', () => { if (step === 'time') lessonTime.chosen = true; }, true);

// moving lane for "In time": future notes come from the left (Arabic order) to the line on the right
const PPS = 150, GAP = 54;   // pixels per second of the song; chips never closer than GAP
const lane = {
  groups: [],
  build(groups) {
    const box = $('#lane'); box.querySelectorAll('.lchip').forEach((c) => c.remove());
    this.groups = groups;
    let L = 0;
    groups.forEach((g, k) => {
      g.state = null;
      L = k === 0 ? 0 : Math.max(L + (g.t - groups[k - 1].t) * PPS, L + (g.grace || groups[k - 1].grace ? GAP * 0.8 : GAP));
      g.L = L;
      g.el = el('div', 'lchip' + (g.grace ? ' grace' : ''), `<span class="ar">${g.ar}</span>${g.count > 1 ? `<span class="x">×${g.count}</span>` : ''}`);
      box.append(g.el);
    });
  },
  // where the strip is at song time nowRef: each chip reaches the line exactly at its own time
  offset(now) {
    const G = this.groups, n = G.length;
    if (now <= G[0].t) return G[0].L - (G[0].t - now) * PPS;
    if (now >= G[n - 1].t) return G[n - 1].L + (now - G[n - 1].t) * PPS;
    let k = 0; while (k + 1 < n && G[k + 1].t <= now) k++;
    return G[k].L + (now - G[k].t) / (G[k + 1].t - G[k].t) * (G[k + 1].L - G[k].L);
  },
  update(nowRef) {
    const W = $('#lane').clientWidth || 340, hit = W * 0.8, off = this.offset(nowRef);
    for (const g of this.groups) {
      const x = hit - (g.L - off);
      g.el.style.transform = `translateX(${(x - 24).toFixed(1)}px)`;
      g.el.style.visibility = x < -60 || x > W + 60 ? 'hidden' : 'visible';
    }
  },
  mark(g, state) { g.state = state; g.el.classList.remove('ok', 'bad', 'miss'); if (state) g.el.classList.add(state); },
};

// ------------------------------------------------------------------ playback: computer sound
const player = {
  playing: false, raf: 0,
  play(notes, speed, onEnd) {
    this.stop(); real.stop();
    const ac = audioCtx(); ac.resume();
    const t0 = ac.currentTime + 0.15, base = notes[0].t, last = notes[notes.length - 1];
    const end = (last.t - base + Math.min(1.2, last.dur)) / speed;
    notes.forEach((n) => playNote(n.midi, t0 + (n.t - base) / speed, n.dur / speed));
    this.playing = true; showNow.big = null;
    const tick = () => {
      if (!this.playing) return;
      const now = (ac.currentTime - t0) * speed + base;
      let cur = null; for (const n of notes) if (n.t <= now) cur = n;
      if (cur) showNow(cur, notes);
      if (ac.currentTime - t0 > end + 0.2) { this.stop(); onEnd && onEnd(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },
  stop() {
    if (!this.playing) return;
    this.playing = false; cancelAnimationFrame(this.raf); stopAll(); showNow(null);
  },
};

// ------------------------------------------------------------------ playback: the real recording, notes in sync
const real = {
  el: $('#realVideo'), loaded: false, key: null, url: null, raf: 0,
  start() { return version.media && version.media.starts[pass.id] != null ? version.media.starts[pass.id] : null; },
  async load() {
    const key = `${song.id}:${version.id}`;
    if (this.key === key) return this.loaded;
    this.key = key; this.loaded = false;
    if (this.start() == null) { this.el.removeAttribute('src'); return false; }
    const rec = await mediaStore.get(key);
    if (this.key !== key) return false;
    if (rec && rec.blob) {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(rec.blob); this.el.src = this.url; this.loaded = true;
      this.el.onloadedmetadata = () => { try { this.el.currentTime = Math.max(0, this.start() + sectionNotes()[0].t - 0.3); } catch (_) {} };
    } else this.el.removeAttribute('src');
    return this.loaded;
  },
  forget() { this.key = null; },
  playNotes(notes, speed, onEnd) {
    player.stop(); this.stop();
    const s0 = this.start(), last = notes[notes.length - 1], nxt = pass.notes[last.i + 1];
    const a = s0 + notes[0].t - 0.3, b = s0 + (nxt ? nxt.t : pass.end) + 0.1;
    const v = this.el;
    v.playbackRate = speed; v.preservesPitch = true; v.webkitPreservesPitch = true;
    try { v.currentTime = Math.max(0, a); } catch (_) {}
    v.play().catch(() => toast('Tap Listen again to start the sound.'));
    showNow.big = null;
    const tick = () => {
      if (v.paused) return;
      const tt = v.currentTime - s0;
      let cur = null; for (const n of notes) if (n.t <= tt + 0.02) cur = n;
      if (cur) showNow(cur, notes);
      if (v.currentTime >= b) { this.stop(); onEnd && onEnd(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(tick);
  },
  stop() { this.el.pause(); cancelAnimationFrame(this.raf); },
};

// ------------------------------------------------------------------ the coach listening
const listener = new Listener();
debug.listener = listener;
function pitchOk(midi, n) {
  const d = midi - n.midi, tol = n.key === 'mi' ? 0.75 : 0.6;
  return Math.abs(d) < tol || octaveRelated(d, tol) || (Math.abs(d) < 1.0 && nearestInScale(midi) === n.midi);
}
function micMeter(f) {
  const pct = Math.max(0, Math.min(1, (f.db + 70) / 45));
  $('#lvl').style.width = `${Math.round(pct * 100)}%`;
  if (f.f0 > 0 && f.conf > 0.8 && f.db > -55) { $('#hear').textContent = nameOf(hzToMidi(f.f0)).ar; clearTimeout(micMeter.h); micMeter.h = setTimeout(() => ($('#hear').textContent = '—'), 700); }
}
let wakeLock = null;

const practice = {
  mode: null, active: false,
  async start(mode) {
    if (this.active) { this.stop(); return; }
    player.stop(); real.stop();
    this.mode = mode;
    $('#result').hidden = true;
    try { await listener.start(); }
    catch (e) {
      say(location.protocol === 'https:' || location.hostname === 'localhost'
        ? 'The microphone is blocked. Allow it for this site in Settings, then try again.'
        : 'The microphone needs the https:// address of this site.', 'bad');
      return;
    }
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch (_) {}
    this.active = true; this.played = []; this.waitMistakes = [];
    this.startedAt = Date.now(); this.audioT0 = listener.now();
    this.recorder = new Recorder(listener.stream); this.recorder.start();
    $('#mic').hidden = false;
    setActions([{ label: '■ Stop', primary: true, fn: () => this.stop(), id: 'mainBtn' }]);
    $('#mainBtn').classList.add('rec');
    listener.onFrame = micMeter;
    listener.onNote = (n) => { debug.notes.push(n); this.played.push(n); if (mode === 'wait') this.waitNote(n); else this.alongNote(n); };
    if (mode === 'wait') this.startWait(); else this.startAlong();
  },
  async stop(silent = false) {
    if (!this.active) return;
    this.active = false; cancelAnimationFrame(this.raf); stopAll();
    try { wakeLock && wakeLock.release(); } catch (_) {} wakeLock = null;
    listener.onNote = null; listener.onFrame = null;
    const rec = this.recorder; this.recorder = null;
    const audio = rec && !silent ? await rec.stop() : (rec && rec.stop(), null);
    listener.stop();
    $('#mic').hidden = true;
    if (silent) return;
    if (this.mode === 'wait') this.finishWait(audio);
    else this.finishAlong(audio);
  },

  // ---- slowly: wait for each note
  startWait() {
    this.list = groupsOf(sectionNotes().filter((n) => !n.grace));
    this.wi = 0; this.errors = 0; this.left = this.list[0].count; this.complete = false;
    renderStrip(this.list, { quiet: true });
    this.stepWait();
    say('Play the big note.');
  },
  stepWait() {
    const n = this.list[this.wi];
    this.list.forEach((m, k) => markStrip(m.i, k < this.wi ? 'ok' : k === this.wi ? 'now' : null));
    const c = markStrip(n.i, 'now'); if (c) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    showBig(n, this.list.slice(this.wi + 1, this.wi + 4),
      n.count > 1 ? (this.left === n.count ? ` · pick it ${n.count} times` : ` · ${this.left} more`) : '');
  },
  waitNote(p) {
    const n = this.list[this.wi]; if (!n || p.legato) return;
    const d = p.midi - n.midi;
    if (pitchOk(p.midi, n)) {
      pop('good');
      const cents = octaveRelated(d, 0.6) || p.spread > 0.4 ? 0 : Math.round(d * 100);
      if (Math.abs(cents) > 35 && n.finger) say(`✓ Right note, a little ${cents > 0 ? 'high: move finger ' + n.finger + ' toward the pegs' : 'low: move finger ' + n.finger + ' toward the body'}.`, 'warn');
      else if (Math.abs(cents) > 35) say(`✓ Right note, but string ${n.string} is ${cents > 0 ? 'sharp' : 'flat'}: check the tuner.`, 'warn');
      else say(`✓ ${n.ar}`, 'good');
      if (--this.left > 0) { this.stepWait(); return; }
      this.wi++;
      if (this.wi >= this.list.length) { this.complete = true; this.stop(); return; }
      this.left = this.list[this.wi].count;
      this.stepWait();
    } else {
      this.errors++;
      pop('bad');
      const got = nameOf(p.midi);
      this.waitMistakes.push({ expected: n.ar, where: where(n), heard: got.ar, semitones: +d.toFixed(2) });
      if (Math.abs(d) < 1.6 && n.finger) say(`✗ ${d < 0 ? 'A bit low' : 'A bit high'}: move finger ${n.finger} ${d < 0 ? 'toward the body' : 'toward the pegs'}.`, 'bad');
      else say(`✗ That was ${got.ar}. Play ${n.ar}: ${where(n).toLowerCase()}.`, 'bad');
      bumpWeak(n.key);
    }
  },
  finishWait(audio) {
    if (!this.complete) { lessonSlow(); say(this.wi ? `Stopped at note ${this.wi + 1} of ${this.list.length}.` : ''); return; }
    const errs = this.errors, n = this.list.length, stars = errs === 0 ? 3 : errs <= 2 ? 2 : 1;
    prog.set(lineNo, { slow: Math.max(stars, prog.get(lineNo).slow || 0) });
    $$('#steps button')[1].classList.add('ok');
    const take = buildTake({ mode: 'wait', score: { notes: Math.round(100 * n / (n + errs)) }, audio, extra: { waitErrors: errs, waitMistakes: this.waitMistakes } });
    takes.save(take);
    say('');
    showResult({ stars, big: errs ? `${errs} wrong` : 'No mistakes', sub: `${n} notes`, tip: errs ? 'Go again until it is clean, or move on.' : 'Now try it in time.', take });
    setActions([{ label: 'Next: play it in time ›', primary: true, fn: () => setStep('time') }, { label: '↻ Again', fn: () => { lessonSlow(); practice.start('wait'); } }]);
  },

  // ---- in time: count-in, notes slide to the line, judged live and at the end
  startAlong() {
    const ac = audioCtx(), speed = timeSpeed, notes = sectionNotes(), groups = groupsOf(notes);
    lane.build(groups);
    const beat = 0.46 / speed, t0 = ac.currentTime + 0.3;
    for (let k = 0; k < 3; k++) click(t0 + k * beat, k === 0);
    this.alongStart = t0 + 3 * beat; this.alongSpeed = speed; this.groups = groups; this.base = notes[0].t;
    const end = notes[notes.length - 1].t + Math.min(1, notes[notes.length - 1].dur);
    say('');
    const tick = () => {
      if (!this.active) return;
      const nowReal = ac.currentTime - this.alongStart, nowRef = nowReal * speed + this.base;
      lane.update(nowRef);
      if (nowReal < 0) {
        const k = Math.ceil(-nowReal / beat);
        $('#bigNote').textContent = String(Math.min(3, k)); $('#bigWhere').textContent = 'Get ready';
      } else {
        const due = groups.find((g) => !g.grace && g.t + g.dur > nowRef - 0.05);
        if (due && this.dueI !== due.i) {
          this.dueI = due.i;
          const k = groups.indexOf(due);
          showBig(due, groups.slice(k + 1).filter((g) => !g.grace).slice(0, 3), due.count > 1 ? ` · ×${due.count}` : '');
        }
        for (const g of groups) if (!g.grace && g.state !== 'ok' && nowRef - (g.t + g.dur) > 0.45) { if (g.state !== 'miss' && g.state !== 'bad') lane.mark(g, 'miss'); }
      }
      if (nowReal > (end - this.base) / speed + 0.7) { this.stop(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.dueI = null;
    this.raf = requestAnimationFrame(tick);
  },
  alongNote(p) {
    if (p.legato || !this.groups) return;
    const nowRef = (p.t - this.alongStart) * this.alongSpeed + this.base;
    const win = 0.45 * this.alongSpeed;
    let best = null, nearest = null;
    for (const g of this.groups) {
      const dt = nowRef < g.t ? g.t - nowRef : Math.max(0, nowRef - (g.t + g.dur));
      if (dt > win + 0.2) continue;
      if (!nearest || dt < nearest.dt) nearest = { g, dt };
      if (g.state !== 'ok' && dt <= win && pitchOk(p.midi, g) && (!best || dt < best.dt)) best = { g, dt };
    }
    if (best) { lane.mark(best.g, 'ok'); pop('good'); }
    else if (nearest && !nearest.g.grace && nearest.g.state !== 'ok') { lane.mark(nearest.g, 'bad'); pop('bad'); }
  },
  finishAlong(audio) {
    const ref = sectionNotes();
    const played = this.played.filter((p) => p.t > this.alongStart - 0.5);
    if (!played.length) { lessonTime(); say('No notes heard. Play a little louder or closer to the phone.', 'warn'); return; }
    const res = analyzeTake(played, ref, { mode: 'along', start: this.alongStart, speed: this.alongSpeed, judgeTiming: true, scaleNotes: pass.notes });
    debug.results.push(res); debug.lastResult = res;
    res.items.forEach((it) => { if (!it.ref.grace && it.status !== 'ok') bumpWeak(it.ref.key); });
    const take = buildTake({ mode: 'along', speed: this.alongSpeed, score: res.score, res, audio });
    takes.save(take);
    const s = res.score, speed = this.alongSpeed;
    const prev = prog.get(lineNo).time;
    if (s.notes >= 70 && (!prev || speed > prev.speed || (speed === prev.speed && s.notes > prev.score) || prev.score < 70)) prog.set(lineNo, { time: { score: s.notes, speed } });
    else if (!prev) prog.set(lineNo, { time: { score: s.notes, speed } });
    const stars = s.notes >= 70 ? (speed >= 1 ? 3 : speed >= 0.8 ? 2 : 1) : 0;
    if (stars) $$('#steps button')[2].classList.add('ok');
    const tip = res.tips[0] ? res.tips[0].text : (s.notes >= 90 ? 'Clean. Try it faster.' : 'Again, a little slower if you need.');
    showResult({ stars, big: `${s.notes}%`, sub: `right notes${s.timing != null ? ` · ${s.timing}% on time` : ''}`, tip, take });
    const acts = [];
    const nl = lineNo === 'all' ? null : lineNo < lineCount() ? lineNo + 1 : 'all';
    if (s.notes >= 80 && speed < 1) acts.push({ label: 'Faster ›', primary: true, fn: () => { timeSpeed = Math.min(1, +(speed + 0.2).toFixed(1)); lessonTime.chosen = true; renderLesson(); practice.start('along'); } });
    else if (s.notes >= 70 && nl) acts.push({ label: `Next: ${lineLabel(nl)} ›`, primary: true, fn: () => go(`#/lesson/${nl}/listen`) });
    else if (s.notes >= 70) acts.push({ label: 'Done ✓ Back to the song', primary: true, fn: () => go('#/song') });
    acts.push({ label: '↻ Again', primary: !acts.length, fn: () => { lessonTime.chosen = true; renderLesson(); practice.start('along'); } });
    if (s.notes >= 80 && speed < 1 && nl) acts.push({ label: `${lineLabel(nl)} ›`, fn: () => go(`#/lesson/${nl}/listen`) });
    setActions(acts);
  },
};

function showResult({ stars, big, sub, tip, take }) {
  const box = $('#result'); box.hidden = false;
  box.innerHTML = `<div class="r-stars">${stars ? starStr(stars) : ''}</div><div class="r-big">${big}</div><div class="r-sub">${sub}</div>` +
    (tip ? `<p class="r-tip">${arSpan(tip)}</p>` : '') + '<div class="r-links"></div>';
  takeLinks(take, box.querySelector('.r-links'));
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function takeLinks(take, box) {
  if (take.audio) {
    const play = el('button', 'link', '▶ Hear my take'); play.type = 'button';
    let au = null;
    play.addEventListener('click', () => {
      if (au && !au.paused) { au.pause(); play.textContent = '▶ Hear my take'; return; }
      au = au || new Audio(URL.createObjectURL(take.audio));
      au.onended = () => (play.textContent = '▶ Hear my take');
      au.currentTime = 0; au.play(); play.textContent = '■ Stop';
    });
    box.append(play);
  }
  const send = el('button', 'link', '↗ Send to Claude'); send.type = 'button';
  send.addEventListener('click', async () => {
    const r = await shareTake(take);
    if (r === 'shared') toast('Sent. Ask Claude how it went.');
    else if (r === 'downloaded') toast('Saved the files. Attach them in your Claude chat.');
  });
  box.append(send);
}

function buildTake({ mode, speed, score, res, audio, extra = {} }) {
  const t0 = practice.audioT0 || 0;
  return {
    id: String(Date.now()), at: Date.now(), app: 'oud-coach',
    song: `${song.title} (${song.titleEn}) — ${song.part}`, songId: song.id, version: version.name, versionId: version.id,
    passId: pass.id, passTitle: pass.title,
    part: String(lineNo), partLabel: lineLabel(), mode, speed,
    judgeTiming: mode === 'along', mainOnly, score, durationSec: Math.round((Date.now() - practice.startedAt) / 100) / 10,
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

// ------------------------------------------------------------------ settings sheet
function tagOf(v) {
  if (v.id === 'original') return '<span class="tag real">the real song</span>';
  if (v.id === BEST[song.id]) return '<span class="tag best">best</span>';
  return v.paced ? '<span class="tag notes">even pace</span>' : '<span class="tag measured">real timing</span>';
}
function openSettings() {
  $('#mainOnly').checked = mainOnly;
  const list = $('#versionList'); list.innerHTML = '';
  const row = (v) => {
    const b = el('button', 'ver-row' + (v === version ? ' on' : ''), `<b>${v.name}</b>${tagOf(v)}<small>${v.about}</small>`);
    b.type = 'button';
    b.addEventListener('click', () => { setVersion(v); real.forget(); $('#settings').hidden = true; route(); toast(`Version: ${v.name}`); });
    return b;
  };
  song.versions.filter((v) => !v.more).forEach((v) => list.append(row(v)));
  const more = song.versions.filter((v) => v.more);
  if (more.length) {
    const d = el('details', 'more-vers'); d.open = more.includes(version);
    d.append(el('summary', '', `More versions (${more.length})`));
    more.forEach((v) => d.append(row(v))); list.append(d);
  }
  renderRecBox();
  $('#settings').hidden = false;
}
async function renderRecBox() {
  const box = $('#recBox'); box.innerHTML = '';
  if (!version.media) { box.append(el('p', 'muted small', `${version.name} has no recording. Pick a version marked “real timing”.`)); return; }
  const rec = await mediaStore.get(`${song.id}:${version.id}`);
  if (rec && rec.blob) {
    box.append(el('p', 'small', `✓ Loaded on this phone. Listen uses the real sound for ${version.name}.`));
    const rm = el('button', 'btn ghost', 'Remove'); rm.type = 'button';
    rm.addEventListener('click', async () => { await mediaStore.remove(`${song.id}:${version.id}`); real.forget(); renderRecBox(); });
    box.append(rm);
  } else {
    box.append(el('p', 'muted small', `Hear the real player instead of the computer. Save the file <b>${version.media.file}</b> from your Claude chat, then load it here once.`));
    const ld = el('button', 'btn', '📂 Load the recording'); ld.type = 'button';
    ld.addEventListener('click', () => $('#realFile').click());
    box.append(ld);
  }
}
$('#mainOnly').addEventListener('change', (e) => {
  mainOnly = e.target.checked; store.set('mainOnly2', mainOnly);
  setPass(pass.id); route();
});
$('#realFile').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0]; e.target.value = '';
  if (!f) return;
  const d = await durationOf(f), v = matchVersion(song, f, d);
  if (!v) { toast("This file doesn't match a version of this song. Use the files Claude sent."); return; }
  const ok = await mediaStore.put(`${song.id}:${v.id}`, f, f.name);
  if (!ok) { toast('Could not save the file on this phone (storage full or private mode).'); return; }
  toast(`Saved for ${v.name}.`);
  if (v !== version) setVersion(v);
  real.forget(); openSettings(); route();
});

// ------------------------------------------------------------------ takes sheet
function bumpWeak(key) { const w = store.get('weak', {}); w[key] = (w[key] || 0) + 1; store.set('weak', w); }
async function openTakes() {
  $('#takesSheet').hidden = false;
  const w = store.get('weak', {});
  const box = $('#weak'); box.innerHTML = '';
  const top = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) box.append(el('span', 'muted', 'Nothing yet. Practise a line and this fills in.'));
  top.forEach(([k, n]) => box.append(el('span', 'weak-chip', `<span class="ar">${NOTES[k].ar}</span><small>${where(NOTES[k])} · ${n}× missed</small>`)));
  const ul = $('#history'); ul.innerHTML = '';
  const list = await takes.list();
  $('#sendAll').hidden = !list.length;
  if (!list.length) ul.append(el('li', 'muted', 'No takes yet.'));
  list.slice(0, 30).forEach((t) => {
    const d = new Date(t.at), s = t.score || {};
    const sc = t.mode === 'wait' ? `${t.waitErrors || 0} wrong` : `notes ${s.notes}%` + (s.timing == null ? '' : ` · on time ${s.timing}%`);
    const li = el('li', 'take');
    li.append(el('div', 'take-info', `<b>${arSpan((t.song || '').split(' (')[0])} · ${t.partLabel} · ${{ wait: 'Slowly', along: 'In time', free: 'Free' }[t.mode] || t.mode}</b>` +
      `<span class="muted">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${sc}</span>`));
    const act = el('div', 'take-act'); takeLinks(t, act);
    const del = el('button', 'link', '✕'); del.type = 'button'; del.title = 'Delete';
    del.addEventListener('click', async () => { await takes.remove(t.id); openTakes(); });
    act.append(del); li.append(act); ul.append(li);
  });
}
$('#sendAll').addEventListener('click', async () => {
  const list = (await takes.list()).filter((t) => Date.now() - t.at < 24 * 3600e3);
  if (!list.length) { toast('No takes in the last 24 hours.'); return; }
  const r = await shareSummary(list);
  if (r === 'shared') toast('Sent. Ask Claude how today went.');
});
$('#clearHist').addEventListener('click', async () => { if (confirm('Delete all saved takes and recordings?')) { await takes.clear(); store.set('weak', {}); openTakes(); } });

// ------------------------------------------------------------------ TUNER
const tuner = {
  active: false, hist: [],
  strings() { const s = STRINGS.map((x) => ({ ...x })); const o = STRING5_OPTIONS[store.get('s5', 0)] || STRING5_OPTIONS[0]; Object.assign(s[4], o); return s; },
  render(active, cents) {
    const ul = $('#tuStrings'); ul.innerHTML = '';
    for (const s of this.strings()) ul.append(el('li', active === s.n ? (Math.abs(cents) <= 8 ? 'ok' : 'off') : '', `<span class="ar">${s.ar}</span><small>String ${s.n}</small>`));
  },
  async start() {
    if (this.active) { this.stop(); return; }
    try { await listener.start(); } catch (_) { toast('Microphone blocked. Allow it and try again.'); return; }
    this.active = true; $('#tuStart').textContent = '■ Stop';
    listener.onNote = null; listener.onFrame = (f) => this.frame(f);
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
    $('#tuNeedle').style.left = `calc(${50 + Math.max(-50, Math.min(50, cents))}% - 3px)`;
    $('#tuCents').textContent = Math.abs(cents) <= 5 ? '✓ In tune' : `${cents > 0 ? '+' : ''}${cents}¢ · ${cents > 0 ? 'loosen a little' : 'tighten a little'}`;
    this.render(best.s.n, cents);
  },
};
$('#tuStart').addEventListener('click', () => tuner.start());
STRING5_OPTIONS.forEach((o, k) => $('#s5').append(new Option(`${o.ar} · ${o.name}`, k)));
$('#s5').value = store.get('s5', 0);
$('#s5').addEventListener('change', (e) => { store.set('s5', +e.target.value); tuner.render(); });

// ------------------------------------------------------------------ boot
route();
debug.practice = practice; debug.pass = () => pass; debug.lane = lane;
