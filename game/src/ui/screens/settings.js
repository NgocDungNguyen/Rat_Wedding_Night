// Settings: four tabs, every change saves and applies immediately. Opened from the menu or the pause menu.
import { h, button, slider, toggle, choice, row } from '../components.js';
import { t } from '../../core/i18n.js';
import { screens } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { settings } from '../../core/settings.js';
import { input, keyLabel } from '../../core/input.js';
import { ACTIONS } from '../../data/defaults.js';

const TABS = ['graphics', 'controls', 'audio', 'access'];
let lastTab = 'graphics';

export default function settingsScreen() {
  let tab = lastTab, waiting = /** @type {string|null} */ (null);
  const s = () => settings.all();
  const setR = (k, v) => { settings.set(k, v); screens.rerender(); };

  const tabs = {
    graphics: () => [
      choice({ label: t('settings.quality'), fid: 'quality', value: s().quality, onChange: v => setR('quality', v),
        options: [{ value: 'low', label: t('settings.qualityLow') }, { value: 'medium', label: t('settings.qualityMedium') }, { value: 'high', label: t('settings.qualityHigh') }] }),
      slider({ label: t('settings.resScale'), fid: 'res', min: 50, max: 100, step: 5, value: s().resScale, format: v => `${v}%`, onInput: v => settings.set('resScale', v) }),
      slider({ label: t('settings.brightness'), fid: 'bright', min: .5, max: 1.5, step: .05, value: s().brightness, format: v => v.toFixed(2),
        onInput: v => { settings.set('brightness', v); calib.style.filter = `brightness(${v * v * 1.6})`; } }),
      calibRow(),
      slider({ label: t('settings.fov'), fid: 'fov', min: 60, max: 100, step: 1, value: s().fov, format: v => `${v}°`, onInput: v => settings.set('fov', v) }),
      toggle({ label: t('settings.motionBlur'), fid: 'mb', value: s().motionBlur, onChange: v => setR('motionBlur', v) }),
      toggle({ label: t('settings.cameraShake'), fid: 'shake', value: s().cameraShake, onChange: v => setR('cameraShake', v) }),
    ],
    controls: () => [
      slider({ label: t('settings.sensitivity'), fid: 'sens', min: .1, max: 3, step: .05, value: s().sensitivity, format: v => v.toFixed(2), onInput: v => settings.set('sensitivity', v) }),
      toggle({ label: t('settings.invertY'), fid: 'inv', value: s().invertY, onChange: v => setR('invertY', v) }),
      ...ACTIONS.map(a => row(t(`actions.${a}`), h('div', { class: 'key' },
        button(waiting === a ? t('settings.pressKey') : keyLabel(s().keys[a]), () => rebind(a), { fid: `key:${a}`, cls: waiting === a ? 'waiting' : '' })))),
      h('div', { class: 'hint', style: 'padding:10px 0', text: t('settings.escFixed') }),
    ],
    audio: () => [
      vol('volMaster', 'sfx'), vol('volMusic', 'music'), vol('volSfx', 'sfx'),
      vol('volVoice', 'voice'), // TODO: test with a real voice line
    ],
    access: () => [
      choice({ label: t('settings.language'), fid: 'lang', value: s().lang, onChange: v => settings.set('lang', v),
        options: [{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }] }),
      toggle({ label: t('settings.subtitles'), fid: 'subs', value: s().subtitles, onChange: v => setR('subtitles', v) }),
    ],
  };

  /** @type {HTMLElement} */ let calib;
  function calibRow() {
    calib = h('div', { class: 'calib-box', text: '囍', style: `filter:brightness(${s().brightness ** 2 * 1.6})` });
    return h('div', { class: 'calib' }, calib, h('span', { text: t('settings.calib') }));
  }

  function vol(key, testBus) {
    return slider({ label: t(`settings.${key}`), fid: key, min: 0, max: 100, step: 1, value: s()[key], format: v => `${v}`,
      onInput: v => settings.set(key, v),
      onCommit: () => audio.play('bell', { bus: testBus, volume: .5 }) });
  }

  function rebind(action) {
    waiting = action; screens.rerender();
    input.captureNextKey((code) => {
      waiting = null;
      if (code) { settings.setKey(action, code); audio.ui('click', .5); }
      screens.rerender();
    });
  }

  const close = () => { input.cancelCapture(); screens.pop(); };

  return {
    render: () => h('div', { class: 'backdrop' },
      h('div', { class: 'panel' },
        h('h2', { text: t('settings.title') }),
        h('div', { class: 'tabs', role: 'tablist' }, TABS.map(k =>
          button(t(`settings.tabs.${k}`), () => { tab = lastTab = k; screens.rerender(); }, { fid: `tab:${k}`, cls: tab === k ? 'on' : '' }))),
        h('div', { class: 'rows' }, tabs[tab]()),
        h('div', { class: 'panel-foot' },
          button(t('settings.back'), close, { fid: 'back' }),
          button(t('settings.reset'), () => { settings.reset(); screens.rerender(); }, { fid: 'reset' })))),
    back: close,
    exit: () => input.cancelCapture(),
  };
}
