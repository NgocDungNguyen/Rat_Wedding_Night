// Audio manager on Web Audio. Buses: master → music / voice / ui, and game (sfx + ambience) through a
// low-pass used to muffle the world while paused.
import { settings } from './settings.js';

/** Sound names → files in public/. TODO: replace placeholders with final assets. */
export const SOUNDS = {
  click: 'sfx/click.ogg', thud: 'sfx/thud.ogg', bell: 'sfx/templebell.ogg', gong: 'sfx/gongbell.ogg',
  rooster: 'sfx/rooster.ogg', wind: 'sfx/wind.ogg', gecko: 'sfx/gecko.ogg', doghowl: 'sfx/doghowl.ogg',
  breath: 'sfx/breath2.ogg',
  menuMusic: 'music-game/menu_placeholder.ogg', // TODO: real menu theme (this is the trailer mix)
  // Game sounds (Wikimedia Commons, see src/data/sfx-game-credits.json)
  catHiss: 'sfx-game/cat_hiss.ogg', catMeow: 'sfx-game/cat_meow.ogg', catPlead: 'sfx-game/cat_plead.ogg',
  catPurr: 'sfx-game/cat_purr.ogg', catGrowl: 'sfx-game/cat_growl.ogg', heartbeat: 'sfx-game/heartbeat.ogg',
  chase: 'music-game/chase_placeholder.ogg',          // TODO: real chase score
  weddingFar: 'music-game/wedding_far_placeholder.ogg', // TODO: real distant wedding tune
};

/** @type {AudioContext} */ let ctx;
const bus = /** @type {Record<'master'|'music'|'voice'|'ui'|'sfx'|'ambience'|'game', GainNode>} */ ({});
/** @type {BiquadFilterNode} */ let muffleFilter;
/** @type {Map<string, AudioBuffer>} */ const buffers = new Map();
let music = /** @type {{name:string, src:AudioBufferSourceNode, gain:GainNode}|null} */ (null);
/** @type {Map<string, {src:AudioBufferSourceNode, gain:GainNode}>} */ const ambience = new Map();
/** @type {AudioBuffer|null} */ let patterBuf = null;

const curve = (v) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 2);

function applyVolumes() {
  if (!ctx) return;
  const s = settings.all(), now = ctx.currentTime;
  bus.master.gain.setTargetAtTime(curve(s.volMaster), now, .03);
  bus.music.gain.setTargetAtTime(curve(s.volMusic), now, .03);
  bus.voice.gain.setTargetAtTime(curve(s.volVoice), now, .03);
  for (const b of [bus.ui, bus.sfx, bus.ambience]) b.gain.setTargetAtTime(curve(s.volSfx), now, .03);
}

