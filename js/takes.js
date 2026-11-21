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
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
    const out = fn(st);
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  });
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
  return `oud-take-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
export function reportText(take) {
  const s = take.score || {};
  const lines = [
    `Oud Coach take — ${new Date(take.at).toLocaleString()}`,
    `Song: ${take.song} · version ${take.version || '-'} · ${take.passTitle} · ${take.partLabel} · mode: ${take.mode}${take.speed ? ` · speed ${Math.round(take.speed * 100)}%` : ''}`,
    s.notes != null ? `Scores: notes ${s.notes}% · in tune ${s.tuning}%${s.timing == null ? ' · timing not judged' : ` · ${take.mode === 'along' ? 'on time' : 'rhythm'} ${s.timing}%`}${s.tempo ? ` · speed vs real players ${Math.round(s.tempo * 100)}%` : ''}` : '',
    take.waitErrors != null ? `Wrong notes on the way: ${take.waitErrors}` : '',
    take.tips && take.tips.length ? 'Tips:\n' + take.tips.map((t) => `- ${t}`).join('\n') : '',
    take.items && take.items.length ? 'Notes (expected → result):\n' + take.items.map((it) =>
      `${it.line}. ${it.ar}${it.grace ? ' (quick)' : ''} [${it.where}] → ${it.status}${it.cents != null ? `, ${it.cents > 0 ? '+' : ''}${it.cents}¢` : ''}${it.dt != null ? `, ${it.dt > 0 ? '+' : ''}${Math.round(it.dt * 1000)} ms` : ''}${it.heard ? `, heard ${it.heard}` : ''}`).join('\n') : '',
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
    try { await navigator.share({ files, title: 'Oud practice take', text }); return 'shared'; }
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
