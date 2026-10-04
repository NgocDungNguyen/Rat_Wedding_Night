// Entry: fonts + styles, core systems, screen registry, then Boot.
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/be-vietnam-pro/300.css';
import '@fontsource/be-vietnam-pro/500.css';
import './ui/ui.css';

import { audio, SOUNDS } from './core/audio.js';
import { screens } from './core/state.js';
import { input } from './core/input.js';
import { save } from './core/save.js';
import { settings } from './core/settings.js';
import { game } from './game/gameplay.js';
import { applyPaperTextures } from './ui/paper.js';

import boot from './ui/screens/boot.js';
import langpick from './ui/screens/langpick.js';
import opening from './ui/screens/opening.js';
import menu, { confirm } from './ui/screens/menu.js';
import chapters from './ui/screens/chapters.js';
import settingsScreen from './ui/screens/settings.js';
import credits from './ui/screens/credits.js';
import { farewell, chapterIntro, chapterComplete, gameOver } from './ui/screens/cards.js';
import { hud, pause } from './ui/screens/hud.js';
import cutscene from './ui/screens/cutscene.js';
import { initPhysics } from './game/world.js';

audio.init();

Object.entries({
  boot, langpick, opening, menu, confirm, chapters, settings: settingsScreen, credits,
  farewell, chapterIntro, hud, pause, chapterComplete, gameOver, cutscene,
}).forEach(([name, def]) => screens.register(name, def));

const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

/** @param {(label:string, p:number)=>void} step */
async function load(step) {
  step('fonts', .05);
  await Promise.all([
    document.fonts.load('600 40px "Cormorant Garamond"', 'Đám cưới Làng Chuột'),
    document.fonts.load('700 40px "Cormorant Garamond"', 'LỄ THÀNH HÔN Ễ'),
    document.fonts.load('300 20px "Be Vietnam Pro"', 'Đồng bằng ữ'),
    document.fonts.load('500 20px "Be Vietnam Pro"', 'Tiếp tục'),
  ]).catch(() => {});
  applyPaperTextures();
  step('sound', .15);
  const names = Object.keys(SOUNDS);
  let n = 0;
  await audio.load(names, () => step('sound', .15 + .45 * (++n / names.length)));
  step('world', .62);
  await initPhysics();
  await nextFrame();
  game.init(/** @type {HTMLElement} */ (document.getElementById('view')));
  step('world', 1);
  await nextFrame();
}

screens.go('boot', { load });

// Debug handle for the browser console / automated tests.
Object.assign(window, { __lcc: { screens, game, input, save, settings,
  /** Test helper: jump straight into a chapter (after Boot), optionally at a checkpoint. */
  async quick(id, cp = null) {
    if (!save.hasProgress()) save.newGame();
    for (let n = 1; n < id; n++) save.completeChapter(n);
    if (cp) save.setCheckpoint(id, cp, {}); else save.startChapter(id);
    save.get().currentChapter = id;
    screens.go('chapterIntro', { id, resume: !!cp, skipCut: true });
    await new Promise(r => setTimeout(r, 50));
    document.querySelector('.card').click();
    await new Promise(r => setTimeout(r, 300));
    input.debugForceLock(true);
    return game.debug;
  },
} });
