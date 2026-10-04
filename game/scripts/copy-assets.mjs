// Copies the trailer sounds the game uses into public/ (trailer files stay untouched).
import { mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pub = fileURLToPath(new URL('../public/', import.meta.url));

const files = [
  ['sfx/click.ogg', 'sfx/click.ogg'],
  ['sfx/thud.ogg', 'sfx/thud.ogg'],
  ['sfx/templebell.ogg', 'sfx/templebell.ogg'],
  ['sfx/gongbell.ogg', 'sfx/gongbell.ogg'],
  ['sfx/rooster.ogg', 'sfx/rooster.ogg'],
  ['sfx/wind.ogg', 'sfx/wind.ogg'],
  ['sfx/gecko.ogg', 'sfx/gecko.ogg'],
  ['sfx/doghowl.ogg', 'sfx/doghowl.ogg'],
  // TODO: placeholder menu music until a real menu theme exists
  ['audio/trailer_mix.flac', 'music/menu_placeholder.flac'],
];

let copied = 0;
for (const [src, dst] of files) {
  const from = root + src, to = pub + dst;
  if (!existsSync(from)) { console.warn(`[assets] missing ${src}`); continue; }
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  mkdirSync(to.slice(0, to.lastIndexOf('/')), { recursive: true });
  copyFileSync(from, to); copied++;
}
console.log(`[assets] ${copied} copied, ${files.length - copied} up to date`);
