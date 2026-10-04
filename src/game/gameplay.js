// Gameplay lifecycle: owns the renderer, builds chapter levels (physics + scene), runs player, cats,
// stealth, interactions, checkpoints and the level script API.
// Modes: 'hidden' (no 3D), 'attract' (village camera behind menus), 'play' (first-person).
import * as THREE from 'three';
import { createRenderer } from '../render/renderer.js';
import { buildPlaceholderLevel } from './placeholderLevel.js';
import { createPlayer } from './player.js';
import { createWorld } from './world.js';
import { createCat } from './cat.js';
import { createHeron } from './heron.js';
import { createWisp } from './wisp.js';
import { createKit } from '../levels/kit.js';
import { LEVELS } from '../levels/index.js';
import { input, keyLabel } from '../core/input.js';
import { settings } from '../core/settings.js';
import { save } from '../core/save.js';
import { audio } from '../core/audio.js';
import { createEmitter } from '../core/events.js';
import { tx } from '../core/i18n.js';
import { getChapter } from '../data/chapters.js';

/** @type {ReturnType<typeof createRenderer>} */ let R;
/** @type {ReturnType<typeof buildPlaceholderLevel>} */ let village;
/** @type {ReturnType<typeof createPlayer>} */ let player;
/** @type {HTMLElement} */ let view;
const em = createEmitter();

let mode = /** @type {'hidden'|'attract'|'play'} */ ('hidden');
let paused = false, fast = false, t = 0, last = 0, playtime = 0, chapterId = 1;
let curObjective = null, lastHint = null;

/**
 * @typedef {{id:string, pos:THREE.Vector3, r:number, label:{vi:string,en:string}, onUse:(api:any)=>void, enabled:boolean}} Interact
 * @type {null | {scene:THREE.Scene, world:any, level:any, cats:any[], interacts:Interact[], flags:Record<string, any>,
 *   prompt:Interact|null, chaseOff:number, heart:any, over:boolean, shadowLights:THREE.Light[], music:string|null}}
 */
let S = null;

/** Live HUD values, read every frame by the HUD screen. */
export const hud = { hp: 100, stamina: 100, exhausted: false, detect: 0, chase: false, prompt: '', carry: null, lantern: false, hidden: false, climbing: false, swimming: false, drowning: false };

function applySettings() {
  const s = settings.all();
  R.applyGraphics(s.quality, s.resScale, S ? S.shadowLights : village.shadowLights);
  R.setBrightness(s.brightness);
  R.setMotionBlur(s.motionBlur);
  R.camera.fov = s.fov; R.camera.updateProjectionMatrix();
}

function attractCamera(cam) {
  const k = .5 - .5 * Math.cos(t * .025);
  cam.position.set(.9 + Math.sin(t * .05) * .4, .55 + Math.sin(t * .13) * .03, 10 - k * 22);
  cam.rotation.set(-.02 + Math.sin(t * .07) * .015, .06 + Math.sin(t * .04) * .1, 0);
}

// ------------------------------------------------------------------ level script API
const keyOf = (action) => keyLabel(settings.get('keys')[action]);
/** Replace {action} placeholders in hint text with the bound key names. */
const withKeys = (s) => s.replace(/\{(\w+)\}/g, (_, a) => (settings.get('keys')[a] ? keyOf(a) : a === 'esc' ? 'Esc' : _));

const api = {
  get player() { return player; },
  get world() { return S.world; },
  get camera() { return R.camera; },
  get t() { return t; },
  get flags() { return S.flags; },
  cat: (id) => S.cats.find(c => c.id === id),
  get cats() { return S.cats; },
  get herons() { return S.herons; },
  get wisps() { return S.wisps; },
  /** @param {{vi:string,en:string}} text */
  objective(text) { curObjective = text; em.emit('objective', text); },
  /** Tutorial / context hint; {action} names become key labels. */
  hint(text, ms = 6000) { const o = { vi: withKeys(text.vi), en: withKeys(text.en) }; lastHint = { text: o, ms, at: performance.now() }; em.emit('hint', o, ms); },
  note(text) { paused = true; em.emit('note', text); },
  subtitle(text, ms = 4000) { em.emit('subtitle', text, ms); },
  checkpoint(id) { save.setCheckpoint(chapterId, id, { ...S.flags }); em.emit('checkpoint', id); },
  complete() { if (S.over) return; S.over = true; game.flushPlaytime(); em.emit('complete', chapterId); },
  /** Add an interactable (E). */
  interact(o) { const it = { r: .14, enabled: true, ...o, pos: o.pos.clone ? o.pos.clone() : new THREE.Vector3(...o.pos) }; S.interacts.push(it); return it; },
  removeInteract(id) { S.interacts = S.interacts.filter(i => i.id !== id); },
  /** A noise at p heard by cats within r. */
  noise(p, r, loud = false) { S.cats.forEach(c => c.hear(p, r, loud)); S.herons.forEach(h => h.hear(p, r)); },
  soundAt(name, p, o = {}) { return audio.playAt(name, p, R.camera, o); },
  sound(name, o = {}) { return audio.play(name, o); },
  inZone(tag, id) { const p = player.pos; return S.world.zonesAt(p.x, p.y + .02, p.z, tag).some(z => !id || z.id === id); },
  near(x, z, r, y) { const p = player.pos; return Math.hypot(p.x - x, p.z - z) < r && (y == null || Math.abs(p.y - y) < .25); },
  heal(n) { player.heal(n); em.emit('heal', n); },
};

