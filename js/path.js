// Your path: what to practise now and when to move on (owner, 2026-11-23: "I need someone to guide me, I don't
// have that, so I'm depending on you and this app"). The stages follow what Arabic oud courses teach a beginner,
// in their order (8 YouTube series, Gulf platforms Oudista and Osarh, izif, a Tunisian conservatory method, a
// Yarmouk University study): hold, tune, open-string risha; left hand; first maqam عجم on دو; one maqam at a time
// with a song; tremolo after the first scale; rhythms through the risha; taqsim last. Changed for this learner:
// بياتي comes second because his songs are بياتي (one course does the same with حب إيه). Every speed, score and
// time below is our own choice, not a teacher's. Research summary: docs/memory/path.md.
import { SONGS, buildPass, linesOf } from './library.js';

const HOLD_TIPS = [
  'Sit on a chair; put your right foot on something low (a footstool or a book) so the oud sits steady.',
  'Keep the face of the oud upright. Don’t tilt it up to look at it.',
  'Your right forearm rests on the top edge and holds the oud; the wrist floats above the face.',
  'Test: let go of the neck with your left hand. The oud should stay still.',
  'Risha: pinch it between thumb and index, about 1 cm showing, firm but not tight.',
  'Strike with the forearm and wrist. The elbow and shoulder stay still.',
  'Left thumb rests behind the neck (it doesn’t squeeze); fingertips stay close to the strings.',
];

