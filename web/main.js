import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as L from './lib.js';
import { buildWorld, U, MOON_DIR, MOONLIGHT_DIR } from './world.js';
import { buildCreature, poseCreature } from './creature.js';
const { track, tr1, clamp, smooth, lerp, fbm1, noise1, hash1, easeOut } = L;
const PI = Math.PI;

const qs = new URLSearchParams(location.search);
const OW = 1920, OH = 1080, RW = +(qs.get('w') || 1920), RH = Math.round(RW / 2.39), BAR = Math.round((OH - OW / 2.39) / 2);
const SC = Math.max(1, RW / OW); // output scale (2 = 4K); 2D layout stays in 1080p units

await Promise.all([
  document.fonts.load('600 60px "Cormorant Garamond"', 'Đám cưới Làng Chuột Đồng ằ ữ ộ'), document.fonts.load('700 60px "Cormorant Garamond"', ' Đám cưới Làng Chuột LỄ THÀNH HÔN Ễ'),
  document.fonts.load('300 30px "Be Vietnam Pro"', 'Đồng bằng ữ'), document.fonts.load('500 30px "Be Vietnam Pro"', 'SẮP RA MẮT'),
  document.fonts.load('700 60px "Noto Serif CJK SC"', '囍'),
]);
const TL = await (await fetch('/timeline.json')).json();
const FPS = TL.fps;

// ---------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(RW, RH);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1320, .015);
const camera = new THREE.PerspectiveCamera(45, RW / RH, .05, 2000); camera.rotation.order = 'YXZ'; scene.add(camera);

const W = buildWorld(scene);
W.tentGlow.material.fog = false;
const creature = buildCreature(scene, W.T);

// env map for water (sky + moon)
{ const es = new THREE.Scene(); es.add(W.sky.clone()); const m = W.moon.clone(); m.position.copy(MOON_DIR).multiplyScalar(800); es.add(m);
  const pm = new THREE.PMREMGenerator(renderer); W.waterMat.envMap = pm.fromScene(es, 0, .1, 1500).texture; }

// lights
const hemi = new THREE.HemisphereLight(0x2c3c60, 0x0a0806, .3); scene.add(hemi);
const moonL = new THREE.DirectionalLight(0x9fb4e8, .9); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048);
Object.assign(moonL.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 }); moonL.shadow.bias = -.0006; moonL.shadow.normalBias = .03;
scene.add(moonL, moonL.target);
const flash = new THREE.Group(); scene.add(flash);
const spot = new THREE.SpotLight(0xfff0d8, 140, 0, .46, .5, 2); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0004; spot.shadow.camera.near = .2; spot.shadow.camera.far = 60;
{ const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, '#fff'); g.addColorStop(.18, '#fff8ea'); g.addColorStop(.24, '#9a9488'); g.addColorStop(.33, '#d8d0c0'); g.addColorStop(.6, '#5a564e'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); spot.map = new THREE.CanvasTexture(c); spot.map.colorSpace = THREE.SRGBColorSpace; }
flash.add(spot); spot.position.set(0, 0, 0); spot.target.position.set(0, 0, -10); flash.add(spot.target);
const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { k: { value: .05 } },
  vertexShader: `varying float vy; varying vec3 vn; varying vec3 vv; void main(){ vy = position.y; vec4 mv = modelViewMatrix*vec4(position,1.); vv = normalize(-mv.xyz); vn = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float k; varying float vy; varying vec3 vn; varying vec3 vv; void main(){ float l = clamp(1. - (vy + 9.) / 18., 0., 1.); float f = pow(abs(dot(vn, vv)), 1.5); gl_FragColor = vec4(vec3(1., .95, .85) * k * pow(l, 1.6) * f, 1.); }` });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(.02, 3.6, 18, 24, 1, true), beamMat); beam.geometry.translate(0, -9, 0); beam.rotation.x = -PI / 2; beam.renderOrder = 5; flash.add(beam);
const tentLs = [-67, -72.5, -77.5].map(z => { const l = new THREE.PointLight(0xff3a1e, 5, 0, 2); l.position.set(0, 2.7, z); scene.add(l); return l; });
const lampL = new THREE.PointLight(0xffb868, 22, 0, 2); lampL.position.copy(W.lampPos); scene.add(lampL);
const shrineL = new THREE.PointLight(0xff5a20, 1.4, 0, 2); shrineL.position.copy(W.shrinePos).add(new THREE.Vector3(.6, 0, 0)); scene.add(shrineL);

// wind chime on a porch (right side of lane)
const chime = new THREE.Group(); chime.position.set(5.35, 2.75, 3.4);
{ const mm = new THREE.MeshStandardMaterial({ color: 0xb8b0a0, metalness: .9, roughness: .3 });
  chime.add(new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .02, 12), new THREE.MeshStandardMaterial({ color: 0x5a3a20 })));
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, len = .22 + i * .04, tb = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, len, 6), mm); tb.geometry.translate(0, -len / 2 - .12, 0);
    const piv = new THREE.Group(); piv.position.set(Math.cos(a) * .07, 0, Math.sin(a) * .07); piv.add(tb); piv.userData.ph = i; chime.add(piv); } }