// ------------------------------------------------------------------ session
function disposeSession() {
  if (!S) return;
  S.cats.forEach(c => c.dispose()); S.herons.forEach(h => h.dispose()); S.wisps.forEach(w => w.dispose());
  S.heart?.stop(.2);
  player.detach();
  S.level.dispose?.();
  S.world.dispose();
  S.scene.traverse(o => {
    const m = /** @type {any} */ (o);
    m.geometry?.dispose?.();
    (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach(mt => {
      for (const k of ['map', 'normalMap', 'emissiveMap']) if (mt[k] && !mt[k].userData?.keep) mt[k].dispose();
      mt.dispose();
    });
  });
  S = null;
}

function buildSession(id, checkpointId) {
  disposeSession();
  const ch = getChapter(id);
  const scene = new THREE.Scene();
  const world = createWorld();
  const kit = createKit(scene, world);
  S = { scene, world, level: null, cats: [], herons: [], wisps: [], interacts: [], flags: {}, prompt: null, chaseOff: 0, heart: null, over: false, shadowLights: [], music: null };
  const cp = checkpointId ? save.get().checkpoint : null;
  if (cp?.flags) Object.assign(S.flags, cp.flags);
  const level = LEVELS[ch.level].build(kit, api);
  S.level = level;
  S.shadowLights = level.shadowLights ?? [];
  S.music = level.music ?? null;
  scene.add(R.camera);
  S.cats = (level.cats ?? []).map(cfg => createCat(scene, world, cfg));
  S.herons = (level.herons ?? []).map(cfg => createHeron(scene, world, cfg));
  S.wisps = (level.wisps ?? []).map(cfg => createWisp(scene, world, cfg));
  world.onImpact((p, loud, prop) => {
    // Hard things (ceramic, stone) carry further than soft ones (fruit, sandals).
    const hard = prop.sound === 'clack', r = Math.min(6, Math.max(.6, loud / (hard ? 3 : 6)));
    audio.playAt('thud', p, R.camera, { volume: Math.min(1, loud / 25), rate: hard ? 2.6 + Math.random() * .4 : 1.5, maxDist: 9 });
    api.noise(p, r, hard && loud > 12);
  });
  const at = (checkpointId && level.checkpoints?.[checkpointId]) || level.spawn;
  player.spawn(world, at.pos.clone(), at.yaw);
  player.setLantern(!!S.flags.lantern, false);
  player.setCarry(null);
  world.step(1 / 60); // build the query structures so rays work before the first frame
  level.start?.(checkpointId ?? null);
  audio.ambience(level.ambience ?? { wind: .4 });
  audio.music(S.music);
  R.setScene(scene);
  applySettings();
  R.renderer.compile(scene, R.camera);
}

// ------------------------------------------------------------------ frame
function updatePlay(dt) {
  const s = settings.all();
  const danger = S.cats.some(c => c.state === 'chase' || c.state === 'suspicious') || S.herons.some(h => h.state === 'alert' || h.state === 'strike');
  const wz = S.world.zonesAt(player.pos.x, player.pos.y, player.pos.z, 'water')[0];
  player.update(dt, S.world, { sensitivity: s.sensitivity, invertY: s.invertY, shake: s.cameraShake, fast, danger, water: wz ? wz.data?.surface ?? 0 : null });
  S.world.step(dt);

  // Exposure: light, crouch, lantern, hiding.
  const p = player.pos, zs = S.world.zonesAt(p.x, p.y + .02, p.z);
  let vis = .55 * (player.crouched ? .6 : 1) * (player.speed < .05 ? .75 : 1);
  if (player.lanternOn) vis *= 2.2;
  if (zs.some(z => z.tag === 'light')) vis *= 1.8;
  if (zs.some(z => z.tag === 'shadow')) vis *= .45;
  const hidden = !player.lanternOn && zs.some(z => z.tag === 'hide' && (!z.data?.needCrouch || player.crouched));
  const safe = zs.some(z => z.tag === 'safe');
  const pl = { pos: p, vis, hidden, noise: player.noise, safe };
  if (player.impulse > 0) { api.noise(p.clone(), player.impulse, player.impulse > 2.5); player.impulse = 0; }

  let maxDetect = 0, chasing = false;
  for (const c of S.cats) {
    const r = c.update(dt, S.world, pl, R.camera);
    if (r?.type === 'attack') {
      player.damage(r.damage, r.from); em.emit('damage', r.damage);
      audio.play('thud', { volume: .8, rate: .9 });
    }
    maxDetect = Math.max(maxDetect, c.detect); if (c.state === 'chase') chasing = true;
  }
  for (const h of S.herons) {
    const r = h.update(dt, { pos: p, speed: player.speed, hidden, swimming: player.swimming }, R.camera);
    if (r?.type === 'attack') { player.damage(r.damage, r.from); em.emit('damage', r.damage); }
    maxDetect = Math.max(maxDetect, h.detect);
  }
  for (const w of S.wisps) w.update(dt, player, R.camera);
  if (player.hurtRecently) {} // HUD flashes from 'damage'
  if (player.dead && !S.over) { S.over = true; game.flushPlaytime(); em.emit('dead', chapterId); return; }

  // Chase music + heartbeat.
  if (chasing) { S.chaseOff = 0; audio.music('chase', { fade: .4, volume: .8 }); }
  else if ((S.chaseOff += dt) > 3) audio.music(S.music, { fade: 3 });
  if (!S.heart) S.heart = audio.play('heartbeat', { loop: true, volume: 0, bus: 'sfx' });
  S.heart?.set(maxDetect > .15 ? Math.min(.9, maxDetect * maxDetect * 1.1) : 0, 0);

  // Interaction prompt.
  const cam = R.camera, fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  let best = null, bestD = 1e9;
  for (const it of S.interacts) {
    if (!it.enabled) continue;
    const d = it.pos.distanceTo(cam.position); if (d > it.r) continue;
    const dir = it.pos.clone().sub(cam.position).normalize();
    if (fwd.dot(dir) < .55 && d > it.r * .45) continue;
    if (d < bestD) { best = it; bestD = d; }
  }
  S.prompt = best;

  S.level.update?.(dt, t);
  Object.assign(hud, {
    hp: player.hp, stamina: player.stamina, exhausted: player.exhausted, detect: maxDetect, chase: chasing,
    prompt: best ? `[${keyOf('interact')}] ${tx(best.label)}` : '', carry: player.carry, lantern: player.lanternOn, hidden, climbing: player.climbing,
    swimming: player.swimming, drowning: player.drowning,
  });
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(1 / 20, (now - last) / 1000 || 0); last = now;
  if (mode === 'hidden') return;
  t += dt;
  if (mode === 'attract') { attractCamera(R.camera); village.update(t, R.camera); }
  else if (S) {
    if (!paused && input.locked && !S.over) { updatePlay(dt); playtime += dt; }
    else { input.consumeMouse(); S.level.update?.(0, t); }
  }
  R.render(t);
}

// Interact / lantern keys while playing.
input.onKey((e) => {
  if (mode !== 'play' || paused || !input.locked || !S || S.over || e.repeat) return;
  const k = settings.get('keys');
  if (e.code === k.interact && S.prompt) { const it = S.prompt; it.onUse(api); audio.ui('click', .3, 1.3); }
  else if (e.code === k.lantern) player.toggleLantern();
});

export const game = {
  /** Build renderer + menu village once. @param {HTMLElement} container */
  init(container) {
    view = container;
    R = createRenderer(container);
    village = buildPlaceholderLevel(R.scene, R.renderer);
    player = createPlayer(R.camera);
    input.setLockTarget(R.renderer.domElement);
    applySettings();
    settings.onChange((k) => { if (!k.startsWith('vol') && k !== 'lang' && k !== 'keys' && k !== 'subtitles') applySettings(); });
    attractCamera(R.camera); R.renderer.compile(R.scene, R.camera);
    requestAnimationFrame(frame);
  },
  /** @param {string} ev @param {Function} fn */
  on: (ev, fn) => em.on(ev, fn),
  emit: (ev, ...a) => em.emit(ev, ...a),
  /** Current level objective (set by the script). */
  get objective() { return curObjective; },
  /** A hint emitted in the last second (e.g. before the HUD existed). */
  get pendingHint() { return lastHint && performance.now() - lastHint.at < 1000 ? lastHint : null; },

  /** @param {'hidden'|'attract'|'play'} m */
  setMode(m) {
    mode = m;
    view.classList.toggle('visible', m !== 'hidden');
    if (m !== 'play') {
      paused = false; fast = false;
      if (S) { audio.music(null, { fade: 1 }); disposeSession(); }
      R.setScene(R.scene); R.scene.add(R.camera); applySettings();
    }
  },
  get mode() { return mode; },

  /** Start a chapter (optionally from a saved checkpoint id). */
  start(id, checkpointId = null) {
    chapterId = id; paused = false; fast = false; playtime = 0; curObjective = null; lastHint = null;
    mode = 'play'; view.classList.add('visible');
    buildSession(id, checkpointId);
  },
  get chapterId() { return chapterId; },
  setPaused(p) { paused = p; },
  get paused() { return paused; },
  toggleFast() { fast = !fast; return fast; },
  flushPlaytime() { save.addPlaytime(Math.round(playtime)); playtime = 0; },
  get canvas() { return R.renderer.domElement; },
  /** Debug/test access. */
  get debug() { return { player, S, api, camera: R.camera, R }; },
  /** Test hook: advance the simulation n fixed steps (independent of the browser frame rate). */
  debugStep(n = 1, dt = 1 / 60) { for (let i = 0; i < n && S && !S.over; i++) { t += dt; updatePlay(dt); } },
};
