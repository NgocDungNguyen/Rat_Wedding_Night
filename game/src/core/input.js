// Input: keyboard state by action (rebindable), mouse delta, pointer lock, key capture for rebinding.
import { createEmitter } from './events.js';
import { settings } from './settings.js';

const em = createEmitter();
const down = new Set();
let mdx = 0, mdy = 0;
let locked = false;
/** @type {HTMLElement|null} */ let lockTarget = null;
/** @type {((code:string|null)=>void)|null} */ let capture = null;

addEventListener('keydown', (e) => {
  if (capture) {
    e.preventDefault();
    const cb = capture; capture = null;
    cb(e.code === 'Escape' ? null : e.code);
    return;
  }
  if (['F7', 'F8', 'F9', 'Tab', 'Space'].includes(e.code) && locked) e.preventDefault();
  down.add(e.code);
  em.emit('key', e);
});
addEventListener('keyup', (e) => down.delete(e.code));
addEventListener('blur', () => down.clear());
addEventListener('mousemove', (e) => { if (locked) { mdx += e.movementX; mdy += e.movementY; } });
document.addEventListener('pointerlockchange', () => {
  locked = !!lockTarget && document.pointerLockElement === lockTarget;
  if (!locked) down.clear();
  em.emit('lock', locked);
});
document.addEventListener('pointerlockerror', () => em.emit('lockerror'));

export const input = {
  /** @param {HTMLElement} el element that receives pointer lock (the 3D canvas) */
  setLockTarget(el) { lockTarget = el; },
  get locked() { return locked; },
  /** Request pointer lock. Must be called from a user gesture (click / key). */
  lock() {
    if (!lockTarget || locked) return;
    try {
      const p = /** @type {any} */ (lockTarget.requestPointerLock({ unadjustedMovement: true }));
      p?.catch?.(() => { try { /** @type {any} */ (lockTarget.requestPointerLock())?.catch?.(() => {}); } catch {} });
    } catch { /* lock is retried on the next click */ }
  },
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
  /** Test hook (automation browsers refuse pointer lock): act as if locked. */
  debugForceLock(on = true) { locked = on; em.emit('lock', locked); },
  /** @param {string} action from ACTIONS */
  isDown: (action) => down.has(settings.get('keys')[action]),
  isCodeDown: (code) => down.has(code),
  /** Mouse movement since the last call. */
  consumeMouse() { const d = { dx: mdx, dy: mdy }; mdx = mdy = 0; return d; },
  /** The next key press goes to cb (null when cancelled with Esc). */
  captureNextKey(cb) { capture = cb; },
  cancelCapture() { capture = null; },
  /** @param {(e:KeyboardEvent)=>void} fn */
  onKey: (fn) => em.on('key', fn),
  /** @param {(locked:boolean)=>void} fn */
  onLock: (fn) => em.on('lock', fn),
};

/** Readable key name for the Settings screen. */
export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const names = { ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt',
    Space: 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', CapsLock: 'Caps', Enter: 'Enter', Backspace: 'Backspace' };
  return names[code] ?? code;
}
