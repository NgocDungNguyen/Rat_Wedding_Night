// Procedural "giấy dó" paper and ink-grain textures for the UI, made with the trailer's noise (web/lib.js).
import { fbm2, hash1 } from '@trailer/lib.js';

function canvasURL(size, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'), im = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) im.data.set(fn(x, y), (y * size + x) * 4);
  ctx.putImageData(im, 0, 0);
  return c;
}

/** Sets CSS variables --paper (light rice paper) and --grain (dark speckle) on :root. */
export function applyPaperTextures() {
  const S = 256;
  // Rice paper: warm base, soft cloudy fibres, a few darker flecks. Tiles because fbm2 is sampled on a torus-ish range.
  const paper = canvasURL(S, (x, y) => {
    const n = fbm2(x / 32, y / 32, 4), fib = fbm2(x / 3, y / 40, 2), fleck = hash1(x * 131 + y * 7.3) > .996 ? -40 : 0;
    const v = 214 + (n - .5) * 26 + (fib - .5) * 14 + fleck;
    return [v + 12, v + 4, v - 18, 255];
  });
  // Ink grain: transparent noise for dark panels.
  const grain = canvasURL(S, (x, y) => {
    const n = fbm2(x / 18, y / 18, 3), s = hash1(x * 17.1 + y * 311.7);
    return [233, 223, 200, Math.max(0, (n - .5) * 22 + (s > .99 ? 18 : 0))];
  });
  const root = document.documentElement.style;
  root.setProperty('--paper', `url(${paper.toDataURL()})`);
  root.setProperty('--grain', `url(${grain.toDataURL()})`);
}
