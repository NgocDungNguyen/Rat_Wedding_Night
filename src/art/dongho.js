// Đông Hồ woodblock-style painter for cut-scene stills (canvas 2D).
// Flat natural pigments, thick black outlines, rice paper. Upright rats in clothes like the folk print.
import { fbm2, mulberry32 } from '@trailer/lib.js';

export const W = 1600, H = 900;
export const C = {
  paper: '#e9dcbe', ink: '#1a1612', red: '#b3322a', yellow: '#dfae3e', indigo: '#2c4566', green: '#4b7436',
  white: '#f1e8d2', brown: '#7a5a3a', grey: '#8c7d6c', pink: '#d99a90', night: '#1c2433', gold: '#c9a040',
};

let paperCache = null;
/** Rice paper background with fibres and a soft vignette. */
export function paper(ctx, tone = 1) {
  if (!paperCache) {
    const c = document.createElement('canvas'); c.width = W / 4; c.height = H / 4; const x = c.getContext('2d'), im = x.createImageData(c.width, c.height);
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      const n = fbm2(i / 30, j / 30, 4), f = fbm2(i / 2, j / 18, 2), v = 220 + (n - .5) * 30 + (f - .5) * 16;
      im.data.set([v + 12, v + 2, v - 26, 255], (j * c.width + i) * 4);
    }
    x.putImageData(im, 0, 0); paperCache = c;
  }
  ctx.save(); ctx.filter = tone !== 1 ? `brightness(${tone})` : 'none'; ctx.drawImage(paperCache, 0, 0, W, H); ctx.restore();
}

/** Night wash over the paper (indigo, keeps the paper grain). */
export function night(ctx, a = .55) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(40,52,84,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }

/** Woodblock frame: black border with a red inner rule. */
export function frame(ctx) {
  ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 22; ctx.strokeRect(11, 11, W - 22, H - 22);
  ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.strokeRect(34, 34, W - 68, H - 68); ctx.restore();
}

/** Inscription box with a red seal (top corner). */
export function inscription(ctx, text, x = 70, y = 70, right = false) {
  ctx.save(); ctx.font = '700 46px "Cormorant Garamond"'; const tw = ctx.measureText(text).width;
  const bx = right ? W - 70 - tw - 90 : x;
  ctx.fillStyle = 'rgba(233,220,190,.9)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
  ctx.fillRect(bx, y, tw + 90, 70); ctx.strokeRect(bx, y, tw + 90, 70);
  ctx.fillStyle = C.ink; ctx.fillText(text, bx + 20, y + 50);
  ctx.fillStyle = C.red; ctx.fillRect(bx + tw + 36, y + 14, 40, 40);
  ctx.fillStyle = C.white; ctx.font = '700 28px serif'; ctx.fillText('囍', bx + tw + 42, y + 45);
  ctx.restore();
}

