// Full-screen story cards: farewell (Quit), chapter intro, chapter complete, game over.
import { h, button } from '../components.js';
import { t, tx } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { save } from '../../core/save.js';
import { input } from '../../core/input.js';
import { getChapter } from '../../data/chapters.js';
import { game } from '../../game/gameplay.js';

/** "Quit" on the web: a farewell card; click returns to the menu. */
export function farewell() {
  const back = () => screens.go('menu');
  return {
    render: () => h('div', { class: 'card', onclick: back },
      h('h1', { class: 'big', text: t('farewell.title') }),
      h('p', { class: 'line', text: t('farewell.sub') }),
      h('div', { class: 'bottom hint pulse', text: t('farewell.click') })),
    enter() { game.setMode('hidden'); audio.music(null, { fade: 2.5 }); audio.ambience({}, 3); audio.play('bell', { volume: .6 }); },
    key(e) { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') { back(); return true; } },
  };
}

/**
 * Chapter intro card. A click/key starts play (the gesture also grants pointer lock).
 * Fresh start: autosave + intro cut-scene. resume: continue from the saved checkpoint.
 */
export function chapterIntro({ id, resume = false, skipCut = false }) {
  const ch = getChapter(id);
  const cp = resume ? save.checkpointFor(id) : null;
  const play = () => { input.lock(); game.start(id, cp); screens.go('hud', { id }); };
  const begin = () => {
    if (cp || !ch.cutIn || skipCut) { play(); return; }
    screens.go('cutscene', { key: ch.cutIn, onDone: play });
  };
  return {
    render: () => h('div', { class: 'card', onclick: begin },
      h('div', { class: 'eyebrow', text: `${t('intro.chapter', { n: ch.id })} · ${tx(ch.night)}` }),
      h('h1', { class: 'big', text: tx(ch.title) }),
      cp ? h('p', { class: 'line', text: t('intro.fromCheckpoint') }) : h('p', { class: 'line', text: tx(ch.intro) }),
      h('p', { class: 'line', style: 'animation-delay:.9s' }, h('span', { class: 'hint', text: `${t('intro.objective')}: ` }), tx(ch.objective)),
      h('div', { class: 'bottom hint pulse', text: t('intro.continue') })),
    enter() {
      if (!cp) save.startChapter(id);
      game.setMode('hidden');
      audio.music(null, { fade: 2 }); audio.ambience({ wind: .25 });
      audio.play('gong', { volume: .6 });
    },
    key(e) {
      if (e.code === 'Escape') { screens.go('menu'); return true; }
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); begin(); return true; }
    },
  };
}

/** Dawn: marks the chapter complete (autosave) and offers the next one. */
export function chapterComplete({ id }) {
  game.flushPlaytime();
  const ch = getChapter(id), nextId = save.completeChapter(id), next = nextId && getChapter(nextId);
  return {
    render: () => h('div', { class: 'card dawn' },
      h('div', { class: 'eyebrow', text: `${t('intro.chapter', { n: ch.id })} · ${tx(ch.title)}` }),
      h('h1', { class: 'big', text: t('complete.title') }),
      h('p', { class: 'line', text: t('complete.sub', { night: tx(ch.night) }) }),
      next ? h('p', { class: 'line', text: t('complete.unlocked', { chapter: `${t('chapters.chapter', { n: next.id })} · ${tx(next.title)}` }) })
        : h('p', { class: 'line', text: t('complete.end') }),
      h('div', { class: 'actions' },
        next ? button(t('complete.next'), () => screens.go('chapterIntro', { id: next.id }), { fid: 'next', autofocus: true }) : null,
        button(t('complete.menu'), () => screens.go('menu'), { fid: 'menu' }))),
    enter() { game.setMode('hidden'); audio.ambience({}, 2); audio.play('rooster', { volume: .7 }); },
  };
}

/** Health reached zero (cat claws, falls). Retry from the last checkpoint. */
export function gameOver({ id }) {
  game.flushPlaytime();
  return {
    render: () => h('div', { class: 'card' },
      h('h1', { class: 'big red-ink', text: t('over.title') }),
      h('p', { class: 'line', text: t('over.sub') }),
      h('div', { class: 'actions' },
        button(t(save.checkpointFor(id) ? 'over.retryCp' : 'over.retry'), () => screens.go('chapterIntro', { id, resume: true, skipCut: true }), { fid: 'retry', autofocus: true }),
        button(t('over.menu'), () => screens.go('menu'), { fid: 'menu' }))),
    enter() {
      game.setMode('hidden'); audio.ambience({}, .5);
      audio.play('thud', { volume: 1 }); setTimeout(() => audio.play('doghowl', { volume: .5 }), 600);
    },
  };
}
