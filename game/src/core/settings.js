// Settings store: persisted in localStorage, observable, applied live by subscribers.
import { createEmitter, readJSON, writeJSON } from './events.js';
import { DEFAULT_SETTINGS, DEFAULT_KEYS } from '../data/defaults.js';

const KEY = 'lcc.settings.v1';
const em = createEmitter();

function load() {
  const saved = readJSON(KEY);
  const s = structuredClone(DEFAULT_SETTINGS);
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(s)) if (k !== 'keys' && typeof saved[k] === typeof s[k]) s[k] = saved[k];
    if (saved.keys && typeof saved.keys === 'object')
      for (const a of Object.keys(DEFAULT_KEYS)) if (typeof saved.keys[a] === 'string') s.keys[a] = saved.keys[a];
  }
  return s;
}

let state = load();

export const settings = {
  /** @param {keyof typeof DEFAULT_SETTINGS} k */
  get: (k) => state[k],
  all: () => state,
  set(k, v) {
    if (state[k] === v) return;
    state[k] = v; writeJSON(KEY, state); em.emit('change', k, v);
  },
  /** Bind an action to a key code; swaps with any action already using it. */
  setKey(action, code) {
    const other = Object.keys(state.keys).find(a => state.keys[a] === code && a !== action);
    if (other) state.keys[other] = state.keys[action];
    state.keys[action] = code; writeJSON(KEY, state); em.emit('change', 'keys', state.keys);
  },
  /** Reset everything except language. */
  reset() {
    const lang = state.lang;
    state = structuredClone(DEFAULT_SETTINGS); state.lang = lang;
    writeJSON(KEY, state); em.emit('change', '*', null);
  },
  /** @param {(key:string, value:any)=>void} fn @returns {()=>void} unsubscribe */
  onChange: (fn) => em.on('change', fn),
};