// ------------------------------------------------------------ helpers
function shape(ctx, fill, draw, lw = 5) { ctx.beginPath(); draw(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke(); }
const ell = (ctx, x, y, rx, ry, rot = 0) => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

/**
 * Upright rat in clothes. dir 1 faces right, -1 left. s = scale (1 ≈ 220 px tall).
 * @param {{robe?:string, hat?:'khan'|'groom'|'bride'|'none', hold?:'incense'|'list'|'fan'|'chicken'|null, kneel?:boolean, bow?:number, fur?:string}} o
 */
export function rat(ctx, x, y, s = 1, dir = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  const fur = o.fur ?? C.grey, robe = o.robe ?? C.indigo, bow = o.bow ?? 0;
  // tail
  ctx.beginPath(); ctx.moveTo(-30, -20); ctx.bezierCurveTo(-120, -10, -110, -110, -170, -90);
  ctx.lineWidth = 9; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = C.pink; ctx.stroke();
  // feet
  shape(ctx, C.pink, () => { ell(ctx, -18, -4, 22, 8); }); shape(ctx, C.pink, () => { ell(ctx, 24, -4, 22, 8); });
  ctx.rotate(bow);
  // robe (áo dài / áo the)
  const robeH = o.kneel ? 80 : 120;
  shape(ctx, robe, () => { ctx.moveTo(-48, -8); ctx.quadraticCurveTo(-56, -robeH * .6, -34, -robeH - 10); ctx.lineTo(36, -robeH - 10); ctx.quadraticCurveTo(58, -robeH * .6, 48, -8); ctx.closePath(); });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -robeH - 8); ctx.lineTo(4, -12); ctx.stroke();
  // sash
  ctx.fillStyle = o.robe === C.red ? C.yellow : C.red; ctx.fillRect(-40, -robeH * .55, 80, 10);
  // head
  const hy = -robeH - 46;
  shape(ctx, fur, () => { ctx.moveTo(-34, hy + 8); ctx.quadraticCurveTo(-30, hy - 34, 10, hy - 30); ctx.quadraticCurveTo(52, hy - 18, 78, hy + 6); ctx.quadraticCurveTo(40, hy + 26, -6, hy + 34); ctx.quadraticCurveTo(-36, hy + 30, -34, hy + 8); });
  shape(ctx, C.pink, () => { ell(ctx, -6, hy - 34, 18, 22, -.3); }, 4);
  ctx.fillStyle = C.ink; ctx.beginPath(); ell(ctx, 30, hy - 6, 6, 6); ctx.fill(); ctx.beginPath(); ell(ctx, 80, hy + 6, 6, 5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (const k of [-6, 2, 10]) { ctx.beginPath(); ctx.moveTo(66, hy + 8); ctx.lineTo(108, hy + k * 1.6); ctx.stroke(); }
  // hats
  if (o.hat === 'khan') shape(ctx, C.ink, () => { ell(ctx, -2, hy - 26, 32, 14); });
  if (o.hat === 'groom') { shape(ctx, C.red, () => { ctx.rect(-26, hy - 66, 50, 40); }); shape(ctx, C.yellow, () => { ctx.rect(-34, hy - 30, 66, 10); }, 4); }
  if (o.hat === 'bride') shape(ctx, C.yellow, () => { ell(ctx, 0, hy - 30, 70, 14); });
  // arms + held item
  shape(ctx, robe, () => { ell(ctx, 40, -robeH * .62, 14, 30, -.9); }, 4);
  if (o.hold === 'incense') { ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(56, -robeH * .72); ctx.lineTo(80, -robeH - 40); ctx.stroke(); smoke(ctx, 80, -robeH - 46, .7); }
  if (o.hold === 'list') shape(ctx, C.white, () => { ctx.rect(52, -robeH * .9, 40, 70); }, 3);
  if (o.hold === 'fan') shape(ctx, C.yellow, () => { ctx.moveTo(56, -robeH * .7); ctx.arc(56, -robeH * .7, 50, -1.9, -1, false); ctx.closePath(); }, 4);
  ctx.restore();
}

/** Big folk-print cat (Ông Mèo or a scout). */
export function cat(ctx, x, y, s = 1, dir = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  const fur = o.fur ?? '#2a221c';
  shape(ctx, fur, () => { ctx.moveTo(-160, 0); ctx.quadraticCurveTo(-190, -180, -60, -230); ctx.quadraticCurveTo(80, -250, 120, -150); ctx.quadraticCurveTo(150, -60, 120, 0); ctx.closePath(); });
  // tail
  ctx.beginPath(); ctx.moveTo(-150, -20); ctx.bezierCurveTo(-260, -30, -250, -200, -200, -230); ctx.lineWidth = 34; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = 24; ctx.strokeStyle = fur; ctx.stroke();
  // stripes
  ctx.strokeStyle = o.stripe ?? '#c07a2a'; ctx.lineWidth = 8; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-120 + i * 40, -200 + i * 6); ctx.quadraticCurveTo(-110 + i * 40, -150, -128 + i * 40, -110); ctx.stroke(); }
  // head
  shape(ctx, fur, () => { ctx.moveTo(40, -230); ctx.lineTo(60, -330); ctx.lineTo(100, -270); ctx.quadraticCurveTo(140, -280, 170, -270); ctx.lineTo(200, -330); ctx.lineTo(210, -240); ctx.quadraticCurveTo(240, -170, 160, -140); ctx.quadraticCurveTo(70, -130, 40, -230); });
  for (const ex of [110, 175]) { ctx.fillStyle = '#e8f060'; ctx.beginPath(); ell(ctx, ex, -220, 16, 12); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillRect(ex - 3, -232, 6, 24); }
  ctx.fillStyle = C.pink; ctx.beginPath(); ctx.moveTo(140, -190); ctx.lineTo(152, -190); ctx.lineTo(146, -182); ctx.fill();
  if (o.fangs) { ctx.fillStyle = C.white; for (const fx of [128, 160]) { ctx.beginPath(); ctx.moveTo(fx, -168); ctx.lineTo(fx + 8, -168); ctx.lineTo(fx + 4, -146); ctx.fill(); } }
  ctx.strokeStyle = C.white; ctx.lineWidth = 2; for (const k of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(175, -180); ctx.lineTo(240, -185 + k * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(115, -180); ctx.lineTo(60, -185 + k * 2); ctx.stroke(); }
  // red wedding scarf
  shape(ctx, C.red, () => { ctx.moveTo(60, -150); ctx.quadraticCurveTo(130, -120, 200, -160); ctx.lineTo(205, -140); ctx.quadraticCurveTo(130, -100, 58, -130); ctx.closePath(); }, 4);
  // paws
  shape(ctx, fur, () => { ell(ctx, 60, -6, 40, 14); }); shape(ctx, fur, () => { ell(ctx, 130, -6, 40, 14); });
  ctx.restore();
}

