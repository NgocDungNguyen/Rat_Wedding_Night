// Ma trơi (will-o'-wisp): a drifting ghost light. Its glow is a moving light zone (cats see you better inside it).
// It is drawn towards a lit lantern.
import * as THREE from 'three';
import { audio } from '../core/audio.js';

let _tex = null;
function glow() {
  if (_tex) return _tex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.15, 'rgba(200,255,240,.9)'); g.addColorStop(.45, 'rgba(80,220,200,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); _tex = new THREE.CanvasTexture(c); _tex.userData.keep = true; return _tex;
}

/**
 * @param {THREE.Scene} scene @param {ReturnType<import('./world.js').createWorld>} world
 * @param {{path:[number,number][], y?:number, speed?:number, radius?:number}} cfg
 */
export function createWisp(scene, world, cfg) {
  const y0 = cfg.y ?? .5, speed = cfg.speed ?? .35, R = cfg.radius ?? .9;
  const g = new THREE.Group(); scene.add(g);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: 0xaaffee, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  core.scale.set(.18, .18, 1);
  const halo = new THREE.Sprite(core.material.clone()); halo.material.opacity = .35; halo.scale.set(.7, .7, 1);
  const light = new THREE.PointLight(0x60ffd8, .6, R * 2.2, 2);
  g.add(core, halo, light);
  const pos = new THREE.Vector3(cfg.path[0][0], y0, cfg.path[0][1]);
  const zone = world.addZone({ tag: 'light', x: pos.x, z: pos.z, r: R, y0: -1, y1: y0 + .6 });
  let wi = 1, t = Math.random() * 10, chime = null;

  return {
    pos,
    update(dt, player, cam) {
      t += dt;
      let goal;
      const toP = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z);
      if (player.lanternOn && toP < 6) goal = new THREE.Vector3(player.pos.x, 0, player.pos.z);   // drawn to the lantern
      else { const w = cfg.path[wi % cfg.path.length]; goal = new THREE.Vector3(w[0], 0, w[1]); if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < .2) wi++; }
      const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
      const stop = player.lanternOn && toP < 6 ? .45 : 0;
      if (d > stop + .01) { const st = Math.min(d - stop, speed * dt); pos.x += dx / d * st; pos.z += dz / d * st; }
      pos.x += Math.sin(t * 1.7) * .002; pos.z += Math.cos(t * 1.3) * .002;
      pos.y = y0 + Math.sin(t * 2.1) * .06;
      g.position.copy(pos);
      const flick = .8 + .2 * Math.sin(t * 13) * Math.sin(t * 7.3);
      core.material.opacity = flick; halo.material.opacity = .3 * flick; light.intensity = .6 * flick;
      zone.x = pos.x; zone.z = pos.z;
      // Faint chime when near.
      const s = audio.spatial(pos, cam, 5);
      if (!chime && s.volume > .02) chime = audio.play('chime', { loop: true, volume: 0, rate: .7, offset: Math.random() * 6 });
      chime?.set(s.volume * .35, s.pan);
    },
    dispose() { chime?.stop(.2); scene.remove(g); world.zones.splice(world.zones.indexOf(zone), 1); },
  };
}
