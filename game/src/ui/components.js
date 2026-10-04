// Small DOM helpers and reusable menu controls (button, slider, toggle, choice).
import { audio } from '../core/audio.js';
import { t } from '../core/i18n.js';

/**
 * Create an element. Props: class, text, html-free attributes, on* listeners, dataset via data-*.
 * @param {string} tag @param {Record<string, any>} [props] @param {...(Node|string|null|false|undefined)} kids
 */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && !k.includes('-')) /** @type {any} */ (el)[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

const hoverSound = (e) => {
  const b = e.currentTarget; if (b.disabled) return;
  if (document.activeElement !== b) { b.focus({ preventScroll: true }); audio.ui('click', .1, 1.9); }
};

/**
 * Menu button. `fid` keeps focus across re-renders.
 * @param {string} label @param {() => void} onClick
 * @param {{fid?:string, disabled?:boolean, cls?:string, sub?:string, sound?:string|null, autofocus?:boolean}} [o]
 */
export function button(label, onClick, o = {}) {
  return h('button', {
    class: `btn ${o.cls ?? ''}`, disabled: !!o.disabled, 'data-fid': o.fid ?? label, autofocus: o.autofocus,
    onpointerenter: hoverSound,
    onclick: () => { if (o.sound !== null) audio.ui(o.sound ?? 'click', .5); onClick(); },
  }, h('span', { class: 'btn-label', text: label }), o.sub ? h('span', { class: 'btn-sub', text: o.sub }) : null);
}

/** Labelled settings row. */
export const row = (label, control, extra) => h('div', { class: 'row' }, h('span', { class: 'row-label', text: label }), control, extra ?? null);

/**
 * Range slider. onInput fires while dragging (live apply); onCommit on release.
 * @param {{label:string, fid:string, min:number, max:number, step:number, value:number, format?:(v:number)=>string,
 *          onInput:(v:number)=>void, onCommit?:(v:number)=>void}} o
 */
export function slider(o) {
  const fmt = o.format ?? (v => String(v));
  const out = h('span', { class: 'row-value', text: fmt(o.value) });
  const input = h('input', {
    type: 'range', min: o.min, max: o.max, step: o.step, value: o.value, 'data-fid': o.fid, 'aria-label': o.label,
    oninput: (e) => { const v = +e.target.value; out.textContent = fmt(v); o.onInput(v); },
    onchange: (e) => { audio.ui('click', .25, 1.4); o.onCommit?.(+e.target.value); },
  });
  return row(o.label, h('div', { class: 'slider' }, input, out));
}

/** On/Off toggle. @param {{label:string, fid:string, value:boolean, onChange:(v:boolean)=>void}} o */
export function toggle(o) {
  return row(o.label, h('div', { class: 'choice' },
    button(t('settings.on'), () => o.onChange(true), { fid: o.fid + ':on', cls: o.value ? 'on' : '' }),
    button(t('settings.off'), () => o.onChange(false), { fid: o.fid + ':off', cls: !o.value ? 'on' : '' })));
}

/** Segmented choice. @param {{label:string, fid:string, value:any, options:{value:any,label:string}[], onChange:(v:any)=>void}} o */
export function choice(o) {
  return row(o.label, h('div', { class: 'choice' },
    o.options.map(op => button(op.label, () => o.onChange(op.value), { fid: `${o.fid}:${op.value}`, cls: op.value === o.value ? 'on' : '' }))));
}

/** Title block used on several screens. */
export const title = (main, sub) => h('header', { class: 'title' }, h('h1', { text: main }), sub ? h('p', { class: 'title-sub', text: sub }) : null);
