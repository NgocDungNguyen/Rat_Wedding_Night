// Utilities: seeded RNG, noise, interpolation, procedural canvas textures
import * as THREE from 'three';

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const R = mulberry32(1987);
export const rand = (a = 0, b = 1) => a + (b - a) * R();

// hash-based 1D smooth noise (deterministic in t)
export function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return (hash1(i) * (1 - u) + hash1(i + 1) * u) * 2 - 1;
}
export function fbm1(x, oct = 3) { let a = 0, amp = 0.5, fr = 1; for (let k = 0; k < oct; k++) { a += amp * noise1(x * fr + k * 17.3); amp *= .5; fr *= 2.03; } return a; }

// 2D value noise for textures
const PERM = new Float32Array(256 * 256); for (let i = 0; i < PERM.length; i++) PERM[i] = R();
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const g = (a, b) => PERM[((a & 255) << 8) | (b & 255)];
  const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm2(x, y, oct = 4) { let s = 0, a = .5, f = 1; for (let k = 0; k < oct; k++) { s += a * vnoise(x * f, y * f); a *= .5; f *= 2; } return s / (1 - Math.pow(.5, oct)); }

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 3);

// keyframe interpolation. keys: [[t, v0, v1, ...], ...]; mode 'cr' (Catmull-Rom, non-uniform) or 'ease'
export function track(keys, t, mode = 'ease') {
  const n = keys.length, dim = keys[0].length - 1;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[i], k1 = keys[i + 1], dt = k1[0] - k0[0], s = (t - k0[0]) / dt;
  const out = [];
  for (let d = 1; d <= dim; d++) {
    const p0 = k0[d], p1 = k1[d];
    let m0 = 0, m1 = 0;
    if (mode === 'cr') {
      if (i > 0) m0 = (p1 - keys[i - 1][d]) / (k1[0] - keys[i - 1][0]) * dt;
      else m0 = p1 - p0;
      if (i + 2 < n) m1 = (keys[i + 2][d] - p0) / (keys[i + 2][0] - k0[0]) * dt;
      else m1 = p1 - p0;
    }
    const s2 = s * s, s3 = s2 * s;
    out.push((2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1);
  }
  return out;
}
export const tr1 = (keys, t, mode) => track(keys, t, mode)[0];

// ---------- canvas textures
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
function pixels(w, h, fn) {
  const c = cv(w, h), ctx = c.getContext('2d'), im = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a = 255] = fn(x, y); const i = (y * w + x) * 4;
    im.data[i] = r; im.data[i + 1] = g; im.data[i + 2] = b; im.data[i + 3] = a;
  }
  ctx.putImageData(im, 0, 0); return c;
}

