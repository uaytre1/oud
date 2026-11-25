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
    `Right hand · ${take.partLabel} · ${take.mode === 'step' ? 'Slowly (no metronome)' : `In time · ${take.bpm} BPM · click ${take.click ? 'on' : 'off (count-in only)'}`}${take.scale ? ' · on the Bayati scale' : ''}`,
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
// ---------------------------------------------------------------- all takes in one file (owner, 2026-11-24:
// "a feature where it takes all your takes and puts them in a file instead of one by one")
// A plain zip (stored, no compression: m4a is already compressed): summary.txt + each take's .json and recording.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function zipBlob(entries) {             // entries: [{ name, data: Uint8Array }]
  const enc = new TextEncoder(), parts = [], central = [], d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name), crc = crc32(e.data), size = e.data.length;
    const h = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, size, 4], [22, size, 4], [26, name.length, 2], [28, 0, 2]]
      .forEach(([o, v, n]) => (n === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true)));
    parts.push(new Uint8Array(h.buffer), name, e.data);
    const c = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, size, 4], [24, size, 4], [28, name.length, 2], [42, offset, 4]]
      .forEach(([o, v, n]) => (n === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true)));
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((s, x) => s + x.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
export async function shareAllTakes(list) {      // list: newest first (as takes.list() gives)
  const enc = new TextEncoder(), entries = [], names = new Set(), oldestFirst = [...list].reverse();
  entries.push({ name: 'summary.txt', data: enc.encode(oldestFirst.map(reportText).join('\n\n———\n\n')) });
  for (const t of oldestFirst) {
    let base = fileBase(t); while (names.has(base)) base += 'b'; names.add(base);
    entries.push({ name: `${base}.json`, data: enc.encode(JSON.stringify({ ...t, audio: undefined }, null, 1)) });
    if (t.audio) entries.push({ name: `${base}.${ext(t.audio.type)}`, data: new Uint8Array(await t.audio.arrayBuffer()) });
  }
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  const f = new File([zipBlob(entries)], `oud-takes-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.zip`, { type: 'application/zip' });
  if (navigator.canShare && navigator.canShare({ files: [f] })) {
    try { await navigator.share({ files: [f], title: `Oud takes (${list.length})` }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
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
