// Every practice take is kept on the device (IndexedDB): the report and the audio.
// "Send to Claude" shares a take (report + recording) through the system share sheet.

const DB = 'oudcoach', STORE = 'takes';
function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  try {
    return await new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const out = fn(t.objectStore(STORE));
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = t.onabort = () => rej(t.error || new Error('Storage transaction interrupted'));
    });
  } finally { db.close(); }
}

export const takes = {
  async save(take) { try { await tx('readwrite', (s) => s.put(take)); return true; } catch (_) { return false; } },
  async list() {
    try {
      const all = await tx('readonly', (s) => s.getAll());
      return (all || []).sort((a, b) => b.at - a.at);
    } catch (_) { return []; }
  },
  async get(id) { try { return await tx('readonly', (s) => s.get(id)); } catch (_) { return null; } },
  async remove(id) { try { await tx('readwrite', (s) => s.delete(id)); } catch (_) {} },
  async clear() { try { await tx('readwrite', (s) => s.clear()); } catch (_) {} },
};

// ---------------------------------------------------------------- recording
export class Recorder {
  constructor(stream) {
    this.chunks = []; this.rec = null;
    const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
    const type = window.MediaRecorder && types.find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return;
    this.type = type.split(';')[0];
    try {
      this.rec = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 96000 });
      this.rec.ondataavailable = (e) => e.data && e.data.size && this.chunks.push(e.data);
    } catch (_) { this.rec = null; }
  }
  start() { if (this.rec && this.rec.state === 'inactive') this.rec.start(250); }
  stop() {
    return new Promise((res) => {
      if (!this.rec || this.rec.state === 'inactive') return res(null);
      this.rec.onstop = () => res(new Blob(this.chunks, { type: this.type }));
      this.rec.stop();
    });
  }
}

// ---------------------------------------------------------------- report for Claude
const ext = (type) => (type && type.includes('mp4') ? 'm4a' : type && type.includes('ogg') ? 'ogg' : 'webm');
export function fileBase(take) {
  const d = new Date(take.at), p = (n) => String(n).padStart(2, '0');
  return `oud-${take.kind === 'risha' ? 'risha' : 'take'}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
export function reportText(take) {
  const s = take.score || {};
  if (take.kind === 'risha') return rishaText(take, s);
  const lines = [
    `Oud Coach take — ${new Date(take.at).toLocaleString()}`,
    `Song: ${take.song} · version ${take.version || '-'} · ${take.passTitle} · ${take.partLabel} · mode: ${take.mode}${take.speed ? ` · speed ${Math.round(take.speed * 100)}%` : ''}`,
    take.score ? `Scores: notes ${s.notes == null ? 'not graded' : s.notes + '%'} · in tune ${s.tuning == null ? 'not measured' : s.tuning + '%'}${s.timing == null ? ' · timing not judged' : ` · ${take.mode === 'along' ? 'on time' : 'rhythm'} ${s.timing}%`}${s.tempo ? ` · speed vs real players ${Math.round(s.tempo * 100)}%` : ''}` : '',
    take.skipped ? `Skipped note groups: ${take.skipped}` : '',
    s.uncertain ? `Unclear pitches: ${s.uncertain} (not marked correct or wrong)` : '',
    take.waitErrors != null ? `Wrong notes on the way: ${take.waitErrors}` : '',
    take.tips && take.tips.length ? 'Tips:\n' + take.tips.map((t) => `- ${t}`).join('\n') : '',
    take.items && take.items.length ? 'Notes (expected → result):\n' + take.items.map((it) =>
      `${it.line}. ${it.ar}${it.grace ? ' (quick)' : ''} [${it.where}] → ${it.status}${it.cents != null ? `, ${it.cents > 0 ? '+' : ''}${it.cents}¢` : ''}${it.dt != null ? `, ${it.dt > 0 ? '+' : ''}${Math.round(it.dt * 1000)} ms` : ''}${it.heard ? `, heard ${it.heard}` : ''}`).join('\n') : '',
  ];
  return lines.filter(Boolean).join('\n');
}
// a right-hand (risha) take: the pattern, the scores, then every stroke (expected → what was heard)
function rishaText(take, s) {
  const lines = [
    `Oud Coach risha take — ${new Date(take.at).toLocaleString()}`,
    `Right hand · ${take.partLabel} · ${take.mode === 'step' ? 'Step by step (no metronome)' : `With the click · ${take.bpm} BPM · click ${take.click ? 'on' : 'off (count-in only)'}`}${take.scale ? ' · on the Bayati scale' : ''}`,
    take.mode === 'step' ? `Score: ${s.wrong} wrong strokes on the way, ${s.strokes} strokes`
      : `Scores: on time ${s.onTime}% · missed ${s.missed}${s.strings != null ? ` · strings right ${s.strings}%` : ''}${s.notes != null ? ` · notes right ${s.notes}%` : ''} · average ${s.meanMs} ms · spread ±${s.sdMs} ms · mic delay ${s.latencyMs} ms`,
    take.tips && take.tips.length ? 'Tip: ' + take.tips[0] : '',
    take.strokes && take.strokes.length ? 'Strokes (expected → heard):\n' + take.strokes.map((k) =>
      `${k.n}. cycle ${k.cycle} ${k.dir} ${k.want} [${k.where}] at ${k.t}s → ${take.mode === 'step' ? (k.ok ? 'ok' : k.ignored ? `not counted (${k.ignored})` : 'wrong') : k.status}` +
      `${k.heard ? `, heard ${k.heard}` : ''}${k.offMs != null ? `, ${k.offMs > 0 ? '+' : ''}${k.offMs} ms` : ''}`).join('\n') : '',
  ];
  return lines.filter(Boolean).join('\n');
}
export async function shareTake(take) {
  const base = fileBase(take);
  const json = new File([JSON.stringify({ ...take, audio: undefined }, null, 1)], `${base}.json`, { type: 'application/json' });
  const files = [json];
  if (take.audio) files.push(new File([take.audio], `${base}.${ext(take.audio.type)}`, { type: take.audio.type }));
  const text = reportText(take);
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: take.kind === 'risha' ? 'Oud right-hand take' : 'Oud practice take', text }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  // fallback: download the files
  for (const f of files) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  return 'downloaded';
}
export async function shareSummary(list) {
  const text = list.map(reportText).join('\n\n———\n\n');
  const f = new File([text], `oud-practice-summary-${Date.now()}.txt`, { type: 'text/plain' });
  if (navigator.canShare && navigator.canShare({ files: [f] })) {
    try { await navigator.share({ files: [f], title: 'Oud practice summary' }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.append(a); a.click(); a.remove();
  return 'downloaded';
}
