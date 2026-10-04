// Save store: one autosave slot + meta flags in localStorage. Corrupt or old data falls back to defaults.
import { readJSON, writeJSON } from './events.js';
import { CHAPTERS } from '../data/chapters.js';

const SAVE_KEY = 'lcc.save.v1', META_KEY = 'lcc.meta.v1', VERSION = 1;
const ids = new Set(CHAPTERS.map(c => c.id));

const fresh = () => ({ version: VERSION, currentChapter: 1, completed: [], unlocked: [1], checkpoint: null, playtime: 0, updatedAt: 0 });

function loadSave() {
  const s = readJSON(SAVE_KEY);
  if (!s || s.version !== VERSION || !ids.has(s.currentChapter) || !Array.isArray(s.unlocked)) return null;
  return {
    ...fresh(), ...s,
    completed: Array.isArray(s.completed) ? s.completed.filter(i => ids.has(i)) : [],
    unlocked: [...new Set([1, ...s.unlocked.filter(i => ids.has(i))])],
    playtime: Number.isFinite(s.playtime) ? s.playtime : 0,
  };
}

let data = loadSave();  // null = no save yet
const meta = { langChosen: false, openingSeen: false, ...(readJSON(META_KEY) || {}) };

function persist() { data.updatedAt = Date.now(); writeJSON(SAVE_KEY, data); }

export const save = {
  hasProgress: () => !!data,
  get: () => data ?? fresh(),
  isUnlocked: (id) => (data ?? fresh()).unlocked.includes(id),
  isCompleted: (id) => !!data?.completed.includes(id),
  newGame() { data = fresh(); persist(); },
  /** Autosave at chapter start. */
  startChapter(id) { if (!data) data = fresh(); data.currentChapter = id; data.checkpoint = null; persist(); },
  /** Marks a chapter done and unlocks the next. @returns {number|null} next chapter id */
  completeChapter(id) {
    if (!data) data = fresh();
    if (!data.completed.includes(id)) data.completed.push(id);
    const next = CHAPTERS.find(c => c.requires === id);
    if (next && !data.unlocked.includes(next.id)) data.unlocked.push(next.id);
    if (next) data.currentChapter = next.id;
    data.checkpoint = null;
    persist();
    return next ? next.id : null;
  },
  /** Mid-chapter checkpoint (id + level flags). */
  setCheckpoint(chapter, id, flags = {}) { if (!data) data = fresh(); data.currentChapter = chapter; data.checkpoint = { chapter, id, flags }; persist(); },
  /** Checkpoint id for a chapter, or null. */
  checkpointFor(chapter) { return data?.checkpoint?.chapter === chapter ? data.checkpoint.id : null; },
  addPlaytime(sec) { if (data && sec > 0) { data.playtime += sec; persist(); } },
  meta: {
    get: (k) => meta[k],
    set(k, v) { meta[k] = v; writeJSON(META_KEY, meta); },
  },
};
