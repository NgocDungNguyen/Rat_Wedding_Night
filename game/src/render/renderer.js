// WebGL renderer, camera and post chain (bloom → afterimage "motion blur" → output → grade).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GradeShader } from './post.js';
import { QUALITY } from '../data/defaults.js';

/** @param {HTMLElement} container */
export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b1320, .015);
  // Near plane is small because the player is mouse-sized (eye ≈ 7 cm).
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .01, 1000);
  camera.rotation.order = 'YXZ'; scene.add(camera);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .45, .9); composer.addPass(bloom);
  const after = new AfterimagePass(.55); composer.addPass(after);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);

  let pixelRatio = 1;
  function resize() {
    renderer.setPixelRatio(pixelRatio); composer.setPixelRatio(pixelRatio);
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    grade.uniforms.uRes.value.set(innerWidth * pixelRatio, innerHeight * pixelRatio);
  }
  addEventListener('resize', resize);

  return {
    renderer, scene, camera, composer, grade, bloom, after,
    /** @param {'low'|'medium'|'high'} quality @param {number} resScale 50–100 @param {THREE.Light[]} shadowLights */
    applyGraphics(quality, resScale, shadowLights = []) {
      const q = QUALITY[quality] ?? QUALITY.high;
      pixelRatio = Math.min(devicePixelRatio || 1, q.maxPixelRatio) * resScale / 100;
      bloom.enabled = q.bloom;
      if (renderer.shadowMap.enabled !== q.shadows) {
        renderer.shadowMap.enabled = q.shadows;
        scene.traverse(o => { const m = /** @type {any} */ (o).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => x.needsUpdate = true); });
      }
      for (const l of shadowLights) {
        if (l.shadow.mapSize.x === q.shadowMap) continue;
        l.shadow.mapSize.set(q.shadowMap, q.shadowMap); l.shadow.map?.dispose(); l.shadow.map = null;
      }
      resize();
    },
    setBrightness(b) { grade.uniforms.uGamma.value = b; renderer.toneMappingExposure = 1.05 * (.75 + .25 * b); },
    setMotionBlur(on) { after.enabled = on; },
    render(t) { grade.uniforms.uT.value = t; composer.render(); },
  };
}
