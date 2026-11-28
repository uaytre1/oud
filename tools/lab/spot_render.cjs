// Render a pass using the checked-out app modules without starting a web server.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PWMOD || 'playwright');
const [song, version, pass, directory, additions] = process.argv.slice(2);
const root = path.resolve(__dirname, '../..');

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('**/*', async route => {
      const name = new URL(route.request().url()).pathname;
      if (name === '/') return route.fulfill({ contentType: 'text/html', body: '<title>Render</title>' });
      if (!/^\/js\/[\w./-]+\.js$/.test(name) || name.includes('..')) return route.abort();
      return route.fulfill({ contentType: 'text/javascript', path: path.join(root, name) });
    });
    await page.goto('http://localhost/');
    const extra = additions ? JSON.parse(fs.readFileSync(additions)) : [];
    const result = await page.evaluate(async ({ song, version, pass, extra }) => {
      // Both renders get the same room and plucks for A/B comparisons.
      let seed = 1873;
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      const { SONGS, buildPass } = await import('/js/library.js');
      const { renderOffline, oudBuffer } = await import('/js/audio.js');
      const s = SONGS.find(x => x.id === song);
      const v = s?.versions.find(x => x.id === version);
      const raw = v?.passes.find(x => x.id === pass);
      if (!raw || !Number.isFinite(v.media?.starts[pass])) throw Error('This pass needs a timed source recording.');
      const notes = buildPass(raw, false).notes;
      // Warm the same baseline voices in the same order before mixing any new pitches.
      for (const midi of new Set(notes.map(n => n.midi))) oudBuffer(midi);
      const rendered = await renderOffline([...notes, ...extra].sort((a, b) => a.t - b.t), 1);
      const bytes = new Blob([rendered.getChannelData(0)]);
      const data = await new Promise(resolve => {
        const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(bytes);
      });
      return { data, rate: rendered.sampleRate, source: v.media.file, start: v.media.starts[pass],
        title: s.title, song, version, pass, end: raw.end, notes };
    }, { song, version, pass, extra });
    const { data, ...meta } = result;
    fs.writeFileSync(path.join(directory, 'render.f32'), Buffer.from(data, 'base64'));
    fs.writeFileSync(path.join(directory, 'pass.json'), JSON.stringify(meta));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
