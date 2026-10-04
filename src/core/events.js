// Tiny event emitter + safe localStorage helpers shared by the core stores.

/** @returns {{on(ev:string, fn:Function):()=>void, emit(ev:string, ...a:any[]):void}} */
export function createEmitter() {
  /** @type {Map<string, Set<Function>>} */
  const map = new Map();
  return {
    on(ev, fn) {
      if (!map.has(ev)) map.set(ev, new Set());
      map.get(ev).add(fn);
      return () => map.get(ev).delete(fn);
    },
    emit(ev, ...a) { map.get(ev)?.forEach(fn => fn(...a)); },
  };
}

/** Read JSON from localStorage; null when missing, blocked or corrupt. */
export function readJSON(key) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}

export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
