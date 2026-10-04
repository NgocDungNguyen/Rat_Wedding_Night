// Screen manager: a stack of UI screens in the #ui overlay.
// A screen factory gets (params) and returns { render(), enter?, exit?, back?, key?, overlay? }.
// Overlay screens (pause, confirm) keep the screen below visible.
import { onLangChange } from './i18n.js';
import { input } from './input.js';

/**
 * @typedef {{ render():HTMLElement, enter?():void, exit?():void, back?():void, key?(e:KeyboardEvent):boolean|void, resume?():void, overlay?:boolean }} ScreenInst
 * @typedef {(params:any) => ScreenInst} ScreenDef
 */

const root = /** @type {HTMLElement} */ (document.getElementById('ui'));
/** @type {Map<string, ScreenDef>} */ const defs = new Map();
/** @type {(ScreenInst & {name:string, layer:HTMLElement})[]} */ const stack = [];

function refresh() {
  let visible = true;
  for (let i = stack.length - 1; i >= 0; i--) {
    const s = stack[i], isTop = i === stack.length - 1;
    s.layer.hidden = !visible;
    s.layer.inert = !isTop;
    if (!s.overlay) visible = false;
  }
}

function focusFirst(layer) {
  const el = layer.querySelector('[autofocus]:not([disabled])') || layer.querySelector('button:not([disabled])');
  /** @type {HTMLElement|null} */ (el)?.focus({ preventScroll: true });
}

function mount(name, params) {
  const def = defs.get(name);
  if (!def) throw new Error(`Unknown screen: ${name}`);
  const inst = Object.assign(def(params ?? {}), { name, layer: document.createElement('div') });
  inst.layer.className = `layer screen-${name}${inst.overlay ? ' overlay' : ''}`;
  inst.layer.append(inst.render());
  root.append(inst.layer);
  stack.push(inst);
  refresh();
  inst.enter?.();
  focusFirst(inst.layer);
}

function unmount(inst) { inst.exit?.(); inst.layer.remove(); }

export const screens = {
  /** @param {string} name @param {ScreenDef} def */
  register(name, def) { defs.set(name, def); },
  /** Replace the whole stack with one screen. */
  go(name, params) { while (stack.length) unmount(stack.pop()); mount(name, params); },
  push(name, params) { mount(name, params); },
  pop() {
    const s = stack.pop(); if (s) unmount(s);
    refresh();
    const top = stack.at(-1);
    if (top) { top.resume?.(); focusFirst(top.layer); }
  },
  top: () => stack.at(-1),
  is: (name) => stack.at(-1)?.name === name,
  has: (name) => stack.some(s => s.name === name),
  /** Re-render the top screen (e.g. after a data change). */
  rerender() {
    const top = stack.at(-1); if (!top) return;
    const focusedId = /** @type {HTMLElement} */ (document.activeElement)?.dataset?.fid;
    top.layer.replaceChildren(top.render());
    const again = focusedId && top.layer.querySelector(`[data-fid="${focusedId}"]`);
    if (again) /** @type {HTMLElement} */ (again).focus({ preventScroll: true }); else focusFirst(top.layer);
  },
};

// Live language switch: re-render every screen.
onLangChange(() => {
  const focusedId = /** @type {HTMLElement} */ (document.activeElement)?.dataset?.fid;
  for (const s of stack) s.layer.replaceChildren(s.render());
  const top = stack.at(-1); if (!top) return;
  const again = focusedId && top.layer.querySelector(`[data-fid="${focusedId}"]`);
  if (again) /** @type {HTMLElement} */ (again).focus({ preventScroll: true }); else focusFirst(top.layer);
});

// Keyboard: screen handler first, then Esc = back, Up/Down = move focus.
input.onKey((e) => {
  const top = stack.at(-1); if (!top) return;
  if (top.key?.(e)) return;
  if (e.code === 'Escape' && top.back) { e.preventDefault(); top.back(); return; }
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
    if (/** @type {HTMLElement} */ (document.activeElement)?.tagName === 'SELECT') return;
    const items = [...top.layer.querySelectorAll('button:not([disabled]), input:not([disabled])')];
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(/** @type {Element} */ (document.activeElement));
    const n = e.code === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    /** @type {HTMLElement} */ (items[i < 0 ? 0 : n]).focus();
  }
});
