// TODO (M1): placeholder level. The trailer village (web/world.js, read-only) at mouse scale,
// with the trailer's lights and ambient animation recreated here. No collisions yet.
import * as THREE from 'three';
import { buildWorld, U, MOON_DIR, MOONLIGHT_DIR } from '@trailer/world.js';
import { noise1, hash1, smooth } from '@trailer/lib.js';

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer */
export function buildPlaceholderLevel(scene, renderer) {
  const W = buildWorld(scene);
  W.tentGlow.material.fog = false;

  // Water reflects the sky + moon (same as the trailer).
  { const es = new THREE.Scene(); es.add(W.sky.clone()); const m = W.moon.clone(); m.position.copy(MOON_DIR).multiplyScalar(800); es.add(m);
    const pm = new THREE.PMREMGenerator(renderer); W.waterMat.envMap = pm.fromScene(es, 0, .1, 1500).texture; pm.dispose(); }

  const hemi = new THREE.HemisphereLight(0x2c3c60, 0x0a0806, .3); scene.add(hemi);
  const moonL = new THREE.DirectionalLight(0x9fb4e8, .9); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048);
  Object.assign(moonL.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 220 });
  moonL.shadow.bias = -.0006; moonL.shadow.normalBias = .03;
  scene.add(moonL, moonL.target);
  const tentLs = [-67, -72.5, -77.5].map(z => { const l = new THREE.PointLight(0xff3a1e, 5, 0, 2); l.position.set(0, 2.7, z); scene.add(l); return l; });
  const lampL = new THREE.PointLight(0xffb868, 22, 0, 2); lampL.position.copy(W.lampPos); scene.add(lampL);
  const shrineL = new THREE.PointLight(0xff5a20, 1.4, 0, 2); shrineL.position.copy(W.shrinePos).add(new THREE.Vector3(.6, 0, 0)); scene.add(shrineL);

  return {
    W,
    shadowLights: [moonL],
    // Start on the lane between the gate and the houses, facing the wedding tent.
    spawn: { pos: new THREE.Vector3(0, 0, 14), yaw: 0 },
    bounds: { minX: -40, maxX: 30, minZ: -82, maxZ: 19 },
    /** Per-frame ambient animation. @param {number} t seconds @param {THREE.Camera} camera */
    update(t, camera) {
      U.uTime.value = t; U.uWind.value = .8;
      W.moon.position.copy(camera.position).addScaledVector(MOON_DIR, 800);
      W.sky.position.copy(camera.position); W.stars.position.copy(camera.position);
      W.clouds.forEach((c, i) => { const a = -.9 + i * .38 + ((t * .004 + c.userData.ph) % 1) * .3, el = .2 + .05 * Math.sin(i * 2.1);
        c.position.copy(camera.position).add(new THREE.Vector3(Math.sin(a) * 820, Math.sin(el) * 820, -Math.cos(a) * 820)); });
      const yaw = camera.rotation.y;
      moonL.position.copy(camera.position).addScaledVector(MOONLIGHT_DIR, 120);
      moonL.target.position.copy(camera.position).add(new THREE.Vector3(-Math.sin(yaw) * 10, 0, -Math.cos(yaw) * 10)); moonL.target.updateMatrixWorld();
      W.lanterns.forEach(l => l.rotation.set(Math.sin(t * 1.3 + l.userData.ph) * .05, 0, Math.cos(t * 1.1 + l.userData.ph) * .05));
      tentLs.forEach((l, i) => l.intensity = 5 * (1 + noise1(t * 6 + i) * .08));
      W.candles.forEach((c, i) => c.scale.set(1, 1.6 + noise1(t * 11 + i) * .4, 1));
      const lampFl = .75 + .25 * noise1(t * 7) + (hash1(Math.floor(t * 12)) > .93 ? -.6 : 0);
      lampL.intensity = 22 * lampFl; W.lampGlow.material.opacity = .3 * lampFl; W.lampBulb.material.color.setRGB(5 * lampFl, 3.4 * lampFl, 1.6 * lampFl);
      shrineL.intensity = 1.4 * (1 + noise1(t * 8) * .15);
      W.tentGlow.material.opacity = .4 * smooth(18, 35, camera.position.distanceTo(W.tentGlow.position));
      W.fog.forEach(f => { f.position.x = f.userData.x + Math.sin(t * f.userData.sp + f.userData.ph) * 2; });
      W.waterMat.normalMap.offset.set(t * .004, t * .006);
    },
  };
}
