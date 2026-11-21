// Renders every pass of every version with the app's own oud sound, as WAV files for testing.
// usage: node render_versions.js <outdir>   (site served at http://localhost:8765/)
const { chromium } = require('playwright'); const fs = require('fs');
function wav(samples, sr) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  let peak = 0; for (const x of samples) peak = Math.max(peak, Math.abs(x));
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(samples[i] / (peak || 1) * 0.8 * 32767), 44 + i * 2);
  return buf;
}
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/');
  const list = await p.evaluate(async () => {
    const L = await import('./js/library.js'), A = await import('./js/audio.js');
    const res = [];
    for (const s of L.SONGS) for (const v of s.versions) for (const ps of v.passes) {
      const pass = L.buildPass(ps); const buf = await A.renderOffline(pass.notes, 1);
      res.push({ name: `${s.id}__${v.id}__${ps.id}`, sr: buf.sampleRate, data: Array.from(buf.getChannelData(0)) });
    }
    return res;
  });
  for (const r of list) {
    const pad = (sec) => new Array(Math.round(sec * r.sr)).fill(0);
    fs.writeFileSync(`${out}/${r.name}.wav`, wav([...pad(1), ...r.data, ...pad(6)], r.sr));
    console.log(r.name, (r.data.length / r.sr).toFixed(1) + 's');
  }
  await b.close();
})();
