// Compare a take with the reference: align notes, fit tempo, judge pitch and rhythm,
// and turn it into a few plain tips.
import { nameOf } from './notes.js';

// When strings ring together, pitch detection can land an octave (or an octave and a fifth)
// away from the real note. Those readings count as the right note, with tuning unknown.
export function octaveRelated(d, tol) {
  return [12, -12, -19.02, 24, -24].some((k) => Math.abs(d - k) < tol);
}
function pitchCost(p, r) {
  const d = p.midi - r.midi, ad = Math.abs(d);
  const tol = r.key === 'mi' ? 0.75 : 0.6;
  if (ad < tol) return 0;
  if (octaveRelated(d, tol)) return 0.15;
  if (ad < 1.6) return 0.9;                          // a half step off: close, but wrong
  return 1.6;
}

// Needleman–Wunsch over (played, reference). timeFn(p) gives the played note's time
// mapped onto reference time, or null to ignore timing.
function align(played, ref, timeFn) {
  const P = played.length, R = ref.length;
  const C = Array.from({ length: P + 1 }, () => new Float64Array(R + 1));
  const B = Array.from({ length: P + 1 }, () => new Uint8Array(R + 1));
  const skipRef = (r) => (r.grace ? 0.25 : r.rep || r.quick ? 0.5 : 1.0);
  const extra = (p) => (p.legato ? 0.35 : 0.8);
  for (let i = 1; i <= P; i++) { C[i][0] = C[i - 1][0] + extra(played[i - 1]); B[i][0] = 1; }
  for (let j = 1; j <= R; j++) { C[0][j] = C[0][j - 1] + skipRef(ref[j - 1]); B[0][j] = 2; }
  for (let i = 1; i <= P; i++) {
    for (let j = 1; j <= R; j++) {
      const p = played[i - 1], r = ref[j - 1];
      let m = pitchCost(p, r);
      if (timeFn) { const tp = timeFn(p); if (tp != null) m += Math.min(1.2, Math.abs(tp - r.t) / 0.45); }
      const a = C[i - 1][j - 1] + m, b = C[i - 1][j] + extra(p), c = C[i][j - 1] + skipRef(r);
      if (a <= b && a <= c) { C[i][j] = a; B[i][j] = 0; }
      else if (b <= c) { C[i][j] = b; B[i][j] = 1; }
      else { C[i][j] = c; B[i][j] = 2; }
    }
  }
  const pairs = [], extras = [];
  let i = P, j = R;
  while (i > 0 || j > 0) {
    const k = B[i][j];
    if (i > 0 && j > 0 && k === 0) { pairs.push([i - 1, j - 1]); i--; j--; }
    else if (i > 0 && (j === 0 || k === 1)) { extras.push(i - 1); i--; }
    else { pairs.push([null, j - 1]); j--; }
  }
  return { pairs: pairs.reverse(), extras: extras.reverse() };
}

// robust line fit: played time = a + b * reference time (Theil–Sen)
function fitTempo(pts) {
  if (pts.length < 2) return pts.length ? { a: pts[0][1] - pts[0][0], b: 1 } : { a: 0, b: 1 };
  const slopes = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const dx = pts[j][0] - pts[i][0]; if (dx > 0.2) slopes.push((pts[j][1] - pts[i][1]) / dx);
  }
  slopes.sort((x, y) => x - y);
  const b = slopes.length ? slopes[slopes.length >> 1] : 1;
  const ints = pts.map(([x, y]) => y - b * x).sort((x, y) => x - y);
  return { a: ints[ints.length >> 1], b };
}

/**
 * @param played  [{t, midi, legato}]
 * @param ref     reference notes of the section being practised (pass.notes slice)
 * @param opts    {mode:'free'|'along', start, speed}
 */
