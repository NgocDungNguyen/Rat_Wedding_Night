// First-run language picker (shown once; changeable later in Settings).
import { h, button } from '../components.js';
import { screens } from '../../core/state.js';
import { settings } from '../../core/settings.js';
import { save } from '../../core/save.js';

export default function langpick() {
  const pick = (lang) => { settings.set('lang', lang); save.meta.set('langChosen', true); screens.go('opening'); };
  return {
    render: () => h('div', { class: 'card' },
      h('div', { class: 'eyebrow', text: 'Chọn ngôn ngữ · Choose language' }),
      h('div', { class: 'lang-buttons' },
        button('Tiếng Việt', () => pick('vi'), { fid: 'vi', autofocus: true }),
        button('English', () => pick('en'), { fid: 'en' }))),
  };
}
