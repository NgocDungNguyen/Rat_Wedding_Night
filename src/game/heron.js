// Heron (cò): wades the paddies and hunts by MOTION. Stand still and it can't see you.
// States: wade → watch (scanning) → alert (locks on, head tracks) → strike (wind-up, lunge) → recover.
import * as THREE from 'three';
import { audio } from '../core/audio.js';

const RANGE = 2.6, FOV = Math.cos(THREE.MathUtils.degToRad(70)), REACH = .23, DAMAGE = 40;

function buildHeronModel() {
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e6de, roughness: .85 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: .9 });
  const beakM = new THREE.MeshStandardMaterial({ color: 0xd8a830, roughness: .5 });
  const g = new THREE.Group();
  const ell = (m, sx, sy, sz, x, y, z, parent = g) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * .035, .5, 0); g.add(leg);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.007, .006, .5, 6), grey); m.position.y = -.25; m.castShadow = true; leg.add(m); legs.push(leg);
  }
  const body = new THREE.Group(); body.position.y = .55; g.add(body);
  ell(white, .085, .075, .19, 0, 0, 0, body); ell(white, .06, .05, .12, 0, .01, -.18, body).rotation.x = .3; // body + tail
  // S-shaped neck: three segments; the last carries the head.
  const neck = new THREE.Group(); neck.position.set(0, .04, .15); body.add(neck);
  const seg = (parent, len, rx) => { const s = new THREE.Group(); s.rotation.x = rx; parent.add(s);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, len, 8), white); m.position.y = len / 2; m.castShadow = true; s.add(m);
    const end = new THREE.Group(); end.position.y = len; s.add(end); return { s, end }; };
  const n1 = seg(neck, .16, .5), n2 = seg(n1.end, .14, -.9), n3 = seg(n2.end, .12, .7);
  const head = new THREE.Group(); n3.end.add(head);
  ell(white, .028, .026, .04, 0, .01, .01, head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.012, .15, 8), beakM); beak.rotation.x = Math.PI / 2; beak.position.set(0, .005, .1); head.add(beak);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.005, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd040 })); e.position.set(sx * .022, .018, .025); head.add(e); }
  const crest = new THREE.Mesh(new THREE.ConeGeometry(.006, .09, 4), new THREE.MeshStandardMaterial({ color: 0x222222 })); crest.rotation.x = -2.2; crest.position.set(0, .02, -.03); head.add(crest);
  g.userData = { legs, body, neck, n1: n1.s, n2: n2.s, n3: n3.s, head };
  return g;
}

/**
 * @param {THREE.Scene} scene @param {ReturnType<import('./world.js').createWorld>} world
 * @param {{id:string, pos:[number,number], waypoints:[number,number][], area?:{minX:number,maxX:number,minZ:number,maxZ:number}}} cfg
 */
