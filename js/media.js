// Real recordings of a version, loaded by the owner from his own phone and kept only on the device
// (IndexedDB). Nothing here is uploaded. A file is matched to a version by its length.

const DB = 'oudcoach-media', STORE = 'files';
function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'key' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function run(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode); const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
  });
}
export const mediaStore = {
  async get(key) { try { return await run('readonly', (s) => s.get(key)); } catch (_) { return null; } },
  async put(key, blob, name) { try { await run('readwrite', (s) => s.put({ key, blob, name, at: Date.now() })); return true; } catch (_) { return false; } },
  async remove(key) { try { await run('readwrite', (s) => s.delete(key)); } catch (_) {} },
};

// Length of a media file in seconds.
export function durationOf(blob) {
  return new Promise((res) => {
    const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
    const url = URL.createObjectURL(blob);
    const done = (d) => { URL.revokeObjectURL(url); res(d); };
    v.onloadedmetadata = () => done(isFinite(v.duration) ? v.duration : NaN);
    v.onerror = () => done(NaN);
    setTimeout(() => done(NaN), 8000);
    v.src = url;
  });
}

// Which version of the song does this file belong to? Name first, then length.
export function matchVersion(song, file, duration) {
  const base = (file.name || '').toLowerCase().replace(/\.[a-z0-9]+$/, '');
  const byName = song.versions.find((v) => v.media && base.includes(v.media.file));
  if (byName) return byName;
  if (!isFinite(duration)) return null;
  let best = null;
  for (const v of song.versions) {
    if (!v.media) continue;
    const d = Math.abs(v.media.duration - duration);
    if (d < 0.6 && (!best || d < best.d)) best = { v, d };
  }
  return best && best.v;
}
