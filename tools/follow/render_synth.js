// Renders notes with the app's own oud sound (js/audio.js renderOffline) to a 16-bit mono WAV.
// Starts its own static server on a free port, so nothing else needs to be running.
// usage: node tools/follow/render_synth.js <notes.json> <out.wav>
//   notes.json: [{ "t": seconds, "dur": seconds, "midi": number }, ...]  (absolute times; the WAV starts at 0 s)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json' };

function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      if (req.url === '/' || req.url === '/blank') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><title>r</title>'); }
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

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
  const [inp, out] = process.argv.slice(2);
  if (!inp || !out) { console.error('usage: node render_synth.js <notes.json> <out.wav>'); process.exit(2); }
  const notes = JSON.parse(fs.readFileSync(inp, 'utf8')).sort((a, b) => a.t - b.t);
  const srv = await serve();
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    await p.goto(`http://127.0.0.1:${srv.address().port}/blank`);
    const r = await p.evaluate(async (notes) => {
      const A = await import('/js/audio.js');
      const buf = await A.renderOffline(notes, 1);
      return { sr: buf.sampleRate, data: Array.from(buf.getChannelData(0)) };
    }, notes);
    // renderOffline starts 0.1 s before the first note; pad so the WAV's time 0 is absolute time 0
    const lead = Math.max(0, Math.round((notes[0].t - 0.1) * r.sr));
    const all = new Float32Array(lead + r.data.length); all.set(r.data, lead);
    fs.writeFileSync(out, wav(all, r.sr));
    console.log(`${out}: ${notes.length} notes, ${(all.length / r.sr).toFixed(1)} s at ${r.sr} Hz`);
  } finally { await b.close(); srv.close(); }
})();
