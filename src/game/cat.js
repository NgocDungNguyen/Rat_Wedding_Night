// Cat scouts: procedural cat model + stealth AI.
// States: patrol → suspicious → chase → search → patrol; sleep → wake → search.
import * as THREE from 'three';
import { audio } from '../core/audio.js';

const WALK = .45, SNEAK = .32, RUN = 1.9;
const SIGHT = 4.2, FOV = Math.cos(THREE.MathUtils.degToRad(62)), FEEL = .45;
const R = .085, H = .32, STEP = .27;
const REACH = .24, SWIPE_DMG = 34, SWIPE_CD = 1.4;

/** @param {{fur?:number, scarf?:boolean}} [o] */
export function buildCatModel(o = {}) {
  const fur = new THREE.MeshStandardMaterial({ color: o.fur ?? 0x1d1a17, roughness: 1 });
  const g = new THREE.Group();
  const ell = (sx, sy, sz, x, y, z, mat = fur) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; return m; };
  const body = new THREE.Group(); g.add(body);
  body.add(ell(.085, .08, .19, 0, .2, 0), ell(.08, .088, .1, 0, .215, .12), ell(.088, .085, .1, 0, .2, -.12));

  const head = new THREE.Group(); head.position.set(0, .275, .2); body.add(head);
  head.add(ell(.068, .06, .065, 0, 0, 0), ell(.032, .026, .03, 0, -.018, .055));
  const earGeo = new THREE.ConeGeometry(.026, .055, 4);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(earGeo, fur); e.position.set(sx * .038, .055, -.005); e.rotation.set(-.15, 0, sx * -.32); e.castShadow = true; head.add(e); }
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, .5) });
  const glowMat = new THREE.SpriteMaterial({ map: glowTex(), color: 0xd8ff60, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 });
  const eyes = new THREE.Group(); head.add(eyes);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), eyeMat); e.position.set(sx * .026, .012, .052); e.scale.z = .5; eyes.add(e);
    const s = new THREE.Sprite(glowMat); s.position.copy(e.position); s.scale.set(.05, .05, 1); eyes.add(s);
  }
  if (o.scarf !== false) {
    const sc = new THREE.Mesh(new THREE.TorusGeometry(.06, .014, 8, 20), new THREE.MeshStandardMaterial({ color: 0x9a0e16, roughness: .8 }));
    sc.position.set(0, .245, .165); sc.rotation.x = Math.PI / 2 + .5; body.add(sc);
  }
  const legs = [];
  for (const [x, z] of [[-.05, .13], [.05, .13], [-.05, -.13], [.05, -.13]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, .2, z);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.017, .014, .2, 8), fur); l.position.y = -.1; l.castShadow = true;
    const paw = ell(.02, .012, .026, 0, -.198, .006); pivot.add(l, paw); body.add(pivot); legs.push(pivot);
  }
  const tail = []; let parent = body;
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Group(); seg.position.set(0, i === 0 ? .23 : .045, i === 0 ? -.2 : 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.012, .013, .05, 6), fur); m.position.y = .022; m.castShadow = true;
    seg.add(m); parent.add(seg); tail.push(seg); parent = seg;
  }
  g.userData = { body, head, eyes, legs, tail };
  return g;
}

let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); _glow = new THREE.CanvasTexture(c); _glow.userData.keep = true; return _glow;
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * @param {THREE.Scene} scene @param {ReturnType<import('./world.js').createWorld>} world
 * @param {{id:string, pos:[number,number], heading?:number, waypoints?:[number,number][], sleep?:boolean, fur?:number,
 *          area?:{minX:number,maxX:number,minZ:number,maxZ:number}}} cfg
 */