export function createHeron(scene, world, cfg) {
  const model = buildHeronModel(); scene.add(model);
  const U = model.userData;
  const pos = new THREE.Vector3(cfg.pos[0], 0, cfg.pos[1]), home = pos.clone();
  let heading = 0, state = 'wade', t = 0, wi = 0, wait = 0, meter = 0, phase = 0, moving = 0;
  const target = new THREE.Vector3(), strikeAt = new THREE.Vector3();
  let _cam = null;

  const groundY = (x, z) => { const h = world.ray({ x, y: 1.5, z }, { x: 0, y: -1, z: 0 }, 3, true); return h ? 1.5 - h.toi : -.25; };
  const enter = (s) => { if (state === s) return; state = s; t = 0;
    if (s === 'alert' && _cam) audio.playAt('heron', pos, _cam, { volume: .8, maxDist: 10, rate: .9 + Math.random() * .2 }); };

  const heron = {
    id: cfg.id, pos, model,
    get state() { return state; },
    get detect() { return meter; },
    reset(at = null) { pos.copy(at ?? home); state = 'wade'; meter = 0; wi = 0; wait = 0; },
    /** Splashes and thuds in the water draw its attention. */
    hear(p, r) { const d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < r && state !== 'strike') { meter = Math.max(meter, .55); target.copy(p); if (state === 'wade' || state === 'watch') enter('alert'); } },

    /**
     * @param {{pos:THREE.Vector3, speed:number, hidden:boolean, swimming:boolean}} pl
     * @returns {{type:'attack', from:THREE.Vector3, damage:number}|null}
     */
    update(dt, pl, cam) {
      _cam = cam; t += dt;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const head = { x: pos.x + fx * .3, z: pos.z + fz * .3 };
      const dx = pl.pos.x - head.x, dz = pl.pos.z - head.z, dist = Math.hypot(dx, dz);

      // ---- motion perception (low to the water: on the surface or a dyke edge)
      const lowEnough = pl.pos.y < pos.y + .6;
      const inView = (dx * fx + dz * fz) / Math.max(dist, 1e-4) > FOV || dist < .5;
      const movingTarget = pl.speed > .06;
      const sees = lowEnough && inView && dist < RANGE && movingTarget && !(pl.hidden && dist > .6);
      if (sees) { meter = Math.min(1, meter + dt * (2.2 * (1 - dist / RANGE) + .7)); target.copy(pl.pos); }
      else meter = Math.max(0, meter - dt * (state === 'alert' ? .25 : .45));

      let goal = null, speed = 0;
      switch (state) {
        case 'wade': {
          const w = cfg.waypoints[wi % cfg.waypoints.length]; const wp = new THREE.Vector3(w[0], 0, w[1]);
          if (Math.hypot(wp.x - pos.x, wp.z - pos.z) < .12) { enter('watch'); wait = 2 + Math.random() * 3; wi++; }
          else { goal = wp; speed = .22; }
          if (meter > .3) enter('alert');
          break;
        }
        case 'watch':
          if (t > wait) enter('wade');
          if (meter > .3) enter('alert');
          break;
        case 'alert':
          goal = Math.hypot(target.x - pos.x, target.z - pos.z) > .45 ? target : null; speed = .16;
          if (meter >= 1) { strikeAt.copy(pl.pos); enter('strike'); }
          else if (meter <= 0 && t > 1.5) enter('watch');
          break;
        case 'strike': {
          // 0–0.45 s wind-up (neck pulls back), 0.45–0.6 lunge, then recover.
          heading += Math.atan2(Math.sin(Math.atan2(strikeAt.x - pos.x, strikeAt.z - pos.z) - heading), Math.cos(Math.atan2(strikeAt.x - pos.x, strikeAt.z - pos.z) - heading)) * Math.min(1, dt * 8);
          if (t > .45 && t - dt <= .45) {
            if (_cam) audio.playAt('splash', strikeAt, _cam, { volume: .7, maxDist: 8, rate: 1.3 });
            const tip = { x: pos.x + Math.sin(heading) * .5, z: pos.z + Math.cos(heading) * .5 };
            const hit = Math.hypot(pl.pos.x - strikeAt.x, pl.pos.z - strikeAt.z) < REACH && Math.hypot(pl.pos.x - tip.x, pl.pos.z - tip.z) < .6 && pl.pos.y < pos.y + .7;
            if (hit) { meter = .4; return { type: 'attack', from: pos.clone(), damage: DAMAGE }; }
          }
          if (t > 1.4) { meter = .5; enter('alert'); }
          break;
        }
      }
      // Step towards the goal (wading, no physics: it walks through water and over dykes).
      moving = 0;
      if (goal) {
        // It needs to be within lunge distance of the target, not on top of it.
        const want = Math.atan2(goal.x - pos.x, goal.z - pos.z);
        heading += Math.atan2(Math.sin(want - heading), Math.cos(want - heading)) * Math.min(1, dt * 3);
        const d = Math.hypot(goal.x - pos.x, goal.z - pos.z) - (state === 'alert' ? .4 : 0);
        if (d > 0) { const st = Math.min(d, speed * dt); pos.x += Math.sin(heading) * st; pos.z += Math.cos(heading) * st; moving = st / dt; }
        const a = cfg.area; if (a) { pos.x = Math.max(a.minX, Math.min(a.maxX, pos.x)); pos.z = Math.max(a.minZ, Math.min(a.maxZ, pos.z)); }
      } else if (state === 'alert') {
        const want = Math.atan2(target.x - pos.x, target.z - pos.z);
        heading += Math.atan2(Math.sin(want - heading), Math.cos(want - heading)) * Math.min(1, dt * 2.5);
      }
      pos.y += (groundY(pos.x, pos.z) - pos.y) * Math.min(1, dt * 6);

      // ---- animation
      model.position.copy(pos); model.rotation.y = heading;
      phase += dt * moving * 18;
      U.legs[0].rotation.x = Math.sin(phase) * .35 * Math.min(1, moving * 5); U.legs[1].rotation.x = -U.legs[0].rotation.x;
      let n1 = .5, n2 = -.9, n3 = .7, hy = 0;
      if (state === 'watch') hy = Math.sin(t * 1.4) * .7;
      if (state === 'alert') { n1 = .35; n2 = -1.2; n3 = 1.1; } // coiled, ready
      if (state === 'strike') {
        if (t < .45) { const k = t / .45; n1 = .35 - .3 * k; n2 = -1.2 - .5 * k; n3 = 1.1 + .4 * k; }          // pull back
        else if (t < .62) { const k = (t - .45) / .17; n1 = .05 + 1.25 * k; n2 = -1.7 + 1.9 * k; n3 = 1.5 - .9 * k; } // lunge
        else { n1 = 1.3; n2 = .2; n3 = .6; }
      }
      U.n1.rotation.x += (n1 - U.n1.rotation.x) * Math.min(1, dt * (state === 'strike' ? 30 : 6));
      U.n2.rotation.x += (n2 - U.n2.rotation.x) * Math.min(1, dt * (state === 'strike' ? 30 : 6));
      U.n3.rotation.x += (n3 - U.n3.rotation.x) * Math.min(1, dt * (state === 'strike' ? 30 : 6));
      U.neck.rotation.y = hy;
      return null;
    },
    dispose() { scene.remove(model); },
  };
  return heron;
}
