// Đám cưới Làng Chuột trailer renderer — one command does everything:
//   node render.mjs                -> full 1080p render + encode -> out/LANG_MA_Trailer.mp4
//   node render.mjs --preview      -> fast 960px preview
//   node render.mjs --from 1900 --to 2424   -> only re-render a frame range (frames are cached)
//   node render.mjs --encode-only  -> just rebuild the MP4 from existing frames
//   node render.mjs --4k           -> 3840x2160 render -> 4k/LANG_MA_Trailer_4K.mp4 (frames in 4k/frames)
// Needs: Node 18+, Google Chrome (or set CHROME_PATH), ffmpeg on PATH.
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';

const args = process.argv.slice(2), has = f => args.includes(f), val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? +args[i + 1] : d; };
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json'), 'utf8'));
const TOTAL = Math.round(TL.dur * TL.fps);
const K4 = has('--4k');
const W = K4 ? 3840 : has('--preview') ? 960 : 1920;
const FR = path.join(ROOT, K4 ? '4k/frames' : has('--preview') ? 'frames_preview' : 'frames');
const OUT_DIR = path.join(ROOT, K4 ? '4k' : 'out');
const A = val('--from', 0), B = Math.min(val('--to', TOTAL), TOTAL);
fs.mkdirSync(FR, { recursive: true }); fs.mkdirSync(OUT_DIR, { recursive: true });

if (!has('--encode-only')) {
  // tiny static server
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' };
  const srv = http.createServer((q, r) => {
    const f = path.resolve(ROOT, '.' + decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(r => srv.listen(0, r)); // any free port, so several renders can run at once
  const PORT = srv.address().port;

  const opts = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
  const br = await chromium.launch({ ...opts, args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const p = await br.newPage(); p.on('pageerror', e => console.log('[page error]', e.message));
  await p.goto(`http://localhost:${PORT}/web/index.html?w=${W}`); await p.waitForFunction('window.READY', null, { timeout: 300000 });
  console.log(`Rendering frames ${A}–${B - 1} at ${W}px …`);
  let t0 = Date.now(), n = 0;
  for (let i = A; i < B; i++) {
    if (n === 0 && i > 0) await p.evaluate(i => renderFrame(i), i - 1); // warm motion-blur history
    const u = await p.evaluate(i => renderFrame(i, .93), i);
    fs.writeFileSync(path.join(FR, `f_${String(i).padStart(5, '0')}.jpg`), Buffer.from(u.split(',')[1], 'base64')); n++;
    if (n % 48 === 0) { const s = (Date.now() - t0) / n / 1000; console.log(`  frame ${i}/${B - 1}  ${s.toFixed(2)} s/frame  ~${Math.round((B - i) * s / 60)} min left`); }
  }
  await br.close(); srv.close();
}

const out = path.join(OUT_DIR, K4 ? 'LANG_MA_Trailer_4K.mp4' : has('--preview') ? 'LANG_MA_preview.mp4' : 'LANG_MA_Trailer.mp4');
const missing = [...Array(TOTAL).keys()].filter(i => !fs.existsSync(path.join(FR, `f_${String(i).padStart(5, '0')}.jpg`)));
if (missing.length) { console.log(`Frames rendered. Not encoding yet: ${missing.length} frames still missing (first: ${missing[0]}). Run without --from/--to to fill them.`); process.exit(0); }
console.log('Encoding', out);
const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(TL.fps), '-i', path.join(FR, 'f_%05d.jpg'),
  '-i', path.join(ROOT, 'audio', 'trailer_mix.flac'), '-c:v', 'libx264', '-preset', 'slow', '-crf', has('--preview') ? '26' : '18',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log(r.status === 0 ? 'DONE → ' + out : 'ffmpeg failed (is it installed and on PATH?)');
