import { STRINGS, STRING5_OPTIONS, STRING6_OPTIONS, TUNING_PRESETS_6, validS6Index, nameOf, NOTES, placeLow } from './notes.js';
import { SONGS, WANTED, buildPass, linesOf, groupsOf, clearBuilt } from './library.js';
import { Listener, audioCtx, playNote, stopAll, click, hzToMidi, median } from './audio.js';
import { analyzeTake, setScale, nearestInScale, pitchMatch, isQuarter } from './analyze.js';
import { takes, Recorder, shareTake, shareAllTakes, zipBlob } from './takes.js';
import { mediaStore, durationOf, matchVersion } from './media.js';
import { awake } from './awake.js';
import { createPace } from './pace.js';
import { createPath } from './path.js';
import { createOudRecorder } from './record-oud.js';
import { HOWTO, HOWTO_FOR } from './howto.js';
import { startIcons } from './icons.js';

// Screens: home (songs) → song (its lines, a path) → lesson (one line: Listen → Slowly → In time).
// Settings (version, main notes, real recording) sit behind the gear; the tuner and saved takes on home.
// Rule for this file: every screen has ONE obvious next action.

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
const sf = (n) => `S${n.string}·${n.finger ? 'F' + n.finger : 'open'}`;   // short string/finger label on a chip
const arSpan = (s) => s.replace(/([؀-ۿ]+)/g, '<bdi class="ar">$1</bdi>');
const pct = (v) => `${Math.round(v * 100)}%`;

// Each song opens on the version that sounds best (the owner liked Player 4 for Hob Eih).
const BEST = { 'hob-eih': 'main', 'ahib-al-lail': 'solo', 'hob-min-tihib': 'player-1' };
const STEP_HINT = {
  listen: 'Listen and watch the notes. Tap any note to hear it alone.',
  slow: 'Play each note when you are ready. The coach waits for the right one.',
  time: 'After the 3-2-1, play each note as it reaches the gold line.',
};
const STEPS = ['listen', 'slow', 'time'];
const TIME_SPEEDS = [0.4, 0.5, 0.6, 0.8, 1];   // 40% and 50% for a complete beginner (owner, 2026-11-23)
const fasterThan = (s) => TIME_SPEEDS.find((x) => x > s + 1e-6) || 1;
const slowerThan = (s) => [...TIME_SPEEDS].reverse().find((x) => x < s - 1e-6) || TIME_SPEEDS[0];

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
// one-time: phones that had Player 4 chosen move to the new Main version of حب إيه (2026-11-25)
if (!store.get('mig.main')) { if (store.get('ver.hob-eih') === 'player-4') { try { localStorage.removeItem('oudcoach.ver.hob-eih'); } catch (_) {} } store.set('mig.main', 1); }
setSong(SONGS.find((s) => s.id === store.get('song')) || SONGS[0]);
const lineCount = () => linesOf(pass.notes).length;
const sectionNotes = () => (lineNo === 'all' ? pass.notes : pass.notes.filter((n) => n.line === lineNo));
// every pick of the version (extras and repeats too), for playback that sounds like the real player
function soundNotes() {
  const full = buildPass(version.passes.find((p) => p.id === pass.id) || version.passes[0], false).notes;
  return lineNo === 'all' ? full : full.filter((n) => n.line === lineNo);
}
const lineLabel = (l = lineNo) => (l === 'all' ? `Whole ${song.part.toLowerCase()}` : `Line ${l}`);

// A heard pitch, named the way this song names it (so a right سي never shows as "سي♭").
function heardName(m) {
  const s = nearestInScale(m);
  if (s != null && Math.abs(m - s) < 0.35) {
    const n = pass.notes.find((x) => Math.abs((((x.midi - s) % 12) + 12) % 12) < 0.01);
    if (n) return `<bdi class="ar">${n.ar}</bdi>`;
  }
  const nm = nameOf(m), base = nm.ar.replace(/[+\-]/g, '');
  if (nm.ar.endsWith('-')) return `<bdi class="ar">${base}</bdi> <small>a bit flat</small>`;
  if (nm.ar.endsWith('+')) return `<bdi class="ar">${base}</bdi> <small>a bit sharp</small>`;
  return `<bdi class="ar">${nm.ar}</bdi>`;
}

// ------------------------------------------------------------------ progress (per song / part / line)
// time: {score, notes, timing, speed, pass}. A line is learned when a take was clean
// (notes ≥ 80% and on time ≥ 70%) at any speed; stars show the speed: ★ <80%, ★★ <100%, ★★★ full.
const prog = {
  all: store.get('prog', {}),
  key(l, s = song, p = pass) { return `${s.id}/${p.id}/${l}`; },
  get(l, s, p) { return this.all[this.key(l, s, p)] || {}; },
  set(l, patch) { this.all[this.key(l)] = { ...this.get(l), ...patch }; store.set('prog', this.all); },
  done(l, s, p) { const t = this.get(l, s, p).time; return !!(t && (t.pass ?? t.score >= 70)); },
  stars(l, s, p) { const t = this.get(l, s, p).time; return this.done(l, s, p) ? starsFor(t.speed) : 0; },
};
const starsFor = (speed) => (speed >= 1 ? 3 : speed >= 0.8 ? 2 : 1);
// How many picks Slowly asks for in a group of repeated notes (فا ×4). A repeat that comes less than 0.15 s after the
// pick before it is not asked for: the mic hears two picks that close as one, and a learner playing slowly cannot be
// judged on them (found on حب من تحب: ري ×2 at 0.09 s stalled Slowly). Listen still plays every pick.
const needPicks = (g) => 1 + (g.notes || []).slice(1).filter((x, i) => x.t - g.notes[i].t >= 0.15).length;
const starStr = (k) => '★'.repeat(k) + '☆'.repeat(3 - k);
function nextLine() { for (let k = 1; k <= lineCount(); k++) if (!prog.done(k)) return k; return 'all'; }
function suggestStep(l) { const g = prog.get(l); return !g.heard ? 'listen' : !g.slow ? 'slow' : 'time'; }

