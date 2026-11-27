// usage: node render_port.cjs <port> <notes.json [{t,midi,dur}]> <out.wav>
const { chromium } = require(process.env.PWMOD); const fs = require('fs');
const [port, inp, outf] = process.argv.slice(2);
const notes = JSON.parse(fs.readFileSync(inp, 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(`http://localhost:${port}/`);
  const r = await p.evaluate(async (notes) => {
    let s = 12345; Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); const A = await import('./js/audio.js'); const buf = await A.renderOffline(notes, 1);
    return { sr: buf.sampleRate, data: Array.from(buf.getChannelData(0)) };
  }, notes);
  const n = r.data.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(r.sr, 24); buf.writeUInt32LE(r.sr * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(32, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) buf.writeFloatLE(r.data[i], 44 + i * 4);
  fs.writeFileSync(outf, buf); await b.close();
})();