export function createCat(scene, world, cfg) {
  const model = buildCatModel({ fur: cfg.fur });
  scene.add(model);
  const U = model.userData;
  const home = new THREE.Vector3(cfg.pos[0], cfg.y ?? 0, cfg.pos[1]);
  const ch = world.createCharacter({ kind: 'cat', radius: R, height: H, pos: home, step: STEP, mass: 4 });
  const pos = ch.feet;
  let vy = 0, attackCD = 0, swipeT = 0;
  let heading = cfg.heading ?? 0, look = 0, phase = 0, speedNow = 0;
  let state = cfg.sleep ? 'sleep' : 'patrol', t = 0, wait = 0, wi = 0;
  const stim = new THREE.Vector3(), lastSeen = new THREE.Vector3(), target = new THREE.Vector3();
  let detect = 0, wake = 0, lostT = 0, stuckT = 0, detour = 0, detourT = 0, seen = false, chaseT = 0;
  /** @type {any} */ let purr = null;

  const cat = {
    id: cfg.id, model, pos,
    get state() { return state; },
    get detect() { return detect; },
    get seesPlayer() { return seen; },

    reset(sleep = !!cfg.sleep, at = null) {
      ch.teleport(at ?? home); vy = 0; attackCD = 0; heading = cfg.heading ?? 0; state = sleep ? 'sleep' : 'patrol';
      detect = wake = 0; wi = 0; wait = 0; t = 0; seen = false;
    },
    /** A loud event at p with radius r (falls, clatter). */
    hear(p, r, loud = false) {
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (d > r) return;
      if (state === 'sleep') { wake += loud ? 2 : (1 - d / r) * 1.2; stim.copy(p); return; }
      if (state === 'chase') return;
      stim.copy(p);
      detect = Math.max(detect, loud ? .7 : .4 + .3 * (1 - d / r));
      if (state !== 'suspicious') enter('suspicious');
    },
    /** Force a state (scripted events). */
    alert(p) { stim.copy(p); lastSeen.copy(p); if (state === 'sleep') wake = 2; else enter('search'); },

    /**
     * @param {number} dt @param {ReturnType<import('./world.js').createWorld>} world
     * @param {{pos:THREE.Vector3, vis:number, hidden:boolean, noise:number, safe:boolean}} pl
     * @param {THREE.Camera} cam @returns {{type:'attack', from:THREE.Vector3}|null}
     */
    update(dt, world, pl, cam) {
      t += dt;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const eye = { x: pos.x + fx * .22, y: pos.y + .27, z: pos.z + fz * .22 };
      const pp = { x: pl.pos.x, y: pl.pos.y + .03, z: pl.pos.z };
      const dx = pp.x - eye.x, dz = pp.z - eye.z, dist = Math.hypot(dx, dz);

      // ---- perception
      seen = false;
      if (state !== 'sleep' && state !== 'wake') {
        const range = SIGHT * Math.min(1.6, pl.vis) * (state === 'chase' ? 1.5 : 1);
        const inCone = state === 'chase' ? dist < range : (dx * fx + dz * fz) / Math.max(dist, 1e-4) > FOV && dist < range;
        const felt = dist < FEEL && Math.abs(pp.y - pos.y) < .3;
        if ((inCone || felt) && !(pl.hidden && dist > .35) && !world.sightBlocked(eye, pp)) seen = true;
        if (seen) {
          detect = Math.min(1, detect + dt * pl.vis * (1.7 * (1 - dist / Math.max(range, .01)) + .35));
          lastSeen.copy(pl.pos);
        } else if (state !== 'chase') detect = Math.max(0, detect - dt * .18);
        // Hearing the player's movement.
        if (pl.noise > 0 && dist < pl.noise && state !== 'chase') {
          detect = Math.max(detect, Math.min(.6, detect + dt * .9));
          stim.copy(pl.pos); if (state === 'patrol') enter('suspicious');
        }
        if (seen && state !== 'chase' && state !== 'suspicious' && detect > .3) { stim.copy(pl.pos); enter('suspicious'); }
        if (detect >= 1 && state !== 'chase' && !pl.safe) enter('chase');
      } else if (state === 'sleep' && pl.noise > 0 && dist < pl.noise * 1.2) {
        wake += dt * (pl.noise / .9) * .35; stim.copy(pl.pos);
      }

      // ---- behaviour
      let goal = null, speed = 0, faceTo = null;
      switch (state) {
        case 'sleep':
          wake = Math.max(0, wake - dt * .05);
          if (wake >= 1) { enter('wake'); audio.playAt('catGrowl', pos, cam, { volume: .9, maxDist: 8 }); }
          break;
        case 'wake':
          faceTo = stim; if (t > 1.6) { lastSeen.copy(stim); enter('search'); }
          break;
        case 'patrol': {
          const wps = cfg.waypoints;
          if (!wps?.length) { look = Math.sin(t * .5) * .8; break; }
          const w = wps[wi % wps.length]; target.set(w[0], 0, w[1]);
          if (wait > 0) { wait -= dt; look = Math.sin(t * 1.3) * .9; if (wait <= 0) wi++; }
          else if (Math.hypot(target.x - pos.x, target.z - pos.z) < .15) wait = 1.2 + Math.random() * 1.6;
          else { goal = target; speed = WALK; look *= .9; }
          break;
        }
        case 'suspicious':
          faceTo = stim;
          if (t > 1.2 && Math.hypot(stim.x - pos.x, stim.z - pos.z) > .35) { goal = stim; speed = SNEAK; }
          if (t > 7 && detect < .35) enter('patrol');
          else if (t > 12) { lastSeen.copy(stim); enter('search'); }
          break;
        case 'chase':
          chaseT += dt;
          if (seen) { lostT = 0; goal = pl.pos; } else { lostT += dt; goal = lastSeen; }
          speed = RUN;
          if (pl.safe) { lostT += dt * 3; goal = lastSeen; }
          if (lostT > 2.5 || (!seen && Math.hypot(lastSeen.x - pos.x, lastSeen.z - pos.z) < .2)) enter('search');
          if (stuckT > 1.8) enter('search');
          if (swipeT > 0) { goal = null; faceTo = pl.pos; }
          break;
        case 'search':
          if (wait > 0) { wait -= dt; look = Math.sin(t * 2.1) * 1.1; }
          else if (Math.hypot(target.x - pos.x, target.z - pos.z) < .15 || stuckT > 1) {
            wait = .8 + Math.random(); stuckT = 0;
            const a = Math.random() * Math.PI * 2, r = .3 + Math.random() * 1;
            target.set(lastSeen.x + Math.cos(a) * r, 0, lastSeen.z + Math.sin(a) * r);
          } else { goal = target; speed = WALK; }
          if (t > 8) { detect = Math.min(detect, .2); enter('patrol'); }
          break;
      }

      // ---- movement (Rapier character)
      attackCD = Math.max(0, attackCD - dt); swipeT = Math.max(0, swipeT - dt);
      let dxm = 0, dzm = 0;
      if (goal) {
        const a = cfg.area;
        const gx = a ? Math.max(a.minX, Math.min(a.maxX, goal.x)) : goal.x, gz = a ? Math.max(a.minZ, Math.min(a.maxZ, goal.z)) : goal.z;
        let want = Math.atan2(gx - pos.x, gz - pos.z);
        if (detourT > 0) { detourT -= dt; want += detour; }
        heading += wrap(want - heading) * Math.min(1, dt * (state === 'chase' ? 9 : 4));
        const step = Math.min(speed * dt, Math.hypot(gx - pos.x, gz - pos.z));
        dxm = Math.sin(heading) * step; dzm = Math.cos(heading) * step;
        // Cats never step into safe zones (burrows, drains, shrine) or water.
        const lx = pos.x + dxm * 4 + Math.sin(heading) * R, lz = pos.z + dzm * 4 + Math.cos(heading) * R;
        if (world.inZone(lx, 0, lz, 'safe') || world.inZone(lx, pos.y - .2, lz, 'water')) { dxm = dzm = 0; stuckT += dt; }
      } else if (faceTo) heading += wrap(Math.atan2(faceTo.x - pos.x, faceTo.z - pos.z) - heading) * Math.min(1, dt * 3);
      vy -= 9.8 * dt;
      const ox = pos.x, oz = pos.z, want2 = Math.hypot(dxm, dzm);
      const res = ch.move(dxm, vy * dt, dzm);
      if (res.grounded) vy = 0;
      const moved = Math.hypot(pos.x - ox, pos.z - oz);
      speedNow = moved / Math.max(dt, 1e-4);
      if (goal && want2 > 1e-5) {
        if (moved < want2 * .3) {
          stuckT += dt;
          if (stuckT > .4 && detourT <= 0) { detour = (Math.random() < .5 ? -1 : 1) * (.9 + Math.random() * .8); detourT = .7; }
        } else stuckT = Math.max(0, stuckT - dt * .5);
      }

      // ---- attack: a swipe when the mouse is in reach
      if (state === 'chase' && attackCD <= 0 && dist < REACH + .05 && Math.abs(pl.pos.y - pos.y) < .22 && !pl.safe && seen) {
        attackCD = SWIPE_CD; swipeT = .35;
        audio.playAt('catHiss', pos, cam, { volume: .8, maxDist: 6, rate: 1.2 });
        animate(dt);
        return { type: 'attack', from: pos.clone(), damage: SWIPE_DMG };
      }

      animate(dt);
      if (state === 'sleep' || state === 'wake') {
        const s = audio.spatial(pos, cam, 5);
        if (!purr) purr = audio.play('catPurr', { loop: true, volume: 0 });
        purr?.set(state === 'sleep' ? s.volume * .9 : 0, s.pan);
      } else if (purr) { purr.stop(.5); purr = null; }
      return null;
    },
    dispose() { purr?.stop(.1); purr = null; scene.remove(model); ch.dispose(); },
  };

  function enter(s) {
    if (state === s) return;
    const prev = state; state = s; t = 0; wait = 0; stuckT = 0;
    if (s === 'suspicious') audio.playAt(Math.random() < .5 ? 'catMeow' : 'catPlead', pos, cam0(), { volume: .7, maxDist: 9, rate: .85 + Math.random() * .2 });
    if (s === 'chase') { chaseT = 0; lostT = 0; audio.playAt('catHiss', pos, cam0(), { volume: 1, maxDist: 12 }); }
    if (s === 'search') { target.copy(lastSeen); if (prev === 'chase') detect = .6; }
    if (s === 'patrol') { // resume at the nearest waypoint
      const w = cfg.waypoints; if (w?.length) { let best = 0, bd = 1e9; w.forEach((p, i) => { const d = Math.hypot(p[0] - pos.x, p[1] - pos.z); if (d < bd) { bd = d; best = i; } }); wi = best; }
    }
  }
  // enter() is called from update where cam is known; keep a reference.
  let _cam = null; const cam0 = () => _cam;
  const upd = cat.update; cat.update = (dt, world, pl, cam) => { _cam = cam; return upd(dt, world, pl, cam); };

  function animate(dt) {
    model.position.copy(pos); model.rotation.y = heading;
    const run = speedNow > 1, k = Math.min(1, speedNow / .4);
    phase += dt * (run ? 13 : 7.5) * k;
    const sw = (run ? .75 : .45) * k;
    U.legs.forEach((l, i) => { l.visible = state !== 'sleep'; l.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * sw; });
    const crouch = state === 'suspicious' || state === 'chase' ? .02 : 0;
    if (state === 'sleep') {
      U.body.position.y = -.12; U.body.rotation.set(0, 0, .15);
      U.head.position.set(.03, .23, .17); U.head.rotation.set(.5, .3, 0); U.eyes.visible = false;
      U.body.scale.set(1.05, .9, .85);
    } else {
      U.body.scale.set(1, 1, 1); U.eyes.visible = true;
      U.body.position.y = -crouch + (run ? Math.abs(Math.sin(phase)) * .02 : Math.sin(t * 2) * .002);
      U.body.rotation.set(run ? Math.sin(phase * 2) * .04 : 0, 0, 0);
      U.head.position.set(0, .275, .2);
      const lookAmt = state === 'chase' ? 0 : look;
      U.head.rotation.set(state === 'suspicious' ? -.15 : 0, lookAmt * .7, 0);
      if (swipeT > 0) { const k2 = Math.sin((1 - swipeT / .35) * Math.PI); U.head.position.z = .2 + k2 * .07; U.legs[0].rotation.x = -1.4 * k2; U.body.position.y -= .03 * k2; }
    }
    U.tail.forEach((s, i) => {
      const curl = state === 'sleep' ? .5 : state === 'chase' ? .05 : .18;
      s.rotation.x = (i === 0 ? -.9 : curl) + Math.sin(t * (state === 'suspicious' ? 6 : 1.6) + i * .6) * .12;
      s.rotation.z = state === 'sleep' ? .35 : Math.sin(t * 1.1 + i * .5) * .08;
    });
  }

  animate(0);
  return cat;
}
