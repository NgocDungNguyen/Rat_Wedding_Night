// Cut-scene player: Đông Hồ-style stills with a slow pan, bilingual line, click/Space to advance, Esc to skip.
// TODO (voice): play panel.voice when voice files exist.
import { h } from '../components.js';
import { t, tx } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { CUTSCENES } from '../../data/cutscenes.js';
import { W, H } from '../../art/dongho.js';
import { game } from '../../game/gameplay.js';

/** @param {{key:string, onDone:()=>void}} p */
export default function cutscene({ key, onDone }) {
  const panels = CUTSCENES[key] ?? [];
  let i = 0, done = false;
  const finish = () => { if (done) return; done = true; onDone(); };
  const next = () => { if (done) return; i++; if (i >= panels.length) finish(); else { audio.ui('click', .15, .7); screens.rerender(); } };

  return {
    render() {
      const panel = panels[i];
      if (!panel) return h('div', { class: 'card' });
      const c = h('canvas', { width: W, height: H, class: 'still' });
      try { panel.draw(c.getContext('2d')); } catch (e) { console.warn('[cutscene] draw failed', e); }
      return h('div', { class: 'cut', onclick: next },
        h('figure', { class: 'cut-frame' }, c),
        h('p', { class: 'cut-line', text: tx(panel.text) }),
        h('div', { class: 'cut-dots' }, panels.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
        h('div', { class: 'cut-hint hint', text: t('cut.hint') }));
    },
    enter() { game.setMode('hidden'); audio.music(null, { fade: 1.5 }); audio.ambience({ wind: .18 }); if (!panels.length) finish(); },
    key(e) {
      if (e.code === 'Escape') { finish(); return true; }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); next(); return true; }
      return true;
    },
  };
}
