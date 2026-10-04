// Level registry: chapter.level → level module ({ build(kit, api) }).
import * as THREE from 'three';
import ch1 from './ch1.js';
import ch2 from './ch2.js';
import ch3 from './ch3.js';

const T = (vi, en) => ({ vi, en });

/** TODO: chapters 4–6. A small empty yard so the flow can still be tested (F8 completes). */
const placeholder = {
  id: 'placeholder',
  build(k, api) {
    const { scene, M } = k;
    scene.background = new THREE.Color(0x05070c); scene.fog = new THREE.FogExp2(0x0b1320, .08);
    scene.add(new THREE.HemisphereLight(0x3a4a70, 0x0a0806, .6));
    const moon = new THREE.DirectionalLight(0x9fb4e8, 1); moon.position.set(3, 8, 2); moon.castShadow = true; scene.add(moon);
    k.ground(0, -2, 6, 6, M.dirt);
    k.wall(-3, 1, -3, -5, 1.2); k.wall(3, 1, 3, -5, 1.2); k.wall(-3, -5, 3, -5, 1.2); k.wall(-3, 1, 3, 1, 1.2);
    k.jar(-1, -2, .3, .6); k.firewood(1.2, -3, 1, .45, .4);
    return {
      cats: [], shadowLights: [moon], ambience: { wind: .3 },
      spawn: { pos: new THREE.Vector3(0, 0, .4), yaw: 0 },
      start() { api.objective(T('Chương này chưa được làm (F8 để qua)', 'This chapter is not built yet (F8 to skip)')); },
    };
  },
};

export const LEVELS = { ch1, ch2, ch3, placeholder };
