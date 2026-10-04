// Opening: studio card → title + one-line intro. Any key or click skips. TODO: real logo and studio name.
import { h } from '../components.js';
import { t } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { save } from '../../core/save.js';
import { game } from '../../game/gameplay.js';

export default function opening() {
  let phase = 0; const timers = [];
  const done = () => { if (screens.is('opening')) { save.meta.set('openingSeen', true); screens.go('menu'); } };
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  return {
    render() {
      const card = h('div', { class: 'card', onclick: done });
      if (phase === 0) card.append(h('div', { class: 'eyebrow', text: t('opening.studio') }), h('div', { class: 'hint', text: t('opening.presents') }));
      else card.append(
        h('div', { class: 'seal', text: '囍' }),
        h('h1', { class: 'big', text: t('title') }),
        h('div', { class: 'eyebrow', text: t('subtitle') }),
        h('p', { class: 'line', text: t('opening.line') }));
      card.append(h('div', { class: 'bottom hint', text: t('opening.skip') }));
      return card;
    },
    enter() {
      game.setMode('hidden');
      audio.ambience({ wind: .35 });
      at(3000, () => { phase = 1; audio.play('bell', { volume: .7 }); screens.rerender(); });
      at(10500, done);
    },
    exit() { timers.forEach(clearTimeout); },
    key(e) { if (e.code !== 'Tab') { e.preventDefault(); done(); return true; } },
  };
}
