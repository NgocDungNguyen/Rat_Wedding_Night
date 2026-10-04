// Main menu over the slow "attract" camera in the village. Also the New Game confirm overlay.
import { h, button, title } from '../components.js';
import { t, tx } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { save } from '../../core/save.js';
import { getChapter } from '../../data/chapters.js';
import { game } from '../../game/gameplay.js';

export default function menu() {
  const newGame = () => {
    if (!save.hasProgress()) { save.newGame(); screens.go('chapterIntro', { id: 1 }); return; }
    screens.push('confirm', {
      title: t('menu.confirmTitle'), body: t('menu.confirmBody'),
      onYes: () => { save.newGame(); screens.go('chapterIntro', { id: 1 }); },
    });
  };

  return {
    render() {
      const has = save.hasProgress(), cur = getChapter(save.get().currentChapter);
      return h('div', { class: 'menu' },
        title(t('title'), t('subtitle')),
        h('nav', {},
          button(t('menu.continue'), () => screens.go('chapterIntro', { id: cur.id, resume: true }), {
            fid: 'continue', disabled: !has, autofocus: has,
            sub: has ? t('menu.lastPlayed', { chapter: `${t('chapters.chapter', { n: cur.id })} · ${tx(cur.title)}` }) : undefined }),
          button(t('menu.newGame'), newGame, { fid: 'new', autofocus: !has }),
          button(t('menu.chapters'), () => screens.push('chapters'), { fid: 'chapters' }),
          button(t('menu.settings'), () => screens.push('settings', { from: 'menu' }), { fid: 'settings' }),
          button(t('menu.credits'), () => screens.push('credits'), { fid: 'credits' }),
          button(t('menu.quit'), () => screens.go('farewell'), { fid: 'quit' })),
        h('div', { class: 'foot', text: 'v0.1 · Chương 1–2' }));
    },
    enter() {
      game.setMode('attract');
      audio.music('menuMusic', { volume: .55 });
      audio.ambience({ wind: .2 });
    },
  };
}

/** @param {{title:string, body:string, onYes:()=>void}} p */
export function confirm(p) {
  return {
    overlay: true,
    render: () => h('div', { class: 'backdrop' },
      h('div', { class: 'panel small' },
        h('h2', { text: p.title }), h('p', { text: p.body }),
        h('div', { class: 'actions' },
          button(t('menu.no'), () => screens.pop(), { fid: 'no', autofocus: true }),
          button(t('menu.yes'), p.onYes, { fid: 'yes' })))),
    back: () => screens.pop(),
  };
}
