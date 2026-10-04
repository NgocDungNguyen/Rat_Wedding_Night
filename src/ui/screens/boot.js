// Boot / loading: runs the loader, then waits for a click (browsers need a gesture to start audio).
import { h, button } from '../components.js';
import { t } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { save } from '../../core/save.js';

/** @param {{load:(step:(label:string, p:number)=>void)=>Promise<void>}} params */
export default function boot(params) {
  let status = 'loading', label = '', p = 0;
  /** @type {HTMLElement} */ let bar, lbl;

  const next = () => screens.go(save.meta.get('langChosen') ? 'opening' : 'langpick');

  return {
    render() {
      bar = h('i', { style: `width:${p * 100}%` });
      lbl = h('div', { class: 'hint', text: label ? `${t('boot.loading')} · ${label}` : t('boot.loading') });
      return h('div', { class: 'card boot' },
        h('div', { class: 'seal', text: '囍' }),
        status === 'ready'
          ? button(save.meta.get('langChosen') ? t('boot.start') : 'Nhấn để bắt đầu · Click to begin', next, { cls: 'pulse', fid: 'start', autofocus: true, sound: 'bell' })
          : h('div', { style: 'display:grid;gap:12px;justify-items:center;margin-top:18px' }, h('div', { class: 'bar' }, bar), lbl));
    },
    async enter() {
      await params.load((l, v) => {
        label = t(`boot.${l}`); p = v;
        if (bar) { bar.style.width = `${v * 100}%`; lbl.textContent = `${t('boot.loading')} · ${label}`; }
      });
      status = 'ready';
      screens.rerender();
    },
  };
}