// ------------------------------------------------------------------ navigation (hash routes, so iOS swipe-back works)
let fromApp = false;
function go(hash, replace = false) {
  fromApp = true;
  if (location.hash === hash) { route(); return; }
  if (replace) location.replace(location.pathname + location.search + hash);
  else location.hash = hash;
}
function stopEverything() { repeat.cancel(); player.stop(); real.stop(); practice.stop(true); tuner.stop(); if (typeof pace !== 'undefined') pace.stop(); if (typeof oudRec !== 'undefined') oudRec.stop(); }
function route() {
  stopEverything(); focus = null;
  $$('.sheet').forEach((s) => { if (s.id !== 'intro') s.hidden = true; });
  const h = location.hash.replace(/^#\/?/, '').split('/');
  const name = { song: 'songView', songs: 'songsView', practice: 'practiceView', lesson: 'lesson', tuner: 'tunerView', daily: 'dailyView', pace: 'paceView', path: 'pathView', settings: 'settingsView', 'record-oud': 'recordOudView' }[h[0]] || 'home';
  if (name === 'lesson') {
    lineNo = h[1] === 'all' ? 'all' : Math.min(lineCount(), Math.max(1, +h[1] || 1));
    step = STEPS.includes(h[2]) ? h[2] : suggestStep(lineNo);
  }
  $$('.screen').forEach((s) => (s.hidden = s.id !== name));
  showTabs(name);
  if (['lesson', 'tunerView', 'paceView', 'recordOudView'].includes(name)) awake.on(); else awake.off();   // screen stays on while playing
  window.scrollTo(0, 0);
  if (name === 'tunerView') markDay('tune');
  ({ home: renderHome, songsView: renderSongs, practiceView: renderDailyCard, songView: renderSong, lesson: renderLesson, tunerView: () => tuner.render(), dailyView: renderDaily, paceView: () => pace.render(), pathView: () => path.render(), settingsView: renderSettings, recordOudView: () => oudRec.render() })[name]();
  renderOudLinks();
  if (!store.get('introSeen')) openIntro();
}
window.addEventListener('hashchange', route);
// switching apps or locking the phone cancels a take instead of leaving the mic running (from Codex's review)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stopEverything(); });
$$('[data-back]').forEach((b) => b.addEventListener('click', () => {
  if (!$('#lesson').hidden) go('#/song', true);           // a lesson always goes back to its song
  else if (fromApp && history.length > 1) history.back();
  else { const tab = store.get('tab', 'home'); go(tab === 'home' ? '#/' : '#/' + tab, true); }   // back to the tab you came from
}));
$$('[data-gear]').forEach((b) => b.addEventListener('click', openSettings));
$$('.sheet').forEach((s) => s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-close]')) s.hidden = true; }));

// first-day card: how strings and fingers are numbered, tune first
function openIntro() {
  $('#intro').hidden = false;
  $$('#introCourses button').forEach((b) => b.classList.toggle('on', +b.dataset.c === (store.get('courses', 6) === 5 ? 5 : 6)));
}
$$('#introCourses button').forEach((b) => b.addEventListener('click', () => { store.set('courses', +b.dataset.c); setOpenLow(); tuner.render(); openIntro(); }));
$('#introOk').addEventListener('click', () => {
  const first = !store.get('introSeen');
  store.set('introSeen', true); $('#intro').hidden = true;
  if (first && (!location.hash || location.hash === '#/' || location.hash === '#')) go('#/path');
});
$('#introTune').addEventListener('click', () => { store.set('introSeen', true); $('#intro').hidden = true; go('#/tuner'); });
$('#introAgain').addEventListener('click', () => { $('#settings').hidden = true; openIntro(); });

// ------------------------------------------------------------------ HOME
function renderHome() { path.renderCard(); renderWeek(); }
// ---- bottom bar (design D, 2026-11-27): Today · Songs · Practice · Tune, icon and label, on the four main screens
const TAB_OF = { home: 'home', songsView: 'songs', practiceView: 'practice', tunerView: 'tuner' };
function showTabs(name) {
  const tab = TAB_OF[name], bar = $('#tabbar');
  bar.hidden = !tab; document.body.classList.toggle('has-tabs', !!tab);
  if (tab) { store.set('tab', tab); $$('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab)); }
}
$$('#tabbar button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab === 'home' ? '#/' : '#/' + b.dataset.tab)));
// this week, Monday first: a day with any practice tick gets a ✓ (the ticks Daily practice already keeps)
function renderWeek() {
  const box = $('#homeWeek'); box.innerHTML = '';
  const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((nm, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const did = Object.keys(store.get('day.' + dayKey(d), {})).length > 0, isToday = dayKey(d) === dayKey(now);
    box.append(el('div', 'wd' + (did ? ' y' : '') + (isToday ? ' t' : ''), `<b>${did ? '✓' : ''}</b>${nm}`));
  });
}
function renderSongs() {
  const box = $('#homeSongs'); box.innerHTML = '';
  for (const s of SONGS.filter((x) => !x.exercise || x.homeSong)) {
    const v = pickVersion(s), p = buildPass(v.passes.find((x) => x.id === store.get('pass.' + s.id)) || v.passes[0], mainOnly);
    const n = linesOf(p.notes).length;
    let done = 0; for (let k = 1; k <= n; k++) if (prog.done(k, s, p)) done++;
    const card = el('button', 'song-card');
    card.type = 'button';
    // one compact row per song: title, what it is, how far along
    const count = s.homeSong ? `${s.versions.length} tunes` : done ? `${done} of ${n} lines` : `${n} lines`;
    card.innerHTML = `<span class="sc-row"><span class="sc-txt"><span class="sc-ar" dir="rtl">${s.title}</span>` +
      `<span class="sc-en">${[s.titleEn, s.homeSong ? '' : s.artist].filter(Boolean).join(' · ')}</span></span>` +
      `<span class="sc-side"><b>${done ? 'Continue' : 'Start'} ›</b><small>${count}</small></span></span>` +
      (s.homeSong ? '' : `<span class="progress"><i style="width:${Math.round(100 * done / n)}%"></i></span>`);
    card.addEventListener('click', () => { setSong(s); go('#/song'); });
    box.append(card);
  }
  const wl = $('#wantedList'); wl.innerHTML = '';
  WANTED.forEach((w) => wl.append(el('div', 'wanted', `<bdi class="ar">${w.title}</bdi> <span class="muted">${w.artist || ''}</span>`)));
}
$('#goTuner').addEventListener('click', () => go('#/tuner'));
$('#goDaily').addEventListener('click', () => go('#/daily'));
$('#goPath').addEventListener('click', () => go('#/path'));
// practice tiles: each part of the app has one place on the home screen
const openExercise = (id) => { setSong(SONGS.find((x) => x.id === id)); go('#/song'); };
$('#goRisha').addEventListener('click', () => go('#/pace'));
$('#goWarm').addEventListener('click', () => openExercise('warmups'));
$('#goMaqam').addEventListener('click', () => openExercise('maqamat'));
$('#goDrills').addEventListener('click', () => openExercise('drills'));
$('#goSettings').addEventListener('click', () => go('#/settings'));
$('#goSettingsTop').addEventListener('click', () => go('#/settings'));

// ------------------------------------------------------------------ DAILY PRACTICE
// About 10 minutes: tune, right hand (steady picking), left hand (warm-ups), then your song. A tick per item per
// day; the streak counts days with at least 3 of the 4 (owner, 2026-11-23: "my daily practice").
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function markDay(item) { const k = 'day.' + dayKey(), d = store.get(k, {}); if (!d[item]) { d[item] = Date.now(); store.set(k, d); } }
function streak() {
  let n = 0; const d = new Date();
  for (let i = 0; i < 365; i++) {
    const done = Object.keys(store.get('day.' + dayKey(d), {})).length;
    if (done >= 3) n++; else if (i > 0) break;          // today may still be in progress
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function dailySummary() {
  const today = store.get('day.' + dayKey(), {}), n = ['tune', 'right', 'left', 'song'].filter((k) => today[k]).length, s = streak();
  return { today, n, s };
}
function renderDailyCard() {
  const { n, s } = dailySummary();
  $('#goDaily').innerHTML = `<span><b>Daily practice</b><small>${n} of 4 done today${s ? ` · ${s}-day streak` : ''} · about 10 minutes</small></span><span class="go">${n >= 4 ? 'Done ✓' : n ? 'Continue ›' : 'Start ›'}</span>`;
}
function renderDaily() {
  const { today, n, s } = dailySummary();
  $('#dailySub').textContent = `${n} of 4 done today${s ? ` · streak: ${s} day${s > 1 ? 's' : ''}` : ''}`;
  const last = SONGS.find((x) => x.id === store.get('lastSong')) || SONGS[0];
  // each item opens the current stage's next step of that kind (Your path), or the usual place when there is none
  const r = path.today('pace'), l = path.today('exercise'), sg = path.today('song');
  const items = [
    { k: 'tune', t: 'Tune your oud', d: 'All 6 strings green.', go: () => go('#/tuner') },
    { k: 'right', t: 'Right hand · risha', d: r ? `Today: ${r.step.t}` : 'Steady strokes and rhythms: Watch, Slowly, then In time.', go: r ? r.go : () => go('#/pace') },
    { k: 'left', t: 'Left hand', d: l ? `Today: ${l.step.t}` : 'Warm-ups and the 8 maqamat (Slowly, then In time).', go: l ? l.go : () => { setSong(SONGS.find((x) => x.id === 'warmups')); go('#/song'); } },
    sg ? { k: 'song', t: 'Your song', d: `Today: ${sg.step.t}`, go: sg.go }
      : { k: 'song', t: `Your song · ${last.title}`, d: 'The next line, Slowly then In time.', go: () => { setSong(last); go(`#/lesson/${nextLine()}`); } },
  ];
  const box = $('#dailyList'); box.innerHTML = '';
  items.forEach((it, i) => {
    const b = el('button', 'day-row' + (today[it.k] ? ' done' : ''), `<span class="pr-num">${today[it.k] ? '✓' : i + 1}</span><span><b>${it.t}</b><small>${it.d}</small></span><span class="pr-stars">›</span>`);
    b.type = 'button'; b.addEventListener('click', it.go); box.append(b);
  });
}
$('#goTakes').addEventListener('click', openTakes);

// ------------------------------------------------------------------ SONG: the path
// The maqam card (owner, 2026-11-27; docs/memory/oud-teaching.md): the song's maqam, its home note (tonic), and every
// note of this version on the neck at its real place, the home notes in brass. Teachers teach a maqam, then songs in it.
const SOLFA = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };
function renderMaqamCard() {
  const box = $('#maqamCard'), notes = buildPass(version.passes[0], mainOnly).notes;
  const m = /\bon (Do|Re|Mi|Fa|Sol|La|Si)\b/i.exec(song.exercise ? '' : song.maqam || '');
  const tonicPc = m ? SOLFA[m[1].toLowerCase()] : notes.length ? Math.round(notes[0].midi) % 12 : null;
  const name = song.id === 'maqamat' ? version.name : song.maqam;
  if (!notes.length || tonicPc == null || !name || /^\d|,/.test(name)) { box.hidden = true; return; }
  const seen = new Map();
  for (const n of notes) if (n.string && !seen.has(n.string + ':' + n.midi)) seen.set(n.string + ':' + n.midi, n);
  let dots = '';
  for (const n of seen.values()) {
    const x = n.finger ? neckX(n.midi, n.string) : NECK.nut + 16, y = neckY(n.string), home = Math.round(n.midi) % 12 === tonicPc;
    dots += `<circle class="${home ? 'mhome' : 'mnote'}" cx="${x.toFixed(1)}" cy="${y}" r="${home ? 8 : 6}"/>`;
  }
  const tonic = [...seen.values()].find((n) => Math.round(n.midi) % 12 === tonicPc);
  box.hidden = false;
  box.innerHTML = `<div class="mc-head"><b>${arSpan(name)}</b>${tonic ? `<span>home note <bdi class="ar">${tonic.ar}</bdi></span>` : ''}</div>` +
    `<div class="neck mc-neck">${neckSVG(null).replace('</svg>', dots + '</svg>')}</div>` +
    `<div class="mc-foot">${seen.size} notes of this ${song.exercise ? 'scale' : 'song'} on your oud · brass = the home note</div>`;
  // teachers teach a maqam, then songs in it: link the scale and the songs both ways
  const fam = (s) => (/^([A-Za-z]+)/.exec(s || '') || [])[1];
  const maq = SONGS.find((x) => x.id === 'maqamat');
  if (song.id === 'maqamat') {
    const songs = SONGS.filter((x) => !x.exercise && fam(x.maqam) && fam(x.maqam).toLowerCase() === version.id);
    if (songs.length) {
      const row = el('div', 'mc-links', '<span>Songs in this maqam</span>');
      songs.forEach((x) => { const b = el('button', 'mc-link', `<bdi class="ar">${x.title}</bdi> ›`); b.type = 'button'; b.addEventListener('click', () => { setSong(x); go('#/song'); }); row.append(b); });
      box.append(row);
    }
  } else if (maq && fam(song.maqam)) {
    const v = maq.versions.find((x) => x.id === fam(song.maqam).toLowerCase());
    if (v) {
      const b = el('button', 'mc-link', `Practise the ${fam(song.maqam)} scale ›`); b.type = 'button';
      b.addEventListener('click', () => { setSong(maq); setVersion(v); go('#/song'); });
      const row = el('div', 'mc-links'); row.append(b); box.append(row);
    }
  }
}
function renderSong() {
  $('#svTitle').innerHTML = `<bdi class="ar">${song.title}</bdi>`;
  $('#svSub').textContent = [song.titleEn, song.artist].filter(Boolean).join(' · ');
  renderMaqamCard();
  // the versions, right on the song screen: tap one to switch
  const vc = $('#verChips'); vc.innerHTML = '';
  // exercises (the 8 maqamat, warm-ups): every choice on screen at once, and what the chosen one is
  vc.classList.toggle('wrap', !!song.exercise);
  $('#verLabel').textContent = song.versionLabel || 'Version';
  $('#verAbout').hidden = !song.exercise; $('#verAbout').innerHTML = song.exercise ? arSpan(version.about || '') : '';
  const rank = (v) => (v.id === BEST[song.id] ? 0 : v.id === 'original' ? 1 : 2);
  const shown = song.versions.filter((v) => !v.more || v === version).sort((a, b) => rank(a) - rank(b));
  shown.forEach((v) => {
    const b = el('button', 'vchip' + (v === version ? ' on' : ''), `${v.name}${v.id === BEST[song.id] ? ' <i>★ best</i>' : v.id === 'original' ? ' <i>real song</i>' : ''}`);
    b.type = 'button';
    b.addEventListener('click', () => { setVersion(v); real.forget(); renderSong(); if (!song.exercise) toast(`${v.name}: ${v.about}`, 4500); });
    vc.append(b);
  });
  const hidden = song.versions.filter((v) => v.more && v !== version).length;
  if (hidden) { const m = el('button', 'vchip more', `+${hidden} more`); m.type = 'button'; m.addEventListener('click', openSettings); vc.append(m); }
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
    `<span class="pr-notes plain">All ${lineCount()} lines in one go</span></span><span class="pr-stars">${prog.done('all') ? starStr(prog.stars('all')) : '›'}</span>`;
  all.addEventListener('click', () => go('#/lesson/all'));
  box.append(all);
}

// ------------------------------------------------------------------ LESSON
function setActions(list) {
  const box = $('#actions'); box.innerHTML = '';
  list.forEach(({ label, fn, primary, id, cls }) => {
    const b = el('button', 'btn ' + (primary ? 'primary huge' : 'second') + (cls ? ' ' + cls : ''), label); b.type = 'button';
    if (id) b.id = id;
    b.addEventListener('click', () => { repeat.cancel(); fn(); }); box.append(b);
  });
}
// Repeat until right (owner, 2026-11-23): a take that isn't right yet starts again by itself after a short
// countdown, until it is. Any tap stops it; it can be switched off in ⚙︎.
const repeat = {
  timer: 0,
  on() { return store.get('repeat', true); },
  cancel() { clearInterval(this.timer); this.timer = 0; const b = $('#againIn'); if (b) b.remove(); },
  start(fn, secs = 4, label = 'Again', force = false) {
    this.cancel(); if (!force && !this.on()) return;
    let k = secs; const box = el('div', 'again-in'); box.id = 'againIn';
    box.addEventListener('click', () => this.cancel());
    const draw = () => (box.innerHTML = `${label} in <b>${k}</b>… <button class="link" type="button">Stop</button>`);
    draw(); $('#result').append(box);
    this.timer = setInterval(() => { k--; if (k <= 0) { this.cancel(); fn(); } else draw(); }, 1000);
  },
};
let focus = null;   // "Practise these notes": { ks: indices of the notes in the line, clean: clean rounds in a row }
function setStep(s) {
  step = s; fromApp = true; focus = null;
  history.replaceState(null, '', `#/lesson/${lineNo}/${s}`);
  stopEverything(); renderLesson();
}
$$('#steps button').forEach((b) => b.addEventListener('click', () => setStep(b.dataset.step)));

function renderLesson() {
  $('#lsTitle').innerHTML = `${lineLabel()} <span class="muted">· <bdi class="ar">${song.title}</bdi></span>`;
  const g = prog.get(lineNo);
  $$('#steps button').forEach((b) => {
    const s = b.dataset.step, ok = s === 'listen' ? g.heard : s === 'slow' ? g.slow : prog.done(lineNo);
    b.classList.toggle('on', s === step); b.classList.toggle('ok', !!ok);
  });
  // the hint shows on the first few visits of each step only
  const seen = store.get('hint.' + step, 0);
  $('#stepHint').textContent = STEP_HINT[step]; $('#stepHint').hidden = seen >= 3;
  store.set('hint.' + step, seen + 1);
  $('#lesson').dataset.step = step;
  $('#lesson').classList.remove('showing-result');
  $('#result').hidden = true; say('');
  $('#mic').hidden = true; $('#lane').hidden = step !== 'time'; $('#strip').hidden = step === 'time';
  $('#realStage').hidden = true; $('#big').hidden = false;
  showBig(null);
  renderSpeeds(); renderLoop(); renderEar();
  if (step === 'listen') lessonListen();
  if (step === 'slow') lessonSlow();
  if (step === 'time') lessonTime();
}

// big note card + neck diagram. String 1 (thinnest) is drawn at the bottom and thinnest.
// Design D (2026-11-27): the neck as wood, to scale. A note n half steps above its open string sits at
// L·(1 − 2^(−n/12)) from the nut (L = 1100 px here, so finger 1 ≈ 120-170 px, finger 2 ≈ 225, finger 4 ≈ 326):
// the real proportions of an oud, checked against every note in notes.js (docs/memory/quality.md).
const NECK = { W: 340, gap: 22, top: 18, nut: 50, L: 1100 };
const neckX = (midi, string) => NECK.nut + NECK.L * (1 - 2 ** (-(midi - STRINGS[string - 1].midi) / 12));
const neckY = (string) => NECK.top + (6 - string) * NECK.gap;
function neckSVG(n, others = [], heard = null) {
  const { W, gap, top, nut } = NECK, H = top * 2 + gap * 5 + 18, bottom = top + gap * 5;
  const X = n ? neckX(n.midi, n.string) : nut;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${n ? where(n) : ''}">` +
    `<defs><linearGradient id="nkw" x1="0" x2="1"><stop offset="0" stop-color="#5a3519"/><stop offset=".78" stop-color="#6e4527"/><stop offset="1" stop-color="#b98a55"/></linearGradient>` +
    `<radialGradient id="nkg"><stop offset="0" stop-color="#f2b24c" stop-opacity=".55"/><stop offset="1" stop-color="#f2b24c" stop-opacity="0"/></radialGradient></defs>` +
    `<rect class="pegbox" x="6" y="${top - 12}" width="${nut - 8}" height="${gap * 5 + 24}" rx="7"/>` +
    `<rect x="${nut - 2}" y="${top - 9}" width="${W - nut}" height="${gap * 5 + 18}" rx="3" fill="url(#nkw)"/>` +
    `<rect class="nut" x="${nut - 2}" y="${top - 9}" width="3" height="${gap * 5 + 18}"/>` +
    `<text class="lbl" x="${nut + 16}" y="${H - 2}">pegs</text><text class="lbl" x="${W - 18}" y="${H - 2}">body</text>`;
  for (let k = 1; k <= 6; k++) {
    const y = neckY(k), on = n && n.string === k;
    s += `<line class="${on ? 'str on' : 'str'}" style="stroke-width:${on ? 3.2 : 1.1 + (k - 1) * 0.35}" x1="${nut}" x2="${W}" y1="${y}" y2="${y}"/>` +
      `<text class="${on ? 'sn on' : 'sn'}" x="${(nut + 4) / 2}" y="${y + 4.5}">${k}</text>`;
  }
  if (n) {
    const y = neckY(n.string);
    // the line's other notes on this string, dim, where they really are (owner: "it needs to be accurate")
    for (const o of others) s += `<circle class="omark" cx="${neckX(o.midi, n.string).toFixed(1)}" cy="${y}" r="3.6"/>`;
    if (n.finger) s += `<circle cx="${X.toFixed(1)}" cy="${y}" r="26" fill="url(#nkg)"/><circle class="target" cx="${X.toFixed(1)}" cy="${y}" r="17"/>` +
      `<circle class="dot" cx="${X.toFixed(1)}" cy="${y}" r="13"/><text class="fn" x="${X.toFixed(1)}" y="${y + 5}">${n.finger}</text>`;
    else s += `<circle class="ring" cx="${nut + 16}" cy="${y}" r="11"/><text class="fo" x="${nut + 16}" y="${y + 4.5}">0</text>`;
    // Replay: where the finger really landed (the pitch heard), when it is near the target
    if (heard && Math.abs(heard.midi - n.midi) <= 1.5) {
      const hx = Math.max(nut + 6, Math.min(W - 8, neckX(heard.midi, n.string)));
      s += `<circle class="heard ${heard.status}" cx="${hx.toFixed(1)}" cy="${y}" r="9"/>`;
    }
    // the live coach dot (moved by the listener while playing Slowly), hidden until a pitch is heard
    s += `<g id="liveDot" class="live" style="display:none"><circle r="10"/></g>`;
  }
  return s + '</svg>';
}
// the other notes of the current line that sit on this note's string (distinct pitches, fingered only)
function othersOnString(n) {
  if (!n || !n.string) return [];
  const seen = new Set([n.midi]), out = [];
  for (const m of sectionNotes()) if (m.string === n.string && m.finger && !seen.has(m.midi)) { seen.add(m.midi); out.push(m); }
  return out;
}
function showBig(n, next, extra) {
  $('#bigNote').textContent = n ? n.ar : '—';
  $('#bigWhere').textContent = n ? where(n) + (extra || '') : '';
  $('#neck').innerHTML = neckSVG(n, othersOnString(n));
  $('#bigNext').innerHTML = next && next.length ? `<span dir="rtl"><bdi class="next-lbl">Next ←</bdi> <span class="ar">${next.map((m) => m.ar).join(' · ')}</span></span>` : '';
}
// feedback: Slowly flashes the screen and shows ✓/✗; In time only lights the line and the chip
function pop(cls, mode = 'full') {
  const f = $('#flash'), b = $('#big'), m = $('#mark');
  if (mode === 'full') {
    f.className = 'flash'; b.classList.remove('good', 'bad'); m.className = 'mark'; void f.offsetWidth;
    f.className = 'flash ' + cls; b.classList.add(cls);
    m.textContent = cls === 'good' ? '✓' : '✗'; m.className = 'mark ' + cls;
  } else {
    const l = $('#lane'); l.classList.remove('hitgood', 'hitbad'); void l.offsetWidth; l.classList.add(cls === 'good' ? 'hitgood' : 'hitbad');
  }
  clearTimeout(pop.h); pop.h = setTimeout(() => b.classList.remove('good', 'bad'), 600);
}
function say(text, cls = '') { const m = $('#msg'); m.innerHTML = text ? arSpan(text) : ''; m.className = 'msg ' + cls; }

function renderStrip(groups, opts = {}) {
  const box = $('#strip'); box.innerHTML = '';
  let lastLine = null, prevT = -9, prevStroke = 'up';
  for (const g of groups) {
    if (lastLine != null && g.line !== lastLine) box.append(el('span', 'br'));
    lastLine = g.line;
    // risha, quiet (owner 2026-11-27: "shouldnt be too much"): a note with time before it is a down stroke (صد ↓);
    // a fast note (under 0.25 s after the one before) takes the other stroke; a note picked again and again ↓↑
    const stroke = g.t - prevT < 0.25 ? (prevStroke === 'down' ? 'up' : 'down') : 'down';
    const rs = g.count > 1 ? '↓↑' : stroke === 'down' ? '↓' : '↑';
    prevStroke = g.count > 1 ? 'up' : stroke; prevT = g.notes[g.notes.length - 1].t;
    // every note shows its string and finger; tap it to see where it is (and hear it when not practising)
    const c = el('button', 'chip' + (g.grace ? ' grace' : '') + (g.count > 1 ? ' multi' : ''),
      `<span class="ar">${g.ar}</span><span class="sf">${sf(g)}</span>${g.count > 1 ? `<span class="x">×${g.count}</span>` : ''}` +
      `<i class="rs" aria-label="${rs === '↓' ? 'down stroke' : rs === '↑' ? 'up stroke' : 'down and up'}">${rs}</i>`);
    c.type = 'button'; c.dataset.i = g.i; c.dataset.last = g.notes[g.notes.length - 1].i;
    c.title = `${g.name}: ${where(g)}`;
    c.addEventListener('click', () => {
      if (practice.active) { toast(`${g.ar}: ${where(g)}`, 2500); return; }   // no sound while the mic listens
      audioCtx().resume(); playNote(g.midi, 0, 1.1); showBig(g);
    });
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

// speed choice: Listen 50/75/100 %, In time 60…100 %
let listenSpeed = store.get('listenSpeed', 0.75);
let timeSpeed = 0.6;
// Loop (owner, 2026-11-27: "maqam training should be able to train on loop"): after each take the next one starts by
// itself; In time goes 10% faster after each clean round up to 100% (Rocksmith's Riff Repeater idea). On by default for
// the 8 maqamat, a switch on every lesson. The "… in 3" box has Stop.
const loopOn = () => store.get('loop.' + song.id, song.id === 'maqamat');
function renderLoop() {
  const b = $('#loopBtn'); b.hidden = step === 'listen';
  b.classList.toggle('on', loopOn()); b.setAttribute('aria-pressed', String(loopOn()));
  b.innerHTML = `↻ Loop ${loopOn() ? 'on' : 'off'}`;
}
$('#loopBtn').addEventListener('click', () => { store.set('loop.' + song.id, !loopOn()); renderLoop(); });
// By ear (docs/memory/oud-teaching.md: teachers have you listen, hum, then find the phrase on the oud): in Slowly the
// note names, the string and finger, and the neck's target are hidden while playing; each note shows itself (✓) once
// found; after 3 misses on one note it is revealed as a hint. Hear it first (the Hear it button plays the line).
const earOn = () => store.get('byear', false);
function renderEar() {
  const b = $('#earBtn'); b.hidden = step !== 'slow';
  b.classList.toggle('on', earOn()); b.setAttribute('aria-pressed', String(earOn()));
  b.textContent = `By ear: ${earOn() ? 'on' : 'off'}`;
  $('#lesson').classList.toggle('byear', earOn() && step === 'slow');
}
$('#earBtn').addEventListener('click', () => { store.set('byear', !earOn()); renderEar(); });
function renderSpeeds() {
  const seg = $('#speedSeg'); seg.innerHTML = '';
  seg.hidden = step === 'slow';
  const opts = step === 'listen' ? [0.5, 0.75, 1] : TIME_SPEEDS;
  const cur = step === 'listen' ? listenSpeed : timeSpeed;
  seg.append(el('span', 'seg-label', 'Speed'));
  opts.forEach((v) => {
    const b = el('button', v === cur ? 'on' : '', pct(v)); b.type = 'button';
    b.addEventListener('click', () => {
      if (step === 'listen') { listenSpeed = v; store.set('listenSpeed', v); } else { timeSpeed = v; lessonTime.chosen = true; }
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
      ? [{ label: 'Next: play it slowly ›', primary: true, fn: () => setStep('slow'), id: 'mainBtn' }, { label: '▶ Again', fn: listen }]
      : [{ label: '▶ Listen', primary: true, fn: listen, id: 'mainBtn' }]);
  };
  const listen = () => {
    setActions([{ label: '■ Stop', primary: true, cls: 'stop', fn: () => { player.stop(); real.stop(); idle(); }, id: 'mainBtn' }]);
    const done = () => { prog.set(lineNo, { heard: 1 }); $$('#steps button')[0].classList.add('ok'); idle(); };
    if (real.loaded) real.playNotes(notes, listenSpeed, done);
    else player.play(notes, listenSpeed, done, soundNotes());
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
  if (!lessonTime.chosen) timeSpeed = best && best.pass ? fasterThan(best.speed) : best ? best.speed : 0.5;
  lessonTime.chosen = false;
  renderSpeeds();
  const groups = groupsOf(sectionNotes());
  lane.build(groups); lane.update(groups[0].t - 0.6);
  showBig(groups.find((g) => !g.grace), null);
  $('#bigWhere').textContent = 'Get ready';
  $('#countIn').textContent = '';
  setActions([{ label: '🎤 Start', primary: true, fn: () => practice.start('along'), id: 'mainBtn' },
    { label: '▶ Hear it', fn: () => player.play(sectionNotes(), timeSpeed, null, soundNotes()) }]);
}

// moving lane for "In time": future notes come from the left (Arabic order) to the line on the right
const PPS = 170, GAP = 70;   // pixels per second of the song; chips never closer than GAP
const lane = {
  groups: [],
  build(groups) {
    const box = $('#lane'); box.querySelectorAll('.lchip').forEach((c) => c.remove());
    this.groups = groups;
    let L = 0;
    groups.forEach((g, k) => {
      g.state = null;
      L = k === 0 ? 0 : Math.max(L + (g.t - groups[k - 1].t) * PPS, L + (g.grace || groups[k - 1].grace ? GAP * 0.75 : GAP));
      g.L = L;
      g.el = el('div', 'lchip' + (g.grace ? ' grace' : ''), `<span class="ar">${g.ar}</span><span class="sf">${sf(g)}</span>${g.count > 1 ? `<span class="x">×${g.count}</span>` : ''}`);
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
      g.el.style.transform = `translateX(${(x - 30).toFixed(1)}px)`;
      g.el.style.visibility = x < -70 || x > W + 70 ? 'hidden' : 'visible';
    }
  },
  mark(g, state) { g.state = state; g.el.classList.remove('ok', 'bad', 'miss'); if (state) g.el.classList.add(state); },
};

// ------------------------------------------------------------------ playback: computer sound
const player = {
  playing: false, raf: 0, endsAt: 0,
  // notes = what is shown (main notes when that setting is on); sound = what is played
  // (every pick of the version, so it sounds like the real player)
  play(notes, speed, onEnd, sound = notes) {
    this.stop(); real.stop();
    const ac = audioCtx(); ac.resume();
    const base = Math.min(notes[0].t, sound[0].t), t0 = ac.currentTime + 0.15;
    const lastEnd = (list) => { const l = list[list.length - 1]; return l.t + Math.min(1.2, l.dur); };
    const end = (Math.max(lastEnd(notes), lastEnd(sound)) - base) / speed;
    sound.forEach((n) => playNote(n.midi, t0 + (n.t - base) / speed, n.dur / speed));
    this.playing = true; showNow.big = null; this.endsAt = t0 + end + 0.3;
    const tick = () => {
      if (!this.playing) return;
      const now = (ac.currentTime - t0) * speed + base;
      let cur = null; for (const n of notes) if (n.t <= now) cur = n;
      if (cur && !practice.active) showNow(cur, notes);
      if (ac.currentTime - t0 > end + 0.2) { this.stop(); onEnd && onEnd(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },
  stop() {
    if (!this.playing) return;
    this.playing = false; cancelAnimationFrame(this.raf); stopAll(); if (!practice.active) showNow(null);
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
    showNow.big = null;
    const gen = this.gen = (this.gen || 0) + 1;
    const done = () => { if (gen !== this.gen) return; this.stop(); if (onEnd) onEnd(); };
    v.onended = done;                                  // the file can end before the line's last note fades
    // follow the video only once it really plays: on iPhone it starts a moment later, and the first
    // check saw it "paused" and stopped following, leaving Stop stuck (from Codex's review)
    const tick = () => {
      if (gen !== this.gen) return;
      if (v.paused) { done(); return; }
      const tt = v.currentTime - s0;
      let cur = null; for (const n of notes) if (n.t <= tt + 0.02) cur = n;
      if (cur) showNow(cur, notes);
      if (v.currentTime >= b) { done(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    v.play().then(() => { if (gen === this.gen) { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(tick); } })
      .catch(() => { if (gen === this.gen) { toast('Tap Listen again to start the sound.'); done(); } });
  },
  stop() { this.gen = (this.gen || 0) + 1; this.el.onended = null; this.el.pause(); cancelAnimationFrame(this.raf); },
};

// ------------------------------------------------------------------ the coach listening
const listener = new Listener();
debug.listener = listener;
const pitchOk = (midi, n) => !!pitchMatch(midi, n);
function micMeter(f) {
  const v = Math.max(0, Math.min(1, (f.db + 70) / 45));
  $('#lvl').style.width = `${Math.round(v * 100)}%`;
  if (f.f0 > 0 && f.conf > 0.8 && f.db > -55) {
    $('#hear').innerHTML = heardName(hzToMidi(f.f0));
    clearTimeout(micMeter.h); micMeter.h = setTimeout(() => ($('#hear').textContent = '—'), 700);
  }
  coachDot(f);
}
// The neck as live coach (owner, 2026-11-27: "really nice"): in Slowly the dot follows the pitch heard along the
// string of the note asked for, at its real place (neckX), green within a quarter tone. Only near the target (1.5 half
// steps), so a different note never puts it somewhere misleading. Display only: judging the note is unchanged.
function coachDot(f) {
  const g = $('#liveDot'); if (!g) return;
  const now = performance.now(); if (now - (coachDot.at || 0) < 50) return; coachDot.at = now;   // 20 updates a second is enough for the eye; leaves the listener room
  const n = practice.active && practice.mode === 'wait' && practice.list ? practice.list[practice.wi] : null;
  if (!n || !n.string || !(f.f0 > 0 && f.conf > 0.8 && f.db > -55)) return;
  const d = hzToMidi(f.f0) - n.midi;
  if (Math.abs(d) > 1.5) { g.style.display = 'none'; return; }
  const x = Math.max(NECK.nut + 6, Math.min(NECK.W - 8, neckX(n.midi + d, n.string)));
  g.setAttribute('transform', `translate(${x.toFixed(1)},${neckY(n.string)})`);
  g.style.display = ''; g.classList.toggle('ok', Math.abs(d) < 0.25);
  clearTimeout(coachDot.h); coachDot.h = setTimeout(() => (g.style.display = 'none'), 600);
}
// the song's own beat for the count-in: the typical gap between main notes
function songBeat(notes) {
  const main = notes.filter((n) => !n.grace && !n.rep);
  const gaps = main.slice(1).map((n, k) => n.t - main[k].t).filter((g) => g > 0.12).sort((a, b) => a - b);
  const g = gaps.length ? gaps[gaps.length >> 1] : 0.5;
  return Math.max(0.4, Math.min(0.9, g < 0.3 ? g * 2 : g));
}

const practice = {
  mode: null, active: false, starting: false, gen: 0,
  async start(mode) {
    if (this.active) { this.stop(false, true); return; }
    if (this.starting) return;                          // a second tap while the mic is opening
    player.stop(); real.stop();
    this.mode = mode;
    $('#result').hidden = true; $('#lesson').classList.remove('showing-result');
    // gen guards against leaving the screen while the permission prompt is open (from Codex's review)
    const gen = ++this.gen; this.starting = true;
    try { if (!(await listener.start()) || gen !== this.gen) return; }
    catch (e) {
      if (gen === this.gen) say(location.protocol === 'https:' || location.hostname === 'localhost'
        ? 'The microphone is blocked. On iPhone: tap "aA" next to the web address → Website Settings → Microphone → Allow. Then tap Start again.'
        : 'The microphone needs the https:// address of this site.', 'bad');
      return;
    } finally { if (gen === this.gen) this.starting = false; }
    this.active = true; this.played = []; this.waitMistakes = []; this.ignoreUntil = 0;
    this.startedAt = Date.now(); this.audioT0 = listener.now();
    this.recorder = new Recorder(listener.stream); this.recorder.start();
    $('#mic').hidden = false; $('#lesson').classList.add('practising');
    listener.onFrame = micMeter;
    listener.onNote = (n) => {
      if (n.t < this.ignoreUntil) return;            // the coach's own "hear it" note
      debug.notes.push(n); this.played.push(n);
      if (mode === 'wait') this.waitNote(n); else this.alongNote(n);
    };
    // weak onsets (small level jump, soft click): Slowly may use one as the expected note, never as a mistake
    listener.onWeak = (n) => { if (mode === 'wait' && this.active && n.t >= this.ignoreUntil) this.waitNote(n); };
    if (mode === 'wait') this.startWait(); else this.startAlong();
  },
  // cancelled = the player pressed Stop: nothing is scored or saved
  async stop(silent = false, cancelled = false) {
    const gen = ++this.gen;
    if (!this.active) { if (this.starting) { this.starting = false; listener.stop(); } return; }
    this.active = false; cancelAnimationFrame(this.raf); stopAll();
    listener.onNote = null; listener.onFrame = null; listener.onWeak = null;
    const rec = this.recorder; this.recorder = null;
    const audio = rec && !silent && !cancelled ? await rec.stop() : (rec && rec.stop(), null);
    listener.stop();
    $('#mic').hidden = true; $('#lesson').classList.remove('practising');
    if (silent || gen !== this.gen) return;            // left the lesson while the recording was being saved
    if (cancelled) {
      if (this.mode === 'wait') lessonSlow(); else { lessonTime.chosen = true; lessonTime(); }
      say('Stopped. Tap Start to go again.');
      return;
    }
    if (this.mode === 'wait') this.finishWait(audio);
    else this.finishAlong(audio);
  },
  stopButton(extra = []) {
    setActions([{ label: '■ Stop', primary: true, cls: 'stop', fn: () => this.stop(false, true), id: 'mainBtn' }, ...extra]);
  },

  // ---- slowly: wait for each note
  startWait() {
    this.list = groupsOf(sectionNotes().filter((n) => !n.grace));
    if (focus) this.list = this.list.filter((_, k) => focus.ks.includes(k));   // "Practise these notes": only those
    this.wi = 0; this.errors = 0; this.skipped = 0; this.okTimes = []; this.left = needPicks(this.list[0]); this.complete = false; this.missHere = 0;
    renderStrip(this.list, { quiet: true });
    this.stepWait();
    this.stopButton();
    say('Play the big note.');
  },
  stepWait() {
    const n = this.list[this.wi];
    this.list.forEach((m, k) => markStrip(m.i, k < this.wi ? 'ok' : k === this.wi ? 'now' : null));
    const c = markStrip(n.i, 'now'); if (c) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    showBig(n, this.list.slice(this.wi + 1, this.wi + 4),
      needPicks(n) > 1 ? (this.left === needPicks(n) ? ` · pick it ${needPicks(n)} times` : ` · ${this.left} more`) : '');
  },
  advance() {
    this.missHere = 0; $('#neck').classList.remove('pulse'); $('#lesson').classList.remove('reveal');
    if (--this.left > 0) { this.stepWait(); return; }
    this.wi++;
    if (this.wi >= this.list.length) { this.complete = true; this.stop(); return; }
    this.left = needPicks(this.list[this.wi]);
    this.stepWait(); this.stopButton();
  },
  waitNote(p) {
    const n = this.list[this.wi]; if (!n || p.legato) return;
    if (p.weak) {
      if (!pitchMatch(p.midi, n)) return;
      // a weak sound at a pitch that was just played is that note still ringing, not a new pick (owner: "the note
      // lingers and plays the next one by accident")
      // …unless it comes right after the last pick: that is a real soft repeat (فا فا فا); ringing swells up later
      const last = this.played.length ? this.played[this.played.length - 1].t : -9;
      if (p.t - last > 0.45 && this.played.some((q) => p.t - q.t < 1.5 && Math.abs(q.midi - p.midi) < 0.6)) return;
    }
    const d = p.midi - n.midi, how = pitchMatch(p.midi, n);
    // the note just played right, heard again within half a second: it is still ringing, not a mistake
    const prev = this.lastOk;
    if (!how && prev && p.t - prev.t < 0.5 && pitchMatch(p.midi, prev.n)) return;
    // Safety net: a FAST note (it comes less than 0.2 s after the pick before it in the song) that was not heard must
    // never stall the lesson. If this pick is the note after one or two fast notes, pass over them and carry on.
    // Normal notes are never passed over. (owner, 2026-11-26: "I'm scared this will ruin future songs")
    // Also an ORNAMENT: a note the next one follows within 0.1 s is one pick (حب إيه Main, لا 5.30 into سي 5.34): the
    // listener hears only the second, so it is passed over the same way (2026-11-27).
    if (!how && !p.weak) {
      const fast = (i) => {
        const g = this.list[i], pr = this.list[i - 1], nx = this.list[i + 1];
        return (!!(g && pr) && g.t - pr.notes[pr.notes.length - 1].t < 0.2) || (!!(g && nx) && nx.t - g.notes[g.notes.length - 1].t < 0.1);
      };
      for (let k = 1; k <= 2; k++) {
        const ahead = this.list[this.wi + k];
        if (!ahead || !fast(this.wi + k - 1)) break;
        if (pitchMatch(p.midi, ahead)) {
          for (let j = 0; j < k; j++) { this.fastPassed = (this.fastPassed || 0) + 1; this.left = 1; this.advance(); }
          return this.waitNote(p);
        }
      }
    }
    if (how) {
      this.lastOk = { t: p.t, n };
      if (this.left === needPicks(n)) this.okTimes.push({ t: p.t, k: this.wi, n, midi: p.midi, octave: how === 'octave' });   // first pick of this group (pitch kept for "Check my take")
      pop('good');
      const cents = how === 'octave' || p.spread > 0.4 ? 0 : Math.round(d * 100);
      if (Math.abs(cents) > 40 && n.finger) say(`✓ ${n.ar} · finger toward ${cents > 0 ? 'pegs' : 'body'}`, 'warn');
      else if (Math.abs(cents) > 40) say(`✓ ${n.ar} · check tuning`, 'warn');
      else say(`✓ ${n.ar}`, 'good');
      this.advance();
    } else {
      this.errors++; this.missHere++;
      pop('bad');
      const got = nameOf(p.midi).ar;
      let fix;
      if (isQuarter(n) && Math.abs(d) < 1) fix = `✗ Half-flat: finger toward ${d > 0 ? 'pegs' : 'body'}`;
      else if (Math.abs(d) < 1.6 && n.finger) fix = `✗ Too ${d < 0 ? 'low' : 'high'}: finger toward ${d < 0 ? 'body' : 'pegs'}`;
      else fix = `✗ Heard ${got} · play ${n.ar}`;
      this.waitMistakes.push({ expected: n.ar, where: where(n), heard: got, semitones: +d.toFixed(2), fix, t: p.t, midi: p.midi, k: this.wi });
      say(fix, 'bad');
      bumpWeak(n.key);
      if (this.missHere === 3) {
        $('#lesson').classList.add('reveal');   // By ear: show the note as a hint after 3 misses
        say('Hear it or skip ›', 'bad');
        $('#neck').classList.add('pulse');
        this.stopButton([
          { label: '▶ Hear it', fn: () => { playNote(n.midi, 0, 1.2); this.ignoreUntil = listener.now() + 1.6; } },
          { label: 'Skip ›', fn: () => { this.skipped = (this.skipped || 0) + 1; this.left = 1; this.advance(); say('Skipped note'); } },
        ]);
      }
    }
  },
  finishWait(audio) {
    if (!this.complete) { lessonSlow(); return; }
    // "Practise these notes": loop the few notes until two clean rounds in a row; the line's progress is not touched
    if (focus) {
      const clean = !this.errors && !(this.skipped || 0), rv = buildReview(this);
      focus.clean = clean && !rv.off ? focus.clean + 1 : 0;
      const againFocus = () => { lessonSlow(); practice.start('wait'); };
      if (focus.clean >= 2) {
        focus = null;
        showResult({ stars: 3, head: 'Fixed ✓', sub: 'Those notes were clean twice in a row.', tip: 'Now play the whole line again.', take: { audio: null }, review: null });
        setActions([{ label: 'Play the whole line ›', primary: true, fn: () => { lessonSlow(); practice.start('wait'); }, id: 'mainBtn' }]);
        return;
      }
      showResult({ stars: 0, head: clean ? `Clean ${focus.clean} of 2` : 'Again, slowly', sub: `Practising ${this.list.length} notes`, tip: rv.ev.find((e) => e.status !== 'ok')?.tip || '', take: { audio: null }, review: null });
      setActions([{ label: '■ Stop practising these', fn: () => { focus = null; repeat.cancel(); lessonSlow(); }, id: 'mainBtn' }]);
      repeat.start(againFocus, 3, 'Again', true);
      return;
    }
    // a skipped note is not a learned note: no stars, no tick (from Codex's review)
    const errs = this.errors, n = this.list.length, skipped = this.skipped || 0;
    const stars = skipped ? 0 : errs === 0 ? 3 : errs <= 2 ? 2 : 1;
    if (!skipped) { prog.set(lineNo, { slow: Math.max(stars, prog.get(lineNo).slow || 0) }); $$('#steps button')[1].classList.add('ok'); }
    const rh = rhythmAtOwnSpeed(this.okTimes);
    const take = buildTake({ mode: 'wait', score: { notes: Math.round(100 * (n - skipped) / (n + errs)), rhythm: rh ? rh.score : null }, audio,
      extra: { waitErrors: errs, skipped, waitMistakes: this.waitMistakes, rhythm: rh } });
    takes.save(take); markDay(song.exercise ? 'left' : 'song'); if (!song.exercise) store.set('lastSong', song.id);
    say('');
    // which notes went wrong, once each
    const byNote = new Map();
    for (const m of this.waitMistakes) { const o = byNote.get(m.expected) || { ...m, k: 0 }; o.k++; byNote.set(m.expected, o); }
    const list = [...byNote.values()].map((m) => `${m.expected}${m.k > 1 ? ` ×${m.k}` : ''}`).join(' · ');
    const first = [...byNote.values()][0];
    showResult({
      stars, head: skipped ? `${skipped} skipped` : errs ? `${errs} wrong` : 'No mistakes!',
      sub: skipped ? `${n - skipped} of ${n} notes played` : errs ? `Tricky: ${list}` : `All ${n} notes right${rh ? ` · rhythm ${rh.score}%` : ''}`,
      tip: skipped ? 'Play this line slowly again without skipping.' : errs ? first.fix.replace(/^✗ /, '')
        : rh && rh.tip ? rh.tip : 'Now try it in time.', take, review: buildReview(this),
    });
    const againSlow = () => { lessonSlow(); practice.start('wait'); };
    setActions([{ label: 'Next: play it in time ›', primary: true, fn: () => setStep('time'), id: 'mainBtn' }, { label: '↻ Again', fn: againSlow }]);
    if (errs || skipped) repeat.start(againSlow, 4, 'Again', loopOn());
    else if (loopOn()) repeat.start(againSlow, 3, 'Again', true);
  },

  // ---- in time: count-in at the song's beat, notes slide to the line, judged live and at the end
  startAlong() {
    const ac = audioCtx(), speed = timeSpeed, notes = sectionNotes(), groups = groupsOf(notes);
    lane.build(groups);
    const beat = songBeat(notes) / speed, t0 = ac.currentTime + 0.3;
    for (let k = 0; k < 3; k++) click(t0 + k * beat, k === 0);
    this.alongStart = t0 + 3 * beat; this.alongSpeed = speed; this.groups = groups; this.base = notes[0].t;
    const end = notes[notes.length - 1].t + Math.min(1, notes[notes.length - 1].dur);
    this.alongEnd = this.alongStart + (end - this.base) / speed;
    this.stopButton();
    say('');
    this.dueI = null;
    const tick = () => {
      if (!this.active) return;
      const nowReal = ac.currentTime - this.alongStart, nowRef = nowReal * speed + this.base;
      lane.update(nowRef);
      if (nowReal < 0) {
        $('#countIn').textContent = String(Math.min(3, Math.ceil(-nowReal / beat)));
      } else {
        $('#countIn').textContent = '';
        // the big card shows the note coming to the line next (or the one sounding right now)
        const due = groups.find((g) => !g.grace && g.t > nowRef - 0.12);
        if (due && this.dueI !== due.i) {
          this.dueI = due.i;
          const k = groups.indexOf(due);
          showBig(due, groups.slice(k + 1).filter((g) => !g.grace).slice(0, 3), due.count > 1 ? ` · ×${due.count}` : '');
        }
        for (const g of groups) if (!g.grace && g.state !== 'ok' && nowRef - (g.t + g.dur) > 0.45 * speed + 0.15) { if (g.state !== 'miss' && g.state !== 'bad') lane.mark(g, 'miss'); }
      }
      if (ac.currentTime > this.alongEnd + 0.7) { this.stop(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },
  alongNote(p) {
    if (p.legato || !this.groups) return;
    const nowRef = (p.t - this.alongStart) * this.alongSpeed + this.base;
    const win = 0.45 * this.alongSpeed + 0.12;
    let best = null, nearest = null;
    for (const g of this.groups) {
      const dt = nowRef < g.t ? g.t - nowRef : Math.max(0, nowRef - (g.t + g.dur));
      if (dt > win + 0.2) continue;
      if (!nearest || dt < nearest.dt) nearest = { g, dt };
      if (g.state !== 'ok' && dt <= win && pitchOk(p.midi, g) && (!best || dt < best.dt)) best = { g, dt };
    }
    if (best) { lane.mark(best.g, 'ok'); pop('good', 'lane'); }
    else if (nearest && !nearest.g.grace && nearest.g.state !== 'ok') { lane.mark(nearest.g, 'bad'); pop('bad', 'lane'); }
  },
  finishAlong(audio) {
    const ref = sectionNotes();
    const played = this.played.filter((p) => p.t > this.alongStart - 0.5 && p.t < this.alongEnd + 0.35);
    if (!played.length) { lessonTime.chosen = true; lessonTime(); say('No notes heard. Play a little louder or closer to the phone.', 'warn'); return; }
    const res = analyzeTake(played, ref, { mode: 'along', start: this.alongStart, speed: this.alongSpeed, judgeTiming: true, scaleNotes: pass.notes });
    debug.results.push(res); debug.lastResult = res;
    res.items.forEach((it) => { if (!it.ref.grace && it.status !== 'ok') bumpWeak(it.ref.key); });
    const take = buildTake({ mode: 'along', speed: this.alongSpeed, score: res.score, res, audio });
    takes.save(take); markDay(song.exercise ? 'left' : 'song'); if (!song.exercise) store.set('lastSong', song.id);
    const s = res.score, speed = this.alongSpeed, timing = s.timing == null ? 100 : s.timing;
    const clean = s.notes >= 80 && timing >= 70;
    const score = Math.round(0.6 * s.notes + 0.4 * timing);
    const prev = prog.get(lineNo).time;
    const better = !prev || (clean && !prev.pass) || (clean === !!prev.pass && (speed > prev.speed || (speed === prev.speed && score > prev.score)));
    if (better) prog.set(lineNo, { time: { score, notes: s.notes, timing: s.timing, speed, pass: clean } });
    if (clean) $$('#steps button')[2].classList.add('ok');
    const stars = clean ? starsFor(speed) : 0;
    let head, tip;
    if (clean && s.notes >= 95 && timing >= 85) { head = speed < 1 ? `Clean at ${pct(speed)} speed!` : 'Clean at full speed!'; const all = s.notes === 100 && timing === 100 ? 'Every note right and on time.' : 'Almost every note right and on time.'; tip = speed < 1 ? `${all} Try it a bit faster.` : `${all} That line is yours.`; }
    else if (clean) { head = speed < 1 ? `Good at ${pct(speed)} speed` : 'Good at full speed'; tip = res.tips[0] ? res.tips[0].text : ''; }
    else { head = s.notes < 80 ? 'Some notes to fix' : 'Notes good, timing next'; tip = res.tips[0] ? res.tips[0].text : 'Try it a little slower.'; }
    showResult({ stars, head, sub: `Notes ${s.notes}% · on time ${s.timing == null ? '—' : s.timing + '%'}`, tip, take, review: buildReviewAlong(res, this) });
    const acts = [];
    const nl = lineNo === 'all' ? null : lineNo < lineCount() ? lineNo + 1 : 'all';
    const toNext = () => go(`#/lesson/${nl}/listen`, true);
    const again = (sp) => () => { timeSpeed = sp; lessonTime.chosen = true; renderLesson(); practice.start('along'); };
    if (clean && speed < 1) acts.push({ label: `Faster: ${pct(fasterThan(speed))} ›`, primary: true, fn: again(fasterThan(speed)) });
    else if (clean && nl) acts.push({ label: `Next: ${lineLabel(nl)} ›`, primary: true, fn: toNext });
    else if (clean) acts.push({ label: 'Done ✓', primary: true, fn: () => go('#/song', true) });
    else if (s.notes < 80) acts.push({ label: 'Practise it slowly ›', primary: true, fn: () => setStep('slow') });
    acts.push({ label: '↻ Again', primary: !acts.length, fn: again(speed) });
    if (!clean && speed > TIME_SPEEDS[0]) acts.push({ label: `Slower: ${pct(slowerThan(speed))}`, fn: again(slowerThan(speed)) });
    if (clean && speed < 1 && nl) acts.push({ label: `${lineLabel(nl)} ›`, fn: toNext });
    setActions(acts.slice(0, 2));
    $('#actions .primary').id = 'mainBtn';
    if (!clean) repeat.start(again(speed), 4, 'Again', loopOn());
    else if (loopOn()) repeat.start(speed < 1 ? again(fasterThan(speed)) : again(speed), 3, speed < 1 ? `Faster (${pct(fasterThan(speed))})` : 'Again', true);
  },
};

// Slowly waits for every note, so the player sets his own speed. His rhythm is still judged: each gap
// between two notes is compared with the song's gap after scaling the song to his overall speed
// (the median ratio). A gap from 0.6× to 1.6× of the scaled one counts as right (owner, 2026-11-23:
// "it should wait for me to play, then judge my timing").
function rhythmAtOwnSpeed(okTimes) {
  const pairs = [];
  for (let j = 1; j < (okTimes || []).length; j++) {
    const a = okTimes[j - 1], b = okTimes[j];
    if (b.k !== a.k + 1) continue;                     // a skipped note in between
    const want = b.n.t - a.n.t, got = b.t - a.t;
    if (want > 0.12 && got > 0.05) pairs.push({ a: a.n, b: b.n, r: got / want });
  }
  if (pairs.length < 3) return null;
  const rs = pairs.map((p) => p.r).sort((x, y) => x - y), tempo = rs[rs.length >> 1];
  let ok = 0, worst = null;
  for (const p of pairs) {
    const r = p.r / tempo; if (r > 0.6 && r < 1.6) ok++;
    if (!worst || Math.abs(Math.log(r)) > Math.abs(Math.log(worst.r))) worst = { ...p, r };
  }
  const tip = !worst || (worst.r > 0.6 && worst.r < 1.6) ? 'Your rhythm follows the song. Now try it in time.'
    : worst.r >= 1.6 ? `You took too long from ${worst.a.ar} to ${worst.b.ar}. Practise that change until it flows.`
      : `${worst.a.ar} was too short: hold it longer before ${worst.b.ar}.`;
  return { score: Math.round(100 * ok / pairs.length), speed: Math.max(1, Math.round(100 / tempo)), tip };
}

// ---- Check my take + Replay my take (owner, 2026-11-27: "use the mirror to see if your takes were correct", and
// "an actually impressive feature"). After a Slowly take, every note asked for is set against the pitch the lesson
// heard for it: in tune (within 25 cents), a bit off (25-75 cents: the lenient window let it pass) with which way to
// slide, or wrong. The Mirror idea (each note of the take against the version), on the app's own measurements.
function centsOff(midi, n, octave) { let d = midi - n.midi; if (octave) d -= 12 * Math.round(d / 12); return Math.round(d * 100); }
function slideTip(n, c) {
  if (!n.finger) return `String ${n.string} is ${c < 0 ? 'low' : 'high'}: tune it`;
  return c < 0 ? `A little low (${c} cents): slide toward the body` : `A little high (+${c} cents): slide toward the pegs`;
}
function buildReview(pr) {
  const t0 = pr.audioT0 || 0, ev = [];
  for (const o of pr.okTimes || []) {
    if (o.midi == null) continue;
    const c = centsOff(o.midi, o.n, o.octave), st = Math.abs(c) <= 25 ? 'ok' : 'off';
    ev.push({ t: o.t - t0, k: o.k, n: o.n, midi: o.midi, cents: c, status: st, tip: st === 'ok' ? 'In tune ✓' : slideTip(o.n, c) });
  }
  for (const m of pr.waitMistakes || []) {
    if (m.t == null) continue;
    const n = pr.list[m.k]; if (!n) continue;
    ev.push({ t: m.t - t0, k: m.k, n, midi: m.midi, cents: null, status: 'wrong', tip: `Heard ${m.heard}: play ${n.ar}` });
  }
  ev.sort((a, b) => a.t - b.t);
  const count = (s) => ev.filter((e) => e.status === s).length;
  return { ev, ok: count('ok'), off: count('off'), wrong: count('wrong') };
}
// the same check for In time, from analyzeTake's items: pitch as in Slowly, plus "a bit late/early" past 0.12 s
function buildReviewAlong(res, pr) {
  const t0 = pr.audioT0 || 0, groups = groupsOf(sectionNotes().filter((n) => !n.grace)), ev = [];
  const kOf = (ref) => groups.findIndex((g) => g.notes.some((x) => x.i === ref.i));
  for (const it of res.items) {
    if (it.ref.grace || !it.played) continue;
    const n = it.ref, k = kOf(n);
    if (it.status === 'wrong') { ev.push({ t: it.played.t - t0, k, n, midi: it.played.midi, cents: null, status: 'wrong', tip: `Heard ${nameOf(it.played.midi).ar}: play ${n.ar}` }); continue; }
    const c = it.cents, st = c == null || Math.abs(c) <= 25 ? 'ok' : 'off';
    let tip = st === 'ok' ? 'In tune ✓' : slideTip(n, c);
    if (it.dt != null && Math.abs(it.dt) > 0.12) tip += it.dt > 0 ? ' · a bit late' : ' · a bit early';
    ev.push({ t: it.played.t - t0, k, n, midi: it.played.midi, cents: c, status: st, tip });
  }
  ev.sort((a, b) => a.t - b.t);
  const count = (s) => ev.filter((e) => e.status === s).length;
  return { ev, ok: count('ok'), off: count('off'), wrong: count('wrong') };
}
function openReplay(review, blob) {
  repeat.cancel();
  const sheet = $('#replaySheet'), ev = review.ev; if (!ev.length) return;
  let i = 0, au = null;
  const row = $('#rpRow'); row.innerHTML = '';
  ev.forEach((e, k) => { const c = el('button', 'rp-chip ' + e.status, `<span class="ar">${e.n.ar}</span>`); c.type = 'button'; c.addEventListener('click', () => { pause(); show(k); }); row.append(c); });
  function show(k) {
    i = k; const e = ev[k];
    $('#rpNote').textContent = e.n.ar; $('#rpWhere').textContent = where(e.n);
    $('#rpNeck').innerHTML = neckSVG(e.n, othersOnString(e.n), e.status === 'wrong' ? null : { midi: e.n.midi + (e.cents || 0) / 100, status: e.status });
    const tip = $('#rpTip'); tip.textContent = e.tip; tip.className = 'rp-tip ' + e.status;
    $$('#rpRow .rp-chip').forEach((c, j) => c.classList.toggle('now', j === k));
    const cur = row.children[k]; if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function pause() { if (au) au.pause(); $('#rpPlay').textContent = '▶ Play my take'; }
  $('#rpPlay').onclick = () => {
    if (!blob) return;
    if (au && !au.paused) { pause(); return; }
    au = au || new Audio(URL.createObjectURL(blob));
    au.ontimeupdate = () => { let k = 0; while (k + 1 < ev.length && ev[k + 1].t <= au.currentTime + 0.05) k++; if (k !== i) show(k); };
    au.onended = pause;
    if (au.ended || au.currentTime === 0) au.currentTime = Math.max(0, ev[i].t - 0.4);
    au.play(); $('#rpPlay').textContent = '■ Pause';
  };
  $('#rpPlay').hidden = !blob;
  $('#rpPrev').onclick = () => { pause(); show(Math.max(0, i - 1)); };
  $('#rpNext').onclick = () => { pause(); show(Math.min(ev.length - 1, i + 1)); };
  sheet.hidden = false; show(0);
  const obs = new MutationObserver(() => { if (sheet.hidden) { pause(); obs.disconnect(); } }); obs.observe(sheet, { attributes: true, attributeFilter: ['hidden'] });
}
function showResult({ stars, head, sub, tip, take, review }) {
  $('#lesson').classList.add('showing-result');
  const box = $('#result'); box.hidden = false;
  // a calm reward (design D): a big ✓ ring when the take had no mistakes and nothing skipped
  const clean = stars === 3;
  box.innerHTML = (clean ? '<div class="r-ring" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' : '') +
    `<div class="r-stars">${stars ? starStr(stars) : ''}</div><div class="r-head">${head}</div><div class="r-sub">${sub}</div>` +
    (tip ? `<p class="r-tip">${arSpan(tip)}</p>` : '') +
    (review && review.ev.length ? `<div class="r-check"><span class="ok">${review.ok} in tune</span>` +
      (review.off ? ` · <span class="off">${review.off} a bit off</span>` : '') + (review.wrong ? ` · <span class="bad">${review.wrong} wrong</span>` : '') + '</div>' +
      '<button class="btn second r-replay" type="button">▶ Replay my take</button>' : '') +
    '<details class="r-more"><summary>⋯ More</summary><div class="r-links"></div></details>';
  const rb = box.querySelector('.r-replay'); if (rb) rb.addEventListener('click', () => openReplay(review, take.audio));
  // "Practise these notes" (Rocksmith-style loop of the hard bit): the notes that were off or wrong, one each side
  const bad = review ? [...new Set(review.ev.filter((e) => e.status !== 'ok').map((e) => e.k))] : [];
  if (bad.length) {
    const ks = [...new Set(bad.flatMap((k) => [k - 1, k, k + 1]))].filter((k) => k >= 0).sort((a, b) => a - b).slice(0, 6);
    const pb = el('button', 'btn second r-replay', `↻ Practise these ${ks.length} notes`); pb.type = 'button';
    pb.addEventListener('click', () => { repeat.cancel(); focus = { ks, clean: 0 }; lessonSlow(); practice.start('wait'); });
    (rb || box.querySelector('.r-more')).after(pb);
  }
  if (take && take.id) takeLinks(take, box.querySelector('.r-links')); else box.querySelector('.r-more').remove();
  window.scrollTo(0, 0);
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
  if (v.id === BEST[song.id]) return '<span class="tag best">best</span>';
  if (v.id === 'original') return '<span class="tag real">the real song</span>';
  return v.paced ? '<span class="tag notes">even pace</span>' : '<span class="tag measured">real timing</span>';
}
function openSettings() {
  $('#mainOnly').checked = mainOnly; $('#repeatOn').checked = repeat.on();
  const list = $('#versionList'); list.innerHTML = '';
  const row = (v) => {
    const b = el('button', 'ver-row' + (v === version ? ' on' : ''), `<b>${v.name}</b>${tagOf(v)}<small>${v.about}</small>`);
    b.type = 'button';
    b.addEventListener('click', () => { setVersion(v); real.forget(); route(); toast(`Version: ${v.name}`); });
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
$('#repeatOn').addEventListener('change', (e) => { store.set('repeat', e.target.checked); if (!e.target.checked) repeat.cancel(); });
$('#mainOnly').addEventListener('change', (e) => {
  mainOnly = e.target.checked; store.set('mainOnly2', mainOnly);
  setPass(pass.id); const keep = !$('#settings').hidden; route(); if (keep) $('#settings').hidden = false;
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
  real.forget(); route(); openSettings();
});

// ------------------------------------------------------------------ takes sheet
function bumpWeak(key) { const w = store.get('weak', {}); w[key] = (w[key] || 0) + 1; store.set('weak', w); }
async function openTakes() {
  $('#takesSheet').hidden = false;
  const w = store.get('weak', {});
  const box = $('#weak'); box.innerHTML = '';
  const top = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) box.append(el('span', 'muted', 'Nothing yet. Practise a line and this fills in.'));
  top.forEach(([k, n]) => box.append(el('span', 'weak-chip', `<span class="ar">${NOTES[k].ar}</span><small>${where(NOTES[k])} · ${n}× not right</small>`)));
  const ul = $('#history'); ul.innerHTML = '';
  const list = await takes.list();
  $('#sendAll').hidden = $('#sendEvery').hidden = !list.length;
  if (!list.length) ul.append(el('li', 'muted', 'No takes yet.'));
  list.slice(0, 30).forEach((t) => {
    const d = new Date(t.at), s = t.score || {};
    const sc = t.kind === 'risha' ? (t.mode === 'step' ? `${s.wrong || 0} wrong of ${s.strokes}` : `on time ${s.onTime}% · ${t.bpm} BPM`)
      : t.mode === 'wait' ? `${t.waitErrors || 0} wrong` : `notes ${s.notes}%` + (s.timing == null ? '' : ` · on time ${s.timing}%`) + (t.speed ? ` · ${pct(t.speed)} speed` : '');
    const li = el('li', 'take');
    li.append(el('div', 'take-info', `<b>${arSpan((t.song || '').split(' (')[0])} · ${t.partLabel} · ${{ wait: 'Slowly', along: 'In time', free: 'Free', step: 'Slowly', time: 'In time' }[t.mode] || t.mode}</b>` +
      `<span class="muted">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${sc}</span>`));
    const act = el('div', 'take-act'); takeLinks(t, act);
    const del = el('button', 'link', '✕'); del.type = 'button'; del.title = 'Delete';
    del.addEventListener('click', async () => { await takes.remove(t.id); openTakes(); });
    act.append(del); li.append(act); ul.append(li);
  });
}
// all takes (today's, or every one on the phone) in one zip file
async function sendTakes(days) {
  const all = await takes.list(), list = days ? all.filter((t) => Date.now() - t.at < days * 24 * 3600e3) : all;
  if (!list.length) { toast(days ? 'No takes today yet.' : 'No takes yet.'); return; }
  toast(`Packing ${list.length} take${list.length > 1 ? 's' : ''}…`, 2000);
  const r = await shareAllTakes(list);
  if (r === 'shared') toast('Sent. Ask Claude how it went.');
  else if (r === 'downloaded') toast('Saved as one zip file. Attach it in your Claude chat.');
}
$('#sendAll').addEventListener('click', () => sendTakes(1));
$('#sendEvery').addEventListener('click', () => sendTakes(0));
$('#clearHist').addEventListener('click', async () => { if (confirm('Delete all saved takes and recordings?')) { await takes.clear(); store.set('weak', {}); openTakes(); } });

// ------------------------------------------------------------------ TUNER
// The tuner lives in tuner.js (own mic analysis, string tracking, gauge). This only connects it.
// 5 or 6 strings (owner, 2026-11-24: "some people have a 5-string oud"): a 5-string oud has no string 6
const ensureDistinctLowStrings = () => {
  const s5i = store.get('s5', 0);
  if (store.get('courses', 6) !== 5) {
    const cur6 = store.get('s6', 0), ok6 = validS6Index(s5i, cur6);
    if (ok6 !== cur6) store.set('s6', ok6);
  }
};
const tunerStrings = () => {
  ensureDistinctLowStrings();
  const s = STRINGS.map((x) => ({ ...x }));
  Object.assign(s[4], STRING5_OPTIONS[store.get('s5', 0)] || STRING5_OPTIONS[0]);
  Object.assign(s[5], STRING6_OPTIONS[store.get('s6', 0)] || STRING6_OPTIONS[0]);
  return s.slice(0, store.get('courses', 6) === 5 ? 5 : 6);
};
// the listener needs the oud's own low strings: a low reading there is a real string, not an octave slip
// …and low notes (فا, صول) go on the right string of this oud; built songs are rebuilt
const setOpenLow = () => {
  ensureDistinctLowStrings();
  listener.openLow = tunerStrings().filter((x) => x.n >= 4).map((x) => x.midi);
  placeLow(tunerStrings()); clearBuilt(); if (song) setPass(pass && pass.id);
};
setOpenLow();
let tunerImpl = null;
const tuner = {
  start() { return tunerImpl && tunerImpl.start(); },
  stop() { if (tunerImpl) tunerImpl.stop(); },
  render() { if (tunerImpl) tunerImpl.render(); },
};
import('./tuner.js').then(({ createTuner }) => { tunerImpl = debug.tuner = createTuner({ audioCtx, strings: tunerStrings, toast }); });
$('#tuStart').addEventListener('click', () => tuner.start());
STRING5_OPTIONS.forEach((o, k) => $('#s5').append(new Option(`${o.ar} · ${o.name}`, k)));
STRING6_OPTIONS.forEach((o, k) => $('#s6').append(new Option(`${o.ar} · ${o.name}`, k)));
function syncS6Select() {
  const s5 = STRING5_OPTIONS[store.get('s5', 0)] || STRING5_OPTIONS[0];
  [...$('#s6').options].forEach((opt, k) => {
    const bad = STRING6_OPTIONS[k].midi >= s5.midi;
    opt.disabled = bad;
    opt.textContent = `${STRING6_OPTIONS[k].ar} · ${STRING6_OPTIONS[k].name}${bad ? ' (≥ S5)' : ''}`;
  });
  $('#s5').value = store.get('s5', 0);
  $('#s6').value = store.get('s6', 0);
}
syncS6Select();
$('#s5').addEventListener('change', (e) => {
  const s5i = +e.target.value, prev6 = store.get('s6', 0);
  store.set('s5', s5i);
  setOpenLow(); syncS6Select(); tuner.render(); renderSettings(); renderOudLinks();
  const now6 = store.get('s6', 0);
  if (courses() === 6 && now6 !== prev6) {
    toast(`String 5 = ${STRING5_OPTIONS[s5i].ar} · String 6 moved to ${STRING6_OPTIONS[now6].ar} (${STRING6_OPTIONS[now6].name})`);
  }
});
$('#s6').addEventListener('change', (e) => {
  const s5i = store.get('s5', 0), want6 = +e.target.value, ok6 = validS6Index(s5i, want6);
  store.set('s6', ok6);
  setOpenLow(); syncS6Select(); tuner.render(); renderSettings(); renderOudLinks();
});

// ------------------------------------------------------------------ SETTINGS (the whole app)
// One page for everything that isn't about one song (owner, 2026-11-24: "an option for 5 strings in the website
// settings"; "it will get too messy with all those features"). The song sheet (gear on a song) keeps the song's own
// things: its real recording and its versions.
const courses = () => (store.get('courses', 6) === 5 ? 5 : 6);
function oudLabel() {
  ensureDistinctLowStrings();
  const s5 = STRING5_OPTIONS[store.get('s5', 0)] || STRING5_OPTIONS[0], s6 = STRING6_OPTIONS[store.get('s6', 0)] || STRING6_OPTIONS[0];
  return `${courses()}-string oud · string 5 = ${s5.ar}${courses() === 6 ? ` · 6 = ${s6.ar}` : ''} · Settings ›`;
}
function renderOudLinks() { $$('[data-oud]').forEach((b) => { b.innerHTML = `<bdi>${oudLabel()}</bdi>`; }); }
$$('[data-oud]').forEach((b) => b.addEventListener('click', () => go('#/settings')));
function renderSettings() {
  ensureDistinctLowStrings();
  $$('#setCourses button').forEach((b) => b.classList.toggle('on', +b.dataset.c === courses()));
  syncS6Select();
  const is5 = courses() === 5;
  $('#s6Row').hidden = is5;
  $('#s6PresetsRow').hidden = is5;
  if (!is5) {
    const pbox = $('#s6Presets'); pbox.innerHTML = '';
    const cur5 = store.get('s5', 0), cur6 = store.get('s6', 0);
    TUNING_PRESETS_6.forEach((p) => {
      const on = cur5 === p.s5 && cur6 === p.s6;
      const b = el('button', 'pchip' + (on ? ' on' : ''), `<b dir="rtl">${p.ar}</b><small>${p.en}</small>`);
      b.type = 'button';
      b.addEventListener('click', () => {
        store.set('s5', p.s5); store.set('s6', p.s6);
        setOpenLow(); syncS6Select(); tuner.render(); renderSettings(); renderOudLinks();
        toast(`6-string tuning: ${p.ar} · ${p.en}`);
      });
      pbox.append(b);
    });
  }
  $('#s5Hint').textContent = is5 ? 'On a 5-string oud this is your lowest string: the قرار of the rhythms.' : 'The tuner and the exercises follow this.';
  $('#setRepeat').checked = repeat.on(); $('#setMain').checked = mainOnly; $('#setClick').checked = store.get('pace.click', true);
  $('#setVersion').textContent = `Oud Coach version ${BUILD}. New versions show "Tap to update" at the top.`;
}
$$('#setCourses button').forEach((b) => b.addEventListener('click', () => { store.set('courses', +b.dataset.c); setOpenLow(); tuner.render(); renderSettings(); toast(`Set for a ${b.dataset.c}-string oud.`); }));
$('#setRepeat').addEventListener('change', (e) => { store.set('repeat', e.target.checked); if (!e.target.checked) repeat.cancel(); });
$('#setMain').addEventListener('change', (e) => { mainOnly = e.target.checked; store.set('mainOnly2', mainOnly); if (song && pass) setPass(pass.id); });
$('#setClick').addEventListener('change', (e) => pace.preset({ click: e.target.checked }));
$('#setIntro').addEventListener('click', openIntro);
$('#setPath').addEventListener('click', () => go('#/path'));
$('#setHowto').addEventListener('click', () => openHowtoList());
$('#setRecordOud').addEventListener('click', () => go('#/record-oud'));

// ------------------------------------------------------------------ HOW-TO GUIDES
// Short sourced guides (js/howto.js), opened from a path step, the risha trainer or Settings → Help.
function howtoCard(k) {
  const c = HOWTO[k]; if (!c) return '';
  const li = (a) => a.map((x) => `<li>${arSpan(x)}</li>`).join('');
  return `<section class="howto"><h3><span class="ht-t">${arSpan(c.t)}</span>${c.ar ? ` <bdi class="ar">${c.ar}</bdi>` : ''}</h3><ol>${li(c.steps)}</ol>` +
    (c.check && c.check.length ? `<div class="ht-box"><b>Check yourself</b><ul>${li(c.check)}</ul></div>` : '') +
    (c.mistakes && c.mistakes.length ? `<div class="ht-box bad"><b>Common mistakes</b><ul>${c.mistakes.map(([m, f]) => `<li>${arSpan(m)} → ${arSpan(f)}</li>`).join('')}</ul></div>` : '') +
    (c.src && c.src.length ? `<p class="ht-src">Sources: ${c.src.map((u, i) => `<a href="${u}" target="_blank" rel="noopener">${i + 1}</a>`).join(' · ')}</p>` : '') + '</section>';
}
function openHowto(keys, title) {
  const ks = (Array.isArray(keys) ? keys : [keys]).filter((k) => HOWTO[k]); if (!ks.length) return;
  $('#howtoTitle').textContent = title || HOWTO[ks[0]].t;
  $('#howtoBody').innerHTML = ks.map(howtoCard).join('');
  $('#howtoBody').classList.toggle('single', ks.length === 1);           // one card: its title is already in the header
  $('#howtoSheet').hidden = false; $('#howtoBody').scrollTop = 0;
}
function openHowtoList() {
  $('#howtoTitle').textContent = 'How-to guides';
  const body = $('#howtoBody'); body.innerHTML = ''; body.classList.remove('single');
  Object.entries(HOWTO).forEach(([k, c]) => {
    const b = el('button', 'ht-row', `<b>${arSpan(c.t)}</b>${c.ar ? `<small><bdi class="ar">${c.ar}</bdi></small>` : ''}<i>›</i>`); b.type = 'button';
    b.addEventListener('click', () => openHowto(k)); body.append(b);
  });
  $('#howtoSheet').hidden = false; body.scrollTop = 0;
}
$('#paceHowto').addEventListener('click', () => openHowto(HOWTO_FOR[store.get('pace.pat', 's1')] || ['strokes'], 'How to play this'));

// ------------------------------------------------------------------ boot
// ------------------------------------------------------------------ updates
// Phones keep an old copy of the site (open tabs, home-screen icons). version.json is read fresh; when it names a
// newer build than this file, a banner offers to reload (owner, 2026-11-23: "I don't see the new features").
// Bump BUILD here and in version.json together on every release.
const BUILD = '2026-11-27.5';
async function checkUpdate() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const v = (await r.json()).build;
    if (v && v !== BUILD && !document.getElementById('updateBar')) {
      const b = el('button', 'update-bar', 'A new version of Oud Coach is ready · <b>Tap to update</b>'); b.id = 'updateBar'; b.type = 'button';
      b.addEventListener('click', () => { const u = new URL(location.href); u.searchParams.set('v', v); location.replace(u.toString()); });
      document.body.append(b);
    }
  } catch (_) {}
}
checkUpdate();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });

const pace = createPace({ $, el, listener, store, toast, saveTake: (t) => takes.save(t), takeLinks, oud: () => tunerStrings(), onDone: (r) => { if (r.score >= 60) markDay('right'); } });
const path = createPath({ $, el, store, prog, pickVersion, go, toast, howto: (id) => HOWTO_FOR[id], openHowto,
  openPace: (o) => { pace.preset(o); go('#/pace'); },
  openLesson: (sid, vid, need) => {
    const s = SONGS.find((x) => x.id === sid); setSong(s);
    const v = vid && s.versions.find((x) => x.id === vid); if (v) setVersion(v);
    go(s.exercise && v && !s.homeSong ? `#/lesson/all/${need === 'time' ? 'time' : 'slow'}` : '#/song');
  } });
const oudRec = createOudRecorder({
  $, el, audioCtx, playNote, strings: tunerStrings,
  setString5Fa: () => { store.set('s5', 1); setOpenLow(); syncS6Select(); tuner.render(); renderOudLinks(); },
  setString6Midi: (m) => { const k = STRING6_OPTIONS.findIndex((o) => o.midi === m); if (k >= 0) { store.set('s6', validS6Index(store.get('s5', 0), k)); setOpenLow(); syncS6Select(); tuner.render(); renderOudLinks(); } },
  toast, zipBlob,
});
startIcons();   // one icon style for buttons (js/icons.js)
route();
debug.practice = practice; debug.pass = () => pass; debug.lane = lane; debug.awake = awake; debug.oudRec = oudRec;
