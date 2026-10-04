// Default settings, key bindings and graphics presets.

/** Rebindable actions, in the order shown in Settings. Pause (Esc) is fixed. */
export const ACTIONS = ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'crouch', 'interact', 'lantern'];

/** KeyboardEvent.code values. */
export const DEFAULT_KEYS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space',
  sprint: 'ShiftLeft', crouch: 'KeyC', interact: 'KeyE', lantern: 'KeyF',
};

export const DEFAULT_SETTINGS = {
  lang: 'vi',
  quality: 'high',        // low | medium | high
  resScale: 100,          // 50–100 %
  brightness: 1.0,        // 0.5–1.5
  fov: 75,                // 60–100
  motionBlur: true,
  cameraShake: true,
  sensitivity: 1.0,       // 0.1–3.0
  invertY: false,
  keys: { ...DEFAULT_KEYS },
  volMaster: 80, volMusic: 70, volSfx: 80, volVoice: 100,
  subtitles: true,
};

export const QUALITY = {
  low:    { shadows: false, shadowMap: 512,  bloom: false, maxPixelRatio: 1 },
  medium: { shadows: true,  shadowMap: 1024, bloom: true,  maxPixelRatio: 1.25 },
  high:   { shadows: true,  shadowMap: 2048, bloom: true,  maxPixelRatio: 2 },
};