export function moon(ctx, x, y, r = 70) { ctx.save(); ctx.fillStyle = C.white; ctx.beginPath(); ell(ctx, x, y, r, r); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore(); }

export function smoke(ctx, x, y, s = 1) {
  ctx.save(); ctx.strokeStyle = 'rgba(40,36,30,.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - 20 * s, y - 40 * s, x + 30 * s, y - 70 * s, x, y - 120 * s); ctx.bezierCurveTo(x - 25 * s, y - 150 * s, x + 20 * s, y - 180 * s, x + 6 * s, y - 210 * s); ctx.stroke(); ctx.restore();
}

export function banyan(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, C.brown, () => { ctx.moveTo(-60, 0); ctx.quadraticCurveTo(-30, -150, -70, -300); ctx.lineTo(70, -300); ctx.quadraticCurveTo(30, -150, 70, 0); ctx.closePath(); });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-160 + i * 40, -300); ctx.quadraticCurveTo(-150 + i * 40, -150, -165 + i * 42, 0); ctx.stroke(); }
  const rnd = mulberry32(7);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI, rx = 260 * Math.cos(a), ry = -330 - 150 * Math.sin(a) + rnd() * 30; shape(ctx, i % 2 ? C.green : '#3d6430', () => { ell(ctx, rx, ry, 110, 70); }, 4); }
  ctx.restore();
}

export function house(ctx, x, y, s = 1, dark = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, '#cbbd9a', () => { ctx.rect(-220, -170, 440, 170); });
  shape(ctx, dark ? C.ink : C.yellow, () => { ctx.rect(-60, -130, 120, 130); });
  for (const wx of [-170, 110]) shape(ctx, C.ink, () => { ctx.rect(wx, -120, 60, 60); });
  shape(ctx, '#6a4030', () => { ctx.moveTo(-290, -150); ctx.quadraticCurveTo(-240, -170, -200, -270); ctx.lineTo(200, -270); ctx.quadraticCurveTo(240, -170, 290, -150); ctx.quadraticCurveTo(0, -190, -290, -150); });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.moveTo(-200 + i * 21, -265); ctx.lineTo(-250 + i * 26, -160); ctx.stroke(); }
  shape(ctx, '#6a4030', () => { ctx.moveTo(-300, -250); ctx.quadraticCurveTo(-260, -270, -230, -300); ctx.lineTo(-200, -270); ctx.closePath(); }, 4);
  shape(ctx, '#6a4030', () => { ctx.moveTo(300, -250); ctx.quadraticCurveTo(260, -270, 230, -300); ctx.lineTo(200, -270); ctx.closePath(); }, 4);
  ctx.restore();
}

export function lantern(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, -40); ctx.stroke();
  shape(ctx, C.red, () => { ell(ctx, 0, 0, 34, 42); }); shape(ctx, C.yellow, () => { ctx.rect(-16, -46, 32, 8); ctx.rect(-16, 38, 32, 8); }, 3);
  ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(0, 76); ctx.stroke(); ctx.restore();
}

export function shrine(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, '#9a8a70', () => { ctx.rect(-150, -40, 300, 40); });
  shape(ctx, '#c9b894', () => { ctx.rect(-110, -200, 220, 160); });
  shape(ctx, C.red, () => { ctx.rect(-50, -170, 100, 130); });
  shape(ctx, '#6a4030', () => { ctx.moveTo(-170, -190); ctx.quadraticCurveTo(-120, -210, -100, -270); ctx.lineTo(100, -270); ctx.quadraticCurveTo(120, -210, 170, -190); ctx.closePath(); });
  shape(ctx, C.yellow, () => { ell(ctx, 0, -60, 26, 12); }, 3); smoke(ctx, -8, -66, .6); smoke(ctx, 10, -66, .5);
  ctx.restore();
}