scene.add(chime);

// ---------------- post
const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(RW, RH);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), .5, .45, .9); composer.addPass(bloom);
const after = new AfterimagePass(0); composer.addPass(after);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uFlash: { value: 0 }, uGlitch: { value: 0 }, uCA: { value: .0015 }, uFade: { value: 1 }, uGrain: { value: .07 }, uVig: { value: .5 }, uRed: { value: 0 }, uRes: { value: new THREE.Vector2(RW, RH) }, uDistort: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uFlash, uGlitch, uCA, uFade, uGrain, uVig, uRed, uDistort; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - .5; float r2 = dot(c, c);
      uv = .5 + c * (1. + uDistort * r2);
      float band = floor(uv.y * 24. + floor(uT * 24.) * 3.1);
      float gl = step(1. - uGlitch * .6, h(vec2(band, floor(uT * 24.)))) * uGlitch;
      uv.x += (h(vec2(band, floor(uT*24.) + 7.)) - .5) * .12 * gl;
      vec2 off = c * (uCA + uGlitch * .012) + vec2(gl * .01, 0.);
      vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
      float lum = dot(col, vec3(.299,.587,.114));
      vec3 sh = vec3(.004,.011,.02), hi = vec3(1.06,.98,.9);
      col = mix(col, col * hi, smoothstep(.25, .8, lum)) + sh * (1. - smoothstep(0., .35, lum));
      float sat = .82; float rr = col.r - max(col.g, col.b);
      col = mix(vec3(lum), col, sat + clamp(rr * 2.5, 0., .5));
      col = mix(col, vec3(lum * 1.4, lum * .15, lum * .1), uRed);
      col = col * col * (3. - 2. * col) * .35 + col * .65;
      col *= 1. - uVig * smoothstep(.15, .75, r2 * 1.6);
      col += (h(vUv * uRes + fract(uT * 13.7) * 91.) - .5) * uGrain;
      col = mix(col, vec3(1.), uFlash);
      gl_FragColor = vec4(col * uFade, 1.);
    }` });
composer.addPass(grade);

// ---------------- 2D compositor
const out = document.createElement('canvas'); out.width = OW * SC; out.height = OH * SC; const X = out.getContext('2d');
const scratch = document.createElement('canvas'); scratch.width = OW * SC; scratch.height = 400 * SC; const SX = scratch.getContext('2d'); SX.scale(SC, SC);
const smokeC = document.createElement('canvas'); smokeC.width = 512; smokeC.height = 256;
{ const s = smokeC.getContext('2d'), im = s.createImageData(512, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) { const n = L.fbm2(x / 70, y / 45, 5), e = Math.sin(Math.PI * y / 256) * Math.sin(Math.PI * x / 512); const a = clamp((n - .35) * 2) * e; const i = (y * 512 + x) * 4; im.data.set([120, 110, 105, 255 * a], i); }
  s.putImageData(im, 0, 0); }

// ---------------- helpers
const shotAt = t => TL.shots.find(s => t >= s.t0 && t < s.t1) || TL.shots[TL.shots.length - 1];
const steps = TL.steps;
function bob(t) {
  let i = -1; for (let k = 0; k < steps.length; k++) { if (steps[k].t <= t) i = k; else break; }
  if (i < 0) return { y: 0, x: 0, roll: 0, pitch: 0 };
  const s = steps[i], n = steps[i + 1], iv = n && n.t - s.t < 1.2 ? n.t - s.t : .62, dt = t - s.t;
  const A = { walk: .03, run: .065, shuffle: .012 }[s.kind] * s.amp, B = { walk: .025, run: .045, shuffle: .01 }[s.kind] * s.amp;
  const fade = n && n.t - s.t < 1.2 ? 1 : clamp(1 - (dt - iv) / .35);
  const p = clamp(dt / iv), sgn = s.foot ? 1 : -1;
  return { y: -A * (1 + Math.cos(2 * PI * p)) / 2 * fade, x: B * Math.cos(PI * p) * sgn * fade, roll: B * Math.cos(PI * p) * sgn * .5 * fade, pitch: -A * .25 * Math.cos(2 * PI * p) * fade };
}
function hitEnv(t, kinds, rate = 6) { let v = 0; for (const h of TL.hits) if ((!kinds || kinds.includes(h.kind)) && t >= h.t && t < h.t + 2) v += h.s * Math.exp(-(t - h.t) * rate); return v; }
const lookAt = (from, to) => { const d = new THREE.Vector3().subVectors(to, from); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }; };
const P3 = (k, t, m = 'ease') => { const v = track(k, t, m); return new THREE.Vector3(v[0], v[1], v[2]); };

// ---------------- shots: return camera + world state
const montageIns = t => TL.montage.find(m => t >= m.t && t < m.t + m.dur);
function insertShot(img, t, m) {
  const k = (t - m.t) / m.dur;
  const defs = {
    lantern: [[.6, 2.1, -70.9], [0, 3.05, -72], 30], portrait: [[.22, 1.36, -78.3], [.42, 1.32, -79.4], 24], loa: [[2.6, 4.4, -59.8], [3.7, 6.1, -62.4], 34],
    altar: [[0, 1.55, -76.6], [0, 2.0, -80.1], 38], paper: [[.3, .75, 18.2], [0, 0, 16.6], 40], roof: [[-10.2, 1.3, -16.0], [-9, 5.6, -22.6], 40],
    eyes: [[-30, 1.45, 30.6], [-30, 1.35, 29.0], 30 - hash1(m.t) * 10],
  };
  const d = defs[img]; const from = new THREE.Vector3(...d[0]), la = lookAt(from, new THREE.Vector3(...d[1]));
  return { pos: from, yaw: la.yaw + noise1(t * 30) * .01, pitch: la.pitch, roll: (hash1(m.t * 3) - .5) * .2, fov: d[2] * (1 - k * .15), fog: .02, flashOn: img === 'eyes' || img === 'paper', handheld: .01, shake: 0, afterimage: 0,
    trackHead: img === 'eyes' ? 1 : 0, creature: img === 'eyes' ? { pos: [-30, 0, 28.3], ry: 0, mode: 'lean', amt: .55, jaw: .6 + hash1(m.t) * .4 } : img === 'roof' ? { pos: [-9, 4.6, -22.4], ry: -.18, mode: 'crouch' } : null, insert: true };
}

function shotState(sh, t) {
  const S = { fog: .018, flashOn: true, handheld: .004, afterimage: 0, wind: 1, lanternSway: .05, creature: null, roll: 0, distort: 0 };
  const lt = (a, b) => smooth(a, b, t);
  switch (sh.name) {
    case 'A_dyke': {
      S.pos = P3([[4, 0, 1.62, 106], [4.6, 0, 1.62, 106], [12.4, .12, 1.62, 96.2], [13.7, .12, 1.62, 96.0], [15, .08, 1.62, 94.4]], t);
      S.yaw = tr1([[4, 0], [12.5, 0], [12.95, .3], [13.45, -.18], [13.95, .02], [15, 0]], t);
      S.pitch = tr1([[4, .3], [5.4, .29], [7.9, -.02], [12.4, -.03], [13.2, .03], [15, -.02]], t);
      S.fov = tr1([[4, 40], [15, 35]], t); S.fog = .0105;
      S.flashOn = t > 5.2; S.flashFlicker = t > 5.2 && t < 5.38; break;
    }
    case 'B_gate': {
      S.pos = P3([[18.5, .3, 1.62, 27.4], [18.6, .3, 1.62, 27.4], [23.0, .1, 1.62, 22.0], [24.2, .1, 1.62, 21.9], [29.0, 0, 1.62, 13.4]], t);
      S.yaw = tr1([[18.5, .06], [21.5, -.05], [23, 0], [26, .08], [27.2, -.05], [29, 0]], t);
      S.pitch = tr1([[18.5, 0], [23.0, .02], [23.7, .5], [24.05, .5], [24.7, .05], [26.3, -.05], [26.9, -.62], [27.8, -.6], [28.5, -.05], [29, 0]], t);
      S.fov = 46; S.fog = .02; S.wind = 1 + 1.6 * Math.exp(-Math.pow((t - 20.8) / .9, 2)); break;
    }
    case 'C_lane': {
      S.pos = P3([[31, .2, 1.62, 9.0], [35.2, 0, 1.62, 4.0], [36.2, 0, 1.62, 3.9], [43, 0, 1.62, -4.2]], t);
      S.yaw = tr1([[31, 0], [32.3, .95], [33.9, .85], [34.8, .05], [35.4, -.95], [36.6, -1.0], [37.6, -.1], [39.2, 0], [43, 0]], t);
      S.pitch = tr1([[31, 0], [32.5, -.05], [35.4, -.06], [36.3, .2], [37.6, 0], [43, .02]], t);
      S.fov = tr1([[31, 50], [39.6, 50], [43, 20]], t); S.fog = .016; break;
    }
    case 'D_tent': {
      S.pos = P3([[43, 0, 1.62, -61.0], [48.7, 0, 1.62, -72.4], [52.5, 0, 1.62, -72.5], [55.5, -.2, 1.62, -72.0], [56.6, -.2, 1.62, -72.0], [57.4, -.25, 1.58, -71.6]], t);
      S.yaw = tr1([[43, 0], [45, .06], [47, -.04], [48.7, 0], [52.5, 0], [55.5, PI - .04], [56.6, PI - .02], [57.05, PI + .02], [57.4, PI / 2 + .3]], t);
      S.pitch = tr1([[43, 0], [48.7, .02], [49.2, -.04], [50.5, .1], [52.4, .07], [55.5, .03], [56.6, .04], [57.4, -.1]], t);
      S.fov = tr1([[43, 42], [45.5, 40], [48.7, 64], [49.3, 60], [52.5, 56], [55.5, 50], [56.6, 50], [56.82, 11], [57.05, 11], [57.4, 40]], t);
      S.fog = .022; S.lanternSway = t < 49 ? .07 : 0;
      S.flashOn = !(t > 49.0 && t < 49.12) && !(t > 49.25 && t < 49.33) && !(t > 56.62 && (Math.floor(t * 18) % 3 === 0));
      S.lightsCut = t > 49.0; S.strobe = t > 56.6;
      if (t > 51.5) {
        const lunge = clamp((t - 56.7) / .7);
        S.creature = { pos: [0, 0, -49.2 - lunge * lunge * 11], ry: PI, mode: lunge > 0 ? 'run' : 'idle', phase: (t - 56.7) * 3, look: 0, blink: t > 56 && t < 56.16 ? Math.sin((t - 56) / .16 * PI) : 0 };
      }
      if (t > 57.0) S.afterimage = .55; break;
    }
    case 'F1_run': {
      S.pos = P3([[57.6, -6.8, 1.6, -74.0], [61.3, -26.6, 1.6, -74.0], [62.32, -30.0, 1.6, -70.2]], t, 'cr');
      S.yaw = tr1([[57.6, PI / 2], [61.2, PI / 2 + .05], [62.32, PI * .96]], t); S.pitch = -.06; S.fov = 62; S.fog = .028; S.handheld = .016; S.afterimage = .5; S.distort = .08; break;
    }
    case 'F2_roof': { const m = { t: sh.t0, dur: sh.t1 - sh.t0 }; Object.assign(S, insertShot('roof', t, m)); S.flashOn = false; break; }
    case 'F3_banyan': {
      S.pos = P3([[62.53, -30.2, 1.6, -58], [65.0, -29.4, 1.6, -44.3], [65.55, -28.9, 1.25, -41.1], [66.1, -29.4, 1.5, -38.0], [67.03, -30, 1.6, -33.0]], t, 'cr');
      S.yaw = tr1([[62.53, PI], [64.4, PI - .05], [65.0, PI - .42], [65.6, PI - .3], [66.2, PI], [67.03, PI]], t);
      S.pitch = tr1([[62.53, -.05], [65.2, .1], [65.55, -.22], [66.2, -.04]], t); S.fov = 60; S.fog = .03; S.handheld = .016; S.afterimage = .5; S.distort = .08; break;
    }
    case 'F4_look': {
      S.pos = P3([[67.03, -30, 1.6, -33.0], [69.81, -30, 1.6, -17.6]], t, 'cr');
      S.yaw = tr1([[67.03, PI], [67.27, .12], [68.95, .1], [69.2, PI], [69.81, PI]], t);
      S.pitch = tr1([[67.03, -.05], [67.3, -.02], [69.2, -.06]], t); S.fov = 54; S.fog = .028; S.handheld = .018; S.afterimage = .45; S.distort = .08;
      const z = lerp(-40.0, -21.3, (t - 67.03) / 2.78);
      S.creature = { pos: [-30 + Math.sin(t * 3) * .3, 0, z], ry: 0, mode: 'run', phase: t * 2.7 }; break;
    }
    case 'F5_dyke': {
      S.pos = P3([[69.81, -30.2, 1.6, 8.5], [72.17, -30, 1.6, 21.5]], t, 'cr'); S.yaw = PI; S.pitch = -.03; S.fov = 64; S.fog = .02; S.handheld = .02; S.afterimage = .5; S.distort = .08; break;
    }
    case 'M_montage': {
      const m = montageIns(t);
      if (m) Object.assign(S, insertShot(m.img, t, m));
      else { S.pos = P3([[72.17, -30, 1.6, 21.5], [75.17, -30, 1.6, 38]], t, 'cr'); S.yaw = PI + noise1(t * 2) * .1; S.pitch = -.04; S.fov = 66; S.fog = .02; S.handheld = .024; S.afterimage = .5; S.distort = .1; }
      break;
    }
    case 'F6_fall': {
      S.pos = P3([[75.17, -30, 1.6, 38.0], [75.35, -30, 1.55, 39.1], [75.6, -30.25, .28, 40.3], [75.75, -30.3, .36, 40.45], [75.95, -30.35, .24, 40.5], [78.8, -30.35, .24, 40.5]], t);
      S.yaw = tr1([[75.17, PI], [75.6, PI + 1.2], [76.0, 2 * PI - .22], [78.8, 2 * PI - .18]], t);
      S.pitch = tr1([[75.17, -.1], [75.45, -.9], [75.6, -.6], [76.0, .1], [78.8, .14]], t);
      S.roll = tr1([[75.17, 0], [75.5, .5], [75.7, 1.25], [76.0, 1.12], [78.8, 1.08]], t);
      S.fov = tr1([[75.17, 60], [76, 48], [78.2, 44], [78.55, 30], [78.8, 28]], t); S.fog = .022; S.handheld = t < 75.6 ? .02 : .006; S.afterimage = t < 76 ? .5 : 0;
      S.flashGround = t > 75.55;
      if (t > 76.2) {
        const w = clamp((t - 76.2) / 1.7), lean = clamp((t - 78.0) / .55);
        S.creature = { pos: [-30.05, 0, lerp(28.5, 38.9, w)], ry: 0, mode: lean > 0 ? 'lean' : 'run', phase: (t - 76.2) * 1.3, amt: easeOut(lean) * .8, jaw: smooth(78.42, 78.58, t), look: 0 };
        S.trackHead = smooth(77.6, 78.25, t) * .9; S.headOff = -.05;
      } break;
    }
    case 'G_stinger': {
      S.pos = P3([[89, .2, .32, 50], [90.6, .2, .32, 50], [92.0, .15, 1.15, 49.8], [95.3, .15, 1.15, 49.8]], t);
      S.yaw = tr1([[89, .25], [90.6, .22], [92, 0], [94.0, 0], [94.85, -1.28], [95.3, -1.3]], t);
      S.pitch = tr1([[89, .35], [90.6, .3], [92, .04], [94, .02], [94.85, -.04]], t);
      S.roll = tr1([[89, .9], [90.6, .8], [92, 0]], t); S.fov = tr1([[89, 44], [94.94, 44], [95.04, 32]], t); S.fog = .016; S.flashOn = false;
      S.trackHead = smooth(94.8, 95.0, t) * .85;
      S.creature = { pos: [2.25, -.12, 49.75], ry: -PI / 2, mode: t > 94.97 ? 'lean' : 'crouch', amt: smooth(94.97, 95.15, t) * .35, jaw: smooth(94.96, 95.06, t), look: 0, tilt: .1, roll: .25 };
      S.blur = t < 91 ? clamp(1 - (t - 89) / 2) : 0; break;
    }
  }
  return S;
}

// ---------------- per-frame world update
const prevShot = { name: null };
function updateWorld(t, sh, S) {
  U.uTime.value = t; U.uWind.value = S.wind;
  scene.fog.density = S.fog;
  // creature
  if (S.creature) { creature.visible = true; const c = S.creature; creature.position.set(...c.pos); creature.rotation.set(0, c.ry, 0); poseCreature(creature, Object.assign({ t }, c)); }
  else creature.visible = false;
  if (S.trackHead && creature.visible) {
    creature.updateMatrixWorld(true); const hp = new THREE.Vector3(); creature.userData.head.getWorldPosition(hp); hp.y += (S.headOff || 0);
    const la = lookAt(S.pos, hp); let ty = la.yaw; while (ty - S.yaw > PI) ty -= 2 * PI; while (ty - S.yaw < -PI) ty += 2 * PI;
    S.yaw = lerp(S.yaw, ty, S.trackHead); S.pitch = lerp(S.pitch, la.pitch, S.trackHead);
  }
  // camera
  const b = S.insert ? { y: 0, x: 0, roll: 0, pitch: 0 } : bob(t);
  const hh = S.handheld, shk = hitEnv(t, ['big', 'braam', 'slam', 'fall', 'roar', 'hit', 'flash', 'sting'], 7) * .05;
  const yaw = S.yaw + fbm1(t * .7 + 3) * hh * 1.2 + noise1(t * 23) * shk;
  const pitch = S.pitch + b.pitch + fbm1(t * .9 + 9) * hh + noise1(t * 27 + 5) * shk;
  camera.rotation.set(pitch, yaw, S.roll + b.roll + fbm1(t * .5 + 1) * hh * .6 + noise1(t * 19 + 2) * shk * .6);
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  camera.position.copy(S.pos).addScaledVector(right, b.x).add(new THREE.Vector3(0, b.y + fbm1(t * 1.3) * hh * .5, 0));
  camera.fov = S.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  // moon, sky
  W.moon.position.copy(camera.position).addScaledVector(MOON_DIR, 800); W.sky.position.copy(camera.position); W.stars.position.copy(camera.position);
  W.clouds.forEach((c, i) => { const a = -.9 + i * .38 + ((t * .004 + c.userData.ph) % 1) * .3, el = .2 + .05 * Math.sin(i * 2.1);
    c.position.copy(camera.position).add(new THREE.Vector3(Math.sin(a) * 820, Math.sin(el) * 820, -Math.cos(a) * 820)); });
  moonL.position.copy(camera.position).addScaledVector(MOONLIGHT_DIR, 120); moonL.target.position.copy(camera.position).add(new THREE.Vector3(-Math.sin(yaw) * 15, 0, -Math.cos(yaw) * 15)); moonL.target.updateMatrixWorld();
  // flashlight
  let fi = S.flashOn ? 140 : 0;
  if (S.flashFlicker) fi *= hash1(Math.floor(t * 60)) > .5 ? 1 : .1;
  if (S.strobe && S.flashOn) fi *= .6 + .8 * hash1(Math.floor(t * 30));
  fi *= 1 + noise1(t * 9) * .04;
  if (S.flashGround) {
    const k = clamp((t - 75.6) / 1.1), ang = (2 * PI - .12) * easeOut(k);
    flash.position.set(-29.65, .12, 40.9); flash.rotation.set(0, ang, 0, 'YXZ'); fi = 140 * (k < .02 ? hash1(t * 99) : 1);
  } else {
    flash.position.copy(camera.position).add(new THREE.Vector3(.16, -.24, 0).applyEuler(camera.rotation));
    flash.rotation.set(camera.rotation.x - .13 + noise1(t * 3.1) * .01, camera.rotation.y + noise1(t * 2.7) * .012, 0, 'YXZ');
  }
  spot.intensity = fi; beamMat.uniforms.k.value = fi / 140 * .014; beam.visible = fi > 0;
  // lanterns, fairy lights, tent lights
  W.lanterns.forEach(l => { const a = S.lanternSway * (sh.name === 'D_tent' && t > 49 ? 0 : 1); l.rotation.set(Math.sin(t * 1.3 + l.userData.ph) * a, 0, Math.cos(t * 1.1 + l.userData.ph) * a); });
  const cut = S.lightsCut ? 1 : 0;
  tentLs.forEach((l, i) => l.intensity = 5 * (S.strobe ? (hash1(Math.floor(t * 20) + i) > .4 ? 1.3 : .05) : cut ? (i === 2 ? 1 : .55) : 1) * (1 + noise1(t * 6 + i) * .08));
  W.candles.forEach((c, i) => c.scale.set(1, 1.6 + noise1(t * 11 + i) * .4, 1));
  const lampFl = .75 + .25 * noise1(t * 7) + (hash1(Math.floor(t * 12)) > .93 ? -.6 : 0);
  lampL.intensity = 22 * lampFl; W.lampGlow.material.opacity = .3 * lampFl; W.lampBulb.material.color.setRGB(5 * lampFl, 3.4 * lampFl, 1.6 * lampFl);
  shrineL.intensity = 1.4 * (1 + noise1(t * 8) * .15);
  chime.children.forEach(p => { if (p.userData.ph !== undefined) p.rotation.set(Math.sin(t * 2.2 + p.userData.ph) * .18 * S.wind, 0, Math.cos(t * 1.9 + p.userData.ph * 1.7) * .14 * S.wind); });
  chime.rotation.z = Math.sin(t * 1.4) * .08 * S.wind;
  W.tentGlow.material.opacity = .4 * smooth(18, 35, camera.position.distanceTo(W.tentGlow.position));
  W.fog.forEach(f => { f.position.x = f.userData.x + Math.sin(t * f.userData.sp + f.userData.ph) * 2; });
  W.waterMat.normalMap.offset.set(t * .004, t * .006);
  // post
  const newShot = prevShot.name !== sh.name + (S.insert ? 'i' : ''); prevShot.name = sh.name + (S.insert ? 'i' : '');
  after.uniforms.damp.value = newShot ? 0 : S.afterimage;
  const insFlash = S.insert ? Math.exp(-(t - (montageIns(t) || { t: sh.t0 }).t) * 30) : 0;
  grade.uniforms.uFlash.value = clamp(insFlash + hitEnv(t, ['flash', 'sting'], 18) * .8 + (S.flashGround && t < 75.65 ? .3 : 0));
  grade.uniforms.uGlitch.value = clamp(hitEnv(t, ['big', 'braam', 'slam', 'flash', 'roar', 'sting'], 9) * .8 + (S.insert ? .5 : 0) + (sh.name === 'D_tent' && t > 56.6 ? .35 : 0));
  grade.uniforms.uCA.value = .0012 + S.afterimage * .004 + hitEnv(t, null, 5) * .004;
  grade.uniforms.uDistort.value = S.distort;
  grade.uniforms.uRed.value = sh.name === 'D_tent' && t > 56.6 ? .25 * hash1(Math.floor(t * 24)) : 0;
  grade.uniforms.uT.value = t;
  let fade = 1;
  if (sh.name === 'A_dyke') fade = smooth(4.0, 5.8, t);
  if (sh.name === 'G_stinger') fade = smooth(89.0, 89.5, t);
  if (sh.name === 'F6_fall') fade = 1 - smooth(78.72, 78.8, t);
  grade.uniforms.uFade.value = fade;
}

// ---------------- text cards
function card(t, c) {
  const d = t - c.t0, dur = c.t1 - c.t0; const a = Math.min(smooth(0, .55, d), 1 - smooth(dur - .5, dur, d));
  if (a <= 0) return;
  X.save(); X.globalAlpha = a; X.textAlign = 'center'; X.textBaseline = 'middle';
  if (c.style === 'small') {
    X.font = '300 36px "Be Vietnam Pro"'; X.letterSpacing = '8px'; X.fillStyle = '#d6d0c6'; X.fillText(c.vi, OW / 2, OH / 2 - 14);
    X.font = '300 18px "Be Vietnam Pro"'; X.letterSpacing = '7px'; X.fillStyle = '#7f796f'; X.fillText(c.en.toUpperCase(), OW / 2, OH / 2 + 34);
  } else if (c.style === 'card' || c.style === 'overlay') {
    const s = 1 + d / dur * .035, blur = (1 - smooth(0, .6, d)) * 8;
    X.translate(OW / 2, c.style === 'card' ? OH / 2 : OH - BAR - 110); X.scale(s, s); X.filter = blur > .3 ? `blur(${blur * SC}px)` : 'none';
    const lines = c.vi.split('\n'), fs = c.style === 'card' ? 74 : 54, lh = fs * 1.18;
    X.font = `600 ${fs}px "Cormorant Garamond"`; X.letterSpacing = '2px'; X.fillStyle = '#ece5d8'; X.shadowColor = 'rgba(0,0,0,.8)'; X.shadowBlur = 18 * SC;
    lines.forEach((l, i) => X.fillText(l, 0, (i - (lines.length - 1) / 2) * lh - 18));
    X.font = '300 19px "Be Vietnam Pro"'; X.letterSpacing = '9px'; X.fillStyle = '#958f84';
    X.fillText(c.en.toUpperCase(), 0, (lines.length - 1) / 2 * lh + 42);
    X.fillStyle = 'rgba(170,20,20,.9)'; X.fillRect(-28, (lines.length - 1) / 2 * lh + 72, 56, 2);
  }
  X.restore();
}
function titleCard(t) {
  const d = t - 80.5; X.fillStyle = '#000'; X.fillRect(0, 0, OW, OH);
  // smoke
  X.save(); X.globalAlpha = .22 * smooth(0, 1.5, d) * (1 - smooth(5.6, 6.5, d));
  for (let i = 0; i < 4; i++) X.drawImage(smokeC, -300 + i * 380 + Math.sin(d * .3 + i) * 60 + d * 18 * (i % 2 ? 1 : -1), 330 + i * 35, 1300, 520);
  X.restore();
  // embers
  for (let i = 0; i < 140; i++) { const sp = .3 + hash1(i) * .7, x = hash1(i * 3.1) * OW + Math.sin(d * (1 + hash1(i * 7)) + i) * 30, y = OH - BAR - ((d * 120 * sp + hash1(i * 5.3) * 900) % 900);
    const a = (.3 + .7 * hash1(Math.floor(d * 10) + i)) * smooth(0, .8, d) * (1 - smooth(5.8, 6.5, d)); const r = 1 + hash1(i * 9) * 2.2;
    X.fillStyle = `rgba(255,${120 + 80 * hash1(i)},40,${a * .8})`; X.beginPath(); X.arc(x, y, r, 0, 7); X.fill(); }
  // flicker reveal + glitch slices
  let a = 1; if (d < .55) a = hash1(Math.floor(d * 30)) > .45 ? 1 : .1; a *= 1 - smooth(5.9, 6.5, d);
  const s = 1 + d * .01;
  SX.clearRect(0, 0, OW, 400); SX.save(); SX.textAlign = 'center'; SX.textBaseline = 'middle';
  const TITLE = 'Đám cưới Làng Chuột'; let fz = 132; SX.letterSpacing = '16px';
  do SX.font = `700 ${fz}px "Cormorant Garamond"`; while (SX.measureText(TITLE).width > 1680 && (fz -= 4) > 60); // shrink to fit the frame
  SX.shadowColor = 'rgba(190,10,10,.75)'; SX.shadowBlur = 50 * SC; const g = SX.createLinearGradient(0, 80, 0, 320); g.addColorStop(0, '#f4ede2'); g.addColorStop(1, '#b8a890');
  SX.fillStyle = g; SX.fillText(TITLE, OW / 2 + 8, 210); SX.restore();
  X.save(); X.globalAlpha = a; X.translate(OW / 2, OH / 2 - 40); X.scale(s, s);
  const gl = d < .9 ? 1 - d / .9 : 0;
  for (let y = 0; y < 400; y += 20) { const off = gl > 0 && hash1(y + Math.floor(d * 24) * 13) > .6 ? (hash1(y * 7 + d) - .5) * 120 * gl : 0; X.drawImage(scratch, 0, y * SC, OW * SC, 20 * SC, -OW / 2 + off, y - 210, OW, 20); }
  X.restore();
  X.save(); X.globalAlpha = smooth(1.0, 2.0, d) * (1 - smooth(5.9, 6.5, d)); X.textAlign = 'center'; X.font = '300 26px "Be Vietnam Pro"'; X.letterSpacing = '24px'; X.fillStyle = '#a49c90';
  X.fillText('RAT VILLAGE WEDDING', OW / 2 + 12, OH / 2 + 130); X.fillStyle = 'rgba(180,18,18,.95)'; const lw = 520 * easeOut(clamp(d / 1.2)); X.fillRect(OW / 2 - lw / 2, OH / 2 + 82, lw, 2); X.restore();
}
function endCard(t) {
  const d = t - 95.3; X.fillStyle = '#000'; X.fillRect(0, 0, OW, OH);
  const a = smooth(.3, 1.1, d) * (1 - smooth(5.0, 5.7, d)) * (hash1(Math.floor(t * 24)) > .97 && d > 2 ? .4 : 1);
  X.save(); X.globalAlpha = a; X.textAlign = 'center'; X.textBaseline = 'middle';
  X.font = '700 96px "Cormorant Garamond"'; X.letterSpacing = '22px'; X.fillStyle = '#ece5d8'; X.shadowColor = 'rgba(170,10,10,.6)'; X.shadowBlur = 30 * SC; X.fillText('Đám cưới Làng Chuột', OW / 2 + 11, OH / 2 - 70);
  X.shadowBlur = 0; X.fillStyle = 'rgba(170,20,20,.95)'; X.fillRect(OW / 2 - 60, OH / 2 - 8, 120, 2);
  X.font = '500 30px "Be Vietnam Pro"'; X.letterSpacing = '14px'; X.fillStyle = '#d6d0c6'; X.fillText('SẮP RA MẮT · 2027', OW / 2 + 7, OH / 2 + 44);
  X.font = '300 17px "Be Vietnam Pro"'; X.letterSpacing = '9px'; X.fillStyle = '#7f796f'; X.fillText('COMING SOON · 2027', OW / 2 + 4, OH / 2 + 88);
  X.restore();
}
function lids(open) {
  if (open >= 1) return; const h = (OH - 2 * BAR) / 2, cy = OH / 2, c = h * (1 - open) * 1.15;
  X.fillStyle = '#000';
  X.beginPath(); X.moveTo(0, 0); X.lineTo(OW, 0); X.lineTo(OW, BAR + c - 40); X.quadraticCurveTo(OW / 2, BAR + c + 80, 0, BAR + c - 40); X.fill();
  X.beginPath(); X.moveTo(0, OH); X.lineTo(OW, OH); X.lineTo(OW, OH - BAR - c + 40); X.quadraticCurveTo(OW / 2, OH - BAR - c - 80, 0, OH - BAR - c + 40); X.fill();
}

// ---------------- frame API
window.renderFrame = (i, quality = .92) => {
  const t = i / FPS, sh = shotAt(t);
  X.setTransform(SC, 0, 0, SC, 0, 0); X.fillStyle = '#000'; X.fillRect(0, 0, OW, OH);
  if (sh.name === 'title') titleCard(t);
  else if (sh.name === 'endcard') endCard(t);
  else if (!['black', 'card1', 'card2'].includes(sh.name)) {
    const S = shotState(sh, t); updateWorld(t, sh, S); composer.render();
    X.save(); if (S.blur > .02) X.filter = `blur(${S.blur * 7 * SC}px)`; X.drawImage(renderer.domElement, 0, BAR, OW, OH - 2 * BAR); X.restore();
    if (sh.name === 'G_stinger') lids(tr1([[89, 0], [89.5, .35], [89.62, .05], [89.75, 0], [90.3, .8], [90.45, .62], [90.8, 1]], t));
  } else prevShot.name = sh.name;
  for (const c of TL.cards) if (t >= c.t0 && t < c.t1 && c.style !== 'title' && c.style !== 'end') card(t, c);
  X.fillStyle = '#000'; X.fillRect(0, 0, OW, BAR); X.fillRect(0, OH - BAR, OW, BAR);
  return out.toDataURL('image/jpeg', quality);
};
window.sceneInfo = () => ({ rice: W.riceCount, bamboo: W.bambooCount, calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
if (qs.has('ns')) { renderer.shadowMap.enabled = false; }
if (qs.has('nb')) bloom.enabled = false;
if (qs.has('nf')) W.fog.forEach(f => f.visible = false);
if (qs.has('nl')) scene.traverse(o => { if (o.isInstancedMesh && o.count > 5000) o.visible = false; });
if (qs.has('nm')) moonL.castShadow = false;
window.camState = (i) => { const t = i / FPS, sh = shotAt(t);
  if (['black', 'card1', 'card2', 'title', 'endcard'].includes(sh.name)) return { t, shot: sh.name };
  const S = shotState(sh, t); return { t, shot: sh.name, pos: [S.pos.x, S.pos.y, S.pos.z], yaw: S.yaw, cr: S.creature ? S.creature.pos : null, ins: !!S.insert }; };
window.READY = true;
