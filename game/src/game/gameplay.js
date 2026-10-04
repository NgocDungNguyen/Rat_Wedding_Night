// Gameplay lifecycle: owns the renderer, the (placeholder) level and the player, and runs the frame loop.
// Modes: 'hidden' (no 3D), 'attract' (slow camera behind menus), 'play' (first-person).
import { createRenderer } from '../render/renderer.js';
import { buildPlaceholderLevel } from './placeholderLevel.js';
import { createPlayer } from './player.js';
import { input } from '../core/input.js';
import { settings } from '../core/settings.js';
import { save } from '../core/save.js';

/** @type {ReturnType<typeof createRenderer>} */ let R;
/** @type {ReturnType<typeof buildPlaceholderLevel>} */ let level;
/** @type {ReturnType<typeof createPlayer>} */ let player;
/** @type {HTMLElement} */ let view;

let mode = /** @type {'hidden'|'attract'|'play'} */ ('hidden');
let paused = false, fast = false, t = 0, last = 0, playtime = 0;
let chapterId = 1;

function applySettings() {
  const s = settings.all();
  R.applyGraphics(s.quality, s.resScale, level.shadowLights);
  R.setBrightness(s.brightness);
  R.setMotionBlur(s.motionBlur);
  R.camera.fov = s.fov; R.camera.updateProjectionMatrix();
}

function attractCamera(cam) {
  // Slow drift down the lane at about human knee height, looking toward the tent.
  const k = .5 - .5 * Math.cos(t * .025);
  cam.position.set(.9 + Math.sin(t * .05) * .4, .55 + Math.sin(t * .13) * .03, 10 - k * 22);
  cam.rotation.set(-.02 + Math.sin(t * .07) * .015, .06 + Math.sin(t * .04) * .1, 0);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000 || 0); last = now;
  if (mode === 'hidden') return;
  t += dt;
  if (mode === 'attract') attractCamera(R.camera);
  else if (!paused && input.locked) {
    const s = settings.all();
    player.update(dt, { sensitivity: s.sensitivity, invertY: s.invertY, shake: s.cameraShake, fast, bounds: level.bounds });
    playtime += dt;
  } else input.consumeMouse();
  level.update(t, R.camera);
  R.render(t);
}

export const game = {
  /** Build renderer + level once. @param {HTMLElement} container */
  init(container) {
    view = container;
    R = createRenderer(container);
    level = buildPlaceholderLevel(R.scene, R.renderer);
    player = createPlayer(R.camera);
    input.setLockTarget(R.renderer.domElement);
    applySettings();
    settings.onChange((k) => { if (!k.startsWith('vol') && k !== 'lang' && k !== 'keys' && k !== 'subtitles') applySettings(); });
    // Compile shaders now so the first frame of the menu doesn't hitch.
    attractCamera(R.camera); R.renderer.compile(R.scene, R.camera);
    requestAnimationFrame(frame);
  },

  /** @param {'hidden'|'attract'|'play'} m */
  setMode(m) {
    mode = m;
    view.classList.toggle('visible', m !== 'hidden');
    if (m !== 'play') { paused = false; fast = false; R.camera.fov = settings.get('fov'); }
  },
  get mode() { return mode; },

  /** Start (or restart) a chapter. TODO: load the chapter's own level instead of the placeholder. */
  start(id) {
    chapterId = id; paused = false; fast = false; playtime = 0;
    player.reset(level.spawn.pos, level.spawn.yaw);
    this.setMode('play');
  },
  get chapterId() { return chapterId; },

  setPaused(p) { paused = p; },
  get paused() { return paused; },
  toggleFast() { fast = !fast; return fast; },

  /** Save accumulated play time. */
  flushPlaytime() { save.addPlaytime(Math.round(playtime)); playtime = 0; },
  get canvas() { return R.renderer.domElement; },
};