export function altar(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, C.red, () => { ctx.rect(-300, -260, 600, 40); });
  for (const lx of [-280, 260]) shape(ctx, C.red, () => { ctx.rect(lx, -220, 20, 220); });
  shape(ctx, C.yellow, () => { ctx.rect(-300, -226, 600, 12); }, 3);
  for (const cx of [-230, 230]) { shape(ctx, C.red, () => { ctx.rect(cx - 10, -360, 20, 100); }, 3); shape(ctx, C.yellow, () => { ell(ctx, cx, -378, 9, 18); }, 2); }
  shape(ctx, C.yellow, () => { ell(ctx, 0, -280, 50, 22); }, 4); smoke(ctx, -10, -300, .8); smoke(ctx, 12, -300, .7);
  chicken(ctx, 140, -268, .8);
  shape(ctx, '#3f6a2e', () => { ctx.rect(-170, -300, 70, 40); }, 4); // bánh chưng
  ctx.restore();
}

export function chicken(ctx, x, y, s = 1, thread = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, C.white, () => { ell(ctx, 0, 6, 90, 16); }, 4);
  shape(ctx, '#e6b448', () => { ctx.moveTo(-70, 0); ctx.quadraticCurveTo(-80, -70, -10, -80); ctx.quadraticCurveTo(60, -80, 70, -30); ctx.quadraticCurveTo(80, 0, -70, 0); });
  shape(ctx, '#e6b448', () => { ctx.moveTo(-60, -40); ctx.quadraticCurveTo(-110, -90, -90, -130); ctx.quadraticCurveTo(-60, -120, -40, -60); });
  shape(ctx, C.red, () => { ctx.moveTo(-98, -132); ctx.lineTo(-90, -150); ctx.lineTo(-80, -134); ctx.closePath(); }, 3);
  if (thread) { ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-70, -70); ctx.quadraticCurveTo(-50, -40, -40, -66); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-50, -55); ctx.lineTo(-30, -10); ctx.stroke(); }
  ctx.restore();
}

export function fish(ctx, x, y, s = 1, yellowEye = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, '#b8c8c8', () => { ctx.moveTo(-90, 0); ctx.quadraticCurveTo(0, -60, 90, 0); ctx.quadraticCurveTo(0, 60, -90, 0); });
  shape(ctx, '#b8c8c8', () => { ctx.moveTo(-80, 0); ctx.lineTo(-130, -36); ctx.lineTo(-130, 36); ctx.closePath(); });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-30 + i * 18, 0, 14, -1, 1); ctx.stroke(); }
  if (yellowEye) { ctx.fillStyle = '#f0d040'; ctx.beginPath(); ell(ctx, 56, -6, 13, 13); ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillRect(53, -16, 6, 20); }
  else { ctx.fillStyle = C.ink; ctx.beginPath(); ell(ctx, 56, -6, 6, 6); ctx.fill(); }
  ctx.restore();
}

/** Flooded rice field: water bands, dykes, rice tufts. */
export function paddies(ctx, horizon = 560) {
  ctx.save();
  ctx.fillStyle = '#3e5a66'; ctx.fillRect(40, horizon, W - 80, H - 40 - horizon);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, horizon); ctx.lineTo(W - 40, horizon); ctx.stroke();
  const dyke = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineWidth = 22; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = 14; ctx.strokeStyle = '#6a7a3a'; ctx.stroke(); };
  dyke([[800, horizon], [800, H - 40]]); dyke([[40, horizon + 120], [W - 40, horizon + 140]]); dyke([[1180, horizon], [1300, H - 40]]);
  ctx.strokeStyle = 'rgba(240,240,220,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 26; i++) { const y = horizon + 20 + i * 12; ctx.beginPath(); ctx.moveTo(60 + (i * 97) % 500, y); ctx.lineTo(160 + (i * 97) % 500, y); ctx.stroke(); }
  ctx.strokeStyle = '#4b7436'; ctx.lineWidth = 3;
  for (let i = 0; i < 90; i++) { const x = 80 + (i * 173) % (W - 160), y = horizon + 30 + (i * 59) % (H - horizon - 90); if (Math.abs(x - 800) < 30) continue;
    for (const d of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + d, y - 20, x + d * 2, y - 34); ctx.stroke(); } }
  ctx.restore();
}