export const audio = {
  init() {
    ctx = new AudioContext();
    const g = () => ctx.createGain();
    bus.master = g(); bus.master.connect(ctx.destination);
    for (const k of ['music', 'voice', 'ui']) { bus[k] = g(); bus[k].connect(bus.master); }
    muffleFilter = ctx.createBiquadFilter(); muffleFilter.type = 'lowpass'; muffleFilter.frequency.value = 22000;
    muffleFilter.connect(bus.master);
    bus.game = g(); bus.game.connect(muffleFilter);
    for (const k of ['sfx', 'ambience']) { bus[k] = g(); bus[k].connect(bus.game); }
    applyVolumes();
    settings.onChange((k) => { if (k === '*' || k.startsWith('vol')) applyVolumes(); });
    // Browsers start audio suspended until a user gesture.
    const unlock = () => { if (ctx.state !== 'running') ctx.resume(); };
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  },
  get unlocked() { return ctx?.state === 'running'; },

  /** Load and decode sounds by name (missing files only log a warning). */
  async load(names = Object.keys(SOUNDS), onEach = () => {}) {
    await Promise.all(names.map(async (n) => {
      if (buffers.has(n)) return onEach(n);
      try {
        const res = await fetch(import.meta.env.BASE_URL + SOUNDS[n]);
        buffers.set(n, await ctx.decodeAudioData(await res.arrayBuffer()));
      } catch (e) { console.warn(`[audio] could not load ${n}`, e); }
      onEach(n);
    }));
  },

  /**
   * Play a one-shot (or looping) sound.
   * @param {string} name @param {{bus?:'sfx'|'ui'|'ambience'|'voice'|'music', volume?:number, rate?:number, loop?:boolean, offset?:number}} [o]
   */
  play(name, o = {}) {
    const buf = buffers.get(name);
    if (!ctx || !buf) return null;
    const src = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
    src.buffer = buf; src.loop = !!o.loop; src.playbackRate.value = o.rate ?? 1;
    gain.gain.value = o.volume ?? 1; pan.pan.value = o.pan ?? 0;
    src.connect(gain).connect(pan).connect(bus[o.bus ?? 'sfx']);
    src.start(0, (o.offset ?? 0) % buf.duration);
    const h = {
      src, gain,
      stop: (fade = .3) => fadeStop({ src, gain }, fade),
      /** Smoothly set volume and stereo pan (for positional loops). */
      set(volume, p = 0) { gain.gain.setTargetAtTime(volume, ctx.currentTime, .05); pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, p)), ctx.currentTime, .05); },
    };
    return h;
  },

  /** Volume and pan of a sound at world position `p` heard from camera `cam`. */
  spatial(p, cam, maxDist = 10) {
    if (!cam) return { volume: .5, pan: 0 };
    const dx = p.x - cam.position.x, dz = p.z - cam.position.z, d = Math.hypot(dx, dz, (p.y ?? 0) - cam.position.y);
    const k = Math.max(0, 1 - d / maxDist);
    const yaw = cam.rotation.y, rx = Math.cos(yaw), rz = -Math.sin(yaw); // camera right vector
    return { volume: k * k, pan: d > 1e-4 ? (dx * rx + dz * rz) / d * .8 : 0 };
  },
  /** One-shot at a world position. */
  playAt(name, p, cam, o = {}) {
    const s = audio.spatial(p, cam, o.maxDist ?? 10);
    if (s.volume < .002) return null;
    return audio.play(name, { ...o, volume: (o.volume ?? 1) * s.volume, pan: s.pan });
  },

  /** Tiny synthesised footstep patter (mouse feet). */
  patter(volume = .2, bright = 1) {
    if (!ctx || ctx.state !== 'running') return;
    if (!patterBuf) {
      patterBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .03), ctx.sampleRate);
      const d = patterBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * .18));
    }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = patterBuf; src.playbackRate.value = .8 + Math.random() * .5;
    f.type = 'bandpass'; f.frequency.value = 1800 * bright + Math.random() * 900; f.Q.value = 1.2;
    g.gain.value = volume;
    src.connect(f).connect(g).connect(bus.sfx); src.start();
  },
  ui(name = 'click', volume = .5, rate = 1) { return audio.play(name, { bus: 'ui', volume, rate }); },

  /** Crossfade to a music track; null stops music. */
  music(name, { fade = 1.5, volume = 1 } = {}) {
    if (music?.name === name) return;
    if (music) { fadeStop(music, fade); music = null; }
    if (!name || !ctx) return;
    const p = audio.play(name, { bus: 'music', loop: true, volume: 0 });
    if (!p) return;
    p.gain.gain.setTargetAtTime(volume, ctx.currentTime, fade / 3);
    music = { name, src: p.src, gain: p.gain };
  },

  /** Set the looping ambience layers, e.g. {wind: .5, gecko: .2}. Others fade out. */
  ambience(layers = {}, fade = 2) {
    for (const [n, a] of ambience) if (!(n in layers)) { fadeStop(a, fade); ambience.delete(n); }
    for (const [n, v] of Object.entries(layers)) {
      if (ambience.has(n)) { ambience.get(n).gain.gain.setTargetAtTime(v, ctx.currentTime, fade / 3); continue; }
      const p = audio.play(n, { bus: 'ambience', loop: true, volume: 0, offset: Math.random() * 5 });
      if (!p) continue;
      p.gain.gain.setTargetAtTime(v, ctx.currentTime, fade / 3);
      ambience.set(n, { src: p.src, gain: p.gain });
    }
  },

  /** Muffle the game buses (pause menu). */
  muffle(on) { if (ctx) muffleFilter.frequency.setTargetAtTime(on ? 500 : 22000, ctx.currentTime, .08); },
};

function fadeStop(a, fade) {
  if (!ctx) return;
  a.gain.gain.cancelScheduledValues(ctx.currentTime);
  a.gain.gain.setTargetAtTime(0, ctx.currentTime, Math.max(.01, fade / 4));
  try { a.src.stop(ctx.currentTime + fade + .1); } catch {}
}
