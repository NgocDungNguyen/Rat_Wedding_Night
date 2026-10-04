// In-game HUD: objective, hints, interaction prompt, health + stamina, cat-awareness eye, notes, checkpoint toast,
// damage flash. Losing pointer lock (Esc) opens the pause menu.
// Debug keys (TODO: remove for release): F8 complete chapter, F9 die, F7 fast move.
import { h, button } from '../components.js';
import { t, tx } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { input } from '../../core/input.js';
import { settings } from '../../core/settings.js';
import { save } from '../../core/save.js';
import { getChapter } from '../../data/chapters.js';
import { game, hud as H } from '../../game/gameplay.js';

const openPause = () => { if (!screens.has('pause')) screens.push('pause'); };

/** Chapter finished: outro cut-scene, then the dawn card. */
export function finishChapter(id) {
  input.unlock();
  const ch = getChapter(id);
  const toDawn = () => screens.go('chapterComplete', { id });
  if (ch.cutOut) screens.go('cutscene', { key: ch.cutOut, onDone: toDawn }); else toDawn();
}

export function hud({ id }) {
  const ch = getChapter(id);
  const offs = [];
  let raf = 0, objective = game.objective ?? ch.objective, note = null;
  /** @type {Record<string, HTMLElement>} */ const el = {};

  const syncVeil = () => { if (el.veil) el.veil.hidden = input.locked || !!note; };
  const toast = (text, cls = '') => {
    const n = h('div', { class: `toast ${cls}`, text }); el.toasts.append(n); setTimeout(() => n.remove(), 2600);
  };
  const showObjective = () => {
    el.obj.replaceChildren(h('div', { class: 'eyebrow', text: t('intro.objective') }), h('div', { class: 'txt', text: tx(objective) }));
    el.obj.classList.remove('anim'); void el.obj.offsetWidth; el.obj.classList.add('anim');
  };
  const closeNote = () => {
    if (!note) return; note = null; el.note.hidden = true;
    requestAnimationFrame(() => game.setPaused(false)); syncVeil();
  };

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!el.hp) return;
    el.hp.style.width = `${H.hp}%`; el.hpBox.classList.toggle('low', H.hp < 30);
    el.st.style.width = `${H.stamina}%`; el.stBox.classList.toggle('ex', H.exhausted); el.stBox.classList.toggle('full', H.stamina >= 99.5);
    el.prompt.textContent = H.prompt; el.prompt.hidden = !H.prompt;
    const d = Math.min(1, H.detect);
    el.eye.style.setProperty('--open', String(H.chase ? 1 : d));
    el.eye.classList.toggle('chase', H.chase); el.eye.classList.toggle('hidden', d < .03 && !H.chase);
    el.status.textContent = [H.hidden ? t('hud.hidden') : '', H.carry ? t('hud.carrying') : '', H.lantern ? t('hud.lanternOn') : ''].filter(Boolean).join(' · ');
    el.vignette.style.opacity = String(H.hp < 30 ? .55 + Math.sin(performance.now() / 260) * .2 : 0);
  }

  return {
    render() {
      el.veil = h('div', { class: 'resume-veil', hidden: input.locked, onclick: () => input.lock() }, h('span', { class: 'pulse', text: t('hud.clickToResume') }));
      el.obj = h('div', { class: 'objective' });
      el.hp = h('i'); el.st = h('i');
      el.hpBox = h('div', { class: 'meter hp' }, h('span', { class: 'lbl', text: t('hud.health') }), h('div', { class: 'track' }, el.hp));
      el.stBox = h('div', { class: 'meter st' }, h('span', { class: 'lbl', text: t('hud.stamina') }), h('div', { class: 'track' }, el.st));
      el.prompt = h('div', { class: 'prompt', hidden: true });
      el.hint = h('div', { class: 'hint-box', hidden: true });
      el.eye = h('div', { class: 'eye hidden' }, h('i', { class: 'lid' }), h('i', { class: 'pupil' }));
      el.toasts = h('div', { class: 'toasts' });
      el.status = h('div', { class: 'status' });
      el.flash = h('div', { class: 'flash' });
      el.vignette = h('div', { class: 'low-hp' });
      el.note = h('div', { class: 'note-veil', hidden: !note, onclick: closeNote },
        h('div', { class: 'note-paper' }, h('p', { class: 'note-text', text: note ? tx(note) : '' }), h('div', { class: 'hint', text: t('hud.closeNote') })));
      el.fast = h('span', { class: 'fast' });
      el.subs = settings.get('subtitles') ? h('div', { class: 'subtitles' }) : h('div');
      const root = h('div', { class: 'hud' },
        el.vignette, el.flash,
        h('div', { class: 'crosshair' }), el.prompt, el.eye, el.obj, el.toasts,
        h('div', { class: 'meters' }, el.status, el.hpBox, el.stBox),
        el.hint, el.subs,
        import.meta.env.DEV ? h('div', { class: 'debug' }, t('hud.debug'), ' ', el.fast) : null,
        el.note, el.veil);
      requestAnimationFrame(showObjective);
      return root;
    },
    enter() {
      offs.push(input.onLock((locked) => {
        syncVeil();
        if (!locked && screens.is('hud') && game.mode === 'play') { closeNote(); openPause(); }
      }));
      offs.push(game.on('objective', (o) => { objective = o; showObjective(); }));
      let hintTimer = 0;
      offs.push(game.on('hint', (o, ms) => {
        el.hint.textContent = tx(o); el.hint.hidden = false; el.hint.classList.remove('anim'); void el.hint.offsetWidth; el.hint.classList.add('anim');
        clearTimeout(hintTimer); hintTimer = setTimeout(() => { el.hint.hidden = true; }, ms);
      }));
      offs.push(game.on('subtitle', (o, ms) => { if (!settings.get('subtitles')) return; el.subs.textContent = tx(o); setTimeout(() => { el.subs.textContent = ''; }, ms); }));
      offs.push(game.on('note', (o) => { note = o; el.note.querySelector('.note-text').textContent = tx(o); el.note.hidden = false; audio.ui('click', .3, .6); syncVeil(); }));
      offs.push(game.on('checkpoint', () => toast(t('hud.saved'), 'saved')));
      offs.push(game.on('heal', (n) => toast(`+${n} ${t('hud.health')}`, 'heal')));
      offs.push(game.on('damage', () => { el.flash.classList.remove('on'); void el.flash.offsetWidth; el.flash.classList.add('on'); }));
      offs.push(game.on('dead', () => { input.unlock(); setTimeout(() => screens.go('gameOver', { id }), 900); el.flash.classList.add('dead'); }));
      offs.push(game.on('complete', () => finishChapter(id)));
      const ph = game.pendingHint; if (ph) game.emit('hint', ph.text, ph.ms);
      tick();
    },
    resume: syncVeil,
    exit() { offs.forEach(f => f()); cancelAnimationFrame(raf); },
    key(e) {
      if (note && (e.code === settings.get('keys').interact || e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); closeNote(); return true; }
      if (import.meta.env.DEV && e.code === 'F8') { e.preventDefault(); game.debug.api.complete(); return true; }
      if (import.meta.env.DEV && e.code === 'F9') { e.preventDefault(); game.debug.player.damage(999); return true; }
      if (import.meta.env.DEV && e.code === 'F7') { e.preventDefault(); el.fast.textContent = game.toggleFast() ? '· FAST' : ''; return true; }
      if (e.code === 'Escape') { closeNote(); openPause(); return true; }
      return true; // gameplay keys never drive menu navigation
    },
  };
}

export function pause() {
  const resume = () => { input.lock(); screens.pop(); };
  const opened = performance.now();
  const cp = save.checkpointFor(game.chapterId);
  return {
    overlay: true,
    render: () => h('div', { class: 'backdrop' },
      h('div', { class: 'panel small pause' },
        h('h2', { text: t('pause.title') }),
        h('nav', {},
          button(t('pause.resume'), resume, { fid: 'resume', autofocus: true }),
          button(t('pause.settings'), () => screens.push('settings', { from: 'pause' }), { fid: 'settings' }),
          cp ? button(t('pause.checkpoint'), () => screens.go('chapterIntro', { id: game.chapterId, resume: true }), { fid: 'cp' }) : null,
          button(t('pause.restart'), () => screens.go('chapterIntro', { id: game.chapterId }), { fid: 'restart' }),
          button(t('pause.menu'), () => screens.go('menu'), { fid: 'menu' })))),
    enter() { game.setPaused(true); audio.muffle(true); game.flushPlaytime(); },
    exit() { game.setPaused(false); audio.muffle(false); },
    // (Ignore the same Esc press that released pointer lock and opened this menu.)
    back: () => { if (performance.now() - opened > 300) screens.pop(); },
  };
}