// kind: read (tips), tune, pace (risha trainer: pattern, bpm, 85% on time), lesson (song + version, slow|time),
// manual (he ticks it). optional steps don't hold the stage back.
export const STAGES = [
  { title: 'Hold, tune, strike', ar: 'المسك والدوزان والريشة', time: 'Week 1',
    why: 'Every course starts here: how to hold the oud and the risha, tune, then strike the open strings.',
    steps: [
      { id: 'hold', t: 'How to sit and hold', d: 'Read once, then check it every time you play.', kind: 'read', tips: HOLD_TIPS },
      { id: 'tune', t: 'Tune all 6 strings', d: 'Do it every time you play.', kind: 'tune' },
      { id: 'open', t: 'Open strings', d: 'Warm-up, Slowly: find each string.', kind: 'lesson', song: 'warmups', ver: 'open-strings', need: 'slow' },
      { id: 'r1', t: 'Risha: 1 per beat', d: 'Watch, step by step, then with the click at 60 BPM.', kind: 'pace', pat: 's1', bpm: 60 },
      { id: 'r2', t: 'Risha: ↓↑ 2 per beat', d: 'Down-up (صد ورد), with the click at 60 BPM.', kind: 'pace', pat: 's2', bpm: 60 },
    ],
    watch: ['Move the forearm and wrist, not the shoulder.', 'Slow and even beats fast and messy.'],
    next: 'All ticked, and the oud stays still when your left hand lets go.' },
  { title: 'Left hand and your first maqam: عجم', ar: 'اليد اليسرى · مقام العجم', time: 'Weeks 2–3',
    why: 'Courses wake up the fingers next, then teach عجم on دو first: it has no quarter tones.',
    steps: [
      { id: 'fingers', t: 'Fingers 1 and 2', d: 'Warm-up, Slowly.', kind: 'lesson', song: 'warmups', ver: 'fingers', need: 'slow' },
      { id: 'four', t: 'Four fingers', d: 'Fingers 1-2-3-4 on strings 3 and 2. Keep each finger down.', kind: 'lesson', song: 'warmups', ver: 'four-fingers', need: 'slow' },
      { id: 'ajam-s', t: 'عجم scale, Slowly', kind: 'lesson', song: 'maqamat', ver: 'ajam', need: 'slow' },
      { id: 'ajam-t', t: 'عجم scale, In time', kind: 'lesson', song: 'maqamat', ver: 'ajam', need: 'time' },
      { id: 'r2b', t: 'Risha ↓↑ at 80 BPM', d: 'Raise the speed only after a clean run.', kind: 'pace', pat: 's2', bpm: 80 },
      { id: 'tune1', t: 'A tune by ear in عجم: سنة حلوة يا جميل', d: 'Courses use it as a first tune. Not in the app yet (send a video to add it).', kind: 'manual', optional: true },
    ],
    watch: ['Keep fingers close to the strings; don’t lift them high.', 'Press just enough for a clear note.'],
    next: 'عجم In time with no mistakes.' },
  { title: 'بياتي with حب إيه, first tremolo', ar: 'البياتي وحب إيه · الريشة المتصلة', time: 'Weeks 3–7',
    why: 'Your songs are بياتي, so it comes second (one Arabic course does this with حب إيه). Tremolo comes after the first scale in every course.',
    steps: [
      { id: 'bay-s', t: 'بياتي scale, Slowly', d: 'مي is half-flat: between مي♭ and مي. Listen first.', kind: 'lesson', song: 'maqamat', ver: 'bayati', need: 'slow' },
      { id: 'bay-t', t: 'بياتي scale, In time', kind: 'lesson', song: 'maqamat', ver: 'bayati', need: 'time' },
      { id: 'hob-s', t: 'حب إيه, every line Slowly', kind: 'lesson', song: 'hob-eih', need: 'slow' },
      { id: 'hob-t', t: 'حب إيه, In time', d: 'Line by line, then the whole intro.', kind: 'lesson', song: 'hob-eih', need: 'time' },
      { id: 'trem', t: 'Tremolo start: 4 per beat', d: '↓↑↓↑ on one string, with the click at 60 BPM.', kind: 'pace', pat: 's4', bpm: 60 },
    ],
    watch: ['Tremolo comes from a loose wrist, not a stiff arm.', 'If it gets messy, slow down.'],
    next: 'حب إيه In time, and 4 per beat even at 60.' },
  { title: 'نهاوند and your other two songs', ar: 'النهاوند · حب من تحب · أحب الليل', time: 'Weeks 6–10',
    why: 'نهاوند is the second or third maqam in the courses, and حب من تحب starts in it.',
    steps: [
      { id: 'nah-s', t: 'نهاوند scale, Slowly', kind: 'lesson', song: 'maqamat', ver: 'nahawand', need: 'slow' },
      { id: 'nah-t', t: 'نهاوند scale, In time', kind: 'lesson', song: 'maqamat', ver: 'nahawand', need: 'time' },
      { id: 'hmt', t: 'حب من تحب, In time', kind: 'lesson', song: 'hob-min-tihib', need: 'time' },
      { id: 'ahib', t: 'أحب الليل والسهرة, In time', d: 'Long notes: hold them with tremolo.', kind: 'lesson', song: 'ahib-al-lail', need: 'time' },
      { id: 'trem80', t: 'Tremolo: 4 per beat at 80 BPM', kind: 'pace', pat: 's4', bpm: 80 },
    ],
    watch: ['Keep the tremolo going through long notes without tensing the arm (check in a mirror).'],
    next: 'Both songs In time.' },
  { title: 'Kurd, Hijaz, Rast', ar: 'الكرد · الحجاز · الراست', time: 'Months 3–4',
    why: 'One maqam a week. كرد and حجاز sit on ري like بياتي; راست brings the half-flat سي.',
    steps: [
      { id: 'kurd', t: 'كرد scale, In time', d: 'Like بياتي but مي♭.', kind: 'lesson', song: 'maqamat', ver: 'kurd', need: 'time' },
      { id: 'hijaz', t: 'حجاز scale, In time', d: 'The wide step from مي♭ to فا#.', kind: 'lesson', song: 'maqamat', ver: 'hijaz', need: 'time' },
      { id: 'rast', t: 'راست scale, In time', kind: 'lesson', song: 'maqamat', ver: 'rast', need: 'time' },
    ],
    watch: ['Say each note’s name as you play it.'],
    next: 'All three In time.' },
  { title: 'Rhythms with the risha', ar: 'الإيقاعات بالريشة', time: 'Months 3–5',
    why: 'Gulf courses teach إيقاع عربي, then رومبا (they say most Gulf songs use these two). Egyptian songs start with مقسوم.',
    steps: [
      { id: 'arabi', t: 'إيقاع عربي', d: 'Watch, step by step, then with the click at 60.', kind: 'pace', pat: 'arabi', bpm: 60 },
      { id: 'rumba', t: 'رومبا', kind: 'pace', pat: 'rumba', bpm: 60 },
      { id: 'arabiS', t: 'إيقاع عربي on the بياتي scale', d: 'Turn on "On the Bayati scale".', kind: 'pace', pat: 'arabi', bpm: 60, scale: true },
      { id: 'maqsum', t: 'مقسوم', d: 'For Egyptian songs.', kind: 'pace', pat: 'maqsum', bpm: 60 },
      { id: 'khaliji', t: 'خليجي', kind: 'pace', pat: 'khaliji', bpm: 60, optional: true },
    ],
    watch: ['قرار strokes on the low فا (string 6), the others on string 3.', 'Count out loud.'],
    next: 'عربي and رومبا with the click at 60.' },
  { title: 'Saba and Sikah: all 8 maqamat', ar: 'الصبا والسيكاه', time: 'Months 5–6',
    why: 'صبا and سيكاه come last in every course.',
    steps: [
      { id: 'saba', t: 'صبا scale, In time', d: 'صول♭ is finger 3 on string 3.', kind: 'lesson', song: 'maqamat', ver: 'saba', need: 'time' },
      { id: 'sikah', t: 'سيكاه scale, In time', d: 'Starts and ends on a half-flat.', kind: 'lesson', song: 'maqamat', ver: 'sikah', need: 'time' },
      { id: 'all8', t: 'All 8 maqamat In time', kind: 'all8' },
    ],
    watch: ['Listen first, then play: the half-flats are found by ear.'],
    next: 'All 8 In time.' },
  { title: 'First taqsim phrases', ar: 'أول جمل التقاسيم', time: 'From month 6',
    why: 'Taqsim is not in beginner courses; teachers start by copying short phrases in a maqam you know.',
    steps: [
      { id: 'phr1', t: 'Copy one short بياتي phrase', d: 'From حب إيه or a recording: sing it, then play it.', kind: 'manual' },
      { id: 'phr2', t: 'Copy three phrases and join two', kind: 'manual' },
      { id: 'free', t: 'Play your copied phrases as a warm-up', d: 'In order, slowly. Free improvising comes later.', kind: 'manual' },
    ],
    watch: ['Play what you can sing.'],
    next: 'This is where a teacher’s ear helps most: send Claude a take.' },
];

