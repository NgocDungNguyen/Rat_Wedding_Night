// The creature: a hunched, long-armed wolf-thing wearing a torn red wedding sash
import * as THREE from 'three';
import * as L from './lib.js';

function furGeo(detail = 3, spike = .18, seed = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = L.fbm2(v.x * 3 + seed * 10, v.y * 3 + v.z * 2.3, 3), s = Math.pow(L.hash1(i * 1.37 + seed), 6);
    v.multiplyScalar(1 + (n - .5) * .25 + s * spike); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}

export function buildCreature(scene, T) {
  const fur = new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 1, flatShading: true });
  const skin = new THREE.MeshStandardMaterial({ color: 0x241a16, roughness: .8 });
  const bone = new THREE.MeshStandardMaterial({ color: 0x9a9080, roughness: .5 });
  const red = new THREE.MeshStandardMaterial({ map: T.red, roughness: .8, side: THREE.DoubleSide });
  const part = (geo, mat, sx, sy, sz, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; return m; };
  const G = furGeo(3, .1, 1), G2 = furGeo(3, .15, 2);
  const C = new THREE.Group(); C.name = 'creature';
  const hips = new THREE.Group(); hips.position.y = 1.05; C.add(hips);
  hips.add(part(G, fur, .3, .26, .25));
  const torso = new THREE.Group(); hips.add(torso);
  torso.add(part(G, fur, .42, .55, .36, 0, .45, .05));
  const chest = new THREE.Group(); chest.position.set(0, .9, .12); torso.add(chest);
  chest.add(part(G2, fur, .62, .36, .44));
  // red sash: two torn ribbons
  const rg = new THREE.PlaneGeometry(.16, 1.0, 1, 10); rg.translate(0, -.5, 0);
  const sash = [];
  for (const sx of [-1, 1]) { const s = new THREE.Mesh(rg, red); s.position.set(sx * .22, .12, .43); s.rotation.set(-.25, 0, sx * .25); chest.add(s); sash.push(s); }
  const knot = part(new THREE.SphereGeometry(.1, 8, 6), red, 1.4, .8, .8, 0, .1, .45); chest.add(knot);
  // head
  const neck = new THREE.Group(); neck.position.set(0, .28, .3); chest.add(neck);
  neck.add(part(G, fur, .17, .2, .22, 0, .05, .08));
  const head = new THREE.Group(); head.position.set(0, .18, .26); neck.add(head);
  head.add(part(G, fur, .22, .22, .24));
  head.add(part(G, skin, .11, .1, .22, 0, -.03, .26));
  const jaw = new THREE.Group(); jaw.position.set(0, -.09, .08); head.add(jaw);
  jaw.add(part(G, skin, .1, .05, .22, 0, -.02, .18));
  const teeth = [];
  for (let i = 0; i < 7; i++) { const a = (i / 6 - .5) * 1.3;
    const tU = part(new THREE.ConeGeometry(.012, .07, 4), bone, 1, 1, 1, Math.sin(a) * .09, -.08, .3 + Math.cos(a) * .12); tU.rotation.x = Math.PI; head.add(tU);
    const tL = part(new THREE.ConeGeometry(.011, .06, 4), bone, 1, 1, 1, Math.sin(a) * .085, .02, .2 + Math.cos(a) * .11); jaw.add(tL); teeth.push(tU, tL); }
  for (const sx of [-1, 1]) { const e = part(new THREE.ConeGeometry(.07, .3, 5), fur, 1, 1, 1, sx * .14, .22, -.04); e.rotation.set(-.3, 0, -sx * .35); head.add(e); }
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 4.2, 1.2) });
  const glowMat = new THREE.SpriteMaterial({ map: T.softClean, color: 0xffa040, opacity: .9, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, fog: false });
  const eyes = [];
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.032, 10, 8), eyeMat); e.position.set(sx * .095, .045, .21); head.add(e);
    const gl = new THREE.Sprite(glowMat); gl.scale.set(.32, .32, 1); e.add(gl); eyes.push(e); }
  // arms
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * .55, .05, .05); chest.add(sh);
    sh.add(part(G, fur, .13, .36, .14, 0, -.32, 0));
    const el = new THREE.Group(); el.position.y = -.66; sh.add(el);
    el.add(part(G, fur, .1, .36, .1, 0, -.33, 0));
    const hand = new THREE.Group(); hand.position.y = -.68; el.add(hand);
    hand.add(part(G, skin, .09, .11, .05, 0, -.06, 0));
    for (let k = 0; k < 4; k++) { const c = part(new THREE.ConeGeometry(.012, .16, 4), bone, 1, 1, 1, (k - 1.5) * .04, -.22, .02); c.rotation.x = Math.PI + .3; hand.add(c); }
    arms.push({ sh, el, hand, sx });
  }
  // legs (digitigrade)
  const legs = [];
  for (const sx of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(sx * .2, -.05, 0); hips.add(hp);
    hp.add(part(G, fur, .16, .3, .17, 0, -.25, .04));
    const kn = new THREE.Group(); kn.position.set(0, -.5, .08); hp.add(kn);
    kn.add(part(G, fur, .09, .26, .09, 0, -.22, -.04));
    const an = new THREE.Group(); an.position.set(0, -.45, -.1); kn.add(an);
    an.add(part(G, skin, .07, .05, .2, 0, -.02, .1));
    legs.push({ hp, kn, an, sx });
  }
  scene.add(C);
  C.userData = { hips, torso, chest, neck, head, jaw, eyes, arms, legs, sash, teeth };
  return C;
}

