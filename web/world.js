// Builds the night village: fields, dykes, bamboo, gate, houses, banyan, wedding tent, lights
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as L from './lib.js';
const { rand, R } = L;

export const U = { uTime: { value: 0 }, uWind: { value: 1 } };
export const MOON_DIR = new THREE.Vector3(Math.sin(0.21), Math.sin(0.26), -Math.cos(0.21)).normalize();
export const MOONLIGHT_DIR = new THREE.Vector3(Math.sin(0.5) * .6, .78, -Math.cos(0.5) * .6).normalize();

function sway(mat, amt, instY = false) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(0.);
      #ifdef USE_INSTANCING
        ip = instanceMatrix[3].xyz;
      #endif
      float hh = ${instY ? 'max(ip.y, 0.) * 0.11 + position.y * 0.12' : 'max(position.y, 0.)'};
      float ph = uTime * 1.6 + ip.x * .37 + ip.z * .23;
      float a = ${amt.toFixed(4)} * uWind;
      transformed.x += (sin(ph) + .35 * sin(ph * 2.7 + 1.3)) * hh * hh * a;
      transformed.z += cos(ph * .83) * hh * hh * a * .6;`);
  };
  mat.customProgramCacheKey = () => 'sway' + amt + instY;
  return mat;
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), E = new THREE.Euler();
function mtx(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  E.set(rx, ry, rz); Q.setFromEuler(E); return new THREE.Matrix4().compose(V.set(x, y, z).clone(), Q.clone(), SC.set(sx, sy, sz).clone());
}
function inst(geo, mat, mats, shadow = false) {
  const m = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((x, i) => m.setMatrixAt(i, x)); m.instanceMatrix.needsUpdate = true;
  m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; return m;
}
function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; return m; }
const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .9, metalness: 0 }, o));

export function buildWorld(scene) {
  const W = {}; W.updaters = [];
  // ---------- textures & shared materials
  const T = {
    plaster: L.plasterTex(), plasterW: L.plasterTex([205, 200, 188]), tile: L.tileTex(), brick: L.brickTex(), dirt: L.dirtTex(),
    grass: L.grassDirtTex(), wood: L.woodTex(), red: L.fabricTex([150, 14, 22]), redDark: L.fabricTex([95, 8, 14]),
    bamboo: L.bambooLeafTex(), banyan: L.banyanLeafTex(), banana: L.bananaLeafTex(), soft: L.softTex(256, true),
    softClean: L.softTex(128, false), moon: L.moonTex(), waterN: L.waterNormalTex(), lantern: L.lanternTex(),
  };
  W.T = T;
  const MAT = {
    plaster: std({ map: T.plaster }), plasterW: std({ map: T.plasterW }), tile: std({ map: T.tile, roughness: .8 }),
    brick: std({ map: T.brick }), wood: std({ map: T.wood, roughness: .85 }), dark: std({ color: 0x0c0a08 }),
    red: std({ map: T.red, roughness: .8, side: THREE.DoubleSide }), redDark: std({ map: T.redDark, side: THREE.DoubleSide }),
    white: std({ color: 0xe8e2da, roughness: .7, side: THREE.DoubleSide }), pink: std({ color: 0xe0a0b4, roughness: .7 }),
    gold: std({ color: 0xc9a040, metalness: .7, roughness: .35 }), straw: std({ color: 0x7a6a40 }),
  };
  W.MAT = MAT;

  // ---------- sky, moon, stars
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { moonDir: { value: MOON_DIR } },
    vertexShader: `varying vec3 vd; void main(){ vd = normalize((modelMatrix*vec4(position,1.)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 moonDir; varying vec3 vd;
      void main(){ float e = clamp(vd.y, -0.2, 1.); vec3 hor = vec3(.045,.06,.095), zen = vec3(.004,.008,.02);
        vec3 c = mix(hor, zen, pow(max(e,0.), .45)); float m = max(dot(normalize(vd), moonDir), 0.);
        c += vec3(.12,.14,.2) * pow(m, 40.) + vec3(.03,.04,.06) * pow(m, 4.);
        c *= smoothstep(-.2, .02, e) * .7 + .3; gl_FragColor = vec4(c, 1.); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 32, 16), skyMat); sky.frustumCulled = false; scene.add(sky); W.sky = sky;
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.moon, color: new THREE.Color(1.5, 1.5, 1.45), fog: false, depthWrite: false, transparent: true }));
  moon.scale.set(80, 80, 1); scene.add(moon); W.moon = moon;
  { const n = 1600, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const th = rand(0, 6.283), y = Math.pow(R(), .7) * .95 + .03, r = Math.sqrt(1 - y * y);
      p.set([Math.cos(th) * r * 900, y * 900, Math.sin(th) * r * 900], i * 3); const b = rand(.25, 1) ** 2; c.set([b * .85, b * .9, b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true }));
    st.frustumCulled = false; scene.add(st); W.stars = st; }
  W.clouds = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: 0x2a3348, opacity: rand(.35, .6), fog: false, depthWrite: false, transparent: true }));
    c.scale.set(rand(260, 420), rand(40, 70), 1); c.userData.ph = rand(0, 1); scene.add(c); W.clouds.push(c);
  }

  // ---------- ground: village floor, water fields, dykes
  const vg = mesh(new THREE.PlaneGeometry(240, 140), std({ map: T.grass }), 0, 0, -50, false); vg.rotation.x = -Math.PI / 2;
  T.grass.repeat.set(60, 35); scene.add(vg);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x03060a, metalness: .9, roughness: .2, normalMap: T.waterN, normalScale: new THREE.Vector2(.18, .18), envMapIntensity: .55 });
  const water = mesh(new THREE.PlaneGeometry(500, 300), waterMat, 0, -0.38, 170, false); water.rotation.x = -Math.PI / 2; scene.add(water); W.water = water; W.waterMat = waterMat;
  const mud = mesh(new THREE.PlaneGeometry(500, 300), std({ color: 0x0d0b08 }), 0, -0.6, 170, false); mud.rotation.x = -Math.PI / 2; scene.add(mud);
  const bank = mesh(new THREE.BoxGeometry(240, 0.6, 3), std({ map: T.grass }), 0, -0.3, 20.5, false); scene.add(bank);
  function dyke(x, z0, z1, top = 2.2, bot = 3.6, h = .62, y0 = -.62) {
    const s = new THREE.Shape(); s.moveTo(-bot / 2, 0); s.lineTo(bot / 2, 0); s.lineTo(top / 2, h); s.lineTo(-top / 2, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false }); g.translate(0, y0, z0);
    const tx = T.grass.clone(); tx.repeat.set(.4, .4); tx.needsUpdate = true;
    const m = mesh(g, std({ map: tx }), x, 0, 0, false); scene.add(m);
    const path = mesh(new THREE.PlaneGeometry(top * .55, z1 - z0), std({ map: T.dirt }), x, .005, (z0 + z1) / 2, false); path.rotation.x = -Math.PI / 2;
    const dt = T.dirt.clone(); dt.repeat.set(1, (z1 - z0) / 3); dt.needsUpdate = true; path.material.map = dt; scene.add(path);
  }
  dyke(0, 19, 260); dyke(-30, 19, 260);
  for (let z = 45; z < 260; z += 25) { const g = new THREE.BoxGeometry(200, .25, .7); const m = mesh(g, std({ map: T.grass }), 0, -.3, z, false); scene.add(m); }

  // ---------- rice
  { const blades = [];
    for (let i = 0; i < 6; i++) { const g = new THREE.BufferGeometry(); const a = i / 6 * Math.PI * 2 + rand(-.3, .3), tl = rand(.12, .32), h = rand(.42, .6);
      const ox = Math.cos(a) * tl, oz = Math.sin(a) * tl, px = -Math.sin(a) * .018, pz = Math.cos(a) * .018;
      g.setAttribute('position', new THREE.Float32BufferAttribute([-px, 0, -pz, px, 0, pz, ox, h, oz], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); blades.push(g); }
    const clump = mergeGeometries(blades);
    const mats = [];
    for (const x0 of [0, -30]) for (let z = 21; z < 125; z += .55) { if ((z - 45 + 25) % 25 < .9) continue;
      for (let dx = 1.9; dx < 12.5; dx += .58) for (const s of [-1, 1]) {
        if (x0 === -30 && s === 1 && dx > 13) continue;
        mats.push(mtx(x0 + s * dx + rand(-.06, .06), -.38, z + rand(-.06, .06), 0, rand(0, 6.28), 0, rand(.8, 1.25), rand(.8, 1.3), rand(.8, 1.25))); }
    }
    const rm = sway(new THREE.MeshLambertMaterial({ color: 0x2c4a20, side: THREE.DoubleSide }), .18);
    scene.add(inst(clump, rm, mats)); W.riceCount = mats.length; }

  // ---------- tombs in the paddies
  for (const [x, z, r] of [[7, 62, .2], [-10, 78, -.3], [12.5, 90, .1], [-6.5, 54, .5], [-24, 66, 0], [-38, 84, .3]]) {
    const g = new THREE.Group(); g.position.set(x, -.38, z); g.rotation.y = r;
    const mound = mesh(new THREE.SphereGeometry(1.6, 16, 8), std({ map: T.grass }), 0, -.6, 0); mound.scale.set(1, .55, 1.2); g.add(mound);
    g.add(mesh(new THREE.BoxGeometry(1.1, .5, 1.9), MAT.plasterW, 0, .45, 0)); g.add(mesh(new THREE.BoxGeometry(.7, .95, .14), MAT.plasterW, 0, .9, -.9));
    g.add(mesh(new THREE.CylinderGeometry(.12, .1, .18, 10), std({ color: 0x5a4a30 }), 0, .78, -.7)); scene.add(g);
  }

  // ---------- bamboo
  const BS = { near: [[], []], far: [[], []] }; let bset = BS.near;
  function clump(cx, cz, n = 10, hmin = 7, hmax = 11) {
    const [stalkM, leafM] = bset;
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.28), r = rand(0, .7), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = rand(hmin, hmax), lean = rand(.08, .3);
      const rx = Math.sin(a) * lean, rz = -Math.cos(a) * lean;
      stalkM.push(mtx(x, 0, z, rx, 0, rz, rand(.8, 1.2), h, rand(.8, 1.2)));
      const dir = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rx, 0, rz)), out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const nl = bset === BS.far ? 5 : 10;
      for (let k = 0; k < nl; k++) { const f = rand(.35, 1.05); const p = dir.clone().multiplyScalar(h * f).addScaledVector(out, Math.pow(f, 2) * h * .25);
        p.y -= Math.pow(f, 3) * h * .12;
        leafM.push(mtx(x + p.x + rand(-1, 1), p.y + rand(-.7, .5), z + p.z + rand(-1, 1), rand(0, 6.28), rand(0, 6.28), rand(0, 6.28), rand(1.6, 2.7), rand(1.6, 2.7), 1)); }
    }
  }
  for (let x = -75; x <= 60; x += 2.6) { if (Math.abs(x) < 5.2 || Math.abs(x + 30) < 4.6) continue; clump(x + rand(-.4, .4), 17.3 + rand(-1.2, 1.2), 9); if (R() < .6) clump(x + rand(-1, 1), 14 + rand(-1, 1), 6, 6, 9); }
  for (let z = -100; z < 12; z += 4.5) { clump(-55 + rand(-2, 2), z, 8); clump(25 + rand(-2, 2), z, 8); }
  for (let x = -55; x < 25; x += 4) clump(x, -96 + rand(-2, 2), 8);
  for (const [x, z] of [[-17, 9], [17, -6], [-16, -36], [16, -38], [-17, -52], [16.5, -22], [-40, -30], [-41, -8], [-22, -88], [-12, -92], [-41, -66], [-24, 6], [-20, -26], [9, -60], [-9, -60]]) clump(x, z, 9);
  bset = BS.far;
  for (let x = -220; x < 220; x += 4.5) clump(x + rand(-1, 1), 205 + rand(-6, 6), 5, 8, 13);
  for (let z = 30; z < 200; z += 5) { clump(-95 + rand(-3, 3), z, 5, 8, 12); clump(70 + rand(-3, 3), z, 5, 8, 12); }
  const stalkGeo = new THREE.CylinderGeometry(.045, .06, 1, 5, 6, true); stalkGeo.translate(0, .5, 0);
  const stalkMat = sway(std({ color: 0x55633a, roughness: .7 }), .22), leafMat = sway(new THREE.MeshLambertMaterial({ map: T.bamboo, alphaTest: .45, side: THREE.DoubleSide }), .22, true);
  for (const [k, cast] of [['near', true], ['far', false]]) { scene.add(inst(stalkGeo, stalkMat, BS[k][0], cast)); scene.add(inst(new THREE.PlaneGeometry(1, 1), leafMat, BS[k][1], false)); }
  W.bambooCount = [BS.near[0].length, BS.near[1].length, BS.far[1].length];

  // ---------- main village gate (cổng làng)
  { const g = new THREE.Group(); g.position.set(0, 0, 16.2);
    const s = new THREE.Shape(); s.moveTo(-2.9, 0); s.lineTo(2.9, 0); s.lineTo(2.9, 5.2); s.lineTo(-2.9, 5.2); s.closePath();
    const hole = new THREE.Path(); hole.moveTo(-1.5, 0); hole.lineTo(1.5, 0); hole.lineTo(1.5, 2.7); hole.absarc(0, 2.7, 1.5, 0, Math.PI, false); hole.lineTo(-1.5, 0); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: false }); geo.translate(0, 0, -.65);
    const pt = T.plaster.clone(); pt.repeat.set(.18, .2); pt.needsUpdate = true;
    g.add(mesh(geo, std({ map: pt })));
    for (const sx of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(1.0, 6.2, 1.0), std({ map: pt }), sx * 3.1, 3.1, 0)); g.add(mesh(new THREE.BoxGeometry(4.5, 2.6, .5), std({ map: pt }), sx * 5.6, 1.3, 0));
      g.add(mesh(new THREE.ConeGeometry(.25, .5, 4), std({ map: pt }), sx * 3.1, 6.45, 0)); }
    const roofGeo = new THREE.BoxGeometry(6.6, .16, 1.25);
    for (const sz of [-1, 1]) { const r = mesh(roofGeo, MAT.tile, 0, 5.62, sz * .42); r.rotation.x = sz * .5; g.add(r); }
    g.add(mesh(new THREE.BoxGeometry(6.9, .22, .22), MAT.tile, 0, 5.9, 0));
    for (const sx of [-1, 1]) { const c = mesh(new THREE.ConeGeometry(.12, .7, 6), MAT.tile, sx * 3.5, 6.05, 0); c.rotation.z = -sx * .9; g.add(c); }
    const plaque = mesh(new THREE.PlaneGeometry(2.6, .62), std({ map: L.textTex(['LÀNG VĂN HÓA'], { w: 1024, h: 248, font: '700 112px "Cormorant Garamond"', border: '#c9a040', age: true }), roughness: .7 }), 0, 4.55, .66, false);
    g.add(plaque); scene.add(g); W.gate = g; }
  // back gate (bamboo)
  { const g = new THREE.Group(); g.position.set(-30, 0, 16.2);
    const pole = new THREE.CylinderGeometry(.08, .09, 3.6, 7);
    for (const sx of [-1, 1]) g.add(mesh(pole, std({ color: 0x6b6a45 }), sx * 1.6, 1.8, 0));
    const bar = mesh(new THREE.CylinderGeometry(.07, .07, 3.6, 7), std({ color: 0x6b6a45 }), 0, 3.3, 0); bar.rotation.z = Math.PI / 2; g.add(bar);
    const door = new THREE.Group(); door.position.set(-1.55, 0, 0);
    for (let i = 0; i < 9; i++) door.add(mesh(new THREE.CylinderGeometry(.035, .035, 2.0, 5), std({ color: 0x5d5a3b }), .15 + i * .16, 1.1, 0));
    door.rotation.y = 1.9; g.add(door); scene.add(g); }

  // ---------- houses
  const houses = [];
  function banana(parent, x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const tr = mesh(new THREE.CylinderGeometry(.11, .16, 2.3, 8), std({ color: 0x4d5a34 }), 0, 1.15, 0); g.add(tr);
    const lg = new THREE.PlaneGeometry(.75, 2.5, 1, 8); const p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.25; p.setY(i, y); p.setZ(i, -Math.pow(y / 2.5, 2) * 1.2); }
    lg.computeVertexNormals();
    const lm = sway(new THREE.MeshLambertMaterial({ map: T.banana, alphaTest: .4, side: THREE.DoubleSide }), .03);
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(lg, lm); l.position.y = 2.2; l.rotation.set(-rand(.3, .9), i / 7 * 6.28 + rand(-.3, .3), 0, 'YXZ'); l.castShadow = true; g.add(l); }
    parent.add(g);
  }
  function areca(parent, x, z, h = 10) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const tr = mesh(new THREE.CylinderGeometry(.08, .12, h, 7), std({ color: 0x6d6a5c }), 0, h / 2, 0); tr.rotation.z = rand(-.05, .05); g.add(tr);
    const lg = new THREE.PlaneGeometry(.5, 2.6, 1, 6); const p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.3; p.setY(i, y); p.setZ(i, -Math.pow(y / 2.6, 2) * 1.6); }
    const lm = sway(new THREE.MeshLambertMaterial({ map: T.banana, alphaTest: .4, side: THREE.DoubleSide, color: 0x9ab080 }), .04);
    for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(lg, lm); l.position.y = h; l.rotation.set(-rand(.2, .7), i / 8 * 6.28, 0, 'YXZ'); l.castShadow = true; g.add(l); }
    parent.add(g);
  }
  function jar(parent, x, z, s = 1) {
    const pts = [[0, 0], [.22, 0], [.34, .15], [.4, .38], [.36, .62], [.25, .74], [.23, .8], [.26, .82], [0, .82]].map(([a, b]) => new THREE.Vector2(a * s, b * s));
    parent.add(mesh(new THREE.LatheGeometry(pts, 14), std({ color: 0x4a2e1c, roughness: .35, metalness: .1 }), x, 0, z));
  }
  function house(cx, cz, ry, seed) {
    const r = L.mulberry32(seed), g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry;
    const w = 7.5, d = 5, h = 2.9;
    const pt = T.plaster.clone(); pt.repeat.set(1.4, .9); pt.needsUpdate = true; const wallM = std({ map: pt });
    g.add(mesh(new THREE.BoxGeometry(w + .6, .35, d + 1.6), MAT.brick, 0, .17, .5));
    g.add(mesh(new THREE.BoxGeometry(w, h, d), wallM, 0, h / 2 + .3, 0));
    // gables
    const gs = new THREE.Shape(); gs.moveTo(-d / 2, 0); gs.lineTo(d / 2, 0); gs.lineTo(0, 1.6); gs.closePath();
    const gg = new THREE.ExtrudeGeometry(gs, { depth: .2, bevelEnabled: false });
    for (const sx of [-1, 1]) { const m = mesh(gg, wallM, sx * (w / 2 - .1), h + .3, 0); m.rotation.y = Math.PI / 2; g.add(m); }
    // roof
    const ridgeY = h + .3 + 1.75, fz = 3.9, bz = -3.0, eaveY = h + .05;
    for (const [z0] of [[fz], [bz]]) {
      const len = Math.hypot(z0, ridgeY - eaveY), geo = new THREE.PlaneGeometry(w + 1.1, len);
      const tt = T.tile.clone(); tt.repeat.set(3.2, len / 2.4); tt.needsUpdate = true;
      const m = mesh(geo, std({ map: tt, roughness: .8, side: THREE.DoubleSide }), 0, (ridgeY + eaveY) / 2, z0 / 2);
      m.rotation.x = z0 > 0 ? -(Math.PI / 2 - Math.atan2(ridgeY - eaveY, z0)) : (Math.PI / 2 - Math.atan2(ridgeY - eaveY, -z0));
      g.add(m);
    }
    g.add(mesh(new THREE.BoxGeometry(w + 1.3, .25, .3), MAT.tile, 0, ridgeY + .05, 0));
    for (const sx of [-1, 1]) { const c = mesh(new THREE.ConeGeometry(.1, .6, 6), MAT.tile, sx * (w / 2 + .75), ridgeY + .2, 0); c.rotation.z = -sx * .8; g.add(c); }
    // veranda columns, doors
    for (const x of [-3.3, -1.1, 1.1, 3.3]) g.add(mesh(new THREE.CylinderGeometry(.1, .11, h - .1, 8), MAT.wood, x, h / 2 + .3, 3.35));
    const dt = T.wood.clone(); dt.repeat.set(1, 1); const doorM = std({ map: dt, roughness: .85 });
    const ajar = r() < .45;
    for (const x of [-2.4, 0, 2.4]) {
      const dm = mesh(new THREE.BoxGeometry(1.9, 2.15, .08), doorM, x, 1.4, d / 2 + .02);
      if (ajar && x === 0) { dm.position.x -= .55; const glow = new THREE.Mesh(new THREE.PlaneGeometry(.35, 2.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .25, .08) })); glow.position.set(.45, 1.4, d / 2 - .02); g.add(glow); }
      g.add(dm);
    }
    // yard wall with gap
    const yw = T.brick.clone(); yw.repeat.set(1.2, .5); yw.needsUpdate = true; const ywm = std({ map: yw });
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(3.6, 1.15, .28), ywm, sx * 2.9, .57, 4.75));
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(.4, 1.5, .4), ywm, sx * 1.05, .75, 4.75));
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(.28, 1.15, 2.5), ywm, sx * 4.7, .57, 3.6));
    if (r() < .8) banana(g, -4 + r() * .6, 3.9, .8 + r() * .4);
    if (r() < .7) jar(g, 3.6, 3.4, 1); if (r() < .5) jar(g, 3.0, 3.7, .8);
    if (r() < .7) areca(g, 1 + r() * 3, -4.5, 9 + r() * 3);
    if (r() < .5) { const hs = mesh(new THREE.ConeGeometry(1.1, 2.4, 10), MAT.straw, -5.6, 1.2, -1.5); g.add(hs); }
    scene.add(g); houses.push(g); return g;
  }
  let sd = 11;
  for (const z of [6, -10, -26, -42, -55]) house(-9, z, Math.PI / 2, sd++);
  for (const z of [2, -14, -30, -46]) house(9, z, -Math.PI / 2, sd++);
  for (const x of [-14.5, -24]) house(x, -81.5, 0, sd++);
  house(-20, -66.5, Math.PI, sd++);
  for (const z of [-60, -20, 2]) house(-37.5, z, Math.PI / 2, sd++);
  for (const z of [-56, -40, -12]) house(-22.5, z, -Math.PI / 2, sd++);
  W.houses = houses;

  // ---------- lanes
  function lane(x0, x1, z0, z1, brick) {
    const t = (brick ? T.brick : T.dirt).clone(); t.repeat.set(Math.abs(x1 - x0) / (brick ? 2.2 : 3), Math.abs(z1 - z0) / (brick ? 2.2 : 3)); t.needsUpdate = true;
    const m = mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)), std({ map: t, roughness: .95 }), (x0 + x1) / 2, .012, (z0 + z1) / 2, false);
    m.rotation.x = -Math.PI / 2; scene.add(m);
  }
  lane(-2.5, 2.5, -63, 19, true); lane(-32, -6, -76.5, -71.5, false); lane(-32, -28, -76, 19, false); lane(-6, 6, -80.5, -63, false);

  // ---------- firecracker paper (pháo)
  { const mats = [];
    const spot = (cx, cz, rx, rz, n) => { for (let i = 0; i < n; i++) mats.push(mtx(cx + (R() + R() - 1) * rx, .015 + R() * .01, cz + (R() + R() - 1) * rz, -Math.PI / 2, 0, rand(0, 6.28), rand(.7, 1.3), rand(.7, 1.3), 1)); };
    spot(0, 17, 3, 5, 500); spot(0, 8, 2.2, 6, 200); spot(0, -57, 2.5, 8, 700); spot(0, -70, 1.2, 8, 250); spot(-30, 15, 2, 3, 150);
    const pm = inst(new THREE.PlaneGeometry(.05, .1), std({ color: 0xc0121c, roughness: .7, side: THREE.DoubleSide }), mats); pm.castShadow = false; scene.add(pm); }

  // ---------- banyan tree + shrine
  { const g = new THREE.Group(); g.position.set(-35.5, 0, -40);
    const barkM = std({ color: 0x3d342b, map: T.dirt });
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, r = rand(.3, .9);
      const c = mesh(new THREE.CylinderGeometry(rand(.25, .45), rand(.45, .8), rand(5, 7), 8), barkM, Math.cos(a) * r, 2.8, Math.sin(a) * r); c.rotation.set(Math.sin(a) * .12, 0, -Math.cos(a) * .12); g.add(c); }
    const leafMs = [], rootMs = [], branchMs = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + rand(-.3, .3), len = rand(5, 9), el = rand(.25, .6);
      const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const mid = dir.clone().multiplyScalar(len / 2).add(new THREE.Vector3(0, 5, 0));
      branchMs.push(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, len, 1)));
      for (let k = 0; k < 14; k++) { const f = rand(.2, 1), p = dir.clone().multiplyScalar(len * f).add(new THREE.Vector3(0, 5, 0));
        rootMs.push(mtx(p.x + rand(-.5, .5), p.y - rand(2, 4.6) / 2, p.z + rand(-.5, .5), rand(-.04, .04), 0, rand(-.04, .04), 1, rand(2, 4.6), 1)); }
    }
    for (let i = 0; i < 1100; i++) { const a = rand(0, 6.28), r = Math.sqrt(R()) * 10, y = 7 + rand(-1.5, 3.5) + (1 - r / 10) * 3;
      leafMs.push(mtx(Math.cos(a) * r, y, Math.sin(a) * r, rand(0, 6), rand(0, 6), rand(0, 6), rand(1.6, 2.8), rand(1.6, 2.8), 1)); }
    const bg = new THREE.CylinderGeometry(.18, .32, 1, 6); g.add(inst(bg, barkM, branchMs, true));
    const rg = new THREE.CylinderGeometry(.025, .02, 1, 4); g.add(inst(rg, std({ color: 0x2e271f }), rootMs, true));
    g.add(inst(new THREE.PlaneGeometry(1, 1), sway(new THREE.MeshLambertMaterial({ map: T.banyan, alphaTest: .45, side: THREE.DoubleSide }), .05, true), leafMs, true));
    for (let i = 0; i < 3; i++) { const rb = mesh(new THREE.TorusGeometry(1.25 + i * .05, .05, 6, 24), MAT.red, 0, 1.6 + i * .25, 0); rb.rotation.x = Math.PI / 2; g.add(rb); }
    // shrine
    const sh = new THREE.Group(); sh.position.set(2.0, 0, 0); sh.rotation.y = Math.PI / 2;
    sh.add(mesh(new THREE.BoxGeometry(1.0, 1.0, .8), MAT.brick, 0, .5, 0)); sh.add(mesh(new THREE.BoxGeometry(.8, .7, .6), MAT.plasterW, 0, 1.35, 0));
    sh.add(mesh(new THREE.BoxGeometry(.6, .5, .05), MAT.redDark, 0, 1.35, .31)); sh.add(mesh(new THREE.ConeGeometry(.75, .45, 4), MAT.tile, 0, 1.92, 0));
    const tips = new THREE.Group();
    for (let i = 0; i < 5; i++) { const st = mesh(new THREE.CylinderGeometry(.006, .006, .35, 3), std({ color: 0xaa3322 }), -.15 + i * .075, 1.2, .38); sh.add(st);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .8, .2) })); tip.position.set(-.15 + i * .075, 1.38, .38); tips.add(tip); }
    sh.add(tips); g.add(sh); scene.add(g); W.banyan = g; W.shrinePos = new THREE.Vector3(-33.5, 1.4, -40); }

  // ---------- wedding tent (rạp cưới)
  { const g = new THREE.Group(); scene.add(g); W.tent = g;
    const X = 6.2, Z0 = -80.2, Z1 = -63.6, eave = 3.2, ridge = 4.7;
    for (const z of [-80, -76, -72, -68, -64]) for (const sx of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(.06, .06, eave, 6), MAT.gold, sx * 6, eave / 2, z)); g.add(mesh(new THREE.CylinderGeometry(.13, .13, eave - .3, 10), MAT.white, sx * 6, eave / 2 + .1, z)); }
    for (const sx of [-1, 1]) {
      const len = Math.hypot(X, ridge - eave), geo = new THREE.PlaneGeometry(len, Z1 - Z0, 8, 32); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len + .5, v = p.getY(i); p.setZ(i, -Math.abs(Math.sin(v / 4 * Math.PI)) * .12 * Math.sin(u * Math.PI)); }
      geo.computeVertexNormals();
      const rt = T.red.clone(); rt.repeat.set(2, 4); rt.needsUpdate = true;
      const m = mesh(geo, std({ map: rt, side: THREE.DoubleSide, roughness: .85 }), sx * X / 2, (eave + ridge) / 2, (Z0 + Z1) / 2);
      m.rotation.order = 'ZXY'; m.rotation.x = -Math.PI / 2; m.rotation.z = -sx * Math.atan2(ridge - eave, X);
      g.add(m);
      const vt = L.scallopTex(); vt.repeat.set((Z1 - Z0) / 1.2, 1); vt.needsUpdate = true;
      const val = mesh(new THREE.PlaneGeometry(Z1 - Z0, .6), std({ map: vt, alphaTest: .4, side: THREE.DoubleSide, roughness: .8 }), sx * X, eave - .25, (Z0 + Z1) / 2, false); val.rotation.y = Math.PI / 2; g.add(val);
    }
    { const vt = L.scallopTex(); vt.repeat.set(10, 1); vt.needsUpdate = true;
      for (const z of [Z1, Z0]) { const v = mesh(new THREE.PlaneGeometry(2 * X, .6), std({ map: vt, alphaTest: .4, side: THREE.DoubleSide }), 0, eave - .25, z, false); g.add(v); }
      const gab = new THREE.Shape(); gab.moveTo(-X, 0); gab.lineTo(X, 0); gab.lineTo(0, ridge - eave); gab.closePath();
      const gm = mesh(new THREE.ShapeGeometry(gab), std({ map: T.red, side: THREE.DoubleSide }), 0, eave, Z1, false); g.add(gm);
      const gm2 = gm.clone(); gm2.position.z = Z0; g.add(gm2); }
    // swags
    const swM = [MAT.white, MAT.pink];
    for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) { const z = Z1 - .9 - i * 1.85;
      const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(new THREE.Vector3(sx * u * (X - .2), lerpY(u) - Math.sin(u * Math.PI) * .45, z)); }
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .07, 6), swM[i % 2], 0, 0, 0, false)); }
    function lerpY(u) { return ridge - .15 - (ridge - eave) * u; }
    // back wall + 囍
    g.add(mesh(new THREE.PlaneGeometry(2 * X, eave), std({ map: T.redDark }), 0, eave / 2, Z0 + .05, false));
    const hy = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshStandardMaterial({ map: L.textTex(['囍'], { w: 512, h: 512, bg: 'rgba(0,0,0,0)', fg: '#e8b84a', font: '700 430px "Noto Serif CJK SC"' }), transparent: true, metalness: .6, roughness: .35, emissive: 0x3a2000 }));
    hy.position.set(0, 2.15, Z0 + .08); g.add(hy); W.hy = hy;
    // red carpet
    const cp = mesh(new THREE.PlaneGeometry(1.8, Z1 - Z0), std({ map: T.redDark }), 0, .02, (Z0 + Z1) / 2, false); cp.rotation.x = -Math.PI / 2; g.add(cp);
    // altar
    const az = Z0 + 1.0;
    g.add(mesh(new THREE.BoxGeometry(2.8, .92, .95), MAT.red, 0, .46, az)); g.add(mesh(new THREE.BoxGeometry(2.85, .06, 1.0), MAT.gold, 0, .93, az));
    const candleFl = [];
    for (const sx of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(.05, .05, .42, 10), std({ color: 0xb01010 }), sx * 1.1, 1.17, az));
      const fl = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.2, .6) })); fl.scale.y = 1.8; fl.position.set(sx * 1.1, 1.43, az); g.add(fl); candleFl.push(fl); }
    W.candles = candleFl;
    g.add(mesh(new THREE.CylinderGeometry(.13, .1, .16, 12), std({ color: 0x8a6a30, metalness: .6, roughness: .4 }), 0, 1.04, az + .25));
    for (let i = 0; i < 3; i++) { g.add(mesh(new THREE.CylinderGeometry(.005, .005, .4, 3), std({ color: 0xaa3322 }), -.03 + i * .03, 1.3, az + .25));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.01, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .8, .2) })); tip.position.set(-.03 + i * .03, 1.5, az + .25); g.add(tip); }
    g.add(mesh(new THREE.CylinderGeometry(.28, .2, .05, 16), MAT.gold, -.6, .98, az));
    for (const [c, x, z] of [[0xd8b020, -.65, -.05], [0x6a9a30, -.52, .06], [0xd06018, -.7, .1], [0xb01818, -.55, -.1], [0x88aa22, -.62, .02]]) g.add(mesh(new THREE.SphereGeometry(.09, 10, 8), std({ color: c, roughness: .5 }), x, 1.08, az + z));
    W.portraits = [];
    for (const [sx, seed] of [[-1, 3], [1, 7]]) { const pg = new THREE.Group(); pg.position.set(sx * .42, 1.32, az - .2); pg.rotation.set(-.12, -sx * .12, 0);
      pg.add(mesh(new THREE.BoxGeometry(.52, .68, .04), MAT.gold));
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(.44, .58), new THREE.MeshStandardMaterial({ map: L.portraitTex(seed), roughness: .5 })); pic.position.z = .022; pg.add(pic);
      const rib = new THREE.Mesh(new THREE.PlaneGeometry(.06, .3), new THREE.MeshBasicMaterial({ color: 0x050505 })); rib.position.set(sx * .17, .23, .03); rib.rotation.z = sx * .78; pg.add(rib);
      g.add(pg); W.portraits.push(pg); }
    // tables & red plastic chairs
    const chairParts = [new THREE.BoxGeometry(.4, .04, .4).translate(0, .45, 0), new THREE.BoxGeometry(.4, .38, .03).translate(0, .66, -.19)];
    for (const [x, z] of [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]]) chairParts.push(new THREE.CylinderGeometry(.018, .022, .45, 5).translate(x, .225, z));
    const chairGeo = mergeGeometries(chairParts); const chairMs = [], plateMs = [], canMs = [];
    for (const tx of [-3.1, 3.1]) for (const tz of [-67, -71.2, -75.4]) {
      g.add(mesh(new THREE.CylinderGeometry(.88, .95, .74, 20, 1, true), std({ map: T.red, side: THREE.DoubleSide }), tx, .37, tz));
      g.add(mesh(new THREE.CylinderGeometry(.88, .88, .03, 20), MAT.white, tx, .75, tz));
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + .2, knocked = R() < .18;
        plateMs.push(mtx(tx + Math.cos(a) * .62, .775, tz + Math.sin(a) * .62, 0, 0, 0, 1, 1, 1));
        chairMs.push(knocked ? mtx(tx + Math.cos(a) * 1.35, .2, tz + Math.sin(a) * 1.35, rand(1.2, 1.6), -a + Math.PI / 2, 0) : mtx(tx + Math.cos(a) * 1.18, 0, tz + Math.sin(a) * 1.18, 0, -a - Math.PI / 2, 0)); }
      for (let i = 0; i < 5; i++) canMs.push(mtx(tx + rand(-.2, .2), .83, tz + rand(-.2, .2), R() < .2 ? 1.57 : 0, 0, 0));
    }
    g.add(inst(chairGeo, std({ color: 0xa8141a, roughness: .45 }), chairMs, true));
    g.add(inst(new THREE.CylinderGeometry(.11, .09, .02, 14), std({ color: 0xf0eee8, roughness: .3 }), plateMs));
    g.add(inst(new THREE.CylinderGeometry(.033, .033, .12, 8), std({ color: 0x1d5a2a, metalness: .7, roughness: .3 }), canMs));
    // lanterns
    W.lanterns = [];
    const lanM = new THREE.MeshStandardMaterial({ map: T.lantern, emissiveMap: T.lantern, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: .6 });
    for (const z of [-66, -69, -72, -75, -78]) {
      const piv = new THREE.Group(); piv.position.set(0, ridge - .1, z);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1.3, 3), MAT.dark); str.position.y = -.65; piv.add(str);
      const lb = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12), lanM); lb.scale.set(1, .82, 1); lb.position.y = -1.55; piv.add(lb);
      for (const yy of [-1.3, -1.8]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .05, 12), MAT.gold); c.position.y = yy; piv.add(c); }
      const ts = new THREE.Mesh(new THREE.BoxGeometry(.03, .35, .03), MAT.red); ts.position.y = -2.0; piv.add(ts);
      piv.userData.ph = rand(0, 6); g.add(piv); W.lanterns.push(piv);
    }
    // fairy lights
    const flM = [], flC = [];
    const addFL = (x, y, z) => { flM.push(mtx(x, y, z)); flC.push(R() < .5 ? new THREE.Color(3, 2.1, 1.0) : new THREE.Color(3, 1.1, 1.8)); };
    for (let z = Z0; z <= Z1; z += .3) { for (const sx of [-1, 1]) addFL(sx * X, eave - .02 - .08 * Math.abs(Math.sin(z * 2.2)), z); addFL(0, ridge - .05, z); }
    for (let x = -X; x <= X; x += .3) addFL(x, eave - .02, Z1);
    const fli = inst(new THREE.SphereGeometry(.028, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), flM); fli.castShadow = false;
    flC.forEach((c, i) => fli.setColorAt(i, c)); g.add(fli); W.fairy = fli; W.fairyColors = flC;
    // flower arch at entrance
    const ar = new THREE.Group(); ar.position.set(0, 0, Z1 + .35);
    const flowerMs = [], flowerCs = [];
    const fl = (x, y, z) => { flowerMs.push(mtx(x, y, z, 0, 0, 0, rand(.7, 1.3), rand(.7, 1.3), rand(.7, 1.3))); const k = R(); flowerCs.push(k < .45 ? new THREE.Color(.75, .05, .08) : k < .8 ? new THREE.Color(.9, .45, .55) : new THREE.Color(.9, .88, .85)); };
    for (const sx of [-1, 1]) { ar.add(mesh(new THREE.CylinderGeometry(.16, .16, 2.6, 10), MAT.white, sx * 1.65, 1.3, 0));
      for (let i = 0; i < 260; i++) { const a = rand(0, 6.28), y = rand(0, 2.6); fl(sx * 1.65 + Math.cos(a) * .2, y, Math.sin(a) * .2); } }
    for (let i = 0; i < 420; i++) { const u = rand(0, Math.PI), a = rand(0, 6.28); fl(Math.cos(u) * 1.65 + Math.cos(a) * .2 * Math.cos(u), 2.6 + Math.sin(u) * 1.65 + Math.cos(a) * .2 * Math.sin(u), Math.sin(a) * .2); }
    const fm = inst(new THREE.SphereGeometry(.075, 6, 5), std({ color: 0xffffff, roughness: .7 }), flowerMs); flowerCs.forEach((c, i) => fm.setColorAt(i, c)); ar.add(fm);
    const sign = mesh(new THREE.PlaneGeometry(3.0, .62), std({ map: L.textTex(['LỄ THÀNH HÔN'], { w: 1024, h: 212, font: '700 132px "Cormorant Garamond"', border: '#e0b850' }), emissive: 0x200000, roughness: .5 }), 0, 4.6, .05, false);
    ar.add(sign); g.add(ar);
    // loudspeaker pole
    const lp = new THREE.Group(); lp.position.set(3.7, 0, -62.4);
    lp.add(mesh(new THREE.CylinderGeometry(.07, .09, 6.4, 7), std({ color: 0x6b6a45 }), 0, 3.2, 0));
    for (const [ry, tilt] of [[0, .25], [Math.PI * .85, .2]]) { const h = new THREE.Group(); h.position.set(0, 6.1, 0); h.rotation.set(0, ry, 0);
      const horn = mesh(new THREE.CylinderGeometry(.36, .07, .85, 16, 1, true), std({ color: 0x8a8d88, metalness: .6, roughness: .45, side: THREE.DoubleSide }), 0, 0, .42); horn.rotation.x = Math.PI / 2 + tilt; h.add(horn); lp.add(h); }
    g.add(lp); W.loa = lp;
  }

  // ---------- lamp post (creature backlight)
  { const g = new THREE.Group(); g.position.set(-2.9, 0, -45.5);
    g.add(mesh(new THREE.CylinderGeometry(.07, .09, 4.6, 7), std({ color: 0x5a5236 }), 0, 2.3, 0));
    const arm = mesh(new THREE.CylinderGeometry(.04, .04, 1.1, 5), std({ color: 0x5a5236 }), .5, 4.4, 0); arm.rotation.z = Math.PI / 2; g.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.4, 1.6) })); bulb.position.set(1.0, 4.25, 0); g.add(bulb);
    scene.add(g); W.lampBulb = bulb; W.lampPos = new THREE.Vector3(-1.9, 4.2, -45.5); }

  // ---------- ground fog puffs
  W.fog = [];
  const fogMat = (o) => new THREE.SpriteMaterial({ map: T.soft, color: 0x56657e, opacity: o * .45, depthWrite: false, transparent: true });
  const puff = (x, y, z, s, o) => { const sp = new THREE.Sprite(fogMat(o)); sp.position.set(x, y, z); sp.scale.set(s, s * .45, 1); sp.userData = { x, z, ph: rand(0, 6), sp: rand(.1, .3) }; scene.add(sp); W.fog.push(sp); };
  for (let i = 0; i < 40; i++) puff(rand(-25, 25), rand(.2, 1.2), rand(22, 140), rand(8, 18), rand(.05, .12));
  for (let i = 0; i < 24; i++) puff(rand(-45, -15), rand(.2, 1.2), rand(22, 120), rand(8, 16), rand(.05, .12));
  for (let i = 0; i < 26; i++) puff(rand(-6, 6), rand(.3, 1.6), rand(-62, 14), rand(5, 10), rand(.04, .09));
  for (let i = 0; i < 20; i++) puff(rand(-34, -26), rand(.3, 1.6), rand(-76, 14), rand(5, 10), rand(.04, .09));
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.softClean, color: 0xffb060, opacity: .35, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, fog: false }));
  lampGlow.scale.set(9, 9, 1); lampGlow.position.copy(W.lampPos); scene.add(lampGlow); W.lampGlow = lampGlow;
  const tentGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.softClean, color: 0xff3018, opacity: .4, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  tentGlow.scale.set(22, 12, 1); tentGlow.position.set(0, 3, -66); scene.add(tentGlow); W.tentGlow = tentGlow;

  return W;
}
