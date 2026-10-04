// In-game HUD + pause menu. Losing pointer lock (Esc) opens the pause menu.
// Debug keys (TODO: remove once real triggers exist): F8 complete chapter, F9 game over, F7 fast move.
import { h, button } from '../components.js';
import { t, tx } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { input } from '../../core/input.js';
import { settings } from '../../core/settings.js';
import { getChapter } from '../../data/chapters.js';
import { game } from '../../game/gameplay.js';

const openPause = () => { if (!screens.has('pause')) screens.push('pause'); };

export function hud({ id }) {
  const ch = getChapter(id);
  const offs = [];
  /** @type {HTMLElement} */ let veil, fastEl;

  const syncVeil = () => { if (veil) veil.hidden = input.locked; };

  return {
    render() {
      veil = h('div', { class: 'resume-veil', hidden: input.locked, onclick: () => input.lock() }, h('span', { class: 'pulse', text: t('hud.clickToResume') }));
      fastEl = h('span', { class: 'fast' });
      return h('div', { class: 'hud' },
        h('div', { class: 'crosshair' }),
        h('div', { class: 'objective' }, h('div', { class: 'eyebrow', text: t('intro.objective') }), h('div', { class: 'txt', text: tx(ch.objective) })),
        // TODO (M6): subtitle system fills this
        settings.get('subtitles') ? h('div', { class: 'subtitles' }) : null,
        h('div', { class: 'debug' }, t('hud.debug'), ' ', fastEl),
        veil);
    },
    enter() {
      audio.ambience({ wind: .45, gecko: .18 });
      offs.push(input.onLock((locked) => {
        syncVeil();
        if (!locked && screens.is('hud') && game.mode === 'play') openPause();
      }));
    },
    resume: syncVeil,
    exit() { offs.forEach(f => f()); },
    key(e) {
      if (e.code === 'F8') { e.preventDefault(); input.unlock(); screens.go('chapterComplete', { id }); return true; }
      if (e.code === 'F9') { e.preventDefault(); input.unlock(); screens.go('gameOver', { id }); return true; }
      if (e.code === 'F7') { e.preventDefault(); fastEl.textContent = game.toggleFast() ? '· FAST' : ''; return true; }
      if (e.code === 'Escape') { openPause(); return true; }
      return true; // gameplay keys never drive menu navigation
    },
  };
}

export function pause() {
  const resume = () => { input.lock(); screens.pop(); };
  const opened = performance.now();
  return {
    overlay: true,
    render: () => h('div', { class: 'backdrop' },
      h('div', { class: 'panel small pause' },
        h('h2', { text: t('pause.title') }),
        h('nav', {},
          button(t('pause.resume'), resume, { fid: 'resume', autofocus: true }),
          button(t('pause.settings'), () => screens.push('settings', { from: 'pause' }), { fid: 'settings' }),
          button(t('pause.restart'), () => screens.go('chapterIntro', { id: game.chapterId }), { fid: 'restart' }),
          button(t('pause.menu'), () => screens.go('menu'), { fid: 'menu' })))),
    enter() { game.setPaused(true); audio.muffle(true); game.flushPlaytime(); },
    exit() { game.setPaused(false); audio.muffle(false); },
    // Esc closes the menu; the HUD then asks for a click to re-lock the mouse.
    // (Ignore the same Esc press that released pointer lock and opened this menu.)
    back: () => { if (performance.now() - opened > 300) screens.pop(); },
  };
}