// pose: {mode:'idle'|'run'|'lean'|'crouch', t, phase, amt, jaw, blink, look}
export function poseCreature(C, p) {
  const u = C.userData, t = p.t, br = Math.sin(t * 2.1);
  const A = (g, x = 0, y = 0, z = 0) => g.rotation.set(x, y, z);
  u.hips.position.y = 1.05; A(u.hips); A(u.torso, .55 + br * .02); A(u.chest, .15); A(u.neck, -.45); A(u.head, -.1 + (p.look || 0) * 0, (p.look || 0), Math.sin(t * .7) * .12);
  A(u.jaw, (p.jaw || 0) * .7);
  u.arms.forEach(a => { A(a.sh, -.7 + br * .03, 0, a.sx * .12); A(a.el, -.4); A(a.hand, .3); });
  u.legs.forEach(l => { A(l.hp, -.35); A(l.kn, .75); A(l.an, -.45); });
  if (p.mode === 'run') {
    const ph = p.phase * Math.PI * 2;
    u.hips.position.y = .9 + Math.abs(Math.sin(ph)) * .12; A(u.torso, 1.05 + Math.sin(ph * 2) * .06); A(u.neck, -.9); A(u.head, -.25, 0, 0);
    u.legs.forEach((l, i) => { const s = Math.sin(ph + i * Math.PI); A(l.hp, -.4 + s * .9); A(l.kn, .9 - Math.min(0, s) * .9); A(l.an, -.5 + s * .3); });
    u.arms.forEach((a, i) => { const s = Math.sin(ph + i * Math.PI + Math.PI); A(a.sh, -1.3 + s * 1.0, 0, a.sx * .25); A(a.el, -.3 - Math.max(0, s) * .6); });
    A(u.jaw, .35 + .15 * Math.sin(ph * 2));
  }
  if (p.mode === 'lean') {
    const k = p.amt || 0;
    A(u.torso, .55 + k * .75); A(u.neck, -.45 - k * .55); A(u.head, -.1 - k * .15, p.look || 0, Math.sin(t * .7) * .12 + k * .25);
    u.arms.forEach(a => { A(a.sh, -.7 - k * .9, 0, a.sx * (.12 + k * .4)); A(a.el, -.4 - k * .6); });
    u.legs.forEach(l => { A(l.hp, -.35 - k * .5); A(l.kn, .75 + k * .5); });
    u.hips.position.y = 1.05 - k * .2;
  }
  if (p.mode === 'crouch') {
    u.hips.position.y = .62; A(u.torso, 1.0 + br * .02); A(u.neck, -1.0); A(u.head, -.2 + (p.tilt || 0), p.look || 0, (p.roll || 0));
    u.legs.forEach(l => { A(l.hp, -1.4); A(l.kn, 2.0); A(l.an, -.9); });
    u.arms.forEach(a => { A(a.sh, -1.5, 0, a.sx * .3); A(a.el, -.2); });
  }
  const bl = p.blink ? Math.max(.08, 1 - p.blink) : 1;
  u.eyes.forEach(e => e.scale.set(1, bl, 1));
  u.sash.forEach((s, i) => { s.rotation.x = -.25 - (p.mode === 'run' ? .9 + .2 * Math.sin(t * 13 + i) : .05 * Math.sin(t * 2 + i)); });
}
