// usage: node render_notes.js notes.json(list [t, midi]) out.wav  — the app's own oud sound (renderOffline), no padding
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const notes = JSON.parse(fs.readFileSync(process.argv[2])).map((n, i, a) => ({ t: n[0], midi: n[1], dur: Math.min(1.6, (a[i + 1] ? a[i + 1][0] : n[0] + 1.2) - n[0] + 0.3) }));
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto('http://localhost:8765/');
  const r = await p.evaluate(async (notes) => { const A = await import('./js/audio.js'); const buf = await A.renderOffline(notes, 1);
    return { sr: buf.sampleRate, data: Array.from(buf.getChannelData(0)) }; }, notes);
  const n = r.data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(r.sr, 24); buf.writeUInt32LE(r.sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  let pk = 0; for (const x of r.data) pk = Math.max(pk, Math.abs(x));
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(r.data[i] / (pk || 1) * 0.8 * 32767), 44 + i * 2);
  fs.writeFileSync(process.argv[3], buf); await b.close();
})();