export function plasterTex(base = [178, 168, 142]) {
  const w = 512, h = 256;
  const c = pixels(w, h, (x, y) => {
    const n = fbm2(x / 60, y / 60, 5), m = fbm2(x / 14 + 9, y / 14, 3);
    const damp = smooth(0.55, 1.0, y / h) * (0.6 + 0.4 * fbm2(x / 30, 3));
    const stain = smooth(.55, .8, fbm2(x / 90 + 4, y / 25, 4));
    let k = 0.72 + 0.35 * n + 0.12 * m - 0.45 * damp - 0.25 * stain;
    return [base[0] * k, base[1] * k * (1 + .04 * damp), base[2] * k * (1 + .02 * damp)];
  });
  const ctx = c.getContext('2d'); ctx.strokeStyle = 'rgba(30,25,20,.55)'; ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) { ctx.beginPath(); let x = rand(0, w), y = rand(0, h); ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rand(-12, 12); y += rand(2, 14); ctx.lineTo(x, y); } ctx.stroke(); }
  return tex(c);
}
export function tileTex() {
  const c = cv(512, 512), ctx = c.getContext('2d');
  ctx.fillStyle = '#2a140c'; ctx.fillRect(0, 0, 512, 512);
  const rows = 16, cols = 12, th = 512 / rows, tw = 512 / cols;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = k * tw + (r % 2) * tw / 2, y = r * th, v = rand(.6, 1.05);
    const g = ctx.createLinearGradient(0, y, 0, y + th);
    g.addColorStop(0, `rgb(${110 * v},${52 * v},${32 * v})`); g.addColorStop(1, `rgb(${60 * v},${26 * v},${16 * v})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 1, y, tw - 2, th * 1.15, [2, 2, 10, 10]); ctx.fill();
    if (R() < .35) { ctx.fillStyle = `rgba(40,55,25,${rand(.2, .6)})`; ctx.beginPath(); ctx.ellipse(x + rand(5, tw - 5), y + rand(5, th), rand(3, 10), rand(2, 6), 0, 0, 7); ctx.fill(); }
  }
  return tex(c);
}
export function brickTex() {
  const c = cv(512, 256), ctx = c.getContext('2d');
  ctx.fillStyle = '#4a4036'; ctx.fillRect(0, 0, 512, 256);
  const bh = 16, bw = 48;
  for (let r = 0; r < 256 / bh; r++) for (let k = -1; k < 512 / bw + 1; k++) {
    const v = rand(.55, 1), x = k * bw + (r % 2) * bw / 2;
    ctx.fillStyle = `rgb(${120 * v},${62 * v},${44 * v})`; ctx.fillRect(x + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    if (R() < .3) { ctx.fillStyle = `rgba(20,30,15,${rand(.2, .5)})`; ctx.fillRect(x, r * bh, bw, bh); }
  }
  const im = ctx.getImageData(0, 0, 512, 256);
  for (let i = 0; i < im.data.length; i += 4) { const p = i / 4, x = p % 512, y = (p / 512) | 0, n = .75 + .35 * fbm2(x / 20, y / 20, 3); for (let j = 0; j < 3; j++) im.data[i + j] *= n; }
  ctx.putImageData(im, 0, 0); return tex(c);
}
export function dirtTex() {
  const c = pixels(512, 512, (x, y) => {
    const n = fbm2(x / 40, y / 40, 5), m = vnoise(x / 3, y / 3);
    const k = 0.5 + 0.45 * n + 0.15 * m; return [92 * k, 80 * k, 64 * k];
  });
  const ctx = c.getContext('2d');
  for (let i = 0; i < 900; i++) { const v = rand(.4, 1); ctx.fillStyle = `rgba(${140 * v},${130 * v},${115 * v},.8)`; ctx.beginPath(); ctx.ellipse(rand(0, 512), rand(0, 512), rand(1, 3.5), rand(1, 2.5), rand(0, 3), 0, 7); ctx.fill(); }
  return tex(c, [1, 1]);
}
export function grassDirtTex() {
  const c = pixels(512, 512, (x, y) => {
    const n = fbm2(x / 50, y / 50, 5), g = smooth(.45, .7, fbm2(x / 70 + 5, y / 70, 4)), m = vnoise(x / 2, y / 2);
    const k = .55 + .4 * n + .2 * m;
    return [lerp(88, 50, g) * k, lerp(78, 72, g) * k, lerp(62, 38, g) * k];
  });
  return tex(c);
}
export function woodTex() {
  const c = pixels(256, 512, (x, y) => {
    const plank = Math.floor(x / 42), gx = x % 42;
    const grain = Math.sin((y / 7) + fbm2(x / 8, y / 90 + plank * 7, 3) * 9) * .5 + .5;
    const edge = gx < 2 || gx > 40 ? .35 : 1, v = (.55 + .2 * grain + .1 * hash1(plank)) * edge;
    return [86 * v, 54 * v, 34 * v];
  });
  return tex(c);
}
export function fabricTex(col = [150, 14, 22]) {
  const c = pixels(256, 256, (x, y) => {
    const fold = .78 + .22 * Math.sin(x / 256 * Math.PI * 10 + fbm2(x / 50, y / 80) * 3);
    const k = fold * (.9 + .1 * vnoise(x / 2, y / 2));
    return [col[0] * k, col[1] * k, col[2] * k];
  });
  return tex(c);
}
export function scallopTex(c1 = '#e8d8d0', c2 = '#b0101a') {
  const c = cv(256, 128), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2; ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 64, 0); ctx.lineTo(i * 64 + 64, 40);
    ctx.quadraticCurveTo(i * 64 + 32, 140, i * 64, 40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,150,.6)'; ctx.lineWidth = 3; ctx.stroke();
  }
  const t = tex(c); return t;
}
function leafCluster(w, h, n, drawLeaf) {
  const c = cv(w, h), ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < n; i++) drawLeaf(ctx, i);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
export function bambooLeafTex() {
  return leafCluster(256, 256, 120, (ctx) => {
    const cx = 128 + rand(-70, 70), cy = 128 + rand(-70, 70), a = rand(0, Math.PI * 2), l = rand(30, 55), v = rand(.5, 1);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = `rgb(${45 * v},${78 * v},${30 * v})`; ctx.beginPath(); ctx.ellipse(l / 2, 0, l / 2, rand(3, 5.5), 0, 0, 7); ctx.fill(); ctx.restore();
  });
}
export function banyanLeafTex() {
  return leafCluster(256, 256, 160, (ctx) => {
    const r = Math.sqrt(R()) * 115, th = rand(0, 7), cx = 128 + Math.cos(th) * r, cy = 128 + Math.sin(th) * r, v = rand(.35, .9);
    ctx.fillStyle = `rgb(${32 * v},${58 * v},${26 * v})`; ctx.beginPath(); ctx.ellipse(cx, cy, rand(5, 9), rand(3.5, 6), rand(0, 3), 0, 7); ctx.fill();
  });
}
export function bananaLeafTex() {
  const c = cv(128, 512), ctx = c.getContext('2d'); ctx.clearRect(0, 0, 128, 512);
  ctx.fillStyle = '#3f6a28'; ctx.beginPath(); ctx.moveTo(64, 0); ctx.bezierCurveTo(130, 60, 125, 420, 64, 512); ctx.bezierCurveTo(3, 420, -2, 60, 64, 0); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i++) { const y = rand(60, 480), s = R() < .5 ? -1 : 1; ctx.beginPath(); ctx.moveTo(64, y); ctx.lineTo(64 + s * 70, y - rand(10, 30)); ctx.lineTo(64 + s * 70, y - rand(0, 6)); ctx.closePath(); ctx.lineWidth = 2; ctx.stroke(); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#7d8a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(64, 512); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,40,10,.5)'; ctx.lineWidth = 1; for (let y = 10; y < 512; y += 6) { ctx.beginPath(); ctx.moveTo(64, y); ctx.lineTo(5, y - 25); ctx.moveTo(64, y); ctx.lineTo(123, y - 25); ctx.stroke(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
export function softTex(size = 256, noisy = true) {
  const c = pixels(size, size, (x, y) => {
    const dx = x / size - .5, dy = y / size - .5, r = Math.sqrt(dx * dx + dy * dy) * 2;
    const n = noisy ? .55 + .45 * fbm2(x / 30, y / 30, 4) : 1;
    return [255, 255, 255, 255 * clamp(1 - r) ** 2 * n];
  });
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
export function moonTex() {
  const s = 512;
  const c = pixels(s, s, (x, y) => {
    const dx = (x - s / 2) / (s * .19), dy = (y - s / 2) / (s * .19), r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1) {
      const m = fbm2(x / 38 + 3, y / 38, 5), mare = smooth(.5, .62, m);
      const limb = Math.pow(1 - r * r, .25);
      const k = (1 - .32 * mare) * (.75 + .25 * limb);
      return [250 * k, 244 * k, 225 * k, 255];
    }
    const g = Math.exp(-(r - 1) * 5) * .25 + Math.exp(-(r - 1) * 16) * .35;
    return [190, 205, 235, 255 * clamp(g)];
  });
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
export function waterNormalTex() {
  const s = 256, hgt = new Float32Array(s * s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) hgt[y * s + x] = fbm2(x / 16, y / 16, 4) + .5 * Math.sin((x + y) / 6);
  const c = pixels(s, s, (x, y) => {
    const h = (a, b) => hgt[((b + s) % s) * s + ((a + s) % s)];
    const nx = (h(x - 1, y) - h(x + 1, y)) * 2, ny = (h(x, y - 1) - h(x, y + 1)) * 2;
    const l = Math.hypot(nx, ny, 1); return [(nx / l * .5 + .5) * 255, (ny / l * .5 + .5) * 255, (1 / l * .5 + .5) * 255];
  });
  return tex(c, [30, 30], false);
}
export function textTex(lines, opt = {}) {
  const w = opt.w || 1024, h = opt.h || 256, c = cv(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = opt.bg || '#8a0c12'; ctx.fillRect(0, 0, w, h);
  if (opt.border) { ctx.strokeStyle = opt.border; ctx.lineWidth = 10; ctx.strokeRect(14, 14, w - 28, h - 28); }
  ctx.fillStyle = opt.fg || '#e9c46a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = opt.font || '700 150px "Cormorant Garamond"';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (opt.lh || 160)));
  if (opt.age) { const im = ctx.getImageData(0, 0, w, h); for (let i = 0; i < im.data.length; i += 4) { const p = i / 4, k = .55 + .45 * fbm2((p % w) / 25, (p / w | 0) / 25, 3); for (let j = 0; j < 3; j++) im.data[i + j] *= k; } ctx.putImageData(im, 0, 0); }
  return tex(c, [1, 1]);
}
export function lanternTex() {
  const c = cv(256, 256), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, i % 2 ? '#ff4a24' : '#c41a10');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#d9a640'; ctx.fillRect(0, 0, 256, 22); ctx.fillRect(0, 234, 256, 22);
  ctx.fillStyle = 'rgba(255,215,120,.9)'; ctx.font = '700 90px "Noto Serif CJK SC"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('囍', 128, 130);
  return tex(c);
}
export function portraitTex(seed = 1) {
  const r = mulberry32(seed), s = 256;
  const c = pixels(s, s * 1.3 | 0, (x, y) => {
    const H = s * 1.3, dx = (x - s / 2) / (s * .2), dy = (y - H * .42) / (s * .27), rr = dx * dx + dy * dy;
    const face = clamp(1.2 - rr) * (.6 + .4 * fbm2(x / 20 + seed, y / 20, 3));
    let k = 18 + 20 * fbm2(x / 40 + seed * 3, y / 40, 4) + 120 * face;
    const ex = Math.abs(Math.abs(x - s / 2) - s * .085), ey = Math.abs(y - H * .39);
    if (ex < s * .035 && ey < s * .022) k *= .12;                       // hollow eyes
    if (Math.abs(x - s / 2) < s * .05 && Math.abs(y - H * .55) < s * .012) k *= .3;
    const body = y > H * .66 && Math.abs(x - s / 2) < s * (.18 + (y - H * .66) / H * .9) ? 1 : 0;
    if (body) k = 10 + 12 * vnoise(x / 6, y / 6);
    return [k * 1.0, k * .95, k * .85];
  });
  return tex(c);
}
