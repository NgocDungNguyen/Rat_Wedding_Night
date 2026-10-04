// Localization: t('menu.newGame', {vars}) and tx({vi, en}) follow the language setting.
import vi from '../i18n/vi.js';
import en from '../i18n/en.js';
import { settings } from './settings.js';

const STRINGS = { vi, en };
export const LANGS = /** @type {const} */ (['vi', 'en']);

export const lang = () => (STRINGS[settings.get('lang')] ? settings.get('lang') : 'vi');

const lookup = (table, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), table);
const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s);

/** @param {string} key dotted path @param {Record<string, any>} [vars] */
export function t(key, vars) {
  const s = lookup(STRINGS[lang()], key) ?? lookup(STRINGS.en, key);
  return typeof s === 'string' ? fill(s, vars) : key;
}

/** Pick the current language from a {vi, en} data object. */
export const tx = (obj) => (obj ? obj[lang()] ?? obj.en ?? '' : '');

/** @param {() => void} fn called after the language changes */
export const onLangChange = (fn) => settings.onChange((k) => { if (k === 'lang' || k === '*') fn(); });

onLangChange(() => { document.documentElement.lang = lang(); });
document.documentElement.lang = lang();
