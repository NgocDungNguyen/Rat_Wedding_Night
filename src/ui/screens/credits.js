// Credits: team (TODO), inspiration, tech, fonts and the Wikimedia Commons sound credits.
import { h, button } from '../components.js';
import { t } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import sfxCredits from '../../data/sfx-credits.json';
import gameSfxCredits from '../../data/sfx-game-credits.json';

const decode = (s) => String(s ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

export default function credits() {
  const sounds = [...sfxCredits, ...gameSfxCredits];
  return {
    render: () => h('div', { class: 'backdrop' },
      h('div', { class: 'panel credits' },
        h('h2', { text: t('credits.title') }),
        h('dl', {},
          h('dt', { text: t('credits.design') }), h('dd', { text: t('credits.designBy') }),
          h('dt', { text: t('credits.inspired') }), h('dd', { text: t('credits.inspiredBy') }),
          h('dt', { text: t('credits.tech') }), h('dd', { text: 'three.js (MIT) · Rapier physics (Apache-2.0) · Vite (MIT)' }),
          h('dt', { text: t('credits.fonts') }), h('dd', { text: 'Cormorant Garamond · Be Vietnam Pro (SIL Open Font License)' }),
          h('dt', { text: t('credits.music') }), h('dd', { text: t('credits.musicBy') }),
          h('dt', { text: t('credits.sounds') }),
          h('dd', {}, h('ul', {}, sounds.map(c => h('li', {},
            `${decode(c.title).replace(/^File:/, '')} — ${decode(c.artist)} · ${c.license} · `,
            h('a', { href: c.page, target: '_blank', rel: 'noopener', text: 'Commons' })))))),
        h('div', { class: 'panel-foot' }, button(t('settings.back'), () => screens.pop(), { fid: 'back' })))),
    back: () => screens.pop(),
  };
}
