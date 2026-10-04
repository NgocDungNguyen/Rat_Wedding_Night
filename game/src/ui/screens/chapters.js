// Chapter select: six rice-paper cards; locked ones are greyed out and stamped.
import { h, button } from '../components.js';
import { t, tx } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { save } from '../../core/save.js';
import { CHAPTERS } from '../../data/chapters.js';

export default function chapters() {
  const card = (c) => {
    const open = save.isUnlocked(c.id), done = save.isCompleted(c.id);
    return h('button', {
      class: `ch${open ? '' : ' locked'}`, 'data-fid': `ch${c.id}`, 'aria-disabled': open ? null : 'true',
      onpointerenter: (e) => { if (open && document.activeElement !== e.currentTarget) { e.currentTarget.focus({ preventScroll: true }); audio.ui('click', .1, 1.9); } },
      onclick: () => {
        if (!open) { audio.ui('thud', .6); return; }
        audio.ui('click', .5); screens.go('chapterIntro', { id: c.id });
      },
    },
    h('div', { class: 'n', text: `${t('chapters.chapter', { n: c.id })} · ${tx(c.night)}` }),
    h('span', { class: 'tt', text: open ? tx(c.title) : '· · ·' }),
    h('div', { class: 'ob', text: open ? tx(c.objective) : '' }),
    !open ? h('span', { class: 'stamp', text: t('chapters.locked') }) : done ? h('span', { class: 'stamp', text: t('chapters.completed') }) : null);
  };

  return {
    render: () => h('div', { class: 'backdrop' },
      h('div', { class: 'panel' },
        h('h2', { text: t('chapters.title') }),
        h('div', { class: 'chapter-grid' }, CHAPTERS.map(card)),
        h('div', { class: 'panel-foot' }, button(t('settings.back'), () => screens.pop(), { fid: 'back' })))),
    back: () => screens.pop(),
  };
}