export function heron(ctx, x, y, s = 1, dir = 1, strike = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; for (const lx of [-14, 14]) { ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx * .6, -200); ctx.stroke(); }
  shape(ctx, C.white, () => { ctx.moveTo(-90, -230); ctx.quadraticCurveTo(-60, -300, 30, -290); ctx.quadraticCurveTo(80, -270, 60, -220); ctx.quadraticCurveTo(0, -190, -90, -230); });
  if (strike) shape(ctx, C.white, () => { ctx.moveTo(40, -280); ctx.lineTo(220, -230); ctx.lineTo(214, -214); ctx.lineTo(30, -255); ctx.closePath(); });
  else { ctx.lineWidth = 22; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(40, -270); ctx.bezierCurveTo(110, -320, 0, -370, 70, -420); ctx.stroke(); ctx.lineWidth = 14; ctx.strokeStyle = C.white; ctx.stroke(); }
  const hx = strike ? 220 : 70, hy = strike ? -226 : -425;
  shape(ctx, C.white, () => { ell(ctx, hx, hy, 22, 16); }, 4);
  shape(ctx, C.yellow, () => { ctx.moveTo(hx + 16, hy - 6); ctx.lineTo(hx + 110, hy + 4); ctx.lineTo(hx + 16, hy + 8); ctx.closePath(); }, 3);
  ctx.fillStyle = C.ink; ctx.beginPath(); ell(ctx, hx + 6, hy - 4, 4, 4); ctx.fill();
  ctx.restore();
}

/** Ma trơi: a green ghost fire. */
export function wisp(ctx, x, y, r = 40) {
  ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, 'rgba(230,255,240,1)'); g.addColorStop(.2, 'rgba(120,240,200,.8)'); g.addColorStop(1, 'rgba(60,200,170,0)');
  ctx.fillStyle = g; ctx.beginPath(); ell(ctx, x, y, r * 2.4, r * 2.4); ctx.fill();
  ctx.fillStyle = 'rgba(160,255,220,.9)'; ctx.beginPath(); ctx.moveTo(x - r * .5, y); ctx.quadraticCurveTo(x, y - r * 2, x + r * .5, y); ctx.quadraticCurveTo(x, y + r * .5, x - r * .5, y); ctx.fill();
  ctx.restore();
}

/** Bamboo fish trap (lờ). */
export function trap(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, '#b8a060', () => { ctx.moveTo(-160, -60); ctx.lineTo(140, -25); ctx.lineTo(140, 25); ctx.lineTo(-160, 60); ctx.closePath(); });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) { const xx = -150 + i * 34, hh = 58 - i * 3.6; ctx.beginPath(); ctx.moveTo(xx, -hh); ctx.lineTo(xx, hh); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-160, 0); ctx.lineTo(140, 0); ctx.stroke();
  ctx.restore();
}

/** Betel quid folded like phoenix wings (trầu têm cánh phượng). */
export function betel(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, '#4b7436', () => { ctx.moveTo(0, 60); ctx.quadraticCurveTo(-90, 0, -40, -70); ctx.quadraticCurveTo(0, -30, 0, 60); });
  shape(ctx, '#5a8a40', () => { ctx.moveTo(0, 60); ctx.quadraticCurveTo(90, 0, 40, -70); ctx.quadraticCurveTo(0, -30, 0, 60); });
  shape(ctx, C.red, () => { ctx.rect(-8, 30, 16, 40); }, 3);
  ctx.restore();
}

export function ground(ctx, y, color = '#8a7a52') { ctx.save(); ctx.fillStyle = color; ctx.fillRect(40, y, W - 80, H - 40 - y); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke(); ctx.restore(); }

/** Little woodblock "list" of the four tributes. */
export function tributeList(ctx, x, y) {
  ctx.save(); shape(ctx, C.white, () => { ctx.rect(x, y, 260, 330); }, 5);
  ctx.fillStyle = C.ink; ctx.font = '700 44px "Cormorant Garamond"';
  ['Gà · 雞', 'Cá · 魚', 'Trầu · 蔞', 'Rượu · 酒'].forEach((s, i) => ctx.fillText(s, x + 28, y + 70 + i * 70));
  ctx.restore();
}