export function analyzeTake(played, ref, opts = {}) {
  const r0 = ref[0].t;
  const refN = ref.map((n) => ({ ...n, t: n.t - r0 }));
  let map;                       // played time -> reference time
  let tempo = 1;
  if (opts.mode === 'along') {
    const speed = opts.speed || 1;
    map = (p) => (p.t - opts.start) * speed;
    tempo = speed;
  } else {
    const first = align(played, refN, null);
    const pts = first.pairs.filter(([p, r]) => p != null && pitchCost(played[p], refN[r]) < 1 && !refN[r].grace)
      .map(([p, r]) => [refN[r].t, played[p].t]);
    const fit = fitTempo(pts);
    map = (p) => (p.t - fit.a) / (fit.b || 1);
    tempo = fit.b ? 1 / fit.b : 1;           // >1 means faster than the real player
  }
  const { pairs, extras: rawExtras } = align(played, refN, map);
  // Picking a long note again while it rings is normal oud playing, not a mistake:
  // an extra note with the same pitch as the note just before it is a re-pick.
  const extras = rawExtras.filter((i) => !(i > 0 && Math.abs(played[i].midi - played[i - 1].midi) < 0.6));

  const items = refN.map((r) => ({ ref: r, status: 'missed', played: null, cents: null, dt: null }));
  for (const [p, r] of pairs) {
    if (p == null) continue;
    const pn = played[p], it = items[r];
    const c = pitchCost(pn, refN[r]);
    it.played = pn;
    it.dt = map(pn) - refN[r].t;                     // seconds, in reference time
    if (c === 0) {
      it.status = 'ok';
      // only judge tuning when the pitch held steady while it was measured
      it.cents = pn.spread != null && pn.spread > 0.4 ? null : Math.round((pn.midi - refN[r].midi) * 100);
    } else if (c === 0.15) { it.status = 'ok'; it.cents = null; it.octaveUnsure = true; }
    else if (c >= 0.9) { it.status = 'wrong'; it.semis = pn.midi - refN[r].midi; }
  }

  // rhythm: compare each gap between matched notes with the real player's gap
  const matched = items.filter((it) => it.played && it.status !== 'wrong' && !it.ref.grace);
  for (let k = 0; k + 1 < matched.length; k++) {
    const a = matched[k], b = matched[k + 1];
    const refGap = b.ref.t - a.ref.t, myGap = map(b.played) - map(a.played);
    if (refGap > 0.12) { a.lengthRatio = myGap / refGap; a.lengthDiff = myGap - refGap; }
  }

  const counted = items.filter((it) => !it.ref.grace);
  const ok = counted.filter((it) => it.status === 'ok').length;
  const judged = counted.filter((it) => it.status === 'ok' && it.cents != null);
  const inTune = judged.filter((it) => Math.abs(it.cents) <= 35).length;
  const onTime = counted.filter((it) => it.played && it.status === 'ok' && Math.abs(it.dt) <= 0.12).length;
  const badLen = (it) => it.lengthRatio != null && Math.abs(it.lengthDiff) > 0.2 && (it.lengthRatio > 1.5 || it.lengthRatio < 0.65);
  const rhythmOk = matched.filter((it) => !badLen(it)).length;

  const score = {
    notes: Math.round(100 * ok / counted.length),
    tuning: judged.length ? Math.round(100 * inTune / judged.length) : 0,
    timing: opts.mode === 'along' ? (ok ? Math.round(100 * onTime / ok) : 0)
      : (matched.length ? Math.round(100 * rhythmOk / matched.length) : 0),
    tempo,
  };
  return { items, extras: extras.map((i) => played[i]), score, tips: makeTips(items, extras.map((i) => played[i]), opts) };
}

function where(n) {
  return n.finger ? `string ${n.string}, finger ${n.finger}` : `string ${n.string} open`;
}