export function createPath({ $, el, store, prog, pickVersion, openLesson, openPace, go, toast, howto, openHowto }) {
  const cur = () => Math.max(0, Math.min(STAGES.length - 1, store.get('path.stage', 0)));
  let view = null;                              // the stage shown on the path screen (defaults to the current one)
  const ticks = () => store.get('path.ticks', {});

  function lessonOk(s, need) {
    const song = SONGS.find((x) => x.id === s.song); if (!song) return false;
    const v = s.ver ? song.versions.find((x) => x.id === s.ver) : pickVersion(song);
    const p0 = v && v.passes[0]; if (!p0) return false;
    const ok = (l) => (need === 'slow' ? (prog.get(l, song, p0).slow || 0) >= 1 || prog.done(l, song, p0) : prog.done(l, song, p0));
    const n = linesOf(buildPass(p0).notes).length;
    return ok('all') || Array.from({ length: n }, (_, i) => i + 1).every(ok);
  }
  function paceOk(s) {
    return store.get('pace.hist', []).some((h) => h.pattern === s.pat && h.bpm >= s.bpm && h.score >= 85 &&
      (h.strings == null || h.strings >= 80) && (!s.scale || h.scale));
  }
  function tunedEver() {
    try { return Object.keys(localStorage).some((k) => k.startsWith('oudcoach.day.') && JSON.parse(localStorage.getItem(k) || '{}').tune); }
    catch (_) { return false; }
  }
  function done(s) {
    if (ticks()[s.id]) return true;
    if (s.kind === 'tune') return tunedEver();
    if (s.kind === 'pace') return paceOk(s);
    if (s.kind === 'lesson') return lessonOk(s, s.need);
    if (s.kind === 'all8') return SONGS.find((x) => x.id === 'maqamat').versions.every((v) => lessonOk({ song: 'maqamat', ver: v.id }, 'time'));
    return false;
  }
  function tick(s, on = true) { const t = ticks(); if (on) t[s.id] = Date.now(); else delete t[s.id]; store.set('path.ticks', t); }
  function open(s) {
    if (s.kind === 'tune') go('#/tuner');
    else if (s.kind === 'pace') {
      const tried = store.get('pace.hist', []).some((h) => h.pattern === s.pat);
      openPace({ pat: s.pat, scale: !!s.scale, mode: tried ? 'time' : 'watch', bpm: Math.min(s.bpm, Math.max(60, store.get('pace.bpm', 60))) });
    } else if (s.kind === 'lesson') openLesson(s.song, s.ver, s.need);
    else if (s.kind === 'all8') openLesson('maqamat', null, 'time');
  }
  const required = (st) => st.steps.filter((s) => !s.optional);
  const stageDone = (k) => required(STAGES[k]).every(done);
  function nextStep(k = cur()) { return STAGES[k].steps.find((s) => !done(s) && !s.optional) || STAGES[k].steps.find((s) => !done(s)); }
  // for Daily practice: the first unfinished step of a kind in the current stage (or the last stage that has one)
  function today(kind) {
    for (let k = cur(); k >= 0; k--) {
      const s = STAGES[k].steps.find((x) => !done(x) && (kind === 'pace' ? x.kind === 'pace'
        : kind === 'exercise' ? x.kind === 'lesson' && (x.song === 'maqamat' || x.song === 'warmups') : x.kind === 'lesson' && x.song !== 'maqamat' && x.song !== 'warmups'));
      if (s) return { step: s, go: () => open(s) };
    }
    return null;
  }

  function renderCard() {
    const k = cur(), st = STAGES[k], n = nextStep(k);
    $('#goPath').innerHTML = `<span><small>Your path · stage ${k + 1} of ${STAGES.length} · ${st.time}</small><b>${ar(st.title)}</b>` +
      `<small>${n ? `Next: ${ar(n.t)}` : 'Stage done: move on when you’re ready'}</small></span><span class="go">›</span>`;
  }
  const ar = (s) => s.replace(/([؀-ۿ][؀-ۿ\s]*[؀-ۿ]|[؀-ۿ])/g, '<bdi class="ar">$1</bdi>');

  function render() {
    const k = cur(); if (view == null) view = k;
    const st = STAGES[view];
    const dots = $('#pathDots'); dots.innerHTML = '';
    STAGES.forEach((x, i) => {
      const b = el('button', 'pdotb' + (i === view ? ' on' : '') + (i === k ? ' cur' : '') + (stageDone(i) ? ' done' : ''), stageDone(i) ? '✓' : String(i + 1));
      b.type = 'button'; b.setAttribute('aria-label', `Stage ${i + 1}`);
      b.addEventListener('click', () => { view = i; render(); });
      dots.append(b);
    });
    const body = $('#pathBody'); body.innerHTML = '';
    body.append(el('div', 'ps-head', `<small>Stage ${view + 1} of ${STAGES.length} · ${st.time}${view === k ? ' · you are here' : ''}</small>` +
      `<h2>${ar(st.title)}</h2><p class="ps-why">${ar(st.why)}</p>`));
    const list = el('div', 'ps-steps');
    st.steps.forEach((s, i) => {
      const ok = done(s);
      const row = el('div', 'ps-step' + (ok ? ' ok' : '') + (s.optional ? ' opt' : ''));
      const mark = el('button', 'ps-mark', ok ? '✓' : String(i + 1)); mark.type = 'button';
      mark.setAttribute('aria-label', ok ? 'Done (tap to undo a manual tick)' : 'Tick as done');
      // a tap on the number ticks the step by hand (for things the mic can't check); tap again to undo a hand tick
      mark.addEventListener('click', () => { const t = ticks(); if (t[s.id]) tick(s, false); else if (!ok) tick(s); render(); renderCard(); });
      const main = el('button', 'ps-main', `<b>${ar(s.t)}</b>${s.d ? `<small>${ar(s.d)}</small>` : ''}${s.optional ? '<small class="ps-optional">optional</small>' : ''}`);
      main.type = 'button';
      row.append(mark, main);
      // a short sourced guide for this step (js/howto.js)
      const hk = howto && howto(s.id);
      if (hk && hk.length) { const h = el('button', 'ps-how', 'How'); h.type = 'button'; h.setAttribute('aria-label', 'How to do this'); h.addEventListener('click', () => openHowto(hk)); row.append(h); }
      if (s.kind === 'read') {
        const tips = el('div', 'ps-tips', `<ul>${s.tips.map((x) => `<li>${ar(x)}</li>`).join('')}</ul>`); tips.hidden = !(!ok && view === k);
        const got = el('button', 'btn second', 'Got it ✓'); got.type = 'button';
        got.addEventListener('click', () => { tick(s); render(); renderCard(); });
        if (!ok) tips.append(got);
        main.addEventListener('click', () => { tips.hidden = !tips.hidden; });
        list.append(row, tips);
      } else {
        if (s.kind === 'manual') main.addEventListener('click', () => toast('Tap the number on the left when you have done it.'));
        else { main.insertAdjacentHTML('beforeend', '<i class="ps-go">›</i>'); main.addEventListener('click', () => open(s)); }
        list.append(row);
      }
    });
    body.append(list);
    body.append(el('div', 'ps-watch', `<b>Watch for</b><ul>${st.watch.map((x) => `<li>${ar(x)}</li>`).join('')}</ul>`));
    body.append(el('p', 'ps-next', `<b>Move on when:</b> ${ar(st.next)}`));
    const act = el('div', 'path-actions');
    if (view === k && k < STAGES.length - 1) {
      const all = stageDone(k);
      const b = el('button', 'btn ' + (all ? 'primary huge' : 'second'), all ? `Go to stage ${k + 2} ›` : `Move to stage ${k + 2} anyway`); b.type = 'button';
      b.addEventListener('click', () => {
        if (!all && !confirm('Teachers say: don’t rush the basics. Move on anyway?')) return;
        store.set('path.stage', k + 1); view = k + 1; render(); renderCard(); window.scrollTo(0, 0);
      });
      act.append(b);
    } else if (view !== k) {
      const b = el('button', 'btn second', view < k ? `Back to stage ${k + 1} (you are here)` : `Make this my stage`); b.type = 'button';
      b.addEventListener('click', () => { if (view > k) store.set('path.stage', view); view = null; render(); renderCard(); window.scrollTo(0, 0); });
      act.append(b);
    }
    body.append(act);
  }
  return { render: () => { view = null; render(); }, renderCard, today, stage: cur, STAGES };
}
