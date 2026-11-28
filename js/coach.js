// Coaching tools beyond the lesson (owner, 2026-11-27: "apply them ... make them perfect execution"; research in
// docs/memory/teaching-and-ui/oud-teaching.md): Call and response (learn by ear, with live "close / higher / the shape is right"
// feedback), Drone (a soft home note), Your hard notes (a drill from the notes he misses), Taqsim playground
// (improvise in a maqam, the neck shows what is inside it), Tremolo meter (picks per second and evenness).
// The lesson's note judging is not touched: these screens read the same Listener.
export function createCoach(d) {
  const { $, $$, el, store, listener, audioCtx, playNote, stopAll, nameOf, NOTES, SONGS, buildPass, useSong,
    neckSVG, neckX, neckY, NECK, go, toast, ctx, setSong } = d;
  const SOLFA = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };
  const pcOf = (m) => ((m % 12) + 12) % 12;
  const pcDist = (a, b) => { const x = pcOf(a - b); return Math.min(x, 12 - x); };
  const arName = (m) => nameOf(m).ar;
  // the home note (tonic) of a song or scale: "… on Sol" in its maqam, or the first note of a scale
  function tonicPc(song, version) {
    const m = /\bon (Do|Re|Mi|Fa|Sol|La|Si)\b/i.exec(song && !song.exercise ? song.maqam || '' : '');
    if (m) return SOLFA[m[1].toLowerCase()];
    const ns = version && version.passes ? buildPass(version.passes[0], true).notes : [];
    return ns.length ? pcOf(Math.round(ns[0].midi * 2) / 2) : null;
  }

  // ------------------------------------------------------------------ DRONE
  // A soft, warm home note an octave or so below the melody (one sawtooth through a low-pass, plus a sine an octave
  // lower), fading in. Off by default; best with headphones so the mic hears the oud, not the drone.
  // Tested with the drone mixed into fake-mic takes (tools/lab/coach_test.cjs): two slightly detuned saws (the first
  // version) swell against each other and the mic heard each swell as a pick; the fade-in from silence did too. So: one
  // saw, and notes during the fade-in, or at the drone's own pitch with no real jump in level, are ignored (fake()).
  const DRONE_FADE = 1.2;
  const drone = {
    nodes: null,
    start(pc) {
      this.stop(true);
      if (pc == null) return;
      const ac = audioCtx(); ac.resume();
      const m = 43 + pcOf(pc - 43), f = 440 * 2 ** ((m - 69) / 12), t = ac.currentTime;
      const out = ac.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(0.05, t + DRONE_FADE);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
      const oscs = [['sawtooth', f, 0.8], ['sine', f / 2, 0.9]].map(([type, freq, g]) => {
        const o = ac.createOscillator(); o.type = type; o.frequency.value = freq;
        const gg = ac.createGain(); gg.gain.value = g; o.connect(gg).connect(lp); o.start(t); return o;
      });
      lp.connect(out).connect(ac.destination);
      this.nodes = { oscs, out, pc, m, settle: t + DRONE_FADE + 0.4 };
    },
    // true for a "note" that is the drone itself, heard through the phone's own speaker
    fake(n, wantMidi = null) {
      const d = this.nodes; if (!d || !n) return false;
      if (n.t < d.settle) return true;
      if (n.legato) return true;
      if (!n.weak && n.lvl != null && n.lvl < 2.2 && (n.strength || 0) < 6) return true;
      if (wantMidi != null && [0, 12].some((o) => Math.abs(n.midi + o - wantMidi) < 0.7) && n.lvl != null && n.lvl > 1.8 && (n.rise || 0) > 15) return false;
      const near = [d.m, d.m - 12].some((x) => Math.abs(n.midi - x) < 0.85);
      return near && n.lvl != null && (n.lvl < 3.5 || (n.lvl < 6 && (n.strength || 0) < 10));
    },
    stop(now) {
      if (!this.nodes) return;
      const ac = audioCtx(), t = ac.currentTime, { oscs, out } = this.nodes;
      out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + (now ? 0.04 : 0.4));
      oscs.forEach((o) => o.stop(t + (now ? 0.05 : 0.45)));
      this.nodes = null;
    },
    playing() { return !!this.nodes; },
  };
  // a "Drone" switch button: stores its setting under key, starts/stops the drone for pc()
  function droneSwitch(btn, key, pc, dflt = false) {
    const on = () => store.get(key, dflt);
    const draw = () => { btn.classList.toggle('on', on()); btn.setAttribute('aria-pressed', String(on())); btn.textContent = `Drone: ${on() ? 'on' : 'off'}`; };
    btn.onclick = () => { store.set(key, !on()); draw(); if (on()) { drone.start(pc()); if (!store.get('drone.tip')) { store.set('drone.tip', 1); toast('Drone on: best with headphones, so the mic hears your oud.', 4000); } } else drone.stop(); };
    draw();
    return { on, draw };
  }

  // ------------------------------------------------------------------ YOUR HARD NOTES
  // Every Check my take adds to per-note counts (in tune / a bit off / wrong). The hardest notes (wrong counts double,
  // good results pull a note back down) become a drill: each hard note between the notes that come before and after it
  // in the songs, so it is practised the way it is played. Opens as a Slowly lesson.
  const hard = {
    record(review) {
      if (!review || !review.ev) return;
      const s = store.get('notestats', {});
      for (const e of review.ev) {
        const k = e.n && e.n.key; if (!k || !NOTES[k]) continue;
        const r = s[k] || (s[k] = { ok: 0, off: 0, wrong: 0 });
        r[e.status === 'ok' ? 'ok' : e.status === 'off' ? 'off' : 'wrong']++; r.at = Date.now();
      }
      store.set('notestats', s);
    },
    score(k) {
      const r = store.get('notestats', {})[k] || { ok: 0, off: 0, wrong: 0 }, w = store.get('weak', {})[k] || 0;
      return (2 * r.wrong + r.off + 0.5 * w) / (1 + 0.5 * r.ok);
    },
    list() {
      const keys = new Set([...Object.keys(store.get('notestats', {})), ...Object.keys(store.get('weak', {}))]);
      return [...keys].filter((k) => NOTES[k] && this.score(k) >= 1).sort((a, b) => this.score(b) - this.score(a)).slice(0, 4);
    },
    neighbours(k) {
      const prev = {}, next = {};
      for (const s of SONGS) {
        if (s.id === 'hardnotes') continue;
        for (const v of s.versions) {
          if (!v.passes || !v.passes[0]) continue;
          const ns = buildPass(v.passes[0], true).notes.filter((n) => !n.grace);
          ns.forEach((n, i) => {
            if (n.key !== k) return;
            const a = ns[i - 1], b = ns[i + 1];
            if (a && a.key !== k) prev[a.key] = (prev[a.key] || 0) + 1;
            if (b && b.key !== k) next[b.key] = (next[b.key] || 0) + 1;
          });
        }
      }
      const top = (o) => Object.keys(o).sort((x, y) => o[y] - o[x]);
      return { prev: top(prev), next: top(next) };
    },
    build() {
      const keys = this.list(); if (!keys.length) return null;
      const lines = keys.map((k) => {
        const { prev, next } = this.neighbours(k);
        const a = prev[0] || next[0] || k, b = next[0] || prev[1] || a;
        return [a, k, b, k, a, `${k}:2`];
      });
      return useSong({ id: 'hardnotes', title: 'نوتاتك الصعبة', titleEn: 'Your hard notes', artist: '', part: 'Drill', maqam: '', exercise: true,
        versions: [{ id: 'hard', name: 'Your hard notes', paced: true, about: 'Each hard note between the notes around it in your songs.', lines }] });
    },
    open() {
      const s = this.build();
      if (!s) { toast('No hard notes yet: play a few lines and Check my take will find them.', 4000); return; }
      setSong(s); go('#/lesson/all/slow');
    },
    label() { const l = this.list(); return l.length ? l.map((k) => NOTES[k].ar).join(' · ') : 'Play a few lines first'; },
  };

  // ------------------------------------------------------------------ CALL AND RESPONSE
  // The app plays a short phrase (the real player when his recording is loaded, otherwise the app's oud); the player
  // answers by ear. Each note he plays gets live feedback on a row of beads: ✓ (right), "close, a bit higher/lower"
  // (within 1.6 half steps: he can correct it), "right note, other octave", or "higher ↑ / lower ↓" when far. At the
  // end: "You got it", "So close", "You've got the shape" (the ups and downs match), or "Listen again". After 3 tries the
  // notes are shown as a hint. Notes heard while the phrase plays (the phone's own speaker) are ignored.
  const echo = {
    state: 'idle', k: 0, j: 0, tries: 0, reveal: false, marks: [], played: [], phrases: [], quietUntil: 0, timers: [], gen: 0,
    buildPhrases() {
      const { pass } = ctx();
      const ns = pass.notes.filter((n) => !n.grace && !n.rep);
      const out = []; let cur = [];
      ns.forEach((n, i) => {
        const prev = ns[i - 1];
        if (cur.length && (cur.length >= 4 || n.line !== prev.line || n.t - (prev.t + Math.min(prev.dur, 1)) > 0.55)) { out.push(cur); cur = []; }
        cur.push(n);
      });
      if (cur.length) out.push(cur);
      // a one-note phrase joins the one before (one note is not a phrase)
      for (let i = out.length - 1; i > 0; i--) if (out[i].length === 1 && out[i - 1].length < 5) { out[i - 1].push(...out[i]); out.splice(i, 1); }
      return out;
    },
    later(fn, ms) { const g = this.gen; this.timers.push(setTimeout(() => { if (g === this.gen) fn(); }, ms)); },
    clear() { this.timers.forEach(clearTimeout); this.timers = []; },
    render() {
      const { song } = ctx();
      this.phrases = this.buildPhrases();
      this.k = Math.min(store.get('echo.k.' + song.id, 0), Math.max(0, this.phrases.length - 1));
      $('#ecSong').innerHTML = `<bdi class="ar">${song.title}</bdi>`;
      this.sw = droneSwitch($('#ecDrone'), 'drone.echo', () => tonicPc(ctx().song, ctx().version));
      this.reset(); this.draw('Tap Start, listen, then play it back by ear.', '');
      this.controls();
    },
    reset() { this.j = 0; this.marks = []; this.played = []; this.lastNear = []; this.tries = 0; this.reveal = false; },
    P() { return this.phrases[this.k] || []; },
    draw(msg, cls) {
      const P = this.P();
      $('#ecCount').textContent = this.phrases.length ? `Phrase ${this.k + 1} of ${this.phrases.length}` : 'No phrases';
      const box = $('#ecBeads'); box.innerHTML = '';
      P.forEach((n, i) => {
        const m = this.marks[i] || '';
        const show = m === 'ok' || this.reveal;
        box.append(el('span', `ec-bead ${m}${i === this.j && this.state === 'respond' ? ' now' : ''}`, show ? `<bdi class="ar">${n.ar}</bdi>` : '?'));
      });
      if (msg != null) { const f = $('#ecMsg'); f.textContent = msg; f.className = 'ec-msg ' + (cls || ''); }
      $('#ecState').textContent = this.state === 'call' ? 'Listen…' : this.state === 'respond' ? 'Your turn' : '';
      $('#ecState').className = 'ec-state ' + this.state;
      const want = P[this.j];
      $('#ecNeck').hidden = !(this.reveal && want);
      if (this.reveal && want) $('#ecNeck').innerHTML = neckSVG(want);
    },
    controls() {
      const go1 = $('#ecGo');
      go1.textContent = this.state === 'idle' ? 'Start' : 'Stop';
      go1.onclick = () => (this.state === 'idle' ? this.start() : this.stop(true));
      $('#ecAgain').onclick = () => { if (this.state !== 'idle') this.call(); };
      $('#ecSkip').onclick = () => { if (this.state !== 'idle') this.next(); else { this.k = (this.k + 1) % Math.max(1, this.phrases.length); this.reset(); this.draw('', ''); } };
    },
    async start() {
      if (!this.phrases.length) return;
      const g = ++this.gen;
      try { await ctx().real.load(); } catch (_) {}   // his own recording of this version, if he loaded one (else the app's oud)
      try { if (!(await listener.start()) || g !== this.gen) return; }
      catch (_) { toast('Microphone blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.', 4000); return; }
      listener.onFrame = null; listener.onWeak = null;
      listener.onNote = (n) => this.heard(n);
      if (this.sw && this.sw.on()) drone.start(tonicPc(ctx().song, ctx().version));
      this.state = 'call'; this.controls(); this.call();
    },
    stop(byUser) {
      this.gen++; this.clear();
      if (this.state !== 'idle') { listener.onNote = null; listener.stop(); }
      this.state = 'idle'; stopAll(); try { ctx().real.stop(); } catch (_) {}
      if (byUser) { this.draw('Stopped. Tap Start to go on from this phrase.', ''); this.controls(); }
    },
    call() {
      this.clear(); stopAll();
      const P = this.P(); if (!P.length) return;
      this.state = 'call'; this.j = 0; this.played = []; this.marks = []; this.lastNear = [];
      this.draw('', ''); this.controls();
      const ac = audioCtx(); ac.resume();
      const { real } = ctx(), base = P[0].t, last = P[P.length - 1];
      const dur = last.t - base + Math.min(1.1, last.dur || 0.6);
      const done = () => { if (this.state !== 'call') return; this.state = 'respond'; this.quietUntil = audioCtx().currentTime + 0.45; this.draw('Play it back.', ''); this.later(() => this.judge(true), 9000); };
      if (real && real.loaded) {
        real.playNotes(P, 1, done);
        this.later(done, (dur + 1.2) * 1000);          // safety: if the video never reports its end
      } else {
        const t0 = ac.currentTime + 0.15;
        P.forEach((n) => playNote(n.midi, t0 + (n.t - base), Math.min(1.4, Math.max(0.35, n.dur))));
        this.later(done, (dur + 0.35) * 1000);
      }
    },
    mark(i, m) { if (i >= 0) this.marks[i] = m; },
    heard(n) {
      const P = this.P();
      if (this.state !== 'respond' || n.legato || n.t < this.quietUntil || drone.fake(n, P[this.j] ? P[this.j].midi : null)) return;
      if (this.j >= P.length) return;
      this.played.push(n.midi);
      const p = this.played.length - 1, nx = P[this.j + 1];
      // he moved on: this note is nearer the next note of the phrase than the one he was on (after trying it, or it
      // is exactly the next note: he skipped one). A note he tries again stays on the same bead, so he can correct it.
      if (nx && Math.abs(n.midi - nx.midi) < Math.abs(n.midi - P[this.j].midi) && (this.marks[this.j] || Math.abs(n.midi - nx.midi) <= 0.5)) {
        if (!this.marks[this.j]) this.mark(this.j, 'miss');
        this.j++;
      }
      const want = P[this.j], d = n.midi - want.midi, oct = d - 12 * Math.round(d / 12);
      let msg, cls;
      if (Math.abs(d) <= 0.5) { this.mark(this.j, 'ok'); this.j++; msg = 'Yes!'; cls = 'ok'; }
      else if (Math.abs(oct) <= 0.5) { this.mark(this.j, 'oct'); this.j++; msg = 'Right note, other octave'; cls = 'close'; }
      else if (Math.abs(d) <= 1.6) { this.mark(this.j, 'close'); (this.lastNear = this.lastNear || [])[this.j] = n.midi; msg = `Close: a bit ${d < 0 ? 'higher' : 'lower'}`; cls = 'close'; }
      else {
        // far, but the step from his last note is the phrase's step: he has the tune, just started from another note
        const step = p >= 1 && p < P.length && Math.abs(P[p].midi - P[p - 1].midi) > 0.4 ? (n.midi - this.played[p - 1]) - (P[p].midi - P[p - 1].midi) : null;
        if (step != null && Math.abs(step) <= 0.6) { msg = `Right shape ✓ Start it ${n.midi < P[p].midi ? 'higher' : 'lower'}`; cls = 'close'; }
        else { msg = d < 0 ? 'Higher ↑' : 'Lower ↓'; cls = 'far'; }
        if (!this.marks[this.j]) this.mark(this.j, 'miss');
      }
      this.draw(msg, cls);
      this.clear();
      if (this.j >= P.length) this.later(() => this.judge(), 350);
      else this.later(() => this.judge(), 2800);          // a pause: he has played what he heard
    },
    // how many of the phrase's ups and downs he matched (the shape of the melody)
    shape() {
      const P = this.P().map((n) => n.midi), Q = this.played, dir = (a, b) => (b - a > 0.4 ? 1 : b - a < -0.4 ? -1 : 0);
      const steps = Math.min(P.length, Q.length) - 1; if (steps < 1) return 0;
      let ok = 0; for (let i = 0; i < steps; i++) if (dir(P[i], P[i + 1]) === dir(Q[i], Q[i + 1])) ok++;
      return ok / (P.length - 1);
    },
    judge(timeout) {
      if (this.state !== 'respond') return;
      const P = this.P(), m = P.map((_, i) => this.marks[i] || '');
      const ok = m.filter((x) => x === 'ok').length, near = m.filter((x) => x === 'close' || x === 'oct').length;
      if (timeout && !this.played.length) { this.draw('Your turn: play what you heard.', ''); this.later(() => this.call(), 1500); return; }
      this.tries++;
      if (ok === P.length) {
        store.set('echo.k.' + ctx().song.id, Math.min(this.k + 1, this.phrases.length - 1));
        this.state = 'call'; this.draw('You got it! ✓', 'win');
        this.later(() => this.next(), 1700); return;
      }
      let msg, cls = 'close';
      const firstClose = m.findIndex((x) => x === 'close'), fc = P[firstClose];
      if (ok + near === P.length) msg = fc ? `So close! The ${this.reveal ? fc.ar + ' ' : ''}${ordinal(firstClose + 1)} note, a bit ${this.closeDir(firstClose)}.` : 'So close! Right notes, one in another octave.';
      else if (this.shape() >= 0.7 && this.played.length >= 2) msg = 'You’ve got the shape. Now the exact notes.';
      else if (ok >= Math.ceil(P.length / 2)) msg = `${ok} of ${P.length}. Almost there.`;
      else { msg = 'Listen again.'; cls = ''; }
      if (this.tries >= 3 && !this.reveal) { this.reveal = true; msg += ' Here are the notes.'; }
      this.state = 'call'; this.draw(msg, cls);
      this.later(() => this.call(), 2200);
    },
    closeDir(i) { const P = this.P(); const q = this.lastNear && this.lastNear[i]; return q == null ? 'off' : q < P[i].midi ? 'higher' : 'lower'; },
    next() {
      if (this.k + 1 >= this.phrases.length) { this.stop(); this.k = 0; store.set('echo.k.' + ctx().song.id, 0); this.reset(); this.draw('All phrases done! ✓ Play them again, or try another song.', 'win'); this.controls(); return; }
      this.k++; this.reset(); this.call();
    },
  };
  const ordinal = (n) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][n - 1] || `${n}th`;

  // ------------------------------------------------------------------ TAQSIM PLAYGROUND
  // Improvise in a maqam over the drone: every note played lights on the neck, green when it is inside the maqam
  // (within 35 cents of one of its notes, any octave), marked when outside. A phrase that rests on the home note after a
  // pause is noticed, the way a taqsim phrase comes home.
  const taqsim = {
    on: false, trail: [], lastT: 0, timer: 0, gen: 0,
    maq() { return SONGS.find((x) => x.id === 'maqamat'); },
    ver() { const m = this.maq(); return m.versions.find((v) => v.id === store.get('taqsim.maqam', 'bayati')) || m.versions[0]; },
    scale() { return buildPass(this.ver().passes[0], true).notes.filter((n) => n.string); },
    render() {
      const chips = $('#tqMaqams'); chips.innerHTML = '';
      this.maq().versions.forEach((v) => {
        const b = el('button', 'vchip' + (v === this.ver() ? ' on' : ''), v.name); b.type = 'button';
        b.addEventListener('click', () => { store.set('taqsim.maqam', v.id); if (drone.playing()) drone.start(this.tonic()); this.trail = []; this.render(); });
        chips.append(b);
      });
      this.sw = droneSwitch($('#tqDrone'), 'drone.taqsim', () => this.tonic(), true);
      this.neck(null); this.drawTrail(); this.say(this.on ? 'Play freely. Green = inside the maqam.' : 'Tap Start and improvise. Green = inside the maqam.', '');
      $('#tqGo').textContent = this.on ? 'Stop' : 'Start';
      $('#tqGo').onclick = () => (this.on ? this.stop(true) : this.start());
    },
    tonic() { return tonicPc(this.maq(), this.ver()); },
    neck(hit) {
      const sc = this.scale(), tp = this.tonic(), seen = new Set();
      let dots = '';
      for (const n of sc) {
        const key = n.string + ':' + n.midi; if (seen.has(key)) continue; seen.add(key);
        const x = n.finger ? neckX(n.midi, n.string) : NECK.nut + 16, y = neckY(n.string), home = tp != null && pcDist(n.midi, tp) < 0.3;
        const lit = hit && hit.key === key;
        dots += `<circle class="${lit ? (hit.in ? 'tq-hit' : 'tq-out') : home ? 'mhome' : 'mnote'}" cx="${x.toFixed(1)}" cy="${y}" r="${lit ? 11 : home ? 8 : 6}"/>`;
      }
      $('#tqNeck').innerHTML = neckSVG(null).replace('</svg>', dots + '</svg>');
    },
    say(msg, cls) { const m = $('#tqMsg'); m.textContent = msg; m.className = 'ec-msg ' + (cls || ''); },
    drawTrail() {
      const box = $('#tqTrail'); box.innerHTML = '';
      this.trail.slice(-12).forEach((t) => box.append(el('span', 'ec-bead ' + (t.in ? 'ok' : 'out'), `<bdi class="ar">${t.ar}</bdi>`)));
      const n = this.trail.length, inn = this.trail.filter((t) => t.in).length;
      $('#tqStats').textContent = n ? `${n} notes · ${Math.round((100 * inn) / n)}% inside the maqam` : '';
    },
    async start() {
      const g = ++this.gen;
      try { if (!(await listener.start()) || g !== this.gen) return; }
      catch (_) { toast('Microphone blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.', 4000); return; }
      listener.onFrame = null; listener.onWeak = null;
      listener.onNote = (n) => this.heard(n);
      this.on = true; this.trail = [];
      if (this.sw.on()) drone.start(this.tonic());
      this.render();
    },
    stop(byUser) {
      this.gen++; clearTimeout(this.timer);
      if (this.on) { listener.onNote = null; listener.stop(); }
      this.on = false; drone.stop();
      if (byUser) this.render();
    },
    heard(n) {
      if (!this.on || n.legato || drone.fake(n)) return;
      const sc = this.scale(), tp = this.tonic();
      let best = null, bd = 9;
      for (const s of sc) { const dd = pcDist(n.midi, s.midi); if (dd < bd) { bd = dd; best = s; } }
      const inside = bd <= 0.35;
      // light the scale note of that pitch nearest in height, so it shows on its string
      let hit = null;
      if (inside) { let near = null, nd = 99; for (const s of sc) if (pcDist(n.midi, s.midi) <= 0.35 && Math.abs(n.midi - s.midi) < nd) { nd = Math.abs(n.midi - s.midi); near = s; } if (near) hit = { key: near.string + ':' + near.midi, in: true }; }
      this.neck(hit);
      this.trail.push({ ar: inside && best ? best.ar : arName(n.midi), in: inside, pc: pcOf(n.midi) });
      this.drawTrail();
      this.say(inside ? 'Inside the maqam ✓' : 'Outside the maqam', inside ? 'ok' : 'far');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (!this.on || this.trail.length < 3) return;
        const last = this.trail[this.trail.length - 1];
        if (tp != null && pcDist(last.pc, tp) < 0.3) this.say('Your phrase came home to the home note ✓ That is how a taqsim phrase rests.', 'win');
        else this.say(`Try ending the phrase on the home note (${arName(43 + pcOf(tp - 43))}).`, 'close');
      }, 1700);
    },
  };

  // ------------------------------------------------------------------ TREMOLO METER
  // Counts the picks the detector hears (raw onsets, up to about 14 a second) on the chosen string: picks per second
  // over the last 2 seconds and how even they are (100% = every gap the same). Goals rise from 4 to 10 a second.
  const GOALS = [4, 6, 8, 10];
  const tremolo = {
    on: false, times: [], best: 0, gen: 0, raf: 0,
    render() {
      const box = $('#trGoals'); box.innerHTML = '';
      const goal = store.get('trem.goal', 4);
      GOALS.forEach((g) => { const b = el('button', 'vchip' + (g === goal ? ' on' : ''), `${g} a second`); b.type = 'button'; b.onclick = () => { store.set('trem.goal', g); this.render(); }; box.append(b); });
      $('#trGo').textContent = this.on ? 'Stop' : 'Start';
      $('#trGo').onclick = () => (this.on ? this.stop(true) : this.start());
      this.draw();
    },
    async start() {
      const g = ++this.gen;
      try { if (!(await listener.start()) || g !== this.gen) return; }
      catch (_) { toast('Microphone blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.', 4000); return; }
      listener.onNote = null; listener.onFrame = null; listener.onWeak = null;
      listener.onOnset = (m) => { if (m.db > -62) { this.times.push(m.t); this.flash(); } };
      this.on = true; this.times = []; this.best = 0;
      const loop = () => { if (!this.on) return; this.draw(); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
      this.render();
    },
    stop(byUser) {
      this.gen++; cancelAnimationFrame(this.raf);
      if (this.on) { listener.onOnset = null; listener.stop(); }
      this.on = false;
      if (byUser) this.render();
    },
    flash() { const p = $('#trPulse'); p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit'); },
    stats() {
      const now = audioCtx().currentTime, ts = this.times.filter((t) => t > now - 2);
      this.times = this.times.filter((t) => t > now - 4);
      if (ts.length < 4 || now - ts[ts.length - 1] > 0.6) return null;
      const gaps = ts.slice(1).map((t, i) => t - ts[i]), mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
      return { rate: 1 / mean, even: Math.max(0, Math.round(100 * (1 - Math.min(1, sd / mean / 0.5)))) };
    },
    draw() {
      const s = this.on ? this.stats() : null, goal = store.get('trem.goal', 4);
      if (s && s.rate > this.best && s.even >= 50) this.best = s.rate;
      $('#trRate').textContent = s ? s.rate.toFixed(1) : '—';
      $('#trEven').style.width = `${s ? s.even : 0}%`;
      $('#trEvenTxt').textContent = s ? `${s.even}% even` : this.on ? 'Play tremolo on one string…' : 'Tap Start, then tremolo on one string.';
      $('#trBest').textContent = this.best ? `Best: ${this.best.toFixed(1)} a second` : '';
      const tip = $('#trTip');
      if (!s) tip.textContent = '';
      else if (s.rate >= goal && s.even >= 75) { tip.textContent = `Goal reached: ${goal} a second, even ✓`; tip.className = 'ec-msg win'; }
      else if (s.even < 60) { tip.textContent = 'Make down and up the same size: loose wrist, small strokes.'; tip.className = 'ec-msg close'; }
      else if (s.rate < goal) { tip.textContent = `Even ✓ Now a little faster, toward ${goal} a second.`; tip.className = 'ec-msg close'; }
      else { tip.textContent = 'Fast ✓ Now make it more even.'; tip.className = 'ec-msg close'; }
    },
  };

  // ------------------------------------------------------------------ WRITE WHAT I PLAY
  // (owner, 2026-11-28: "write what i play is good and more appealing to advanced users"). He plays freely; every note
  // heard is written as a chip (Arabic name, string·finger, and how many cents off), the neck shows the last one. He can
  // play it back with its own rhythm, copy it as text (to share or keep a transcription), or save it as his own
  // exercise ("My phrases", practised like any song: Slowly, In time, By ear). Notes are read by the same Listener.
  const KEYS = Object.keys(NOTES);
  const keyFor = (midi) => { let best = null, bd = 9; for (const k of KEYS) { const dd = Math.abs(NOTES[k].midi - midi); if (dd < bd) { bd = dd; best = k; } } return bd <= 0.6 ? best : null; };
  const write = {
    on: false, notes: [], gen: 0,
    // a new line after a pause over 1.2 s or after 8 notes; pauses longer than 1.5 s are kept as 1.5 s
    phrase() {
      const out = []; let t = 0, line = 1, inLine = 0;
      this.notes.forEach((n, i) => {
        if (!n.key) return;
        const gap = i ? n.t - this.notes[i - 1].t : 0;
        if (out.length && (gap > 1.2 || inLine >= 8)) { line++; inLine = 0; }
        t += out.length ? Math.min(1.5, gap) : 0; inLine++;
        out.push([+t.toFixed(3), n.key, line]);
      });
      return out;
    },
    render() {
      $('#wrGo').textContent = this.on ? 'Stop' : this.notes.length ? 'Start again' : 'Start';
      $('#wrGo').onclick = () => (this.on ? this.stop(true) : this.start());
      $('#wrPlay').onclick = () => this.play();
      $('#wrCopy').onclick = () => this.copy();
      $('#wrSave').onclick = () => this.save();
      this.draw(); this.drawSaved();
    },
    draw() {
      const row = $('#wrRow'); row.innerHTML = '';
      this.notes.forEach((n) => {
        const nm = n.key ? NOTES[n.key] : nameOf(n.midi), c = n.key ? Math.round((n.midi - NOTES[n.key].midi) * 100) : null;
        const where = n.key && NOTES[n.key].string ? `S${NOTES[n.key].string}·${NOTES[n.key].finger ? 'F' + NOTES[n.key].finger : 'open'}` : '';
        row.append(el('span', 'wr-chip' + (n.key ? '' : ' wr-odd'), `<bdi class="ar">${nm.ar}</bdi><small>${where}${c != null && Math.abs(c) >= 15 ? ` · ${c > 0 ? '+' : ''}${c}¢` : ''}</small>`));
      });
      row.scrollLeft = row.scrollWidth;
      const last = [...this.notes].reverse().find((n) => n.key);
      $('#wrNeck').innerHTML = neckSVG(last ? NOTES[last.key] : null);
      const has = this.notes.some((n) => n.key);
      ['#wrPlay', '#wrCopy', '#wrSave'].forEach((s) => { $(s).disabled = !has || this.on; });
      $('#wrMsg').textContent = this.on ? (this.notes.length ? `${this.notes.length} notes` : 'Play anything. Each note is written down.') : has ? `${this.phrase().length} notes written` : 'Tap Start and play.';
    },
    async start() {
      const g = ++this.gen;
      try { if (!(await listener.start()) || g !== this.gen) return; }
      catch (_) { toast('Microphone blocked. On iPhone: "aA" → Website Settings → Microphone → Allow.', 4000); return; }
      listener.onFrame = null; listener.onWeak = null;
      listener.onNote = (n) => this.heard(n);
      this.on = true; this.notes = []; this.render();
    },
    stop(byUser) {
      this.gen++;
      if (this.on) { listener.onNote = null; listener.stop(); }
      this.on = false; stopAll();
      if (byUser) this.render();
    },
    heard(n) {
      if (!this.on || n.legato || drone.fake(n)) return;
      this.notes.push({ t: n.t, midi: n.midi, key: keyFor(n.midi) });
      this.draw();
    },
    play() {
      const P = this.phrase(); if (!P.length) return;
      const ac = audioCtx(); ac.resume(); stopAll(); const t0 = ac.currentTime + 0.1;
      P.forEach(([t, k], i) => playNote(NOTES[k].midi, t0 + t, Math.min(1.2, Math.max(0.3, (P[i + 1] ? P[i + 1][0] : t + 0.8) - t + 0.2))));
    },
    async copy() {
      const lines = []; for (const [, k, l] of this.phrase()) (lines[l - 1] ||= []).push(NOTES[k].ar);
      const text = lines.map((l) => l.join(' ')).join('\n');
      try { await navigator.clipboard.writeText(text); toast('Copied: the notes as text, one line per phrase.'); }
      catch (_) { toast(text, 6000); }
    },
    save() {
      const notes = this.phrase(); if (!notes.length) return;
      const P = store.get('myPhrases', []), id = 'p' + Date.now().toString(36);
      P.push({ id, title: `Phrase ${P.length + 1}`, at: Date.now(), notes, end: +(notes[notes.length - 1][0] + 1.4).toFixed(3) });
      store.set('myPhrases', P); this.register();
      toast(`Saved as Phrase ${P.length}. Practise it below, or in Slowly and In time like a song.`, 4000);
      this.drawSaved();
    },
    // the saved phrases as one practice "song" with a version per phrase
    register() {
      const P = store.get('myPhrases', []); if (!P.length) return null;
      return useSong({ id: 'mine', title: 'جملي', titleEn: 'My phrases', artist: '', part: 'Written by you', maqam: '', exercise: true,
        versions: P.map((p) => ({ id: p.id, name: p.title, about: `${p.notes.length} notes you played, ${new Date(p.at).toLocaleDateString()}.`, paced: true,
          passes: [{ id: p.id, title: 'Whole phrase', end: p.end, notes: p.notes }] })) });
    },
    drawSaved() {
      const box = $('#wrSaved'); box.innerHTML = '';
      const P = store.get('myPhrases', []);
      $('#wrSavedLbl').hidden = !P.length;
      P.slice().reverse().forEach((p) => {
        const r = el('div', 'wr-saved');
        r.append(el('span', '', `<b>${p.title}</b><small> <bdi class="ar">${p.notes.slice(0, 6).map((n) => NOTES[n[1]].ar).join(' ')}${p.notes.length > 6 ? ' …' : ''}</bdi></small>`));
        const go1 = el('button', 'btn second', 'Practise'); go1.type = 'button';
        go1.onclick = () => { const s = this.register(); store.set('ver.mine', p.id); setSong(s); go('#/lesson/all/slow'); };
        const del = el('button', 'btn ghost', '✕'); del.type = 'button'; del.setAttribute('aria-label', `Delete ${p.title}`);
        del.onclick = () => { store.set('myPhrases', store.get('myPhrases', []).filter((x) => x.id !== p.id)); this.register(); this.drawSaved(); };
        r.append(go1, del); box.append(r);
      });
    },
  };
  write.register();

  function stop() { echo.stop(); taqsim.stop(); tremolo.stop(); write.stop(); drone.stop(true); }
  return { drone, droneSwitch, tonicPc, hard, echo, taqsim, tremolo, write, stop };
}