function makeTips(items, extras, opts) {
  const tips = [];
  const add = (weight, text, refIdx) => tips.push({ weight, text, refIdx });

  // repeated picks: one tip per group (e.g. فا ×4), not one per pick
  for (let k = 0; k < items.length; k++) {
    const r = items[k].ref; if (r.rep) continue;
    let j = k + 1; while (j < items.length && items[j].ref.rep && items[j].ref.key === r.key) j++;
    const count = j - k; if (count < 2) continue;
    const got = items.slice(k, j).filter((it) => it.status !== 'missed').length;
    if (got < count) add(2.6, `Pick ${r.ar} ${count} times here (${where(r).toLowerCase()}). You played it ${got} time${got === 1 ? '' : 's'}.`, r.i);
  }
  for (const it of items) {
    const r = it.ref;
    if (r.grace) continue;
    if (it.status === 'missed' && (r.rep || r.quick)) continue;
    if (it.status === 'missed') add(3, `Missed ${r.ar} (${where(r)}).`, r.i);
    else if (it.status === 'wrong') {
      const got = nameOf(it.played.midi);
      const s = it.semis;
      if (Math.abs(s) < 1.6 && r.finger) {
        add(3.2, `${r.ar} came out as ${got.ar}: ${s < 0 ? 'too low' : 'too high'} by about a half step. ` +
          `Move finger ${r.finger} ${s < 0 ? 'toward the body (away from the pegs)' : 'toward the pegs'}.`, r.i);
      } else if (Math.abs(s) < 1.6) {
        add(3, `${r.ar} sounded like ${got.ar}. String ${r.string} may be out of tune: check it in the tuner.`, r.i);
      } else add(3.4, `Expected ${r.ar} (${where(r)}), heard ${got.ar}.`, r.i);
    } else if (it.status === 'ok' && it.cents != null && Math.abs(it.cents) > 35) {
      if (r.finger) add(1.6 + Math.abs(it.cents) / 100, `${r.ar} is a little ${it.cents > 0 ? 'high' : 'low'} (${it.cents > 0 ? '+' : ''}${it.cents} cents). ` +
        `Move finger ${r.finger} slightly ${it.cents > 0 ? 'toward the pegs' : 'toward the body'}.`, r.i);
      else add(1.5 + Math.abs(it.cents) / 100, `String ${r.string} (${r.ar}) is ${it.cents > 0 ? 'sharp' : 'flat'} by ${Math.abs(it.cents)} cents. Tune it.`, r.i);
    }
    if (it.lengthRatio != null && it.status === 'ok' && Math.abs(it.lengthDiff) > 0.2) {
      if (it.lengthRatio > 1.7) add(1.4 + Math.min(1, it.lengthRatio / 4), `You held ${r.ar} too long. Move on to the next note sooner.`, r.i);
      else if (it.lengthRatio < 0.55) add(1.4 + Math.min(1, 1 / it.lengthRatio / 4), `${r.ar} was rushed. Let it ring a bit longer.`, r.i);
    }
    if (opts.mode === 'along' && it.status === 'ok' && Math.abs(it.dt) > 0.15) {
      add(1.2 + Math.min(1, Math.abs(it.dt)), `${r.ar} came ${Math.round(Math.abs(it.dt) * 1000)} ms ${it.dt > 0 ? 'late' : 'early'}.`, r.i);
    }
  }
  const quickMissed = items.filter((it) => it.ref.quick && !it.ref.rep && it.status === 'missed').length;
  if (quickMissed >= 2) add(1.0, `${quickMissed} quick notes were not heard clearly. Pick them a little stronger.`, null);
  const realExtras = extras.filter((e) => !e.legato);
  if (realExtras.length >= 3 && realExtras.length >= 0.15 * items.length) add(1.3, `${realExtras.length} extra notes (decorations or other strings ringing). Fine if on purpose; for the clean version, pick only the notes shown.`, null);
  const slides = extras.filter((e) => e.legato);
  if (slides.length) add(1.1, `Some notes slid into each other. Lift the finger cleanly before the next note.`, null);

  // merge repeats of the same problem on the same note
  const seen = new Map();
  for (const t of tips) {
    const k = t.text.replace(/\(.*?\)|\d+/g, '');
    if (!seen.has(k) || seen.get(k).weight < t.weight) seen.set(k, t);
  }
  return [...seen.values()].sort((a, b) => b.weight - a.weight);
}
